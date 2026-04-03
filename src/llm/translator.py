"""
phi-3-mini local llm inference via llama-cpp-python
cpu-only inference n_gpu_layers=0
translates shap vectors to plain language credit reasons
"""

import json
import time
from pathlib import Path

from llama_cpp import Llama, LlamaGrammar

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
        model_path: str | Path,
        n_ctx: int = 2048,
        n_threads: int = 4,
    ) -> None:
        print("loading phi-3-mini")
        self.llm = Llama(
            model_path=str(model_path),
            n_gpu_layers=0,
            n_ctx=n_ctx,
            n_threads=n_threads,
            verbose=False,
        )
        self.model_path = model_path
        print("phi-3-mini loaded cpu inference")

    def translate(
        self,
        gstin: str,
        score: int,
        risk_band: str,
        top_5: list[dict],
        max_tokens: int = 512,
    ) -> list[str]:
        """
        translate top 5 shap features to plain language reasons
        logs token throughput and inference duration
        returns exactly 5 strings
        """
        prompt = format_shap_prompt(gstin, score, risk_band, top_5)
        t0 = time.time()
        response = self.llm(
            prompt,
            max_tokens=max_tokens,
            stop=["<|end|>", "<|user|>"],
            echo=False,
        )
        duration = time.time() - t0
        text = response["choices"][0]["text"]
        tokens = response["usage"]["completion_tokens"]
        throughput = tokens / duration if duration > 0 else 0.0
        print(f"phi-3 inference {duration:.1f}s {throughput:.1f} tok/s")
        return parse_llm_output(text)

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
        """
        runs grammar constrained inference on cycle detector fraud results
        outputs formally structured sar suspicious activity report
        forces valid json through llama cpp grammar parser
        """
        grammar = LlamaGrammar.from_string(SAR_GBNF_GRAMMAR)
        prompt = format_sar_prompt(gstin, fraud_result)
        t0 = time.time()
        print(f"phi-3 drafting sar for {gstin}")

        response = self.llm(
            prompt,
            max_tokens=max_tokens,
            grammar=grammar,
            stop=["<|end|>"],
            echo=False,
        )

        duration = time.time() - t0
        text = response["choices"][0]["text"]
        tokens = response["usage"]["completion_tokens"]
        throughput = tokens / duration if duration > 0 else 0.0
        print(f"sar generated {duration:.1f}s {throughput:.1f} tok/s")

        try:
            return json.loads(text.strip())
        except json.JSONDecodeError:
            return {"error": "grammar failed to enforce valid json", "raw": text}


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
