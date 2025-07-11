const express = require('express');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const winston = require('winston');
const Sentry = require('@sentry/node');
const crypto = require('crypto');

// Initialize Sentry for error tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const slackLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 Slack commands per minute
  message: 'Too many Slack commands, please try again later.'
});

app.use('/webhook', limiter);
app.use('/slack', slackLimiter);

// OpenAI integration
const openai = process.env.OPENAI_API_KEY ? new (require('openai').OpenAI)({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Slack integration
const slack = process.env.SLACK_BOT_TOKEN ? new (require('@slack/bolt').App)({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
}) : null;

// Company registry for filtering
const companyRegistry = {
  'on3': {
    name: 'On3',
    patterns: [/on3/i, /on\s*3/i],
    aliases: ['on3', 'on 3'],
    domains: ['on3.com']
  },
  'swimming_world': {
    name: 'Swimming World',
    patterns: [/swimming\s*world/i, /swimmingworld/i],
    aliases: ['swimming world', 'swimmingworld'],
    domains: ['swimmingworld.com']
  },
  'she_media': {
    name: 'She Media',
    patterns: [/she\s*media/i, /shemedia/i],
    aliases: ['she media', 'shemedia'],
    domains: ['shemedia.com']
  },
  'rev_content': {
    name: 'Rev Content',
    patterns: [/rev\s*content/i, /revcontent/i],
    aliases: ['rev content', 'revcontent'],
    domains: ['revcontent.com']
  },
  'brit_co': {
    name: 'Brit+Co',
    patterns: [/brit\.co/i, /brit\+co/i, /brit\s+co/i, /britco/i],
    aliases: ['brit.co', 'brit+co', 'brit co', 'britco'],
    domains: ['brit.co']
  }
};

// Database functions
async function storeDocument(date, content, company, sectionNumber) {
  const query = `
    INSERT INTO documents (date, content, company, section_number)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `;
  
  try {
    const result = await pool.query(query, [date, content, company, sectionNumber]);
    return result.rows[0].id;
  } catch (error) {
    logger.error('Database error storing document:', error);
    throw error;
  }
}

async function getDocuments(filters = {}) {
  let query = 'SELECT * FROM documents WHERE 1=1';
  const params = [];
  let paramCount = 0;

  if (filters.company) {
    paramCount++;
    query += ` AND company = $${paramCount}`;
    params.push(filters.company);
  }

  if (filters.dateFrom) {
    paramCount++;
    query += ` AND date >= $${paramCount}`;
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    paramCount++;
    query += ` AND date <= $${paramCount}`;
    params.push(filters.dateTo);
  }

  query += ' ORDER BY timestamp DESC';

  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    logger.error('Database error getting documents:', error);
    throw error;
  }
}

async function cacheAISummary(queryHash, summary, cost) {
  const query = `
    INSERT INTO ai_summaries (query_hash, summary, cost, expires_at)
    VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')
    ON CONFLICT (query_hash) DO UPDATE SET
      summary = EXCLUDED.summary,
      cost = EXCLUDED.cost,
      created_at = NOW(),
      expires_at = NOW() + INTERVAL '24 hours'
  `;
  
  try {
    await pool.query(query, [queryHash, summary, cost]);
  } catch (error) {
    logger.error('Database error caching AI summary:', error);
  }
}

async function getCachedAISummary(queryHash) {
  const query = `
    SELECT summary, cost FROM ai_summaries 
    WHERE query_hash = $1 AND expires_at > NOW()
  `;
  
  try {
    const result = await pool.query(query, [queryHash]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Database error getting cached AI summary:', error);
    return null;
  }
}

// Company matching function
function matchCompany(content, query) {
  const searchText = (content + ' ' + query).toLowerCase();
  
  for (const [key, company] of Object.entries(companyRegistry)) {
    if (company.patterns.some(pattern => pattern.test(searchText))) {
      return { key, ...company };
    }
  }
  
  return null;
}

// OpenAI integration
async function generateAISummary(content, query) {
  if (!openai) {
    return { summary: 'AI summarization not available', cost: 0 };
  }

  const queryHash = crypto.createHash('md5').update(content + query).digest('hex');
  
  // Check cache first
  const cached = await getCachedAISummary(queryHash);
  if (cached) {
    return { summary: cached.summary, cost: 0 };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that analyzes specific publishing content. CRITICAL REQUIREMENTS: 1) ONLY use information from the provided content below - never add external knowledge. 2) Quote EXACT numbers, percentages, and metrics from the source. 3) If the content mentions specific companies, revenue, growth rates, or performance metrics, include them exactly as stated. 4) Structure your response clearly with the actual data points from the content. 5) If asked about something not in the content, say "not mentioned in the provided content".'
        },
        {
          role: 'user',
          content: `QUERY: "${query}"\n\n--- CONTENT TO ANALYZE ---\n${content}\n--- END CONTENT ---\n\nAnalyze the above content and provide insights related to the query. Use ONLY the specific information from the content above. Include exact numbers, percentages, and metrics as stated. Format as markdown with clear sections.`
        }
      ],
      temperature: 0.1,
      max_tokens: 1000
    });

    const summary = response.choices[0].message.content;
    const cost = (response.usage.total_tokens / 1000) * 0.002; // Approximate cost

    // Cache the result
    await cacheAISummary(queryHash, summary, cost);

    return { summary, cost };
  } catch (error) {
    logger.error('OpenAI API error:', error);
    return { summary: 'Error generating AI summary', cost: 0 };
  }
}

// Webhook signature validation
function validateWebhookSignature(payload, signature, secret) {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    // Normalize both signatures to lowercase hex strings
    const normalizedSignature = signature.toLowerCase();
    const normalizedExpected = expectedSignature.toLowerCase();
    
    // Check if lengths match
    if (normalizedSignature.length !== normalizedExpected.length) {
      logger.error(`Signature length mismatch - received: ${normalizedSignature.length}, expected: ${normalizedExpected.length}`);
      logger.error(`Received signature: ${normalizedSignature.substring(0, 20)}...`);
      logger.error(`Expected signature: ${normalizedExpected.substring(0, 20)}...`);
      return false;
    }
    
    logger.info(`Signature lengths match: ${normalizedSignature.length} characters`);
    logger.info(`Signatures match: ${normalizedSignature === normalizedExpected}`);
    
    // Use constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(normalizedSignature, 'hex'),
      Buffer.from(normalizedExpected, 'hex')
    );
  } catch (error) {
    logger.error('Signature validation error:', error);
    return false;
  }
}

// Simple alive test endpoint
app.get('/alive', (req, res) => {
  res.json({ 
    status: 'alive',
    version: '1.0.1',
    timestamp: new Date().toISOString(),
    message: 'Server is running with latest code'
  });
});

// Simple webhook test without any validation
app.post('/webhook-test', (req, res) => {
  try {
    console.log('TEST WEBHOOK RECEIVED:', req.body);
    res.json({ 
      success: true,
      message: 'Test webhook received successfully',
      timestamp: new Date().toISOString(),
      sectionsReceived: req.body.sections ? req.body.sections.length : 0
    });
  } catch (error) {
    console.error('TEST WEBHOOK ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simple test endpoint
app.post('/test-webhook', (req, res) => {
  try {
    logger.info('Test webhook received:', req.body);
    res.json({ 
      success: true, 
      message: 'Test webhook working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Test webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Main webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    logger.info('Webhook received - Headers:', req.headers);
    logger.info('Webhook received - Body keys:', Object.keys(req.body));
    
    // Temporarily disable signature validation for testing
    logger.info('⚠️  SIGNATURE VALIDATION DISABLED FOR TESTING - Build: ' + new Date().toISOString());
    
    // TODO: Re-enable signature validation once webhook processing is working
    // if (process.env.WEBHOOK_SECRET) {
    //   const signature = req.headers['x-webhook-signature'];
    //   const payload = req.rawBody || JSON.stringify(req.body);
    //   
    //   logger.info('Signature validation - Header:', signature);
    //   
    //   if (!signature) {
    //     logger.error('Missing signature');
    //     return res.status(401).json({ error: 'Missing signature' });
    //   }
    //
    //   // Extract hex digest from 'sha256=HEXDIGEST' format
    //   const signatureHex = signature.startsWith('sha256=') ? signature.substring(7) : signature;
    //   
    //   logger.info('Signature validation - Extracted hex:', signatureHex.substring(0, 20) + '...');
    //   logger.info('Signature validation - Full length:', signatureHex.length);
    //   logger.info('Signature validation - Payload length:', payload.length);
    //   logger.info('Signature validation - Payload source:', req.rawBody ? 'raw body' : 'JSON stringified');
    //   logger.info('Signature validation - Payload preview:', payload.substring(0, 100) + '...');
    //   
    //   if (!validateWebhookSignature(payload, signatureHex, process.env.WEBHOOK_SECRET)) {
    //     logger.error('Invalid signature');
    //     return res.status(401).json({ error: 'Invalid signature' });
    //   }
    //   
    //   logger.info('Signature validation - SUCCESS');
    // }

    const { type, sections, documentId } = req.body;
    
    logger.info(`Webhook received - Type: ${type}, Sections: ${sections ? sections.length : 0}`);
    
    if (type === 'document_update' && sections && Array.isArray(sections)) {
      
      // For now, just return success without processing to isolate the error
      logger.info(`SUCCESS - Would process ${sections.length} sections`);
      
      res.json({
        success: true,
        processed: sections.length,
        timestamp: new Date().toISOString(),
        message: 'Webhook received successfully'
      });
      
    } else {
      logger.error('Invalid request format - Type:', type, 'Sections valid:', !!(sections && Array.isArray(sections)));
      res.status(400).json({ error: 'Invalid request format' });
    }
  } catch (error) {
    logger.error('Webhook processing error:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Slack command endpoint
app.post('/slack/commands', async (req, res) => {
  try {
    const { command, text, user_name, response_url } = req.body;
    
    if (!command || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Immediate response
    res.json({
      response_type: 'ephemeral',
      text: '⏳ Processing your request... Results will appear shortly.'
    });

    // Process in background
    processSlackCommand(text, user_name, response_url);
    
  } catch (error) {
    logger.error('Slack command error:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function processSlackCommand(query, userName, responseUrl) {
  try {
    // Get relevant documents
    const matchedCompany = matchCompany('', query);
    const filters = matchedCompany ? { company: matchedCompany.key } : {};
    
    const documents = await getDocuments(filters);
    
    if (documents.length === 0) {
      await sendSlackResponse(responseUrl, {
        response_type: 'in_channel',
        text: `📊 *Account Summary for @${userName}*\n\n❌ No relevant content found for "${query}"`
      });
      return;
    }

    // Generate AI summary
    const contentText = documents.map(doc => doc.content).join('\n\n');
    const aiResult = await generateAISummary(contentText, query);
    
    const response = {
      response_type: 'in_channel',
      text: `📊 *Account Summary for @${userName}*\n\n🤖 *AI Summary:*\n${aiResult.summary}\n\n📋 *Relevant Sections:* ${documents.length}\n💰 *Processing Cost:* $${aiResult.cost.toFixed(6)}\n⏰ *Last Updated:* ${new Date().toISOString()}`
    };

    await sendSlackResponse(responseUrl, response);
    
  } catch (error) {
    logger.error('Slack command processing error:', error);
    Sentry.captureException(error);
    
    await sendSlackResponse(responseUrl, {
      response_type: 'ephemeral',
      text: '❌ Error processing your request. Please try again later.'
    });
  }
}

async function sendSlackResponse(responseUrl, response) {
  try {
    const axios = require('axios');
    await axios.post(responseUrl, response);
  } catch (error) {
    logger.error('Error sending Slack response:', error);
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        openai: openai ? 'enabled' : 'disabled',
        slack: slack ? 'enabled' : 'disabled'
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  Sentry.captureException(err);
  
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  const startTime = new Date().toISOString();
  logger.info(`🚀 Production webhook server running on port ${PORT} - DEPLOY: ${startTime}`);
  logger.info(`🤖 OpenAI: ${openai ? 'ENABLED' : 'DISABLED'}`);
  logger.info(`💬 Slack: ${slack ? 'ENABLED' : 'DISABLED'}`);
  logger.info(`🗄️ Database: ${process.env.DATABASE_URL ? 'CONNECTED' : 'NOT CONFIGURED'}`);
  logger.info(`⚠️  SIGNATURE VALIDATION IS DISABLED FOR TESTING`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  pool.end(() => {
    process.exit(0);
  });
});

module.exports = app; 