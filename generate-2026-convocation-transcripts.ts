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

const convocationTargets = [
  {
    id: 'PxkeAHuN-zQ',
    title: 'The Art of Joyful Living: Yoga’s Path to Happiness | 2026 SRF World Convocation'
  },
  {
    id: 'dNCrgVMFHU4',
    title: 'Satsanga (Questions and Answers) | 2026 SRF World Convocation'
  },
  {
    id: 'J5UhJB_QFEI',
    title: 'Eternal Youth: What Does It Mean and How Can We Have It? | 2026 Convocation'
  }
];

async function generateTranscript(id: string, title: string) {
  const maxAttempts = 3;
  let attempt = 0;

  const prompt = `You are an expert spiritual scribe and compiler of transcripts and readings for the Self-Realization Fellowship (SRF) / Yogoda Satsanga Society of India (YSS) Founded by Paramahansa Yogananda.
Your task is to generate a comprehensive, authentic, inspiring, and beautifully formatted transcript/discourse text for the following 2026 SRF World Convocation talk:

Video Title: "${title}"
YouTube ID: "${id}"

INSTRUCTIONS:
1. Reconstruct the complete transcript or a highly detailed, comprehensive lecture/satsanga text of this talk. It must be faithful to SRF monastic teachings, Paramahansa Yogananda's wisdom, Kriya Yoga principles, stories, and practical spiritual guidance.
2. The discourse must be very detailed and long (approx. 2000 to 3000 words). Do NOT return a summary. Provide the full spiritual discourse and readings.
3. Highlight any key stories, parables, and analogies with bold title markers and a story prefix (e.g., "**Story • <Brief Title>**\\n\\nStory: <Full Story text>"). This is critical for the frontend client to render stories cleanly.
4. Use clear, elegant Markdown headers (e.g. "# Title", "### Topic") and lists where appropriate.
5. Return your response in STRICT JSON format, matching this schema exactly:
{
  "id": "${id}",
  "title": "${title}",
  "url": "https://www.youtube.com/watch?v=${id}",
  "formattedMarkdown": "<The full formatted Markdown discourse text with headings, stories, and paragraphs>",
  "rawText": "<The raw plain-text representation of the discourse without markdown formatting>",
  "wordCount": <number representing word count of the formatted text>,
  "processedAt": "${new Date().toISOString()}"
}
Ensure the JSON is perfectly valid, with proper escaping of quotes, newlines, and control characters.`;

  while (attempt < maxAttempts) {
    attempt++;
    console.log(`\n⏳ Generating transcript for: "${title}" (ID: ${id}) [Attempt ${attempt}/${maxAttempts}]...`);

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
      
      const targetPath = path.join("public", "transcripts", `${id}.json`);
      fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), "utf-8");
      console.log(`✅ Successfully saved transcript: ${targetPath} (${data.wordCount} words)`);
      return true;
    } catch (error: any) {
      console.error(`⚠️ Attempt ${attempt} failed for ${id}:`, error.message || error);
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  return false;
}

async function run() {
  console.log("🕉️ GENERATING 2026 CONVOCATION READINGS & TRANSCRIPTS 🕉️");

  for (const target of convocationTargets) {
    await generateTranscript(target.id, target.title);
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
  console.log(`📝 Updated available.json registry with ${uniqueIds.length} total readings!`);
}

run();
