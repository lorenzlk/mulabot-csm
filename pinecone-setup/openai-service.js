/**
 * OpenAI Integration Service
 * Weekly Publisher Digest Assistant
 * 
 * Handles advanced OpenAI features including:
 * - Content summarization with GPT-4
 * - Confidence scoring for content relevance
 * - Source citation generation
 * - Token counting and cost optimization
 */

const OpenAI = require('openai');

class OpenAIService {
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      organization: config.organization || process.env.OPENAI_ORG_ID,
      maxTokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.7,
      model: config.model || 'gpt-4',
      embeddingModel: config.embeddingModel || 'text-embedding-3-small',
      maxRetries: config.maxRetries || 3,
      timeoutMs: config.timeoutMs || 60000,
      ...config
    };

    this.client = null;
    this.isInitialized = false;
    this.costTracking = {
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0
    };
    this.logger = this.createLogger();
  }

  /**
   * Initialize OpenAI client
   */
  async initialize() {
    try {
      this.logger.info('Initializing OpenAI service...');

      if (!this.config.apiKey) {
        throw new Error('OpenAI API key is required');
      }

      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        organization: this.config.organization,
        timeout: this.config.timeoutMs,
        maxRetries: this.config.maxRetries
      });

      // Test the connection
      await this.testConnection();

      this.isInitialized = true;
      this.logger.info('OpenAI service initialized successfully');

      return true;

    } catch (error) {
      this.logger.error('Failed to initialize OpenAI service:', error);
      throw error;
    }
  }

  /**
   * Test OpenAI connection with a simple request
   */
  async testConnection() {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });

      if (!response || !response.choices || !response.choices[0]) {
        throw new Error('Invalid response from OpenAI API');
      }

      this.logger.info('OpenAI connection test successful');
      return true;

    } catch (error) {
      this.logger.error('OpenAI connection test failed:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive summary from publisher content
   */
  async generatePublisherSummary(content, options = {}) {
    const startTime = Date.now();

    try {
      this.validateInitialization();

      const {
        publisher = 'Unknown Publisher',
        timeframe = '7 days',
        format = 'comprehensive',
        maxSections = 5,
        includeConfidence = true,
        includeCitations = true
      } = options;

      this.logger.info(`Generating ${format} summary for ${publisher} (${timeframe})`);

      // Create dynamic prompt based on content and options
      const prompt = this.createSummaryPrompt(content, {
        publisher,
        timeframe,
        format,
        maxSections,
        includeConfidence,
        includeCitations
      });

      // Generate summary using GPT-4
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt('summarizer')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      });

      const rawSummary = response.choices[0].message.content;
      const tokens = response.usage;

      // Parse and structure the summary
      const structuredSummary = this.parseSummaryResponse(rawSummary, options);

      // Track costs and performance
      this.trackUsage(tokens, Date.now() - startTime);

      this.logger.info(`Summary generated in ${Date.now() - startTime}ms using ${tokens.total_tokens} tokens`);

      return {
        success: true,
        summary: structuredSummary,
        metadata: {
          publisher,
          timeframe,
          format,
          processingTime: Date.now() - startTime,
          tokenUsage: tokens,
          model: this.config.model,
          confidence: structuredSummary.confidence || null,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Error generating publisher summary:', error);
      throw error;
    }
  }

  /**
   * Create dynamic summary prompt based on content and requirements
   */
  createSummaryPrompt(content, options) {
    const {
      publisher,
      timeframe,
      format,
      maxSections,
      includeConfidence,
      includeCitations
    } = options;

    let prompt = `
Please analyze the following content about ${publisher} from the last ${timeframe} and create a ${format} summary.

Content to analyze:
---
${content}
---

Requirements:
- Create a maximum of ${maxSections} key sections
- Focus on the most important developments, announcements, and trends
- Use clear, professional language suitable for business stakeholders
- Prioritize actionable insights and significant changes
    `;

    if (includeConfidence) {
      prompt += `
- Include a confidence score (0-100) for the overall summary quality based on content depth and relevance`;
    }

    if (includeCitations) {
      prompt += `
- Include source references or content snippets to support key points`;
    }

    prompt += `

Format the response as JSON with the following structure:
{
  "title": "Summary title",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Section content",
      "importance": "high|medium|low",
      "citations": ["source1", "source2"] // if applicable
    }
  ],
  "keyTakeaways": ["takeaway1", "takeaway2", "takeaway3"],
  ${includeConfidence ? '"confidence": 85,' : ''}
  "summary": "One paragraph executive summary"
}`;

    return prompt;
  }

  /**
   * Get system prompts for different AI roles
   */
  getSystemPrompt(role) {
    const prompts = {
      summarizer: `You are an expert content analyst specializing in publisher and media industry analysis. 
Your role is to create concise, actionable summaries from daily digest content. 
Focus on business implications, key developments, and strategic insights. 
Always maintain objectivity and cite sources when available.`,

      classifier: `You are a content classification expert. 
Analyze content to determine relevance, sentiment, and categorization. 
Provide confidence scores and detailed reasoning for your classifications.`,

      citation_generator: `You are a citation and source verification expert. 
Generate accurate source references and verify content authenticity. 
Create proper attribution for all claims and statements.`
    };

    return prompts[role] || prompts.summarizer;
  }

  /**
   * Parse and structure AI response into standardized format
   */
  parseSummaryResponse(rawResponse, options = {}) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(rawResponse);
      
      // Validate required fields
      if (!parsed.title || !parsed.sections || !parsed.summary) {
        throw new Error('Invalid summary structure');
      }

      return parsed;

    } catch (error) {
      this.logger.warn('Failed to parse JSON response, attempting text parsing:', error);
      
      // Fallback to text parsing
      return this.parseTextSummary(rawResponse, options);
    }
  }

  /**
   * Fallback text parsing for non-JSON responses
   */
  parseTextSummary(text, options = {}) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    return {
      title: lines[0] || 'Publisher Summary',
      sections: [{
        heading: 'Summary',
        content: text,
        importance: 'high',
        citations: []
      }],
      keyTakeaways: this.extractKeyTakeaways(text),
      confidence: options.includeConfidence ? this.estimateConfidence(text) : null,
      summary: this.extractExecutiveSummary(text)
    };
  }

  /**
   * Extract key takeaways from text content
   */
  extractKeyTakeaways(text) {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
    return sentences.slice(0, 3).map(s => s.length > 100 ? s.substring(0, 100) + '...' : s);
  }

  /**
   * Estimate confidence score based on content characteristics
   */
  estimateConfidence(text) {
    let score = 50; // Base score

    // Content length factors
    if (text.length > 500) score += 10;
    if (text.length > 1000) score += 10;
    if (text.length < 100) score -= 20;

    // Structure factors
    if (text.includes('•') || text.includes('-')) score += 5; // Has bullet points
    if (text.match(/\d+/g)) score += 5; // Contains numbers/data
    if (text.includes('$') || text.includes('%')) score += 10; // Financial data

    // Quality factors
    const sentences = text.split(/[.!?]+/).length;
    if (sentences > 5) score += 5;
    if (sentences > 10) score += 5;

    return Math.max(30, Math.min(95, score));
  }

  /**
   * Extract executive summary from longer content
   */
  extractExecutiveSummary(text) {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
    const firstFewSentences = sentences.slice(0, 2).join('. ');
    return firstFewSentences.length > 200 ? firstFewSentences.substring(0, 200) + '...' : firstFewSentences;
  }

  /**
   * Generate embeddings (delegated from pinecone-client for consistency)
   */
  async generateEmbeddings(texts, options = {}) {
    const startTime = Date.now();

    try {
      this.validateInitialization();

      const textArray = Array.isArray(texts) ? texts : [texts];
      
      this.logger.info(`Generating embeddings for ${textArray.length} texts`);

      const response = await this.client.embeddings.create({
        model: options.model || this.config.embeddingModel,
        input: textArray,
        encoding_format: 'float'
      });

      const embeddings = response.data.map(item => item.embedding);
      const tokens = response.usage;

      // Track usage
      this.trackUsage(tokens, Date.now() - startTime);

      this.logger.info(`Generated ${embeddings.length} embeddings in ${Date.now() - startTime}ms`);
      
      return Array.isArray(texts) ? embeddings : embeddings[0];

    } catch (error) {
      this.logger.error('Error generating embeddings:', error);
      throw error;
    }
  }

  /**
   * Count tokens in text (approximation)
   */
  countTokens(text) {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate costs for API calls
   */
  estimateCost(tokens, model = null) {
    const pricing = {
      'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
      'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 },
      'gpt-3.5-turbo': { input: 0.001 / 1000, output: 0.002 / 1000 },
      'text-embedding-ada-002': { input: 0.0001 / 1000, output: 0 }
    };

    const modelPricing = pricing[model || this.config.model] || pricing['gpt-4'];
    return (tokens.prompt_tokens * modelPricing.input) + (tokens.completion_tokens * modelPricing.output);
  }

  /**
   * Track API usage and costs
   */
  trackUsage(tokens, duration) {
    const cost = this.estimateCost(tokens);
    
    this.costTracking.totalTokens += tokens.total_tokens;
    this.costTracking.totalCost += cost;
    this.costTracking.requestCount += 1;

    this.logger.debug(`API call: ${tokens.total_tokens} tokens, $${cost.toFixed(4)}, ${duration}ms`);
  }

  /**
   * Get cost tracking summary
   */
  getCostSummary() {
    return {
      totalTokens: this.costTracking.totalTokens,
      totalCost: this.costTracking.totalCost,
      requestCount: this.costTracking.requestCount,
      avgCostPerRequest: this.costTracking.requestCount > 0 
        ? this.costTracking.totalCost / this.costTracking.requestCount 
        : 0,
      avgTokensPerRequest: this.costTracking.requestCount > 0
        ? this.costTracking.totalTokens / this.costTracking.requestCount
        : 0
    };
  }

  /**
   * Reset cost tracking
   */
  resetCostTracking() {
    this.costTracking = {
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0
    };
  }

  /**
   * Validate service is initialized
   */
  validateInitialization() {
    if (!this.isInitialized || !this.client) {
      throw new Error('OpenAI service not initialized. Call initialize() first.');
    }
  }

  /**
   * Create logger instance
   */
  createLogger() {
    const logLevel = process.env.LOG_LEVEL || 'info';
    return {
      error: (...args) => console.error('[OpenAI-ERROR]', ...args),
      warn: (...args) => logLevel !== 'error' && console.warn('[OpenAI-WARN]', ...args),
      info: (...args) => ['info', 'debug'].includes(logLevel) && console.info('[OpenAI-INFO]', ...args),
      debug: (...args) => logLevel === 'debug' && console.log('[OpenAI-DEBUG]', ...args)
    };
  }
}

module.exports = OpenAIService; 