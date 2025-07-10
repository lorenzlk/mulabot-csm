/**
 * Enhanced Error Handling and Logging System
 * Weekly Publisher Digest Assistant - Google Apps Script
 */

// Log levels for different types of messages
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// Error categories for better organization
const ERROR_CATEGORIES = {
  DOCUMENT_ACCESS: 'DOCUMENT_ACCESS',
  WEBHOOK: 'WEBHOOK',
  AUTHENTICATION: 'AUTHENTICATION',
  TRIGGER: 'TRIGGER',
  PARSING: 'PARSING',
  NETWORK: 'NETWORK',
  SYSTEM: 'SYSTEM'
};

// Maximum number of error logs to store
const MAX_ERROR_LOGS = 50;
const MAX_DEBUG_LOGS = 20;

/**
 * Enhanced logger with different log levels
 */
class Logger {
  
  /**
   * Log error message with context
   */
  static logError(message, category = ERROR_CATEGORIES.SYSTEM, context = {}) {
    const logEntry = this.createLogEntry(LOG_LEVELS.ERROR, message, category, context);
    
    // Always log to Google Apps Script console
    console.error(`[${category}] ${message}`, context);
    
    // Store in persistent storage
    this.storeErrorLog(logEntry);
    
    // Send to monitoring system if configured
    this.sendToMonitoring(logEntry);
    
    return logEntry;
  }
  
  /**
   * Log warning message
   */
  static logWarning(message, category = ERROR_CATEGORIES.SYSTEM, context = {}) {
    const logEntry = this.createLogEntry(LOG_LEVELS.WARN, message, category, context);
    
    console.warn(`[${category}] ${message}`, context);
    this.storeDebugLog(logEntry);
    
    return logEntry;
  }
  
  /**
   * Log info message
   */
  static logInfo(message, category = ERROR_CATEGORIES.SYSTEM, context = {}) {
    const logEntry = this.createLogEntry(LOG_LEVELS.INFO, message, category, context);
    
    console.info(`[${category}] ${message}`, context);
    this.storeDebugLog(logEntry);
    
    return logEntry;
  }
  
  /**
   * Log debug message
   */
  static logDebug(message, category = ERROR_CATEGORIES.SYSTEM, context = {}) {
    const logEntry = this.createLogEntry(LOG_LEVELS.DEBUG, message, category, context);
    
    console.log(`[${category}] ${message}`, context);
    this.storeDebugLog(logEntry);
    
    return logEntry;
  }
  
  /**
   * Create structured log entry
   */
  static createLogEntry(level, message, category, context) {
    return {
      timestamp: new Date().toISOString(),
      level: level,
      category: category,
      message: message,
      context: context,
      stackTrace: this.getStackTrace(),
      sessionId: this.getSessionId()
    };
  }
  
  /**
   * Store error log in persistent storage
   */
  static storeErrorLog(logEntry) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const existingLogs = JSON.parse(properties.getProperty('ERROR_LOGS') || '[]');
      
      // Add new log at the beginning
      existingLogs.unshift(logEntry);
      
      // Keep only the latest MAX_ERROR_LOGS
      if (existingLogs.length > MAX_ERROR_LOGS) {
        existingLogs.splice(MAX_ERROR_LOGS);
      }
      
      properties.setProperty('ERROR_LOGS', JSON.stringify(existingLogs));
      properties.setProperty('LAST_ERROR_TIME', new Date().toISOString());
      
      // Update error counter
      const errorCount = parseInt(properties.getProperty('ERROR_COUNT') || '0') + 1;
      properties.setProperty('ERROR_COUNT', errorCount.toString());
      
    } catch (error) {
      console.error('Failed to store error log:', error);
    }
  }
  
  /**
   * Store debug log in persistent storage
   */
  static storeDebugLog(logEntry) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const existingLogs = JSON.parse(properties.getProperty('DEBUG_LOGS') || '[]');
      
      // Add new log at the beginning
      existingLogs.unshift(logEntry);
      
      // Keep only the latest MAX_DEBUG_LOGS
      if (existingLogs.length > MAX_DEBUG_LOGS) {
        existingLogs.splice(MAX_DEBUG_LOGS);
      }
      
      properties.setProperty('DEBUG_LOGS', JSON.stringify(existingLogs));
      
    } catch (error) {
      console.error('Failed to store debug log:', error);
    }
  }
  
  /**
   * Send critical errors to monitoring system
   */
  static sendToMonitoring(logEntry) {
    try {
      if (logEntry.level === LOG_LEVELS.ERROR) {
        // Send to external monitoring service (implement as needed)
        this.notifyErrorToWebhook(logEntry);
      }
    } catch (error) {
      console.error('Failed to send error to monitoring:', error);
    }
  }
  
  /**
   * Notify error to webhook endpoint
   */
  static notifyErrorToWebhook(logEntry) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const webhookUrl = properties.getProperty('ERROR_WEBHOOK_URL');
      
      if (!webhookUrl) {
        return; // No error webhook configured
      }
      
      const payload = {
        type: 'error_alert',
        timestamp: new Date().toISOString(),
        source: 'google-apps-script',
        error: logEntry
      };
      
      const response = UrlFetchApp.fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload)
      });
      
      if (response.getResponseCode() !== 200) {
        console.error('Failed to send error notification:', response.getContentText());
      }
      
    } catch (error) {
      console.error('Error sending webhook notification:', error);
    }
  }
  
  /**
   * Get current stack trace
   */
  static getStackTrace() {
    try {
      throw new Error();
    } catch (error) {
      return error.stack || 'Stack trace not available';
    }
  }
  
  /**
   * Get or create session ID
   */
  static getSessionId() {
    try {
      const properties = PropertiesService.getScriptProperties();
      let sessionId = properties.getProperty('SESSION_ID');
      
      if (!sessionId) {
        sessionId = 'session_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 9);
        properties.setProperty('SESSION_ID', sessionId);
      }
      
      return sessionId;
    } catch (error) {
      return 'session_unknown';
    }
  }
  
  /**
   * Get error logs
   */
  static getErrorLogs() {
    try {
      const properties = PropertiesService.getScriptProperties();
      return JSON.parse(properties.getProperty('ERROR_LOGS') || '[]');
    } catch (error) {
      console.error('Failed to get error logs:', error);
      return [];
    }
  }
  
  /**
   * Get debug logs
   */
  static getDebugLogs() {
    try {
      const properties = PropertiesService.getScriptProperties();
      return JSON.parse(properties.getProperty('DEBUG_LOGS') || '[]');
    } catch (error) {
      console.error('Failed to get debug logs:', error);
      return [];
    }
  }
  
  /**
   * Clear all logs
   */
  static clearLogs() {
    try {
      const properties = PropertiesService.getScriptProperties();
      properties.deleteProperty('ERROR_LOGS');
      properties.deleteProperty('DEBUG_LOGS');
      properties.setProperty('ERROR_COUNT', '0');
      properties.setProperty('LAST_ERROR_TIME', '');
      
      console.log('All logs cleared');
      return { success: true, message: 'Logs cleared' };
    } catch (error) {
      console.error('Failed to clear logs:', error);
      return { success: false, error: error.toString() };
    }
  }
  
  /**
   * Get logging statistics
   */
  static getLoggingStats() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const errorLogs = JSON.parse(properties.getProperty('ERROR_LOGS') || '[]');
      const debugLogs = JSON.parse(properties.getProperty('DEBUG_LOGS') || '[]');
      
      return {
        errorCount: parseInt(properties.getProperty('ERROR_COUNT') || '0'),
        currentErrorLogs: errorLogs.length,
        currentDebugLogs: debugLogs.length,
        lastErrorTime: properties.getProperty('LAST_ERROR_TIME'),
        sessionId: properties.getProperty('SESSION_ID')
      };
    } catch (error) {
      console.error('Failed to get logging stats:', error);
      return { error: error.toString() };
    }
  }
}

/**
 * Enhanced error handler with recovery mechanisms
 */
class ErrorHandler {
  
  /**
   * Handle document access errors
   */
  static handleDocumentError(error, documentId, context = {}) {
    const errorInfo = {
      documentId: documentId,
      errorType: error.name,
      errorMessage: error.message,
      context: context
    };
    
    Logger.logError('Document access error: ' + error.message, ERROR_CATEGORIES.DOCUMENT_ACCESS, errorInfo);
    
    // Attempt recovery
    const recovery = this.attemptDocumentRecovery(documentId, error);
    
    return {
      success: false,
      error: error.message,
      category: ERROR_CATEGORIES.DOCUMENT_ACCESS,
      recovery: recovery,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Handle webhook errors
   */
  static handleWebhookError(error, webhookUrl, payload, context = {}) {
    const errorInfo = {
      webhookUrl: webhookUrl,
      payloadSize: payload ? JSON.stringify(payload).length : 0,
      errorType: error.name,
      errorMessage: error.message,
      context: context
    };
    
    Logger.logError('Webhook error: ' + error.message, ERROR_CATEGORIES.WEBHOOK, errorInfo);
    
    // Attempt recovery
    const recovery = this.attemptWebhookRecovery(webhookUrl, payload, error);
    
    return {
      success: false,
      error: error.message,
      category: ERROR_CATEGORIES.WEBHOOK,
      recovery: recovery,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Handle authentication errors
   */
  static handleAuthError(error, requestInfo, context = {}) {
    const errorInfo = {
      origin: requestInfo.origin,
      userAgent: requestInfo.userAgent,
      hasApiKey: requestInfo.hasApiKey,
      errorType: error.name,
      errorMessage: error.message,
      context: context
    };
    
    Logger.logError('Authentication error: ' + error.message, ERROR_CATEGORIES.AUTHENTICATION, errorInfo);
    
    return {
      success: false,
      error: error.message,
      category: ERROR_CATEGORIES.AUTHENTICATION,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Handle trigger errors
   */
  static handleTriggerError(error, triggerInfo, context = {}) {
    const errorInfo = {
      triggerFunction: triggerInfo.function,
      triggerType: triggerInfo.type,
      errorType: error.name,
      errorMessage: error.message,
      context: context
    };
    
    Logger.logError('Trigger error: ' + error.message, ERROR_CATEGORIES.TRIGGER, errorInfo);
    
    // Attempt recovery
    const recovery = this.attemptTriggerRecovery(triggerInfo, error);
    
    return {
      success: false,
      error: error.message,
      category: ERROR_CATEGORIES.TRIGGER,
      recovery: recovery,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Handle parsing errors
   */
  static handleParsingError(error, content, context = {}) {
    const errorInfo = {
      contentLength: content ? content.length : 0,
      contentPreview: content ? content.substring(0, 100) + '...' : '',
      errorType: error.name,
      errorMessage: error.message,
      context: context
    };
    
    Logger.logError('Parsing error: ' + error.message, ERROR_CATEGORIES.PARSING, errorInfo);
    
    return {
      success: false,
      error: error.message,
      category: ERROR_CATEGORIES.PARSING,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Handle network errors
   */
  static handleNetworkError(error, url, context = {}) {
    const errorInfo = {
      url: url,
      errorType: error.name,
      errorMessage: error.message,
      context: context
    };
    
    Logger.logError('Network error: ' + error.message, ERROR_CATEGORIES.NETWORK, errorInfo);
    
    return {
      success: false,
      error: error.message,
      category: ERROR_CATEGORIES.NETWORK,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Attempt document access recovery
   */
  static attemptDocumentRecovery(documentId, error) {
    try {
      Logger.logInfo('Attempting document access recovery', ERROR_CATEGORIES.DOCUMENT_ACCESS, { documentId });
      
      // Wait and retry
      Utilities.sleep(2000);
      
      const doc = DocumentApp.openById(documentId);
      const text = doc.getBody().getText();
      
      if (text.length > 0) {
        Logger.logInfo('Document recovery successful', ERROR_CATEGORIES.DOCUMENT_ACCESS, { documentId });
        return { success: true, method: 'retry_after_delay' };
      }
      
      return { success: false, method: 'retry_after_delay' };
      
    } catch (recoveryError) {
      Logger.logError('Document recovery failed: ' + recoveryError.message, ERROR_CATEGORIES.DOCUMENT_ACCESS, { documentId });
      return { success: false, error: recoveryError.message };
    }
  }
  
  /**
   * Attempt webhook recovery
   */
  static attemptWebhookRecovery(webhookUrl, payload, error) {
    try {
      Logger.logInfo('Attempting webhook recovery', ERROR_CATEGORIES.WEBHOOK, { webhookUrl });
      
      // Wait and retry with exponential backoff
      Utilities.sleep(5000);
      
      const response = UrlFetchApp.fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload)
      });
      
      if (response.getResponseCode() === 200) {
        Logger.logInfo('Webhook recovery successful', ERROR_CATEGORIES.WEBHOOK, { webhookUrl });
        return { success: true, method: 'retry_with_backoff' };
      }
      
      return { success: false, method: 'retry_with_backoff', responseCode: response.getResponseCode() };
      
    } catch (recoveryError) {
      Logger.logError('Webhook recovery failed: ' + recoveryError.message, ERROR_CATEGORIES.WEBHOOK, { webhookUrl });
      return { success: false, error: recoveryError.message };
    }
  }
  
  /**
   * Attempt trigger recovery
   */
  static attemptTriggerRecovery(triggerInfo, error) {
    try {
      Logger.logInfo('Attempting trigger recovery', ERROR_CATEGORIES.TRIGGER, triggerInfo);
      
      // Delete and recreate trigger
      const triggers = ScriptApp.getProjectTriggers();
      triggers.forEach(trigger => {
        if (trigger.getHandlerFunction() === triggerInfo.function) {
          ScriptApp.deleteTrigger(trigger);
        }
      });
      
      // Recreate trigger
      const newTrigger = ScriptApp.newTrigger(triggerInfo.function)
        .timeBased()
        .everyMinutes(5)
        .create();
      
      Logger.logInfo('Trigger recovery successful', ERROR_CATEGORIES.TRIGGER, { newTriggerId: newTrigger.getUniqueId() });
      return { success: true, method: 'recreate_trigger', newTriggerId: newTrigger.getUniqueId() };
      
    } catch (recoveryError) {
      Logger.logError('Trigger recovery failed: ' + recoveryError.message, ERROR_CATEGORIES.TRIGGER, triggerInfo);
      return { success: false, error: recoveryError.message };
    }
  }
  
  /**
   * Get error recovery suggestions
   */
  static getRecoverySuggestions(error, category) {
    const suggestions = [];
    
    switch (category) {
      case ERROR_CATEGORIES.DOCUMENT_ACCESS:
        suggestions.push('Check document permissions');
        suggestions.push('Verify document ID is correct');
        suggestions.push('Ensure document is not deleted');
        break;
        
      case ERROR_CATEGORIES.WEBHOOK:
        suggestions.push('Check webhook URL is valid');
        suggestions.push('Verify network connectivity');
        suggestions.push('Check webhook endpoint is responding');
        break;
        
      case ERROR_CATEGORIES.AUTHENTICATION:
        suggestions.push('Check API key is valid');
        suggestions.push('Verify request origin is allowed');
        suggestions.push('Check webhook signature');
        break;
        
      case ERROR_CATEGORIES.TRIGGER:
        suggestions.push('Check trigger permissions');
        suggestions.push('Verify trigger function exists');
        suggestions.push('Check quota limits');
        break;
        
      case ERROR_CATEGORIES.PARSING:
        suggestions.push('Check content format');
        suggestions.push('Verify parsing logic');
        suggestions.push('Check for special characters');
        break;
        
      case ERROR_CATEGORIES.NETWORK:
        suggestions.push('Check internet connectivity');
        suggestions.push('Verify URL is accessible');
        suggestions.push('Check for rate limiting');
        break;
        
      default:
        suggestions.push('Check system logs');
        suggestions.push('Verify configuration');
        suggestions.push('Contact support if issue persists');
    }
    
    return suggestions;
  }
}

/**
 * Performance monitoring utilities
 */
class PerformanceMonitor {
  
  /**
   * Start performance timing
   */
  static startTimer(label) {
    const start = new Date().getTime();
    Logger.logDebug(`Performance timer started: ${label}`, ERROR_CATEGORIES.SYSTEM, { label, start });
    return start;
  }
  
  /**
   * End performance timing
   */
  static endTimer(label, start) {
    const end = new Date().getTime();
    const duration = end - start;
    
    Logger.logInfo(`Performance timer ended: ${label} (${duration}ms)`, ERROR_CATEGORIES.SYSTEM, { label, duration });
    
    // Store performance metrics
    this.storePerformanceMetric(label, duration);
    
    return duration;
  }
  
  /**
   * Store performance metric
   */
  static storePerformanceMetric(label, duration) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const metrics = JSON.parse(properties.getProperty('PERFORMANCE_METRICS') || '{}');
      
      if (!metrics[label]) {
        metrics[label] = { count: 0, totalTime: 0, avgTime: 0, maxTime: 0, minTime: Infinity };
      }
      
      metrics[label].count++;
      metrics[label].totalTime += duration;
      metrics[label].avgTime = metrics[label].totalTime / metrics[label].count;
      metrics[label].maxTime = Math.max(metrics[label].maxTime, duration);
      metrics[label].minTime = Math.min(metrics[label].minTime, duration);
      
      properties.setProperty('PERFORMANCE_METRICS', JSON.stringify(metrics));
      
    } catch (error) {
      console.error('Failed to store performance metric:', error);
    }
  }
  
  /**
   * Get performance metrics
   */
  static getPerformanceMetrics() {
    try {
      const properties = PropertiesService.getScriptProperties();
      return JSON.parse(properties.getProperty('PERFORMANCE_METRICS') || '{}');
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {};
    }
  }
}

/**
 * Health check utilities
 */
class HealthChecker {
  
  /**
   * Perform comprehensive health check
   */
  static performHealthCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      overall: true,
      checks: {},
      metrics: {}
    };
    
    // Check document access
    results.checks.documentAccess = this.checkDocumentAccess();
    
    // Check webhook connectivity
    results.checks.webhookConnectivity = this.checkWebhookConnectivity();
    
    // Check triggers
    results.checks.triggers = this.checkTriggers();
    
    // Check error rates
    results.checks.errorRates = this.checkErrorRates();
    
    // Check performance
    results.metrics.performance = PerformanceMonitor.getPerformanceMetrics();
    results.metrics.logging = Logger.getLoggingStats();
    
    // Calculate overall health
    results.overall = Object.values(results.checks).every(check => check.healthy);
    
    return results;
  }
  
  /**
   * Check document access health
   */
  static checkDocumentAccess() {
    try {
      const timer = PerformanceMonitor.startTimer('document_access_check');
      
      const doc = DocumentApp.openById(TARGET_DOC_ID);
      const text = doc.getBody().getText();
      
      PerformanceMonitor.endTimer('document_access_check', timer);
      
      return {
        healthy: true,
        documentId: TARGET_DOC_ID,
        contentLength: text.length,
        accessible: true
      };
      
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        documentId: TARGET_DOC_ID
      };
    }
  }
  
  /**
   * Check webhook connectivity
   */
  static checkWebhookConnectivity() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const webhookUrl = properties.getProperty('WEBHOOK_URL');
      
      if (!webhookUrl) {
        return {
          healthy: false,
          error: 'No webhook URL configured'
        };
      }
      
      const timer = PerformanceMonitor.startTimer('webhook_connectivity_check');
      
      const response = UrlFetchApp.fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({ type: 'health_check' })
      });
      
      PerformanceMonitor.endTimer('webhook_connectivity_check', timer);
      
      return {
        healthy: response.getResponseCode() === 200,
        webhookUrl: webhookUrl,
        responseCode: response.getResponseCode(),
        responseTime: timer
      };
      
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
  
  /**
   * Check triggers health
   */
  static checkTriggers() {
    try {
      const triggers = ScriptApp.getProjectTriggers();
      const documentTriggers = triggers.filter(trigger => trigger.getHandlerFunction() === 'onDocumentChange');
      
      return {
        healthy: documentTriggers.length > 0,
        totalTriggers: triggers.length,
        documentTriggers: documentTriggers.length,
        triggers: documentTriggers.map(trigger => ({
          id: trigger.getUniqueId(),
          function: trigger.getHandlerFunction()
        }))
      };
      
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
  
  /**
   * Check error rates
   */
  static checkErrorRates() {
    try {
      const stats = Logger.getLoggingStats();
      const errorLogs = Logger.getErrorLogs();
      
      // Calculate error rate over last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentErrors = errorLogs.filter(log => new Date(log.timestamp) > oneHourAgo);
      
      const errorRate = recentErrors.length;
      const healthy = errorRate < 10; // Less than 10 errors per hour is healthy
      
      return {
        healthy: healthy,
        totalErrors: stats.errorCount,
        recentErrors: recentErrors.length,
        errorRate: errorRate,
        threshold: 10
      };
      
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
} 