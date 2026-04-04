"""
phi-3-mini local llm inference via llama-cpp-python
cpu-only inference n_gpu_layers=0
translates shap vectors to plain language credit reasons
"""

import os
import json
import time
from pathlib import Path



from src.llm.prompts import format_shap_prompt, parse_llm_output, format_sar_prompt


SAR_GBNF_GRAMMAR: str = '''
root ::= "{" ws "\"gstin\"" ws ":" ws string "," ws "\"risk_level\"" ws ":" ws string "," ws "\"structural_summary\"" ws ":" ws string "," ws "\"immediate_action\"" ws ":" ws string "}"
string ::= "\"" [^"]* "\""
ws ::= [ \t\n]*
'''


class ShapTranslator:
    """
    loads phi-3-mini gguf model via llama-cpp-python
    cpu-only inference n_gpu_layers=0
    translates top 5 shap features to plain language
    """

    def __init__(
        self,
        model_path: str = "",
        n_ctx: int = 2048,
        n_threads: int = 4,
    ) -> None:
        from config.settings import settings
        self.api_key = settings.openrouter_api_key
        self.model = "qwen/qwen3.6-plus:free"
        print("Using OpenRouter exclusively")

    def translate(
        self,
        gstin: str,
        score: int,
        risk_band: str,
        top_5: list[dict],
        max_tokens: int = 512,
    ) -> list[str]:
        from src.llm.prompts import format_shap_prompt, parse_llm_output
        prompt = format_shap_prompt(gstin, score, risk_band, top_5)
        import time, json, urllib.request
        
        # Try primary model requested by user
        models_to_try = [
            "qwen/qwen3.6-plus:free"
        ]
        
        for model in models_to_try:
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
                            {"role": "system", "content": "You are an expert MSME credit analyst interpreting SHAP values for business users. Provide 5 distinct short numbered sentences translating the feature influences."},
                            {"role": "user", "content": prompt}
                        ],
                    }).encode("utf-8")
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    resp_data = json.loads(resp.read().decode())
                    content = resp_data["choices"][0]["message"]["content"]
                    duration = time.time() - t0
                    print(f"OpenRouter {model} inference {duration:.1f}s")
                    return parse_llm_output(content)
            except Exception as e:
                print(f"Failed with {model}: {e}")
                
        return ["Unable to generate explanation right now (network error)."]

    def translate_from_explain_result(
        self,
        gstin: str,
        score: int,
        risk_band: str,
        explain_result: dict,
    ) -> list[str]:
        """
        convenience method takes explain_result from creditexplainer
        extracts top5 and calls translate
        """
        top_5 = explain_result["top_5_features"]
        return self.translate(gstin, score, risk_band, top_5)

    def generate_sar(
        self,
        gstin: str,
        fraud_result: dict,
        max_tokens: int = 1024,
    ) -> dict:
        from src.llm.prompts import format_sar_prompt
        prompt = format_sar_prompt(gstin, fraud_result)
        import time, json, urllib.request
        try:
            req = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                data=json.dumps({
                    "model": "qwen/qwen3.6-plus:free",
                    "response_format": { "type": "json_object" },
                    "messages": [
                        {"role": "system", "content": "You are a fraud analyst outputting formal JSON Suspicious Activity Reports. Output ONLY valid JSON, adhering to: {\"gstin\": \"string\", \"risk_level\": \"string\", \"structural_summary\": \"string\", \"immediate_action\": \"string\"}"},
                        {"role": "user", "content": prompt}
                    ],
                }).encode("utf-8")
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
                content = data["choices"][0]["message"]["content"]
                return json.loads(content)
        except Exception as e:
            print("OpenRouter SAR fallback failed:", e)
            return {"error": "SAR generation failed", "raw": str(e)}


def get_model_path(model_dir: str = "data/models") -> Path:
    """
    find gguf model file in model dir
    returns path to first gguf file found
    """
    model_path = Path(model_dir)
    gguf_files = list(model_path.glob("*.gguf"))
    if not gguf_files:
        raise FileNotFoundError(f"no gguf model found in {model_dir}")
    return gguf_files[0]
