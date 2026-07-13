import ExcelJS from 'exceljs';
import fs from 'fs';

const parseCSV = (content: string): string[][] => {
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
};

async function main() {
  if (!fs.existsSync('Database.csv')) {
    console.error('Database.csv not found');
    process.exit(1);
  }

  console.log('Reading Database.csv...');
  const csvContent = fs.readFileSync('Database.csv', 'utf-8');
  const rows = parseCSV(csvContent);
  console.log(`Parsed ${rows.length} rows from CSV`);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('sample2');

  rows.forEach((row) => {
    // Convert string cell values to clean values, strip extra whitespace
    const cleanRow = row.map(cell => {
      const trimmed = cell.trim();
      // If it looks like a number, we can convert it, but keep everything as string/text if appropriate.
      return trimmed;
    });
    // Filter out completely empty rows
    if (cleanRow.some(val => val !== "")) {
      worksheet.addRow(cleanRow);
    }
  });

  console.log('Writing Database.xlsx...');
  await workbook.xlsx.writeFile('Database.xlsx');
  console.log('Successfully regenerated Database.xlsx from Database.csv!');
}

main().catch(console.error);
