"""
scorer class for xgboost msme credit model
loads persisted model runs inference maps to 300-900 scale
"""

import json
from pathlib import Path

import numpy as np
import xgboost as xgb

from src.features.schemas import EngineeredFeatureVector as FeatureVector
from src.scoring.trainer import to_sparse_if_needed


RISK_BANDS: dict = {
    "very_low_risk": {
        "min": 750,
        "max": 900,
        "wc_max_lakh": 50,
        "term_max_lakh": 100,
        "tenure_wc_months": 12,
        "tenure_term_months": 84,
        "cgtmse_eligible": True,
        "collateral_free": True,
    },
    "low_risk": {
        "min": 650,
        "max": 749,
        "wc_max_lakh": 25,
        "term_max_lakh": 50,
        "tenure_wc_months": 12,
        "tenure_term_months": 60,
        "cgtmse_eligible": True,
        "collateral_free": True,
    },
    "medium_risk": {
        "min": 550,
        "max": 649,
        "wc_max_lakh": 10,
        "term_max_lakh": 25,
        "tenure_wc_months": 12,
        "tenure_term_months": 36,
        "cgtmse_eligible": True,
        "collateral_free": True,
    },
    "high_risk": {
        "min": 300,
        "max": 549,
        "wc_max_lakh": 5,
        "term_max_lakh": 0,
        "tenure_wc_months": 12,
        "tenure_term_months": 0,
        "cgtmse_eligible": False,
        "collateral_free": False,
        "mudra_eligible": True,
    },
}


class CreditScorer:
    """
    loads xgboost model and feature column list
    provides single sample and batch inference
    maps probability to 300-900 score
    routes to upi heavy model if requested
    """

    def __init__(self, model_dir: str | Path = "data/models") -> None:
        model_dir = Path(model_dir)
        self.model_full = xgb.XGBClassifier()
        self.model_full.load_model(str(model_dir / "xgb_credit.ubj"))

        self.model_upi = xgb.XGBClassifier()
        self.model_upi.load_model(str(model_dir / "xgb_credit_upi_heavy.ubj"))

        with open(model_dir / "feature_columns.json", "r") as fh:
            self.feature_columns: list[str] = json.load(fh)

        with open(model_dir / "label_encoder.json", "r") as fh:
            self.label_encoder: dict = json.load(fh)

        print("dual models loaded full data and upi heavy")

    def _prob_to_score(self, prob: float) -> int:
        """
        linear map probability to 300-900 scale
        prob 0.0 equals score 900 prob 1.0 equals score 300
        """
        raw = int(900 - (prob * 600))
        return int(np.clip(raw, 300, 900))

    def _score_to_band(self, score: int) -> str:
        """
        map integer score to risk band string
        very_low_risk low_risk medium_risk high_risk
        """
        for band_name, band_cfg in RISK_BANDS.items():
            if band_cfg["min"] <= score <= band_cfg["max"]:
                return band_name
        return "high_risk"

    def _band_to_recommendation(
        self, band: str, prob: float, msme_category: str = "micro"
    ) -> dict:
        """
        generate dynamic loan recommendation calculating expected loss
        el equals pd times lgd times exposure must stay below risk appetite
        """
        band_cfg = RISK_BANDS.get(band, RISK_BANDS["high_risk"])
        
        lgd = 0.45
        max_el_acceptable = 50000.0

        optimal_wc = 0.0
        max_wc_allowed = band_cfg["wc_max_lakh"] * 100000
        for amt in range(100000, max_wc_allowed + 100000, 100000):
            el = prob * lgd * amt
            if el <= max_el_acceptable:
                optimal_wc = float(amt)
            else:
                break

        optimal_term = 0.0
        max_term_allowed = band_cfg["term_max_lakh"] * 100000
        for amt in range(100000, max_term_allowed + 100000, 100000):
            el = prob * lgd * amt
            if el <= max_el_acceptable * 2.0:
                optimal_term = float(amt)
            else:
                break

        return {
            "recommended_wc_amount": optimal_wc,
            "recommended_term_amount": optimal_term,
            "tenure_wc_months": band_cfg["tenure_wc_months"],
            "tenure_term_months": band_cfg["tenure_term_months"],
            "cgtmse_eligible": band_cfg["cgtmse_eligible"],
            "collateral_free": band_cfg["collateral_free"],
            "mudra_eligible": band_cfg.get("mudra_eligible", False),
        }

    def score_features(
        self,
        feature_vector: dict,
        msme_category: str = "micro",
        use_upi_model: bool = False,
    ) -> dict:
        """
        score single feature vector dict return full scoring payload
        handles missing features with zero fill
        routes inference to full model or upi heavy based on flag
        """
        row = np.array(
            [float(feature_vector.get(col, 0)) for col in self.feature_columns],
            dtype=np.float32,
        ).reshape(1, -1)

        X = to_sparse_if_needed(row)
        model = self.model_upi if use_upi_model else self.model_full
        prob = float(model.predict_proba(X)[0][1])
        score = self._prob_to_score(prob)
        band = self._score_to_band(score)
        rec = self._band_to_recommendation(band, prob, msme_category)

        return {
            "credit_score": score,
            "risk_band": band,
            "probability_of_default": prob,
            "recommended_wc_amount": rec["recommended_wc_amount"],
            "recommended_term_amount": rec["recommended_term_amount"],
            "recommended_wc_tenure_months": rec["tenure_wc_months"],
            "recommended_term_tenure_months": rec["tenure_term_months"],
            "cgtmse_eligible": rec["cgtmse_eligible"],
            "mudra_eligible": rec["mudra_eligible"],
            "msme_category": msme_category,
        }

    def score_feature_vector(
        self, fv: FeatureVector, msme_category: str = "micro"
    ) -> dict:
        """
        score a featurevector pydantic instance
        """
        feature_dict = fv.model_dump()
        return self.score_features(feature_dict, msme_category)
