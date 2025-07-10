/**
 * Authentication System Test Suite
 * Weekly Publisher Digest Assistant - Google Apps Script
 */

/**
 * Test all authentication and security features
 */
function testAllAuthenticationFeatures() {
  try {
    Logger.log('=== AUTHENTICATION SYSTEM TEST SUITE ===');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {
        passed: 0,
        failed: 0,
        total: 0
      }
    };
    
    // Test 1: Security initialization
    Logger.log('Testing security initialization...');
    const initResult = testSecurityInitialization();
    results.tests.securityInitialization = initResult;
    results.summary.total++;
    if (initResult.success) results.summary.passed++;
    else results.summary.failed++;
    
    // Test 2: API key generation and validation
    Logger.log('Testing API key system...');
    const apiKeyResult = testApiKeySystem();
    results.tests.apiKeySystem = apiKeyResult;
    results.summary.total++;
    if (apiKeyResult.success) results.summary.passed++;
    else results.summary.failed++;
    
    // Test 3: Webhook signature validation
    Logger.log('Testing webhook signature validation...');
    const signatureResult = testWebhookSignatureValidation();
    results.tests.webhookSignature = signatureResult;
    results.summary.total++;
    if (signatureResult.success) results.summary.passed++;
    else results.summary.failed++;
    
    // Test 4: Origin validation
    Logger.log('Testing origin validation...');
    const originResult = testOriginValidation();
    results.tests.originValidation = originResult;
    results.summary.total++;
    if (originResult.success) results.summary.passed++;
    else results.summary.failed++;
    
    // Test 5: Access logging
    Logger.log('Testing access logging...');
    const loggingResult = testAccessLogging();
    results.tests.accessLogging = loggingResult;
    results.summary.total++;
    if (loggingResult.success) results.summary.passed++;
    else results.summary.failed++;
    
    // Test 6: Security toggle
    Logger.log('Testing security toggle...');
    const toggleResult = testSecurityToggle();
    results.tests.securityToggle = toggleResult;
    results.summary.total++;
    if (toggleResult.success) results.summary.passed++;
    else results.summary.failed++;
    
    // Test 7: Key rotation
    Logger.log('Testing key rotation...');
    const rotationResult = testKeyRotation();
    results.tests.keyRotation = rotationResult;
    results.summary.total++;
    if (rotationResult.success) results.summary.passed++;
    else results.summary.failed++;
    
    // Calculate success rate
    results.summary.successRate = (results.summary.passed / results.summary.total * 100).toFixed(1) + '%';
    
    Logger.log('=== AUTHENTICATION TEST RESULTS ===');
    Logger.log('Total tests: ' + results.summary.total);
    Logger.log('Passed: ' + results.summary.passed);
    Logger.log('Failed: ' + results.summary.failed);
    Logger.log('Success rate: ' + results.summary.successRate);
    
    return results;
    
  } catch (error) {
    Logger.log('Error running authentication tests: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test security initialization
 */
function testSecurityInitialization() {
  try {
    // Initialize security
    const initResult = initializeSecurity();
    
    if (!initResult.success) {
      return {
        success: false,
        error: 'Security initialization failed: ' + initResult.error
      };
    }
    
    // Verify properties were set
    const properties = PropertiesService.getScriptProperties();
    const securityEnabled = properties.getProperty('SECURITY_ENABLED');
    const apiKey = properties.getProperty('API_KEY');
    const webhookSecret = properties.getProperty('WEBHOOK_SECRET');
    
    if (securityEnabled !== 'true') {
      return {
        success: false,
        error: 'Security enabled flag not set correctly'
      };
    }
    
    if (!apiKey || apiKey.length < 20) {
      return {
        success: false,
        error: 'API key not generated or too short'
      };
    }
    
    if (!webhookSecret || webhookSecret.length < 20) {
      return {
        success: false,
        error: 'Webhook secret not generated or too short'
      };
    }
    
    return {
      success: true,
      message: 'Security initialization successful',
      details: {
        securityEnabled: securityEnabled,
        apiKeyLength: apiKey.length,
        webhookSecretLength: webhookSecret.length
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test API key system
 */
function testApiKeySystem() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const apiKey = properties.getProperty('API_KEY');
    
    if (!apiKey) {
      return {
        success: false,
        error: 'No API key found in properties'
      };
    }
    
    // Test valid API key
    const validHeaders = {};
    validHeaders[API_KEY_HEADER] = apiKey;
    const validResult = validateApiKey(validHeaders);
    
    if (!validResult.valid) {
      return {
        success: false,
        error: 'Valid API key validation failed: ' + validResult.reason
      };
    }
    
    // Test invalid API key
    const invalidHeaders = {};
    invalidHeaders[API_KEY_HEADER] = 'invalid-key';
    const invalidResult = validateApiKey(invalidHeaders);
    
    if (invalidResult.valid) {
      return {
        success: false,
        error: 'Invalid API key validation should have failed'
      };
    }
    
    // Test missing API key
    const emptyHeaders = {};
    const emptyResult = validateApiKey(emptyHeaders);
    
    if (emptyResult.valid) {
      return {
        success: false,
        error: 'Missing API key validation should have failed'
      };
    }
    
    return {
      success: true,
      message: 'API key system working correctly',
      details: {
        validKeyTest: validResult.reason,
        invalidKeyTest: invalidResult.reason,
        missingKeyTest: emptyResult.reason
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test webhook signature validation
 */
function testWebhookSignatureValidation() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const webhookSecret = properties.getProperty('WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      return {
        success: false,
        error: 'No webhook secret found in properties'
      };
    }
    
    // Test payload and signature
    const testPayload = JSON.stringify({ test: 'data' });
    const validSignature = 'sha256=' + generateHmacSha256(testPayload, webhookSecret);
    
    // Test valid signature
    const validHeaders = {};
    validHeaders[WEBHOOK_SIGNATURE_HEADER] = validSignature;
    const validResult = validateWebhookSignature(testPayload, validHeaders);
    
    if (!validResult.valid) {
      return {
        success: false,
        error: 'Valid webhook signature validation failed: ' + validResult.reason
      };
    }
    
    // Test invalid signature
    const invalidHeaders = {};
    invalidHeaders[WEBHOOK_SIGNATURE_HEADER] = 'sha256=invalid-signature';
    const invalidResult = validateWebhookSignature(testPayload, invalidHeaders);
    
    if (invalidResult.valid) {
      return {
        success: false,
        error: 'Invalid webhook signature validation should have failed'
      };
    }
    
    return {
      success: true,
      message: 'Webhook signature validation working correctly',
      details: {
        validSignatureTest: validResult.reason,
        invalidSignatureTest: invalidResult.reason
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test origin validation
 */
function testOriginValidation() {
  try {
    // Test valid origin
    const validHeaders = {
      'Origin': 'https://webhook.pipedream.com'
    };
    const validResult = validateOrigin(validHeaders);
    
    if (!validResult.valid) {
      return {
        success: false,
        error: 'Valid origin validation failed: ' + validResult.reason
      };
    }
    
    // Test invalid origin
    const invalidHeaders = {
      'Origin': 'https://malicious-site.com'
    };
    const invalidResult = validateOrigin(invalidHeaders);
    
    if (invalidResult.valid) {
      return {
        success: false,
        error: 'Invalid origin validation should have failed'
      };
    }
    
    // Test missing origin (should be allowed)
    const emptyHeaders = {};
    const emptyResult = validateOrigin(emptyHeaders);
    
    if (!emptyResult.valid) {
      return {
        success: false,
        error: 'Missing origin should be allowed: ' + emptyResult.reason
      };
    }
    
    return {
      success: true,
      message: 'Origin validation working correctly',
      details: {
        validOriginTest: validResult.reason,
        invalidOriginTest: invalidResult.reason,
        missingOriginTest: emptyResult.reason
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test access logging
 */
function testAccessLogging() {
  try {
    const testHeaders = {
      'User-Agent': 'Test-Agent',
      'Origin': 'https://webhook.pipedream.com'
    };
    
    // Log a test access
    logAccess(testHeaders, 'TEST');
    
    // Check if log was recorded
    const properties = PropertiesService.getScriptProperties();
    const recentLogs = JSON.parse(properties.getProperty('RECENT_ACCESS_LOGS') || '[]');
    
    if (recentLogs.length === 0) {
      return {
        success: false,
        error: 'Access log was not recorded'
      };
    }
    
    const latestLog = recentLogs[0];
    if (latestLog.method !== 'TEST') {
      return {
        success: false,
        error: 'Access log method not recorded correctly'
      };
    }
    
    if (latestLog.userAgent !== 'Test-Agent') {
      return {
        success: false,
        error: 'Access log user agent not recorded correctly'
      };
    }
    
    return {
      success: true,
      message: 'Access logging working correctly',
      details: {
        logCount: recentLogs.length,
        latestLog: latestLog
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test security toggle
 */
function testSecurityToggle() {
  try {
    // Test disabling security
    const disableResult = toggleSecurity(false);
    if (!disableResult.success || disableResult.securityEnabled !== false) {
      return {
        success: false,
        error: 'Failed to disable security: ' + JSON.stringify(disableResult)
      };
    }
    
    // Test enabling security
    const enableResult = toggleSecurity(true);
    if (!enableResult.success || enableResult.securityEnabled !== true) {
      return {
        success: false,
        error: 'Failed to enable security: ' + JSON.stringify(enableResult)
      };
    }
    
    return {
      success: true,
      message: 'Security toggle working correctly',
      details: {
        disableTest: disableResult.message,
        enableTest: enableResult.message
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test key rotation
 */
function testKeyRotation() {
  try {
    // Get current keys
    const properties = PropertiesService.getScriptProperties();
    const oldApiKey = properties.getProperty('API_KEY');
    const oldWebhookSecret = properties.getProperty('WEBHOOK_SECRET');
    
    // Rotate keys
    const rotationResult = rotateSecurityKeys();
    
    if (!rotationResult.success) {
      return {
        success: false,
        error: 'Key rotation failed: ' + rotationResult.error
      };
    }
    
    // Check if keys changed
    const newApiKey = properties.getProperty('API_KEY');
    const newWebhookSecret = properties.getProperty('WEBHOOK_SECRET');
    
    if (newApiKey === oldApiKey) {
      return {
        success: false,
        error: 'API key was not rotated'
      };
    }
    
    if (newWebhookSecret === oldWebhookSecret) {
      return {
        success: false,
        error: 'Webhook secret was not rotated'
      };
    }
    
    // Check if backup keys were stored
    const backupApiKey = properties.getProperty('API_KEY_BACKUP');
    const backupWebhookSecret = properties.getProperty('WEBHOOK_SECRET_BACKUP');
    
    if (backupApiKey !== oldApiKey) {
      return {
        success: false,
        error: 'Backup API key not stored correctly'
      };
    }
    
    if (backupWebhookSecret !== oldWebhookSecret) {
      return {
        success: false,
        error: 'Backup webhook secret not stored correctly'
      };
    }
    
    return {
      success: true,
      message: 'Key rotation working correctly',
      details: {
        oldApiKeyLength: oldApiKey ? oldApiKey.length : 0,
        newApiKeyLength: newApiKey ? newApiKey.length : 0,
        oldWebhookSecretLength: oldWebhookSecret ? oldWebhookSecret.length : 0,
        newWebhookSecretLength: newWebhookSecret ? newWebhookSecret.length : 0
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test authentication with mock request
 */
function testAuthenticationWithMockRequest() {
  try {
    Logger.log('Testing authentication with mock request...');
    
    // Initialize security first
    const initResult = initializeSecurity();
    if (!initResult.success) {
      return {
        success: false,
        error: 'Failed to initialize security: ' + initResult.error
      };
    }
    
    const properties = PropertiesService.getScriptProperties();
    const apiKey = properties.getProperty('API_KEY');
    
    // Create mock request with valid credentials
    const mockRequest = {
      headers: {
        'Origin': 'https://webhook.pipedream.com',
        'User-Agent': 'Test-Agent'
      },
      method: 'GET',
      postData: null
    };
    mockRequest.headers[API_KEY_HEADER] = apiKey;
    
    // Test authentication
    const authResult = authenticateRequest(mockRequest, true);
    
    if (!authResult.authenticated) {
      return {
        success: false,
        error: 'Authentication failed: ' + authResult.error
      };
    }
    
    return {
      success: true,
      message: 'Mock request authentication successful',
      details: {
        authenticationChecks: authResult.checks,
        message: authResult.message
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Generate comprehensive security report
 */
function generateSecurityReport() {
  try {
    Logger.log('Generating comprehensive security report...');
    
    const testResults = testAllAuthenticationFeatures();
    const securityStatus = getSecurityStatus();
    
    const report = {
      timestamp: new Date().toISOString(),
      securityStatus: securityStatus,
      testResults: testResults,
      recommendations: [],
      overallScore: 0
    };
    
    // Calculate overall security score
    let score = 0;
    
    if (securityStatus.securityEnabled) score += 20;
    if (securityStatus.hasApiKey) score += 15;
    if (securityStatus.hasWebhookSecret) score += 15;
    if (securityStatus.accessLogEnabled) score += 10;
    if (testResults.summary.successRate === '100.0%') score += 40;
    
    report.overallScore = score;
    
    // Generate recommendations
    if (!securityStatus.securityEnabled) {
      report.recommendations.push('Enable security features');
    }
    if (!securityStatus.hasApiKey) {
      report.recommendations.push('Generate API key');
    }
    if (!securityStatus.hasWebhookSecret) {
      report.recommendations.push('Generate webhook secret');
    }
    if (!securityStatus.accessLogEnabled) {
      report.recommendations.push('Enable access logging');
    }
    if (testResults.summary.failed > 0) {
      report.recommendations.push('Fix failing security tests');
    }
    
    Logger.log('Security report generated. Overall score: ' + score + '/100');
    
    return report;
    
  } catch (error) {
    Logger.log('Error generating security report: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
} 