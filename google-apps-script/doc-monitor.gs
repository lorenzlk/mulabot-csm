/**
 * Weekly Publisher Digest Assistant - Google Apps Script
 * Main document monitoring and webhook service
 */

// Configuration constants
const TARGET_DOC_ID = '1DiRcu3pLpCXuYlJ7r19tzsHxI89YWw2BfNFkvOdchsM';
const PIPEDREAM_WEBHOOK_URL = 'https://d8a85de8638e.ngrok-free.app/webhook'; // Working ngrok webhook URL

/**
 * Initialize the project and set up necessary configurations
 */
function initializeProject() {
  try {
    console.log('Initializing Weekly Publisher Digest Assistant...');
    
    // Initialize security first
    const securityResult = initializeSecurity();
    if (!securityResult.success) {
      console.log('Warning: Security initialization failed: ' + securityResult.error);
    }
    
    // Verify document access
    const doc = DocumentApp.openById(TARGET_DOC_ID);
    console.log('Successfully connected to target document: ' + doc.getName());
    
    // Set up properties for tracking
    const properties = PropertiesService.getScriptProperties();
    properties.setProperties({
      'LAST_MODIFIED': new Date().toISOString(),
      'WEBHOOK_URL': PIPEDREAM_WEBHOOK_URL,
      'PROJECT_INITIALIZED': 'true'
    });
    
    console.log('Project initialized successfully');
    return { 
      success: true, 
      message: 'Project initialized', 
      security: securityResult 
    };
    
  } catch (error) {
    console.log('Error initializing project: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Set up installable triggers for document change detection
 */
function setupDocumentTriggers() {
  try {
    console.log('Setting up document change triggers...');
    
    // Delete existing triggers first
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onDocumentChange') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create new trigger for document changes
    const trigger = ScriptApp.newTrigger('onDocumentChange')
      .timeBased()
      .everyMinutes(5) // Check every 5 minutes
      .create();
    
    console.log('Document change trigger created: ' + trigger.getUniqueId());
    
    // Store initial document state
    storeCurrentDocumentState();
    
    return { success: true, triggerId: trigger.getUniqueId() };
    
  } catch (error) {
    console.log('Error setting up triggers: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Store current document state for comparison
 */
function storeCurrentDocumentState() {
  try {
    const doc = DocumentApp.openById(TARGET_DOC_ID);
    const body = doc.getBody();
    const text = body.getText();
    
    // Get file modification date
    const file = DriveApp.getFileById(TARGET_DOC_ID);
    const lastModified = file.getLastUpdated();
    
    // Store current state
    const properties = PropertiesService.getScriptProperties();
    properties.setProperties({
      'LAST_CONTENT_LENGTH': text.length.toString(),
      'LAST_MODIFIED_DATE': lastModified.toISOString(),
      'LAST_CHECK_TIME': new Date().toISOString()
    });
    
    console.log('Document state stored - Length: ' + text.length + ', Modified: ' + lastModified.toISOString());
    
  } catch (error) {
    console.log('Error storing document state: ' + error.toString());
  }
}

/**
 * Trigger function called when document changes are detected
 */
function onDocumentChange() {
  const timer = PerformanceMonitor.startTimer('document_change_detection');
  
  try {
    Logger.logInfo('Checking for document changes...', ERROR_CATEGORIES.TRIGGER);
    
    const hasChanges = detectDocumentChanges();
    if (hasChanges) {
      Logger.logInfo('Document changes detected - processing...', ERROR_CATEGORIES.TRIGGER);
      
      const newContent = extractNewContent();
      if (newContent && newContent.length > 0) {
        notifyPipedream(newContent);
        storeCurrentDocumentState(); // Update stored state
      }
    } else {
      Logger.logDebug('No document changes detected', ERROR_CATEGORIES.TRIGGER);
    }
    
    PerformanceMonitor.endTimer('document_change_detection', timer);
    
  } catch (error) {
    PerformanceMonitor.endTimer('document_change_detection', timer);
    
    const errorResult = ErrorHandler.handleTriggerError(error, {
      function: 'onDocumentChange',
      type: 'time_based'
    });
    
    Logger.logError('Error in onDocumentChange: ' + error.toString(), ERROR_CATEGORIES.TRIGGER, errorResult);
  }
}

/**
 * Detect if the document has changed since last check
 */
function detectDocumentChanges() {
  const timer = PerformanceMonitor.startTimer('document_change_detection');
  
  try {
    const doc = DocumentApp.openById(TARGET_DOC_ID);
    const file = DriveApp.getFileById(TARGET_DOC_ID);
    
    const currentModified = file.getLastUpdated();
    const currentLength = doc.getBody().getText().length;
    
    const properties = PropertiesService.getScriptProperties();
    const lastModified = properties.getProperty('LAST_MODIFIED_DATE');
    const lastLength = parseInt(properties.getProperty('LAST_CONTENT_LENGTH') || '0');
    
    // Check if modification date or content length changed
    const modifiedChanged = lastModified !== currentModified.toISOString();
    const lengthChanged = lastLength !== currentLength;
    
    const context = {
      currentLength: currentLength,
      lastLength: lastLength,
      modifiedChanged: modifiedChanged,
      lengthChanged: lengthChanged
    };
    
    Logger.logDebug('Change detection results', ERROR_CATEGORIES.DOCUMENT_ACCESS, context);
    
    PerformanceMonitor.endTimer('document_change_detection', timer);
    
    return modifiedChanged || lengthChanged;
    
  } catch (error) {
    PerformanceMonitor.endTimer('document_change_detection', timer);
    
    const errorResult = ErrorHandler.handleDocumentError(error, TARGET_DOC_ID, {
      operation: 'detectDocumentChanges'
    });
    
    Logger.logError('Error detecting changes', ERROR_CATEGORIES.DOCUMENT_ACCESS, errorResult);
    return false;
  }
}

/**
 * Extract new content from the document
 */
function extractNewContent() {
  const timer = PerformanceMonitor.startTimer('content_extraction');
  
  try {
    const doc = DocumentApp.openById(TARGET_DOC_ID);
    const body = doc.getBody();
    const text = body.getText();
    
    const properties = PropertiesService.getScriptProperties();
    const lastLength = parseInt(properties.getProperty('LAST_CONTENT_LENGTH') || '0');
    
    // If document is longer, extract the new content
    if (text.length > lastLength) {
      const newContent = text.substring(lastLength);
      
      Logger.logInfo('New content extracted', ERROR_CATEGORIES.PARSING, {
        newContentLength: newContent.length,
        totalLength: text.length,
        lastLength: lastLength
      });
      
      // Try to extract daily sections (look for date patterns)
      const sections = extractDailySections(newContent);
      
      PerformanceMonitor.endTimer('content_extraction', timer);
      return sections;
    }
    
    PerformanceMonitor.endTimer('content_extraction', timer);
    return null;
    
  } catch (error) {
    PerformanceMonitor.endTimer('content_extraction', timer);
    
    const errorResult = ErrorHandler.handleDocumentError(error, TARGET_DOC_ID, {
      operation: 'extractNewContent'
    });
    
    Logger.logError('Error extracting new content', ERROR_CATEGORIES.DOCUMENT_ACCESS, errorResult);
    return null;
  }
}

/**
 * Extract daily sections from content based on date patterns
 */
function extractDailySections(content) {
  const timer = PerformanceMonitor.startTimer('section_extraction');
  
  try {
    // Look for common date patterns that might indicate daily sections
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,  // MM/DD/YYYY
      /\b\d{4}-\d{2}-\d{2}\b/g,         // YYYY-MM-DD
      /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi,
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi
    ];
    
    const sections = [];
    const lines = content.split('\n');
    let currentSection = '';
    let sectionDate = null;
    
    for (const line of lines) {
      // Check if line contains a date pattern
      let hasDate = false;
      for (const pattern of datePatterns) {
        if (pattern.test(line)) {
          hasDate = true;
          // If we have a current section, save it
          if (currentSection.trim()) {
            sections.push({
              date: sectionDate,
              content: currentSection.trim(),
              timestamp: new Date().toISOString()
            });
          }
          // Start new section
          currentSection = line + '\n';
          sectionDate = line.trim();
          break;
        }
      }
      
      if (!hasDate) {
        currentSection += line + '\n';
      }
    }
    
    // Add final section if exists
    if (currentSection.trim()) {
      sections.push({
        date: sectionDate,
        content: currentSection.trim(),
        timestamp: new Date().toISOString()
      });
    }
    
    Logger.logInfo('Daily sections extracted successfully', ERROR_CATEGORIES.PARSING, {
      sectionsCount: sections.length,
      contentLength: content.length,
      linesProcessed: lines.length
    });
    
    PerformanceMonitor.endTimer('section_extraction', timer);
    return sections;
    
  } catch (error) {
    PerformanceMonitor.endTimer('section_extraction', timer);
    
    const errorResult = ErrorHandler.handleParsingError(error, content, {
      operation: 'extractDailySections'
    });
    
    Logger.logError('Error extracting daily sections', ERROR_CATEGORIES.PARSING, errorResult);
    
    // Return fallback section
    return [{
      date: new Date().toISOString().split('T')[0],
      content: content,
      timestamp: new Date().toISOString(),
      fallback: true
    }];
  }
}

/**
 * Notify Pipedream of new content using GET request
 */
function notifyPipedream(contentSections) {
  const timer = PerformanceMonitor.startTimer('webhook_notification');
  
  try {
    if (!PIPEDREAM_WEBHOOK_URL || PIPEDREAM_WEBHOOK_URL === 'https://webhook.pipedream.com/YOUR_WEBHOOK_URL_HERE') {
      Logger.logWarning('Pipedream webhook URL not configured', ERROR_CATEGORIES.WEBHOOK);
      PerformanceMonitor.endTimer('webhook_notification', timer);
      return;
    }
    
    // Prepare data for GET request
    const payload = {
      type: 'document_update',
      documentId: TARGET_DOC_ID,
      documentName: 'Mula CS Daily Digest',
      timestamp: new Date().toISOString(),
      sections: contentSections
    };
    
    // Build GET URL with query parameters
    const baseUrl = PIPEDREAM_WEBHOOK_URL;
    const params = new URLSearchParams();
    params.append('type', payload.type);
    params.append('documentId', payload.documentId);
    params.append('documentName', payload.documentName);
    params.append('timestamp', payload.timestamp);
    params.append('sections', JSON.stringify(payload.sections));
    
    const fullUrl = `${baseUrl}?${params.toString()}`;
    
    Logger.logInfo('Sending GET webhook notification to Pipedream', ERROR_CATEGORIES.WEBHOOK, {
      webhookUrl: baseUrl,
      sectionsCount: contentSections ? contentSections.length : 0,
      urlLength: fullUrl.length
    });
    
    // Send GET request
    const response = UrlFetchApp.fetch(fullUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Google-Apps-Script/1.0',
      },
      // Add timeout
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode >= 200 && responseCode < 300) {
      Logger.logInfo('Pipedream notification successful', ERROR_CATEGORIES.WEBHOOK, {
        responseCode: responseCode,
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 200)
      });
      
      // Try to parse JSON response
      try {
        const responseData = JSON.parse(responseText);
        if (responseData.success) {
          Logger.logInfo('Pipedream processing confirmed', ERROR_CATEGORIES.WEBHOOK, responseData);
        } else {
          Logger.logWarning('Pipedream reported processing issue', ERROR_CATEGORIES.WEBHOOK, responseData);
        }
      } catch (parseError) {
        Logger.logDebug('Non-JSON response from Pipedream', ERROR_CATEGORIES.WEBHOOK, { responseText });
      }
      
    } else {
      Logger.logWarning('Pipedream notification failed', ERROR_CATEGORIES.WEBHOOK, {
        responseCode: responseCode,
        responseText: responseText.substring(0, 500)
      });
    }
    
    PerformanceMonitor.endTimer('webhook_notification', timer);
    
    return {
      success: responseCode >= 200 && responseCode < 300,
      responseCode: responseCode,
      responseText: responseText.substring(0, 200)
    };
    
  } catch (error) {
    PerformanceMonitor.endTimer('webhook_notification', timer);
    
    const errorResult = ErrorHandler.handleWebhookError(error, PIPEDREAM_WEBHOOK_URL, contentSections, {
      operation: 'notifyPipedream',
      method: 'GET'
    });
    
    Logger.logError('Error notifying Pipedream', ERROR_CATEGORIES.WEBHOOK, errorResult);
    
    // Try recovery if enabled
    if (errorResult.recovery && errorResult.recovery.success) {
      Logger.logInfo('Webhook recovery successful', ERROR_CATEGORIES.WEBHOOK, errorResult.recovery);
    }
    
    return {
      success: false,
      error: error.message,
      recovery: errorResult.recovery
    };
  }
}

/**
 * Test function to verify document access and permissions
 */
function testDocumentAccess() {
  try {
    const doc = DocumentApp.openById(TARGET_DOC_ID);
    const body = doc.getBody();
    const text = body.getText();
    
    console.log('Document access test successful');
    console.log('Document name: ' + doc.getName());
    console.log('Document length: ' + text.length + ' characters');
    
    // Get last modified date using Drive API
    let lastModified = null;
    try {
      const file = DriveApp.getFileById(TARGET_DOC_ID);
      lastModified = file.getLastUpdated();
    } catch (driveError) {
      console.log('Could not get last modified date: ' + driveError.toString());
    }
    
    return {
      success: true,
      documentName: doc.getName(),
      documentLength: text.length,
      lastModified: lastModified
    };
    
  } catch (error) {
    console.log('Document access test failed: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Test the change detection system
 */
function testChangeDetection() {
  try {
    console.log('Testing change detection system...');
    
    // Store current state
    storeCurrentDocumentState();
    
    // Test detection
    const hasChanges = detectDocumentChanges();
    console.log('Change detection result: ' + hasChanges);
    
    // Test content extraction
    const newContent = extractNewContent();
    if (newContent) {
      console.log('Content extraction successful - ' + newContent.length + ' sections');
    } else {
      console.log('No new content detected');
    }
    
    return { success: true, hasChanges: hasChanges, contentSections: newContent };
    
  } catch (error) {
    console.log('Error testing change detection: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get project configuration status
 */
function getProjectStatus() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const triggers = ScriptApp.getProjectTriggers();
    
    const status = {
      initialized: properties.getProperty('PROJECT_INITIALIZED') === 'true',
      lastModified: properties.getProperty('LAST_MODIFIED'),
      webhookUrl: properties.getProperty('WEBHOOK_URL'),
      targetDocId: TARGET_DOC_ID,
      triggersCount: triggers.length,
      lastContentLength: properties.getProperty('LAST_CONTENT_LENGTH'),
      lastCheckTime: properties.getProperty('LAST_CHECK_TIME')
    };
    
    console.log('Project status retrieved: ' + JSON.stringify(status));
    return status;
    
  } catch (error) {
    console.log('Error getting project status: ' + error.toString());
    return { error: error.toString() };
  }
}

/**
 * Enhanced webhook endpoint for testing and receiving data from Pipedream
 */
function doPost(e) {
  try {
    console.log('POST webhook received');
    
    // Authenticate request
    const authResult = authenticateRequest(e, false); // Don't require API key for basic webhooks
    if (!authResult.authenticated) {
      console.log('Authentication failed: ' + authResult.error);
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: authResult.error,
          code: authResult.code,
          timestamp: new Date().toISOString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const postData = e.postData;
    let requestData = {};
    
    if (postData && postData.contents) {
      try {
        requestData = JSON.parse(postData.contents);
        console.log('Parsed POST data: ' + JSON.stringify(requestData));
      } catch (parseError) {
        console.log('Could not parse POST data: ' + parseError.toString());
        requestData = { rawData: postData.contents };
      }
    }
    
    // Handle different webhook types
    const response = handleWebhookRequest(requestData, 'POST');
    response.authentication = authResult.checks;
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.log('POST webhook error: ' + error.toString());
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString(),
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Enhanced webhook endpoint for status checks and GET requests
 */
function doGet(e) {
  try {
    console.log('GET webhook received');
    
    // Authenticate request (API key required for sensitive actions)
    const params = e.parameter || {};
    const requireApiKey = params.action === 'security' || params.action === 'logs';
    const authResult = authenticateRequest(e, requireApiKey);
    
    if (!authResult.authenticated) {
      console.log('Authentication failed: ' + authResult.error);
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: authResult.error,
          code: authResult.code,
          timestamp: new Date().toISOString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    console.log('GET parameters: ' + JSON.stringify(params));
    
    // Handle different GET request types
    if (params.action) {
      return handleWebhookAction(params, authResult.checks);
    }
    
    // Default: return project status
    const status = getProjectStatus();
    const response = {
      message: 'Weekly Publisher Digest Assistant - Google Apps Script',
      status: status,
      timestamp: new Date().toISOString(),
      authentication: authResult.checks,
      endpoints: {
        status: '?action=status',
        test: '?action=test',
        trigger: '?action=trigger_test',
        health: '?action=health',
        security: '?action=security (requires API key)',
        logs: '?action=logs (requires API key)'
      }
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.log('GET webhook error: ' + error.toString());
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString(),
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle different webhook request types
 */
function handleWebhookRequest(data, method) {
  try {
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      method: method,
      received: data
    };
    
    // Handle specific webhook types
    if (data.type === 'test') {
      response.message = 'Webhook test successful';
      response.documentAccess = testDocumentAccess();
    } else if (data.type === 'trigger_change_detection') {
      response.message = 'Change detection triggered';
      response.result = testChangeDetection();
    } else if (data.type === 'health_check') {
      response.message = 'Health check successful';
      response.health = getHealthStatus();
    } else {
      response.message = 'Generic webhook received';
    }
    
    return response;
    
  } catch (error) {
    console.log('Error handling webhook request: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Handle GET webhook actions
 */
function handleWebhookAction(params, authChecks = {}) {
  try {
    let response = {
      success: true,
      action: params.action,
      timestamp: new Date().toISOString(),
      authentication: authChecks
    };
    
    switch (params.action) {
      case 'status':
        response.data = getProjectStatus();
        break;
        
      case 'test':
        response.data = testDocumentAccess();
        break;
        
      case 'trigger_test':
        response.data = testChangeDetection();
        break;
        
      case 'health':
        response.data = getHealthStatus();
        break;
        
      case 'security':
        response.data = getSecurityStatus();
        break;
        
      case 'logs':
        response.data = {
          recentAccessLogs: getSecurityStatus().recentAccessLogs || [],
          message: 'Recent access logs retrieved'
        };
        break;
        
      case 'init_security':
        response.data = initializeSecurity();
        break;
        
      case 'rotate_keys':
        response.data = rotateSecurityKeys();
        break;
        
      case 'toggle_security':
        const enabled = params.enabled === 'true';
        response.data = toggleSecurity(enabled);
        break;
        
      case 'disable_auth':
        response.data = disableAuthentication();
        break;
        
      case 'enable_auth':
        response.data = enableAuthentication();
        break;
        
      case 'error_logs':
        response.data = {
          errorLogs: Logger.getErrorLogs(),
          debugLogs: Logger.getDebugLogs(),
          stats: Logger.getLoggingStats()
        };
        break;
        
      case 'performance':
        response.data = {
          metrics: PerformanceMonitor.getPerformanceMetrics(),
          healthCheck: HealthChecker.performHealthCheck()
        };
        break;
        
      case 'clear_logs':
        response.data = Logger.clearLogs();
        break;
        
      case 'comprehensive_health':
        response.data = HealthChecker.performHealthCheck();
        break;
        
      default:
        response.success = false;
        response.error = 'Unknown action: ' + params.action;
        response.availableActions = [
          'status', 'test', 'trigger_test', 'health', 'security', 
          'logs', 'init_security', 'rotate_keys', 'toggle_security',
          'disable_auth', 'enable_auth', 'error_logs', 'performance', 
          'clear_logs', 'comprehensive_health'
        ];
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.log('Error handling webhook action: ' + error.toString());
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get system health status
 */
function getHealthStatus() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const triggers = ScriptApp.getProjectTriggers();
    
    // Test document access
    let documentHealth = false;
    let documentError = null;
    try {
      const doc = DocumentApp.openById(TARGET_DOC_ID);
      const text = doc.getBody().getText();
      documentHealth = text.length > 0;
    } catch (error) {
      documentError = error.toString();
    }
    
    // Test webhook URL configuration
    const webhookConfigured = PIPEDREAM_WEBHOOK_URL !== 'https://webhook.pipedream.com/YOUR_WEBHOOK_URL_HERE';
    
    return {
      overall: documentHealth && triggers.length > 0,
      components: {
        documentAccess: {
          healthy: documentHealth,
          error: documentError
        },
        triggers: {
          healthy: triggers.length > 0,
          count: triggers.length
        },
        webhookConfiguration: {
          healthy: webhookConfigured,
          configured: webhookConfigured
        },
        properties: {
          healthy: properties.getProperty('PROJECT_INITIALIZED') === 'true',
          lastCheck: properties.getProperty('LAST_CHECK_TIME'),
          lastModified: properties.getProperty('LAST_MODIFIED_DATE')
        }
      }
    };
    
  } catch (error) {
    console.log('Error getting health status: ' + error.toString());
    return {
      overall: false,
      error: error.toString()
    };
  }
}

/**
 * Test webhook notification to Pipedream
 */
function testWebhookNotification() {
  try {
    console.log('Testing webhook notification to Pipedream...');
    
    const testPayload = [{
      date: new Date().toISOString().split('T')[0],
      content: 'Test notification from Google Apps Script',
      timestamp: new Date().toISOString()
    }];
    
    notifyPipedream(testPayload);
    
    return {
      success: true,
      message: 'Test webhook notification sent',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.log('Error testing webhook notification: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Setup webhook for Pipedream integration
 */
function setupPipedreamWebhook(webhookUrl) {
  try {
    console.log('Setting up Pipedream webhook: ' + webhookUrl);
    
    // Validate webhook URL
    if (!webhookUrl || !webhookUrl.startsWith('https://')) {
      throw new Error('Invalid webhook URL provided');
    }
    
    // Store webhook URL
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty('WEBHOOK_URL', webhookUrl);
    
    // Test the webhook
    const testResult = testWebhookNotification();
    
    return {
      success: true,
      message: 'Pipedream webhook configured successfully',
      webhookUrl: webhookUrl,
      testResult: testResult
    };
    
  } catch (error) {
    console.log('Error setting up Pipedream webhook: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Simple function to toggle authentication off
 * Run this function from the Google Apps Script editor to disable authentication
 */
function disableAuthentication() {
  const result = toggleSecurity(false);
  console.log('Authentication disabled: ' + JSON.stringify(result));
  return result;
}

/**
 * Simple function to toggle authentication on
 * Run this function from the Google Apps Script editor to enable authentication
 */
function enableAuthentication() {
  const result = toggleSecurity(true);
  console.log('Authentication enabled: ' + JSON.stringify(result));
  return result;
}

/**
 * Check current security status
 */
function checkSecurityStatus() {
  const status = getSecurityStatus();
  console.log('Security status: ' + JSON.stringify(status));
  return status;
} 