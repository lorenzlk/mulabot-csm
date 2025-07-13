/**
 * Simplified Slack Bot for Testing
 * Weekly Publisher Digest Assistant - Basic Version
 */

const { App } = require('@slack/bolt');
const axios = require('axios');
require('dotenv').config();

// Initialize the app with bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN || 'xoxb-test-token',
  signingSecret: process.env.SLACK_SIGNING_SECRET || 'test-secret',
  socketMode: process.env.SLACK_SOCKET_MODE === 'true',
  appToken: process.env.SLACK_APP_TOKEN || 'xapp-test-token',
  port: process.env.PORT || 3001 // Different port from webhook server
});

// Webhook server URL (our local server)
const WEBHOOK_SERVER_URL = process.env.WEBHOOK_SERVER_URL || 'http://localhost:3000';

/**
 * Query webhook server for data
 */
async function queryWebhookServer(searchQuery = '') {
  try {
    const response = await axios.get(`${WEBHOOK_SERVER_URL}/test`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to query webhook server:', error.message);
    return { sectionsStored: 0, sections: [] };
  }
}

/**
 * Handle /accountsummary command (simplified version)
 */
app.command('/accountsummary', async ({ command, ack, respond }) => {
  await ack();

  const text = command.text.trim();
  const publisher = text.split(' ')[0] || 'Unknown';
  const days = parseInt(text.split(' ')[1]) || 7;

  // Simulate processing
  await respond({
    response_type: 'in_channel',
    text: `🔍 Processing ${publisher} summary for ${days} days...`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🔍 *Processing Account Summary*\n\n*Publisher:* ${publisher}\n*Time Period:* ${days} days\n*Status:* ✅ Bot is working!\n\n_This is a simplified test version. Full integration coming soon._`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Next Steps:*\n• ✅ Slack bot connection working\n• ⏳ Pinecone integration pending\n• ⏳ OpenAI integration pending\n• ⏳ Google Apps Script webhook pending'
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Requested by <@${command.user_name}> • ${new Date().toLocaleString()}`
          }
        ]
      }
    ]
  });

  // Log the command
  console.log(`✅ Account summary command received: ${publisher}, ${days} days, user: ${command.user_name}`);
});

/**
 * Handle /mula command (now with real data!)
 */
app.command('/mula', async ({ command, ack, respond }) => {
  await ack();

  const text = command.text.trim();
  const searchQuery = text || '';

  // Show loading message
  await respond({
    response_type: 'in_channel',
    text: `💰 Mula CS Agent searching...`,
  });

  try {
    // Query the webhook server for real data
    const webhookData = await queryWebhookServer(searchQuery);
    
    if (webhookData.sectionsStored === 0) {
      await respond({
        response_type: 'in_channel',
        text: `💰 Mula CS Agent Results`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `💰 *Mula CS Agent Results*\n\n📊 *Status:* No data found\n🔍 *Query:* "${searchQuery}"\n📡 *Webhook Server:* Connected ✅\n📈 *Sections Available:* ${webhookData.sectionsStored}\n\n_Send test data to your webhook to see results!_`
            }
          }
        ]
      });
    } else {
      // Process the sections data
      const sections = webhookData.sections || [];
      const filteredSections = searchQuery 
        ? sections.filter(section => 
            section.content.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : sections;

      // Create summary of first few results
      const sampleContent = filteredSections.slice(0, 2).map((section, index) => 
        `*${index + 1}.* ${section.content.substring(0, 200)}${section.content.length > 200 ? '...' : ''}`
      ).join('\n\n');

      await respond({
        response_type: 'in_channel',
        text: `💰 Mula CS Agent Results`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `💰 *Mula CS Agent Results*\n\n🔍 *Query:* "${searchQuery}"\n📊 *Found:* ${filteredSections.length} matching sections\n📈 *Total Available:* ${webhookData.sectionsStored} sections\n📡 *Webhook Server:* Connected ✅`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*📋 Sample Results:*\n\n${sampleContent || 'No matching content found.'}`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `🎯 End-to-end test: Slack → Webhook Server → Data | Requested by <@${command.user_name}>`
              }
            ]
          }
        ]
      });
    }

  } catch (error) {
    console.error('❌ Mula command error:', error);
    await respond({
      response_type: 'in_channel',
      text: '❌ Error connecting to webhook server. Make sure it\'s running on port 3000.'
    });
  }

  console.log(`✅ Mula command processed: "${searchQuery}", user: ${command.user_name}`);
});

/**
 * Handle app mentions
 */
app.event('app_mention', async ({ event, say }) => {
  console.log('📢 App mention received:', event.text);
  
  await say({
    text: `Hello <@${event.user}>! 👋`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Hello <@${event.user}>! 👋\n\n*Available Commands:*\n• \`/accountsummary <publisher> [days]\`\n• \`/mula <publisher> [days]\`\n\n*Example:* \`/accountsummary TechCrunch 7\``
        }
      }
    ]
  });
});

/**
 * Error handling
 */
app.error((error) => {
  console.error('❌ Slack app error:', error);
});

/**
 * Start the app
 */
(async () => {
  try {
    const port = process.env.PORT || 3001;
    
    if (process.env.SLACK_SOCKET_MODE === 'true') {
      // Socket Mode (for ngrok development)
      await app.start();
      console.log('🚀 Slack bot started in Socket Mode!');
      console.log('🔧 Perfect for ngrok testing and development');
      console.log('📱 Bot is ready to receive commands');
    } else {
      // HTTP Mode (for production)
      await app.start(port);
      console.log(`🚀 Slack bot started on port ${port}!`);
      console.log('🌐 HTTP mode - requires public URL');
    }
    
    // Configuration summary
    console.log('\n📋 Configuration:');
    console.log(`   Mode: ${process.env.SLACK_SOCKET_MODE === 'true' ? 'Socket Mode (ngrok)' : 'HTTP Mode'}`);
    console.log(`   Port: ${port}`);
    console.log(`   Bot Token: ${process.env.SLACK_BOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Signing Secret: ${process.env.SLACK_SIGNING_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`   App Token: ${process.env.SLACK_APP_TOKEN ? '✅ Set' : '❌ Missing'}`);
    
    console.log('\n🎯 Available Commands:');
    console.log('   /accountsummary <publisher> [days]');
    console.log('   /mula <publisher> [days]');
    
    console.log('\n💡 To test:');
    console.log('   1. Set up your Slack app credentials in .env');
    console.log('   2. Try: /accountsummary TechCrunch 7');
    console.log('   3. Try: /mula Variety 14');
    
  } catch (error) {
    console.error('❌ Failed to start Slack bot:', error);
    process.exit(1);
  }
})(); 