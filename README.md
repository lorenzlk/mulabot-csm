# MulaBot - AI-Powered Publishing Assistant

MulaBot is an intelligent Slack bot that analyzes daily publishing content and provides AI-powered summaries for account management teams. It integrates with Google Apps Script to process document updates and uses OpenAI to generate intelligent insights.

## 🚀 Features

- **AI-Powered Summaries**: Uses OpenAI GPT to generate intelligent content summaries
- **Multi-Company Support**: Filters and analyzes content from multiple publishers
- **Slack Integration**: Easy-to-use slash commands for instant insights
- **Real-time Processing**: Automatically processes document updates via webhooks
- **Cost Tracking**: Monitors OpenAI API usage and costs
- **Production Ready**: Deployed on Railway with PostgreSQL database

## 🏢 Supported Publishers

- **On3** - Sports content and analytics
- **Swimming World** - Swimming industry news and insights
- **She Media** - Women-focused content and advertising
- **Rev Content** - Content discovery and recommendation
- **Brit+Co** - DIY, lifestyle, and creative content

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **AI**: OpenAI GPT-3.5/GPT-4
- **Integrations**: Slack API, Google Apps Script
- **Deployment**: Railway
- **Security**: Helmet.js, rate limiting, webhook signature validation

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key
- Slack workspace and app
- Google Apps Script (for document processing)

## 🔧 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/lorenzlk/mulabot-csm.git
cd mulabot-csm
npm install
```

### 2. Environment Variables
Copy `env.template` to `.env` and configure:

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Slack Configuration  
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/mulabot

# Server Configuration
NODE_ENV=production
PORT=3000
WEBHOOK_SECRET=your-webhook-secret-32-chars-min

# Google Apps Script Integration
GOOGLE_APPS_SCRIPT_URL=your-gas-webhook-url
```

### 3. Database Setup
```bash
# Initialize database tables and seed data
npm run db:init

# Run migrations (if needed)
npm run db:migrate
```

### 4. Development
```bash
# Start development server
npm run dev

# Start production server
npm start
```

## 🚀 Deployment

### Railway Deployment

1. **Create Railway Account**: [railway.app](https://railway.app)

2. **Deploy to Railway**:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway add --database postgres
railway up
```

3. **Set Environment Variables** in Railway dashboard

4. **Initialize Database**:
```bash
railway run npm run db:init
```

Your production URL: `https://your-service.railway.app`

## 📱 Slack Integration

### Setup Slack App

1. **Create Slack App**: [api.slack.com/apps](https://api.slack.com/apps)

2. **Configure Slash Commands**:
   - `/mula` → `https://your-domain.com/slack/commands`
   - `/accountsummary` → `https://your-domain.com/slack/commands`

3. **Install to Workspace** and copy tokens to environment variables

### Usage

```bash
# Query specific company content
/mula on3 revenue trends

# Get account summary for specific topic
/accountsummary swimming world analytics

# General content analysis
/mula performance metrics
```

## 🔗 Google Apps Script Integration

Update your Google Apps Script webhook URL to:
```javascript
const WEBHOOK_URL = 'https://your-domain.com/webhook';
```

The webhook expects this payload format:
```json
{
  "type": "document_update",
  "sections": [
    {
      "date": "2024-01-15",
      "content": "Content text here...",
      "timestamp": "2024-01-15T10:00:00Z"
    }
  ]
}
```

## 🔍 API Endpoints

### Health Check
```bash
GET /health
```
Returns service status and database connectivity.

### Webhook
```bash
POST /webhook
Content-Type: application/json
X-Webhook-Signature: sha256-signature
```
Processes document updates from Google Apps Script.

### Slack Commands
```bash
POST /slack/commands
```
Handles Slack slash command requests.

## 📊 Monitoring

### Health Monitoring
- **Health Endpoint**: `/health`
- **Database Connection**: Automatic health checks
- **Service Status**: OpenAI and Slack integration status

### Logging
- **Winston Logger**: Structured JSON logging
- **Error Tracking**: Optional Sentry integration
- **Cost Tracking**: OpenAI API usage monitoring

## 🔐 Security Features

- **Rate Limiting**: 100 requests/15min per IP, 10 Slack commands/min
- **Webhook Validation**: HMAC signature verification
- **Input Sanitization**: XSS and injection protection
- **Environment Variables**: Sensitive data protection
- **HTTPS Only**: SSL/TLS encryption in production

## 🛡️ Error Handling

- **Database Errors**: Automatic retry and fallback
- **API Failures**: Graceful degradation
- **Invalid Requests**: Proper error responses
- **Monitoring**: Health checks and alerting

## 📈 Cost Management

- **OpenAI Usage**: Cost tracking per request
- **Caching**: AI summary caching (24-hour TTL)
- **Rate Limits**: Prevent runaway costs
- **Monitoring**: Daily/monthly spending alerts

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/lorenzlk/mulabot-csm/issues)
- **Documentation**: See `/docs` folder
- **Email**: support@yourdomain.com

## 🎯 Roadmap

- [ ] Custom domain support
- [ ] Multi-language AI summaries
- [ ] Enhanced company matching algorithms
- [ ] Advanced analytics dashboard
- [ ] Integration with additional publishers
- [ ] Real-time WebSocket updates

---

**MulaBot** - Empowering publishing teams with AI-driven insights 🤖📊 