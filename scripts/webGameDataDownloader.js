#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');

const streamPipeline = promisify(pipeline);

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper function to log with colors and emojis
function log(type, message, details = '') {
  const timestamp = new Date().toLocaleString('tr-TR');
  let prefix = '';
  
  switch (type) {
    case 'info':
      prefix = `${colors.blue}ℹ️  [INFO]${colors.reset}`;
      break;
    case 'success':
      prefix = `${colors.green}✅ [SUCCESS]${colors.reset}`;
      break;
    case 'warning':
      prefix = `${colors.yellow}⚠️  [WARNING]${colors.reset}`;
      break;
    case 'error':
      prefix = `${colors.red}❌ [ERROR]${colors.reset}`;
      break;
    case 'progress':
      prefix = `${colors.cyan}🔄 [PROGRESS]${colors.reset}`;
      break;
    default:
      prefix = `${colors.magenta}📝 [LOG]${colors.reset}`;
  }
  
  console.log(`${prefix} ${colors.bright}${timestamp}${colors.reset} - ${message}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  const params = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--code=')) {
      params.code = arg.split('=')[1];
    } else if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      params[key] = value || true;
    }
  });
  
  return params;
}

// Create directory recursively if it doesn't exist
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
    log('info', `Directory already exists: ${dirPath}`);
  } catch (error) {
    log('progress', `Creating directory: ${dirPath}`);
    await fs.mkdir(dirPath, { recursive: true });
    log('success', `Directory created: ${dirPath}`);
  }
}

// Download file from URL and save to local path
async function downloadFile(url, filePath) {
  try {
    log('progress', `Downloading file from: ${url}`);
    log('info', `Saving to: ${filePath}`);
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 30000, // 30 seconds timeout
      headers: {
        'User-Agent': 'WebGameDataDownloader/1.0'
      }
    });
    
    // Ensure the directory exists
    const dir = path.dirname(filePath);
    await ensureDirectoryExists(dir);
    
    // Download and save the file
    await streamPipeline(response.data, createWriteStream(filePath));
    
    // Check file size
    const stats = await fs.stat(filePath);
    log('success', `File downloaded successfully: ${path.basename(filePath)}`, 
        `Size: ${(stats.size / 1024).toFixed(2)} KB`);
    
    return true;
  } catch (error) {
    log('error', `Failed to download file: ${url}`, `Error: ${error.message}`);
    return false;
  }
}

// Fetch questions from API
async function fetchQuestions(code) {
  const apiUrl = `https://etkinlik.app/api/unity/question-groups/code/${code}`;
  
  try {
    log('progress', `Fetching questions from API...`);
    log('info', `API URL: ${apiUrl}`);
    
    const startTime = Date.now();
    const response = await axios.get(apiUrl, {
      timeout: 15000, // 15 seconds timeout
      headers: {
        'User-Agent': 'WebGameDataDownloader/1.0',
        'Accept': 'application/json'
      }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    log('success', `API response received`, 
        `Status: ${response.status}, Response time: ${responseTime}ms`);
    
    if (!response.data || !response.data.questions) {
      throw new Error('Invalid API response format - missing questions array');
    }
    
    const questionsCount = response.data.questions.length;
    log('info', `Questions found: ${questionsCount}`);
    
    if (questionsCount === 0) {
      log('warning', 'No questions found in the response');
    }
    
    return response.data;
  } catch (error) {
    if (error.response) {
      log('error', `API request failed`, 
          `Status: ${error.response.status}, Message: ${error.response.statusText}`);
    } else if (error.request) {
      log('error', `Network error - no response received`, error.message);
    } else {
      log('error', `Request setup error`, error.message);
    }
    throw error;
  }
}

// Fetch all publishers and create dynamic mapping
async function getPublisherLogoMapping() {
  const apiUrl = `https://etkinlik.app/api/publishers`;
  
  try {
    log('progress', `Fetching all publishers from API...`);
    
    const response = await axios.get(apiUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'WebGameDataDownloader/1.0',
        'Accept': 'application/json'
      }
    });
    
    log('success', `Publishers data received`, `Count: ${response.data.length}`);
    
    // Create mapping: publisher name -> logo URL
    const publisherToLogoUrl = {};
    
    response.data.forEach(publisher => {
      if (publisher.logo_url && publisher.name) {
        publisherToLogoUrl[publisher.name] = publisher.logo_url;
      }
    });
    
    log('info', `Created dynamic mapping for ${Object.keys(publisherToLogoUrl).length} publishers`);
    
    return publisherToLogoUrl;
    
  } catch (error) {
    log('warning', `Failed to fetch publishers: ${error.message}`);
    return {};
  }
}

// Extract image URLs from questions
function extractImageUrls(questions) {
  const imageUrls = [];
  
  questions.forEach((question, index) => {
    // Check for image_url field
    if (question.image_url) {
      imageUrls.push({
        url: question.image_url,
        filename: `question_${question.id || index + 1}_image.jpg`,
        questionId: question.id || index + 1
      });
    }
    
    // Check for question_image field
    if (question.question_image) {
      imageUrls.push({
        url: question.question_image,
        filename: `question_${question.id || index + 1}_image.jpg`,
        questionId: question.id || index + 1
      });
    }
    
    // Check for images in answers (if answers have images)
    if (question.answers && Array.isArray(question.answers)) {
      question.answers.forEach((answer, answerIndex) => {
        if (answer.image_url) {
          imageUrls.push({
            url: answer.image_url,
            filename: `question_${question.id || index + 1}_answer_${answerIndex + 1}.jpg`,
            questionId: question.id || index + 1
          });
        }
      });
    }
  });
  
  log('info', `Image URLs extracted: ${imageUrls.length} images found`);
  
  return imageUrls;
}

// Main function
async function main() {
  log('info', '🚀 Web Game Data Downloader Started');
  log('info', '=' .repeat(50));
  
  const params = parseArguments();
  
  if (!params.code) {
    log('error', 'Missing required parameter: --code');
    log('info', 'Usage: node webGameDataDownloader.js --code=XXXXX');
    process.exit(1);
  }
  
  const code = params.code;
  log('info', `Game Code: ${code}`);
  
  // Get environment variables for proper directory structure
  const buildPath = process.env.BUILD_PATH;
  const gameType = process.env.GAME_TYPE || 'jeopardy';
  const publicSegment = process.env.PUBLIC_SEGMENT || 'jeopardy';
  
  log('info', `Game Type: ${gameType}`);
  log('info', `Build Path: ${buildPath}`);
  log('info', `Public Segment: ${publicSegment}`);
  
  // Create base directories - Use BUILD_PATH if available, otherwise fallback to current working directory
  let baseDir;
  if (buildPath) {
    baseDir = path.join(buildPath, 'questions');
  } else {
    baseDir = path.join(process.cwd(), publicSegment, 'questions');
  }
  
  const imagesDir = path.join(baseDir, 'images');
  
  try {
    log('progress', 'Setting up directory structure...');
    
    // Questions klasörünü temizle (sadece web oyunlar ve tower game için)
    if (buildPath && (gameType === 'web-oyun' || gameType === 'tower-game')) {
      const questionsDir = path.join(buildPath, 'questions');
      try {
        // Questions klasörünün içindekileri temizle ama klasörü koru
        const items = await fs.readdir(questionsDir);
        for (const item of items) {
          const itemPath = path.join(questionsDir, item);
          const stat = await fs.stat(itemPath);
          if (stat.isDirectory()) {
            // Alt klasörleri sil (eski kod klasörleri)
            await fs.rm(itemPath, { recursive: true, force: true });
            log('info', `Removed old directory: ${item}`);
          } else if (item !== 'question.json' && item !== 'logo.png') {
            // Eski dosyaları sil ama yeni oluşturacaklarımızı koru
            await fs.unlink(itemPath);
            log('info', `Removed old file: ${item}`);
          }
        }
        log('success', 'Questions directory cleaned');
      } catch (cleanError) {
        log('warning', 'Could not clean questions directory', cleanError.message);
      }
    }
    
    await ensureDirectoryExists(baseDir);
    await ensureDirectoryExists(imagesDir);
    
    // Fetch questions from API
    log('progress', 'Step 1: Fetching questions from API...');
    const apiData = await fetchQuestions(code);
    
    // Debug: Log logo-related data from API response
    log('info', '=== LOGO DEBUG INFO ===');
    log('info', `API logo_url: ${apiData.logo_url}`);
    log('info', `Full API Response Keys: ${Object.keys(apiData).join(', ')}`);
    log('info', `Publisher name: ${apiData.publisher_name || (apiData.publisher && apiData.publisher.name) || 'N/A'}`);
    log('info', `Publisher object: ${JSON.stringify(apiData.publisher || 'null')}`);
    log('info', `Group name: ${apiData.name || 'N/A'}`);
    if (apiData.questions && apiData.questions[0]) {
      log('info', `First question keys: ${Object.keys(apiData.questions[0]).join(', ')}`);
    }
    log('info', '=======================')
    
    // Save questions as JSON
    log('progress', 'Step 2: Saving questions to JSON file...');
    const questionsFilePath = path.join(baseDir, 'question.json');
    
    // Transform API data to local game format
    const localFormatData = {
      questions: (apiData.questions || []).map((q, index) => {
        // Convert API format to local game format
        const localQuestion = {
          id: q.id || index + 1,
          questionText: q.question_text || "No question text", // Use questionText for local format
          publisher_id: q.publisher_id
        };
        
        // Add image URL if available
        if (q.image_url || q.question_image) {
          // Save as local path that will be accessible to the web game
          localQuestion.image_url = `/${publicSegment}/questions/images/question_${q.id || index + 1}_image.jpg`;
        }
        
        // Handle different answer formats
        if (q.answers && Array.isArray(q.answers)) {
          // Convert answers array to answersText and correctAnswerId format
          localQuestion.answersText = q.answers.map(a => a.answer_text || "");
          localQuestion.correctAnswerId = q.answers.findIndex(a => a.is_correct);
          if (localQuestion.correctAnswerId === -1) localQuestion.correctAnswerId = 0;
        } else if (q.answersText && Array.isArray(q.answersText)) {
          // Already in correct format
          localQuestion.answersText = q.answersText;
          localQuestion.correctAnswerId = q.correctAnswerId || 0;
        }
        
        return localQuestion;
      }),
      // Temporarily add full API response for debugging
      _debug_api_response: apiData
    };
    
    await fs.writeFile(questionsFilePath, JSON.stringify(localFormatData, null, 2), 'utf8');
    log('success', `Questions saved to: ${questionsFilePath}`);
    
    // Extract and download images
    log('progress', 'Step 3: Processing question images...');
    const imageUrls = extractImageUrls(apiData.questions || []);
    
    if (imageUrls.length > 0) {
      log('info', `Found ${imageUrls.length} images to download`);
      
      let downloadedImages = 0;
      for (const imageInfo of imageUrls) {
        const imagePath = path.join(imagesDir, imageInfo.filename);
        
        // Construct full URL if relative
        let fullImageUrl = imageInfo.url;
        if (fullImageUrl && !fullImageUrl.startsWith('http')) {
          fullImageUrl = `https://etkinlik.app/${fullImageUrl}`;
        }
        
        const success = await downloadFile(fullImageUrl, imagePath);
        if (success) {
          downloadedImages++;
        }
      }
      
      log('success', `Images downloaded: ${downloadedImages}/${imageUrls.length}`);
    } else {
      log('info', 'No images found in questions');
    }
    
    // Process publisher logo using correct publisher name
    log('progress', 'Step 4: Processing publisher logo...');
    
    // Get dynamic publisher mapping from API
    const publisherToLogoUrl = await getPublisherLogoMapping();
    
    // Get publisher name from API response - check multiple possible fields
    let publisherName = null;
    
    // Try different ways to get publisher name from API
    if (typeof apiData.publisher === 'string') {
      publisherName = apiData.publisher;
      log('info', `Publisher name from API (string): ${publisherName}`);
    } else if (apiData.publisher && apiData.publisher.name) {
      publisherName = apiData.publisher.name;
      log('info', `Publisher name from API (object): ${publisherName}`);
    } else if (apiData.publisher_name) {
      publisherName = apiData.publisher_name;
      log('info', `Publisher name from API (publisher_name field): ${publisherName}`);
    }
    
    let logoUrl = null;
    
    if (publisherName && publisherToLogoUrl[publisherName]) {
      // Use dynamic mapping to get correct logo URL
      logoUrl = publisherToLogoUrl[publisherName];
      log('success', `Found correct logo URL for publisher: ${publisherName}`);
      log('info', `Correct logo URL: ${logoUrl}`);
    } else {
      // Fallback to API logo_url if dynamic mapping fails
      logoUrl = apiData.logo_url;
      log('warning', `Could not find publisher in dynamic mapping, using API logo_url`);
      log('info', `Publisher name found: ${publisherName || 'NONE'}`);
      log('info', `Available publishers: ${Object.keys(publisherToLogoUrl).join(', ')}`);
    }
    
    // Fallback to available_logos if main logo_url is empty
    if (!logoUrl && Array.isArray(apiData.available_logos) && apiData.available_logos.length > 0) {
      let firstLogo = apiData.available_logos[0];
      if (firstLogo && !firstLogo.startsWith('http')) {
        logoUrl = `https://etkinlik.app/storage/${firstLogo.replace(/^publisher-logos\//, 'publisher-logos/')}`;
      } else {
        logoUrl = firstLogo;
      }
      log('info', `Using available_logos fallback: ${logoUrl}`);
    }
    
    if (logoUrl) {
      log('info', `Publisher logo URL found: ${logoUrl}`);
      const logoPath = path.join(baseDir, 'logo.png');
      const success = await downloadFile(logoUrl, logoPath);
      if (success) {
        log('success', 'Publisher logo downloaded successfully');
        
        // Update JSON file with correct logo URL
        log('progress', 'Updating JSON file with correct logo URL...');
        try {
          const questionsFilePath = path.join(baseDir, 'question.json');
          
          // Debug: Read and log existing content
          const fileContent = await fs.readFile(questionsFilePath, 'utf8');
          const existingData = JSON.parse(fileContent);
          log('info', `DEBUG - Current JSON logo_url: ${existingData.logo_url || 'NONE'}`);
          
          existingData.logo_url = logoUrl;
          existingData.publisher_name = publisherName;
          
          const updatedContent = JSON.stringify(existingData, null, 2);
          await fs.writeFile(questionsFilePath, updatedContent, 'utf8');
          
          // Debug: Verify the file was updated
          const verifyContent = await fs.readFile(questionsFilePath, 'utf8');
          const verifyData = JSON.parse(verifyContent);
          log('info', `DEBUG - Updated JSON logo_url: ${verifyData.logo_url || 'NONE'}`);
          
          log('success', `JSON file updated with correct logo URL: ${logoUrl}`);
        } catch (updateError) {
          log('warning', `Failed to update JSON with logo URL: ${updateError.message}`);
          log('warning', `DEBUG - Error stack: ${updateError.stack}`);
        }
      } else {
        log('warning', 'Failed to download publisher logo');
      }
    } else {
      log('warning', 'No publisher logo URL found in JSON');
    }
    
    // Final summary
    log('info', '=' .repeat(50));
    log('success', '🎉 Download process completed successfully!');
    log('info', `📁 Data saved to: ${baseDir}`);
    log('info', `📄 Questions file: ${path.join(baseDir, 'question.json')}`);
    log('info', `🖼️  Images directory: ${imagesDir}`);
    log('info', `🏢 Logo file: ${path.join(baseDir, 'logo.png')} (if available)`);
    log('info', `🎮 Game will automatically read from: /${publicSegment}/questions/`);
    log('info', '✅ All files are now compatible with the game!');
    
  } catch (error) {
    log('error', '💥 Download process failed!', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log('error', '💥 Uncaught Exception', error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('error', '💥 Unhandled Rejection', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, fetchQuestions, downloadFile }; 