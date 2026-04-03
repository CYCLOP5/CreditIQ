"""
phi-3 chat format prompt templates for shap explanation translation
"""


SYSTEM_PROMPT: str = (
    "you are a backend financial signal translator for an msme credit scoring engine\n"
    "your only task is to translate raw feature attribution data into plain language explanations\n"
    "you must return exactly 5 short bullet points in english\n"
    "each bullet point must explain one factor that influenced the credit score\n"
    "do not use markdown formatting do not use asterisks do not use hyphens at start of bullets\n"
    "do not provide financial advice do not include conversational text\n"
    "output format is exactly 5 numbered lines starting with 1 2 3 4 5\n"
    "each line is one concise sentence describing the factor and its impact"
)


def format_sar_prompt(
    gstin: str,
    fraud_result: dict,
) -> str:
    """
    format phi-3 chat prompt for automated suspicious activity report
    takes cycle velocity recurrence metrics from networkx result
    """
    fraud_conf = fraud_result.get("fraud_confidence", 0.0)
    velocity = fraud_result.get("cycle_velocity", 0.0)
    recurrence = fraud_result.get("cycle_recurrence", 0.0)
    cycles = fraud_result.get("participating_cycles", [])

    prompt = (
        f"<|system|>\n"
        f"you are an aml compliance engine for msme lending\n"
        f"your only task is to generate a suspicious activity report sar detailing potential fraud rings\n"
        f"output the report natively in strict json format\n<|end|>\n"
        f"<|user|>\n"
        f"gstin: {gstin}\n"
        f"fraud_confidence: {fraud_conf:.4f}\n"
        f"cycle_velocity_inr: {velocity:.2f}\n"
        f"cycle_recurrence_days: {recurrence:.1f}\n"
        f"participating_cycle_paths: {cycles}\n"
        f"generate the sar output mapping to these keys: gstin, risk_level, structural_summary, immediate_action<|end|>\n"
        f"<|assistant|>\n"
    )
    return prompt


def format_shap_prompt(
    gstin: str,
    score: int,
    risk_band: str,
    top_5: list[dict],
) -> str:
    """
    format phi-3 instruct chat prompt from shap top 5 features
    uses phi-3 system user assistant chat template markers
    """
    feature_lines = "\n".join(
        f"feature: {item['feature_name']}, shap_impact: {item['shap_value']:.4f}, direction: {item['direction']}"
        for item in top_5
    )
    prompt = (
        f"<|system|>\n"
        f"{SYSTEM_PROMPT}<|end|>\n"
        f"<|user|>\n"
        f"gstin: {gstin}\n"
        f"credit_score: {score}\n"
        f"risk_band: {risk_band}\n"
        f"top_5_signal_attributions:\n"
        f"{feature_lines}\n"
        f"translate these 5 attributions into 5 plain language bullet points<|end|>\n"
        f"<|assistant|>\n"
    )
    return prompt


def parse_llm_output(raw_output: str) -> list[str]:
    """
    parse llm output extract exactly 5 bullet reasons
    strips formatting markdown numbers returns list of plain strings
    """
    stripped = raw_output.strip()
    lines = stripped.split("\n")
    non_empty = [ln.strip() for ln in lines if ln.strip()]

    cleaned: list[str] = []
    for ln in non_empty:
        ln = ln.lstrip("0123456789")
        ln = ln.lstrip(".)-: ")
        ln = ln.lstrip("-*• ")
        ln = ln.strip()
        if ln:
            cleaned.append(ln)

    while len(cleaned) < 5:
        cleaned.append("insufficient signal data for this factor")

    return cleaned[:5]
