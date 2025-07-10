# Pinecone Vector Database Setup

## Weekly Publisher Digest Assistant - Vector Search Component

This module provides a comprehensive Pinecone vector database integration for the Weekly Publisher Digest Assistant. It handles vector storage, similarity search, and content retrieval for publisher digest data.

## Features

🚀 **Core Functionality**
- Vector storage with metadata
- Similarity search with filters
- Publisher-specific content retrieval
- Date range and recency-based queries
- Batch processing for large datasets
- **OpenAI embedding generation** for daily digest content
- **Intelligent content chunking** for large documents
- **Query embedding generation** for semantic search

🔧 **Advanced Features**
- Automatic index creation and configuration
- Health monitoring and metrics collection
- Retry logic with exponential backoff
- Comprehensive error handling
- Performance monitoring
- Publisher name normalization and aliases
- **End-to-end content processing** (text → embeddings → vectors → search)
- **Custom embedding models** support

🛡️ **Reliability**
- Connection pooling and timeout handling
- Graceful degradation
- Comprehensive test coverage
- Input validation and schema enforcement
- Automatic recovery mechanisms

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Pinecone Integration                     │
├─────────────────────────────────────────────────────────────┤
│  PineconeService                                           │
│  ├── Index Management (create, verify, monitor)           │
│  ├── Vector Operations (upsert, query, delete, fetch)     │
│  ├── OpenAI Integration (embeddings, content processing)  │
│  ├── Content Processing (chunking, normalization)         │
│  ├── Search Functions (publisher, date, recent)           │
│  ├── Health Monitoring (status, metrics, alerts)         │
│  └── Validation (schema, dimensions, metadata)            │
├─────────────────────────────────────────────────────────────┤
│  Configuration                                             │
│  ├── Environment Variables                                 │
│  ├── Index Configuration                                   │
│  ├── Publisher Aliases                                     │
│  └── Performance Settings                                  │
├─────────────────────────────────────────────────────────────┤
│  Monitoring & Logging                                      │
│  ├── Health Checks                                         │
│  ├── Performance Metrics                                   │
│  ├── Error Tracking                                        │
│  └── External Webhooks                                     │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp environment.template .env

# Configure your API keys in .env
# PINECONE_API_KEY=your-api-key
# PINECONE_ENVIRONMENT=your-environment
```

### 2. Basic Usage

```bash
# Initialize and run demo
npm run demo

# Initialize service only
npm run init

# Run health check
npm run health-check

# View statistics
npm run stats
```

### 3. Programmatic Usage

```javascript
const PineconeApp = require('./index');

async function main() {
  const app = new PineconeApp();
  
  // Initialize
  await app.initialize();
  
  // Upsert vectors
  const vectors = [{
    id: 'content-1',
    values: [0.1, 0.2, ...], // 1536 dimensions
    metadata: {
      publisher: 'techcrunch',
      date: '2023-12-01',
      content_type: 'daily_digest',
      source: 'document-id'
    }
  }];
  
  await app.pineconeService.upsertVectors(vectors);
  
  // Search content
  const results = await app.pineconeService.searchPublisherContent(
    queryVector,
    'techcrunch',
    { topK: 10 }
  );
}
```

## Configuration

### Environment Variables

Copy `environment.template` to `.env` and configure:

```bash
# Required
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-west1-gcp-free
PINECONE_INDEX_NAME=weekly-publisher-digest

# Optional
OPENAI_API_KEY=your-openai-key  # For embeddings
LOG_LEVEL=info
ENABLE_METRICS=true
```

### Index Configuration

The service automatically creates an index with these settings:

- **Dimensions**: 1536 (OpenAI text-embedding-ada-002)
- **Metric**: Cosine similarity
- **Pod Type**: p1.x1 (configurable)
- **Metadata Indexing**: publisher, date, content_type, source, section, timestamp

### Publisher Aliases

Built-in publisher name normalization:

```javascript
'techcrunch' ← ['tc', 'tech crunch', 'techcrunch.com']
'brit+co' ← ['brit', 'britco', 'brit co', 'brit-co']
'theverge' ← ['verge', 'the verge', 'theverge.com']
// ... more aliases
```

## API Reference

### PineconeService

#### Core Operations

```javascript
// Initialize service
await pineconeService.initialize();

// Upsert vectors
await pineconeService.upsertVectors(vectors, namespace);

// Query vectors
const results = await pineconeService.queryVectors(vector, options);

// Delete vectors
await pineconeService.deleteVectors(ids, namespace);

// Fetch vectors by ID
const vectors = await pineconeService.fetchVectors(ids, namespace);
```

#### OpenAI Integration

```javascript
// Generate embeddings for text content
const embeddings = await pineconeService.generateEmbeddings([
  'TechCrunch startup funding news',
  'Apple product launch updates'
]);

// Generate query embedding for search
const queryEmbedding = await pineconeService.generateQueryEmbedding(
  'AI startup funding news'
);

// Process daily digest content (text → embeddings → vectors)
const result = await pineconeService.processDigestContent(
  'Daily digest content here...',
  {
    publisher: 'TechCrunch',
    date: '2023-12-01',
    source: 'daily-digest-email'
  }
);

// Process and upsert in one operation
const result = await pineconeService.processAndUpsertDigestContent(
  'Daily digest content here...',
  {
    publisher: 'TechCrunch',
    date: '2023-12-01',
    source: 'daily-digest-email'
  }
);
```

#### Search Functions

```javascript
// Search by publisher
const results = await pineconeService.searchPublisherContent(
  queryVector, 
  'techcrunch',
  { topK: 10, filter: { section: 'tech_news' } }
);

// Search by date range
const results = await pineconeService.searchContentByDateRange(
  queryVector,
  '2023-12-01',
  '2023-12-07',
  { topK: 10 }
);

// Search recent content
const results = await pineconeService.searchRecentContent(
  queryVector,
  7, // last 7 days
  { topK: 10 }
);
```

#### Monitoring

```javascript
// Get health status
const health = pineconeService.getHealthStatus();

// Get performance metrics
const metrics = pineconeService.getMetrics();

// Get index statistics
const stats = await pineconeService.getIndexStats();
```

### Vector Metadata Schema

Required fields:
- `publisher`: Publisher name (string)
- `date`: Date in ISO format (string)
- `content_type`: Content type (string)
- `source`: Source document/URL (string)

Optional fields:
- `section`: Section within digest (string)
- `timestamp`: Unix timestamp (number)
- `summary`: Brief summary (string)
- `keywords`: Extracted keywords (array)
- `priority`: Priority score 1-10 (number)

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Coverage

The test suite covers:
- ✅ Service initialization
- ✅ Vector operations (upsert, query, delete, fetch)
- ✅ Batch processing
- ✅ Search functions
- ✅ Validation and error handling
- ✅ Health monitoring
- ✅ Metrics collection
- ✅ Retry logic
- ✅ Publisher normalization

## Monitoring & Alerting

### Health Checks

The service automatically monitors:
- Connection health every 5 minutes
- Index accessibility
- Error rates and patterns
- Performance metrics

### Metrics Collected

- **Operations**: Count, duration, success/failure rates
- **Performance**: Average response times, slow queries
- **Errors**: Error counts by type and operation
- **Health**: Consecutive failures/successes

### External Monitoring

Configure webhook endpoints for:
- Health status changes
- High error rates
- Performance degradation
- System alerts

## Performance Optimization

### Batch Processing

Large vector sets are automatically batched:
- **Max batch size**: 100 vectors
- **Concurrent batches**: 5
- **Retry logic**: 3 attempts with exponential backoff

### Connection Management

- **Timeout**: 60 seconds default
- **Retry attempts**: 3 with exponential backoff
- **Connection pooling**: Automatic
- **Rate limiting**: Built-in protection

### Query Optimization

- **Default topK**: 10 results
- **Metadata filtering**: Indexed fields for fast filtering
- **Namespace separation**: Organize vectors by type

## Troubleshooting

### Common Issues

**1. API Key Issues**
```bash
Error: API key invalid
```
- Verify `PINECONE_API_KEY` in .env
- Check key permissions in Pinecone console

**2. Index Not Found**
```bash
Error: Index 'weekly-publisher-digest' not found
```
- Service auto-creates index on first run
- Check `PINECONE_INDEX_NAME` configuration

**3. Dimension Mismatch**
```bash
Error: Vector dimensions mismatch: expected 1536, got 768
```
- Ensure vectors have 1536 dimensions
- Check embedding model configuration

**4. Rate Limiting**
```bash
Error: Rate limit exceeded
```
- Reduce batch size
- Implement delays between operations
- Upgrade Pinecone plan if needed

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

### Health Check Endpoint

Check service health:
```bash
node index.js health
```

## Integration Examples

### With Google Apps Script

```javascript
// Google Apps Script webhook payload
const payload = {
  type: 'document_update',
  sections: [{
    content: 'Daily digest content...',
    date: '2023-12-01',
    publisher: 'techcrunch'
  }]
};

// Process in Pinecone service
await pineconeService.upsertVectors([{
  id: `${payload.publisher}-${payload.date}`,
  values: await generateEmbedding(payload.sections[0].content),
  metadata: {
    publisher: payload.publisher,
    date: payload.date,
    content_type: 'daily_digest',
    source: payload.documentId
  }
}]);
```

### With Slack Bot

```javascript
// Slack command: /digest techcrunch 7
async function handleSlackCommand(publisher, days) {
  const queryVector = await generateEmbedding(`${publisher} news summary`);
  
  const results = await pineconeService.searchPublisherContent(
    queryVector,
    publisher,
    { 
      topK: 20,
      filter: {
        date: {
          $gte: getDateDaysAgo(days),
          $lte: getCurrentDate()
        }
      }
    }
  );
  
  return formatSlackResponse(results);
}
```

## Security Considerations

- **API Keys**: Store securely, rotate regularly
- **Network**: Use HTTPS for all requests
- **Input Validation**: Validate all vector data
- **Rate Limiting**: Implement client-side limits
- **Access Control**: Restrict index access
- **Monitoring**: Log security events

## Development

### Project Structure

```
pinecone-setup/
├── pinecone-config.js      # Configuration management
├── pinecone-client.js      # Core service implementation
├── index.js               # Main entry point and CLI
├── package.json           # Dependencies and scripts
├── environment.template   # Environment variable template
├── test/
│   └── pinecone-service.test.js  # Comprehensive test suite
└── README.md             # This documentation
```

### Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Write** tests for new features
4. **Ensure** all tests pass
5. **Submit** a pull request

### Code Style

- ESLint configuration included
- Prettier for formatting
- Jest for testing
- Standard.js style guide

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- 📧 Email: support@your-domain.com
- 🐛 Issues: GitHub Issues
- 📖 Docs: This README
- 💬 Discussions: GitHub Discussions

---

**Ready to get started?** Run `npm run demo` to see the Pinecone integration in action! 