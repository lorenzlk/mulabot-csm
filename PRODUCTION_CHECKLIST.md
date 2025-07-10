# 🚀 Production Deployment Checklist

## Pre-Deployment Setup

### 1. Environment Configuration
- [ ] Copy `env.template` to `.env.production` and fill in all values
- [ ] Generate strong `WEBHOOK_SECRET` (min 32 characters)
- [ ] Verify OpenAI API key has sufficient credits
- [ ] Test Slack bot token and signing secret
- [ ] Set up Sentry account for error tracking (optional)

### 2. Database Setup
- [ ] Choose hosting platform (Railway recommended)
- [ ] Set up PostgreSQL database
- [ ] Note database connection string
- [ ] Test database connection

### 3. Platform-Specific Setup

#### Railway (Recommended)
- [ ] Install Railway CLI: `npm install -g @railway/cli`
- [ ] Login to Railway: `railway login`
- [ ] Create new project: `railway new`
- [ ] Add PostgreSQL service: `railway add postgresql`
- [ ] Set environment variables in Railway dashboard

#### Heroku
- [ ] Install Heroku CLI
- [ ] Login to Heroku: `heroku login`
- [ ] Create new app: `heroku create your-app-name`
- [ ] Add PostgreSQL addon: `heroku addons:create heroku-postgresql:hobby-dev`
- [ ] Set environment variables: `heroku config:set KEY=value`

#### Vercel
- [ ] Install Vercel CLI: `npm install -g vercel`
- [ ] Login to Vercel: `vercel login`
- [ ] Set up external database (PlanetScale, Supabase, etc.)

## Deployment Process

### 1. Pre-deployment Checks
- [ ] All tests passing: `npm test`
- [ ] Linting clean: `npm run lint`
- [ ] Dependencies up to date: `npm audit`
- [ ] Git repository clean (no uncommitted changes)

### 2. Deploy Application
Choose your deployment method:

#### Option A: Automated Script
```bash
# Deploy to Railway (default)
./scripts/deploy.sh railway

# Deploy to Heroku
./scripts/deploy.sh heroku

# Deploy to Vercel
./scripts/deploy.sh vercel
```

#### Option B: Manual Deployment
```bash
# Install dependencies
npm ci

# Run tests
npm test

# Deploy to your chosen platform
railway up  # or heroku deploy, vercel --prod
```

### 3. Database Initialization
```bash
# Initialize database schema
npm run db:init

# Run migrations
npm run db:migrate
```

### 4. Health Check
- [ ] Visit `/health` endpoint
- [ ] Verify all services show as "enabled"
- [ ] Check database connection status

## Post-Deployment Configuration

### 1. Google Apps Script Update
- [ ] Update webhook URL in Google Apps Script
- [ ] Test email digest generation
- [ ] Verify webhook receives data

### 2. Slack Integration Update
- [ ] Update webhook URL in Slack app settings
- [ ] Test `/summary` command
- [ ] Verify company filtering works correctly

### 3. Monitoring Setup
- [ ] Set up error alerts in Sentry
- [ ] Configure log monitoring
- [ ] Set up uptime monitoring
- [ ] Create cost alerts for OpenAI API

## Testing & Validation

### 1. End-to-End Testing
- [ ] Send test email to Google Apps Script
- [ ] Verify webhook processes data correctly
- [ ] Test Slack command: `/summary On3`
- [ ] Test Slack command: `/summary Brit+Co`
- [ ] Verify AI summaries use exact metrics from content

### 2. Performance Testing
- [ ] Test response times under load
- [ ] Verify rate limiting works
- [ ] Test database query performance
- [ ] Monitor memory usage

### 3. Security Testing
- [ ] Test webhook signature validation
- [ ] Verify HTTPS configuration
- [ ] Test input validation and sanitization
- [ ] Check for sensitive data exposure

## Monitoring & Maintenance

### 1. Daily Monitoring
- [ ] Check error logs: `railway logs` or `heroku logs --tail`
- [ ] Monitor OpenAI API costs
- [ ] Verify daily email processing
- [ ] Check database size

### 2. Weekly Maintenance
- [ ] Review performance metrics
- [ ] Update dependencies: `npm audit fix`
- [ ] Check for security vulnerabilities
- [ ] Archive old documents if needed

### 3. Monthly Tasks
- [ ] Review and rotate API keys
- [ ] Update documentation
- [ ] Performance optimization review
- [ ] Backup database

## Troubleshooting

### Common Issues
1. **Database Connection Errors**
   - Check `DATABASE_URL` environment variable
   - Verify SSL configuration
   - Test connectivity: `psql $DATABASE_URL`

2. **OpenAI API Errors**
   - Check API key validity
   - Verify account has sufficient credits
   - Monitor rate limits

3. **Slack Command Failures**
   - Check webhook URL configuration
   - Verify signing secret
   - Test with curl

4. **Company Filtering Issues**
   - Check company patterns in database
   - Verify content matching logic
   - Test with debug endpoint

### Emergency Procedures
- **Rollback**: `railway rollback` or `heroku rollback`
- **Scale Down**: Reduce resource usage during issues
- **Database Restore**: Use platform backup restoration

## Cost Management

### Expected Costs (Monthly)
- **Railway**: $5-20 (depending on usage)
- **Heroku**: $0-25 (hobby tier)
- **OpenAI API**: $2-10 (based on usage)
- **Sentry**: $0-26 (optional)

### Cost Optimization
- [ ] Set OpenAI spending limits
- [ ] Archive old documents
- [ ] Optimize database queries
- [ ] Monitor and alert on usage spikes

## Security Checklist

- [ ] All API keys stored as environment variables
- [ ] Webhook signature validation enabled
- [ ] HTTPS enforced
- [ ] Rate limiting configured
- [ ] Input validation implemented
- [ ] Error messages don't expose sensitive data
- [ ] Regular security updates applied

## Success Criteria

Your deployment is successful when:
- [ ] Health check returns 200 OK
- [ ] Google Apps Script successfully sends data
- [ ] Slack commands work correctly
- [ ] AI summaries preserve exact metrics
- [ ] Company filtering works as expected
- [ ] No errors in production logs
- [ ] Response times under 3 seconds
- [ ] OpenAI costs within budget

## Support & Documentation

- **Production Deployment Guide**: `production-deploy.md`
- **Database Schema**: `scripts/init-database.js`
- **Environment Variables**: `env.template`
- **Deployment Script**: `scripts/deploy.sh`
- **Health Check**: `https://your-domain.com/health`

## Emergency Contacts

- **Platform Support**: Railway/Heroku/Vercel support
- **OpenAI Support**: support@openai.com
- **Slack Support**: Slack developer support
- **Database Issues**: Platform-specific database support 