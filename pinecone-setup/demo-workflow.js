/**
 * Complete Workflow Demo
 * Weekly Publisher Digest Assistant
 * 
 * Demonstrates the end-to-end workflow:
 * 1. Process daily digest content 
 * 2. Generate embeddings and store in Pinecone
 * 3. Search for relevant content by publisher
 * 4. Generate AI summary using OpenAI
 * 5. Format results for Slack
 */

const PineconeService = require('./pinecone-client');
const OpenAIService = require('./openai-service');

class WorkflowDemo {
  constructor() {
    this.pineconeService = new PineconeService();
    this.openaiService = new OpenAIService();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Weekly Publisher Digest Assistant...\n');

      // Initialize services
      await this.pineconeService.initialize();
      await this.openaiService.initialize();

      this.isInitialized = true;
      console.log('✅ All services initialized successfully!\n');
      
      return true;

    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Demo: Complete workflow simulation
   */
  async runCompleteWorkflow() {
    try {
      console.log('🎯 Running Complete Workflow Demo\n');
      console.log('=' .repeat(60));

      // Step 1: Process multiple daily digest entries
      console.log('\n📝 STEP 1: Processing Daily Digest Content');
      console.log('-'.repeat(50));
      await this.processSampleDigests();

      // Step 2: Simulate Slack query
      console.log('\n🔍 STEP 2: Simulating Slack Query');
      console.log('-'.repeat(50));
      const searchResults = await this.simulateSlackQuery('TechCrunch', 7);

      // Step 3: Generate AI summary
      console.log('\n🤖 STEP 3: Generating AI Summary');
      console.log('-'.repeat(50));
      const summary = await this.generateSummary(searchResults, 'TechCrunch', 7);

      // Step 4: Format for Slack
      console.log('\n💬 STEP 4: Formatting for Slack');
      console.log('-'.repeat(50));
      const slackMessage = this.formatForSlack(summary);

      console.log('\n🎉 WORKFLOW COMPLETE!');
      console.log('=' .repeat(60));
      
      return {
        searchResults,
        summary,
        slackMessage
      };

    } catch (error) {
      console.error('❌ Workflow failed:', error);
      throw error;
    }
  }

  /**
   * Process sample daily digest content
   */
  async processSampleDigests() {
    const sampleDigests = [
      {
        content: `
          TechCrunch Daily - December 1, 2023
          
          🚀 STARTUP FUNDING
          • OpenAI competitor Anthropic raises $2B from Google
          • Fintech startup Ramp secures $300M Series D at $5.8B valuation  
          • AI chip startup Cerebras files for IPO with $4B valuation
          
          📱 PRODUCT LAUNCHES
          • Apple releases iOS 17.2 with new Journal app
          • Meta launches Threads API for developers
          • Google announces Gemini AI model to compete with GPT-4
          
          💼 INDUSTRY NEWS
          • Tesla recalls 2M vehicles for autopilot safety update
          • Microsoft integrates Copilot across all Office applications
          • Amazon's AWS introduces new AI training chips
        `,
        metadata: {
          publisher: 'TechCrunch',
          date: '2023-12-01',
          source: 'daily-digest-email',
          category: 'technology'
        }
      },
      {
        content: `
          TechCrunch Daily - November 30, 2023
          
          🚀 STARTUP FUNDING
          • Y Combinator announces largest batch ever with 400 companies
          • Healthcare AI startup Tempus raises $200M Series G
          • Developer tools company GitLab stock surges 20% on earnings
          
          📱 PRODUCT LAUNCHES  
          • OpenAI introduces custom GPTs for ChatGPT Plus users
          • Spotify launches AI DJ feature in 50 new countries
          • Adobe releases AI-powered video editing tools
          
          💼 INDUSTRY NEWS
          • EU passes landmark AI regulation bill
          • Salesforce announces major layoffs affecting 8,000 employees
          • ByteDance considers TikTok IPO amid regulatory pressure
        `,
        metadata: {
          publisher: 'TechCrunch',
          date: '2023-11-30', 
          source: 'daily-digest-email',
          category: 'technology'
        }
      }
    ];

    console.log(`Processing ${sampleDigests.length} daily digest entries...`);

    for (const [index, digest] of sampleDigests.entries()) {
      const result = await this.pineconeService.processAndUpsertDigestContent(
        digest.content,
        digest.metadata
      );
      
      console.log(`✅ Processed digest ${index + 1}:`);
      console.log(`   - Publisher: ${digest.metadata.publisher}`);
      console.log(`   - Date: ${digest.metadata.date}`);
      console.log(`   - Vectors created: ${result.vectorCount}`);
      console.log(`   - Processing time: ${result.processingTime}ms`);
    }

    return sampleDigests.length;
  }

  /**
   * Simulate a Slack query like "/digest TechCrunch 7"
   */
  async simulateSlackQuery(publisher, days) {
    console.log(`Simulating: /digest ${publisher} ${days}`);
    
    // Generate query embedding
    const query = `${publisher} news updates startup funding product launches`;
    const queryEmbedding = await this.pineconeService.generateQueryEmbedding(query);
    
    console.log(`🧠 Generated query embedding (${queryEmbedding.length} dimensions)`);

    // Search for relevant content
    const searchResults = await this.pineconeService.queryVectors(
      queryEmbedding,
      {
        topK: 10,
        includeMetadata: true,
        filter: {
          publisher: publisher.toLowerCase(),
          content_type: 'daily_digest'
        }
      }
    );

    console.log(`🎯 Found ${searchResults.matches?.length || 0} matching content pieces:`);
    
    if (searchResults.matches) {
      searchResults.matches.forEach((match, index) => {
        console.log(`   ${index + 1}. Score: ${(match.score * 100).toFixed(1)}% | Date: ${match.metadata?.date} | Chunk: ${match.metadata?.chunk_index}`);
      });
    }

    return searchResults;
  }

  /**
   * Generate AI summary from search results
   */
  async generateSummary(searchResults, publisher, days) {
    if (!searchResults.matches || searchResults.matches.length === 0) {
      console.log('⚠️  No content found for summary generation');
      return null;
    }

    // Combine content from search results
    const combinedContent = searchResults.matches
      .map(match => `Date: ${match.metadata?.date}\nContent: ${match.metadata?.content || 'Content not available'}`)
      .join('\n\n---\n\n');

    console.log(`📄 Combined ${searchResults.matches.length} content pieces for summarization`);

    // Generate summary using OpenAI
    const summaryResult = await this.openaiService.generatePublisherSummary(
      combinedContent,
      {
        publisher,
        timeframe: `${days} days`,
        format: 'comprehensive',
        maxSections: 4,
        includeConfidence: true,
        includeCitations: true
      }
    );

    console.log(`✨ Summary generated successfully:`);
    console.log(`   - Processing time: ${summaryResult.metadata.processingTime}ms`);
    console.log(`   - Tokens used: ${summaryResult.metadata.tokenUsage.total_tokens}`);
    console.log(`   - Confidence: ${summaryResult.summary.confidence || 'N/A'}%`);
    console.log(`   - Sections: ${summaryResult.summary.sections?.length || 0}`);

    return summaryResult;
  }

  /**
   * Format summary for Slack Block Kit
   */
  formatForSlack(summaryResult) {
    if (!summaryResult) {
      return {
        text: "Sorry, no recent content found for that publisher.",
        blocks: []
      };
    }

    const { summary, metadata } = summaryResult;
    
    console.log('💬 Formatting response for Slack...');

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📊 ${summary.title || `${metadata.publisher} Summary`}`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `${metadata.publisher} • Last ${metadata.timeframe} • ${summary.confidence ? `${summary.confidence}% confidence` : 'Generated'} • ${new Date(metadata.generatedAt).toLocaleDateString()}`
          }
        ]
      },
      {
        type: "divider"
      }
    ];

    // Add executive summary
    if (summary.summary) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Executive Summary*\n${summary.summary}`
        }
      });
    }

    // Add sections
    if (summary.sections && summary.sections.length > 0) {
      summary.sections.forEach(section => {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${section.heading}*\n${section.content}`
          }
        });
      });
    }

    // Add key takeaways
    if (summary.keyTakeaways && summary.keyTakeaways.length > 0) {
      const takeawaysText = summary.keyTakeaways
        .map(takeaway => `• ${takeaway}`)
        .join('\n');
      
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Key Takeaways*\n${takeawaysText}`
        }
      });
    }

    console.log(`✅ Slack message formatted with ${blocks.length} blocks`);

    return {
      text: summary.title || `${metadata.publisher} Weekly Summary`,
      blocks: blocks
    };
  }

  /**
   * Get service statistics
   */
  async getServiceStats() {
    console.log('\n📊 SERVICE STATISTICS');
    console.log('=' .repeat(40));

    // Pinecone stats
    const pineconeStats = await this.pineconeService.getIndexStats();
    const pineconeHealth = this.pineconeService.getHealthStatus();
    const pineconeMetrics = this.pineconeService.getMetrics();

    console.log('\n🔗 Pinecone Vector Database:');
    console.log(`   - Index fullness: ${(pineconeStats.indexFullness * 100).toFixed(2)}%`);
    console.log(`   - Total vectors: ${Object.values(pineconeStats.namespaces || {})
      .reduce((sum, ns) => sum + (ns.vectorCount || 0), 0)}`);
    console.log(`   - Health status: ${pineconeHealth.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    console.log(`   - Operations tracked: ${Object.keys(pineconeMetrics.operations).length}`);

    // OpenAI stats
    const openaiStats = this.openaiService.getCostSummary();

    console.log('\n🤖 OpenAI Service:');
    console.log(`   - Total tokens: ${openaiStats.totalTokens.toLocaleString()}`);
    console.log(`   - Total cost: $${openaiStats.totalCost.toFixed(4)}`);
    console.log(`   - API calls: ${openaiStats.requestCount}`);
    console.log(`   - Avg cost/call: $${openaiStats.avgCostPerRequest.toFixed(4)}`);

    return { pineconeStats, pineconeHealth, pineconeMetrics, openaiStats };
  }

  /**
   * Cleanup demo data
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up demo data...');
    
    // Note: In production, you might want to delete test vectors
    // For demo purposes, we'll just log the cleanup action
    console.log('✅ Demo cleanup completed');
  }
}

/**
 * Main demo execution
 */
async function main() {
  const demo = new WorkflowDemo();

  try {
    // Initialize
    await demo.initialize();

    // Run complete workflow
    const results = await demo.runCompleteWorkflow();

    // Show statistics
    await demo.getServiceStats();

    // Cleanup
    await demo.cleanup();

    console.log('\n🎉 Demo completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Set up Pipedream workflow to connect Google Apps Script → Pinecone');
    console.log('2. Create Slack bot to handle /digest commands');
    console.log('3. Deploy and test with real daily digest data');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

// Export for use as module
module.exports = WorkflowDemo;

// Run if called directly
if (require.main === module) {
  main();
} 