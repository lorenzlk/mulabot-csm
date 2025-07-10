# Slack Bot Setup Guide - /accountsummary & /mula Commands

## 🎯 Overview
This guide will help you set up Slack slash commands `/accountsummary` and `/mula` that connect to your AI-powered webhook system.

## 📋 Step 1: Create Slack App

1. **Go to**: https://api.slack.com/apps
2. **Click**: "Create New App"
3. **Choose**: "From scratch"
4. **App Name**: `MulaBot CS Agent`
5. **Workspace**: Select your workspace
6. **Click**: "Create App"

## 🔐 Step 2: Get Bot Token & Signing Secret

### Get Bot Token:
1. **Go to**: "OAuth & Permissions" (left sidebar)
2. **Scroll to**: "Scopes" → "Bot Token Scopes"
3. **Add these scopes**:
   - `commands` (Use slash commands)
   - `chat:write` (Send messages)
   - `users:read` (View people in workspace)
4. **Scroll up** → Click "Install to Workspace"
5. **Copy** the "Bot User OAuth Token" (starts with `xoxb-`)

### Get Signing Secret:
1. **Go to**: "Basic Information" (left sidebar)
2. **Scroll to**: "App Credentials"
3. **Copy** the "Signing Secret"

## ⚡ Step 3: Configure Slash Commands

### Add /accountsummary command:
1. **Go to**: "Slash Commands" (left sidebar)
2. **Click**: "Create New Command"
3. **Configure**:
   - **Command**: `/accountsummary`
   - **Request URL**: `https://your-ngrok-url.ngrok-free.app/slack/commands`
   - **Short Description**: `Get AI-powered account summary`
   - **Usage Hint**: `[optional query]`
4. **Click**: "Save"

### Add /mula command:
1. **Click**: "Create New Command" (again)
2. **Configure**:
   - **Command**: `/mula`
   - **Request URL**: `https://your-ngrok-url.ngrok-free.app/slack/commands`
   - **Short Description**: `Get AI-powered account summary (alias)`
   - **Usage Hint**: `[optional query]`
3. **Click**: "Save"

## 🚀 Step 4: Set Up Local Development

### Install dependencies:
```bash
npm install axios crypto
```

### Set environment variables:
```bash
export SLACK_BOT_TOKEN="xoxb-your-bot-token-here"
export SLACK_SIGNING_SECRET="your-signing-secret-here"
export OPENAI_API_KEY="sk-your-openai-key-here"
```

### Start your servers:

**Terminal 1** (AI Webhook Server):
```bash
OPENAI_API_KEY=sk-your-key node local-webhook-server-enhanced.js
```

**Terminal 2** (Slack Bot Server):
```bash
SLACK_BOT_TOKEN=xoxb-your-token SLACK_SIGNING_SECRET=your-secret node slack-bot-server.js
```

**Terminal 3** (Ngrok for Slack Bot):
```bash
ngrok http 3001
```

## 🔧 Step 5: Update Slack App with Ngrok URL

1. **Copy** your ngrok URL (e.g., `https://abc123.ngrok-free.app`)
2. **Go back** to Slack App dashboard
3. **Go to**: "Slash Commands"
4. **Edit** both `/accountsummary` and `/mula` commands
5. **Update Request URL** to: `https://your-ngrok-url.ngrok-free.app/slack/commands`
6. **Click**: "Save"

## 🧪 Step 6: Test the Commands

In your Slack workspace:

### Test basic command:
```
/accountsummary
```

### Test with query:
```
/accountsummary recent updates
/mula today's highlights
```

## 📊 What You Should See

### In Slack:
- **Initial response**: "🔄 Processing your request..."
- **Follow-up response**: 
  ```
  📊 Account Summary for @username
  
  🤖 AI Summary:
  [AI-generated summary based on your query]
  
  🎯 Key Highlights:
  1. Recent market developments in AI technology
  2. Key updates from major tech companies
  3. Emerging trends in the industry
  
  💰 Processing Cost: $0.000045
  ⏰ Last Updated: 2025-01-08T...
  ```

### In Terminal Logs:
```
🤖 Received slash command: /accountsummary from @username
📝 Text: "recent updates"
🔍 Fetching account summary...
💬 Processing Slack query from @username: "recent updates"
✅ Follow-up response sent to Slack
```

## 🔒 Security Notes

- ✅ **Request verification** enabled (using signing secret)
- ✅ **Replay attack protection** (5-minute window)
- ✅ **Environment variables** for sensitive data
- ✅ **Error handling** for failed requests

## 🐛 Troubleshooting

### "URL verification failed":
- Check your ngrok URL is correct
- Ensure slack-bot-server.js is running on port 3001
- Verify signing secret is correct

### "Command not responding":
- Check terminal logs for errors
- Verify webhook server is running on port 3000
- Test `/health` endpoint on both servers

### "Authentication failed":
- Verify bot token starts with `xoxb-`
- Check signing secret matches Slack app
- Ensure bot has proper scopes

## 🚀 Production Deployment

For production, replace ngrok with:
- **Heroku**: `https://your-app.herokuapp.com/slack/commands`
- **Railway**: `https://your-app.railway.app/slack/commands`
- **Google Cloud Run**: `https://your-service.run.app/slack/commands`

## 📈 Next Steps

1. **Add vector storage** (Pinecone) for better query results
2. **Implement real document querying** instead of mock responses
3. **Add more slash commands** for specific features
4. **Set up monitoring** and logging for production use

---

**Need help?** Check the terminal logs for detailed error messages and debugging information. 