import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

interface RawSong {
  id: string;
  title: string;
  url: string;
  keywords: string[];
  album: string;
}

const RAW_SONGS: RawSong[] = [
  // Kriyananda Chants Yogananda
  { id: "46vTBeDN18U", title: "Do Not Dry the Ocean of My Love", url: "https://www.youtube.com/watch?v=46vTBeDN18U", keywords: ["Do Not", "Dry", "Ocean", "Love"], album: "Kriyananda Chants Yogananda" },
  { id: "nGFiOpU0wWY", title: "I Will Be Thine Always", url: "https://www.youtube.com/watch?v=nGFiOpU0wWY", keywords: ["Will", "Thine", "Always"], album: "Kriyananda Chants Yogananda" },
  { id: "dOVPUGgyAOg", title: "Door of My Heart", url: "https://www.youtube.com/watch?v=dOVPUGgyAOg", keywords: ["Door", "Heart"], album: "Kriyananda Chants Yogananda" },
  { id: "DZ8h-vMwIAo", title: "I Have Been Roaming", url: "https://www.youtube.com/watch?v=DZ8h-vMwIAo", keywords: ["Have", "Been", "Roaming"], album: "Kriyananda Chants Yogananda" },
  { id: "WX74Xo0s3oI", title: "Lord, When in Darkness", url: "https://www.youtube.com/watch?v=WX74Xo0s3oI", keywords: ["Lord", "When", "Darkness"], album: "Kriyananda Chants Yogananda" },
  { id: "B66fhAYZ9WQ", title: "Will That Day Come to Me, Ma", url: "https://www.youtube.com/watch?v=B66fhAYZ9WQ", keywords: ["Will", "That", "Day", "Come"], album: "Kriyananda Chants Yogananda" },
  { id: "VokbXlBluOo", title: "Blue Lotus Feet", url: "https://www.youtube.com/watch?v=VokbXlBluOo", keywords: ["Blue", "Lotus", "Feet"], album: "Kriyananda Chants Yogananda" },
  { id: "EZHA9e96Kcs", title: "When I Awake", url: "https://www.youtube.com/watch?v=EZHA9e96Kcs", keywords: ["When", "Awake"], album: "Kriyananda Chants Yogananda" },
  { id: "xHYY33G42Ys", title: "Om Namo Bhagavate", url: "https://www.youtube.com/watch?v=xHYY33G42Ys", keywords: ["Namo", "Bhagavate"], album: "Kriyananda Chants Yogananda" },

  // O God Beautiful
  { id: "R-NnX0FA69I", title: "Dawn Chant", url: "https://www.youtube.com/watch?v=R-NnX0FA69I", keywords: ["Dawn", "Chant"], album: "O God Beautiful" },
  { id: "01EYgZI4QE8", title: "Deliver Us from Delusion", url: "https://www.youtube.com/watch?v=01EYgZI4QE8", keywords: ["Deliver", "From", "Delusion"], album: "O God Beautiful" },
  { id: "iTcWz2ZjRsY", title: "Door of My Heart", url: "https://www.youtube.com/watch?v=iTcWz2ZjRsY", keywords: ["Door", "Heart"], album: "O God Beautiful" },
  { id: "0uPBYW72s8U", title: "Listen, Listen, Listen", url: "https://www.youtube.com/watch?v=0uPBYW72s8U", keywords: ["Listen"], album: "O God Beautiful" },
  { id: "lQaCc9UAUqk", title: "I Am Free", url: "https://www.youtube.com/watch?v=lQaCc9UAUqk", keywords: ["Free"], album: "O God Beautiful" },
  { id: "NZwpn7IwH0o", title: "Thou Art My Life", url: "https://www.youtube.com/watch?v=NZwpn7IwH0o", keywords: ["Thou", "Art", "Life"], album: "O God Beautiful" },
  { id: "5xWsG8a5hMU", title: "In the Temple of Silence", url: "https://www.youtube.com/watch?v=5xWsG8a5hMU", keywords: ["Temple", "Silence"], album: "O God Beautiful" },
  { id: "W6H1eEDWs54", title: "Who Is in My Temple", url: "https://www.youtube.com/watch?v=W6H1eEDWs54", keywords: ["Who", "Temple"], album: "O God Beautiful" },
  { id: "yVR9LHwzdjA", title: "Polestar of My Life", url: "https://www.youtube.com/watch?v=yVR9LHwzdjA", keywords: ["Polestar", "Life"], album: "O God Beautiful" },
  { id: "6-T3HaTLhRk", title: "I Give You My Soul Call", url: "https://www.youtube.com/watch?v=6-T3HaTLhRk", keywords: ["Give", "You", "Soul", "Call"], album: "O God Beautiful" },
  { id: "TqVqG0Tsing", title: "Divine Love Sorrows", url: "https://www.youtube.com/watch?v=TqVqG0Tsing", keywords: ["Divine", "Love", "Sorrows"], album: "O God Beautiful" },
  { id: "eP0yjkXzvN0", title: "Blue Lotus Feet", url: "https://www.youtube.com/watch?v=eP0yjkXzvN0", keywords: ["Blue", "Lotus", "Feet"], album: "O God Beautiful" },
  { id: "OhhEoeHMJxY", title: "O God Beautiful", url: "https://www.youtube.com/watch?v=OhhEoeHMJxY", keywords: ["God", "Beautiful"], album: "O God Beautiful" },
  { id: "wFpOB2fNLFM", title: "Jenny Will Love Me", url: "https://www.youtube.com/watch?v=wFpOB2fNLFM", keywords: ["Jenny", "Will", "Love"], album: "O God Beautiful" },
  { id: "UbdVU0FvKI0", title: "Springtime in Romania", url: "https://www.youtube.com/watch?v=UbdVU0FvKI0", keywords: ["Springtime", "Romania"], album: "O God Beautiful" },
  { id: "pSOW18RIzJM", title: "The Hill That Was Tara", url: "https://www.youtube.com/watch?v=pSOW18RIzJM", keywords: ["Hill", "That", "Was", "Tara"], album: "O God Beautiful" },
  { id: "wsadTliaOLw", title: "Song of the Nightingale", url: "https://www.youtube.com/watch?v=wsadTliaOLw", keywords: ["Song", "Nightingale"], album: "O God Beautiful" },
  { id: "l7n9l9VbLGg", title: "Imogen's Song", url: "https://www.youtube.com/watch?v=l7n9l9VbLGg", keywords: ["Imogens", "Song"], album: "O God Beautiful" },
  { id: "AOgBIVsXmZQ", title: "I Live Without Fear", url: "https://www.youtube.com/watch?v=AOgBIVsXmZQ", keywords: ["Live", "Without", "Fear"], album: "O God Beautiful" },
  { id: "xAHNai6x5_4", title: "Have You Seen Sorrento?", url: "https://www.youtube.com/watch?v=xAHNai6x5_4", keywords: ["Have", "You", "Seen", "Sorrento"], album: "O God Beautiful" },
  { id: "3FMyunhwGzc", title: "In the Spirit", url: "https://www.youtube.com/watch?v=3FMyunhwGzc", keywords: ["Spirit"], album: "O God Beautiful" },

  // Soul Songs
  { id: "YJSY28qKSwc", title: "Mother of Us All", url: "https://www.youtube.com/watch?v=YJSY28qKSwc", keywords: ["Mother", "All"], album: "Soul Songs" },
  { id: "RNHF19b5D8s", title: "Memories", url: "https://www.youtube.com/watch?v=RNHF19b5D8s", keywords: ["Memories"], album: "Soul Songs" },
  { id: "xpV0eG7JHJA", title: "Deirdre's Sorrows", url: "https://www.youtube.com/watch?v=xpV0eG7JHJA", keywords: ["Deirdres", "Sorrows"], album: "Soul Songs" },
  { id: "lKTD-K5NDUU", title: "Irish Lullaby", url: "https://www.youtube.com/watch?v=lKTD-K5NDUU", keywords: ["Irish", "Lullaby"], album: "Soul Songs" },
  { id: "jG95RXgLDvE", title: "Good Night, Sweetheart", url: "https://www.youtube.com/watch?v=jG95RXgLDvE", keywords: ["Good", "Night", "Sweetheart"], album: "Soul Songs" },
  { id: "mqbQtU4nzRI", title: "Who Is Silvia?", url: "https://www.youtube.com/watch?v=mqbQtU4nzRI", keywords: ["Who", "Silvia"], album: "Soul Songs" },
  { id: "OOmUYs3QhEM", title: "Memories of That Isle", url: "https://www.youtube.com/watch?v=OOmUYs3QhEM", keywords: ["Memories", "That", "Isle"], album: "Soul Songs" },
  { id: "L9Gnt1gqZbI", title: "Dare to Be Different!", url: "https://www.youtube.com/watch?v=L9Gnt1gqZbI", keywords: ["Dare", "Different"], album: "Soul Songs" },
  { id: "7F4fZgOdh2Q", title: "Dublin Town", url: "https://www.youtube.com/watch?v=7F4fZgOdh2Q", keywords: ["Dublin", "Town"], album: "Soul Songs" },
  { id: "BSN3yhFY-XY", title: "Walk Like a Man", url: "https://www.youtube.com/watch?v=BSN3yhFY-XY", keywords: ["Walk", "Like", "Man"], album: "Soul Songs" },
  { id: "fLCkB1ilGcw", title: "Home Is a Green Hill", url: "https://www.youtube.com/watch?v=fLCkB1ilGcw", keywords: ["Home", "Green", "Hill"], album: "Soul Songs" },
  { id: "1XaomJfDea8", title: "Peace", url: "https://www.youtube.com/watch?v=1XaomJfDea8", keywords: ["Peace"], album: "Soul Songs" },
  { id: "BBVUSaGOkms", title: "Ra Ma", url: "https://www.youtube.com/watch?v=BBVUSaGOkms", keywords: ["Ra Ma"], album: "Soul Songs" },
  { id: "gRQUxysVfhc", title: "Love Is a Magician", url: "https://www.youtube.com/watch?v=gRQUxysVfhc", keywords: ["Love", "Magician"], album: "Soul Songs" },

  // Windows on the World
  { id: "9eTpuOozsMg", title: "Mother of Us All", url: "https://www.youtube.com/watch?v=9eTpuOozsMg", keywords: ["Mother", "All"], album: "Windows on the World" },
  { id: "NKdb_RG55lk", title: "Through Many Lives", url: "https://www.youtube.com/watch?v=NKdb_RG55lk", keywords: ["Through", "Many", "Lives"], album: "Windows on the World" },
  { id: "dbYtPk0d2Lk", title: "Krishna’s Flute", url: "https://www.youtube.com/watch?v=dbYtPk0d2Lk", keywords: ["Krishnas", "Flute"], album: "Windows on the World" },
  { id: "BSSnbl3ZvOM", title: "Wander with Thee", url: "https://www.youtube.com/watch?v=BSSnbl3ZvOM", keywords: ["Wander", "Thee"], album: "Windows on the World" },
  { id: "WZyJETlxFmU", title: "Cloisters", url: "https://www.youtube.com/watch?v=WZyJETlxFmU", keywords: ["Cloisters"], album: "Windows on the World" },
  { id: "cdkRvCe8Fb4", title: "God’s Call Within", url: "https://www.youtube.com/watch?v=cdkRvCe8Fb4", keywords: ["Gods", "Call", "Within"], album: "Windows on the World" },
  { id: "yUrJCGxQ5N4", title: "I Live Without Fear", url: "https://www.youtube.com/watch?v=yUrJCGxQ5N4", keywords: ["Live", "Without", "Fear"], album: "Windows on the World" },
  { id: "oGZtQXjvUpk", title: "I’ve Passed My Life as a Stranger", url: "https://www.youtube.com/watch?v=oGZtQXjvUpk", keywords: ["Ive", "Passed", "Life", "Stranger"], album: "Windows on the World" },
  { id: "BH0I-WRgCnw", title: "Lord Most High", url: "https://www.youtube.com/watch?v=BH0I-WRgCnw", keywords: ["Lord", "Most", "High"], album: "Windows on the World" },
  { id: "WB566jWanq8", title: "Monasteries", url: "https://www.youtube.com/watch?v=WB566jWanq8", keywords: ["Monasteries"], album: "Windows on the World" },
  { id: "YfAfpXeaVcY", title: "Life Flows on Like a River", url: "https://www.youtube.com/watch?v=YfAfpXeaVcY", keywords: ["Life", "Flows", "Like", "River"], album: "Windows on the World" },
  { id: "fmHDBBn4fsQ", title: "Farther Away Than the Stars", url: "https://www.youtube.com/watch?v=fmHDBBn4fsQ", keywords: ["Farther", "Away", "Than", "Stars"], album: "Windows on the World" },
  { id: "rk25hOuJR1Q", title: "Christmas Mystery", url: "https://www.youtube.com/watch?v=rk25hOuJR1Q", keywords: ["Christmas", "Mystery"], album: "Windows on the World" },
  { id: "PHtuzSFSLdk", title: "Peace", url: "https://www.youtube.com/watch?v=PHtuzSFSLdk", keywords: ["Peace"], album: "Windows on the World" },

  // Song of the Nightingale
  { id: "gtAVN2OED5I", title: "Song of the Nightingale", url: "https://www.youtube.com/watch?v=gtAVN2OED5I", keywords: ["Song", "Nightingale"], album: "Song of the Nightingale" },
  { id: "IBZfpIbzAIo", title: "Lullaby", url: "https://www.youtube.com/watch?v=IBZfpIbzAIo", keywords: ["Lullaby"], album: "Song of the Nightingale" },
  { id: "I43zBnoA4wE", title: "Irish Lullaby", url: "https://www.youtube.com/watch?v=I43zBnoA4wE", keywords: ["Irish", "Lullaby"], album: "Song of the Nightingale" },
  { id: "QI1NOwR1NBY", title: "Go with Love", url: "https://www.youtube.com/watch?v=QI1NOwR1NBY", keywords: ["Love"], album: "Song of the Nightingale" },
  { id: "JchM6jhzRUo", title: "Chinese Garden", url: "https://www.youtube.com/watch?v=JchM6jhzRUo", keywords: ["Chinese", "Garden"], album: "Song of the Nightingale" },
  { id: "3FsrlDgKfkA", title: "Temple of Sleep", url: "https://www.youtube.com/watch?v=3FsrlDgKfkA", keywords: ["Temple", "Sleep"], album: "Song of the Nightingale" },
  { id: "p2zGAxwznOU", title: "Life Is a Dream", url: "https://www.youtube.com/watch?v=p2zGAxwznOU", keywords: ["Life", "Dream"], album: "Song of the Nightingale" },
  { id: "h-JsJf5MIQo", title: "Goodnight, Sweetheart", url: "https://www.youtube.com/watch?v=h-JsJf5MIQo", keywords: ["Goodnight", "Sweetheart"], album: "Song of the Nightingale" },
  { id: "MN-AqPOv2N0", title: "Galilee", url: "https://www.youtube.com/watch?v=MN-AqPOv2N0", keywords: ["Galilee"], album: "Song of the Nightingale" },
  { id: "LZ7ChCLrfYI", title: "Canticle of the Creatures", url: "https://www.youtube.com/watch?v=LZ7ChCLrfYI", keywords: ["Canticle", "Creatures"], album: "Song of the Nightingale" },
  { id: "5hhnMDE215A", title: "Desert Solitude", url: "https://www.youtube.com/watch?v=5hhnMDE215A", keywords: ["Desert", "Solitude"], album: "Song of the Nightingale" },
  { id: "x1DF_9nCdNI", title: "Psalm of David", url: "https://www.youtube.com/watch?v=x1DF_9nCdNI", keywords: ["Psalm", "David"], album: "Song of the Nightingale" },
  { id: "Anmf7oi7q08", title: "Make Us Channels of Thy Peace", url: "https://www.youtube.com/watch?v=Anmf7oi7q08", keywords: ["Make", "Channels", "Thy", "Peace"], album: "Song of the Nightingale" },
  { id: "5E-MpOhOwwQ", title: "Cherry Blossoms in Kyoto", url: "https://www.youtube.com/watch?v=5E-MpOhOwwQ", keywords: ["Cherry", "Blossoms", "Kyoto"], album: "Song of the Nightingale" },
  { id: "kXeruTp_eJo", title: "When Thy Shining Foot Shall Pass", url: "https://www.youtube.com/watch?v=kXeruTp_eJo", keywords: ["When", "Thy", "Shining", "Foot", "Shall"], album: "Song of the Nightingale" },
  { id: "yKwsJUzLBac", title: "Life Is the Quest for Joy", url: "https://www.youtube.com/watch?v=yKwsJUzLBac", keywords: ["Life", "Quest", "Joy"], album: "Song of the Nightingale" },
  { id: "9kHa8722ddg", title: "When My Dream's Dream Is Done", url: "https://www.youtube.com/watch?v=9kHa8722ddg", keywords: ["When", "Dreams", "Dream", "Done"], album: "Song of the Nightingale" }
];

console.log(`Loaded ${RAW_SONGS.length} songs from input.`);

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
        i++;
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

const formatCsvCell = (val: string): string => {
  const s = String(val || "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

async function main() {
  // 1. Update Database.csv and public/Database.csv
  const csvPath = path.join(process.cwd(), 'Database.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);

  // Check header
  const header = rows[0] || ["VideoID", "Title", "URL", "Topic", "Status", "Talk By"];
  const existingIds = new Set(rows.slice(1).map(r => r[0]));

  const newRows: string[][] = [];
  for (const song of RAW_SONGS) {
    if (existingIds.has(song.id)) {
      console.log(`Skipping already existing ID in CSV: ${song.id}`);
      continue;
    }

    // Build Topic:
    // Swami Kriyananda|Swamy Kiryananda|Chants|Devotional Chants|Songs|<album>|<keywords...>
    const topicParts = [
      "Swami Kriyananda",
      "Swamy Kiryananda",
      "Devotional Chants",
      "Chants",
      "Songs",
      song.album,
      ...song.keywords
    ];
    const uniqueTopic = Array.from(new Set(topicParts)).join("|") + "|";

    newRows.push([
      song.id,
      song.title,
      song.url,
      uniqueTopic,
      "completed",
      "Swami Kriyananda"
    ]);
  }

  console.log(`Adding ${newRows.length} new rows to Database.csv...`);
  const allRows = [...rows, ...newRows];
  const updatedCsvContent = allRows.map(r => r.map(formatCsvCell).join(",")).join("\n");

  fs.writeFileSync(csvPath, updatedCsvContent);
  fs.writeFileSync(path.join(process.cwd(), 'public/Database.csv'), updatedCsvContent);
  console.log(`Successfully updated Database.csv and public/Database.csv (${allRows.length} total rows).`);

  // 2. Regenerate Database.xlsx and public/Database.xlsx
  console.log('Generating Excel workbooks...');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');
  allRows.forEach(row => {
    if (row.some(c => c.trim() !== "")) {
      worksheet.addRow(row.map(c => c.trim()));
    }
  });
  await workbook.xlsx.writeFile(path.join(process.cwd(), 'Database.xlsx'));
  await workbook.xlsx.writeFile(path.join(process.cwd(), 'public/Database.xlsx'));
  console.log('Successfully updated Database.xlsx and public/Database.xlsx.');

  // 3. Update src/data/videos.json
  const videosJsonPath = path.join(process.cwd(), 'src/data/videos.json');
  let currentVideos: Array<{ id: string; title: string; url: string; tags: string[] }> = [];
  if (fs.existsSync(videosJsonPath)) {
    currentVideos = JSON.parse(fs.readFileSync(videosJsonPath, 'utf-8'));
  }

  const existingVideoMap = new Map<string, { id: string; title: string; url: string; tags: string[] }>();
  currentVideos.forEach(v => existingVideoMap.set(v.id, v));

  for (const song of RAW_SONGS) {
    const tags = Array.from(new Set([
      "Swami Kriyananda",
      "Swamy Kiryananda",
      "Devotional Chants",
      "Chants",
      "Songs",
      song.album,
      ...song.keywords
    ]));

    if (existingVideoMap.has(song.id)) {
      const existing = existingVideoMap.get(song.id)!;
      existing.tags = Array.from(new Set([...existing.tags, ...tags]));
    } else {
      existingVideoMap.set(song.id, {
        id: song.id,
        title: song.title,
        url: song.url,
        tags
      });
    }
  }

  const updatedVideos = Array.from(existingVideoMap.values());
  fs.writeFileSync(videosJsonPath, JSON.stringify(updatedVideos, null, 2));
  console.log(`Successfully updated src/data/videos.json (${updatedVideos.length} total videos).`);

  // 4. Update src/data/devotional_albums.json
  const devotionalAlbumsPath = path.join(process.cwd(), 'src/data/devotional_albums.json');
  const albums: any[] = JSON.parse(fs.readFileSync(devotionalAlbumsPath, 'utf-8'));

  const albumDefinitions = [
    {
      id: "kriyananda-chants-yogananda",
      name: "Kriyananda Chants Yogananda",
      description: "Sacred chants of Paramahansa Yogananda sung and played by Swami Kriyananda.",
      themeColor: "text-amber-400",
      accentColor: "amber",
      icon: "Flame",
      artist: "Swami Kriyananda",
      tags: ["Swami Kriyananda", "Swamy Kiryananda", "Chants", "Devotional Chants"]
    },
    {
      id: "o-god-beautiful",
      name: "O God Beautiful",
      description: "Devotional chants and inspirational songs of soul longing and joy.",
      themeColor: "text-rose-400",
      accentColor: "rose",
      icon: "Heart",
      artist: "Swami Kriyananda",
      tags: ["Swami Kriyananda", "Swamy Kiryananda", "Chants", "Devotional Chants"]
    },
    {
      id: "soul-songs-kriyananda",
      name: "Soul Songs",
      description: "Uplifting melodies, folklore, and devotional soul expressions by Swami Kriyananda.",
      themeColor: "text-indigo-400",
      accentColor: "indigo",
      icon: "Music",
      artist: "Swami Kriyananda",
      tags: ["Swami Kriyananda", "Swamy Kiryananda", "Chants", "Songs"]
    },
    {
      id: "windows-on-the-world",
      name: "Windows on the World",
      description: "Global spiritual songs and contemplative musical journeys across sacred traditions.",
      themeColor: "text-cyan-400",
      accentColor: "cyan",
      icon: "Compass",
      artist: "Swami Kriyananda",
      tags: ["Swami Kriyananda", "Swamy Kiryananda", "Chants", "Songs"]
    },
    {
      id: "song-of-the-nightingale",
      name: "Song of the Nightingale",
      description: "Mystical melodies, prayers of peace, and soul poetry by Swami Kriyananda.",
      themeColor: "text-emerald-400",
      accentColor: "emerald",
      icon: "Sun",
      artist: "Swami Kriyananda",
      tags: ["Swami Kriyananda", "Swamy Kiryananda", "Chants", "Songs"]
    }
  ];

  for (const def of albumDefinitions) {
    const albumTracks = RAW_SONGS
      .filter(s => s.album === def.name)
      .map(s => ({
        id: s.id,
        title: s.title,
        desc: `Devotional song by Swami Kriyananda (${def.name}).`,
        icon: "Music",
        tags: ["Swami Kriyananda", "Swamy Kiryananda", def.name, ...s.keywords]
      }));

    const existingAlbumIndex = albums.findIndex(a => a.name === def.name || a.id === def.id);
    if (existingAlbumIndex >= 0) {
      albums[existingAlbumIndex] = {
        ...albums[existingAlbumIndex],
        ...def,
        tracks: albumTracks
      };
      console.log(`Updated album in devotional_albums.json: ${def.name} (${albumTracks.length} tracks)`);
    } else {
      albums.push({
        ...def,
        tracks: albumTracks
      });
      console.log(`Appended new album to devotional_albums.json: ${def.name} (${albumTracks.length} tracks)`);
    }
  }

  fs.writeFileSync(devotionalAlbumsPath, JSON.stringify(albums, null, 2));
  console.log(`Successfully updated src/data/devotional_albums.json (${albums.length} total albums).`);
}

main().catch(err => {
  console.error("Error running script:", err);
  process.exit(1);
});
