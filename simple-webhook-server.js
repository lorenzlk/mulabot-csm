const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));

// Simple data store for testing (in production, you'd use a database)
let documentSections = [];

// Enhanced webhook endpoint - processes and stores data
app.post('/webhook', async (req, res) => {
  try {
    console.log('🎯 WEBHOOK RECEIVED:', new Date().toISOString());
    console.log('📋 Request Headers:', req.headers);
    console.log('📦 Request Body Keys:', Object.keys(req.body));
    
    const { type, sections, documentId, documentName, timestamp } = req.body;
    
    console.log(`📝 Type: ${type}`);
    console.log(`📚 Sections: ${sections ? sections.length : 0}`);
    console.log(`📄 Document ID: ${documentId}`);
    
    if (sections && sections.length > 0) {
      console.log(`📊 First section preview: ${sections[0].content ? sections[0].content.substring(0, 100) + '...' : 'No content'}`);
      
      // Store sections in memory for now (in production, use a database)
      documentSections = sections.map((section, index) => ({
        id: `${documentId}_${index}`,
        documentId: documentId,
        documentName: documentName || 'Mula CS Daily Digest',
        sectionIndex: index,
        date: section.date || new Date().toISOString().split('T')[0],
        timestamp: section.timestamp || timestamp || new Date().toISOString(),
        content: section.content,
        source: 'google_apps_script_webhook',
        type: 'daily_digest_section'
      }));
      
      console.log(`✅ Stored ${documentSections.length} sections in memory`);
    }
    
    // Success response
    res.json({
      success: true,
      message: 'Webhook received and processed successfully!',
      processed: sections ? sections.length : 0,
      stored: documentSections.length,
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Webhook processed successfully');
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to search stored content (for Slack bot integration)
app.get('/api/search', (req, res) => {
  try {
    const { q, publisher, days } = req.query;
    
    let results = documentSections;
    
    // Filter by search query
    if (q) {
      results = results.filter(section => 
        section.content.toLowerCase().includes(q.toLowerCase()) ||
        section.documentName.toLowerCase().includes(q.toLowerCase())
      );
    }
    
    // Filter by publisher
    if (publisher) {
      results = results.filter(section => 
        section.content.toLowerCase().includes(publisher.toLowerCase())
      );
    }
    
    // Filter by date range
    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
      results = results.filter(section => 
        new Date(section.timestamp) >= cutoffDate
      );
    }
    
    console.log(`🔍 Search query: "${q}", publisher: "${publisher}", days: ${days}`);
    console.log(`📊 Found ${results.length} results`);
    
    res.json({
      success: true,
      results: results.slice(0, 10), // Return top 10 results
      total: results.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0-simplified',
    timestamp: new Date().toISOString(),
    message: 'Simplified webhook server with in-memory storage',
    storedSections: documentSections.length,
    services: {
      webhook: 'active',
      search: 'active',
      storage: 'in-memory'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simplified webhook server running on port ${PORT}`);
  console.log(`🌐 Test with: curl http://localhost:${PORT}/health`);
  console.log(`🔗 Use ngrok to expose: ngrok http ${PORT}`);
  console.log('🎯 Webhook processes content and stores in memory');
  console.log('🔍 Search API available at /api/search');
}); 