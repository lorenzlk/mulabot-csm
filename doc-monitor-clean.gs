/**
 * Weekly Publisher Digest Assistant - Google Apps Script (Clean Version)
 * Simplified document monitoring and webhook service
 * No external dependencies - just core Google Apps Script APIs
 */

// Configuration constants
const TARGET_DOC_ID = '1DiRcu3pLpCXuYlJ7r19tzsHxI89YWw2BfNFkvOdchsM';
const PIPEDREAM_WEBHOOK_URL = 'https://d8a85de8638e.ngrok-free.app/webhook';

/**
 * Initialize the project and set up necessary configurations
 */
function initializeProject() {
  try {
    console.log('Initializing Weekly Publisher Digest Assistant...');
    
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
      message: 'Project initialized'
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
  try {
    console.log('Checking for document changes...');
    
    const hasChanges = detectDocumentChanges();
    if (hasChanges) {
      console.log('Document changes detected - processing...');
      
      const content = extractNewContent();
      if (content && content.length > 0) {
        notifyPipedream(content);
        storeCurrentDocumentState(); // Update stored state
      }
    } else {
      console.log('No document changes detected');
    }
    
  } catch (error) {
    console.log('Error in onDocumentChange: ' + error.toString());
  }
}

/**
 * Manual function to send current document content (for testing)
 */
function sendCurrentDocumentContent() {
  try {
    console.log('Manually sending current document content...');
    
    const content = extractNewContent();
    if (content && content.length > 0) {
      const result = notifyPipedream(content);
      console.log('Manual send result: ' + JSON.stringify(result));
      return result;
    } else {
      console.log('No content extracted');
      return { success: false, error: 'No content extracted' };
    }
    
  } catch (error) {
    console.log('Error sending document content: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Detect if the document has changed since last check
 */
function detectDocumentChanges() {
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
    
    console.log('Change detection - Modified changed: ' + modifiedChanged + ', Length changed: ' + lengthChanged);
    
    return modifiedChanged || lengthChanged;
    
  } catch (error) {
    console.log('Error detecting changes: ' + error.toString());
    return false;
  }
}

/**
 * Extract new content from the document
 */
function extractNewContent() {
  try {
    const doc = DocumentApp.openById(TARGET_DOC_ID);
    const body = doc.getBody();
    const text = body.getText();
    
    const properties = PropertiesService.getScriptProperties();
    const lastLength = parseInt(properties.getProperty('LAST_CONTENT_LENGTH') || '0');
    
    // Always send full document content for Slack bot access
    console.log('Extracting full document content for analysis - Length: ' + text.length);
    
    // Extract the full document content and parse it into sections
    const sections = extractFullDocumentSections(text);
    
    return sections;
    
  } catch (error) {
    console.log('Error extracting content: ' + error.toString());
    return null;
  }
}

/**
 * Extract all document content and parse into meaningful sections
 */
function extractFullDocumentSections(content) {
  try {
    if (!content || content.length < 10) {
      return [];
    }
    
    console.log('Parsing document content - Total length: ' + content.length);
    
    // Look for daily digest patterns
    const sections = [];
    
    // Split content by common delimiters
    let contentBlocks = [];
    
    // First try to split by daily digest patterns
    if (content.includes('Daily Email Digest')) {
      contentBlocks = content.split(/Daily Email Digest[^\n]*\n/);
    } else {
      // Fall back to splitting by dates or large blocks
      contentBlocks = content.split(/\n\s*\n/);
    }
    
    for (let i = 0; i < contentBlocks.length; i++) {
      const block = contentBlocks[i].trim();
      if (block.length > 50) { // Only include substantial content blocks
        
        // Try to extract date from the block
        let dateFound = null;
        const dateMatches = block.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*(\w+\s+\d+,?\s+\d{4})|(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{4})/i);
        
        if (dateMatches) {
          dateFound = dateMatches[1] || dateMatches[2] || dateMatches[3];
        }
        
        sections.push({
          date: dateFound || new Date().toISOString().split('T')[0],
          content: block,
          timestamp: new Date().toISOString(),
          section: i + 1
        });
      }
    }
    
    // If no meaningful sections found, send the entire content as one section
    if (sections.length === 0) {
      sections.push({
        date: new Date().toISOString().split('T')[0],
        content: content,
        timestamp: new Date().toISOString(),
        section: 1
      });
    }
    
    console.log('✅ Extracted ' + sections.length + ' content sections from document');
    
    // Log first section preview for debugging
    if (sections.length > 0) {
      console.log('First section preview: ' + sections[0].content.substring(0, 200) + '...');
    }
    
    return sections;
    
  } catch (error) {
    console.log('Error parsing document sections: ' + error.toString());
    return [{
      date: new Date().toISOString().split('T')[0],
      content: content,
      timestamp: new Date().toISOString()
    }];
  }
}

/**
 * Send content to webhook (FIXED VERSION - no dependencies)
 */
function notifyPipedream(contentSections) {
  try {
    const webhookUrl = PIPEDREAM_WEBHOOK_URL;
    
    if (!webhookUrl || webhookUrl.includes('YOUR_WEBHOOK_URL_HERE')) {
      console.log('Webhook URL not configured');
      return { success: false, error: 'Webhook URL not configured' };
    }
    
    // Prepare payload for POST request
    const payload = {
      type: 'document_update',
      documentId: TARGET_DOC_ID,
      documentName: 'Mula CS Daily Digest',
      timestamp: new Date().toISOString(),
      sections: contentSections || []
    };
    
    console.log('Sending webhook notification - Sections: ' + payload.sections.length);
    
    // Send POST request (simple and reliable)
    const response = UrlFetchApp.fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Google-Apps-Script/1.0'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('Webhook response - Status: ' + responseCode);
    
    if (responseCode >= 200 && responseCode < 300) {
      console.log('✅ Webhook notification successful');
      return {
        success: true,
        responseCode: responseCode,
        responseText: responseText.substring(0, 200)
      };
    } else {
      console.log('❌ Webhook notification failed: ' + responseCode);
      return {
        success: false,
        responseCode: responseCode,
        responseText: responseText.substring(0, 200)
      };
    }
    
  } catch (error) {
    console.log('❌ Webhook error: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test document access
 */
function testDocumentAccess() {
  try {
    console.log('Testing document access...');
    
    const doc = DocumentApp.openById(TARGET_DOC_ID);
    const docName = doc.getName();
    const body = doc.getBody();
    const text = body.getText();
    
    const result = {
      success: true,
      documentName: docName,
      contentLength: text.length,
      sampleContent: text.substring(0, 100),
      timestamp: new Date().toISOString()
    };
    
    console.log('Document access test successful - Name: ' + docName + ', Length: ' + text.length);
    
    return result;
    
  } catch (error) {
    console.log('Document access test failed: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test change detection system
 */
function testChangeDetection() {
  try {
    console.log('Testing change detection system...');
    
    const hasChanges = detectDocumentChanges();
    const newContent = extractNewContent();
    
    const result = {
      success: true,
      changesDetected: hasChanges,
      newContent: newContent,
      timestamp: new Date().toISOString()
    };
    
    console.log('Change detection test completed - Changes: ' + hasChanges);
    
    return result;
    
  } catch (error) {
    console.log('Change detection test failed: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test webhook notification
 */
function testWebhookNotification() {
  try {
    console.log('Testing webhook notification...');
    
    const testPayload = [{
      date: new Date().toISOString().split('T')[0],
      content: 'Test notification from Google Apps Script - CLEAN VERSION',
      timestamp: new Date().toISOString()
    }];
    
    const result = notifyPipedream(testPayload);
    
    console.log('Webhook test completed');
    
    return {
      success: true,
      message: 'Webhook test completed',
      result: result,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.log('Webhook test failed: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get project status
 */
function getProjectStatus() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const triggers = ScriptApp.getProjectTriggers();
    
    return {
      initialized: properties.getProperty('PROJECT_INITIALIZED') === 'true',
      webhookUrl: properties.getProperty('WEBHOOK_URL'),
      lastCheck: properties.getProperty('LAST_CHECK_TIME'),
      lastModified: properties.getProperty('LAST_MODIFIED_DATE'),
      contentLength: properties.getProperty('LAST_CONTENT_LENGTH'),
      triggersActive: triggers.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.log('Error getting project status: ' + error.toString());
    return {
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get health status
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
 * Main webhook handler for GET requests
 */
function doGet(e) {
  try {
    console.log('GET webhook received');
    
    const params = e.parameter || {};
    console.log('GET parameters: ' + JSON.stringify(params));
    
    // Handle different GET request types
    if (params.action) {
      return handleWebhookAction(params);
    }
    
    // Default: return project status
    const status = getProjectStatus();
    const response = {
      message: 'Weekly Publisher Digest Assistant - Google Apps Script (Clean Version)',
      status: status,
      timestamp: new Date().toISOString(),
      endpoints: {
        status: '?action=status',
        test: '?action=test',
        trigger: '?action=trigger_test',
        health: '?action=health'
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
 * Main webhook handler for POST requests
 */
function doPost(e) {
  try {
    console.log('POST webhook received');
    
    let data = {};
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      console.log('Error parsing POST data: ' + parseError.toString());
      data = { type: 'unknown' };
    }
    
    console.log('POST data: ' + JSON.stringify(data));
    
    const response = handleWebhookRequest(data, 'POST');
    
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
function handleWebhookAction(params) {
  try {
    let response = {
      success: true,
      action: params.action,
      timestamp: new Date().toISOString()
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
        
      case 'webhook_test':
        response.data = testWebhookNotification();
        break;
        
      case 'send_content':
        response.data = sendCurrentDocumentContent();
        break;
        
      default:
        response.data = {
          message: 'Unknown action: ' + params.action,
          availableActions: ['status', 'test', 'trigger_test', 'health', 'webhook_test', 'send_content']
        };
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