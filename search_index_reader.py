import json

with open('en.search-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for key, val in data.items():
    content = val.get('content', '')
    title = val.get('title', '')
    if 'deepen' in content.lower() or 'deepen' in title.lower() or 'smaranananda' in content.lower() or 'smaranananda' in title.lower():
        print(f"MATCH: {key} -> {title}")
