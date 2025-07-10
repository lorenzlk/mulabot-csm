/**
 * Pinecone Vector Database Client
 * Weekly Publisher Digest Assistant
 */

const { PineconeClient } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
const {
  PINECONE_CONFIG,
  INDEX_CONFIG,
  NAMESPACE_CONFIG,
  QUERY_CONFIG,
  BATCH_CONFIG,
  ERROR_CONFIG,
  PERFORMANCE_CONFIG,
  HEALTH_CONFIG,
  VALIDATION_CONFIG,
  PUBLISHER_CONFIG
} = require('./pinecone-config');

class PineconeService {
  constructor() {
    this.client = null;
    this.index = null;
    this.openai = null;
    this.isInitialized = false;
    this.healthStatus = {
      isHealthy: false,
      lastCheck: null,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0
    };
    this.metrics = {
      operations: {},
      errors: {},
      performance: {}
    };
    this.logger = this.createLogger();
  }

  /**
   * Initialize Pinecone client and index
   */
  async initialize() {
    try {
      this.logger.info('Initializing Pinecone client...');

      // Initialize Pinecone client
      this.client = new PineconeClient();
      await this.client.init({
        apiKey: PINECONE_CONFIG.apiKey,
        environment: PINECONE_CONFIG.environment
      });

      this.logger.info('Pinecone client initialized successfully');

      // Initialize OpenAI client
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORG_ID || undefined
      });

      this.logger.info('OpenAI client initialized successfully');

      // Check if index exists, create if not
      await this.ensureIndex();

      // Get index reference
      this.index = this.client.Index(PINECONE_CONFIG.indexName);

      // Start health monitoring
      this.startHealthMonitoring();

      // Start metrics collection
      this.startMetricsCollection();

      this.isInitialized = true;
      this.logger.info('Pinecone service initialization complete');

      return true;

    } catch (error) {
      this.logger.error('Failed to initialize Pinecone service:', error);
      throw error;
    }
  }

  /**
   * Ensure index exists, create if necessary
   */
  async ensureIndex() {
    try {
      this.logger.info('Checking if index exists...');

      // List existing indexes
      const indexList = await this.client.listIndexes();
      const indexExists = indexList.includes(PINECONE_CONFIG.indexName);

      if (!indexExists) {
        this.logger.info('Index does not exist, creating...');
        await this.createIndex();
      } else {
        this.logger.info('Index already exists');
        // Optionally verify index configuration
        await this.verifyIndexConfiguration();
      }

    } catch (error) {
      this.logger.error('Error ensuring index exists:', error);
      throw error;
    }
  }

  /**
   * Create new Pinecone index
   */
  async createIndex() {
    try {
      this.logger.info('Creating Pinecone index with configuration:', INDEX_CONFIG);

      await this.client.createIndex({
        createRequest: INDEX_CONFIG
      });

      this.logger.info('Index created successfully');

      // Wait for index to be ready
      await this.waitForIndexReady();

    } catch (error) {
      this.logger.error('Error creating index:', error);
      throw error;
    }
  }

  /**
   * Wait for index to be ready
   */
  async waitForIndexReady(maxWaitTime = 300000) {
    const startTime = Date.now();
    const checkInterval = 5000; // Check every 5 seconds

    this.logger.info('Waiting for index to be ready...');

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const indexStats = await this.client.describeIndex({
          indexName: PINECONE_CONFIG.indexName
        });

        if (indexStats.status?.ready) {
          this.logger.info('Index is ready');
          return true;
        }

        this.logger.info('Index not ready yet, waiting...');
        await this.sleep(checkInterval);

      } catch (error) {
        this.logger.warn('Error checking index status:', error);
        await this.sleep(checkInterval);
      }
    }

    throw new Error('Index did not become ready within timeout period');
  }

  /**
   * Verify index configuration matches expected settings
   */
  async verifyIndexConfiguration() {
    try {
      const indexStats = await this.client.describeIndex({
        indexName: PINECONE_CONFIG.indexName
      });

      const expectedDimension = INDEX_CONFIG.dimension;
      const actualDimension = indexStats.database?.dimension;

      if (actualDimension !== expectedDimension) {
        this.logger.warn(`Index dimension mismatch: expected ${expectedDimension}, got ${actualDimension}`);
      }

      const expectedMetric = INDEX_CONFIG.metric;
      const actualMetric = indexStats.database?.metric;

      if (actualMetric !== expectedMetric) {
        this.logger.warn(`Index metric mismatch: expected ${expectedMetric}, got ${actualMetric}`);
      }

      this.logger.info('Index configuration verified');

    } catch (error) {
      this.logger.error('Error verifying index configuration:', error);
      throw error;
    }
  }

  /**
   * Upsert vectors to Pinecone
   */
  async upsertVectors(vectors, namespace = NAMESPACE_CONFIG.daily_digests) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Upserting ${vectors.length} vectors to namespace: ${namespace}`);

      // Validate vectors
      this.validateVectors(vectors);

      // Process in batches if necessary
      if (vectors.length > BATCH_CONFIG.maxBatchSize) {
        return await this.batchUpsertVectors(vectors, namespace);
      }

      // Single batch upsert
      const response = await this.executeWithRetry(async () => {
        return await this.index.upsert({
          upsertRequest: {
            vectors: vectors,
            namespace: namespace
          }
        });
      });

      const duration = Date.now() - startTime;
      this.recordMetric('upsert', duration, vectors.length);

      this.logger.info(`Upserted ${vectors.length} vectors successfully in ${duration}ms`);
      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError('upsert', error, duration);
      this.logger.error('Error upserting vectors:', error);
      throw error;
    }
  }

  /**
   * Batch upsert large number of vectors
   */
  async batchUpsertVectors(vectors, namespace) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Batch upserting ${vectors.length} vectors in batches of ${BATCH_CONFIG.maxBatchSize}`);

      const batches = this.chunkArray(vectors, BATCH_CONFIG.maxBatchSize);
      const results = [];

      // Process batches with concurrency limit
      for (let i = 0; i < batches.length; i += BATCH_CONFIG.maxConcurrentBatches) {
        const batchGroup = batches.slice(i, i + BATCH_CONFIG.maxConcurrentBatches);
        
        const batchPromises = batchGroup.map((batch, index) => 
          this.upsertSingleBatch(batch, namespace, i + index)
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      const duration = Date.now() - startTime;
      this.recordMetric('batch_upsert', duration, vectors.length);

      this.logger.info(`Batch upsert completed in ${duration}ms`);
      return results;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError('batch_upsert', error, duration);
      this.logger.error('Error in batch upsert:', error);
      throw error;
    }
  }

  /**
   * Upsert single batch with retry logic
   */
  async upsertSingleBatch(batch, namespace, batchIndex) {
    try {
      this.logger.debug(`Upserting batch ${batchIndex + 1} with ${batch.length} vectors`);

      const response = await this.executeWithRetry(async () => {
        return await this.index.upsert({
          upsertRequest: {
            vectors: batch,
            namespace: namespace
          }
        });
      });

      return response;

    } catch (error) {
      this.logger.error(`Error upserting batch ${batchIndex + 1}:`, error);
      throw error;
    }
  }

  /**
   * Query vectors from Pinecone
   */
  async queryVectors(vector, options = {}) {
    const startTime = Date.now();
    
    try {
      const queryOptions = {
        ...QUERY_CONFIG,
        ...options
      };

      this.logger.info(`Querying vectors with topK: ${queryOptions.topK}, namespace: ${queryOptions.namespace}`);

      const response = await this.executeWithRetry(async () => {
        return await this.index.query({
          queryRequest: {
            vector: vector,
            topK: queryOptions.topK,
            includeMetadata: queryOptions.includeMetadata,
            includeValues: queryOptions.includeValues,
            namespace: queryOptions.namespace,
            filter: queryOptions.filter
          }
        });
      });

      const duration = Date.now() - startTime;
      this.recordMetric('query', duration, response.matches?.length || 0);

      this.logger.info(`Query completed in ${duration}ms, found ${response.matches?.length || 0} matches`);
      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError('query', error, duration);
      this.logger.error('Error querying vectors:', error);
      throw error;
    }
  }

  /**
   * Delete vectors from Pinecone
   */
  async deleteVectors(ids, namespace = NAMESPACE_CONFIG.daily_digests) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Deleting ${ids.length} vectors from namespace: ${namespace}`);

      const response = await this.executeWithRetry(async () => {
        return await this.index.delete1({
          deleteRequest: {
            ids: ids,
            namespace: namespace
          }
        });
      });

      const duration = Date.now() - startTime;
      this.recordMetric('delete', duration, ids.length);

      this.logger.info(`Deleted ${ids.length} vectors successfully in ${duration}ms`);
      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError('delete', error, duration);
      this.logger.error('Error deleting vectors:', error);
      throw error;
    }
  }

  /**
   * Fetch vectors by IDs
   */
  async fetchVectors(ids, namespace = NAMESPACE_CONFIG.daily_digests) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Fetching ${ids.length} vectors from namespace: ${namespace}`);

      const response = await this.executeWithRetry(async () => {
        return await this.index.fetch({
          fetchRequest: {
            ids: ids,
            namespace: namespace
          }
        });
      });

      const duration = Date.now() - startTime;
      this.recordMetric('fetch', duration, Object.keys(response.vectors || {}).length);

      this.logger.info(`Fetched ${Object.keys(response.vectors || {}).length} vectors in ${duration}ms`);
      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError('fetch', error, duration);
      this.logger.error('Error fetching vectors:', error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats() {
    try {
      const response = await this.executeWithRetry(async () => {
        return await this.index.describeIndexStats({
          describeIndexStatsRequest: {}
        });
      });

      this.logger.info('Retrieved index statistics');
      return response;

    } catch (error) {
      this.logger.error('Error getting index stats:', error);
      throw error;
    }
  }

  /**
   * Search for publisher content
   */
  async searchPublisherContent(query, publisherName, options = {}) {
    try {
      this.logger.info(`Searching for content from publisher: ${publisherName}`);

      // Normalize publisher name
      const normalizedPublisher = this.normalizePublisherName(publisherName);

      const searchOptions = {
        ...options,
        filter: {
          publisher: normalizedPublisher,
          ...options.filter
        }
      };

      return await this.queryVectors(query, searchOptions);

    } catch (error) {
      this.logger.error('Error searching publisher content:', error);
      throw error;
    }
  }

  /**
   * Search content by date range
   */
  async searchContentByDateRange(query, startDate, endDate, options = {}) {
    try {
      this.logger.info(`Searching content between ${startDate} and ${endDate}`);

      const searchOptions = {
        ...options,
        filter: {
          date: {
            $gte: startDate,
            $lte: endDate
          },
          ...options.filter
        }
      };

      return await this.queryVectors(query, searchOptions);

    } catch (error) {
      this.logger.error('Error searching content by date range:', error);
      throw error;
    }
  }

  /**
   * Search recent content (last N days)
   */
  async searchRecentContent(query, days = 7, options = {}) {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      return await this.searchContentByDateRange(query, startDate, endDate, options);

    } catch (error) {
      this.logger.error('Error searching recent content:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for text content using OpenAI
   */
  async generateEmbeddings(texts, options = {}) {
    const startTime = Date.now();
    
    try {
      // Ensure texts is an array
      const textArray = Array.isArray(texts) ? texts : [texts];
      
      this.logger.info(`Generating embeddings for ${textArray.length} texts`);

      // Validate OpenAI client is initialized
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      // Generate embeddings
      const response = await this.executeWithRetry(async () => {
        return await this.openai.embeddings.create({
          model: options.model || 'text-embedding-ada-002',
          input: textArray,
          encoding_format: 'float'
        });
      });

      const duration = Date.now() - startTime;
      this.recordMetric('generate_embeddings', duration, textArray.length);

      const embeddings = response.data.map(item => item.embedding);
      
      this.logger.info(`Generated ${embeddings.length} embeddings in ${duration}ms`);
      
      // Return single embedding if single text was provided
      return Array.isArray(texts) ? embeddings : embeddings[0];

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError('generate_embeddings', error, duration);
      this.logger.error('Error generating embeddings:', error);
      throw error;
    }
  }

  /**
   * Process daily digest content and generate vectors
   */
  async processDigestContent(content, metadata) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Processing daily digest content for embedding generation');

      // Validate required metadata
      if (!metadata.publisher || !metadata.date) {
        throw new Error('Publisher and date are required in metadata');
      }

      // Normalize publisher name
      const normalizedPublisher = this.normalizePublisherName(metadata.publisher);

      // Generate content chunks if text is too long
      const chunks = this.chunkContentForEmbedding(content);
      
      this.logger.info(`Content split into ${chunks.length} chunks for processing`);

      // Generate embeddings for all chunks
      const embeddings = await this.generateEmbeddings(chunks);

      // Create vectors with metadata
      const vectors = chunks.map((chunk, index) => ({
        id: `${normalizedPublisher}-${metadata.date}-chunk-${index}`,
        values: embeddings[index],
        metadata: {
          ...metadata,
          publisher: normalizedPublisher,
          content_type: 'daily_digest',
          section: `chunk_${index}`,
          content_length: chunk.length,
          chunk_index: index,
          total_chunks: chunks.length,
          created_at: new Date().toISOString(),
          version: '1.0'
        }
      }));

      const duration = Date.now() - startTime;
      this.recordMetric('process_digest_content', duration, vectors.length);

      this.logger.info(`Processed digest content into ${vectors.length} vectors in ${duration}ms`);
      
      return vectors;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError('process_digest_content', error, duration);
      this.logger.error('Error processing digest content:', error);
      throw error;
    }
  }

  /**
   * Chunk content for embedding generation
   */
  chunkContentForEmbedding(content, maxChunkSize = 8000) {
    // If content is short enough, return as single chunk
    if (content.length <= maxChunkSize) {
      return [content];
    }

    const chunks = [];
    let currentChunk = '';
    const sentences = content.split(/[.!?]+/);

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      // If adding this sentence would exceed max size, start new chunk
      if (currentChunk.length + trimmedSentence.length > maxChunkSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      }
    }

    // Add final chunk if not empty
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [content];
  }

  /**
   * Generate query embedding for search
   */
  async generateQueryEmbedding(query, options = {}) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Generating query embedding for: "${query}"`);

      const embedding = await this.generateEmbeddings(query, options);

      const duration = Date.now() - startTime;
      this.recordMetric('generate_query_embedding', duration, 1);

      this.logger.info(`Generated query embedding in ${duration}ms`);
      
      return embedding;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError('generate_query_embedding', error, duration);
      this.logger.error('Error generating query embedding:', error);
      throw error;
    }
  }

  /**
   * Process and upsert daily digest content in one operation
   */
  async processAndUpsertDigestContent(content, metadata, namespace = NAMESPACE_CONFIG.daily_digests) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Processing and upserting daily digest content');

      // Process content into vectors
      const vectors = await this.processDigestContent(content, metadata);

      // Upsert vectors to Pinecone
      const upsertResult = await this.upsertVectors(vectors, namespace);

      const duration = Date.now() - startTime;
      this.recordMetric('process_and_upsert_digest', duration, vectors.length);

      this.logger.info(`Processed and upserted ${vectors.length} vectors in ${duration}ms`);
      
      return {
        vectors: vectors,
        upsertResult: upsertResult,
        vectorCount: vectors.length,
        processingTime: duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError('process_and_upsert_digest', error, duration);
      this.logger.error('Error processing and upserting digest content:', error);
      throw error;
    }
  }

  /**
   * Validate vectors before operations
   */
  validateVectors(vectors) {
    if (!Array.isArray(vectors)) {
      throw new Error('Vectors must be an array');
    }

    for (const vector of vectors) {
      // Validate required fields
      if (!vector.id) {
        throw new Error('Vector must have an id');
      }

      if (!vector.values || !Array.isArray(vector.values)) {
        throw new Error('Vector must have values array');
      }

      // Validate dimensions
      if (VALIDATION_CONFIG.validateVectorDimensions) {
        if (vector.values.length !== PINECONE_CONFIG.dimensions) {
          throw new Error(`Vector dimensions mismatch: expected ${PINECONE_CONFIG.dimensions}, got ${vector.values.length}`);
        }
      }

      // Validate metadata
      if (VALIDATION_CONFIG.validateMetadata && vector.metadata) {
        this.validateMetadata(vector.metadata);
      }
    }
  }

  /**
   * Validate vector metadata
   */
  validateMetadata(metadata) {
    if (VALIDATION_CONFIG.enforceSchema) {
      // Check required fields
      for (const field of VALIDATION_CONFIG.requiredFields) {
        if (!metadata[field]) {
          throw new Error(`Required metadata field missing: ${field}`);
        }
      }

      // Check for extra fields if not allowed
      if (!VALIDATION_CONFIG.allowExtraFields) {
        const allowedFields = Object.keys(require('./pinecone-config').VECTOR_METADATA_SCHEMA);
        for (const field of Object.keys(metadata)) {
          if (!allowedFields.includes(field)) {
            throw new Error(`Extra metadata field not allowed: ${field}`);
          }
        }
      }
    }
  }

  /**
   * Normalize publisher name using aliases
   */
  normalizePublisherName(publisherName) {
    const normalized = publisherName.toLowerCase().trim();
    
    // Check if it's already a canonical name
    if (Object.keys(PUBLISHER_CONFIG.aliases).includes(normalized)) {
      return normalized;
    }

    // Check aliases
    for (const [canonical, aliases] of Object.entries(PUBLISHER_CONFIG.aliases)) {
      if (aliases.includes(normalized)) {
        return canonical;
      }
    }

    // Return original if no match found
    return publisherName;
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry(operation) {
    let lastError;
    let delay = ERROR_CONFIG.initialDelay;

    for (let attempt = 0; attempt < ERROR_CONFIG.maxRetries; attempt++) {
      try {
        return await Promise.race([
          operation(),
          this.timeoutPromise(ERROR_CONFIG.timeoutMs)
        ]);

      } catch (error) {
        lastError = error;
        
        if (attempt === ERROR_CONFIG.maxRetries - 1) {
          break;
        }

        this.logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${ERROR_CONFIG.maxRetries}):`, error.message);
        
        await this.sleep(delay);
        delay = Math.min(delay * ERROR_CONFIG.backoffMultiplier, ERROR_CONFIG.maxDelay);
      }
    }

    throw lastError;
  }

  /**
   * Create timeout promise
   */
  timeoutPromise(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), ms);
    });
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (HEALTH_CONFIG.checkInterval > 0) {
      setInterval(() => {
        this.performHealthCheck();
      }, HEALTH_CONFIG.checkInterval);
      
      this.logger.info('Health monitoring started');
    }
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    try {
      const startTime = Date.now();
      
      // Simple health check - get index stats
      await Promise.race([
        this.getIndexStats(),
        this.timeoutPromise(HEALTH_CONFIG.timeoutMs)
      ]);

      const duration = Date.now() - startTime;
      
      this.healthStatus.consecutiveFailures = 0;
      this.healthStatus.consecutiveSuccesses++;
      this.healthStatus.lastCheck = new Date().toISOString();

      if (this.healthStatus.consecutiveSuccesses >= HEALTH_CONFIG.healthyThreshold) {
        this.healthStatus.isHealthy = true;
      }

      this.logger.debug(`Health check passed in ${duration}ms`);

    } catch (error) {
      this.healthStatus.consecutiveSuccesses = 0;
      this.healthStatus.consecutiveFailures++;
      this.healthStatus.lastCheck = new Date().toISOString();

      if (this.healthStatus.consecutiveFailures >= HEALTH_CONFIG.unhealthyThreshold) {
        this.healthStatus.isHealthy = false;
      }

      this.logger.error('Health check failed:', error);
    }
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    if (PERFORMANCE_CONFIG.enableMetrics && PERFORMANCE_CONFIG.metricsInterval > 0) {
      setInterval(() => {
        this.collectMetrics();
      }, PERFORMANCE_CONFIG.metricsInterval);
      
      this.logger.info('Metrics collection started');
    }
  }

  /**
   * Collect and log metrics
   */
  collectMetrics() {
    try {
      const summary = {
        timestamp: new Date().toISOString(),
        health: this.healthStatus,
        operations: this.metrics.operations,
        errors: this.metrics.errors,
        performance: this.metrics.performance
      };

      this.logger.info('Metrics summary:', JSON.stringify(summary, null, 2));

    } catch (error) {
      this.logger.error('Error collecting metrics:', error);
    }
  }

  /**
   * Record operation metric
   */
  recordMetric(operation, duration, count = 1) {
    if (!PERFORMANCE_CONFIG.enableMetrics) return;

    if (!this.metrics.operations[operation]) {
      this.metrics.operations[operation] = {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        slowQueries: 0
      };
    }

    const metric = this.metrics.operations[operation];
    metric.count += count;
    metric.totalDuration += duration;
    metric.avgDuration = metric.totalDuration / metric.count;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);

    if (duration > PERFORMANCE_CONFIG.slowQueryThreshold) {
      metric.slowQueries++;
    }
  }

  /**
   * Record error metric
   */
  recordError(operation, error, duration) {
    if (!this.metrics.errors[operation]) {
      this.metrics.errors[operation] = {
        count: 0,
        lastError: null,
        errorTypes: {}
      };
    }

    const errorMetric = this.metrics.errors[operation];
    errorMetric.count++;
    errorMetric.lastError = {
      message: error.message,
      timestamp: new Date().toISOString(),
      duration: duration
    };

    const errorType = error.constructor.name;
    errorMetric.errorTypes[errorType] = (errorMetric.errorTypes[errorType] || 0) + 1;
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      isHealthy: this.healthStatus.isHealthy,
      lastCheck: this.healthStatus.lastCheck,
      consecutiveFailures: this.healthStatus.consecutiveFailures,
      consecutiveSuccesses: this.healthStatus.consecutiveSuccesses,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      operations: this.metrics.operations,
      errors: this.metrics.errors,
      performance: this.metrics.performance
    };
  }

  /**
   * Utility functions
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  createLogger() {
    // Simple logger implementation
    return {
      info: (message, ...args) => console.log(`[INFO] ${message}`, ...args),
      warn: (message, ...args) => console.warn(`[WARN] ${message}`, ...args),
      error: (message, ...args) => console.error(`[ERROR] ${message}`, ...args),
      debug: (message, ...args) => console.debug(`[DEBUG] ${message}`, ...args)
    };
  }
}

module.exports = PineconeService; 