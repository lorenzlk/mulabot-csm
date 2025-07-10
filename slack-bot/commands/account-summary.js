/**
 * Account Summary Command Handler
 * Handles /accountsummary and /mula slash commands
 */

const { PineconeClient } = require('../pinecone-client');
const { OpenAIService } = require('../../openai-service');

// Initialize services
const pineconeClient = new PineconeClient();
const openaiService = new OpenAIService();

/**
 * Handle account summary command (used by both app.js and server.js)
 */
async function handleAccountSummaryCommand(command, ack, respond) {
  await ack();

  try {
    // Parse command text
    const text = command.text.trim();
    const parts = text.split(/\s+/);
    
    if (parts.length === 0 || !parts[0]) {
      await respond({
        response_type: 'ephemeral',
        text: '❌ Please specify a publisher name. Usage: `/accountsummary <publisher> [days]`',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Usage:* `/accountsummary <publisher> [days]`\n*Examples:*\n• `/accountsummary TechCrunch 7`\n• `/mula Variety 14`\n• `/accountsummary "The Information" 30`'
            }
          }
        ]
      });
      return;
    }

    const publisher = parts[0];
    const days = parts.length > 1 ? parseInt(parts[1]) : 7;

    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 365) {
      await respond({
        response_type: 'ephemeral',
        text: '❌ Invalid days parameter. Please use a number between 1-365.',
      });
      return;
    }

    // Send initial response
    await respond({
      response_type: 'in_channel',
      text: `🔍 Searching for ${publisher} updates from the last ${days} days...`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔍 Searching for *${publisher}* updates from the last *${days} days*...\n_This may take a moment while I analyze the content._`
          }
        }
      ]
    });

    // Search Pinecone for relevant content
    const searchResults = await searchPublisherContent(publisher, days);
    
    if (!searchResults || searchResults.length === 0) {
      await respond({
        response_type: 'in_channel',
        text: `❌ No content found for ${publisher} in the last ${days} days.`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `❌ No content found for *${publisher}* in the last *${days} days*.\n\n*Suggestions:*\n• Try a different publisher name\n• Increase the number of days\n• Check if content has been processed recently`
            }
          }
        ]
      });
      return;
    }

    // Generate AI summary
    const summary = await generatePublisherSummary(publisher, searchResults, days);
    
    // Format and send final response
    const { formatSlackResponse } = require('../utils/formatting');
    const response = formatSlackResponse(publisher, summary, searchResults, days);
    await respond(response);

    // Log usage for monitoring
    console.log(`Account summary generated: ${publisher}, ${days} days, ${searchResults.length} results, user: ${command.user_name}`);

  } catch (error) {
    console.error('Error handling account summary command:', error);
    
    const { formatErrorResponse } = require('../utils/formatting');
    const errorResponse = formatErrorResponse(publisher || 'Unknown', error, days);
    await respond(errorResponse);
  }
}

/**
 * Search Pinecone for publisher content
 */
async function searchPublisherContent(publisher, days) {
  try {
    // Generate search query embedding
    const query = `${publisher} news updates startup funding product launches weekly digest`;
    const queryEmbedding = await openaiService.generateQueryEmbedding(query);

    // Calculate date filter
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Search Pinecone with filters
    const searchParams = {
      vector: queryEmbedding,
      topK: 20,
      includeMetadata: true,
      filter: {
        timestamp: { $gte: cutoffDate.toISOString() }
      }
    };

    const searchResults = await pineconeClient.query(searchParams);
    
    // Filter results by publisher name (fuzzy matching)
    const filteredResults = searchResults.matches.filter(match => {
      const content = match.metadata?.content || '';
      const publisherLower = publisher.toLowerCase();
      return content.toLowerCase().includes(publisherLower) ||
             match.metadata?.publisher?.toLowerCase().includes(publisherLower);
    });

    // Sort by relevance score and timestamp
    filteredResults.sort((a, b) => {
      // Primary sort: relevance score
      if (Math.abs(a.score - b.score) > 0.05) {
        return b.score - a.score;
      }
      // Secondary sort: timestamp (newer first)
      const aTime = new Date(a.metadata?.timestamp || 0).getTime();
      const bTime = new Date(b.metadata?.timestamp || 0).getTime();
      return bTime - aTime;
    });

    return filteredResults.slice(0, 10); // Return top 10 results

  } catch (error) {
    console.error('Error searching publisher content:', error);
    throw new Error(`Search failed: ${error.message}`);
  }
}

/**
 * Generate AI summary for publisher content
 */
async function generatePublisherSummary(publisher, searchResults, days) {
  try {
    // Combine content from search results
    const combinedContent = searchResults
      .map(result => result.metadata?.content || '')
      .join('\n\n---\n\n')
      .substring(0, 12000); // Limit to avoid token limits

    // Generate summary using OpenAI
    const summaryRequest = {
      publisher,
      content: combinedContent,
      timeframe: `${days} days`,
      resultCount: searchResults.length
    };

    const summary = await openaiService.generatePublisherSummary(summaryRequest);
    
    return summary;

  } catch (error) {
    console.error('Error generating publisher summary:', error);
    throw new Error(`Summary generation failed: ${error.message}`);
  }
}

module.exports = {
  handleAccountSummaryCommand,
  searchPublisherContent,
  generatePublisherSummary
}; 