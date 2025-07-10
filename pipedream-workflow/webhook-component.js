/**
 * Pipedream HTTP Webhook: Weekly Publisher Digest Processor
 * Receives webhooks from Google Apps Script and processes content
 * Uses environment variables for configuration
 */

import { OpenAI } from 'openai';

export default defineComponent({
  name: "Weekly Publisher Digest Webhook",
  version: "0.1.0",
  description: "HTTP webhook for processing daily digest content with vector embeddings and AI summaries",
  
  props: {
    http: "$.interface.http",
  },

  async run({ body, query, headers, $ }) {
    const startTime = Date.now();
    
    try {
      // Handle both GET and POST requests
      const requestData = {};
      
      if (body && Object.keys(body).length > 0) {
        // POST request with JSON body
        Object.assign(requestData, body);
      } else if (query && Object.keys(query).length > 0) {
        // GET request with query parameters
        requestData.type = query.type || 'notification';
        requestData.action = query.action || 'process_content';
        if (query.sections) {
          try {
            requestData.sections = JSON.parse(query.sections);
          } catch (e) {
            requestData.sections = [];
          }
        }
        requestData.documentId = query.documentId || process.env.GOOGLE_DOC_ID;
        requestData.timestamp = query.timestamp || new Date().toISOString();
      } else {
        // Default health check
        requestData.type = 'default';
      }
      
      console.log(`📥 Webhook received`, { requestData, headers: Object.keys(headers) });
      
      // Process based on request type
      if (requestData.type === 'health') {
        const response = {
          success: true,
          status: "healthy",
          timestamp: new Date().toISOString(),
          services: {
            openai: !!process.env.OPENAI_API_KEY,
            pinecone: !!process.env.PINECONE_API_KEY,
            slack: !!process.env.SLACK_BOT_TOKEN,
            pinecone_index: process.env.PINECONE_INDEX_NAME,
            pinecone_endpoint: !!process.env.PINECONE_ENDPOINT
          },
          environment_check: {
            required_vars: [
              'OPENAI_API_KEY',
              'PINECONE_API_KEY', 
              'PINECONE_INDEX_NAME'
            ],
            optional_vars: [
              'SLACK_BOT_TOKEN',
              'PINECONE_ENDPOINT',
              'GOOGLE_DOC_ID'
            ]
          }
        };
        
        await $.respond({
          status: 200,
          headers: { "Content-Type": "application/json" },
          body: response
        });
        
        return response;
      }
      
      if (requestData.type === 'test') {
        const response = {
          success: true,
          message: "Pipedream webhook test successful",
          received: requestData,
          timestamp: new Date().toISOString(),
          environment_variables_configured: {
            openai: !!process.env.OPENAI_API_KEY,
            pinecone: !!process.env.PINECONE_API_KEY,
            pinecone_index: !!process.env.PINECONE_INDEX_NAME
          }
        };
        
        await $.respond({
          status: 200,
          headers: { "Content-Type": "application/json" },
          body: response
        });
        
        return response;
      }
      
      // Main content processing
      if (requestData.type === 'document_update' || requestData.type === 'process') {
        const result = await this.processDigestContent(requestData, $);
        
        await $.respond({
          status: 200,
          headers: { "Content-Type": "application/json" },
          body: result
        });
        
        return result;
      }
      
      // Default response
      const defaultResponse = {
        success: true,
        message: "Weekly Publisher Digest Processor - Webhook Ready",
        timestamp: new Date().toISOString(),
        supportedMethods: ["GET", "POST"],
        endpoints: {
          process: "?type=process&sections=[...]",
          health: "?type=health",
          test: "?type=test"
        },
        configuration: {
          openai: !!process.env.OPENAI_API_KEY,
          pinecone: !!process.env.PINECONE_API_KEY,
          slack: !!process.env.SLACK_BOT_TOKEN,
          pinecone_index: process.env.PINECONE_INDEX_NAME || 'not_configured'
        }
      };
      
      await $.respond({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: defaultResponse
      });
      
      return defaultResponse;
      
    } catch (error) {
      console.error('❌ Pipedream processing error:', error);
      
      const errorResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      await $.respond({
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: errorResponse
      });
      
      return errorResponse;
    }
  },

  async processDigestContent(requestData, $) {
    const timer = Date.now();
    
    try {
      console.log('🔄 Processing digest content...', {
        sectionsCount: requestData.sections?.length || 0,
        documentId: requestData.documentId
      });
      
      // Validate required environment variables
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }
      
      if (!process.env.PINECONE_API_KEY) {
        throw new Error('PINECONE_API_KEY environment variable is required');
      }
      
      if (!process.env.PINECONE_INDEX_NAME) {
        throw new Error('PINECONE_INDEX_NAME environment variable is required');
      }
      
      // Initialize services
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const pinecone = await this.initializePinecone();
      
      // Process each section
      const processedSections = [];
      const totalCost = { total: 0, embedding: 0, completion: 0 };
      
      for (const section of (requestData.sections || [])) {
        try {
          // Generate embeddings
          const embeddingResult = await this.generateEmbeddings(openai, section.content);
          totalCost.embedding += embeddingResult.cost;
          
          // Upsert to Pinecone
          await this.upsertToPinecone(pinecone, {
            id: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            values: embeddingResult.embedding,
            metadata: {
              content: section.content,
              date: section.date,
              timestamp: section.timestamp,
              documentId: requestData.documentId,
              type: 'daily_digest_section'
            }
          });
          
          // Generate AI summary
          const summaryResult = await this.generateSummary(openai, section.content);
          totalCost.completion += summaryResult.cost;
          
          processedSections.push({
            date: section.date,
            originalLength: section.content.length,
            summary: summaryResult.summary,
            confidence: summaryResult.confidence,
            embeddingGenerated: true,
            pineconeUpserted: true
          });
          
        } catch (sectionError) {
          console.error(`❌ Error processing section: ${section.date}`, sectionError);
          processedSections.push({
            date: section.date,
            error: sectionError.message,
            processed: false
          });
        }
      }
      
      totalCost.total = totalCost.embedding + totalCost.completion;
      
      // Send Slack notification (if configured)
      if (process.env.SLACK_BOT_TOKEN && processedSections.length > 0) {
        await this.sendSlackNotification({
          sectionsProcessed: processedSections.length,
          totalCost: totalCost,
          documentId: requestData.documentId,
          timestamp: new Date().toISOString()
        });
      }
      
      const processingTime = Date.now() - timer;
      
      const result = {
        success: true,
        message: `Processed ${processedSections.length} sections`,
        data: {
          sectionsProcessed: processedSections.length,
          successfulSections: processedSections.filter(s => !s.error).length,
          failedSections: processedSections.filter(s => s.error).length,
          totalCost: totalCost,
          processingTime: `${processingTime}ms`,
          sections: processedSections,
          environment: {
            pinecone_index: process.env.PINECONE_INDEX_NAME,
            openai_model: 'gpt-4o-mini',
            embedding_model: 'text-embedding-3-small'
          }
        },
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Content processing completed', result.data);
      return result;
      
    } catch (error) {
      console.error('❌ Error in processDigestContent:', error);
      throw error;
    }
  },

  async initializePinecone() {
    // Pinecone initialization logic using environment variables
    const { Pinecone } = await import('@pinecone-database/pinecone');
    
    const config = {
      apiKey: process.env.PINECONE_API_KEY
    };
    
    // Add endpoint if provided (for specific Pinecone environments)
    if (process.env.PINECONE_ENDPOINT) {
      config.controllerHostUrl = process.env.PINECONE_ENDPOINT;
    }
    
    const pc = new Pinecone(config);
    
    return pc.index(process.env.PINECONE_INDEX_NAME);
  },

  async generateEmbeddings(openai, content) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content.substring(0, 8000), // Limit content length
    });
    
    return {
      embedding: response.data[0].embedding,
      cost: this.calculateEmbeddingCost(response.usage.total_tokens)
    };
  },

  async generateSummary(openai, content) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a CS account manager assistant. Summarize the daily digest content concisely, focusing on key client updates, issues, and action items.'
        },
        {
          role: 'user', 
          content: `Summarize this daily digest section:\n\n${content.substring(0, 4000)}`
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    });
    
    return {
      summary: response.choices[0].message.content,
      confidence: response.choices[0].finish_reason === 'stop' ? 0.9 : 0.7,
      cost: this.calculateCompletionCost(response.usage.total_tokens)
    };
  },

  async upsertToPinecone(index, vector) {
    await index.upsert([vector]);
  },

  async sendSlackNotification(data) {
    const axios = await import('axios');
    
    // Use Slack Bot Token for webhook (if configured)
    if (!process.env.SLACK_BOT_TOKEN) {
      console.log('⚠️ SLACK_BOT_TOKEN not configured, skipping notification');
      return;
    }
    
    const message = {
      text: `📊 Daily Digest Processed`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Daily Digest Processing Complete* ✅\n\n*Sections Processed:* ${data.sectionsProcessed}\n*Total Cost:* $${data.totalCost.total.toFixed(4)}\n*Timestamp:* ${data.timestamp}`
          }
        }
      ]
    };
    
    // Note: This assumes a webhook URL setup. For production, you'd use the Slack Web API
    console.log('📤 Slack notification prepared:', message);
  },

  calculateEmbeddingCost(tokens) {
    // text-embedding-3-small: $0.00002 per 1K tokens
    return (tokens / 1000) * 0.00002;
  },

  calculateCompletionCost(tokens) {
    // gpt-4o-mini: $0.000150 per 1K input tokens, $0.000600 per 1K output tokens (simplified)
    return (tokens / 1000) * 0.000375; // Average estimate
  }
}); 