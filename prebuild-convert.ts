
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

async function convert() {
  const filePath = path.join(process.cwd(), 'Database.xlsx');
  
  if (!fs.existsSync(filePath)) {
    console.error('Database.xlsx not found');
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  
  const jsonData: any[] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    jsonData.push(values);
  });

  if (jsonData.length === 0) {
    console.error('Excel file is empty');
    process.exit(1);
  }

  // Header detection logic (replicated from App.tsx)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
    const row = jsonData[i];
    if (Array.isArray(row) && row.length >= 2) {
      const hasKeys = row.some(cell => {
        const c = String(cell || '').toLowerCase();
        return c === 'id' || c.includes('video') || c.includes('title') || c.includes('url') || c.includes('link') || c.includes('topic');
      });
      if (hasKeys) {
        headerRowIndex = i;
        break;
      }
    }
  }

  const headerRow = jsonData[headerRowIndex];
  let idIdx = 0, titleIdx = 1, urlIdx = 2, tagsIdx = 3;

  if (Array.isArray(headerRow)) {
    headerRow.forEach((cell, idx) => {
      const c = String(cell || '').toLowerCase();
      if (c === 'id' || c.includes('video id') || c === 'video') idIdx = idx;
      else if (c.includes('title')) titleIdx = idx;
      else if (c.includes('url') || c.includes('link') || c.includes('youtube')) urlIdx = idx;
      else if (c.includes('tag') || c.includes('theme') || c.includes('category') || c.includes('topic')) tagsIdx = idx;
    });
  }

  const videos: any[] = [];
  const videoMap = new Map<string, any>();

  jsonData.forEach((row, rowIndex) => {
    if (rowIndex <= headerRowIndex) return;
    if (!Array.isArray(row) || row.length < 2) return;
    
    const id = String(row[idIdx] || '').trim();
    if (!id || id.toLowerCase() === 'id' || id === '#NAME?' || id === '#REF!' || id === '#VALUE!') return;
    
    const title = String(row[titleIdx] || '').trim().replace(/‚Äú|‚Äù/g, '"').replace(/‚Äò|‚Äô/g, "'").replace(/‚Äî/g, '—');
    const url = String(row[urlIdx] || '').trim();
    if (!url) return;
    
    const rawTagsString = String(row[tagsIdx] || '');
    const rawTags = rawTagsString.split(/[|,;]/).map(t => t.trim()).filter(t => t !== '');
    
    const normalizedTags = Array.from(new Set(rawTags.map(t => {
      const lower = t.toLowerCase();
      if (lower === 'engilish' || lower === 'english') return 'English';
      if (lower === 'hindi') return 'Hindi';
      if (lower === 'tamil') return 'Tamil';
      if (lower === 'bengali') return 'Bengali';
      if (lower === 'telugu') return 'Telugu';
      if (lower === 'nepali') return 'Nepali';
      if (lower.includes('autobigraphy') || lower.includes('yoig')) return 'Autobiography of a Yogi';
      return t;
    })));

    videoMap.set(id, { id, title, url, tags: normalizedTags });
  });

  const finalVideos = Array.from(videoMap.values());
  
  if (!fs.existsSync('src/data')) {
    fs.mkdirSync('src/data', { recursive: true });
  }

  fs.writeFileSync('src/data/videos.json', JSON.stringify(finalVideos, null, 2));
  console.log(`Successfully converted ${finalVideos.length} videos to JSON`);
}

convert().catch(console.error);
