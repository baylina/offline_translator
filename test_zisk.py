import requests
import json

url = "http://localhost:8000/translate"
payload = {
    "text": "Hola mundo",
    "src_lang": "spa_Latn",
    "tgt_lang": "eng_Latn",
    "verified_mode": True
}

try:
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
