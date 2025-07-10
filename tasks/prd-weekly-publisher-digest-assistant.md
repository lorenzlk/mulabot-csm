# Product Requirements Document: Weekly Publisher Digest Assistant

## Introduction/Overview

The Weekly Publisher Digest Assistant is an end-to-end system that enables team members to query, "What happened with [Publisher] over the last week?" and receive a concise, data-driven summary via Slack. The system ingests daily email digests, indexes them using vector embeddings, and provides on-demand intelligent summaries through a Slack slash command interface.

**Problem Statement:** Customer Success and Ad Ops teams need quick access to recent publisher activities and developments, but manually searching through daily email digests is time-consuming and inefficient.

**Goal:** Create an automated system that transforms raw email digest data into actionable, searchable intelligence accessible through Slack.

## Goals

1. **Automated Content Ingestion:** Seamlessly process daily email digests into a structured, searchable repository
2. **Intelligent Retrieval:** Enable fast, accurate semantic search by publisher and timeframe using vector embeddings
3. **Smart Summarization:** Generate concise, actionable summaries with key developments, action items, and sentiment analysis
4. **Seamless User Experience:** Provide instant access through familiar Slack interface with sub-10-second response times
5. **High Adoption:** Achieve ≥80% weekly usage among Customer Success and Ad Ops teams

## User Stories

1. **As a Customer Success Manager**, I want to quickly understand what happened with a specific publisher over the last week, so that I can prepare for client calls with current information.

2. **As an Ad Ops Specialist**, I want to query recent publisher developments during troubleshooting, so that I can identify potential causes of performance changes.

3. **As a Team Lead**, I want to get weekly publisher summaries for multiple clients, so that I can provide informed updates in team meetings.

4. **As a New Team Member**, I want to easily access recent publisher context, so that I can get up to speed quickly without manual research.

## Functional Requirements

### 1. Data Ingestion & Storage
1.1. The system must automatically detect when new content is added to the central Google Doc (ID: 1DiRcu3pLpCXuYlJ7r19tzsHxI89YWw2BfNFkvOdchsM)
1.2. The system must parse new daily sections and extract publisher-specific content
1.3. The system must generate vector embeddings for new content only (avoiding reprocessing of historical data)
1.4. The system must store embeddings in Pinecone with metadata including: publisher name, date, document section ID

### 2. Search & Retrieval
2.1. The system must support fuzzy publisher name matching (e.g., "google" matches "Google Ads", "Google AdSense")
2.2. The system must automatically handle common aliases through fuzzy matching (e.g., "Brit" for "Brit+Co")
2.3. The system must filter results by publisher and date range (≥ today - N days)
2.4. The system must return relevant content chunks with confidence scores
2.5. The system must support case-insensitive, multi-word publisher queries

### 3. Slack Interface
3.1. The system must respond to slash command `/digest [Publisher]` (defaulting to 7 days)
3.2. The system must respond to slash command `/digest [Publisher] [days]` for custom timeframes
3.3. The system must provide immediate "Thinking..." acknowledgment for user feedback
3.4. The system must be accessible to anyone in the Slack workspace
3.5. The system must format responses using Slack Block Kit for optimal readability

### 4. AI Summarization
4.1. The system must process retrieved content through OpenAI for intelligent summarization
4.2. The system must generate dynamic sections based on content availability
4.3. The system must include confidence scores or source citations in summaries
4.4. The system must structure summaries with clear headers and bullet points
4.5. The system must maintain consistent tone and formatting across all summaries

### 5. Error Handling & Reliability
5.1. The system must provide specific error messages for different failure scenarios (e.g., "Publisher not found", "OpenAI service unavailable")
5.2. The system must implement retry logic for failed API calls
5.3. The system must alert administrators on critical failures
5.4. The system must gracefully handle rate limits and service interruptions
5.5. The system must log all interactions for debugging and analytics

### 6. Performance & Scalability
6.1. The system must complete full query-to-response cycle in under 10 seconds
6.2. The system must support 30+ publishers simultaneously
6.3. The system must handle 30+ days of historical data efficiently
6.4. The system must update search index within 1 hour of new content ingestion
6.5. The system must maintain <5% irrelevant snippet rate for publisher queries

## Non-Goals (Out of Scope)

- **Real-time Email Processing:** Direct email parsing/forwarding (handled by existing script)
- **Advanced Analytics Dashboard:** Complex reporting interfaces beyond Slack summaries
- **Multi-language Support:** Translation or non-English content processing
- **Historical Data Migration:** Reprocessing of pre-existing digest archives
- **Custom AI Model Training:** Using pre-trained OpenAI models only
- **Mobile App Development:** Slack-only interface for initial release
- **External API Integrations:** Beyond specified tech stack (Google, Pinecone, OpenAI, Slack)

## Design Considerations

### Slack Block Kit Layout
- **Header Block:** Publisher name, timeframe, and processing timestamp
- **Summary Sections:** Dynamic sections with clear visual hierarchy
- **Confidence Indicators:** Subtle badges or scores for content reliability
- **Footer Block:** Source information ("Analyzed X digests over last Y days")

### User Experience Flow
1. User types `/digest [Publisher]` in Slack
2. Immediate "🤔 Analyzing [Publisher] data..." response
3. System queries Pinecone → processes with OpenAI → formats response
4. Rich, formatted summary posted to channel with action buttons (if applicable)

## Technical Considerations

### Architecture Components
- **Google Apps Script:** Webhook/API endpoint for content change detection
- **Pipedream:** Main orchestration platform handling workflows and Slack integration
- **Pinecone:** Vector database for semantic search and embedding storage
- **OpenAI API:** Embedding generation (text-embedding-ada-002) and summarization (GPT-4)
- **GitHub:** Source control and version management

### Data Flow
1. Daily digest → Google Doc (existing process)
2. Doc change detection → Pipedream webhook trigger
3. New content extraction → OpenAI embedding generation
4. Pinecone upsert with metadata
5. Slack command → query processing → summary generation → response delivery

### Security Requirements
- API keys stored in Pipedream secure environment variables
- Slack app permissions limited to slash commands and message posting
- Google Apps Script authentication via service account
- Rate limiting and request validation for all external API calls

## Success Metrics

### Accuracy Metrics
- **Relevance Score:** <5% irrelevant snippets returned for any publisher query
- **Publisher Matching Accuracy:** >95% correct publisher identification with fuzzy matching
- **Content Freshness:** New digest entries available in search index within 1 hour

### Performance Metrics
- **Response Latency:** End-to-end query + summary delivered in <10 seconds
- **System Uptime:** >99.5% availability during business hours
- **API Success Rate:** >98% successful completion of user requests

### Adoption Metrics
- **Team Usage:** ≥80% of Customer Success and Ad Ops teams using `/digest` weekly
- **Query Volume:** Average 20+ queries per team member per week
- **User Satisfaction:** >4.5/5 rating in quarterly feedback surveys

## Open Questions

1. **Content Volume Scaling:** How should the system handle extremely large daily digests (>10,000 words) that might exceed embedding context limits?

2. **Historical Context:** Should summaries include comparative analysis (e.g., "activity increased 20% vs. previous week")?

3. **Notification Preferences:** Should the system support proactive notifications for significant publisher developments?

4. **Data Retention:** What is the appropriate retention period for vector embeddings and processed summaries?

5. **Integration Expansion:** Should future versions support additional platforms (Teams, Discord) or remain Slack-focused?

6. **Content Quality Assurance:** Should the system implement automated quality checks or content validation before indexing? 