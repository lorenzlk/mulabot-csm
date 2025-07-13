/**
 * MulaBot Document Monitor - Clean Version
 * Extracts content from Google Doc and sends to webhook
 * Document ID: 1DiRcu3pLpCXuYlJ7r19tzsHxI89YWw2BfNFkvOdchsM
 */

// Configuration
const DOCUMENT_ID = '1DiRcu3pLpCXuYlJ7r19tzsHxI89YWw2BfNFkvOdchsM';
const webhookUrl = 'https://510c6ecf934a.ngrok-free.app/webhook';
const HMAC_SECRET = 'your-secret-key-here'; // Change this to a secure secret

/**
 * Main function to extract and send document content
 */
function sendCurrentDocumentContent() {
  console.log('🚀 Starting document content extraction...');
  
  try {
    // Open the document
    const doc = DocumentApp.openById(DOCUMENT_ID);
    const docTitle = doc.getName();
    const body = doc.getBody();
    const fullText = body.getText();
    
    console.log(`📄 Document: ${docTitle}`);
    console.log(`📊 Total characters: ${fullText.length}`);
    
    // Extract sections
    const sections = extractSections(body);
    
    console.log(`✅ Extracted ${sections.length} content sections`);
    
    if (sections.length === 0) {
      console.log('⚠️ No sections found to send');
      return;
    }
    
    // Prepare payload
    const payload = {
      document_id: DOCUMENT_ID,
      document_title: docTitle,
      sections: sections,
      timestamp: new Date().toISOString(),
      total_characters: fullText.length,
      total_sections: sections.length
    };
    
    // Send to webhook
    const response = sendToWebhook(payload);
    
    console.log(`📨 Webhook response - Status: ${response.getResponseCode()}`);
    console.log(`📨 Response body: ${response.getContentText()}`);
    
    if (response.getResponseCode() === 200) {
      console.log('✅ Successfully sent document content to webhook');
    } else {
      console.error('❌ Failed to send to webhook');
    }
    
  } catch (error) {
    console.error('❌ Error in sendCurrentDocumentContent:', error.toString());
  }
}

/**
 * Extract sections from document body
 */
function extractSections(body) {
  const sections = [];
  const paragraphs = body.getParagraphs();
  
  let currentSection = null;
  let sectionNumber = 0;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const text = paragraph.getText().trim();
    
    if (text === '') continue;
    
    // Check if this is a section header (detect headings or bold text)
    const heading = paragraph.getHeading();
    const isHeading = heading !== DocumentApp.ParagraphHeading.NORMAL;
    
    // Also check for bold text that might be section headers
    const isBold = paragraph.editAsText().isBold(0);
    
    if (isHeading || (isBold && text.length < 100)) {
      // Save previous section
      if (currentSection && currentSection.content.trim()) {
        sections.push({
          title: currentSection.title,
          content: currentSection.content.trim(),
          section_number: currentSection.section_number
        });
      }
      
      // Start new section
      sectionNumber++;
      currentSection = {
        title: text,
        content: '',
        section_number: sectionNumber
      };
      
    } else if (currentSection) {
      // Add content to current section
      currentSection.content += text + '\n\n';
    } else {
      // Content before first header - create initial section
      sectionNumber++;
      currentSection = {
        title: `Introduction`,
        content: text + '\n\n',
        section_number: sectionNumber
      };
    }
  }
  
  // Add final section
  if (currentSection && currentSection.content.trim()) {
    sections.push({
      title: currentSection.title,
      content: currentSection.content.trim(),
      section_number: currentSection.section_number
    });
  }
  
  return sections;
}

/**
 * Send payload to webhook with HMAC signature
 */
function sendToWebhook(payload) {
  const jsonPayload = JSON.stringify(payload);
  
  // Generate HMAC signature for security
  const signature = generateHMAC(jsonPayload, HMAC_SECRET);
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
      'User-Agent': 'MulaBot-GoogleAppsScript/1.0'
    },
    payload: jsonPayload
  };
  
  console.log(`📡 Sending ${jsonPayload.length} bytes to webhook...`);
  
  try {
    return UrlFetchApp.fetch(webhookUrl, options);
  } catch (error) {
    console.error('❌ Webhook request failed:', error.toString());
    throw error;
  }
}

/**
 * Generate HMAC signature for payload verification
 */
function generateHMAC(payload, secret) {
  try {
    const signature = Utilities.computeHmacSha256Signature(payload, secret);
    return 'sha256=' + signature.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('❌ HMAC generation failed:', error.toString());
    return 'sha256=fallback';
  }
}

/**
 * Test function - extract and log sections without sending
 */
function testSectionExtraction() {
  console.log('🧪 Testing section extraction...');
  
  try {
    const doc = DocumentApp.openById(DOCUMENT_ID);
    const body = doc.getBody();
    const sections = extractSections(body);
    
    console.log(`📊 Found ${sections.length} sections:`);
    
    sections.slice(0, 5).forEach((section, index) => {
      console.log(`\n${index + 1}. "${section.title}"`);
      console.log(`   Content preview: ${section.content.substring(0, 100)}...`);
      console.log(`   Characters: ${section.content.length}`);
    });
    
    if (sections.length > 5) {
      console.log(`\n... and ${sections.length - 5} more sections`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.toString());
  }
}

/**
 * Manual trigger function for testing
 */
function manualTrigger() {
  console.log('🔧 Manual trigger executed');
  sendCurrentDocumentContent();
}

/**
 * Health check function
 */
function healthCheck() {
  console.log('❤️ Google Apps Script is healthy');
  console.log(`📄 Document ID: ${DOCUMENT_ID}`);
  console.log(`🌐 Webhook URL: ${webhookUrl}`);
  
  try {
    const doc = DocumentApp.openById(DOCUMENT_ID);
    console.log(`✅ Document accessible: ${doc.getName()}`);
    return true;
  } catch (error) {
    console.error('❌ Document not accessible:', error.toString());
    return false;
  }
}