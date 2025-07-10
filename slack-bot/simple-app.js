/**
 * Simplified Slack Bot for Testing
 * Weekly Publisher Digest Assistant - Basic Version
 */

const { App } = require('@slack/bolt');
require('dotenv').config();

// Initialize the app with bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN || 'xoxb-test-token',
  signingSecret: process.env.SLACK_SIGNING_SECRET || 'test-secret',
  socketMode: process.env.SLACK_SOCKET_MODE === 'true',
  appToken: process.env.SLACK_APP_TOKEN || 'xapp-test-token',
  port: process.env.PORT || 3000
});

// Note: Health check endpoints are handled differently in Socket Mode vs HTTP Mode
// For Socket Mode (ngrok), health checks aren't needed as there's no HTTP endpoint

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
 * Handle /mula command (alias for /accountsummary)
 */
app.command('/mula', async ({ command, ack, respond }) => {
  await ack();

  const text = command.text.trim();
  const publisher = text.split(' ')[0] || 'Unknown';
  const days = parseInt(text.split(' ')[1]) || 7;

  await respond({
    response_type: 'in_channel',
    text: `💰 Mula CS Agent activated!`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `💰 *Mula CS Agent Activated!*\n\n*Publisher:* ${publisher}\n*Time Period:* ${days} days\n*Status:* ✅ Bot response working!\n\n_Simplified test version - full features coming soon._`
        }
      }
    ]
  });

  console.log(`✅ Mula command received: ${publisher}, ${days} days, user: ${command.user_name}`);
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
    const port = process.env.PORT || 3000;
    
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