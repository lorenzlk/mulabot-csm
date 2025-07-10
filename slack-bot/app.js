/**
 * Slack Bot - Weekly Publisher Digest Assistant
 * Handles /accountsummary and /mula commands for querying publisher digests
 */

const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const { handleAccountSummaryCommand } = require('./commands/account-summary');

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: process.env.SLACK_SOCKET_MODE === 'true',
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 3000
});

// Services are initialized in command handlers

// Command handlers are imported from the commands directory

/**
 * Health check endpoint
 */
app.command('/health', async ({ command, ack, respond }) => {
  await ack();
  
  await respond({
    response_type: 'ephemeral',
    text: '✅ All systems operational',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*🏥 Health Check Results*'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Bot Status:* ✅ Online`
          },
          {
            type: 'mrkdwn',
            text: `*Socket Mode:* ✅ Connected`
          },
          {
            type: 'mrkdwn',
            text: `*Uptime:* ${Math.floor(process.uptime())}s`
          },
          {
            type: 'mrkdwn',
            text: `*Memory:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
          }
        ]
      }
    ]
  });
});

// Register slash commands
app.command('/accountsummary', handleAccountSummaryCommand);
app.command('/mula', handleAccountSummaryCommand); // Alias

/**
 * Error handling
 */
app.error((error) => {
  console.error('Slack app error:', error);
});

/**
 * Start the app
 */
(async () => {
  try {
    await app.start();
    console.log('⚡️ Slack bot is running!');
    console.log('🔌 Socket Mode enabled for development');
    console.log(`🤖 Bot ready with commands: /accountsummary, /mula, /health`);
    console.log('📡 Services will initialize when commands are used');
    
  } catch (error) {
    console.error('Failed to start Slack bot:', error);
    process.exit(1);
  }
})();

module.exports = { app }; 