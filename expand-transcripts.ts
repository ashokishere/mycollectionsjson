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

  const prompt = `You are an expert spiritual scribe for Self-Realization Fellowship (SRF) / YSS founded by Paramahansa Yogananda.
Generate an EXHAUSTIVE, UNABRIDGED, and extremely detailed transcript / discourse text for this 2026 Convocation talk:

Video Title: "${item.title}"
Speaker: "${item.speaker}"
YouTube ID: "${item.id}"

INSTRUCTIONS:
1. Capture ALL spiritual notes, teachings, stories, parables, quotes by Paramahansa Yogananda, and practical instructions given by ${item.speaker} without omitting ANY details or messages.
2. The transcript must be comprehensive and long (target word count: 2200 to 3200 words). Include all sections, opening prayers, core teachings, stories, guided visualization, affirmations, and closing blessings.
3. Every story, parable, or analogy MUST be highlighted with bold title markers and a story prefix (e.g., "**Story • <Brief Title>**\\n\\nStory: <Full detailed story text>").
4. Formatted in structured Markdown (# Header, ### Section, bullet points).
5. Return in strict JSON format:
{
  "id": "${item.id}",
  "title": "${item.title}",
  "url": "https://www.youtube.com/watch?v=${item.id}",
  "formattedMarkdown": "<full markdown discourse>",
  "rawText": "<raw plain text>",
  "wordCount": <word count>,
  "processedAt": "${new Date().toISOString()}"
}`;

  while (attempt < maxAttempts) {
    attempt++;
    console.log(`\n⏳ Generating detailed transcript for: "${item.title}" (${item.speaker}) [Attempt ${attempt}/${maxAttempts}]...`);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const jsonText = response.text?.trim();
      if (!jsonText) throw new Error("Empty response");

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
  for (const item of targets) {
    await generateTranscript(item);
  }
  
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
