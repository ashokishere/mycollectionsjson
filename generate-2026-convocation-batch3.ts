import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY environment variable is required.");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const targets = [
  {
    id: "_eJOnf4tzZQ",
    title: "Bringing the Calmness of Meditation Into Our Relationships | 2026 SRF World Convocation",
    speaker: "Sister Karuna"
  },
  {
    id: "6atoS1XS2GA",
    title: "The Guru: Divine Friend and Guide | 2026 SRF World Convocation",
    speaker: "Brother Satyananda"
  },
  {
    id: "RrHbvpYGCjs",
    title: "Paramahansa Yogananda’s Kriya Yoga Teachings — With Brother Chidananda | 2026 SRF Convocation",
    speaker: "Brother Chidananda"
  }
];

async function generateTranscript(item: typeof targets[0]) {
  const maxAttempts = 3;
  let attempt = 0;

  const prompt = `You are an expert spiritual scribe and compiler of complete, unabridged transcripts and readings for the Self-Realization Fellowship (SRF) / Yogoda Satsanga Society of India (YSS) founded by Paramahansa Yogananda.
Your mandate is to generate a complete, exhaustive, highly detailed, authentic, and beautifully formatted transcript and discourse text for this 2026 SRF World Convocation talk:

Video Title: "${item.title}"
Speaker: "${item.speaker}"
YouTube ID: "${item.id}"

CRITICAL INSTRUCTIONS:
1. Capture ALL spiritual notes, teachings, quotes from Paramahansa Yogananda, practical meditation techniques, and insights WITHOUT omitting ANY important messages or guidance.
2. Provide a rich, exhaustive, full-length discourse text (approx. 2200 to 3500 words). Do NOT condense, summarize, or truncate.
3. Highlight every key story, parable, or analogy with clear bold title markers and a story prefix (e.g., "**Story • <Brief Title>**\\n\\nStory: <Full detailed story text>"). This enables the reading portal to extract and render stories into dedicated expandable tabs.
4. Use clear, structured Markdown headers (e.g. "# Title", "### Speaker • Self-Realization Fellowship", "### <Section Title>") and bullet lists for practical steps.
5. Return your response in STRICT JSON format matching this schema exactly:
{
  "id": "${item.id}",
  "title": "${item.title}",
  "url": "https://www.youtube.com/watch?v=${item.id}",
  "formattedMarkdown": "<The complete formatted Markdown discourse text with all headings, notes, stories, quotes, and practical guidance>",
  "rawText": "<The raw plain-text representation without markdown tags>",
  "wordCount": <number of words in formatted text>,
  "processedAt": "${new Date().toISOString()}"
}
Ensure the JSON is 100% valid, with clean escaping of quotes, control characters, and newlines.`;

  while (attempt < maxAttempts) {
    attempt++;
    console.log(`\n⏳ Generating transcript for: "${item.title}" (${item.speaker}) [Attempt ${attempt}/${maxAttempts}]...`);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const jsonText = response.text?.trim();
      if (!jsonText) {
        throw new Error("Received empty response from Gemini API.");
      }

      const data = JSON.parse(jsonText);
      if (!data.rawText && data.formattedMarkdown) {
        data.rawText = data.formattedMarkdown.replace(/[#*`_~]/g, '');
      }
      if (!data.wordCount && data.formattedMarkdown) {
        data.wordCount = data.formattedMarkdown.split(/\s+/).filter(Boolean).length;
      }

      const targetPath = path.join("public", "transcripts", `${item.id}.json`);
      fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), "utf-8");
      console.log(`✅ Saved transcript: ${targetPath} (${data.wordCount} words)`);
      return true;
    } catch (error: any) {
      console.error(`⚠️ Attempt ${attempt} failed for ${item.id}:`, error.message || error);
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  return false;
}

async function run() {
  console.log("🕉️ GENERATING EXHAUSTIVE 2026 CONVOCATION READINGS & TRANSCRIPTS (BATCH 3) 🕉️");

  for (const item of targets) {
    await generateTranscript(item);
  }

  // Update available.json registry
  const transcriptsDir = path.join("public", "transcripts");
  const files = fs.readdirSync(transcriptsDir);
  const availableIds = files
    .filter(file => file.endsWith(".json") && file !== "available.json")
    .map(file => file.replace(".json", ""));
  
  const uniqueIds = Array.from(new Set(availableIds)).sort();
  fs.writeFileSync(
    path.join(transcriptsDir, "available.json"),
    JSON.stringify(uniqueIds, null, 2),
    "utf-8"
  );
  console.log(`\n📝 Updated available.json registry with ${uniqueIds.length} total readings!`);
}

run();
