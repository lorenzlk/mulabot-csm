/**
 * Test Suite for Enhanced Error Handling and Logging System
 * Weekly Publisher Digest Assistant - Google Apps Script
 */

/**
 * Test all error handling and logging features
 */
function testAllErrorHandlingFeatures() {
  try {
    Logger.logInfo('=== ERROR HANDLING & LOGGING TEST SUITE ===', ERROR_CATEGORIES.SYSTEM);
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {
        passed: 0,
        failed: 0,
        total: 0
      }
    };
    
    // Test 1: Logger functionality
    Logger.logInfo('Testing logger functionality...', ERROR_CATEGORIES.SYSTEM);
    const loggerResult = testLoggerFunctionality();
    results.tests.loggerFunctionality = loggerResult;
    results.summary.total++;
    if (loggerResult.success) results.summary.passed++;
    else results.summary.failed++;
    
    // Test 2: Error handler functionality
    Logger.logInfo('Testing error handler functionality...', ERROR_CATEGORIES.SYSTEM);
    const errorHandlerResult = testErrorHandlerFunctionality();
    results.tests.errorHandlerFunctionality = errorHandlerResult;
    results.summary.total++;
    if (errorHandlerResult.success) results.summary.passed++;
    else results.summary.failed++;
    
    // Test 3: Performance monitor
    Logger.logInfo('Testing performance monitor...', ERROR_CATEGORIES.SYSTEM);
    const performanceResult = testPerformanceMonitor();
    results.tests.performanceMonitor = performanceResult;
    results.summary.total++;
    if (performanceResult.success) results.summary.passed++;
    else results.summary.failed++;
    
    // Test 4: Health checker
    Logger.logInfo('Testing health checker...', ERROR_CATEGORIES.SYSTEM);
    const healthResult = testHealthChecker();
    results.tests.healthChecker = healthResult;
    results.summary.total++;
    if (healthResult.success) results.summary.passed++;
    else results.summary.failed++;
    
    // Test 5: Error recovery mechanisms
    Logger.logInfo('Testing error recovery...', ERROR_CATEGORIES.SYSTEM);
    const recoveryResult = testErrorRecovery();
    results.tests.errorRecovery = recoveryResult;
    results.summary.total++;
    if (recoveryResult.success) results.summary.passed++;
    else results.summary.failed++;
    
    // Test 6: Log persistence and retrieval
    Logger.logInfo('Testing log persistence...', ERROR_CATEGORIES.SYSTEM);
    const persistenceResult = testLogPersistence();
    results.tests.logPersistence = persistenceResult;
    results.summary.total++;
    if (persistenceResult.success) results.summary.passed++;
    else results.summary.failed++;
    
    // Calculate success rate
    results.summary.successRate = (results.summary.passed / results.summary.total * 100).toFixed(1) + '%';
    
    Logger.logInfo('=== ERROR HANDLING TEST RESULTS ===', ERROR_CATEGORIES.SYSTEM);
    Logger.logInfo('Total tests: ' + results.summary.total, ERROR_CATEGORIES.SYSTEM);
    Logger.logInfo('Passed: ' + results.summary.passed, ERROR_CATEGORIES.SYSTEM);
    Logger.logInfo('Failed: ' + results.summary.failed, ERROR_CATEGORIES.SYSTEM);
    Logger.logInfo('Success rate: ' + results.summary.successRate, ERROR_CATEGORIES.SYSTEM);
    
    return results;
    
  } catch (error) {
    Logger.logError('Error running error handling tests: ' + error.toString(), ERROR_CATEGORIES.SYSTEM);
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test logger functionality
 */
function testLoggerFunctionality() {
  try {
    // Test different log levels
    const errorLog = Logger.logError('Test error message', ERROR_CATEGORIES.SYSTEM, { test: 'context' });
    const warningLog = Logger.logWarning('Test warning message', ERROR_CATEGORIES.SYSTEM, { test: 'context' });
    const infoLog = Logger.logInfo('Test info message', ERROR_CATEGORIES.SYSTEM, { test: 'context' });
    const debugLog = Logger.logDebug('Test debug message', ERROR_CATEGORIES.SYSTEM, { test: 'context' });
    
    // Verify log entries have required properties
    if (!errorLog.timestamp || !errorLog.level || !errorLog.message) {
      return {
        success: false,
        error: 'Log entry missing required properties'
      };
    }
    
    // Test log retrieval
    const errorLogs = Logger.getErrorLogs();
    const debugLogs = Logger.getDebugLogs();
    const stats = Logger.getLoggingStats();
    
    if (!Array.isArray(errorLogs) || !Array.isArray(debugLogs)) {
      return {
        success: false,
        error: 'Log retrieval returned invalid format'
      };
    }
    
    if (!stats.errorCount || !stats.sessionId) {
      return {
        success: false,
        error: 'Logging stats missing required properties'
      };
    }
    
    return {
      success: true,
      message: 'Logger functionality working correctly',
      details: {
        errorLogsCount: errorLogs.length,
        debugLogsCount: debugLogs.length,
        stats: stats
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
 * Test error handler functionality
 */
function testErrorHandlerFunctionality() {
  try {
    // Test document error handling
    const documentError = new Error('Test document error');
    const documentResult = ErrorHandler.handleDocumentError(documentError, 'test-doc-id', { test: true });
    
    if (!documentResult.category || documentResult.category !== ERROR_CATEGORIES.DOCUMENT_ACCESS) {
      return {
        success: false,
        error: 'Document error handler returned invalid category'
      };
    }
    
    // Test webhook error handling
    const webhookError = new Error('Test webhook error');
    const webhookResult = ErrorHandler.handleWebhookError(webhookError, 'test-url', { test: 'payload' }, { test: true });
    
    if (!webhookResult.category || webhookResult.category !== ERROR_CATEGORIES.WEBHOOK) {
      return {
        success: false,
        error: 'Webhook error handler returned invalid category'
      };
    }
    
    // Test authentication error handling
    const authError = new Error('Test auth error');
    const authResult = ErrorHandler.handleAuthError(authError, { origin: 'test', userAgent: 'test', hasApiKey: false }, { test: true });
    
    if (!authResult.category || authResult.category !== ERROR_CATEGORIES.AUTHENTICATION) {
      return {
        success: false,
        error: 'Authentication error handler returned invalid category'
      };
    }
    
    // Test trigger error handling
    const triggerError = new Error('Test trigger error');
    const triggerResult = ErrorHandler.handleTriggerError(triggerError, { function: 'test', type: 'time' }, { test: true });
    
    if (!triggerResult.category || triggerResult.category !== ERROR_CATEGORIES.TRIGGER) {
      return {
        success: false,
        error: 'Trigger error handler returned invalid category'
      };
    }
    
    // Test parsing error handling
    const parseError = new Error('Test parse error');
    const parseResult = ErrorHandler.handleParsingError(parseError, 'test content', { test: true });
    
    if (!parseResult.category || parseResult.category !== ERROR_CATEGORIES.PARSING) {
      return {
        success: false,
        error: 'Parsing error handler returned invalid category'
      };
    }
    
    // Test network error handling
    const networkError = new Error('Test network error');
    const networkResult = ErrorHandler.handleNetworkError(networkError, 'test-url', { test: true });
    
    if (!networkResult.category || networkResult.category !== ERROR_CATEGORIES.NETWORK) {
      return {
        success: false,
        error: 'Network error handler returned invalid category'
      };
    }
    
    // Test recovery suggestions
    const suggestions = ErrorHandler.getRecoverySuggestions(documentError, ERROR_CATEGORIES.DOCUMENT_ACCESS);
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return {
        success: false,
        error: 'Recovery suggestions not generated'
      };
    }
    
    return {
      success: true,
      message: 'Error handler functionality working correctly',
      details: {
        documentErrorHandled: !!documentResult,
        webhookErrorHandled: !!webhookResult,
        authErrorHandled: !!authResult,
        triggerErrorHandled: !!triggerResult,
        parseErrorHandled: !!parseResult,
        networkErrorHandled: !!networkResult,
        suggestionCount: suggestions.length
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
 * Test performance monitor
 */
function testPerformanceMonitor() {
  try {
    // Test timer functionality
    const timer1 = PerformanceMonitor.startTimer('test_operation_1');
    
    // Simulate some work
    Utilities.sleep(100);
    
    const duration1 = PerformanceMonitor.endTimer('test_operation_1', timer1);
    
    if (duration1 < 90 || duration1 > 200) {
      return {
        success: false,
        error: 'Performance timer duration out of expected range: ' + duration1
      };
    }
    
    // Test multiple operations
    const timer2 = PerformanceMonitor.startTimer('test_operation_2');
    Utilities.sleep(50);
    const duration2 = PerformanceMonitor.endTimer('test_operation_2', timer2);
    
    // Test metrics retrieval
    const metrics = PerformanceMonitor.getPerformanceMetrics();
    
    if (!metrics['test_operation_1'] || !metrics['test_operation_2']) {
      return {
        success: false,
        error: 'Performance metrics not stored correctly'
      };
    }
    
    const metric1 = metrics['test_operation_1'];
    if (!metric1.count || !metric1.avgTime || !metric1.maxTime) {
      return {
        success: false,
        error: 'Performance metric missing required properties'
      };
    }
    
    return {
      success: true,
      message: 'Performance monitor working correctly',
      details: {
        operation1Duration: duration1,
        operation2Duration: duration2,
        metricsCount: Object.keys(metrics).length,
        metric1: metric1
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
 * Test health checker
 */
function testHealthChecker() {
  try {
    // Test comprehensive health check
    const healthResults = HealthChecker.performHealthCheck();
    
    if (!healthResults.timestamp || !healthResults.checks || !healthResults.metrics) {
      return {
        success: false,
        error: 'Health check results missing required properties'
      };
    }
    
    // Check individual health components
    const requiredChecks = ['documentAccess', 'triggers', 'errorRates'];
    for (const check of requiredChecks) {
      if (!healthResults.checks[check]) {
        return {
          success: false,
          error: 'Missing health check: ' + check
        };
      }
    }
    
    // Test individual health check functions
    const documentHealth = HealthChecker.checkDocumentAccess();
    if (!documentHealth.hasOwnProperty('healthy')) {
      return {
        success: false,
        error: 'Document access health check missing healthy property'
      };
    }
    
    const triggerHealth = HealthChecker.checkTriggers();
    if (!triggerHealth.hasOwnProperty('healthy')) {
      return {
        success: false,
        error: 'Trigger health check missing healthy property'
      };
    }
    
    const errorRateHealth = HealthChecker.checkErrorRates();
    if (!errorRateHealth.hasOwnProperty('healthy')) {
      return {
        success: false,
        error: 'Error rate health check missing healthy property'
      };
    }
    
    return {
      success: true,
      message: 'Health checker working correctly',
      details: {
        overallHealth: healthResults.overall,
        documentHealthy: documentHealth.healthy,
        triggerHealthy: triggerHealth.healthy,
        errorRateHealthy: errorRateHealth.healthy,
        checksCount: Object.keys(healthResults.checks).length
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
 * Test error recovery mechanisms
 */
function testErrorRecovery() {
  try {
    // Test document recovery (will fail with invalid doc ID, but should handle gracefully)
    const documentRecovery = ErrorHandler.attemptDocumentRecovery('invalid-doc-id', new Error('Test error'));
    
    if (!documentRecovery.hasOwnProperty('success')) {
      return {
        success: false,
        error: 'Document recovery missing success property'
      };
    }
    
    // Test webhook recovery (will fail with invalid URL, but should handle gracefully)
    const webhookRecovery = ErrorHandler.attemptWebhookRecovery('invalid-url', { test: 'data' }, new Error('Test error'));
    
    if (!webhookRecovery.hasOwnProperty('success')) {
      return {
        success: false,
        error: 'Webhook recovery missing success property'
      };
    }
    
    // Test trigger recovery
    const triggerRecovery = ErrorHandler.attemptTriggerRecovery({ function: 'testFunction', type: 'time' }, new Error('Test error'));
    
    if (!triggerRecovery.hasOwnProperty('success')) {
      return {
        success: false,
        error: 'Trigger recovery missing success property'
      };
    }
    
    return {
      success: true,
      message: 'Error recovery mechanisms working correctly',
      details: {
        documentRecoveryTested: true,
        webhookRecoveryTested: true,
        triggerRecoveryTested: true
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
 * Test log persistence and retrieval
 */
function testLogPersistence() {
  try {
    // Clear existing logs
    Logger.clearLogs();
    
    // Generate test logs
    Logger.logError('Test error for persistence', ERROR_CATEGORIES.SYSTEM, { test: 1 });
    Logger.logWarning('Test warning for persistence', ERROR_CATEGORIES.SYSTEM, { test: 2 });
    Logger.logInfo('Test info for persistence', ERROR_CATEGORIES.SYSTEM, { test: 3 });
    Logger.logDebug('Test debug for persistence', ERROR_CATEGORIES.SYSTEM, { test: 4 });
    
    // Retrieve logs
    const errorLogs = Logger.getErrorLogs();
    const debugLogs = Logger.getDebugLogs();
    const stats = Logger.getLoggingStats();
    
    // Verify persistence
    if (errorLogs.length < 1) {
      return {
        success: false,
        error: 'Error logs not persisted correctly'
      };
    }
    
    if (debugLogs.length < 3) {
      return {
        success: false,
        error: 'Debug logs not persisted correctly'
      };
    }
    
    if (stats.errorCount < 1) {
      return {
        success: false,
        error: 'Error count not updated correctly'
      };
    }
    
    // Test log structure
    const latestErrorLog = errorLogs[0];
    if (!latestErrorLog.timestamp || !latestErrorLog.level || !latestErrorLog.message) {
      return {
        success: false,
        error: 'Persisted error log missing required properties'
      };
    }
    
    const latestDebugLog = debugLogs[0];
    if (!latestDebugLog.timestamp || !latestDebugLog.level || !latestDebugLog.message) {
      return {
        success: false,
        error: 'Persisted debug log missing required properties'
      };
    }
    
    // Test log clearing
    const clearResult = Logger.clearLogs();
    if (!clearResult.success) {
      return {
        success: false,
        error: 'Log clearing failed'
      };
    }
    
    const clearedErrorLogs = Logger.getErrorLogs();
    const clearedDebugLogs = Logger.getDebugLogs();
    
    if (clearedErrorLogs.length > 0 || clearedDebugLogs.length > 0) {
      return {
        success: false,
        error: 'Logs not cleared properly'
      };
    }
    
    return {
      success: true,
      message: 'Log persistence working correctly',
      details: {
        errorLogsStored: errorLogs.length,
        debugLogsStored: debugLogs.length,
        statsUpdated: stats.errorCount > 0,
        logsCleared: clearedErrorLogs.length === 0
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
 * Generate a comprehensive error handling report
 */
function generateErrorHandlingReport() {
  try {
    Logger.logInfo('Generating comprehensive error handling report...', ERROR_CATEGORIES.SYSTEM);
    
    const testResults = testAllErrorHandlingFeatures();
    const healthResults = HealthChecker.performHealthCheck();
    const performanceMetrics = PerformanceMonitor.getPerformanceMetrics();
    const loggingStats = Logger.getLoggingStats();
    const errorLogs = Logger.getErrorLogs();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        overallHealth: healthResults.overall,
        testsPassed: testResults.summary ? testResults.summary.passed : 0,
        testsFailed: testResults.summary ? testResults.summary.failed : 0,
        errorRate: errorLogs.length,
        performanceOk: Object.keys(performanceMetrics).length > 0
      },
      testResults: testResults,
      healthResults: healthResults,
      performanceMetrics: performanceMetrics,
      loggingStats: loggingStats,
      recentErrors: errorLogs.slice(0, 5), // Last 5 errors
      recommendations: []
    };
    
    // Generate recommendations
    if (!healthResults.overall) {
      report.recommendations.push('System health check failed - investigate failing components');
    }
    
    if (testResults.summary && testResults.summary.failed > 0) {
      report.recommendations.push('Some error handling tests failed - review implementation');
    }
    
    if (errorLogs.length > 10) {
      report.recommendations.push('High error rate detected - investigate error causes');
    }
    
    if (Object.keys(performanceMetrics).length === 0) {
      report.recommendations.push('No performance metrics available - ensure monitoring is active');
    }
    
    if (loggingStats.errorCount > 50) {
      report.recommendations.push('Consider clearing old logs to improve performance');
    }
    
    // Calculate overall score
    let score = 0;
    if (healthResults.overall) score += 30;
    if (testResults.summary && testResults.summary.successRate === '100.0%') score += 30;
    if (errorLogs.length < 5) score += 20;
    if (Object.keys(performanceMetrics).length > 0) score += 10;
    if (loggingStats.sessionId) score += 10;
    
    report.overallScore = score;
    
    Logger.logInfo('Error handling report generated. Score: ' + score + '/100', ERROR_CATEGORIES.SYSTEM);
    
    return report;
    
  } catch (error) {
    Logger.logError('Error generating error handling report: ' + error.toString(), ERROR_CATEGORIES.SYSTEM);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test error handling under stress conditions
 */
function testErrorHandlingStress() {
  try {
    Logger.logInfo('Starting error handling stress test...', ERROR_CATEGORIES.SYSTEM);
    
    const results = {
      timestamp: new Date().toISOString(),
      iterationsCompleted: 0,
      errorsGenerated: 0,
      logsGenerated: 0,
      performanceImpact: 0
    };
    
    const startTime = new Date().getTime();
    
    // Generate multiple errors and logs rapidly
    for (let i = 0; i < 20; i++) {
      try {
        // Generate different types of errors
        ErrorHandler.handleDocumentError(new Error('Stress test error ' + i), 'test-doc', { iteration: i });
        ErrorHandler.handleWebhookError(new Error('Stress webhook error ' + i), 'test-url', { test: 'data' }, { iteration: i });
        
        // Generate logs
        Logger.logError('Stress test error log ' + i, ERROR_CATEGORIES.SYSTEM, { iteration: i });
        Logger.logWarning('Stress test warning log ' + i, ERROR_CATEGORIES.SYSTEM, { iteration: i });
        Logger.logInfo('Stress test info log ' + i, ERROR_CATEGORIES.SYSTEM, { iteration: i });
        
        results.iterationsCompleted++;
        results.errorsGenerated += 2;
        results.logsGenerated += 3;
        
      } catch (error) {
        Logger.logError('Error during stress test iteration ' + i + ': ' + error.toString(), ERROR_CATEGORIES.SYSTEM);
      }
    }
    
    const endTime = new Date().getTime();
    results.performanceImpact = endTime - startTime;
    
    // Verify system still works after stress test
    const healthCheck = HealthChecker.performHealthCheck();
    const loggingStats = Logger.getLoggingStats();
    
    results.systemHealthy = healthCheck.overall;
    results.finalErrorCount = loggingStats.errorCount;
    
    Logger.logInfo('Stress test completed', ERROR_CATEGORIES.SYSTEM, results);
    
    return {
      success: true,
      message: 'Error handling stress test completed',
      results: results
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
} 