const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));

// Simple data store
let documentSections = [];

// Basic webhook endpoint - receives data from Google Apps Script
app.post('/webhook', (req, res) => {
  console.log('📨 Webhook received at:', new Date().toISOString());
  console.log('📦 Data received:', JSON.stringify(req.body, null, 2));
  
  // Store the data
  if (req.body.sections) {
    documentSections = req.body.sections;
    console.log(`✅ Stored ${documentSections.length} sections`);
  }
  
  // Simple success response
  res.json({
    success: true,
    message: 'Data received successfully',
    sectionsReceived: req.body.sections ? req.body.sections.length : 0,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    sectionsStored: documentSections.length
  });
});

// Simple test endpoint to check stored data
app.get('/test', (req, res) => {
  res.json({
    sectionsStored: documentSections.length,
    sections: documentSections.slice(0, 3) // Show first 3 for testing
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple webhook server running on port ${PORT}`);
  console.log(`💡 Test health: curl http://localhost:${PORT}/health`);
  console.log(`🔗 Expose with ngrok: ngrok http ${PORT}`);
}); 