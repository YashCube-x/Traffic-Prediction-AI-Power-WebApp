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
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'COMMUTER',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default users if empty
    const { rowCount } = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(rowCount) === 0) {
      console.log('🌱 Seeding default users into Neon PostgreSQL...');
      
      const adminPass = await bcrypt.hash('admin', 10);
      const operatorPass = await bcrypt.hash('operator', 10);
      const commuterPass = await bcrypt.hash('commuter', 10);

      await client.query(`
        INSERT INTO users (id, email, password_hash, full_name, role)
        VALUES 
          ('USR-ADMIN-01', 'admin@trafficvision.ai', $1, 'System Administrator', 'ADMIN'),
          ('USR-OPERATOR-01', 'operator@trafficvision.ai', $2, 'City Traffic Operator', 'OPERATOR'),
          ('USR-COMMUTER-01', 'commuter@trafficvision.ai', $3, 'Smart City Commuter', 'COMMUTER')
        ON CONFLICT (email) DO NOTHING;
      `, [adminPass, operatorPass, commuterPass]);

      console.log('✅ Default users seeded successfully in Neon DB.');
    }

    client.release();
    console.log('✅ Database initialization complete.');
  } catch (err) {
    console.error('⚠️ Database table initialization error:', err.message);
  }
}

initDatabase();

module.exports = pool;
