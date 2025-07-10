#!/bin/bash

# MulaBot Production Deployment Script
# This script helps deploy MulaBot to production platforms

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}🚀 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Default platform is Railway
PLATFORM=${1:-railway}

print_status "Starting deployment for platform: $PLATFORM"

# Pre-deployment checks
print_status "Running pre-deployment checks..."

# Check if required files exist
REQUIRED_FILES=("production-webhook-server.js" "scripts/init-database.js" "env.template")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file missing: $file"
        exit 1
    fi
done

print_success "All required files found"

# Check if NODE_ENV is set
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
    print_warning "NODE_ENV not set, defaulting to production"
fi

# Install dependencies
print_status "Installing dependencies..."
npm ci

# Run linting
print_status "Running linter..."
if npm run lint; then
    print_success "Linting passed"
else
    print_error "Linting failed. Please fix linting errors before deploying."
    exit 1
fi

# Run tests
print_status "Running tests..."
if npm test; then
    print_success "Tests passed"
else
    print_error "Tests failed. Please fix failing tests before deploying."
    exit 1
fi

# Platform-specific deployment
case $PLATFORM in
    railway)
        print_status "Deploying to Railway..."
        
        # Check if Railway CLI is installed
        if ! command -v railway &> /dev/null; then
            print_error "Railway CLI not found. Please install it first:"
            print_error "npm install -g @railway/cli"
            exit 1
        fi
        
        # Check if logged in to Railway
        if ! railway whoami &> /dev/null; then
            print_error "Not logged in to Railway. Please run: railway login"
            exit 1
        fi
        
        # Deploy to Railway
        railway up
        
        # Run database initialization
        print_status "Setting up database..."
        railway run "npm run db:init"
        
        # Run migrations
        print_status "Running database migrations..."
        railway run "npm run db:migrate"
        
        print_success "Successfully deployed to Railway!"
        ;;
        
    heroku)
        print_status "Deploying to Heroku..."
        
        # Check if Heroku CLI is installed
        if ! command -v heroku &> /dev/null; then
            print_error "Heroku CLI not found. Please install it first"
            exit 1
        fi
        
        # Check if logged in to Heroku
        if ! heroku whoami &> /dev/null; then
            print_error "Not logged in to Heroku. Please run: heroku login"
            exit 1
        fi
        
        # Get the app name
        read -p "Enter your Heroku app name: " HEROKU_APP
        
        # Deploy to Heroku
        git push heroku main
        
        # Add PostgreSQL addon if not exists
        heroku addons:create heroku-postgresql:hobby-dev --app $HEROKU_APP || true
        
        # Run database initialization
        print_status "Setting up database..."
        heroku run "npm run db:init" --app $HEROKU_APP
        
        # Run migrations
        print_status "Running database migrations..."
        heroku run "npm run db:migrate" --app $HEROKU_APP
        
        print_success "Successfully deployed to Heroku!"
        ;;
        
    vercel)
        print_status "Deploying to Vercel..."
        
        # Check if Vercel CLI is installed
        if ! command -v vercel &> /dev/null; then
            print_error "Vercel CLI not found. Please install it first:"
            print_error "npm install -g vercel"
            exit 1
        fi
        
        # Deploy to Vercel
        vercel --prod
        
        print_success "Successfully deployed to Vercel!"
        print_warning "Note: You'll need to set up a separate database for Vercel"
        ;;
        
    *)
        print_error "Unknown platform: $PLATFORM"
        print_error "Supported platforms: railway, heroku, vercel"
        exit 1
        ;;
esac

# Post-deployment checks
print_status "Running post-deployment checks..."

case $PLATFORM in
    railway)
        HEALTH_URL=$(railway url)/health
        ;;
    heroku)
        HEALTH_URL="https://${HEROKU_APP}.herokuapp.com/health"
        ;;
    vercel)
        # Vercel URL will be shown after deployment
        print_warning "Please check the health endpoint manually"
        ;;
esac

if [ ! -z "$HEALTH_URL" ]; then
    print_status "Checking health endpoint: $HEALTH_URL"
    
    # Wait a bit for the service to start
    sleep 10
    
    if curl -f -s "$HEALTH_URL" > /dev/null; then
        print_success "Health check passed!"
    else
        print_warning "Health check failed. Please check the deployment logs."
    fi
fi

print_success "Deployment completed!"
print_status "Next steps:"
echo "1. Update your Google Apps Script webhook URL to point to the new deployment"
echo "2. Update your Slack app webhook URL to point to the new deployment"
echo "3. Test the /summary command in Slack"
echo "4. Monitor the logs for any issues"

if [ "$PLATFORM" == "railway" ]; then
    echo "5. View logs with: railway logs"
elif [ "$PLATFORM" == "heroku" ]; then
    echo "5. View logs with: heroku logs --tail --app $HEROKU_APP"
fi 