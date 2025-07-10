/**
 * Express Server for Slack Bot - Production Web App/API Mode
 * Alternative to Socket Mode for production deployments
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createEventAdapter } = require('@slack/events-api');
const { WebClient } = require('@slack/web-api');
const { createMessageAdapter } = require('@slack/interactive-messages');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import our command handlers
const { handleAccountSummaryCommand, searchPublisherContent, generatePublisherSummary } = require('./commands/account-summary');
const { formatSlackResponse, formatErrorResponse } = require('./utils/formatting');

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

// Slack clients
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
const slackInteractive = createMessageAdapter(process.env.SLACK_SIGNING_SECRET);
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

// Security middleware
if (process.env.ENABLE_HELMET === 'true') {
  app.use(helmet());
}

if (process.env.ENABLE_CORS === 'true') {
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
}

if (process.env.ENABLE_COMPRESSION === 'true') {
  app.use(compression());
}

// Rate limiting
if (process.env.ENABLE_RATE_LIMITING === 'true') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/slack', limiter);
}

// JSON parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test Slack API connection
    const slackTest = await slackClient.auth.test();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      slack: {
        connected: !!slackTest.ok,
        team: slackTest.team,
        user: slackTest.user
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint (optional)
if (process.env.ENABLE_METRICS === 'true') {
  app.get('/metrics', (req, res) => {
    res.json({
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    });
  });
}

// Slack Events API
app.use('/slack/events', slackEvents.requestListener());

// Slack Interactive Components
app.use('/slack/interactive', slackInteractive.requestListener());

// Manual slash command endpoint (webhook-style)
app.post('/slack/commands', async (req, res) => {
  try {
    const { command, text, user_name, user_id, team_id, channel_id } = req.body;
    
    // Verify Slack request (basic validation)
    if (!command || !user_id) {
      return res.status(400).json({ error: 'Invalid Slack request' });
    }

    // Acknowledge immediately
    res.status(200).json({
      response_type: 'ephemeral',
      text: '⏳ Processing your request...'
    });

    // Handle different commands
    if (command === '/accountsummary' || command === '/mula') {
      await handleSlashCommand(command, text, user_name, user_id, channel_id);
    } else {
      // Send error response via webhook
      await sendDelayedResponse(channel_id, {
        response_type: 'ephemeral',
        text: `❌ Unknown command: ${command}`
      });
    }

  } catch (error) {
    console.error('Error handling slash command:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle slash commands
 */
async function handleSlashCommand(command, text, userName, userId, channelId) {
  try {
    // Parse command text
    const parts = (text || '').trim().split(/\s+/).filter(Boolean);
    
    if (parts.length === 0) {
      await sendDelayedResponse(channelId, {
        response_type: 'ephemeral',
        text: '❌ Please specify a publisher name. Usage: `/accountsummary <publisher> [days]`'
      });
      return;
    }

    const publisher = parts[0];
    const days = parts.length > 1 ? parseInt(parts[1]) : 7;

    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 365) {
      await sendDelayedResponse(channelId, {
        response_type: 'ephemeral',
        text: '❌ Invalid days parameter. Please use a number between 1-365.'
      });
      return;
    }

    // Send initial processing message
    await sendDelayedResponse(channelId, {
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

    // Search and generate summary
    const searchResults = await searchPublisherContent(publisher, days);
    
    if (!searchResults || searchResults.length === 0) {
      await sendDelayedResponse(channelId, {
        response_type: 'in_channel',
        text: `❌ No content found for ${publisher} in the last ${days} days.`
      });
      return;
    }

    const summary = await generatePublisherSummary(publisher, searchResults, days);
    const response = formatSlackResponse(publisher, summary, searchResults, days);
    
    await sendDelayedResponse(channelId, response);

    // Log usage
    console.log(`Account summary generated: ${publisher}, ${days} days, ${searchResults.length} results, user: ${userName}`);

  } catch (error) {
    console.error('Error in handleSlashCommand:', error);
    await sendDelayedResponse(channelId, formatErrorResponse(publisher || 'Unknown', error, days));
  }
}

/**
 * Send delayed response to Slack channel
 */
async function sendDelayedResponse(channelId, response) {
  try {
    await slackClient.chat.postMessage({
      channel: channelId,
      ...response
    });
  } catch (error) {
    console.error('Error sending delayed response:', error);
  }
}

// Interactive button handlers
slackInteractive.action('refresh_summary', async (payload, respond) => {
  try {
    const { publisher, days } = JSON.parse(payload.actions[0].value);
    
    // Send loading message
    await respond({
      response_type: 'ephemeral',
      text: `🔄 Refreshing ${publisher} summary...`
    });

    // Generate new summary
    const searchResults = await searchPublisherContent(publisher, days);
    const summary = await generatePublisherSummary(publisher, searchResults, days);
    const response = formatSlackResponse(publisher, summary, searchResults, days);

    // Send updated response
    await slackClient.chat.postMessage({
      channel: payload.channel.id,
      ...response
    });

  } catch (error) {
    console.error('Error refreshing summary:', error);
    await respond({
      response_type: 'ephemeral',
      text: '❌ Error refreshing summary'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, host, () => {
  console.log(`🚀 Slack bot server running on ${host}:${port}`);
  console.log(`📡 Webhook endpoints:`);
  console.log(`   Health: http://${host}:${port}/health`);
  console.log(`   Events: http://${host}:${port}/slack/events`);
  console.log(`   Interactive: http://${host}:${port}/slack/interactive`);
  console.log(`   Commands: http://${host}:${port}/slack/commands`);
  if (process.env.ENABLE_METRICS === 'true') {
    console.log(`   Metrics: http://${host}:${port}/metrics`);
  }
});

module.exports = { app }; 