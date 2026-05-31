/**
 * YouTube Transcript Downloader & Gemini paragraph formatter.
 * Incremental, token-efficient, fail-safe.
 */

import fs from 'fs';
import path from 'path';
import { YoutubeTranscript } from 'youtube-transcript';
import dotenv from 'dotenv';

// Load environmental variables from .env
dotenv.config();

const TRANSCRIPT_DIR = path.join(process.cwd(), 'public', 'transcripts');
const VIDEOS_JSON_PATH = path.join(process.cwd(), 'src', 'data', 'videos.json');

// Ensure output directories exist
if (!fs.existsSync(TRANSCRIPT_DIR)) {
  fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
}

interface TranscriptSegment {
  text: string;
  duration: number;
  offset: number;
}

interface ProcessedTranscript {
  id: string;
  title: string;
  url: string;
  formattedMarkdown: string;
  rawText: string;
  wordCount: number;
  processedAt: string;
}

// Delay helper to prevent aggressive hitting of endpoints
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function formatTranscriptLocally(title: string, rawText: string): string {
  let txt = rawText.replace(/\s+/g, ' ').trim();
  if (!txt) return '';

  const words = txt.split(' ');
  const formattedWords: string[] = [];
  let capitalizeNext = true;

  // Spiritual names and sacred words list for automatic elegant capitalization
  const holyWords = new Set([
    'yogananda', 'yoganandaji', 'guruji', 'guru', 'anandamoy', 'smaranananda', 'giri', 'sannyasi',
    'yss', 'srf', 'god', 'lord', 'father', 'mother', 'divine', 'peace', 'meditation', 'will', 
    'consciousness', 'christ', 'medulla', 'oblongata', 'spirit', 'spiritual', 'joy', 'soul', 'souls',
    'jai', 'india', 'hong-sau', 'kriya', 'yoga', 'pranayama', 'bhakti', 'devotion', 'paramahansa',
    'lahiri', 'mahasaya', 'yukteswar', 'babaji', 'krishna', 'jesus', 'buddha', 'chaitanya', 'shiva',
    'yogaoda'
  ]);

  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    if (!word) continue;

    const lowerWord = word.toLowerCase().replace(/[^a-z]/g, '');

    // Normalize pronouns
    if (lowerWord === 'i') {
      word = 'I';
    } else if (lowerWord === 'im') {
      word = "I'm";
    } else if (lowerWord === 'ive') {
      word = "I've";
    } else if (lowerWord === 'id') {
      word = "I'd";
    } else if (lowerWord === 'ill') {
      word = "I'll";
    } else if (holyWords.has(lowerWord)) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }

    if (capitalizeNext) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
      capitalizeNext = false;
    }

    // Insert natural punctuation marks at common conjunction & pronoun transition terms
    const isTransitionWord = ['but', 'then', 'therefore', 'thus', 'when', 'if', 'he', 'she', 'they', 'we', 'you', 'now', 'so', 'today', 'welcome'].includes(lowerWord);
    const currentSentenceLength = formattedWords.length - (formattedWords.lastIndexOf('.') + 1);

    if (i > 0 && isTransitionWord && currentSentenceLength > 11) {
      const prevIdx = formattedWords.length - 1;
      if (prevIdx >= 0 && !/[.!?]$/.test(formattedWords[prevIdx])) {
        formattedWords[prevIdx] = formattedWords[prevIdx] + '.';
      }
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }

    formattedWords.push(word);

    if (/[.!?]$/.test(word)) {
      capitalizeNext = true;
    }
  }

  // Group text into comfortable paragraph segments
  const rebuiltText = formattedWords.join(' ');
  const sentences = rebuiltText.split(/(?<=[.!?])\s+/);
  
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];

  sentences.forEach((sentence, sIdx) => {
    currentParagraph.push(sentence);
    if (currentParagraph.length >= 4 || sIdx === sentences.length - 1) {
      paragraphs.push(currentParagraph.join(' '));
      currentParagraph = [];
    }
  });

  const parsedTitle = `# ${title}`;
  const introBlock = `### Devotional Reflection
*Formatted instantly with the offline Pradeep reader*`;

  return [
    parsedTitle,
    introBlock,
    '---',
    ...paragraphs.map(p => p.trim())
  ].join('\n\n');
}

async function processVideo(id: string, title: string, url: string, force = false): Promise<boolean> {
  const outputPath = path.join(TRANSCRIPT_DIR, `${id}.json`);
  
  // Skip if already processed
  if (!force && fs.existsSync(outputPath)) {
    console.log(`⏩ [Skipping] Transcript already exists for: "${title}" (ID: ${id})`);
    return true;
  }

  console.log(`\n⏳ [Processing] "${title}" (ID: ${id})...`);
  let rawText = '';
  let segments: TranscriptSegment[] = [];

  try {
    console.log(`  Downloading captions track from YouTube...`);
    segments = await YoutubeTranscript.fetchTranscript(id);
    if (!segments || segments.length === 0) {
      throw new Error('No transcript segments returned.');
    }
    
    rawText = segments.map(s => s.text).join(' ');
    console.log(`  Successfully fetched ${segments.length} lines. Word count is approx ${rawText.split(' ').length}.`);
  } catch (error: any) {
    console.error(`  ❌ Error fetching transcript from YouTube:`, error?.message || error);
    console.log(`  💡 Tip: Datacenter IP addresses (like this sandbox environment) are heavily rate-limited by YouTube bot detection.`);
    console.log(`     You can run this exact script locally on your PC (npx tsx download-transcripts.ts) where residential IP is completely unrestricted!`);
    
    // We'll return false, but we won't crash so other parts can run or be inspected
    return false;
  }

  try {
    // Format the raw transcript text locally
    const formattedMarkdown = formatTranscriptLocally(title, rawText);
    
    const wordCount = formattedMarkdown.split(/\s+/).length;
    
    const outputData: ProcessedTranscript = {
      id,
      title,
      url,
      formattedMarkdown,
      rawText,
      wordCount,
      processedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
    console.log(`  🎉 [SUCCESS] Saved formatted transcript to: ${outputPath} (${wordCount} words)`);
    return true;
  } catch (formattingError: any) {
    console.error(`  ❌ Formatting Error:`, formattingError?.message || formattingError);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const runAll = args.includes('--all');

  console.log('=====================================================');
  console.log('   🕊️  SPIRITUAL TRANSCRIPT DOWNLOADER & FORMATTER  🕊️');
  console.log('=====================================================');

  if (!fs.existsSync(VIDEOS_JSON_PATH)) {
    console.error(`Error: videos.json metadata file not found at ${VIDEOS_JSON_PATH}`);
    process.exit(1);
  }

  const videos: any[] = JSON.parse(fs.readFileSync(VIDEOS_JSON_PATH, 'utf-8'));
  console.log(`Loaded ${videos.length} video references from metadata.`);

  // Parse specified target video IDs
  let selectedIds: string[] = [];

  // Check for --ids flag
  const idsIndex = args.indexOf('--ids');
  if (idsIndex !== -1 && args[idsIndex + 1]) {
    selectedIds = args[idsIndex + 1].split(',').map(s => s.trim()).filter(Boolean);
  }

  // Also assume any other non-dashed argument (unless it is the value for --ids) is a video ID
  const nonFlags = args.filter((arg, idx) => {
    if (arg.startsWith('--')) return false;
    if (idsIndex !== -1 && idx === idsIndex + 1) return false;
    return true;
  });

  if (nonFlags.length > 0) {
    selectedIds = [...selectedIds, ...nonFlags];
  }

  // Deduplicate video IDs
  selectedIds = [...new Set(selectedIds)];

  if (selectedIds.length > 0) {
    console.log(`🎯 Processing ${selectedIds.length} selected video(s): ${selectedIds.join(', ')}`);
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < selectedIds.length; i++) {
      const id = selectedIds[i];
      const video = videos.find(v => v.id === id);
      if (!video) {
        console.error(`⚠️  Warning: Video with ID "${id}" was not found in videos.json. Skipping.`);
        failureCount++;
        continue;
      }

      const success = await processVideo(video.id, video.title, video.url, true); // force process selected ones
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }

      if (i < selectedIds.length - 1) {
        console.log('Waiting 3 seconds before next request...');
        await delay(3000);
      }
    }

    console.log('\n================ SELECTED VIDEOS SUMMARY ================');
    console.log(`- Successfully Processed: ${successCount}`);
    console.log(`- Failed / Blocked: ${failureCount}`);
    console.log('=========================================================');
  } else {
    // Processing multiple videos
    console.log('Running in batch mode. Checking for missing transcripts...');
    let successCount = 0;
    let failureCount = 0;
    let skipCount = 0;

    // To be conservative and avoid hitting quotas too quickly, let's limit batch size
    // Users can run multiple times or pass --all
    const limit = runAll ? videos.length : 3; // Limit to 3 videos per standard run to inspect & prevent infinite loops / quotas

    console.log(`Processing up to ${limit} videos. Run with "npx tsx download-transcripts.ts --all" to process entire library.`);

    let processedCount = 0;
    for (const video of videos) {
      const outputPath = path.join(TRANSCRIPT_DIR, `${video.id}.json`);
      if (fs.existsSync(outputPath)) {
        skipCount++;
        continue;
      }

      if (processedCount >= limit) {
        break;
      }

      const success = await processVideo(video.id, video.title, video.url, force);
      if (success) {
        successCount++;
      } else {
        failureCount++;
        if (failureCount >= 3) {
          console.warn('\n🛑 Hitting multiple transcript failures (3 attempts failed).');
          console.warn('   YouTube is likely blocking automated requests in this environment or transcripts are disabled.');
          console.warn('   Stopping batch run early to prevent hanging. Proceeding to save what we have...');
          break;
        }
      }
      processedCount++;

      // Polite delay between downloads
      if (processedCount < limit) {
        console.log('Waiting 3 seconds before next request...');
        await delay(3000);
      }
    }

    console.log('\n================ BATCH SUMMARY ================');
    console.log(`- Already Cached / Skipped: ${skipCount}`);
    console.log(`- Successfully Processed: ${successCount}`);
    console.log(`- Failed / Blocked by YouTube: ${failureCount}`);
    console.log('================================================');
    if (failureCount > 0) {
      console.log('💡 TIP: YouTube blocks datacenter servers from scraping captions.');
      console.log('   Run: "npx tsx download-transcripts.ts --all" on your normal HOME/OFFICE PC to fetch all of them instantly!');
    }
  }

  // Update registry file of all available transcripts
  updateAvailableTranscripts();
}

function updateAvailableTranscripts() {
  if (!fs.existsSync(TRANSCRIPT_DIR)) {
    return;
  }
  try {
    const files = fs.readdirSync(TRANSCRIPT_DIR);
    const ids = files
      .filter(f => f.endsWith('.json') && f !== 'available.json')
      .map(f => f.replace('.json', ''));
    
    fs.writeFileSync(path.join(TRANSCRIPT_DIR, 'available.json'), JSON.stringify(ids, null, 2), 'utf-8');
    console.log(`📝 Successfully updated available.json with ${ids.length} transcripts!`);
  } catch (err: any) {
    console.error('Failed to update available.json registry:', err.message);
  }
}

main().catch(error => {
  console.error('Fatal initialization error:', error);
});
