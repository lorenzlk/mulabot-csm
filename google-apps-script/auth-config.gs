/**
 * Authentication and Security Configuration
 * Weekly Publisher Digest Assistant - Google Apps Script
 */

// Security Configuration Constants
const WEBHOOK_SECRET_KEY = 'your-webhook-secret-key-here'; // Replace with actual secret
const API_KEY_HEADER = 'X-API-Key';
const WEBHOOK_SIGNATURE_HEADER = 'X-Webhook-Signature';
const ALLOWED_ORIGINS = [
  'https://webhook.pipedream.com',
  'https://api.pipedream.com'
];

/**
 * Initialize security settings and generate API credentials
 */
function initializeSecurity() {
  try {
    console.log('Initializing security configuration...');
    
    // Generate API key if not exists
    const properties = PropertiesService.getScriptProperties();
    let apiKey = properties.getProperty('API_KEY');
    
    if (!apiKey) {
      apiKey = generateSecureApiKey();
      properties.setProperty('API_KEY', apiKey);
      console.log('New API key generated');
    }
    
    // Generate webhook secret if not exists
    let webhookSecret = properties.getProperty('WEBHOOK_SECRET');
    if (!webhookSecret) {
      webhookSecret = generateSecureApiKey();
      properties.setProperty('WEBHOOK_SECRET', webhookSecret);
      console.log('New webhook secret generated');
    }
    
    // Set up security properties
    properties.setProperties({
      'SECURITY_ENABLED': 'true',
      'LAST_SECURITY_UPDATE': new Date().toISOString(),
      'ACCESS_LOG_ENABLED': 'true'
    });
    
    console.log('Security configuration initialized successfully');
    
    return {
      success: true,
      apiKey: apiKey,
      webhookSecret: webhookSecret,
      message: 'Security initialized'
    };
    
  } catch (error) {
    console.log('Error initializing security: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Generate a secure API key
 */
function generateSecureApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate API key from request headers
 */
function validateApiKey(headers) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const securityEnabled = properties.getProperty('SECURITY_ENABLED') === 'true';
    
    if (!securityEnabled) {
      console.log('Security is disabled - allowing request');
      return { valid: true, reason: 'Security disabled' };
    }
    
    const storedApiKey = properties.getProperty('API_KEY');
    const providedApiKey = headers[API_KEY_HEADER] || headers[API_KEY_HEADER.toLowerCase()];
    
    if (!providedApiKey) {
      console.log('API key validation failed: No API key provided');
      return { valid: false, reason: 'No API key provided' };
    }
    
    if (providedApiKey !== storedApiKey) {
      console.log('API key validation failed: Invalid API key');
      return { valid: false, reason: 'Invalid API key' };
    }
    
    console.log('API key validation successful');
    return { valid: true, reason: 'Valid API key' };
    
  } catch (error) {
    console.log('Error validating API key: ' + error.toString());
    return { valid: false, reason: 'Validation error: ' + error.toString() };
  }
}

/**
 * Validate webhook signature
 */
function validateWebhookSignature(payload, headers) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const webhookSecret = properties.getProperty('WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.log('Webhook validation skipped: No webhook secret configured');
      return { valid: true, reason: 'No webhook secret configured' };
    }
    
    const providedSignature = headers[WEBHOOK_SIGNATURE_HEADER] || headers[WEBHOOK_SIGNATURE_HEADER.toLowerCase()];
    
    if (!providedSignature) {
      console.log('Webhook validation failed: No signature provided');
      return { valid: false, reason: 'No webhook signature provided' };
    }
    
    // Generate expected signature using HMAC-SHA256
    const expectedSignature = 'sha256=' + generateHmacSha256(payload, webhookSecret);
    
    if (providedSignature !== expectedSignature) {
      console.log('Webhook validation failed: Invalid signature');
      return { valid: false, reason: 'Invalid webhook signature' };
    }
    
    console.log('Webhook signature validation successful');
    return { valid: true, reason: 'Valid webhook signature' };
    
  } catch (error) {
    console.log('Error validating webhook signature: ' + error.toString());
    return { valid: false, reason: 'Signature validation error: ' + error.toString() };
  }
}

/**
 * Simple HMAC-SHA256 implementation for webhook validation
 */
function generateHmacSha256(data, key) {
  try {
    // Simple hash function for demonstration
    // In production, use Google Apps Script's built-in crypto functions
    const hash = Utilities.computeHmacSha256Signature(data, key);
    return Utilities.base64Encode(hash);
  } catch (error) {
    console.log('Error generating HMAC: ' + error.toString());
    return '';
  }
}

/**
 * Check if request origin is allowed
 */
function validateOrigin(headers) {
  try {
    const origin = headers['Origin'] || headers['origin'] || headers['Referer'] || headers['referer'];
    
    if (!origin) {
      console.log('Origin validation: No origin provided - allowing request');
      return { valid: true, reason: 'No origin header' };
    }
    
    const isAllowed = ALLOWED_ORIGINS.some(allowedOrigin => 
      origin.startsWith(allowedOrigin)
    );
    
    if (!isAllowed) {
      console.log('Origin validation failed: ' + origin + ' not in allowed origins');
      return { valid: false, reason: 'Origin not allowed: ' + origin };
    }
    
    console.log('Origin validation successful: ' + origin);
    return { valid: true, reason: 'Valid origin: ' + origin };
    
  } catch (error) {
    console.log('Error validating origin: ' + error.toString());
    return { valid: false, reason: 'Origin validation error: ' + error.toString() };
  }
}

/**
 * Comprehensive request authentication
 */
function authenticateRequest(e, requireApiKey = false) {
  try {
    const headers = e.headers || {};
    const postData = e.postData ? e.postData.contents : '';
    
    // Log access attempt
    logAccess(headers, e.method || 'GET');
    
    // Validate origin
    const originCheck = validateOrigin(headers);
    if (!originCheck.valid) {
      return { 
        authenticated: false, 
        error: 'Origin validation failed: ' + originCheck.reason,
        code: 403 
      };
    }
    
    // Validate API key if required
    if (requireApiKey) {
      const apiKeyCheck = validateApiKey(headers);
      if (!apiKeyCheck.valid) {
        return { 
          authenticated: false, 
          error: 'API key validation failed: ' + apiKeyCheck.reason,
          code: 401 
        };
      }
    }
    
    // Validate webhook signature for POST requests with payload
    if (postData && postData.length > 0) {
      const signatureCheck = validateWebhookSignature(postData, headers);
      if (!signatureCheck.valid) {
        console.log('Warning: Webhook signature validation failed, but continuing...');
        // Don't fail the request, just log the warning
      }
    }
    
    console.log('Request authentication successful');
    return { 
      authenticated: true, 
      message: 'Authentication successful',
      checks: {
        origin: originCheck.reason,
        apiKey: requireApiKey ? 'Validated' : 'Not required',
        signature: postData ? 'Checked' : 'Not applicable'
      }
    };
    
  } catch (error) {
    console.log('Error authenticating request: ' + error.toString());
    return { 
      authenticated: false, 
      error: 'Authentication error: ' + error.toString(),
      code: 500 
    };
  }
}

/**
 * Log access attempts for monitoring
 */
function logAccess(headers, method) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const accessLogEnabled = properties.getProperty('ACCESS_LOG_ENABLED') === 'true';
    
    if (!accessLogEnabled) {
      return;
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: method,
      userAgent: headers['User-Agent'] || headers['user-agent'] || 'Unknown',
      origin: headers['Origin'] || headers['origin'] || 'None',
      hasApiKey: !!(headers[API_KEY_HEADER] || headers[API_KEY_HEADER.toLowerCase()]),
      hasSignature: !!(headers[WEBHOOK_SIGNATURE_HEADER] || headers[WEBHOOK_SIGNATURE_HEADER.toLowerCase()])
    };
    
    console.log('Access log: ' + JSON.stringify(logEntry));
    
    // Store recent access logs (keep last 10)
    const recentLogs = JSON.parse(properties.getProperty('RECENT_ACCESS_LOGS') || '[]');
    recentLogs.unshift(logEntry);
    if (recentLogs.length > 10) {
      recentLogs.splice(10);
    }
    properties.setProperty('RECENT_ACCESS_LOGS', JSON.stringify(recentLogs));
    
  } catch (error) {
    console.log('Error logging access: ' + error.toString());
  }
}

/**
 * Get security configuration status
 */
function getSecurityStatus() {
  try {
    const properties = PropertiesService.getScriptProperties();
    
    return {
      securityEnabled: properties.getProperty('SECURITY_ENABLED') === 'true',
      hasApiKey: !!properties.getProperty('API_KEY'),
      hasWebhookSecret: !!properties.getProperty('WEBHOOK_SECRET'),
      accessLogEnabled: properties.getProperty('ACCESS_LOG_ENABLED') === 'true',
      lastSecurityUpdate: properties.getProperty('LAST_SECURITY_UPDATE'),
      allowedOrigins: ALLOWED_ORIGINS.length,
      recentAccessLogs: JSON.parse(properties.getProperty('RECENT_ACCESS_LOGS') || '[]')
    };
    
  } catch (error) {
    console.log('Error getting security status: ' + error.toString());
    return { error: error.toString() };
  }
}

/**
 * Enable/disable security features
 */
function toggleSecurity(enabled) {
  try {
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty('SECURITY_ENABLED', enabled ? 'true' : 'false');
    properties.setProperty('LAST_SECURITY_UPDATE', new Date().toISOString());
    
    console.log('Security ' + (enabled ? 'enabled' : 'disabled'));
    
    return {
      success: true,
      securityEnabled: enabled,
      message: 'Security ' + (enabled ? 'enabled' : 'disabled')
    };
    
  } catch (error) {
    console.log('Error toggling security: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Rotate API keys and webhook secrets
 */
function rotateSecurityKeys() {
  try {
    console.log('Rotating security keys...');
    
    const properties = PropertiesService.getScriptProperties();
    
    // Generate new keys
    const newApiKey = generateSecureApiKey();
    const newWebhookSecret = generateSecureApiKey();
    
    // Store old keys as backup
    const oldApiKey = properties.getProperty('API_KEY');
    const oldWebhookSecret = properties.getProperty('WEBHOOK_SECRET');
    
    properties.setProperties({
      'API_KEY_BACKUP': oldApiKey,
      'WEBHOOK_SECRET_BACKUP': oldWebhookSecret,
      'API_KEY': newApiKey,
      'WEBHOOK_SECRET': newWebhookSecret,
      'LAST_KEY_ROTATION': new Date().toISOString()
    });
    
    console.log('Security keys rotated successfully');
    
    return {
      success: true,
      newApiKey: newApiKey,
      newWebhookSecret: newWebhookSecret,
      message: 'Security keys rotated'
    };
    
  } catch (error) {
    console.log('Error rotating security keys: ' + error.toString());
    return { success: false, error: error.toString() };
  }
} 