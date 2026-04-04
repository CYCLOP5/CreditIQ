import re

with open("src/llm/translator.py", "r") as f:
    content = f.read()

# For `translate` method:
replacement_translate = """
        for model in models_to_try:
            for attempt in range(3):
                try:
                    t0 = time.time()
                    req = urllib.request.Request(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json"
                        },
                        data=json.dumps({
                            "model": model,
                            "messages": [
                                {"role": "user", "content": "SYSTEM INSTRUCTION: You are an expert MSME credit analyst interpreting SHAP values for business users. Provide 5 distinct short numbered sentences translating the feature influences.\\n\\nUSER PROMPT: " + prompt}
                            ],
                        }).encode("utf-8")
                    )
                    with urllib.request.urlopen(req, timeout=15) as resp:
                        resp_data = json.loads(resp.read().decode())
                        content = resp_data["choices"][0]["message"]["content"]
                        duration = time.time() - t0
                        print(f"OpenRouter {model} inference {duration:.1f}s")
                        return parse_llm_output(content)
                except urllib.error.HTTPError as e:
                    if e.code == 429:
                        print(f"429 Too Many Requests with {model}. Waiting to retry...")
                        time.sleep(2 ** attempt)
                        continue
                    print(f"Failed with {model}: {e}")
                    break
                except Exception as e:
                    print(f"Failed with {model}: {e}")
                    break
        return ["Unable to generate explanation right now (network error)."]
"""

# Replace translate
content = re.sub(
    r"""        for model in models_to_try:
            try:
                t0 = time.time().*?return \["Unable to generate explanation right now \(network error\)."]""",
    replacement_translate.strip(),
    content,
    flags=re.DOTALL
)

# For `generate_sar` method:
replacement_sar = """
        for attempt in range(3):
            try:
                req = urllib.request.Request(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    data=json.dumps({
                        "model": "google/gemma-3-4b-it:free",
                        "messages": [
                            {"role": "user", "content": "SYSTEM INSTRUCTION: You are a fraud analyst outputting formal JSON Suspicious Activity Reports. Output ONLY valid JSON, adhering to: {\\"gstin\\": \\"string\\", \\"risk_level\\": \\"string\\", \\"structural_summary\\": \\"string\\", \\"immediate_action\\": \\"string\\"}. Do not use markdown blocks.\\n\\nUSER PROMPT: " + prompt}
                        ],
                    }).encode("utf-8")
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = json.loads(resp.read().decode())
                    content_str = data["choices"][0]["message"]["content"]
                    return json.loads(content_str)
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    print(f"SAR 429 Too Many Requests. Waiting to retry...")
                    time.sleep(2 ** attempt)
                    continue
                print("OpenRouter SAR fallback failed:", e)
                return {"error": "SAR generation failed", "raw": str(e)}
            except Exception as e:
                print("OpenRouter SAR fallback failed:", e)
                return {"error": "SAR generation failed", "raw": str(e)}
        return {"error": "SAR generation failed", "raw": "Max retries exceeded"}
"""

content = re.sub(
    r"""        try:
            req = urllib.request.Request\(.*?return \{"error": "SAR generation failed", "raw": str\(e\)\}""",
    replacement_sar.strip(),
    content,
    flags=re.DOTALL
)

with open("src/llm/translator.py", "w") as f:
    f.write(content)
