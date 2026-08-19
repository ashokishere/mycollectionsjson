import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import ExcelJS from "exceljs";
import { Readable } from "stream";

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

// Audio proxy endpoint to stream audios from Google Drive or other external websites
// It handles bypasses for Google Drive virus scans and streams chunk-by-chunk.
app.options("/api/audio-proxy", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
  res.status(200).end();
});

interface CachedDriveLink {
  resolvedUrl: string;
  cookieHeader: string;
  expiresAt: number;
}

const driveLinkCache = new Map<string, CachedDriveLink>();
const ongoingResolutions = new Map<string, Promise<CachedDriveLink>>();

async function resolveDriveFile(fileId: string): Promise<CachedDriveLink> {
  const cached = driveLinkCache.get(fileId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  let promise = ongoingResolutions.get(fileId);
  if (!promise) {
    promise = (async () => {
      try {
        console.log(`[DriveResolve] Resolving link for fileId: ${fileId}`);
        const headers: Record<string, string> = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        };

        // --- FAST PATH: Try direct download with confirm=t ---
        console.log(`[DriveResolve] Trying fast-path confirm=t for fileId: ${fileId}`);
        let currentUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
        let response = await fetch(currentUrl, { headers, redirect: "manual" });

        // Manually follow redirects
        while (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          if (!location) break;
          currentUrl = new URL(location, currentUrl).toString();
          response = await fetch(currentUrl, { headers, redirect: "manual" });
        }

        let contentType = response.headers.get("content-type") || "";
        let resolvedUrl = currentUrl;
        let cookieHeader = "";

        // Collect cookies from fast path redirect chain
        const cookies = typeof response.headers.getSetCookie === "function"
          ? response.headers.getSetCookie()
          : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : []);
        if (cookies && cookies.length > 0) {
          cookieHeader = cookies.map((c: string) => c.split(";")[0]).join("; ");
        }

        // If the response is HTML, it might be a small file or require dynamic confirm/scraping
        if (contentType.includes("text/html")) {
          console.log(`[DriveResolve] Fast path returned HTML. Falling back to scraping uc warning for fileId: ${fileId}`);
          
          let scrapeUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
          const scrapeHeaders: Record<string, string> = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          };
          
          let scrapeResponse = await fetch(scrapeUrl, { headers: scrapeHeaders, redirect: "manual" });

          while (scrapeResponse.status >= 300 && scrapeResponse.status < 400) {
            const location = scrapeResponse.headers.get("location");
            if (!location) break;

            const redirectCookies = typeof scrapeResponse.headers.getSetCookie === "function"
              ? scrapeResponse.headers.getSetCookie()
              : (scrapeResponse.headers.get("set-cookie") ? [scrapeResponse.headers.get("set-cookie")!] : []);
            
            if (redirectCookies && redirectCookies.length > 0) {
              const newCookiesStr = redirectCookies.map((c: string) => c.split(";")[0]).join("; ");
              if (scrapeHeaders["Cookie"]) {
                scrapeHeaders["Cookie"] = scrapeHeaders["Cookie"] + "; " + newCookiesStr;
              } else {
                scrapeHeaders["Cookie"] = newCookiesStr;
              }
            }

            scrapeUrl = new URL(location, scrapeUrl).toString();
            scrapeResponse = await fetch(scrapeUrl, { headers: scrapeHeaders, redirect: "manual" });
          }

          const scrapeContentType = scrapeResponse.headers.get("content-type") || "";
          resolvedUrl = scrapeUrl;
          cookieHeader = scrapeHeaders["Cookie"] || "";

          if (scrapeContentType.includes("text/html")) {
            const htmlContent = await scrapeResponse.text();
            const scrapeCookies = typeof scrapeResponse.headers.getSetCookie === "function"
              ? scrapeResponse.headers.getSetCookie()
              : (scrapeResponse.headers.get("set-cookie") ? [scrapeResponse.headers.get("set-cookie")!] : []);

            const confirmMatch = htmlContent.match(/name=["']confirm["']\s+value=["']([^"']+)["']/) || 
                                 htmlContent.match(/value=["']([^"']+)["']\s+name=["']confirm["']/) ||
                                 htmlContent.match(/confirm=([a-zA-Z0-9_-]+)/);
            const uuidMatch = htmlContent.match(/name=["']uuid["']\s+value=["']([^"']+)["']/) ||
                              htmlContent.match(/value=["']([^"']+)["']\s+name=["']uuid["']/);

            if (confirmMatch && confirmMatch[1]) {
              const confirmToken = confirmMatch[1];
              const uuidToken = uuidMatch ? uuidMatch[1] : "";

              if (uuidToken) {
                resolvedUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${confirmToken}&uuid=${uuidToken}`;
              } else {
                resolvedUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmToken}`;
              }

              if (scrapeCookies && scrapeCookies.length > 0) {
                const responseCookiesStr = scrapeCookies.map((c: string) => c.split(";")[0]).join("; ");
                if (cookieHeader) {
                  cookieHeader = cookieHeader + "; " + responseCookiesStr;
                } else {
                  cookieHeader = responseCookiesStr;
                }
              }
            }
          }
        }

        const cachedResult: CachedDriveLink = {
          resolvedUrl,
          cookieHeader,
          expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour
        };

        console.log(`[DriveResolve] Resolved URL: ${resolvedUrl}`);
        driveLinkCache.set(fileId, cachedResult);
        return cachedResult;
      } finally {
        ongoingResolutions.delete(fileId);
      }
    })();
    ongoingResolutions.set(fileId, promise);
  }

  return promise;
}

// Support OPTIONS preflight requests for CORS
app.options("/api/audio-proxy", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
  res.status(204).end();
});

app.get("/api/audio-proxy", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");

  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send("Missing url parameter");
  }

  console.log(`[AudioProxy] Request received for: ${targetUrl}`);
  if (req.headers.range) {
    console.log(`[AudioProxy] Request Range: ${req.headers.range}`);
  }

  try {
    let resolvedUrl = targetUrl.trim();
    let fileId = "";

    // Check if Google Drive
    if (resolvedUrl.includes("drive.google.com") || resolvedUrl.includes("docs.google.com")) {
      const dMatch = resolvedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (dMatch && dMatch[1]) {
        fileId = dMatch[1];
      } else {
        const idMatch = resolvedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
          fileId = idMatch[1];
        }
      }
    }

    // Set up request headers
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    // Forward range request header if it exists
    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    if (fileId) {
      const resolved = await resolveDriveFile(fileId);
      resolvedUrl = resolved.resolvedUrl;
      if (resolved.cookieHeader) {
        headers["Cookie"] = resolved.cookieHeader;
      }
    }

    console.log(`[AudioProxy] Fetching stream from: ${resolvedUrl}`);
    let response = await fetch(resolvedUrl, { headers });
    let contentType = response.headers.get("content-type") || "";

    // Fallback 1: If initial fetch with cookies fails, try WITHOUT cookies immediately (highly robust for cookie/session expirations)
    if (fileId && headers["Cookie"] && (!response.ok || contentType.includes("text/html"))) {
      console.log(`[AudioProxy] Initial stream fetch failed or returned HTML. Retrying immediately WITHOUT cookies...`);
      const headersNoCookie = { ...headers };
      delete headersNoCookie["Cookie"];
      const testResponse = await fetch(resolvedUrl, { headers: headersNoCookie });
      const testContentType = testResponse.headers.get("content-type") || "";
      if (testResponse.ok && !testContentType.includes("text/html")) {
        response = testResponse;
        contentType = testContentType;
        console.log(`[AudioProxy] Cookieless retry succeeded!`);
      }
    }

    // Fallback 2: Full re-resolution if still failing
    if (fileId && (!response.ok || contentType.includes("text/html"))) {
      console.warn(`[AudioProxy] Stream fetch still failed or returned HTML. Retrying resolution from scratch...`);
      driveLinkCache.delete(fileId);
      const resolved = await resolveDriveFile(fileId);
      resolvedUrl = resolved.resolvedUrl;
      
      const headersWithCookie = { ...headers };
      if (resolved.cookieHeader) {
        headersWithCookie["Cookie"] = resolved.cookieHeader;
      }
      response = await fetch(resolvedUrl, { headers: headersWithCookie });
      contentType = response.headers.get("content-type") || "";

      // Fallback 3: If full re-resolved URL fails with cookies, try WITHOUT cookies
      if (!response.ok || contentType.includes("text/html")) {
        console.warn(`[AudioProxy] Full re-resolution with cookies failed. Trying cookieless fetch...`);
        const headersNoCookie = { ...headers };
        delete headersNoCookie["Cookie"];
        response = await fetch(resolvedUrl, { headers: headersNoCookie });
        contentType = response.headers.get("content-type") || "";
      }
    }

    // If the response is STILL text/html, it means we cannot download the file (not public or share restricted)
    if (contentType.includes("text/html")) {
      console.error(`[AudioProxy] Stream is HTML. Access denied or share permissions restrictive.`);
      if (response.body) {
        response.body.cancel().catch(() => {});
      }
      return res.status(403).send("Could not play audio. Please ensure the link is public, accessible, or a valid Google Drive file with sharing set to 'Anyone with the link can view'.");
    }

    // Guess content-type from Content-Disposition if it's application/octet-stream or binary
    const contentDisposition = response.headers.get("content-disposition") || "";
    if (contentDisposition && (!contentType || contentType.includes("application/octet-stream") || contentType.includes("binary/"))) {
      const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/i);
      if (filenameMatch && filenameMatch[1]) {
        const filename = filenameMatch[1].trim();
        if (filename.endsWith(".mp3")) {
          contentType = "audio/mpeg";
        } else if (filename.endsWith(".wav")) {
          contentType = "audio/wav";
        } else if (filename.endsWith(".m4a")) {
          contentType = "audio/x-m4a";
        } else if (filename.endsWith(".mp4")) {
          contentType = "audio/mp4";
        } else if (filename.endsWith(".ogg")) {
          contentType = "audio/ogg";
        }
      }
    }

    // Fallback content-type
    if (!contentType || contentType.includes("application/octet-stream") || contentType.includes("binary/")) {
      contentType = "audio/mpeg";
    }

    console.log(`[AudioProxy] Stream content-type: ${contentType}, Status: ${response.status}`);

    // Parse requested range
    let isManuallySlicing = false;
    let start = 0;
    let end: number | null = null;
    let totalLength = 0;

    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        start = parseInt(match[1], 10);
        if (match[2]) {
          end = parseInt(match[2], 10);
        }
      }
    }

    // Set response headers and handle manual slicing if upstream returned 200 instead of 206
    if (response.status === 200 && rangeHeader) {
      isManuallySlicing = true;
      const lengthStr = response.headers.get("content-length");
      totalLength = lengthStr ? parseInt(lengthStr, 10) : 0;
      if (end === null && totalLength > 0) {
        end = totalLength - 1;
      }
      
      res.status(206);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Accept-Ranges", "bytes");
      if (totalLength > 0 && end !== null) {
        res.setHeader("Content-Range", `bytes ${start}-${end}/${totalLength}`);
        res.setHeader("Content-Length", `${end - start + 1}`);
        console.log(`[AudioProxy] Performing manual Range slicing: bytes ${start}-${end}/${totalLength}`);
      }
    } else {
      res.status(response.status);
      res.setHeader("Content-Type", contentType);
      
      const contentRange = response.headers.get("content-range");
      if (contentRange) {
        res.setHeader("Content-Range", contentRange);
        console.log(`[AudioProxy] Forwarded Content-Range: ${contentRange}`);
      }
      
      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
        console.log(`[AudioProxy] Forwarded Content-Length: ${contentLength}`);
      }
      
      const acceptRanges = response.headers.get("accept-ranges");
      if (acceptRanges) {
        res.setHeader("Accept-Ranges", acceptRanges);
      } else {
        res.setHeader("Accept-Ranges", "bytes");
      }
    }

    if (req.method === "HEAD") {
      res.end();
      if (response.body) {
        response.body.cancel().catch(() => {});
      }
      return;
    }

    if (!response.body) {
      return res.end();
    }

    const reader = response.body.getReader();
    req.on("close", () => {
      reader.cancel().catch(() => {});
    });

    try {
      let bytesRead = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (isManuallySlicing) {
          const chunkLength = value.length;
          const chunkStart = bytesRead;
          const chunkEnd = bytesRead + chunkLength - 1;

          bytesRead += chunkLength;

          if (chunkEnd < start) {
            continue;
          }

          if (end !== null && chunkStart > end) {
            break;
          }

          const sliceStart = Math.max(0, start - chunkStart);
          const sliceEnd = end !== null ? Math.min(chunkLength - 1, end - chunkStart) : chunkLength - 1;

          if (sliceStart === 0 && sliceEnd === chunkLength - 1) {
            res.write(value);
          } else {
            res.write(value.subarray(sliceStart, sliceEnd + 1));
          }
        } else {
          res.write(value);
        }
      }
      res.end();
    } catch (streamErr: any) {
      console.error("[AudioProxy] Error during streaming stream chunks:", streamErr);
      reader.cancel().catch(() => {});
      if (!res.headersSent) {
        res.status(500).end();
      }
    }

  } catch (err: any) {
    console.error("[AudioProxy] Audio proxy error:", err);
    if (!res.headersSent) {
      res.status(500).send("Proxy error: " + err.message);
    }
  }
});

// PDF Proxy endpoint with persistent disk caching and high-speed streaming
const pdfCacheDir = path.join(process.cwd(), "uploads/pdf-cache");
if (!fs.existsSync(pdfCacheDir)) {
  fs.mkdirSync(pdfCacheDir, { recursive: true });
}

function getSafePdfCachePath(targetUrl: string): string {
  // Generate clean filename from URL basename or sanitized hash
  try {
    const parsed = new URL(targetUrl);
    const basename = path.basename(parsed.pathname) || "document.pdf";
    const safeName = basename.replace(/[^a-zA-Z0-9._-]/g, "_");
    return path.join(pdfCacheDir, safeName);
  } catch {
    const hash = Buffer.from(targetUrl).toString("base64url").slice(0, 32);
    return path.join(pdfCacheDir, `${hash}.pdf`);
  }
}

app.options("/api/pdf-proxy", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Accept");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
  res.status(204).end();
});

app.get("/api/pdf-proxy", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Accept");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges, Content-Disposition");
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send("Missing url parameter");
  }

  const cachedFilePath = getSafePdfCachePath(targetUrl);

  // If already cached on disk, send file immediately with full range & streaming support
  if (fs.existsSync(cachedFilePath)) {
    const stats = fs.statSync(cachedFilePath);
    if (stats.size > 1000) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      return res.sendFile(cachedFilePath);
    }
  }

  try {
    const forwardHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/pdf,application/octet-stream,*/*",
      "Referer": "https://spiritualbooks.eu/"
    };

    const pdfResponse = await fetch(targetUrl, { 
      headers: forwardHeaders,
      redirect: "follow"
    });

    if (!pdfResponse.ok) {
      return res.status(pdfResponse.status).send(`Failed to fetch PDF: ${pdfResponse.statusText}`);
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to disk cache for instantaneous future loads
    try {
      fs.writeFileSync(cachedFilePath, buffer);
    } catch (saveErr) {
      console.warn("[PdfProxy Cache Warning]", saveErr);
    }

    res.status(200);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Content-Length", buffer.length.toString());
    res.setHeader("Accept-Ranges", "bytes");
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");

    if (req.method === "HEAD") {
      return res.end();
    }

    return res.send(buffer);
  } catch (err: any) {
    console.error("[PdfProxy Error]", err);
    if (!res.headersSent) {
      res.status(500).send(`PDF proxy error: ${err.message}`);
    }
  }
});

// Serve PDF.js standard fonts, cmaps, wasm decoders, and image decoders locally with maximum performance
const pdfAssetsDir = fs.existsSync(path.join(process.cwd(), "public/pdfjs-assets"))
  ? path.join(process.cwd(), "public/pdfjs-assets")
  : path.join(process.cwd(), "node_modules/pdfjs-dist");

app.use("/pdfjs-assets", express.static(pdfAssetsDir, {
  maxAge: "30d",
  setHeaders: (res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  }
}));
app.use("/pdfjs-assets/cmaps", express.static(path.join(pdfAssetsDir, "cmaps"), { maxAge: "30d" }));
app.use("/pdfjs-assets/standard_fonts", express.static(path.join(pdfAssetsDir, "standard_fonts"), { maxAge: "30d" }));
app.use("/pdfjs-assets/wasm", express.static(path.join(pdfAssetsDir, "wasm"), { maxAge: "30d" }));
app.use("/pdfjs-assets/image_decoders", express.static(path.join(pdfAssetsDir, "image_decoders"), { maxAge: "30d" }));

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
