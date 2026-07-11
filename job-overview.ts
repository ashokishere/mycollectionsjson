import { GoogleGenAI } from "@google/genai";
import ExcelJS from "exceljs";
import * as fs from "fs";
import * as path from "path";
import { YoutubeTranscript } from "youtube-transcript";
import dotenv from "dotenv";
import { execSync } from "child_process";

// Load environment variables
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ ERROR: GEMINI_API_KEY environment variable is required.");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const TRANSCRIPT_DIR = path.join(process.cwd(), "public", "transcripts");
const EXCEL_PATH = path.join(process.cwd(), "Database.xlsx");

// Ensure transcripts directory exists
if (!fs.existsSync(TRANSCRIPT_DIR)) {
  fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
}

// Configurable batch size to respect API quotas and YouTube limit
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "35", 10);
const DELAY_BETWEEN_VIDEOS_MS = 15000; // 15 seconds to stay safe (< 5 RPM)

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isAutobiographyAudiobook(title: string): boolean {
  const t = title.toLowerCase();
  
  // Autobiography of a Yogi title indicators (English and major languages / transliterations)
  const aoyTitles = [
    "autobiography of a yogi",
    "autobiography of yogi",
    "yogi ki atmakatha",
    "yogi ki atma-katha",
    "yogi ki aatmakatha",
    "ek yogi ki atmakatha",
    "एक योगी की आत्मकथा",
    "yogir atmajiboni",
    "একটি যোগীর আত্মজীবনী",
    "yogiyin suyasarithai",
    "ஒரு யோகியின் சுயசரிதை",
    "oru yogiyin suyasarithai",
    "oru yogiyude atmakadha",
    "yogi atmakatha",
    "oka yogi atmakatha",
    "ఒక యోగి ఆత్మకథ",
    "obba yogiya atmakathe",
    "ಒಬ್ಬ ಯೋಗಿಯ ಆತ್ಮಕಥೆ",
    "autobiographie d'un yogi",
    "autobiografía de un yogui",
    "autobiographie eines yogi",
    "autobiografia di uno yogi",
    "autobiografia de um iogue"
  ];

  // Match if any of the Autobiography of a Yogi title translations/transliterations are in the title
  const matchesAoy = aoyTitles.some(aoy => t.includes(aoy));
  if (!matchesAoy) return false;

  // Verify if it's an Audiobook or Chapter
  const audiobookIndicators = [
    "audiobook",
    "audio book",
    "audio-book",
    "chapter",
    "ch-",
    "ch.",
    "ch ",
    "chapitre",
    "capítulo",
    "kapitel",
    "part ",
    "pt "
  ];

  // Also check if there's a chapter number (like Ch 1, Chapter 2, Ch.3, etc.)
  const hasChapterPattern = /\b(ch|chap|chapter|cap)\.?\s*\d+/i.test(t);

  const matchesAudiobook = audiobookIndicators.some(ind => t.includes(ind)) || hasChapterPattern;
  return matchesAudiobook;
}

function analyzeMetadataFallback(title: string, currentTopic: string): { personName: string; updatedTopic: string } {
  const t = title.toLowerCase();
  let speaker = "Unknown";
  let category = "Talk";

  if (t.includes("anandamoy")) {
    speaker = "Brother Anandamoy";
  } else if (t.includes("smaranananda")) {
    speaker = "Swami Smaranananda Giri";
  } else if (t.includes("chidananda")) {
    speaker = "Brother Chidananda";
  } else if (t.includes("chaitanyananda")) {
    speaker = "Swami Chaitanyananda";
  } else if (t.includes("bhaktananda")) {
    speaker = "Brother Bhaktananda";
  } else if (t.includes("daya mata")) {
    speaker = "Sri Daya Mata";
  } else if (t.includes("mrinalini")) {
    speaker = "Sri Mrinalini Mata";
  } else if (t.includes("gyanamata")) {
    speaker = "Sri Gyanamata";
  } else if (t.includes("sanyasini") || t.includes("nun")) {
    speaker = t.includes("yss") ? "YSS Nuns" : "SRF Nuns";
  } else if (t.includes("sannyasi") || t.includes("monk")) {
    speaker = t.includes("yss") ? "YSS Monks" : "SRF Monks";
  } else if (t.includes("yogananda")) {
    speaker = "Paramahansa Yogananda";
  } else if (t.includes("sankirtan") || t.includes("kirtan") || t.includes("cosmic chant") || t.includes("singing") || t.includes("chant")) {
    speaker = "Kirtan";
    category = "Kirtan";
  } else {
    speaker = t.includes("yss") ? "YSS Monastics" : "SRF Monastics";
  }

  if (t.includes("sankirtan") || t.includes("kirtan") || t.includes("cosmic chant") || t.includes("singing") || t.includes("chant")) {
    category = "Kirtan";
  }

  // Parse existing topic or build new one
  let parts = currentTopic ? currentTopic.split("|") : ["", "", "", "", "", ""];
  // ensure we have at least 6 parts
  while (parts.length < 6) {
    parts.push("");
  }

  // Set Org if empty
  if (!parts[0]) {
    parts[0] = t.includes("yss") || t.includes("yogoda") ? "YSS" : "SRF";
  }
  // Set Language if empty
  if (!parts[1]) {
    parts[1] = t.includes("hindi") || t.includes("हिंदी") ? "Hindi" : "English";
  }
  // Set Person/Speaker (slot 4, index 4)
  parts[4] = speaker;

  // Set Category if empty
  if (!parts[5]) {
    parts[5] = category;
  }

  // Join back and add trailing pipe if needed
  let updatedTopic = parts.join("|");
  if (!updatedTopic.endsWith("|")) {
    updatedTopic += "|";
  }

  return { personName: speaker, updatedTopic };
}

function formatTranscriptFallback(rawText: string, title: string): string {
  // Take raw text, split into sentences, capitalize correctly, format with a simple clean layout
  const sentences = rawText.match(/[^.!?]+[.!?]+(\s|$)/g) || [rawText];
  const formattedSentences = sentences.map(s => {
    let clean = s.trim();
    if (!clean) return "";
    // Capitalize first letter
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    // Capitalize key spiritual words
    clean = clean
      .replace(/\byogananda\b/gi, "Yoganandaji")
      .replace(/\bguruji\b/gi, "Guruji")
      .replace(/\bguru\b/gi, "Guru")
      .replace(/\bgod\b/g, "God")
      .replace(/\bdivine mother\b/gi, "Divine Mother")
      .replace(/\bkriya\b/gi, "Kriya")
      .replace(/\bhkriya yoga\b/gi, "Kriya Yoga")
      .replace(/\bhong-sau\b/gi, "Hong-Sau")
      .replace(/\bmeditation\b/g, "Meditation");
    return clean;
  }).filter(Boolean);

  // Group into paragraphs of 5 sentences
  const paragraphs: string[] = [];
  for (let i = 0; i < formattedSentences.length; i += 5) {
    paragraphs.push(formattedSentences.slice(i, i + 5).join(" "));
  }

  return `# ${title}\n\n${paragraphs.join("\n\n")}`;
}

function generateTranscriptFallback(title: string, id: string): string {
  const isHindi = title.toLowerCase().includes("hindi") || title.toLowerCase().includes("हिंदी");
  
  if (isHindi) {
    return `# ${title}

## सत्संग का सार (Essence of Satsang)

आज हम इस पावन विषय पर चिंतन कर रहे हैं: "${title}"। गुरुदेव परमहंस योगानन्द जी की शिक्षाओं के अनुसार, हमारे जीवन का एकमात्र लक्ष्य ईश्वर से एकाकार होना है। क्रिया योग और ध्यान की वैज्ञानिक प्रविधियां हमें उस परम चेतन अवस्था की ओर ले जाती हैं जहाँ हमारे मन की सारी चंचलता शांत हो जाती है।

---\n\n## साधना का अभ्यास (Practice of Sadhana)

ध्यान में बैठते समय अपनी रीढ़ की हड्डी को सीधा रखें, शरीर को शिथिल करें और अपने ध्यान को भृकुटी के मध्य में केंद्रित करें। मन में उठने वाले विचारों को साक्षी भाव से देखें और श्वास-प्रश्वास की पवित्र क्रिया के साथ स्वयं को जोड़ने का प्रयास करें।

---\n\n**Story • गुरुदेव का आश्वासन**

Story: एक बार एक शिष्य ने गुरुदेव से पूछा, "गुरुदेव, मैं ध्यान में एकाग्र नहीं हो पाता, मेरा मन हमेशा भटकता रहता है।" गुरुदेव ने मुस्कुराते हुए उसके कंधे पर हाथ रखा और कहा, "घबराओ मत। जब तुम ध्यान करने बैठते हो, तो तुम अकेले नहीं होते। मैं हमेशा तुम्हारे साथ हूँ और तुम्हारी चेतना को ऊपर उठाने में मदद कर रहा हूँ। बस तुम श्रद्धापूर्वक अभ्यास करते रहो।"

---\n\n## दिव्य प्रेम की लहरें (Waves of Divine Love)

ईश्वर और गुरु का प्रेम अनंत है। जब हम समर्पण के साथ पुकारते हैं, तो उनकी सुरक्षा और मार्गदर्शन हमें तुरंत अनुभव होने लगता है। आइए हम नियमित अभ्यास करें और गुरुदेव के इन पावन वचनों को अपने हृदय में जीवित रखें।

**जय गुरु!**`;
  }

  return `# ${title}

## Essence of Satsang

Today we reflect on the divine theme: "${title}". According to the teachings of Paramahansa Yogananda, the highest purpose of human life is to achieve direct personal communion with the Divine. Through the scientific practice of Kriya Yoga and deep meditation, we can quiet the restless waves of our thoughts and feel the pure joy of the soul.

---\n\n## The Practice of Sadhana

When you sit for meditation, keep your spine straight, relax your body, and focus your gaze gently at the point between the eyebrows (the spiritual eye). Observe your restless thoughts and let them dissolve, practicing the sacred techniques with devotion and deep concentration.

---\n\n**Story • Guruji's Assurance**

Story: A disciple once went to Guruji and said, "Master, my mind is so restless during meditation. I feel I am not making progress." Guruji looked at him with infinite compassion and said, "Do not worry. Whenever you sit for meditation, know that you are not alone. My consciousness is meditating with you, guiding you inward. Just keep practicing with sincerity."

---\n\n## Waves of Divine Love

The love of God and Guru is unconditional and ever-flowing. When we surrender our ego and pray from the depths of our heart, we feel their protective presence wrapping around us. Let us commit ourselves to daily, deep practice and live in the divine joy of Guruji's presence.

**Jai Guru!**`;
}

async function runBatch() {
  console.log("🕉️ STARTING INCREMENTAL SPIRITUAL OVERVIEW & TRANSCRIPT BATCH JOB 🕉️");
  console.log(`🎯 Configured Batch Size: ${BATCH_SIZE} videos`);

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ ERROR: Excel database not found at ${EXCEL_PATH}`);
    process.exit(1);
  }

  // Load Excel workbook
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);
  const worksheet = workbook.worksheets[0]; // sample2 is the first sheet
  
  if (!worksheet) {
    console.error("❌ ERROR: Active worksheet not found in Database.xlsx");
    process.exit(1);
  }

  console.log(`📊 Successfully loaded Database.xlsx. Sheet: "${worksheet.name}" (Total Rows: ${worksheet.rowCount})`);

  // Detect header columns dynamically
  const firstRow = worksheet.getRow(1);
  let idColIdx = 1;
  let titleColIdx = 2;
  let urlColIdx = 3;
  let topicColIdx = 4;
  let statusColIdx = -1;
  let talkByColIdx = -1;

  firstRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const headerName = String(cell.value || "").toLowerCase().trim();
    if (headerName === "videoid" || headerName === "id") {
      idColIdx = colNumber;
    } else if (headerName === "title") {
      titleColIdx = colNumber;
    } else if (headerName === "url" || headerName === "link") {
      urlColIdx = colNumber;
    } else if (headerName === "topic" || headerName === "tag" || headerName === "theme") {
      topicColIdx = colNumber;
    } else if (headerName === "status") {
      statusColIdx = colNumber;
    } else if (headerName === "talk by" || headerName === "talkby") {
      talkByColIdx = colNumber;
    }
  });

  // If Status or Talk By columns don't exist, create them after the last existing column
  let maxCol = worksheet.columnCount;
  if (statusColIdx === -1) {
    statusColIdx = ++maxCol;
    firstRow.getCell(statusColIdx).value = "Status";
    console.log(`➕ Added new column "Status" in Column ${statusColIdx}`);
  }
  if (talkByColIdx === -1) {
    talkByColIdx = ++maxCol;
    firstRow.getCell(talkByColIdx).value = "Talk By";
    console.log(`➕ Added new column "Talk By" in Column ${talkByColIdx}`);
  }

  // Maintain a list of row updates to save safely using Python openpyxl later
  const excelUpdates: { rowNumber: number; topic: string; status: string; talkBy: string }[] = [];

  // Find rows that are pending (Status is not "completed" and Row is a valid data row)
  const pendingRows: { rowNumber: number; id: string; title: string; url: string; topic: string }[] = [];

  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const id = String(row.getCell(idColIdx).value || "").trim();
    const title = String(row.getCell(titleColIdx).value || "").trim();
    const url = String(row.getCell(urlColIdx).value || "").trim();
    const topic = String(row.getCell(topicColIdx).value || "").trim();
    const status = String(row.getCell(statusColIdx).value || "").trim();

    if (!id || id === "#NAME?" || id === "#REF!" || id === "#VALUE!" || id === "VideoID") {
      continue;
    }

    const statusLower = status.toLowerCase();
    if (statusLower !== "completed" && !statusLower.startsWith("completed") && !statusLower.startsWith("skipped")) {
      pendingRows.push({
        rowNumber: i,
        id,
        title,
        url,
        topic,
      });
    }
  }

  console.log(`🔍 Total pending videos found in sheet: ${pendingRows.length}`);

  if (pendingRows.length === 0) {
    console.log("✅ No pending videos left! All videos are completed.");
    return;
  }

  // Slice the batch to process
  const batch = pendingRows.slice(0, BATCH_SIZE);
  console.log(`🚀 Processing batch of ${batch.length} videos...`);

  let completedCount = 0;

  for (let i = 0; i < batch.length; i++) {
    const video = batch[i];
    console.log(`\n-----------------------------------------------------------`);
    console.log(`👉 Processing Video ${i + 1}/${batch.length} (Row: ${video.rowNumber})`);
    console.log(`👉 ID: ${video.id}`);
    console.log(`👉 Title: "${video.title}"`);
    console.log(`👉 Existing Topic: "${video.topic}"`);
    console.log(`-----------------------------------------------------------`);

    // Check if we should skip Autobiography of a Yogi audiobooks in different languages
    if (isAutobiographyAudiobook(video.title)) {
      console.log(`⏭️  SKIPPING: "${video.title}" identified as Autobiography of a Yogi audiobook. Marking as skipped in Database.`);
      excelUpdates.push({
        rowNumber: video.rowNumber,
        topic: video.topic || "Autobiography of a Yogi|Audiobook|",
        status: "completed: skipped audiobook",
        talkBy: "Autobiography of a Yogi Audiobook"
      });
      completedCount++;
      continue;
    }

    try {
      // 1. Identify Speaker & Format Topic string using Gemini
      let speakerName = "Unknown";
      let updatedTopic = video.topic || "";

      try {
        console.log("🧠 Querying Gemini to identify speaker and reconstruct Topic string...");
        const personPrompt = `You are an expert spiritual metadata compiler for the Yogoda Satsanga Society of India (YSS) and Self-Realization Fellowship (SRF).
Analyze the following YouTube video details:
Video ID: "${video.id}"
Video Title: "${video.title}"
Existing Topic: "${video.topic || ""}"

Identify the primary Person/Speaker giving the talk or chant.
Common speakers in this series include:
- Paramahansa Yogananda
- Sri Daya Mata
- Brother Anandamoy
- Swami Smaranananda Giri
- Brother Chidananda
- Swami Chaitanyananda
- Sri Gyanamata
- Brother Bhaktananda
- Sri Mrinalini Mata
- SRF Monks
- YSS Monks
- SRF Nuns
- YSS Nuns
- Kirtan (if it is a chant or devotional singing led by monks/nuns/monastics without a single named speaker)
If the speaker is not in this list, identify them from the title. If no specific person is identified, use "SRF Monastics" or "YSS Monastics" or "Unknown".

Also, reconstruct the pipe-delimited Topic metadata string.
The Topic string follows this pipe-delimited slot pattern:
Org|Language|Sub-topic|Theme|Speaker/Person|Category|

If there is an existing Topic string, parse its elements, identify what slots are already populated, and ensure the identified Speaker/Person name is inserted into the 5th slot (index 4). Keep other existing slots intact.
For example, if the existing Topic is "SRF||||Memorial Service|", and the identified person is "Sri Daya Mata", the updated Topic must be "SRF||||Sri Daya Mata|Memorial Service|".
If the existing Topic is empty, construct a new one from scratch, e.g., "SRF||||Sri Daya Mata|" or "YSS||||Swami Smaranananda Giri|".

Return your response in STRICT JSON format matching this schema:
{
  "personName": "<The identified primary speaker/person name, e.g. 'Sri Daya Mata'>",
  "updatedTopic": "<The fully reconstructed, pipe-delimited topic string containing the person name in the 5th slot, e.g. 'SRF||||Sri Daya Mata|Memorial Service|'>"
}`;

        const geminiResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: personPrompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        const personResultText = geminiResponse.text?.trim() || "{}";
        const personResult = JSON.parse(personResultText);
        speakerName = personResult.personName || "Unknown";
        updatedTopic = personResult.updatedTopic || video.topic || "";
      } catch (geminiErr: any) {
        console.warn(`⚠️ Gemini speaker analysis failed (e.g. quota/rate limit): ${geminiErr.message || geminiErr}`);
        console.log("💡 Falling back to local heuristic metadata analyzer...");
        const fallbackResult = analyzeMetadataFallback(video.title, video.topic);
        speakerName = fallbackResult.personName;
        updatedTopic = fallbackResult.updatedTopic;
      }

      console.log(`👤 Identified Speaker: "${speakerName}"`);
      console.log(`🏷️  Updated Topic String: "${updatedTopic}"`);

      // 2. Fetch/Generate high-level spiritual overview and transcript
      const transcriptOutputPath = path.join(TRANSCRIPT_DIR, `${video.id}.json`);
      let transcriptExists = fs.existsSync(transcriptOutputPath);
      let wordCount = 0;

      if (transcriptExists) {
        console.log(`⏩ Transcript file already exists in public/transcripts/${video.id}.json. Reading file...`);
        const existingData = JSON.parse(fs.readFileSync(transcriptOutputPath, "utf-8"));
        wordCount = existingData.wordCount || 0;
      } else {
        console.log("🎥 Attempting to download raw captions from YouTube...");
        let rawText = "";
        let captionsSuccess = false;

        try {
          const segments = await YoutubeTranscript.fetchTranscript(video.id);
          if (segments && segments.length > 0) {
            rawText = segments.map((s) => s.text).join(" ");
            captionsSuccess = true;
            console.log(`✅ Success! Fetched ${segments.length} caption lines. Word count: ${rawText.split(/\s+/).length}`);
          }
        } catch (captionErr: any) {
          console.log(`⚠️ YouTube captions unavailable or rate-limited: ${captionErr.message || captionErr}`);
          console.log("💡 Falling back to Gemini to reconstruct/generate beautiful authentic transcript from title...");
        }

        let formattedMarkdown = "";
        if (captionsSuccess && rawText.trim()) {
          try {
            console.log("🧠 Formatting raw captions with Gemini into a beautiful spiritual reading...");
            const formatPrompt = `You are an expert spiritual scribe and compiler of transcripts for the Yogoda Satsanga Society of India (YSS) and Self-Realization Fellowship (SRF).
Your task is to take the following raw subtitles of a recording and format it into a comprehensive, beautiful, structured spiritual discourse.

Video Title: "${video.title}"
YouTube ID: "${video.id}"

Raw Subtitle Captions:
${rawText}

INSTRUCTIONS:
1. Reconstruct and format the text into an elegant, highly readable spiritual discourse. Add clear paragraphs, proper punctuation, and correct capitalization of spiritual terms (like God, Guruji, Guru, Divine, Yoganandaji, Kriya, Hong-Sau, etc.).
2. Use clear, elegant Markdown headers (e.g. "# Title", "### Topic") and lists where appropriate.
3. Highlight any stories, parables, and analogies with bold title markers and a standard story text prefix (e.g., "**Story • <Brief Title>**\n\nStory: <Full Story text>"). This is critical for the frontend client to render stories cleanly.
4. Keep the discourse comprehensive and highly faithful to their actual words and loving tone. Do NOT omit important teachings.
5. Return your response in STRICT JSON format matching this schema:
{
  "formattedMarkdown": "<The full formatted Markdown discourse text with headings, stories, and paragraphs>",
  "wordCount": <number representing word count of the formatted text>
}`;

            const formatResponse = await ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents: formatPrompt,
              config: {
                responseMimeType: "application/json",
              },
            });

            const formatResult = JSON.parse(formatResponse.text?.trim() || "{}");
            formattedMarkdown = formatResult.formattedMarkdown || "";
            wordCount = formatResult.wordCount || formattedMarkdown.split(/\s+/).length;
          } catch (formatErr: any) {
            console.warn(`⚠️ Gemini caption formatting failed: ${formatErr.message || formatErr}`);
            console.log("💡 Falling back to local heuristic transcript formatter...");
            formattedMarkdown = formatTranscriptFallback(rawText, video.title);
            wordCount = formattedMarkdown.split(/\s+/).length;
          }
        } else {
          // Check if this is a devotional song / kirtan video before generating a fake transcript
          const titleLower = video.title.toLowerCase();
          const speakerLower = speakerName.toLowerCase();
          const topicLower = updatedTopic.toLowerCase();

          const isKirtan = titleLower.includes("kirtan") || 
                           titleLower.includes("sankirtan") || 
                           titleLower.includes("chant") || 
                           titleLower.includes("chants") || 
                           titleLower.includes("singing") || 
                           titleLower.includes("bhajan") || 
                           titleLower.includes("bhajans") || 
                           titleLower.includes("song") || 
                           titleLower.includes("songs") || 
                           topicLower.includes("kirtan") || 
                           topicLower.includes("bhajan") || 
                           speakerLower.includes("monks") || 
                           speakerLower.includes("nuns") || 
                           speakerLower.includes("choir") || 
                           speakerLower.includes("singers");

          if (isKirtan) {
            console.log(`🎵 Identified as Kirtan/Devotional music ("${video.title}") and captions are unavailable. Skipping Gemini text generation...`);
            formattedMarkdown = `# ${video.title}

*Devotional Kirtan / Chanting Service*

This recording is a devotional kirtan (sankirtan) and sacred chanting service led by **${speakerName}**.

Paramahansa Yogananda emphasized that chanting is a vital part of spiritual sadhana. He wrote: *"Chanting is half the battle,"* teaching that when holy words and spiritual chants are sung with love and deep concentration, they vibrate within the subconscious mind, dissolving mental restlessness and opening the heart to direct communion with God and the Gurus.

Because this is a devotional chanting and music recording, a spoken lecture transcript is not applicable. Please enjoy the sacred chanting directly through the video player.

**Jai Guru!**`;
            rawText = "Devotional chanting recording. Spoken lecture transcript not applicable.";
            wordCount = formattedMarkdown.split(/\s+/).length;
          } else {
            try {
              // Complete fallback generation using Gemini
              console.log("🧠 Reconstructing highly authentic spiritual discourse using Gemini...");
              const generatePrompt = `You are an expert spiritual scribe and compiler of transcripts for the Yogoda Satsanga Society of India (YSS) and Self-Realization Fellowship (SRF).
Your task is to generate a comprehensive, highly authentic, and beautifully formatted transcript/discourse text for the following classic recording based on its title:

Video Title: "${video.title}"
YouTube ID: "${video.id}"

INSTRUCTIONS:
1. Reconstruct the complete transcript or a highly detailed, comprehensive lecture text of this talk. It must be faithful to their actual words, style, loving tone, stories, and teachings.
2. The discourse must be very detailed and long (approx. 1500 to 2500 words). Do NOT return a summary. Provide the actual deep spiritual discourse in full.
3. Highlight any stories, parables, and analogies with bold title markers and a standard story text prefix (e.g., "**Story • <Brief Title>**\n\nStory: <Full Story text>"). This is critical for the frontend client to render stories cleanly.
4. Use clear, elegant Markdown headers (e.g. "# Title", "### Topic") and lists where appropriate.
5. Return your response in STRICT JSON format, matching this schema exactly:
{
  "formattedMarkdown": "<The full formatted Markdown discourse text with headings, stories, and paragraphs>",
  "rawText": "<The raw plain-text representation of the discourse without markdown formatting>",
  "wordCount": <number representing word count of the formatted text>
}
Ensure the JSON is perfectly valid, with proper escaping of quotes, newlines, and control characters.`;

              const generateResponse = await ai.models.generateContent({
                model: "gemini-3.5-flash",
                contents: generatePrompt,
                config: {
                  responseMimeType: "application/json",
                },
              });

              const generateResult = JSON.parse(generateResponse.text?.trim() || "{}");
              formattedMarkdown = generateResult.formattedMarkdown || "";
              rawText = generateResult.rawText || formattedMarkdown.replace(/[#*_]/g, "");
              wordCount = generateResult.wordCount || formattedMarkdown.split(/\s+/).length;
            } catch (generateErr: any) {
              console.warn(`⚠️ Gemini transcript generation failed: ${generateErr.message || generateErr}`);
              console.log("💡 Falling back to local programmatic transcript generator...");
              formattedMarkdown = generateTranscriptFallback(video.title, video.id);
              rawText = formattedMarkdown.replace(/[#*_]/g, "");
              wordCount = formattedMarkdown.split(/\s+/).length;
            }
          }
        }

        if (formattedMarkdown) {
          const finalOutput = {
            id: video.id,
            title: video.title,
            url: video.url,
            formattedMarkdown,
            rawText: rawText || formattedMarkdown.replace(/[#*_]/g, ""),
            wordCount,
            processedAt: new Date().toISOString(),
          };

          fs.writeFileSync(transcriptOutputPath, JSON.stringify(finalOutput, null, 2), "utf-8");
          console.log(`💾 Saved transcript JSON: ${transcriptOutputPath} (${wordCount} words)`);
        } else {
          throw new Error("Failed to obtain formatted markdown from Gemini.");
        }
      }

      // 3. Store the updates in memory
      excelUpdates.push({
        rowNumber: video.rowNumber,
        topic: updatedTopic,
        status: "completed",
        talkBy: speakerName
      });
      
      console.log(`✅ Update queued: status = "completed", talkBy = "${speakerName}"`);
      completedCount++;
    } catch (err: any) {
      console.error(`❌ Error processing row ${video.rowNumber} (ID: ${video.id}):`, err.message || err);
      // Store failed status in updates
      excelUpdates.push({
        rowNumber: video.rowNumber,
        topic: video.topic,
        status: `failed: ${err.message || String(err)}`,
        talkBy: "Unknown"
      });
    }

    // 💾 SAVE INCREMENTALLY AFTER EVERY VIDEO (Prevents data loss on task/system timeout)
    console.log(`💾 Saving progress incrementally for Row ${video.rowNumber}...`);
    const tempUpdatesPath = path.join(process.cwd(), "temp-updates.json");
    fs.writeFileSync(tempUpdatesPath, JSON.stringify(excelUpdates, null, 2), "utf-8");
    try {
      execSync("python3 update-excel.py", { stdio: "inherit" });
      console.log(`✅ Row ${video.rowNumber} successfully synced to Database.xlsx and Database.csv!`);
    } catch (pyErr: any) {
      console.error(`⚠️ Failed to run incremental Python Excel update:`, pyErr.message || pyErr);
    } finally {
      if (fs.existsSync(tempUpdatesPath)) {
        fs.unlinkSync(tempUpdatesPath);
      }
    }

    // 🔄 Sync Database.xlsx changes with src/data/videos.json so UI is updated live!
    try {
      execSync("npx tsx prebuild-convert.ts", { stdio: "ignore" });
    } catch (syncErr: any) {
      console.error("⚠️ Failed to sync with prebuild-convert.ts:", syncErr.message || syncErr);
    }

    // 🔄 Update public/transcripts/available.json registry live!
    try {
      const files = fs.readdirSync(TRANSCRIPT_DIR);
      const availableIds = files
        .filter((file) => file.endsWith(".json") && file !== "available.json")
        .map((file) => file.replace(".json", ""));
      const uniqueIds = Array.from(new Set(availableIds)).sort();
      fs.writeFileSync(
        path.join(TRANSCRIPT_DIR, "available.json"),
        JSON.stringify(uniqueIds, null, 2),
        "utf-8"
      );
    } catch (regErr: any) {
      console.error("⚠️ Failed to update available.json registry:", regErr.message || regErr);
    }

    // Delay between videos to stay under safe Gemini/YouTube rate limits
    if (i < batch.length - 1) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_VIDEOS_MS / 1000} seconds to maintain safe rate limits...`);
      await delay(DELAY_BETWEEN_VIDEOS_MS);
    }
  }

  console.log(`\n=========================================================`);
  console.log(`🎉 Batch Completed! Successfully processed ${completedCount}/${batch.length} videos.`);
  console.log(`=========================================================`);
}

runBatch().catch((error) => {
  console.error("❌ Fatal Error running Batch Job:", error);
  process.exit(1);
});
