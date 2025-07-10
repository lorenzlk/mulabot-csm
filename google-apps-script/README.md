# Google Apps Script Setup - Weekly Publisher Digest Assistant

## Overview

This Google Apps Script project monitors document changes and provides webhook endpoints for the Weekly Publisher Digest Assistant. It handles document access, change detection, and communication with the Pipedream workflow.

## Features

- **Automated Document Monitoring**: Checks for changes every 5 minutes
- **Change Detection**: Compares document state (modification date and content length)
- **Content Extraction**: Identifies new content and attempts to parse daily sections
- **Webhook Integration**: Sends structured data to Pipedream for processing
- **Security & Authentication**: API key validation, webhook signatures, origin validation
- **Access Control**: Secure endpoints with comprehensive access logging
- **Error Handling**: Comprehensive logging and graceful failure handling
- **Health Monitoring**: Multiple endpoints for status checks and testing

## Files in this project

- `appsscript.json` - Project manifest with permissions and configuration
- `doc-monitor.gs` - Main script with document monitoring and webhook functionality
- `auth-config.gs` - Authentication and security configuration
- `test-auth.gs` - Authentication system test suite
- `README.md` - This setup guide

## Setup Instructions

### 1. Create New Google Apps Script Project

1. Go to [Google Apps Script](https://script.google.com/)
2. Click "New Project"
3. Name your project: "Weekly Publisher Digest Assistant"

### 2. Configure Project Files

1. **Replace Code.gs with doc-monitor.gs:**
   - Delete the default `Code.gs` file
   - Create a new file named `doc-monitor.gs`
   - Copy the entire contents of `doc-monitor.gs` from this directory

2. **Add Manifest File:**
   - In the Apps Script editor, go to Settings (gear icon)
   - Check "Show 'appsscript.json' manifest file in editor"
   - Replace the default manifest with contents from `appsscript.json`

### 3. Configure Permissions

The manifest includes these required OAuth scopes:
- `https://www.googleapis.com/auth/documents` - Read/write Google Docs
- `https://www.googleapis.com/auth/drive` - Access Google Drive
- `https://www.googleapis.com/auth/drive.file` - Create/modify Drive files
- `https://www.googleapis.com/auth/script.external_request` - Make external HTTP requests
- `https://www.googleapis.com/auth/script.scriptapp` - Script execution

### 4. Enable Advanced Services

1. In the Apps Script editor, go to "Services" (+ icon)
2. Add these services:
   - **Google Drive API** (Drive, v3)
   - **Google Docs API** (Docs, v1)

### 5. Test Initial Setup

1. In the Apps Script editor, select the `initializeProject` function
2. Click "Run" to execute
3. **First run will prompt for permissions - grant all requested permissions**
4. Check the execution log for success message

### 6. Deploy as Web App

1. Click "Deploy" > "New deployment"
2. Choose type: "Web app"
3. Execute as: "Me"
4. Who has access: "Anyone" (for webhook access)
5. Click "Deploy"
6. **Copy the web app URL** - you'll need this for Pipedream integration

### 7. Update Configuration

1. In the `doc-monitor.gs` file, update:
   - `PIPEDREAM_WEBHOOK_URL` with your actual Pipedream webhook URL
   - Verify `TARGET_DOC_ID` matches your document ID

### 8. Test Document Access

1. Run the `testDocumentAccess` function
2. Verify it can access the target document
3. Check logs for document name and content length

### 9. Set Up Document Monitoring

1. Run the `setupDocumentTriggers` function
2. This creates a trigger that checks for document changes every 5 minutes
3. Check logs for trigger creation confirmation

## Testing the Setup

### Test Document Access
```javascript
// Run this function to verify document permissions
testDocumentAccess()
```

### Test Change Detection System
```javascript
// Run this function to test the entire change detection workflow
testChangeDetection()
```

### Test Webhook Notification
```javascript
// Run this function to test webhook notification to Pipedream
testWebhookNotification()
```

### Test Webhook Endpoints

#### GET Endpoint (Status Check)
```bash
# Test basic status
curl https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

# Test specific actions
curl "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=status"
curl "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=health"
curl "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=test"
curl "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=trigger_test"
```

#### POST Endpoint (Webhook Testing)
```bash
# Test basic webhook
curl -X POST https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'

# Test change detection trigger
curl -X POST https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec \
  -H "Content-Type: application/json" \
  -d '{"type": "trigger_change_detection"}'

# Test health check
curl -X POST https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec \
  -H "Content-Type: application/json" \
  -d '{"type": "health_check"}'
```

### Check Project Status
```javascript
// Run this function to see current configuration
getProjectStatus()
```

### Check System Health
```javascript
// Run this function to get comprehensive health status
getHealthStatus()
```

## Available Functions

### Core Functions
- `initializeProject()` - Initialize the project with default settings
- `setupDocumentTriggers()` - Set up automatic document change monitoring
- `testDocumentAccess()` - Test document access and permissions
- `testChangeDetection()` - Test the change detection system
- `getProjectStatus()` - Get current project configuration
- `getHealthStatus()` - Get comprehensive system health status

### Webhook Functions
- `testWebhookNotification()` - Test webhook notification to Pipedream
- `setupPipedreamWebhook(url)` - Configure Pipedream webhook URL
- `notifyPipedream(content)` - Send content notifications to Pipedream

### Internal Functions
- `onDocumentChange()` - Triggered automatically when document changes
- `detectDocumentChanges()` - Compare current vs stored document state
- `extractNewContent()` - Extract newly added content from document
- `extractDailySections(content)` - Parse content into daily sections
- `storeCurrentDocumentState()` - Store current document state for comparison

## Webhook Endpoints

The deployed web app provides these endpoints:

### GET Endpoints
- `?action=status` - Get project status
- `?action=health` - Get system health status
- `?action=test` - Test document access
- `?action=trigger_test` - Test change detection

### POST Endpoints
- `{"type": "test"}` - Test webhook with document access
- `{"type": "trigger_change_detection"}` - Trigger change detection
- `{"type": "health_check"}` - Get health status

## Common Issues and Solutions

### Permission Errors
- **Issue**: "Authorization required" errors
- **Solution**: Re-run `initializeProject()` and grant all permissions

### Document Access Errors
- **Issue**: Cannot access target document
- **Solution**: Verify document ID and ensure script owner has edit access

### Webhook Not Responding
- **Issue**: Web app URL returns errors
- **Solution**: Redeploy the web app with correct permissions

### Advanced Services Not Available
- **Issue**: Drive or Docs API not working
- **Solution**: Enable Advanced Services in the Apps Script console

### Trigger Not Working
- **Issue**: Document changes not being detected
- **Solution**: Run `setupDocumentTriggers()` to recreate triggers

## Security Features

### Authentication System

The project includes a comprehensive authentication system with:
- **API Key Validation**: Secure API keys for protected endpoints
- **Webhook Signatures**: HMAC-SHA256 signature validation for webhook payloads
- **Origin Validation**: Whitelist of allowed request origins
- **Access Logging**: Detailed logging of all access attempts

### Security Configuration

1. **Initialize Security System**:
   ```javascript
   initializeSecurity()
   ```
   This generates API keys and webhook secrets automatically.

2. **Get Security Status**:
   ```javascript
   getSecurityStatus()
   ```
   Returns current security configuration and recent access logs.

3. **Rotate Security Keys**:
   ```javascript
   rotateSecurityKeys()
   ```
   Generates new API keys and webhook secrets (stores old ones as backup).

4. **Toggle Security**:
   ```javascript
   toggleSecurity(true)  // Enable security
   toggleSecurity(false) // Disable security
   ```

### Secure Endpoints

Protected endpoints require authentication:

#### API Key Authentication
```bash
# Add API key header for protected endpoints
curl "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=security" \
  -H "X-API-Key: YOUR_API_KEY"
```

#### Webhook Signature Authentication
```bash
# Include webhook signature for POST requests
curl -X POST https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=YOUR_SIGNATURE" \
  -d '{"data": "your_payload"}'
```

#### Origin Validation
Requests are validated against allowed origins:
- `https://webhook.pipedream.com`
- `https://api.pipedream.com`

### Security Endpoints

#### GET Endpoints (require API key)
- `?action=security` - Get security configuration status
- `?action=logs` - Get recent access logs
- `?action=init_security` - Initialize security system
- `?action=rotate_keys` - Rotate API keys and webhook secrets
- `?action=toggle_security&enabled=true` - Enable/disable security

### Testing Security

The project includes comprehensive security tests:

```javascript
// Run all security tests
testAllAuthenticationFeatures()

// Test specific components
testSecurityInitialization()
testApiKeySystem()
testWebhookSignatureValidation()
testOriginValidation()
testAccessLogging()
testSecurityToggle()
testKeyRotation()

// Generate security report
generateSecurityReport()
```

### Security Best Practices

1. **Keep API Keys Secure**: Never expose API keys in client-side code
2. **Use HTTPS**: All webhook communications should use HTTPS
3. **Rotate Keys Regularly**: Use `rotateSecurityKeys()` periodically
4. **Monitor Access Logs**: Check access logs for suspicious activity
5. **Enable Security**: Always keep security features enabled in production

### Security Configuration Properties

The system stores these security properties:
- `SECURITY_ENABLED` - Whether security features are active
- `API_KEY` - Current API key for authentication
- `WEBHOOK_SECRET` - Current webhook secret for signature validation
- `ACCESS_LOG_ENABLED` - Whether access logging is enabled
- `RECENT_ACCESS_LOGS` - Recent access attempts (last 10)
- `LAST_SECURITY_UPDATE` - Timestamp of last security update
- `LAST_KEY_ROTATION` - Timestamp of last key rotation

## Next Steps

After completing this setup:
1. Test all functions work correctly
2. Note down the web app URL for Pipedream integration
3. Configure Pipedream webhook URL in the script
4. Set up document change triggers with `setupDocumentTriggers()`
5. Proceed to configure Pipedream workflow
6. Test end-to-end integration

## Troubleshooting

- **View Logs**: Use `Logger.log()` statements and check Execution log
- **Debug Mode**: Run functions individually to isolate issues
- **Permissions**: Check OAuth consent screen if authorization fails
- **Quotas**: Monitor script execution time and API call limits
- **Health Check**: Use `getHealthStatus()` for comprehensive diagnostics
- **Test Webhooks**: Use the various test endpoints to verify functionality 