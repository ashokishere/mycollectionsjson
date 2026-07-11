import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import ExcelJS from "exceljs";

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json());

// Setup file upload storage
const upload = multer({ dest: "uploads/" });

// Custom CSV parsing helper that handles quotes and newlines safely
function parseCSV(content: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentCell = "";
  let insideQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentLine.push(currentCell);
      currentCell = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentLine.push(currentCell);
      lines.push(currentLine);
      currentLine = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }
  if (currentCell || currentLine.length > 0) {
    currentLine.push(currentCell);
    lines.push(currentLine);
  }
  return lines;
}

// Convert Excel structure to live videos array and update files
async function convertExcelToData(xlsxPath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  const worksheet = workbook.worksheets[0];
  
  const jsonData: any[] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    jsonData.push(values);
  });

  if (jsonData.length === 0) {
    throw new Error("Excel file is empty");
  }

  // Header detection
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
    const row = jsonData[i];
    if (Array.isArray(row) && row.length >= 2) {
      const hasKeys = row.some(cell => {
        const c = String(cell || "").toLowerCase();
        return c === "id" || c.includes("video") || c.includes("title") || c.includes("url") || c.includes("link") || c.includes("topic");
      });
      if (hasKeys) {
        headerRowIndex = i;
        break;
      }
    }
  }

  const headerRow = jsonData[headerRowIndex];
  let idIdx = 0, titleIdx = 1, urlIdx = 2, tagsIdx = 3, statusIdx = 4, talkByIdx = 5;

  if (Array.isArray(headerRow)) {
    headerRow.forEach((cell, idx) => {
      const c = String(cell || "").toLowerCase();
      if (c === "id" || c.includes("video id") || c === "video" || c === "videoid") idIdx = idx;
      else if (c.includes("title")) titleIdx = idx;
      else if (c.includes("url") || c.includes("link") || c.includes("youtube")) urlIdx = idx;
      else if (c.includes("tag") || c.includes("theme") || c.includes("category") || c.includes("topic")) tagsIdx = idx;
      else if (c.includes("status")) statusIdx = idx;
      else if (c.includes("talk by") || c.includes("author") || c.includes("speaker")) talkByIdx = idx;
    });
  }

  const videoMap = new Map<string, any>();
  const csvRows: string[][] = [
    ["VideoID", "Title", "URL", "Topic", "Status", "Talk By"]
  ];

  jsonData.forEach((row, rowIndex) => {
    if (rowIndex <= headerRowIndex) return;
    if (!Array.isArray(row) || row.length < 2) return;
    
    const id = String(row[idIdx] || "").trim();
    if (!id || id.toLowerCase() === "id" || id === "#NAME?" || id === "#REF!" || id === "#VALUE!") return;
    
    const title = String(row[titleIdx] || "").trim().replace(/‚Äú|‚Äù/g, '"').replace(/‚Äò|‚Äô/g, "'").replace(/‚Äî/g, "—");
    const url = String(row[urlIdx] || "").trim();
    if (!url) return;
    
    const rawTagsString = String(row[tagsIdx] || "");
    const rawTags = rawTagsString.split(/[|,;]/).map(t => t.trim()).filter(t => t !== "");
    
    const normalizedTags = Array.from(new Set(rawTags.map(t => {
      const lower = t.toLowerCase();
      if (lower === "engilish" || lower === "english") return "English";
      if (lower === "hindi") return "Hindi";
      if (lower === "tamil") return "Tamil";
      if (lower === "bengali") return "Bengali";
      if (lower === "telugu") return "Telugu";
      if (lower === "nepali") return "Nepali";
      if (lower.includes("autobigraphy") || lower.includes("yoig")) return "Autobiography of a Yogi";
      return t;
    })));

    videoMap.set(id, { id, title, url, tags: normalizedTags });

    const status = String(row[statusIdx] || "").trim();
    const talkBy = String(row[talkByIdx] || "").trim();
    csvRows.push([id, title, url, rawTagsString, status, talkBy]);
  });

  const finalVideos = Array.from(videoMap.values());
  
  // Save JSON data
  const dataDir = path.join(process.cwd(), "src/data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(path.join(dataDir, "videos.json"), JSON.stringify(finalVideos, null, 2));

  // Build and write CSV
  const csvContent = csvRows.map(r => r.map(val => {
    const s = String(val || "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }).join(",")).join("\n");

  fs.writeFileSync(path.join(process.cwd(), "public/Database.csv"), csvContent);
  fs.writeFileSync(path.join(process.cwd(), "Database.csv"), csvContent);

  return finalVideos;
}

// Convert CSV structure to live videos array and update files
async function convertCsvToData(csvPath: string) {
  const content = fs.readFileSync(csvPath, "utf-8");
  const parsedRows = parseCSV(content);

  if (parsedRows.length === 0) {
    throw new Error("CSV file is empty");
  }

  // Header detection
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(parsedRows.length, 20); i++) {
    const row = parsedRows[i];
    if (row && row.length >= 2) {
      const hasKeys = row.some(cell => {
        const c = String(cell || "").toLowerCase();
        return c === "videoid" || c === "id" || c.includes("video") || c.includes("title") || c.includes("url") || c.includes("link") || c.includes("topic");
      });
      if (hasKeys) {
        headerRowIndex = i;
        break;
      }
    }
  }

  const headerRow = parsedRows[headerRowIndex];
  let idIdx = 0, titleIdx = 1, urlIdx = 2, tagsIdx = 3;

  if (headerRow) {
    headerRow.forEach((cell, idx) => {
      const c = String(cell || "").toLowerCase();
      if (c === "videoid" || c === "id" || c.includes("video id") || c === "video") idIdx = idx;
      else if (c.includes("title")) titleIdx = idx;
      else if (c.includes("url") || c.includes("link") || c.includes("youtube")) urlIdx = idx;
      else if (c.includes("tag") || c.includes("theme") || c.includes("category") || c.includes("topic")) tagsIdx = idx;
    });
  }

  const videoMap = new Map<string, any>();

  parsedRows.forEach((row, rowIndex) => {
    if (rowIndex <= headerRowIndex) return;
    if (!row || row.length < 2) return;
    
    const id = String(row[idIdx] || "").trim();
    if (!id || id.toLowerCase() === "id" || id.toLowerCase() === "videoid" || id === "#NAME?" || id === "#REF!" || id === "#VALUE!") return;
    
    const title = String(row[titleIdx] || "").trim().replace(/‚Äú|‚Äù/g, '"').replace(/‚Äò|‚Äô/g, "'").replace(/‚Äî/g, "—");
    const url = String(row[urlIdx] || "").trim();
    if (!url) return;
    
    const rawTagsString = String(row[tagsIdx] || "");
    const rawTags = rawTagsString.split(/[|,;]/).map(t => t.trim()).filter(t => t !== "");
    
    const normalizedTags = Array.from(new Set(rawTags.map(t => {
      const lower = t.toLowerCase();
      if (lower === "engilish" || lower === "english") return "English";
      if (lower === "hindi") return "Hindi";
      if (lower === "tamil") return "Tamil";
      if (lower === "bengali") return "Bengali";
      if (lower === "telugu") return "Telugu";
      if (lower === "nepali") return "Nepali";
      if (lower.includes("autobigraphy") || lower.includes("yoig")) return "Autobiography of a Yogi";
      return t;
    })));

    videoMap.set(id, { id, title, url, tags: normalizedTags });
  });

  const finalVideos = Array.from(videoMap.values());

  // Save JSON data
  const dataDir = path.join(process.cwd(), "src/data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(path.join(dataDir, "videos.json"), JSON.stringify(finalVideos, null, 2));

  // Build and write Excel sheet to keep it in sync
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");
  parsedRows.forEach(row => {
    worksheet.addRow(row);
  });
  await workbook.xlsx.writeFile(path.join(process.cwd(), "public/Database.xlsx"));
  await workbook.xlsx.writeFile(path.join(process.cwd(), "Database.xlsx"));

  return finalVideos;
}

// ---------------- API Routes ----------------

// Fetch live videos list
app.get("/api/videos", (req, res) => {
  try {
    const jsonPath = path.join(process.cwd(), "src/data/videos.json");
    if (fs.existsSync(jsonPath)) {
      const data = fs.readFileSync(jsonPath, "utf-8");
      return res.json(JSON.parse(data));
    }
    // Fallback if not generated yet, try to read Excel
    const xlsxPath = path.join(process.cwd(), "Database.xlsx");
    if (fs.existsSync(xlsxPath)) {
      convertExcelToData(xlsxPath).then(videos => {
        res.json(videos);
      }).catch(err => {
        res.status(500).json({ error: "Failed to parse excel " + err.message });
      });
    } else {
      res.json([]);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin validation endpoint (simple sessionless admin checks)
app.post("/api/admin/verify", (req, res) => {
  const { passcode } = req.body;
  if (passcode === "yogananda2026" || passcode === "admin123" || passcode === "sadhana") {
    return res.json({ success: true, message: "Authorized" });
  }
  return res.status(401).json({ success: false, message: "Invalid Admin Passcode" });
});

// Download active databases
app.get("/api/admin/download/csv", (req, res) => {
  const filePath = path.join(process.cwd(), "public/Database.csv");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=Database.csv");
    return res.sendFile(filePath);
  }
  return res.status(404).json({ error: "Database.csv not found" });
});

app.get("/api/admin/download/xlsx", (req, res) => {
  const filePath = path.join(process.cwd(), "public/Database.xlsx");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Database.xlsx");
    return res.sendFile(filePath);
  }
  return res.status(404).json({ error: "Database.xlsx not found" });
});

// Upload new Excel sheet
app.post("/api/admin/upload/xlsx", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const tempPath = req.file.path;
    const destXlsx = path.join(process.cwd(), "Database.xlsx");
    const publicXlsx = path.join(process.cwd(), "public/Database.xlsx");
    
    // Copy to destinations
    fs.copyFileSync(tempPath, destXlsx);
    fs.copyFileSync(tempPath, publicXlsx);
    fs.unlinkSync(tempPath);
    
    // Parse and sync everything
    const updatedVideos = await convertExcelToData(destXlsx);
    
    res.json({
      success: true,
      message: "Excel Database uploaded and synchronized successfully!",
      count: updatedVideos.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload new CSV database
app.post("/api/admin/upload/csv", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const tempPath = req.file.path;
    const destCsv = path.join(process.cwd(), "Database.csv");
    const publicCsv = path.join(process.cwd(), "public/Database.csv");
    
    // Copy to destinations
    fs.copyFileSync(tempPath, destCsv);
    fs.copyFileSync(tempPath, publicCsv);
    fs.unlinkSync(tempPath);
    
    // Parse and sync everything
    const updatedVideos = await convertCsvToData(destCsv);
    
    res.json({
      success: true,
      message: "CSV Database uploaded and synchronized successfully!",
      count: updatedVideos.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- Vite Middleware / Production Server ----------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
