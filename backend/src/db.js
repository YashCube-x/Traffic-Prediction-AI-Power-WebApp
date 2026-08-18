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
    // Safety Center: phone + emergency contact, used by the SOS feature
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);`);
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

    // Seed default demo users. ON CONFLICT DO NOTHING makes this idempotent,
    // so it runs on every startup and self-heals a partially-seeded table.
    const adminPass = await bcrypt.hash('admin', 10);
    const operatorPass = await bcrypt.hash('operator', 10);
    const commuterPass = await bcrypt.hash('commuter', 10);
    await client.query(`
      INSERT INTO users (id, email, password_hash, full_name, role, assigned_zone, is_active, created_at)
      VALUES
        ('USR-ADMIN-01', 'admin@trafficvision.ai', $1, 'System Administrator', 'ADMIN', NULL, TRUE, CURRENT_TIMESTAMP),
        ('USR-OPERATOR-01', 'operator@trafficvision.ai', $2, 'City Traffic Operator', 'OPERATOR', 'ZONE_NORTH', TRUE, CURRENT_TIMESTAMP),
        ('USR-COMMUTER-01', 'commuter@trafficvision.ai', $3, 'Smart City Commuter', 'COMMUTER', NULL, TRUE, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO NOTHING;
    `, [adminPass, operatorPass, commuterPass]);

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

    // Commuters' saved favourite routes ("My Commute")
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_routes (
        id BIGSERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        label VARCHAR(120),
        origin VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, origin, destination)
      );
    `);

    // Named saved places ("Home", "Office", "College") — distinct from
    // saved_routes (which stores an origin+destination PAIR). Places are
    // single locations the Smart Commute Planner lets a user pick as either
    // end of a route without retyping the address every time.
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_places (
        id BIGSERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        label VARCHAR(60) NOT NULL,
        address VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, label)
      );
    `);

    // Citizen-submitted traffic reports, pending operator verification.
    // An approved report becomes a real alert (and affects routing).
    await client.query(`
      CREATE TABLE IF NOT EXISTS citizen_reports (
        id BIGSERIAL PRIMARY KEY,
        reporter_id VARCHAR(50),
        reporter_email VARCHAR(255),
        title VARCHAR(200) NOT NULL,
        location VARCHAR(200) NOT NULL,
        zone_id VARCHAR(30) NOT NULL,
        category VARCHAR(30) NOT NULL DEFAULT 'CONGESTION',
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        reviewed_by VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Safety Center SOS alerts — a logged-in user's one-tap distress signal.
    // Zone-scoped like citizen_reports so operators only see their own area.
    await client.query(`
      CREATE TABLE IF NOT EXISTS sos_alerts (
        id BIGSERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        user_phone VARCHAR(20),
        emergency_contact_name VARCHAR(100),
        emergency_contact_phone VARCHAR(20),
        location VARCHAR(255),
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        zone_id VARCHAR(30),
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        resolved_by VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Public notices / circulars published by the authority (admin-managed)
    await client.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id BIGSERIAL PRIMARY KEY,
        title VARCHAR(250) NOT NULL,
        body TEXT NOT NULL,
        notice_type VARCHAR(20) NOT NULL DEFAULT 'INFO',
        published_by VARCHAR(255),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Simple key/value counters (classic govt-portal visitor counter)
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_stats (
        stat_key VARCHAR(50) PRIMARY KEY,
        stat_value BIGINT NOT NULL DEFAULT 0
      );
    `);
    await client.query(`INSERT INTO site_stats (stat_key, stat_value) VALUES ('visitors', 0) ON CONFLICT DO NOTHING;`);

    // Audit trail of privileged actions (who did what, when, from where)
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id BIGSERIAL PRIMARY KEY,
        actor_id VARCHAR(50),
        actor_email VARCHAR(255),
        actor_role VARCHAR(20),
        action VARCHAR(50) NOT NULL,
        target VARCHAR(255),
        details TEXT,
        ip VARCHAR(64),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
