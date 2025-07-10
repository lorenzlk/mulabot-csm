/**
 * Pinecone Vector Database Service - Main Entry Point
 * Weekly Publisher Digest Assistant
 */

require('dotenv').config();

const PineconeService = require('./pinecone-client');
const { initializeConfig } = require('./pinecone-config');

/**
 * Main application class
 */
class PineconeApp {
  constructor() {
    this.pineconeService = new PineconeService();
    this.isInitialized = false;
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      console.log('🚀 Starting Pinecone Vector Database Service...');
      
      // Validate configuration
      initializeConfig();
      
      // Initialize Pinecone service
      await this.pineconeService.initialize();
      
      this.isInitialized = true;
      console.log('✅ Pinecone service initialized successfully');
      
      // Start monitoring
      this.startMonitoring();
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Pinecone service:', error);
      throw error;
    }
  }

  /**
   * Start monitoring and health checks
   */
  startMonitoring() {
    // Log health status every 5 minutes
    setInterval(() => {
      const health = this.pineconeService.getHealthStatus();
      const metrics = this.pineconeService.getMetrics();
      
      console.log('📊 Health Status:', {
        healthy: health.isHealthy,
        lastCheck: health.lastCheck,
        consecutiveFailures: health.consecutiveFailures
      });
      
      console.log('📈 Performance Metrics:', {
        operationCount: Object.keys(metrics.operations).length,
        errorCount: Object.keys(metrics.errors).length
      });
      
    }, 300000); // 5 minutes
  }

  /**
   * Example: Upsert sample vectors
   */
  async upsertSampleVectors() {
    try {
      console.log('📝 Upserting sample vectors...');
      
      const sampleVectors = [
        {
          id: 'sample-techcrunch-1',
          values: Array.from({ length: 1536 }, () => Math.random()),
          metadata: {
            publisher: 'techcrunch',
            date: '2023-12-01',
            content_type: 'daily_digest',
            source: 'sample-document',
            section: 'tech_news',
            summary: 'Latest tech news and startup funding rounds',
            keywords: ['technology', 'startups', 'funding'],
            priority: 8,
            created_at: new Date().toISOString(),
            version: '1.0'
          }
        },
        {
          id: 'sample-britco-1',
          values: Array.from({ length: 1536 }, () => Math.random()),
          metadata: {
            publisher: 'brit+co',
            date: '2023-12-01',
            content_type: 'daily_digest',
            source: 'sample-document',
            section: 'lifestyle',
            summary: 'DIY projects and lifestyle tips',
            keywords: ['diy', 'lifestyle', 'crafts'],
            priority: 6,
            created_at: new Date().toISOString(),
            version: '1.0'
          }
        }
      ];

      const result = await this.pineconeService.upsertVectors(sampleVectors);
      console.log('✅ Sample vectors upserted successfully:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error upserting sample vectors:', error);
      throw error;
    }
  }

  /**
   * Example: Query vectors by publisher
   */
  async querySampleVectors() {
    try {
      console.log('🔍 Querying sample vectors...');
      
      // Generate a random query vector
      const queryVector = Array.from({ length: 1536 }, () => Math.random());
      
      // Search TechCrunch content
      const techResults = await this.pineconeService.searchPublisherContent(
        queryVector, 
        'techcrunch',
        { topK: 5 }
      );
      
      console.log('📰 TechCrunch results:', {
        matchCount: techResults.matches?.length || 0,
        matches: techResults.matches?.map(m => ({
          id: m.id,
          score: m.score,
          publisher: m.metadata?.publisher
        }))
      });

      // Search recent content (last 7 days)
      const recentResults = await this.pineconeService.searchRecentContent(
        queryVector,
        7,
        { topK: 5 }
      );
      
      console.log('📅 Recent content results:', {
        matchCount: recentResults.matches?.length || 0,
        matches: recentResults.matches?.map(m => ({
          id: m.id,
          score: m.score,
          date: m.metadata?.date
        }))
      });
      
      return { techResults, recentResults };
      
    } catch (error) {
      console.error('❌ Error querying vectors:', error);
      throw error;
    }
  }

  /**
   * Example: Process daily digest content with embedding generation
   */
  async processSampleDigestContent() {
    try {
      console.log('📝 Processing sample daily digest content...');
      
      const sampleContent = `
        TechCrunch Daily Updates - December 1, 2023
        
        Startup Funding News:
        • Acme AI raises $50M Series B led by Sequoia Capital
        • New fintech startup BankBot secures $10M seed funding
        • Health tech company MedFlow announces $25M Series A
        
        Product Launches:
        • Apple announces new MacBook Pro with M3 chip
        • Google releases updated AI assistant with improved conversational abilities
        • Microsoft launches enhanced Teams integration for remote work
        
        Industry Trends:
        • AI adoption in healthcare accelerates with new FDA approvals
        • Cryptocurrency market shows signs of recovery after regulatory clarity
        • Remote work tools continue to evolve with advanced collaboration features
      `.trim();

      const metadata = {
        publisher: 'TechCrunch',
        date: '2023-12-01',
        source: 'daily-digest-email',
        category: 'technology'
      };
      
      // Process content and generate embeddings
      const result = await this.pineconeService.processAndUpsertDigestContent(
        sampleContent, 
        metadata
      );
      
      console.log('✅ Sample digest content processed:', {
        vectorCount: result.vectorCount,
        processingTime: result.processingTime + 'ms',
        sampleVector: {
          id: result.vectors[0]?.id,
          metadataKeys: Object.keys(result.vectors[0]?.metadata || {}),
          embeddingDimensions: result.vectors[0]?.values?.length
        }
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Error processing digest content:', error);
      throw error;
    }
  }

  /**
   * Example: Generate query embedding and search
   */
  async searchWithEmbedding() {
    try {
      console.log('🔍 Searching with generated query embedding...');
      
      const query = "AI and machine learning startup funding news";
      
      // Generate query embedding
      const queryEmbedding = await this.pineconeService.generateQueryEmbedding(query);
      
      console.log('🧠 Query embedding generated:', {
        query: query,
        dimensions: queryEmbedding.length,
        sampleValues: queryEmbedding.slice(0, 5)
      });
      
      // Search using the embedding
      const searchResults = await this.pineconeService.queryVectors(
        queryEmbedding,
        {
          topK: 5,
          includeMetadata: true,
          filter: {
            content_type: 'daily_digest'
          }
        }
      );
      
      console.log('🎯 Search results:', {
        matchCount: searchResults.matches?.length || 0,
        matches: searchResults.matches?.map(m => ({
          id: m.id,
          score: Math.round(m.score * 1000) / 1000,
          publisher: m.metadata?.publisher,
          date: m.metadata?.date,
          chunkIndex: m.metadata?.chunk_index
        }))
      });
      
      return { queryEmbedding, searchResults };
      
    } catch (error) {
      console.error('❌ Error searching with embedding:', error);
      throw error;
    }
  }

  /**
   * Example: Get index statistics
   */
  async getStatistics() {
    try {
      console.log('📊 Getting index statistics...');
      
      const stats = await this.pineconeService.getIndexStats();
      const health = this.pineconeService.getHealthStatus();
      const metrics = this.pineconeService.getMetrics();
      
      const summary = {
        index: {
          dimension: stats.dimension,
          fullness: stats.indexFullness,
          namespaceCount: Object.keys(stats.namespaces || {}).length,
          totalVectors: Object.values(stats.namespaces || {})
            .reduce((sum, ns) => sum + (ns.vectorCount || 0), 0)
        },
        health: {
          isHealthy: health.isHealthy,
          lastCheck: health.lastCheck,
          consecutiveFailures: health.consecutiveFailures,
          consecutiveSuccesses: health.consecutiveSuccesses
        },
        performance: {
          operationsTracked: Object.keys(metrics.operations).length,
          errorsTracked: Object.keys(metrics.errors).length,
          operationSummary: Object.entries(metrics.operations).reduce((acc, [op, data]) => {
            acc[op] = {
              count: data.count,
              avgDuration: Math.round(data.avgDuration),
              slowQueries: data.slowQueries
            };
            return acc;
          }, {})
        }
      };
      
      console.log('📈 Index Statistics:', JSON.stringify(summary, null, 2));
      
      return summary;
      
    } catch (error) {
      console.error('❌ Error getting statistics:', error);
      throw error;
    }
  }

  /**
   * Run comprehensive demo
   */
  async runDemo() {
    try {
      console.log('\n🎯 Running Pinecone Service Demo...\n');
      
      // 1. Initialize service
      await this.initialize();
      
      // 2. Process sample digest content with embeddings
      await this.processSampleDigestContent();
      
      // 3. Upsert additional sample vectors
      await this.upsertSampleVectors();
      
      // 4. Search with generated embeddings
      await this.searchWithEmbedding();
      
      // 5. Query vectors by publisher
      await this.querySampleVectors();
      
      // 6. Get statistics
      await this.getStatistics();
      
      console.log('\n✅ Demo completed successfully!\n');
      
    } catch (error) {
      console.error('\n❌ Demo failed:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      console.log('🔄 Shutting down Pinecone service...');
      
      // Perform any cleanup operations here
      // Clear intervals, close connections, etc.
      
      console.log('✅ Pinecone service shut down successfully');
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

/**
 * CLI Usage
 */
async function main() {
  const app = new PineconeApp();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await app.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await app.shutdown();
    process.exit(0);
  });

  try {
    const command = process.argv[2];
    
    switch (command) {
      case 'init':
        await app.initialize();
        console.log('✅ Initialization complete');
        break;
        
      case 'demo':
        await app.runDemo();
        break;
        
      case 'upsert':
        await app.initialize();
        await app.upsertSampleVectors();
        break;
        
      case 'process':
        await app.initialize();
        await app.processSampleDigestContent();
        break;
        
      case 'search':
        await app.initialize();
        await app.searchWithEmbedding();
        break;
        
      case 'query':
        await app.initialize();
        await app.querySampleVectors();
        break;
        
      case 'stats':
        await app.initialize();
        await app.getStatistics();
        break;
        
      case 'health':
        await app.initialize();
        const health = app.pineconeService.getHealthStatus();
        console.log('Health Status:', health);
        break;
        
      default:
        console.log(`
📖 Pinecone Vector Database Service with OpenAI Integration

Usage: node index.js <command>

Commands:
  init     - Initialize Pinecone service and OpenAI client
  demo     - Run comprehensive demo with embedding generation
  process  - Process sample digest content with embeddings
  search   - Generate query embedding and search vectors
  upsert   - Upsert sample vectors
  query    - Query sample vectors by publisher
  stats    - Get index statistics and performance metrics
  health   - Check service health status

Examples:
  node index.js demo      # Full demo with embedding generation
  node index.js process   # Process digest content with OpenAI
  node index.js search    # Search using generated embeddings
  node index.js stats     # View index and performance stats
  node index.js health    # Check service health
        `);
    }
    
  } catch (error) {
    console.error('❌ Application error:', error);
    process.exit(1);
  }
}

// Export for use as module
module.exports = PineconeApp;

// Run if called directly
if (require.main === module) {
  main();
} 