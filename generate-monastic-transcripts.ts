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
    id: "znt_o0qDY9s",
    title: "The Deeper Teachings of Jesus | How-to-Live Talk With Meditation",
    speaker: "Brother Nikhilananda"
  },
  {
    id: "gwZKMiKSlTo",
    title: "Gaining the Wealth of Inner Happiness | How-to-Live Talk With Meditation",
    speaker: "Brother Padmananda"
  },
  {
    id: "QpDGyxq0GoA",
    title: "Be Messengers of God’s Light and Love | Sri Mrinalini Mata",
    speaker: "Sri Mrinalini Mata"
  },
  {
    id: "LiwP1a3OWGU",
    title: "Experiencing the Inner Harmony — Questions and Answers About Spiritual Living | Talk With Meditation",
    speaker: "Brother Satyananda"
  },
  {
    id: "Fp15XnEqUgU",
    title: "How Our Thoughts Can Change Our Lives | “How-to-Live” Talk With Meditation",
    speaker: "Brother Ekananda"
  },
  {
    id: "PiWF4XgAygM",
    title: "Developing an Intimate Relationship With God Through Prayer | How‑to‑Live Inspirational Talk",
    speaker: "Sister Draupadi"
  },
  {
    id: "6cWvUubsR2Y",
    title: "Lighting the Way to a Higher Age | Brother Chidananda",
    speaker: "Brother Chidananda"
  },
  {
    id: "SPrymONftC0",
    title: "Becoming a Giver of Peace, Joy, and Loving Kindness | “How-to-Live” Inspirational Talk",
    speaker: "Brother Nakulananda"
  },
  {
    id: "MULMSu5qkX8",
    title: "Finding God’s Love Through True Friendship | “How-to-Live” Talk With Meditation",
    speaker: "Sister Usha"
  },
  {
    id: "UAFFE-AmUfs",
    title: "Kriya Yoga: Divine Dispensation for Our Awakening Age | Brother Anandamoy",
    speaker: "Brother Anandamoy"
  },
  {
    id: "MQM-9oeVJLo",
    title: "Spiritual Victory Through Attunement With the Guru | “How-to-Live” Inspirational Talk",
    speaker: "Brother Bhumananda"
  },
  {
    id: "fM7jZf8u_T8",
    title: "Stillness in Action: The Path of Karma Yoga | “How-to-Live” Talk With Meditation",
    speaker: "Brother Kamalananda"
  },
  {
    id: "JiwTmacwGKU",
    title: "Perfecting Human Relationships | “How-to-Live” Inspirational Talk",
    speaker: "Brother Bhaktananda"
  },
  {
    id: "5xzu6Wo8-jk",
    title: "Make Your Mind a Temple of God | “How-to-Live” Talk With Meditation",
    speaker: "Sister Ranjana"
  },
  {
    id: "J6cP0guk06Y",
    title: "Concentration: Key to Communion With God | “How-to-Live” Talk With Meditation",
    speaker: "Brother Vidyananda"
  }
];

async function generateTranscript(item: typeof targets[0]) {
  const maxAttempts = 3;
  let attempt = 0;

  const prompt = `You are an expert spiritual scribe and compiler of transcripts and readings for the Self-Realization Fellowship (SRF) / Yogoda Satsanga Society of India (YSS) Founded by Paramahansa Yogananda.
Your task is to generate a comprehensive, authentic, inspiring, and beautifully formatted transcript/discourse text for the following inspirational talk:

Video Title: "${item.title}"
Speaker: "${item.speaker}"
YouTube ID: "${item.id}"

INSTRUCTIONS:
1. Reconstruct a complete transcript or detailed spiritual discourse text of this talk given by ${item.speaker}. It must be faithful to SRF monastic teachings, Paramahansa Yogananda's wisdom, Kriya Yoga principles, stories, and practical spiritual guidance.
2. The discourse must be detailed and comprehensive (approx. 1800 to 2500 words). Provide the full discourse and spiritual readings.
3. Highlight any key stories, parables, and analogies with bold title markers and a story prefix (e.g., "**Story • <Brief Title>**\\n\\nStory: <Full Story text>"). This helps the frontend client render stories cleanly.
4. Use clear, elegant Markdown headers (e.g. "# Title", "### Speaker • Self-Realization Fellowship", "### Section Name") and bullet points or numbered lists where appropriate.
5. Return your response in STRICT JSON format matching this schema exactly:
{
  "id": "${item.id}",
  "title": "${item.title}",
  "url": "https://www.youtube.com/watch?v=${item.id}",
  "formattedMarkdown": "<The full formatted Markdown discourse text with headings, stories, and paragraphs>",
  "rawText": "<The raw plain-text representation of the discourse without markdown formatting>",
  "wordCount": <number representing word count of the formatted text>,
  "processedAt": "${new Date().toISOString()}"
}
Ensure the JSON is perfectly valid, with proper escaping of quotes, newlines, and control characters.`;

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
  console.log("🕉️ GENERATING MONASTIC READINGS & TRANSCRIPTS 🕉️");

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
