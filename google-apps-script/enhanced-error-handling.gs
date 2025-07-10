/**
 * Enhanced OpenAI Client with Better Error Handling
 * Add this to your Google Apps Script to replace the existing OpenAIClient class
 */

class OpenAIClient {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }
  
  generateSummary(prompt) {
    const payload = {
      model: CONFIG.API.MODEL_NAME,
      messages: [
        {
          role: 'system',
          content: 'You are a concise, bullet-point-focused assistant. Summarize only what changed today, highlighting collaboration with the partner domain.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: CONFIG.API.TEMPERATURE,
      max_tokens: CONFIG.API.MAX_TOKENS
    };
    
    return this._makeRequestWithRetry(payload, prompt);
  }
  
  _makeRequestWithRetry(payload, originalPrompt) {
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: `Bearer ${this.config.openaiKey}` },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    for (let attempt = 0; attempt <= CONFIG.API.RETRY_ATTEMPTS; attempt++) {
      try {
        const response = UrlFetchApp.fetch(CONFIG.API.OPENAI_ENDPOINT, options);
        const responseCode = response.getResponseCode();
        const responseText = response.getContentText();
        
        this.logger.info(`OpenAI API attempt ${attempt + 1}: HTTP ${responseCode}`);
        
        if (responseCode === 200) {
          const data = JSON.parse(responseText);
          const content = data.choices?.[0]?.message?.content?.trim();
          
          if (content) {
            return content;
          } else {
            this.logger.warn(`OpenAI returned empty content. Response: ${responseText}`);
          }
        } else if (responseCode === 429) {
          this.logger.warn(`OpenAI rate limit hit (429). Waiting longer...`);
          if (attempt < CONFIG.API.RETRY_ATTEMPTS) {
            Utilities.sleep(CONFIG.API.RETRY_DELAY_BASE * Math.pow(2, attempt) * 2); // Double wait for rate limits
          }
        } else if (responseCode === 400) {
          this.logger.error(`OpenAI bad request (400). Response: ${responseText}`);
          this.logger.error(`Prompt length: ${originalPrompt.length} chars`);
          this.logger.error(`Payload: ${JSON.stringify(payload, null, 2)}`);
          
          // Try with shorter prompt
          if (originalPrompt.length > 8000) {
            this.logger.info(`Trying with shorter prompt...`);
            const shorterPrompt = originalPrompt.substring(0, 8000) + "\n\n[Content truncated for API limits]";
            payload.messages[1].content = shorterPrompt;
            continue;
          }
          
          return this._createFallbackSummary(originalPrompt, "Bad request - content may be too long or malformed");
        } else if (responseCode === 401) {
          this.logger.error(`OpenAI authentication failed (401). Check API key.`);
          return this._createFallbackSummary(originalPrompt, "Authentication failed - check API key");
        } else {
          this.logger.warn(`OpenAI API error: HTTP ${responseCode}, Response: ${responseText}`);
          if (attempt < CONFIG.API.RETRY_ATTEMPTS) {
            Utilities.sleep(CONFIG.API.RETRY_DELAY_BASE * Math.pow(2, attempt));
          }
        }
        
      } catch (error) {
        this.logger.error(`OpenAI request attempt ${attempt + 1} failed: ${error.message}`);
        
        if (attempt < CONFIG.API.RETRY_ATTEMPTS) {
          Utilities.sleep(CONFIG.API.RETRY_DELAY_BASE * Math.pow(2, attempt));
        }
      }
    }
    
    return this._createFallbackSummary(originalPrompt, "All retry attempts failed");
  }
  
  _createFallbackSummary(originalPrompt, errorReason) {
    this.logger.error(`Creating fallback summary due to: ${errorReason}`);
    
    // Extract basic info from the prompt
    const lines = originalPrompt.split('\n');
    const subjectLine = lines.find(line => line.includes('###'));
    const subject = subjectLine ? subjectLine.replace('###', '').trim() : 'Email Thread';
    
    // Try to extract key information manually
    const emailContent = originalPrompt.toLowerCase();
    let status = '📧 Info Only';
    let keyPoints = [];
    
    // Basic pattern matching for status
    if (emailContent.includes('resolved') || emailContent.includes('completed') || emailContent.includes('done')) {
      status = '✅ Resolved';
    } else if (emailContent.includes('waiting') || emailContent.includes('pending')) {
      status = '⏸️ Waiting';
    } else if (emailContent.includes('blocked') || emailContent.includes('issue')) {
      status = '⚠️ Blocked';
    } else if (emailContent.includes('progress') || emailContent.includes('working')) {
      status = '🔄 In Progress';
    }
    
    // Extract basic action items
    if (emailContent.includes('meeting') || emailContent.includes('call')) {
      keyPoints.push('Meeting or call mentioned');
    }
    if (emailContent.includes('document') || emailContent.includes('contract')) {
      keyPoints.push('Document or contract referenced');
    }
    if (emailContent.includes('test') || emailContent.includes('implementation')) {
      keyPoints.push('Testing or implementation discussed');
    }
    
    const keyActionsText = keyPoints.length > 0 
      ? keyPoints.map(point => `- ${point}`).join('\n')
      : '- Email thread activity detected but content could not be processed';
    
    return `### ${subject}

**Context:** Email thread with recent activity (auto-generated due to processing error: ${errorReason})

**Key Actions:**
${keyActionsText}

**Next Steps:**
- Review original email thread for specific details
- Manual summary may be needed for complex content

**Status:** ${status}

_Note: This is a fallback summary. Original content processing failed._`;
  }
}

/**
 * Enhanced Summary Generator with Better Error Handling
 * Replace the existing _generateThreadSummary method
 */
class SummaryGenerator {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.openaiClient = new OpenAIClient(config, logger);
  }
  
  generateAllSummaries(categorizedThreads, dates) {
    const summaries = {};
    const allThreads = [
      ...categorizedThreads.meetings,
      ...categorizedThreads.support,
      ...categorizedThreads.partners
    ];
    
    this.logger.info(`Generating summaries for ${allThreads.length} threads`);
    
    allThreads.forEach((threadInfo, index) => {
      this.logger.info(`Processing thread ${index + 1}/${allThreads.length}: ${threadInfo.subject}`);
      summaries[threadInfo.threadId] = this._generateThreadSummary(threadInfo, dates);
    });
    
    return summaries;
  }
  
  _generateThreadSummary(threadInfo, dates) {
    if (threadInfo.messageCount === 0) {
      return `### ${threadInfo.subject}\n_No action required._`;
    }
    
    // Log thread details for debugging
    this.logger.info(`Generating summary for: ${threadInfo.subject}`);
    this.logger.info(`Domain: ${threadInfo.domain}, Messages: ${threadInfo.messageCount}`);
    this.logger.info(`Content length: ${threadInfo.todaysMessagesText.length} chars`);
    
    const prompt = this._buildSummaryPrompt(threadInfo, dates);
    
    try {
      const summary = this.openaiClient.generateSummary(prompt);
      
      if (summary) {
        this.logger.info(`Successfully generated summary for: ${threadInfo.subject}`);
        return summary;
      } else {
        this.logger.warn(`No summary returned for: ${threadInfo.subject}`);
        return `### ${threadInfo.subject}\n**Error:** Could not generate summary for this thread.`;
      }
    } catch (error) {
      this.logger.error(`Exception generating summary for ${threadInfo.subject}: ${error.message}`);
      return `### ${threadInfo.subject}\n**Error:** Exception occurred: ${error.message}`;
    }
  }
  
  _buildSummaryPrompt(threadInfo, dates) {
    let recapSection = '';
    if (threadInfo.previousContextText) {
      recapSection = `**Relationship Context:** ${threadInfo.previousContextText}\n\n`;
    }
    
    // Truncate very long content to prevent API issues
    const maxContentLength = 12000;
    let contentText = threadInfo.todaysMessagesText;
    if (contentText.length > maxContentLength) {
      contentText = contentText.substring(0, maxContentLength) + "\n\n[Content truncated due to length limits]";
    }
    
    return `You are an AI assistant creating a factual daily email digest. For the email thread below with activity on ${dates.humanDate}, create a precise summary focused on concrete actions, decisions, and outcomes.

### ${threadInfo.subject}
${recapSection}**Email Activity (${dates.humanDate}):**  
${contentText}

Create a factual summary using this structure:

**Context:** One sentence describing what this email thread is specifically about (the actual project, deal, issue, or task being discussed).

**Key Actions:** (bullet points - be specific and factual)
- What specific actions were taken, requested, or completed
- Any decisions made or agreements reached
- Problems identified or resolved
- Documents shared, deadlines set, or deliverables mentioned
- Use "(${threadInfo.domain})" after actions from that domain

**Next Steps:** (bullet points - only include if explicitly mentioned in the emails)
- Specific tasks with owners and deadlines
- Scheduled meetings or calls
- Deliverables with due dates

**Status:** Choose one based on actual email content: ✅ Resolved, 🔄 In Progress, ⏸️ Waiting, ⚠️ Blocked, or 📧 Info Only

IMPORTANT: 
- Base everything on actual email content, not assumptions
- Avoid generic "partnership" or "collaboration" language unless specifically mentioned
- Don't infer relationships or broader context not present in the emails
- Focus on concrete actions and facts, not narrative storytelling`;
  }
} 