/**
 * Pinecone Vector Database Configuration
 * Weekly Publisher Digest Assistant
 */

// Pinecone Configuration
const PINECONE_CONFIG = {
  apiKey: process.env.PINECONE_API_KEY || 'your-pinecone-api-key-here',
  environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1',
  indexName: process.env.PINECONE_INDEX_NAME || 'mulabot-csm',
  projectId: process.env.PINECONE_PROJECT_ID || 'your-project-id-here',
  dimensions: 1536, // OpenAI text-embedding-3-small dimensions
  metric: 'cosine', // Similarity metric
  pods: 1,
  podType: 'serverless', // Using serverless mode
  replicas: 1,
  shards: 1
};

// Index Configuration
const INDEX_CONFIG = {
  name: PINECONE_CONFIG.indexName,
  dimension: PINECONE_CONFIG.dimensions,
  metric: PINECONE_CONFIG.metric,
  pod_type: PINECONE_CONFIG.podType,
  pods: PINECONE_CONFIG.pods,
  replicas: PINECONE_CONFIG.replicas,
  shards: PINECONE_CONFIG.shards,
  metadata_config: {
    indexed: [
      'publisher',
      'date',
      'content_type',
      'source',
      'section',
      'timestamp'
    ]
  }
};

// Namespace Configuration for organizing vectors
const NAMESPACE_CONFIG = {
  daily_digests: 'daily-digests',
  publisher_profiles: 'publisher-profiles',
  content_summaries: 'content-summaries',
  test_data: 'test-data'
};

// Vector Metadata Schema
const VECTOR_METADATA_SCHEMA = {
  // Required fields
  publisher: 'string',           // Publisher name (e.g., "TechCrunch", "Brit+Co")
  date: 'string',               // Date in ISO format
  content_type: 'string',       // Type of content (e.g., "daily_digest", "article")
  source: 'string',             // Source document/URL
  
  // Optional fields
  section: 'string',            // Section within the digest
  timestamp: 'number',          // Unix timestamp
  content_length: 'number',     // Length of original content
  confidence_score: 'number',   // AI confidence score
  summary: 'string',            // Brief summary
  keywords: 'array',            // Extracted keywords
  sentiment: 'string',          // Sentiment analysis result
  category: 'string',           // Content category
  priority: 'number',           // Priority score (1-10)
  
  // System fields
  created_at: 'string',         // When vector was created
  updated_at: 'string',         // When vector was last updated
  version: 'string',            // Schema version
  processed_by: 'string'        // Processing system identifier
};

// Query Configuration
const QUERY_CONFIG = {
  topK: 10,                     // Default number of results
  includeMetadata: true,        // Include metadata in results
  includeValues: false,         // Include vector values in results
  filter: {},                   // Default filter (empty)
  namespace: NAMESPACE_CONFIG.daily_digests
};

// Batch Processing Configuration
const BATCH_CONFIG = {
  maxBatchSize: 100,           // Maximum vectors per batch
  maxConcurrentBatches: 5,     // Maximum concurrent batch operations
  retryAttempts: 3,            // Number of retry attempts
  retryDelay: 1000,            // Delay between retries (ms)
  timeoutMs: 30000             // Request timeout
};

// Error Handling Configuration
const ERROR_CONFIG = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelay: 1000,
  maxDelay: 30000,
  timeoutMs: 60000
};

// Logging Configuration
const LOG_CONFIG = {
  level: process.env.LOG_LEVEL || 'info',
  enableConsoleLog: true,
  enableFileLog: false,
  logFilePath: './logs/pinecone.log',
  maxLogSize: '10mb',
  maxLogFiles: 5
};

// Performance Monitoring Configuration
const PERFORMANCE_CONFIG = {
  enableMetrics: true,
  metricsInterval: 60000,      // Metrics collection interval (ms)
  slowQueryThreshold: 5000,    // Slow query threshold (ms)
  trackOperations: [
    'upsert',
    'query',
    'delete',
    'fetch',
    'update'
  ]
};

// Health Check Configuration
const HEALTH_CONFIG = {
  checkInterval: 300000,       // Health check interval (5 minutes)
  timeoutMs: 10000,           // Health check timeout
  retryAttempts: 2,           // Health check retry attempts
  unhealthyThreshold: 3,      // Consecutive failures before marking unhealthy
  healthyThreshold: 2         // Consecutive successes before marking healthy
};

// Data Validation Configuration
const VALIDATION_CONFIG = {
  enforceSchema: true,
  validateVectorDimensions: true,
  validateMetadata: true,
  allowExtraFields: false,
  requiredFields: [
    'publisher',
    'date',
    'content_type',
    'source'
  ]
};

// Publisher Configuration
const PUBLISHER_CONFIG = {
  aliases: {
    'techcrunch': ['tc', 'tech crunch', 'techcrunch.com'],
    'brit+co': ['brit', 'britco', 'brit co', 'brit-co'],
    'mashable': ['mash', 'mashable.com'],
    'engadget': ['eng', 'engadget.com'],
    'theverge': ['verge', 'the verge', 'theverge.com'],
    'wired': ['wired.com'],
    'ars technica': ['ars', 'arstechnica', 'ars-technica']
  },
  categories: {
    'technology': ['tech', 'software', 'hardware', 'ai', 'ml'],
    'lifestyle': ['health', 'fitness', 'beauty', 'fashion'],
    'business': ['startup', 'finance', 'market', 'economy'],
    'entertainment': ['movies', 'music', 'games', 'tv'],
    'news': ['politics', 'world', 'breaking', 'current']
  }
};

// Export all configurations
module.exports = {
  PINECONE_CONFIG,
  INDEX_CONFIG,
  NAMESPACE_CONFIG,
  VECTOR_METADATA_SCHEMA,
  QUERY_CONFIG,
  BATCH_CONFIG,
  ERROR_CONFIG,
  LOG_CONFIG,
  PERFORMANCE_CONFIG,
  HEALTH_CONFIG,
  VALIDATION_CONFIG,
  PUBLISHER_CONFIG
};

// Environment validation
function validateEnvironment() {
  const required = ['PINECONE_API_KEY', 'PINECONE_ENVIRONMENT'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn('Missing environment variables:', missing);
    console.warn('Please set these in your .env file or environment');
  }
  
  return missing.length === 0;
}

// Configuration validation
function validateConfig() {
  const errors = [];
  
  // Validate API key
  if (!PINECONE_CONFIG.apiKey || PINECONE_CONFIG.apiKey === 'your-pinecone-api-key-here') {
    errors.push('PINECONE_API_KEY is not set');
  }
  
  // Validate dimensions
  if (PINECONE_CONFIG.dimensions < 1 || PINECONE_CONFIG.dimensions > 20000) {
    errors.push('Invalid dimensions: must be between 1 and 20000');
  }
  
  // Validate metric
  const validMetrics = ['cosine', 'euclidean', 'dotproduct'];
  if (!validMetrics.includes(PINECONE_CONFIG.metric)) {
    errors.push('Invalid metric: must be one of ' + validMetrics.join(', '));
  }
  
  // Validate index name
  if (!PINECONE_CONFIG.indexName || PINECONE_CONFIG.indexName.length < 1) {
    errors.push('Index name is required');
  }
  
  return errors;
}

// Initialize configuration
function initializeConfig() {
  console.log('Initializing Pinecone configuration...');
  
  const envValid = validateEnvironment();
  const configErrors = validateConfig();
  
  if (!envValid) {
    console.warn('Environment validation failed');
  }
  
  if (configErrors.length > 0) {
    console.error('Configuration validation errors:', configErrors);
    throw new Error('Configuration validation failed: ' + configErrors.join(', '));
  }
  
  console.log('Pinecone configuration initialized successfully');
  console.log('Index:', PINECONE_CONFIG.indexName);
  console.log('Environment:', PINECONE_CONFIG.environment);
  console.log('Dimensions:', PINECONE_CONFIG.dimensions);
  console.log('Metric:', PINECONE_CONFIG.metric);
  
  return true;
}

// Export initialization function
module.exports.initializeConfig = initializeConfig;
module.exports.validateEnvironment = validateEnvironment;
module.exports.validateConfig = validateConfig; 