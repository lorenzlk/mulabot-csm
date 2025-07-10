/**
 * Comprehensive Test Suite for Pinecone Service
 * Weekly Publisher Digest Assistant
 */

const PineconeService = require('../pinecone-client');
const { 
  PINECONE_CONFIG, 
  NAMESPACE_CONFIG,
  VALIDATION_CONFIG 
} = require('../pinecone-config');

// Mock dependencies
jest.mock('@pinecone-database/pinecone');

describe('PineconeService', () => {
  let pineconeService;
  let mockPineconeClient;
  let mockIndex;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock Pinecone client
    mockIndex = {
      upsert: jest.fn().mockResolvedValue({ success: true }),
      query: jest.fn().mockResolvedValue({ matches: [] }),
      delete1: jest.fn().mockResolvedValue({ success: true }),
      fetch: jest.fn().mockResolvedValue({ vectors: {} }),
      describeIndexStats: jest.fn().mockResolvedValue({ 
        dimension: 1536,
        indexFullness: 0.1,
        namespaces: {}
      })
    };

    mockPineconeClient = {
      init: jest.fn().mockResolvedValue(true),
      listIndexes: jest.fn().mockResolvedValue(['weekly-publisher-digest']),
      createIndex: jest.fn().mockResolvedValue(true),
      describeIndex: jest.fn().mockResolvedValue({
        status: { ready: true },
        database: { dimension: 1536, metric: 'cosine' }
      }),
      Index: jest.fn().mockReturnValue(mockIndex)
    };

    // Mock constructor
    const { PineconeClient } = require('@pinecone-database/pinecone');
    PineconeClient.mockImplementation(() => mockPineconeClient);

    pineconeService = new PineconeService();
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid configuration', async () => {
      const result = await pineconeService.initialize();
      
      expect(result).toBe(true);
      expect(pineconeService.isInitialized).toBe(true);
      expect(mockPineconeClient.init).toHaveBeenCalledWith({
        apiKey: PINECONE_CONFIG.apiKey,
        environment: PINECONE_CONFIG.environment
      });
    });

    test('should handle initialization failure', async () => {
      mockPineconeClient.init.mockRejectedValue(new Error('API key invalid'));
      
      await expect(pineconeService.initialize()).rejects.toThrow('API key invalid');
      expect(pineconeService.isInitialized).toBe(false);
    });

    test('should create index if it does not exist', async () => {
      mockPineconeClient.listIndexes.mockResolvedValue([]);
      
      await pineconeService.initialize();
      
      expect(mockPineconeClient.createIndex).toHaveBeenCalled();
    });

    test('should verify existing index configuration', async () => {
      await pineconeService.initialize();
      
      expect(mockPineconeClient.describeIndex).toHaveBeenCalledWith({
        indexName: PINECONE_CONFIG.indexName
      });
    });
  });

  describe('Vector Operations', () => {
    beforeEach(async () => {
      await pineconeService.initialize();
    });

    describe('Upsert Vectors', () => {
      const testVectors = [
        {
          id: 'test-1',
          values: new Array(1536).fill(0.1),
          metadata: {
            publisher: 'techcrunch',
            date: '2023-12-01',
            content_type: 'daily_digest',
            source: 'test-doc'
          }
        },
        {
          id: 'test-2',
          values: new Array(1536).fill(0.2),
          metadata: {
            publisher: 'brit+co',
            date: '2023-12-01',
            content_type: 'daily_digest',
            source: 'test-doc'
          }
        }
      ];

      test('should upsert vectors successfully', async () => {
        const result = await pineconeService.upsertVectors(testVectors);
        
        expect(result).toEqual({ success: true });
        expect(mockIndex.upsert).toHaveBeenCalledWith({
          upsertRequest: {
            vectors: testVectors,
            namespace: NAMESPACE_CONFIG.daily_digests
          }
        });
      });

      test('should validate vectors before upserting', async () => {
        const invalidVectors = [
          {
            id: 'invalid-1',
            values: new Array(1000).fill(0.1), // Wrong dimensions
            metadata: { publisher: 'test' }
          }
        ];

        await expect(pineconeService.upsertVectors(invalidVectors))
          .rejects.toThrow('Vector dimensions mismatch');
      });

      test('should handle batch upsert for large vector sets', async () => {
        const largeVectorSet = Array.from({ length: 150 }, (_, i) => ({
          id: `test-${i}`,
          values: new Array(1536).fill(0.1),
          metadata: {
            publisher: 'techcrunch',
            date: '2023-12-01',
            content_type: 'daily_digest',
            source: 'test-doc'
          }
        }));

        await pineconeService.upsertVectors(largeVectorSet);
        
        // Should be called twice for 150 vectors (100 + 50)
        expect(mockIndex.upsert).toHaveBeenCalledTimes(2);
      });

      test('should use custom namespace when provided', async () => {
        await pineconeService.upsertVectors(testVectors, 'custom-namespace');
        
        expect(mockIndex.upsert).toHaveBeenCalledWith({
          upsertRequest: {
            vectors: testVectors,
            namespace: 'custom-namespace'
          }
        });
      });

      test('should handle upsert failures with retry', async () => {
        mockIndex.upsert
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValue({ success: true });

        const result = await pineconeService.upsertVectors(testVectors);
        
        expect(result).toEqual({ success: true });
        expect(mockIndex.upsert).toHaveBeenCalledTimes(2);
      });
    });

    describe('Query Vectors', () => {
      const testQueryVector = new Array(1536).fill(0.5);

      test('should query vectors successfully', async () => {
        const mockResponse = {
          matches: [
            { id: 'test-1', score: 0.95, metadata: { publisher: 'techcrunch' } },
            { id: 'test-2', score: 0.85, metadata: { publisher: 'brit+co' } }
          ]
        };
        mockIndex.query.mockResolvedValue(mockResponse);

        const result = await pineconeService.queryVectors(testQueryVector);
        
        expect(result).toEqual(mockResponse);
        expect(mockIndex.query).toHaveBeenCalledWith({
          queryRequest: {
            vector: testQueryVector,
            topK: 10,
            includeMetadata: true,
            includeValues: false,
            namespace: NAMESPACE_CONFIG.daily_digests,
            filter: {}
          }
        });
      });

      test('should apply custom query options', async () => {
        const customOptions = {
          topK: 5,
          namespace: 'custom-namespace',
          filter: { publisher: 'techcrunch' }
        };

        await pineconeService.queryVectors(testQueryVector, customOptions);
        
        expect(mockIndex.query).toHaveBeenCalledWith({
          queryRequest: {
            vector: testQueryVector,
            topK: 5,
            includeMetadata: true,
            includeValues: false,
            namespace: 'custom-namespace',
            filter: { publisher: 'techcrunch' }
          }
        });
      });

      test('should search publisher content with normalized names', async () => {
        await pineconeService.searchPublisherContent(testQueryVector, 'Brit');
        
        expect(mockIndex.query).toHaveBeenCalledWith({
          queryRequest: expect.objectContaining({
            filter: { publisher: 'brit+co' }
          })
        });
      });

      test('should search content by date range', async () => {
        await pineconeService.searchContentByDateRange(
          testQueryVector, 
          '2023-12-01', 
          '2023-12-07'
        );
        
        expect(mockIndex.query).toHaveBeenCalledWith({
          queryRequest: expect.objectContaining({
            filter: {
              date: {
                $gte: '2023-12-01',
                $lte: '2023-12-07'
              }
            }
          })
        });
      });

      test('should search recent content', async () => {
        await pineconeService.searchRecentContent(testQueryVector, 7);
        
        expect(mockIndex.query).toHaveBeenCalledWith({
          queryRequest: expect.objectContaining({
            filter: expect.objectContaining({
              date: expect.objectContaining({
                $gte: expect.any(String),
                $lte: expect.any(String)
              })
            })
          })
        });
      });
    });

    describe('Delete Vectors', () => {
      test('should delete vectors successfully', async () => {
        const testIds = ['test-1', 'test-2'];
        
        const result = await pineconeService.deleteVectors(testIds);
        
        expect(result).toEqual({ success: true });
        expect(mockIndex.delete1).toHaveBeenCalledWith({
          deleteRequest: {
            ids: testIds,
            namespace: NAMESPACE_CONFIG.daily_digests
          }
        });
      });

      test('should use custom namespace for deletion', async () => {
        const testIds = ['test-1'];
        
        await pineconeService.deleteVectors(testIds, 'custom-namespace');
        
        expect(mockIndex.delete1).toHaveBeenCalledWith({
          deleteRequest: {
            ids: testIds,
            namespace: 'custom-namespace'
          }
        });
      });
    });

    describe('Fetch Vectors', () => {
      test('should fetch vectors successfully', async () => {
        const testIds = ['test-1', 'test-2'];
        const mockResponse = {
          vectors: {
            'test-1': { id: 'test-1', values: [], metadata: {} },
            'test-2': { id: 'test-2', values: [], metadata: {} }
          }
        };
        mockIndex.fetch.mockResolvedValue(mockResponse);

        const result = await pineconeService.fetchVectors(testIds);
        
        expect(result).toEqual(mockResponse);
        expect(mockIndex.fetch).toHaveBeenCalledWith({
          fetchRequest: {
            ids: testIds,
            namespace: NAMESPACE_CONFIG.daily_digests
          }
        });
      });
    });
  });

  describe('Validation', () => {
    beforeEach(async () => {
      await pineconeService.initialize();
    });

    test('should validate vector structure', () => {
      const invalidVectors = [
        { values: [] }, // Missing id
        { id: 'test' }, // Missing values
        { id: 'test', values: 'not-array' } // Invalid values type
      ];

      invalidVectors.forEach(vector => {
        expect(() => pineconeService.validateVectors([vector]))
          .toThrow();
      });
    });

    test('should validate vector dimensions', () => {
      const invalidVector = {
        id: 'test',
        values: new Array(100).fill(0.1), // Wrong dimensions
        metadata: {}
      };

      expect(() => pineconeService.validateVectors([invalidVector]))
        .toThrow('Vector dimensions mismatch');
    });

    test('should validate required metadata fields', () => {
      const invalidVector = {
        id: 'test',
        values: new Array(1536).fill(0.1),
        metadata: {
          publisher: 'techcrunch'
          // Missing required fields: date, content_type, source
        }
      };

      expect(() => pineconeService.validateVectors([invalidVector]))
        .toThrow('Required metadata field missing');
    });
  });

  describe('Publisher Name Normalization', () => {
    test('should normalize publisher names using aliases', () => {
      expect(pineconeService.normalizePublisherName('Brit')).toBe('brit+co');
      expect(pineconeService.normalizePublisherName('TC')).toBe('techcrunch');
      expect(pineconeService.normalizePublisherName('The Verge')).toBe('theverge');
    });

    test('should return original name if no alias found', () => {
      expect(pineconeService.normalizePublisherName('Unknown Publisher'))
        .toBe('Unknown Publisher');
    });

    test('should handle case-insensitive matching', () => {
      expect(pineconeService.normalizePublisherName('BRIT')).toBe('brit+co');
      expect(pineconeService.normalizePublisherName('brit')).toBe('brit+co');
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await pineconeService.initialize();
    });

    test('should perform health check successfully', async () => {
      await pineconeService.performHealthCheck();
      
      expect(pineconeService.getHealthStatus().isHealthy).toBe(true);
      expect(mockIndex.describeIndexStats).toHaveBeenCalled();
    });

    test('should handle health check failures', async () => {
      mockIndex.describeIndexStats.mockRejectedValue(new Error('Connection failed'));
      
      await pineconeService.performHealthCheck();
      
      expect(pineconeService.getHealthStatus().consecutiveFailures).toBe(1);
    });

    test('should track consecutive health check results', async () => {
      // Simulate multiple successful health checks
      await pineconeService.performHealthCheck();
      await pineconeService.performHealthCheck();
      
      const status = pineconeService.getHealthStatus();
      expect(status.consecutiveSuccesses).toBe(2);
      expect(status.consecutiveFailures).toBe(0);
    });
  });

  describe('Metrics Collection', () => {
    beforeEach(async () => {
      await pineconeService.initialize();
    });

    test('should record operation metrics', () => {
      pineconeService.recordMetric('upsert', 1500, 10);
      
      const metrics = pineconeService.getMetrics();
      expect(metrics.operations.upsert).toEqual({
        count: 10,
        totalDuration: 1500,
        avgDuration: 150,
        minDuration: 1500,
        maxDuration: 1500,
        slowQueries: 0
      });
    });

    test('should track slow queries', () => {
      pineconeService.recordMetric('query', 6000, 1); // Slow query
      
      const metrics = pineconeService.getMetrics();
      expect(metrics.operations.query.slowQueries).toBe(1);
    });

    test('should record error metrics', () => {
      const error = new Error('Test error');
      pineconeService.recordError('upsert', error, 1000);
      
      const metrics = pineconeService.getMetrics();
      expect(metrics.errors.upsert.count).toBe(1);
      expect(metrics.errors.upsert.errorTypes.Error).toBe(1);
    });
  });

  describe('Retry Logic', () => {
    beforeEach(async () => {
      await pineconeService.initialize();
    });

    test('should retry failed operations', async () => {
      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve('success');
      });

      const result = await pineconeService.executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    test('should fail after max retries exceeded', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(pineconeService.executeWithRetry(operation))
        .rejects.toThrow('Persistent failure');
      
      expect(operation).toHaveBeenCalledTimes(3); // Default max retries
    });

    test('should handle operation timeout', async () => {
      const operation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 70000)) // 70 seconds
      );

      await expect(pineconeService.executeWithRetry(operation))
        .rejects.toThrow('Operation timeout');
    });
  });

  describe('Utility Functions', () => {
    test('should chunk arrays correctly', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunks = pineconeService.chunkArray(array, 3);
      
      expect(chunks).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10]
      ]);
    });

    test('should sleep for specified duration', async () => {
      const start = Date.now();
      await pineconeService.sleep(100);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Index Statistics', () => {
    beforeEach(async () => {
      await pineconeService.initialize();
    });

    test('should retrieve index statistics', async () => {
      const mockStats = {
        dimension: 1536,
        indexFullness: 0.1,
        namespaces: {
          'daily-digests': { vectorCount: 1000 }
        }
      };
      mockIndex.describeIndexStats.mockResolvedValue(mockStats);

      const result = await pineconeService.getIndexStats();
      
      expect(result).toEqual(mockStats);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await pineconeService.initialize();
    });

    test('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      networkError.code = 'ECONNRESET';
      mockIndex.query.mockRejectedValue(networkError);

      await expect(pineconeService.queryVectors(new Array(1536).fill(0.1)))
        .rejects.toThrow('Network error');
    });

    test('should handle API rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.status = 429;
      mockIndex.upsert.mockRejectedValue(rateLimitError);

      await expect(pineconeService.upsertVectors([{
        id: 'test',
        values: new Array(1536).fill(0.1),
        metadata: {
          publisher: 'test',
          date: '2023-12-01',
          content_type: 'test',
          source: 'test'
        }
      }])).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('OpenAI Embedding Integration', () => {
    let mockOpenAI;

    beforeEach(async () => {
      // Mock OpenAI client
      mockOpenAI = {
        embeddings: {
          create: jest.fn().mockResolvedValue({
            data: [
              { embedding: new Array(1536).fill(0.1) },
              { embedding: new Array(1536).fill(0.2) }
            ]
          })
        }
      };

      // Mock OpenAI constructor
      jest.doMock('openai', () => {
        return jest.fn().mockImplementation(() => mockOpenAI);
      });

      await pineconeService.initialize();
      pineconeService.openai = mockOpenAI;
    });

    afterEach(() => {
      jest.unmock('openai');
    });

    describe('Generate Embeddings', () => {
      test('should generate embeddings for single text', async () => {
        const text = 'TechCrunch startup funding news';
        const result = await pineconeService.generateEmbeddings(text);

        expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
          model: 'text-embedding-ada-002',
          input: [text],
          encoding_format: 'float'
        });
        expect(result).toHaveLength(1536);
        expect(result).toEqual(new Array(1536).fill(0.1));
      });

      test('should generate embeddings for multiple texts', async () => {
        const texts = [
          'TechCrunch startup funding news',
          'Brit+Co lifestyle content'
        ];
        const result = await pineconeService.generateEmbeddings(texts);

        expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
          model: 'text-embedding-ada-002',
          input: texts,
          encoding_format: 'float'
        });
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(new Array(1536).fill(0.1));
        expect(result[1]).toEqual(new Array(1536).fill(0.2));
      });

      test('should use custom model when specified', async () => {
        const text = 'Test content';
        await pineconeService.generateEmbeddings(text, { model: 'text-embedding-3-small' });

        expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
          model: 'text-embedding-3-small',
          input: [text],
          encoding_format: 'float'
        });
      });

      test('should handle OpenAI API errors', async () => {
        mockOpenAI.embeddings.create.mockRejectedValue(new Error('OpenAI API error'));

        await expect(pineconeService.generateEmbeddings('test text'))
          .rejects.toThrow('OpenAI API error');
      });

      test('should throw error if OpenAI client not initialized', async () => {
        pineconeService.openai = null;

        await expect(pineconeService.generateEmbeddings('test text'))
          .rejects.toThrow('OpenAI client not initialized');
      });
    });

    describe('Process Digest Content', () => {
      test('should process digest content and create vectors', async () => {
        const content = 'TechCrunch daily digest with startup funding news and product launches.';
        const metadata = {
          publisher: 'TechCrunch',
          date: '2023-12-01',
          source: 'daily-digest-email'
        };

        const result = await pineconeService.processDigestContent(content, metadata);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          id: 'techcrunch-2023-12-01-chunk-0',
          values: new Array(1536).fill(0.1),
          metadata: expect.objectContaining({
            publisher: 'techcrunch',
            date: '2023-12-01',
            content_type: 'daily_digest',
            source: 'daily-digest-email',
            chunk_index: 0,
            total_chunks: 1
          })
        });
      });

      test('should chunk long content', async () => {
        const longContent = 'A'.repeat(10000); // Long content that needs chunking
        const metadata = {
          publisher: 'TechCrunch',
          date: '2023-12-01',
          source: 'daily-digest-email'
        };

        mockOpenAI.embeddings.create.mockResolvedValue({
          data: [
            { embedding: new Array(1536).fill(0.1) },
            { embedding: new Array(1536).fill(0.2) }
          ]
        });

        const result = await pineconeService.processDigestContent(longContent, metadata);

        expect(result.length).toBeGreaterThan(1);
        expect(result[0].metadata.chunk_index).toBe(0);
        expect(result[1].metadata.chunk_index).toBe(1);
      });

      test('should normalize publisher name', async () => {
        const content = 'Test content';
        const metadata = {
          publisher: 'Brit',  // Should be normalized to 'brit+co'
          date: '2023-12-01',
          source: 'test'
        };

        const result = await pineconeService.processDigestContent(content, metadata);

        expect(result[0].metadata.publisher).toBe('brit+co');
        expect(result[0].id).toContain('brit+co');
      });

      test('should require publisher and date in metadata', async () => {
        const content = 'Test content';
        const invalidMetadata = { source: 'test' };

        await expect(pineconeService.processDigestContent(content, invalidMetadata))
          .rejects.toThrow('Publisher and date are required in metadata');
      });
    });

    describe('Generate Query Embedding', () => {
      test('should generate embedding for search query', async () => {
        const query = 'AI startup funding news';
        const result = await pineconeService.generateQueryEmbedding(query);

        expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
          model: 'text-embedding-ada-002',
          input: [query],
          encoding_format: 'float'
        });
        expect(result).toEqual(new Array(1536).fill(0.1));
      });
    });

    describe('Content Chunking', () => {
      test('should return single chunk for short content', () => {
        const shortContent = 'Short content that fits in one chunk.';
        const chunks = pineconeService.chunkContentForEmbedding(shortContent);

        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toBe(shortContent);
      });

      test('should chunk long content at sentence boundaries', () => {
        const longContent = Array.from({ length: 20 }, (_, i) => 
          `This is sentence ${i + 1} with some content.`
        ).join(' ');

        const chunks = pineconeService.chunkContentForEmbedding(longContent, 100);

        expect(chunks.length).toBeGreaterThan(1);
        chunks.forEach(chunk => {
          expect(chunk.length).toBeLessThanOrEqual(100);
        });
      });

      test('should handle content without sentence boundaries', () => {
        const longContent = 'A'.repeat(10000);
        const chunks = pineconeService.chunkContentForEmbedding(longContent, 8000);

        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toBe(longContent);
      });
    });

    describe('Process and Upsert Digest Content', () => {
      test('should process content and upsert vectors in one operation', async () => {
        const content = 'TechCrunch startup news content.';
        const metadata = {
          publisher: 'TechCrunch',
          date: '2023-12-01',
          source: 'daily-digest-email'
        };

        const result = await pineconeService.processAndUpsertDigestContent(content, metadata);

        expect(result).toMatchObject({
          vectors: expect.any(Array),
          upsertResult: { success: true },
          vectorCount: 1,
          processingTime: expect.any(Number)
        });

        expect(mockIndex.upsert).toHaveBeenCalledWith({
          upsertRequest: {
            vectors: result.vectors,
            namespace: NAMESPACE_CONFIG.daily_digests
          }
        });
      });

      test('should use custom namespace when provided', async () => {
        const content = 'Test content';
        const metadata = {
          publisher: 'TechCrunch',
          date: '2023-12-01',
          source: 'test'
        };

        await pineconeService.processAndUpsertDigestContent(content, metadata, 'custom-namespace');

        expect(mockIndex.upsert).toHaveBeenCalledWith({
          upsertRequest: {
            vectors: expect.any(Array),
            namespace: 'custom-namespace'
          }
        });
      });
    });
  });
}); 