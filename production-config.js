/**
 * MulaBot Production Configuration & Enhancements
 * Enhanced features for production deployment
 */

const PRODUCTION_CONFIG = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    environment: 'production',
    webhookUrl: 'https://mulabot-web-production.up.railway.app',
    healthCheckInterval: 5 * 60 * 1000, // 5 minutes
  },

  // Google Apps Script Configuration  
  googleAppsScript: {
    documentId: '1DiRcu3pLpCXuYlJ7r19tzsHxI89YWw2BfNFkvOdchsM',
    hmacSecret: process.env.HMAC_SECRET || 'your-production-secret-key-here',
    maxRetries: 3,
    timeoutMs: 30000
  },

  // Slack Configuration
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
    maxSearchResults: 10
  },

  // Business Intelligence Keywords
  businessIntelligence: {
    partnershipKeywords: [
      'partnership', 'collaboration', 'revenue', 'optimization', 
      'launch', 'rollout', 'agreement', 'contract', 'deal'
    ],
    priorityPublishers: [
      'brit.co', 'on3.com', 'shemedia.com', 'aditude.io', 
      'muckermail.com', 'offlinestudio.com'
    ],
    statusKeywords: {
      'in_progress': ['in progress', '🔄', 'ongoing', 'active'],
      'completed': ['completed', '✅', 'done', 'resolved'],
      'waiting': ['waiting', '⏸️', 'pending', 'hold'],
      'info_only': ['info only', '📧', 'fyi', 'notification']
    }
  },

  // Search & Analytics
  search: {
    enableFuzzySearch: true,
    maxResults: 10,
    minQueryLength: 2,
    highlightResults: true
  },

  // Rate Limiting & Security
  security: {
    rateLimitRequests: 100,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    maxSectionSize: 50000, // 50KB per section
    maxTotalSections: 1000
  },

  // Monitoring & Logging
  monitoring: {
    enableAnalytics: true,
    logLevel: 'info',
    trackSearchQueries: true,
    trackPartnershipMetrics: true
  }
};

/**
 * Enhanced search functionality for production
 */
function enhancedSearch(sections, query, options = {}) {
  const config = PRODUCTION_CONFIG.search;
  const businessConfig = PRODUCTION_CONFIG.businessIntelligence;
  
  if (!query || query.length < config.minQueryLength) {
    return { results: [], summary: 'Query too short' };
  }

  const queryLower = query.toLowerCase();
  const results = [];
  
  // Search through sections
  sections.forEach((section, index) => {
    const titleMatch = section.title.toLowerCase().includes(queryLower);
    const contentMatch = section.content.toLowerCase().includes(queryLower);
    
    // Check for partnership relevance
    const isPartnershipRelated = businessConfig.partnershipKeywords.some(
      keyword => section.content.toLowerCase().includes(keyword)
    );
    
    // Check for priority publisher
    const priorityPublisher = businessConfig.priorityPublishers.find(
      publisher => section.content.toLowerCase().includes(publisher)
    );
    
    if (titleMatch || contentMatch) {
      results.push({
        ...section,
        relevanceScore: (titleMatch ? 2 : 1) + (isPartnershipRelated ? 1 : 0),
        isPartnershipRelated,
        priorityPublisher: priorityPublisher || null,
        matchType: titleMatch ? 'title' : 'content'
      });
    }
  });
  
  // Sort by relevance score
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Limit results
  const limitedResults = results.slice(0, config.maxResults);
  
  return {
    results: limitedResults,
    totalFound: results.length,
    query: query,
    summary: generateSearchSummary(limitedResults, query),
    analytics: {
      partnershipRelated: results.filter(r => r.isPartnershipRelated).length,
      priorityPublishers: [...new Set(results.map(r => r.priorityPublisher).filter(Boolean))]
    }
  };
}

/**
 * Generate search summary for results
 */
function generateSearchSummary(results, query) {
  if (results.length === 0) {
    return `No results found for "${query}"`;
  }
  
  const partnershipCount = results.filter(r => r.isPartnershipRelated).length;
  const publishers = [...new Set(results.map(r => r.priorityPublisher).filter(Boolean))];
  
  let summary = `Found ${results.length} result(s) for "${query}"`;
  
  if (partnershipCount > 0) {
    summary += ` (${partnershipCount} partnership-related)`;
  }
  
  if (publishers.length > 0) {
    summary += `. Publishers: ${publishers.join(', ')}`;
  }
  
  return summary;
}

/**
 * Analytics tracking for production
 */
function trackSearchQuery(query, results, timestamp = new Date()) {
  if (!PRODUCTION_CONFIG.monitoring.trackSearchQueries) return;
  
  const analytics = {
    timestamp: timestamp.toISOString(),
    query,
    resultCount: results.length,
    partnershipRelated: results.filter(r => r.isPartnershipRelated).length,
    publishers: [...new Set(results.map(r => r.priorityPublisher).filter(Boolean))]
  };
  
  // In production, this would be sent to analytics service
  console.log('📊 Search Analytics:', JSON.stringify(analytics));
  
  return analytics;
}

/**
 * Health check with enhanced metrics
 */
function getHealthStatus(sections) {
  const partnershipSections = sections.filter(section => 
    PRODUCTION_CONFIG.businessIntelligence.partnershipKeywords.some(
      keyword => section.content.toLowerCase().includes(keyword)
    )
  );
  
  const publisherBreakdown = {};
  PRODUCTION_CONFIG.businessIntelligence.priorityPublishers.forEach(publisher => {
    publisherBreakdown[publisher] = sections.filter(section => 
      section.content.toLowerCase().includes(publisher)
    ).length;
  });
  
  return {
    status: 'healthy',
    version: '1.0.0-production-enhanced',
    timestamp: new Date().toISOString(),
    sections: {
      total: sections.length,
      partnership: partnershipSections.length,
      publisherBreakdown
    },
    services: {
      webhook: 'active',
      search: 'enhanced',
      analytics: PRODUCTION_CONFIG.monitoring.enableAnalytics ? 'active' : 'disabled',
      storage: 'in-memory-enhanced'
    },
    config: {
      maxSections: PRODUCTION_CONFIG.security.maxTotalSections,
      searchEnabled: true,
      analyticsEnabled: PRODUCTION_CONFIG.monitoring.enableAnalytics
    }
  };
}

module.exports = {
  PRODUCTION_CONFIG,
  enhancedSearch,
  generateSearchSummary,
  trackSearchQuery,
  getHealthStatus
}; 