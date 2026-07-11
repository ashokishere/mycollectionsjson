import { execSync } from "child_process";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configurable interval (default to 10 minutes = 600000 ms)
const INTERVAL_MS = parseInt(process.env.SCHEDULER_INTERVAL_MS || "600000", 10);
const BATCH_SIZE = process.env.BATCH_SIZE || "5";

console.log("=================================================================");
console.log("   ⏰ SPIRITUAL TRANSCRIPT DAEMON SCHEDULER STARTED ⏰");
console.log("=================================================================");
console.log(`⏰ Interval: ${INTERVAL_MS / 60000} minutes`);
console.log(`📦 Batch Size per run: ${BATCH_SIZE}`);
console.log("-----------------------------------------------------------------");

function runJob() {
  const timestamp = new Date().toLocaleString();
  console.log(`\n\n[${timestamp}] 🚀 Triggering Scheduled Batch Job...`);
  
  try {
    execSync("npx tsx job-overview.ts", {
      stdio: "inherit",
      env: {
        ...process.env,
        BATCH_SIZE: BATCH_SIZE,
      }
    });
    console.log(`[${new Date().toLocaleString()}] ✅ Scheduled Batch Job finished successfully.`);
  } catch (err: any) {
    console.error(`[${new Date().toLocaleString()}] ❌ Scheduled Batch Job failed:`, err.message || err);
  }
}

// Run the first batch immediately on start
runJob();

// Set interval to run continuously
console.log(`\n🔄 Scheduler armed. Will run next batch every ${INTERVAL_MS / 60000} minutes...`);
setInterval(runJob, INTERVAL_MS);
