import urllib.request, json, os

api_key = os.environ.get("OPENROUTER_API_KEY", "")

try:
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        data=json.dumps({
            "model": "google/gemma-3-4b-it:free",
            "messages": [
                {"role": "user", "content": "System instruction: Return JSON.\n\nHello"}
            ],
        }).encode("utf-8")
    )
    with urllib.request.urlopen(req) as resp:
        print(resp.read().decode())
except Exception as e:
    if hasattr(e, 'read'):
        print(e.read().decode())
    else:
        print(e)
