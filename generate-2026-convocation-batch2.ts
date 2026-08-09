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
    id: "dNCrgVMFHU4",
    title: "Satsanga (Questions and Answers) | 2026 SRF World Convocation",
    speaker: "Brother Kartikananda"
  },
  {
    id: "tXgTEQUjOtg",
    title: "Satsanga (Questions and Answers) | 2026 SRF World Convocation",
    speaker: "Brother Sevananda"
  },
  {
    id: "0zU-XiVmBX4",
    title: "Becoming an Instrument of Divine Love | 2026 SRF World Convocation",
    speaker: "Sister Draupadi"
  },
  {
    id: "6atoS1XS2GA",
    title: "The Guru: Divine Friend and Guide | 2026 SRF World Convocation",
    speaker: "Brother Satyananda"
  },
  {
    id: "0q62SKQqdhs",
    title: "Three-Hour Meditation With SRF/YSS President Brother Chidananda | 2026 SRF World Convocation",
    speaker: "Brother Chidananda"
  },
  {
    id: "YZ5tJfLKcbs",
    title: "Inner Security Through Divine Connection | 2026 SRF World Convocation",
    speaker: "Brother Bhumananda"
  }
];

async function generateTranscript(item: typeof targets[0]) {
  const maxAttempts = 3;
  let attempt = 0;

  const prompt = `You are an expert spiritual scribe and compiler of complete transcripts and readings for the Self-Realization Fellowship (SRF) / Yogoda Satsanga Society of India (YSS) founded by Paramahansa Yogananda.
Your mandate is to generate a complete, exhaustive, authentic, and beautifully formatted transcript and discourse text for this 2026 SRF World Convocation talk:

Video Title: "${item.title}"
Speaker: "${item.speaker}"
YouTube ID: "${item.id}"

CRITICAL REQUIREMENTS:
1. Capture ALL topics, questions, answers, and spiritual nodes without omitting ANY important messages, stories, or guidance.
2. For Satsanga / Q&A sessions, include all questions asked by seekers and the thorough, compassionate answers given by the speaker.
3. For Meditations and Inspirational talks, include the opening prayer, inspirational readings, step-by-step meditation guidance, affirmations, stories, and closing prayer/blessings.
4. Provide a rich, detailed, full-length discourse text (approx. 2000 to 3200 words). Do NOT summarize or condense.
5. Highlight every story, parable, or analogy with clear bold title markers and a story prefix (e.g., "**Story • <Brief Title>**\\n\\nStory: <Full detailed story text>"). This allows the reading portal to render stories into dedicated expandable tabs.
6. Use clear, structured Markdown headers (e.g. "# Title", "### Speaker • Self-Realization Fellowship", "### <Topic/Question>") and bullet lists.
7. Return your response in STRICT JSON format matching this schema exactly:
{
  "id": "${item.id}",
  "title": "${item.title}",
  "url": "https://www.youtube.com/watch?v=${item.id}",
  "formattedMarkdown": "<The complete formatted Markdown discourse text with all headings, questions/answers, stories, and guidance>",
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
  console.log("🕉️ GENERATING EXHAUSTIVE 2026 CONVOCATION READINGS & TRANSCRIPTS 🕉️");

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
