import json
import re
from datetime import datetime

with open('full_extracted_talk.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Filter out initial headers or duplicate lines
filtered = []
for line in lines:
    line = line.strip()
    if not line:
        continue
    # Remove some header noise
    if line.startswith("[div] Documentation") or line.startswith("[div] Dayamata") or line.endswith("Fulfilling the Soul’s Deepest Needs"):
        continue
    if line.startswith("[a] Quick Recap"):
        continue
    filtered.append(line)

# Let's rebuild the markdown sequentially
markdown_lines = []
raw_paragraphs = []

markdown_lines.append("# Fulfilling the Soul’s Deepest Needs")
markdown_lines.append("\n### Monastic Discourse by Sri Daya Mata")
markdown_lines.append("\n---\n")

i = 0
n = len(filtered)

# We will process sequentially
while i < n:
    line = filtered[i]
    tag_match = re.match(r'^\[([a-z]+)\] (.*)$', line)
    if not tag_match:
        i += 1
        continue
    tag, content = tag_match.groups()
    
    # Handle headings
    if tag == 'a':
        markdown_lines.append(f"\n### {content}\n")
        raw_paragraphs.append(content)
        i += 1
        continue
        
    # Lookahead for badges + headers
    # E.g., [div] Opening and [div] Prayer and Welcome
    if i + 1 < n:
        next_line = filtered[i+1]
        next_tag_match = re.match(r'^\[([a-z]+)\] (.*)$', next_line)
        if next_tag_match:
            ntag, ncontent = next_tag_match.groups()
            
            # Match badge + subheader combination
            if (content in ["Opening", "History", "Kriya", "Spirit", "Time", "Sincerity", "Balance", "Practical", "Seclusion", "Unity", "Blessing"]) and ncontent in ["Prayer and Welcome", "The Writing of the \"Autobiography\"", "The Living Power of Kriya Yoga", "Seeking God First", "The Harvest of Youth", "Simple Guidelines for Peace", "Seclusion and Interiorization", "A Common Bond of Love", "Closing Meditation and Prayer"]:
                markdown_lines.append(f"\n**{content} • {ncontent}**\n")
                raw_paragraphs.append(f"{content} - {ncontent}")
                i += 2
                continue
                
    # If a quote
    if content.startswith('“') or content.startswith('"') or content.startswith('‘') or "Heavenly Father, Mother, Friend" in content or "Seek ye the kingdom" in content or "Seeking God" in content or "Learn to read good books" in content or "Set aside time for seclusion" in content or "Just keep your mind here" in content:
        markdown_lines.append(f"\n> *{content}*\n")
        raw_paragraphs.append(content)
    else:
        # Standard paragraph
        markdown_lines.append(f"\n{content}\n")
        raw_paragraphs.append(content)
        
    i += 1

# Join markdown
markdown_body = "".join(markdown_lines)
# Standardize spacing
markdown_body = re.sub(r'\n{3,}', '\n\n', markdown_body)

# Raw text for searching
raw_text = " ".join(raw_paragraphs)
raw_text = re.sub(r'\s+', ' ', raw_text).strip()

word_count = len(raw_text.split())

# Create JSON structure
data = {
    "id": "qZQFm856Coc",
    "title": "Fulfilling the Soul’s Deepest Needs | Sri Daya Mata",
    "url": "https://www.youtube.com/watch?v=qZQFm856Coc",
    "formattedMarkdown": markdown_body.strip(),
    "rawText": raw_text,
    "wordCount": word_count,
    "processedAt": datetime.utcnow().isoformat() + "Z"
}

# Write out
with open('public/transcripts/qZQFm856Coc.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Generated qZQFm856Coc.json with {word_count} words.")
