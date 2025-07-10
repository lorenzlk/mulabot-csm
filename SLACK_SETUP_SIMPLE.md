# 🚀 Simple Slack Bot Setup - One Server Solution

## ✅ **Solution for Ngrok Limitation**
Instead of running 2 servers (webhook + slack bot), we merged everything into ONE server on port 3000. This solves the ngrok limitation issue!

## 🎯 **Quick Setup Steps**

### 1. **Create Slack App**
- Go to: https://api.slack.com/apps
- Create app: `MulaBot CS Agent`
- **OAuth & Permissions** → Add scopes: `commands`, `chat:write`, `users:read`
- **Install to Workspace** → Copy **Bot Token** (`xoxb-...`)
- **Basic Information** → Copy **Signing Secret**

### 2. **Configure Slash Commands**
- **Slash Commands** → Create `/accountsummary` and `/mula`
- **Request URL**: `https://your-ngrok-url.ngrok-free.app/slack/commands`
- **Save** both commands

### 3. **Start Combined Server**
```bash
# Replace with your actual tokens
OPENAI_API_KEY=sk-your-key \
SLACK_BOT_TOKEN=xoxb-your-token \
SLACK_SIGNING_SECRET=your-secret \
node local-webhook-server-enhanced.js
```

### 4. **Your existing ngrok is perfect!**
Your current ngrok tunnel already exposes port 3000 - just update the Slack app commands to use:
```
https://d8a85de8638e.ngrok-free.app/slack/commands
```

## 📊 **What You Get**

### **One Server Does Everything**:
- ✅ **Document webhooks** (Google Apps Script → AI processing)
- ✅ **Slack commands** (`/accountsummary` and `/mula`)
- ✅ **AI summarization** with OpenAI
- ✅ **Cost tracking** and logging
- ✅ **Same ngrok tunnel** for both features

### **Health Check**:
```bash
curl http://localhost:3000/health
```

### **Expected Response**:
```json
{
  "features": {
    "ai_summarization": true,
    "slack_commands": true,
    "webhook_processing": true
  }
}
```

## 🧪 **Testing Commands**

In Slack:
```
/accountsummary
/accountsummary recent updates
/mula today's highlights
```

**Expected Response**:
```
📊 Account Summary for @username

🤖 AI Summary:
Based on recent updates, here's what I found...

🎯 Key Highlights:
1. Recent market developments
2. Key updates from companies
3. Emerging trends

💰 Processing Cost: $0.000045
⏰ Last Updated: 2025-01-08T...
```

## 🔧 **Architecture**

```
Google Doc → Google Apps Script → Enhanced Server (port 3000)
                                      ↓
                                  AI Processing
                                      ↑
           Slack Commands → Enhanced Server (port 3000)
```

## 🎉 **Benefits**

- **No ngrok limitation** - one tunnel for everything
- **Simplified deployment** - one server to manage
- **Better performance** - internal API calls
- **Easier debugging** - all logs in one place
- **Cost effective** - one server instance

## 🚨 **Troubleshooting**

**"Unauthorized" errors**: 
- Verify `SLACK_SIGNING_SECRET` is correct
- Check Slack app configuration

**Commands not working**:
- Test `/health` endpoint
- Check server logs for errors
- Verify ngrok URL in Slack app

**AI not working**:
- Verify `OPENAI_API_KEY` is set
- Check OpenAI API usage limits

---

**This is much simpler than the previous two-server approach!** 🎉 