const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️ DATABASE_URL environment variable is not set in backend/.env');
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('⚡ Connected to Neon PostgreSQL database pool successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle Neon database client', err);
});

// Initialize Database Tables and Default Users
async function initDatabase() {
  try {
    const client = await pool.connect();
    
    // Create users table. NOTE: id is VARCHAR(50) because generated ids are
    // "USR-" + a 36-char UUID = 40 chars.
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'COMMUTER',
        assigned_zone VARCHAR(30),
        must_change_password BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrate pre-existing tables that were created before zone-scoping
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_zone VARCHAR(30);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;`);
    // "USR-" + uuid is 40 chars; original schema was VARCHAR(36)
    await client.query(`ALTER TABLE users ALTER COLUMN id TYPE VARCHAR(50);`);
    // The table may originally have been created by SQLAlchemy, whose
    // defaults are Python-side only — ensure real server-side defaults exist
    // and backfill any NULLs so is_active checks behave.
    await client.query(`ALTER TABLE users ALTER COLUMN is_active SET DEFAULT TRUE;`);
    await client.query(`ALTER TABLE users ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;`);
    await client.query(`UPDATE users SET is_active = TRUE WHERE is_active IS NULL;`);
    await client.query(`UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;`);

    // Password reset tokens (forgot-password flow)
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`ALTER TABLE password_reset_tokens ALTER COLUMN user_id TYPE VARCHAR(50);`);

    // Seed default users if empty. NOTE: SELECT COUNT(*) always returns one
    // row, so the count must be read from rows[0].count, not rowCount.
    const { rows: countRows } = await client.query('SELECT COUNT(*) AS count FROM users');
    if (parseInt(countRows[0].count, 10) === 0) {
      console.log('🌱 Seeding default users into Neon PostgreSQL...');

      const adminPass = await bcrypt.hash('admin', 10);
      const operatorPass = await bcrypt.hash('operator', 10);
      const commuterPass = await bcrypt.hash('commuter', 10);

      await client.query(`
        INSERT INTO users (id, email, password_hash, full_name, role, assigned_zone)
        VALUES
          ('USR-ADMIN-01', 'admin@trafficvision.ai', $1, 'System Administrator', 'ADMIN', NULL),
          ('USR-OPERATOR-01', 'operator@trafficvision.ai', $2, 'City Traffic Operator', 'OPERATOR', 'ZONE_NORTH'),
          ('USR-COMMUTER-01', 'commuter@trafficvision.ai', $3, 'Smart City Commuter', 'COMMUTER', NULL)
        ON CONFLICT (email) DO NOTHING;
      `, [adminPass, operatorPass, commuterPass]);

      console.log('✅ Default users seeded successfully in Neon DB.');
    }

    // Ensure the demo operator always has a zone (existing rows from before zone-scoping)
    await client.query(`
      UPDATE users SET assigned_zone = 'ZONE_NORTH'
      WHERE id = 'USR-OPERATOR-01' AND assigned_zone IS NULL;
    `);

    // Traffic alerts — persisted so incidents survive server restarts
    await client.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        alert_id VARCHAR(30) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        location VARCHAR(200) NOT NULL,
        zone_id VARCHAR(30) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        category VARCHAR(30) NOT NULL,
        description TEXT,
        estimated_delay_mins INTEGER NOT NULL DEFAULT 15,
        reported_by VARCHAR(255),
        is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
        reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed the demo incidents once, so a fresh database isn't empty
    const { rows: alertCount } = await client.query('SELECT COUNT(*) AS count FROM alerts');
    if (parseInt(alertCount[0].count, 10) === 0) {
      console.log('🌱 Seeding demo traffic alerts into Neon PostgreSQL...');
      await client.query(`
        INSERT INTO alerts (alert_id, title, location, zone_id, severity, category, description, estimated_delay_mins, is_resolved)
        VALUES
          ('ALT-2026-001', 'Multi-Vehicle Collision near Hebbal Junction', 'Hebbal Flyover, North Corridor', 'ZONE_NORTH', 'CRITICAL', 'ACCIDENT',
           'Collision blocking 2 center lanes. Emergency services dispatched. Expect heavy gridlock.', 35, FALSE),
          ('ALT-2026-002', 'Traffic Signal Controller Failure at Silk Board', 'Central Silk Board Junction', 'ZONE_SOUTH', 'HIGH', 'SIGNAL_FAILURE',
           'Signal lights operating on yellow flashing. Traffic personnel directing manual flow.', 20, FALSE),
          ('ALT-2026-003', 'Metro Construction Lane Restriction', 'Outer Ring Road - Marathahalli', 'ZONE_EAST', 'MODERATE', 'CONSTRUCTION',
           'Single lane narrowed for pillar casting work. Moderate slowdown observed.', 12, FALSE),
          ('ALT-2026-004', 'Monsoon Waterlogging Warning', 'M.G. Road Underpass', 'ZONE_CENTRAL', 'INFO', 'WEATHER',
           'Water accumulation reduced traffic speed to 15 km/h. Pumps deployed.', 8, TRUE)
        ON CONFLICT (alert_id) DO NOTHING;
      `);
    }

    client.release();
    console.log('✅ Database initialization complete.');
  } catch (err) {
    console.error('⚠️ Database table initialization error:', err.message);
  }
}

initDatabase();

module.exports = pool;
