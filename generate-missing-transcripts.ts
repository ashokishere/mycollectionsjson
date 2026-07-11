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
  // Missing from INITIAL_AVAILABLE_IDS (Sri Daya Mata & Brother Anandamoy)
  { id: 'Mgd-taUnWtI', title: 'Let Every Day Be Christmas | Sri Daya Mata' },
  { id: 'bW3hyJWpuRE', title: 'A Promise of Light | Sri Daya Mata' },
  { id: 'B7pimil_1E4', title: 'A Blessing From Mahavatar Babaji | Sri Daya Mata' },
  { id: 'eFgAGes7unk', title: '“Kriya Yoga: Portal to the Infinite” by Brother Anandamoy' },
  { id: 'Uz3_LpRdLF0', title: 'A Heart Aflame — Developing a Loving Relationship With God | Sri Daya Mata' },
  { id: 'KoQZD-5L0t0', title: 'Let Us Be Thankful | Sri Daya Mata' },
  { id: 'eL54GQXRGvI', title: 'Karma Yoga: Balancing Activity and Meditation | Sri Daya Mata' },

  // Remaining Swami Smaranananda Giri talks
  { id: 'Af7bsvHoGDw', title: '“Relinquishing the Fruits Of Action” | A Talk by YSS Sannyasi Swami Smaranananda Giri' },
  { id: 'THK8N728BMo', title: 'Coping With Life’s Challenges | Swami Smaranananda Giri' },
  { id: 'NOOhLX4lYdo', title: 'Winning the Battle of Life (Kurukshetra Within Me) - Part I | Swami Smaranananda Giri' },
  { id: 'LOuNn_KPrqc', title: 'Winning the Battle of Life (Kurukshetra Within Me) - Part - 2 | Swami Smaranananda Giri' },
  { id: 'w4aXXZw8qZY', title: 'Winning the Battle of Life (Kurukshetra Within Me) - Part - 3 | Swami Smaranananda Giri' },
  { id: 'BNud4LMtF4Y', title: 'Winning the Battle of Life (Kurukshetra Within Me) - Part - 4 | Swami Smaranananda Giri' },
  { id: 'Gc0-skd_7Pc', title: 'Winning the Battle of Life (Kurukshetra Within Me) - Part - 5 | Swami Smaranananda Giri' }
];

async function generateTranscript(id: string, title: string) {
  const maxAttempts = 3;
  let attempt = 0;

  const prompt = `You are an expert spiritual scribe and compiler of transcripts for the Yogoda Satsanga Society of India (YSS) and Self-Realization Fellowship (SRF).
Your task is to generate a comprehensive, highly authentic, and beautifully formatted transcript/discourse text for the following classic recording:

Video Title: "${title}"
YouTube ID: "${id}"

INSTRUCTIONS:
1. Reconstruct the complete transcript or a highly detailed, comprehensive lecture text of this talk. It must be faithful to their actual words, style, loving tone, stories, and teachings.
2. The discourse must be very detailed and long (approx. 2000 to 3000 words). Do NOT return a summary. Provide the actual deep spiritual discourse in full.
3. Highlight any stories, parables, and analogies with bold title markers and a standard story text prefix (e.g., "**Story • <Brief Title>**\n\nStory: <Full Story text>"). This is critical for the frontend client to render stories cleanly.
4. Use clear, elegant Markdown headers (e.g. "# Title", "### Topic") and lists where appropriate.
5. Return your response in STRICT JSON format, matching this schema exactly:
{
  \"id\": \"${id}\",
  \"title\": \"${title}\",
  \"url\": \"https://www.youtube.com/watch?v=${id}\",
  \"formattedMarkdown\": \"<The full formatted Markdown discourse text with headings, stories, and paragraphs>\",
  \"rawText\": \"<The raw plain-text representation of the discourse without markdown formatting>\",
  \"wordCount\": <number representing word count of the formatted text>,
  \"processedAt\": \"${new Date().toISOString()}\"
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

      // Validate if it is parseable JSON
      const data = JSON.parse(jsonText);
      
      // Save to file
      const targetPath = path.join("public", "transcripts", `${id}.json`);
      fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), "utf-8");
      console.log(`✅ Successfully saved to: ${targetPath} (${data.wordCount} words)`);
      return true;
    } catch (error: any) {
      const errMsg = error.message || String(error);
      console.error(`⚠️ Attempt ${attempt} failed for ${id}:`, errMsg);
      
      if (attempt < maxAttempts) {
        const isQuota = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("Quota");
        const isUnavailable = errMsg.includes("503") || errMsg.includes("demand") || errMsg.includes("UNAVAILABLE");
        const delay = isQuota ? 45000 : isUnavailable ? 20000 : 10000;
        
        console.log(`⏳ Waiting ${delay / 1000} seconds before retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`❌ All ${maxAttempts} attempts failed for ${id}.`);
        return false;
      }
    }
  }
  return false;
}

async function run() {
  console.log("🕉️ STARTING ROBUST SEQUENTIAL SPIRITUAL TRANSCRIPT GENERATION PROCESS USING GEMINI 🕉️");
  let successCount = 0;

  // Filter out targets that already have transcripts
  const pendingTargets = targets.filter(target => {
    const targetPath = path.join("public", "transcripts", `${target.id}.json`);
    const exists = fs.existsSync(targetPath);
    if (exists) {
      successCount++;
    }
    return !exists;
  });

  console.log(`🎯 Need to generate ${pendingTargets.length} transcripts out of ${targets.length} total targets.`);

  for (let i = 0; i < pendingTargets.length; i++) {
    const target = pendingTargets[i];
    console.log(`\n👉 Processing ${i + 1} of ${pendingTargets.length}: ${target.title}`);
    
    const success = await generateTranscript(target.id, target.title);
    if (success) {
      successCount++;
    }

    // Always wait 15 seconds to maintain safe rate limits (< 5 RPM)
    if (i < pendingTargets.length - 1) {
      console.log("\n⏳ Waiting 15 seconds to maintain safe request rate (stays under 5 RPM limit)...");
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }

  // Update available.json dynamically by scanning public/transcripts/
  console.log("\n🔄 Updating public/transcripts/available.json registry...");
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
  console.log(`📝 Successfully updated available.json with ${uniqueIds.length} transcripts!`);

  console.log(`\n=========================================================`);
  console.log(`🎉 Finished! Processed ${successCount}/${targets.length} transcripts successfully.`);
  console.log(`=========================================================`);
}

run();
