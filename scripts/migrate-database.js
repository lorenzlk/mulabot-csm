const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const migrations = [
  {
    version: '1.0.0',
    description: 'Initial database schema',
    up: async (pool) => {
      // This is handled by init-database.js
      console.log('Base schema already exists');
    },
    down: async (pool) => {
      await pool.query('DROP TABLE IF EXISTS documents CASCADE');
      await pool.query('DROP TABLE IF EXISTS ai_summaries CASCADE');
      await pool.query('DROP TABLE IF EXISTS companies CASCADE');
    }
  },
  {
    version: '1.1.0',
    description: 'Add performance indexes',
    up: async (pool) => {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_documents_processed ON documents(processed);
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_companies_normalized ON companies(normalized_name);
      `);
    },
    down: async (pool) => {
      await pool.query('DROP INDEX IF EXISTS idx_documents_processed');
      await pool.query('DROP INDEX IF EXISTS idx_documents_created_at');
      await pool.query('DROP INDEX IF EXISTS idx_companies_normalized');
    }
  },
  {
    version: '1.2.0',
    description: 'Add document archiving',
    up: async (pool) => {
      await pool.query(`
        ALTER TABLE documents 
        ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_documents_archived ON documents(archived);
      `);
    },
    down: async (pool) => {
      await pool.query('DROP INDEX IF EXISTS idx_documents_archived');
      await pool.query('ALTER TABLE documents DROP COLUMN IF EXISTS archived');
    }
  }
];

async function createMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(20) NOT NULL UNIQUE,
      description TEXT NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query('SELECT version FROM migrations ORDER BY executed_at');
  return result.rows.map(row => row.version);
}

async function applyMigration(migration) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`📦 Applying migration ${migration.version}: ${migration.description}`);
    await migration.up(client);
    
    await client.query(
      'INSERT INTO migrations (version, description) VALUES ($1, $2)',
      [migration.version, migration.description]
    );
    
    await client.query('COMMIT');
    console.log(`✅ Migration ${migration.version} applied successfully`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function rollbackMigration(migration) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`🔄 Rolling back migration ${migration.version}: ${migration.description}`);
    await migration.down(client);
    
    await client.query(
      'DELETE FROM migrations WHERE version = $1',
      [migration.version]
    );
    
    await client.query('COMMIT');
    console.log(`✅ Migration ${migration.version} rolled back successfully`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...');
    
    await createMigrationTable();
    const appliedMigrations = await getAppliedMigrations();
    
    console.log(`📋 Applied migrations: ${appliedMigrations.join(', ') || 'none'}`);
    
    let migrationsApplied = 0;
    
    for (const migration of migrations) {
      if (!appliedMigrations.includes(migration.version)) {
        await applyMigration(migration);
        migrationsApplied++;
      } else {
        console.log(`⏭️  Migration ${migration.version} already applied`);
      }
    }
    
    if (migrationsApplied === 0) {
      console.log('✅ All migrations are up to date');
    } else {
      console.log(`✅ Applied ${migrationsApplied} new migrations`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function rollbackLastMigration() {
  try {
    console.log('🔄 Rolling back last migration...');
    
    await createMigrationTable();
    const appliedMigrations = await getAppliedMigrations();
    
    if (appliedMigrations.length === 0) {
      console.log('❌ No migrations to rollback');
      return;
    }
    
    const lastMigration = appliedMigrations[appliedMigrations.length - 1];
    const migration = migrations.find(m => m.version === lastMigration);
    
    if (!migration) {
      console.error(`❌ Migration ${lastMigration} not found in migration files`);
      return;
    }
    
    await rollbackMigration(migration);
    console.log('✅ Rollback completed');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'rollback':
      rollbackLastMigration();
      break;
    case 'migrate':
    default:
      runMigrations();
      break;
  }
}

module.exports = { runMigrations, rollbackLastMigration }; 