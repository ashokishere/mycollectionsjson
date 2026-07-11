import urllib.request

urls = [
    "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHOEaEHKRTWEieC8JLjw_t-x2FSXDAbjMjfzx2Ph2U-HLDV-okeRCTGn9UvfpPicVTC2biAKJe09Uw-FHfU0YiIbOp3PDI4bzrJJZ_u4kCTbB8dWXt2vNPFoAh2P4vXNUPWGc9ZtBX9xkQj_IvviUo1u4dlwZfsFH2z",
    "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHyiXpsHJRM0EHN97RuXTW_E-Xjm9daqQtyjlaeeGdGTbGHVXR1BstesLrRYsozsqkmMK4rZmxMVrp_6v7bvkfAzRtT5b2QsNhZDm9zuNBYRN2r007gOnsCK4ZEgh2c81YS",
    "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFPTWToGJY6UZC36PKDyuVysao8B9oi_3SBlgjIBHU9FeNHnlz1mJyi1QOocVv7JORQ94Qj7igZeiPdPB3m7TD3AcNhHMcIAgV4vji-TWU8zgSNzM9uhwn2x244ADzeR89FIprQazeGBGQvNOMKF4w=",
    "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGThCQKl5LAQYNX7KGt5j-T1eu8yXSrmYbpR-k2WemlaAMJqtVBwrIVp_9cuAabawcCskOcW8j-GjGQ2L7yRLzui_SFyOWQj5e-AGOnc6-683gs0dlSXglQyK4lpTgTZhFb"
]

for url in urls:
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
        )
        with urllib.request.urlopen(req) as response:
            print("Real URL:", response.geturl())
    except Exception as e:
        print("Error for", url, ":", e)
