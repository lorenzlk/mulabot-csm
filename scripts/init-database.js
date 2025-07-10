const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  try {
    console.log('🗄️  Initializing database...');
    
    // Create documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        company VARCHAR(100),
        section_number INTEGER,
        processed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create AI summaries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_summaries (
        id SERIAL PRIMARY KEY,
        query_hash VARCHAR(64) UNIQUE NOT NULL,
        summary TEXT NOT NULL,
        cost DECIMAL(10,6) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create companies table with unique constraint
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        normalized_name VARCHAR(100) UNIQUE NOT NULL,
        patterns TEXT[],
        aliases TEXT[],
        domains TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(date);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_timestamp ON documents(timestamp);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_summaries_query_hash ON ai_summaries(query_hash);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_summaries_expires ON ai_summaries(expires_at);
    `);
    
    // Insert default companies
    const companies = [
      {
        name: 'On3',
        normalized_name: 'on3',
        patterns: ['on3', 'on\\s*3'],
        aliases: ['on3', 'on 3'],
        domains: ['on3.com']
      },
      {
        name: 'Swimming World',
        normalized_name: 'swimming_world',
        patterns: ['swimming\\s*world', 'swimmingworld'],
        aliases: ['swimming world', 'swimmingworld'],
        domains: ['swimmingworld.com']
      },
      {
        name: 'She Media',
        normalized_name: 'she_media',
        patterns: ['she\\s*media', 'shemedia'],
        aliases: ['she media', 'shemedia'],
        domains: ['shemedia.com']
      },
      {
        name: 'Rev Content',
        normalized_name: 'rev_content',
        patterns: ['rev\\s*content', 'revcontent'],
        aliases: ['rev content', 'revcontent'],
        domains: ['revcontent.com']
      },
      {
        name: 'Brit+Co',
        normalized_name: 'brit_co',
        patterns: ['brit\\.co', 'brit\\+co', 'brit\\s+co', 'britco'],
        aliases: ['brit.co', 'brit+co', 'brit co', 'britco'],
        domains: ['brit.co']
      }
    ];
    
    for (const company of companies) {
      try {
        await pool.query(`
          INSERT INTO companies (name, normalized_name, patterns, aliases, domains)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (normalized_name) DO UPDATE SET
            name = EXCLUDED.name,
            patterns = EXCLUDED.patterns,
            aliases = EXCLUDED.aliases,
            domains = EXCLUDED.domains,
            updated_at = CURRENT_TIMESTAMP
        `, [
          company.name,
          company.normalized_name,
          company.patterns,
          company.aliases,
          company.domains
        ]);
      } catch (error) {
        console.log(`⚠️  Company ${company.name} already exists, skipping...`);
      }
    }
    
    console.log('✅ Database initialized successfully!');
    console.log('📊 Tables created:');
    console.log('   - documents');
    console.log('   - ai_summaries');
    console.log('   - companies');
    console.log('🏗️  Indexes created for performance');
    console.log('🏢 Default companies inserted');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase }; 