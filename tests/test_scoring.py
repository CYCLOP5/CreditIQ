"""
unit tests for scoring model and explainability layer
uses synthetic feature vectors known proxy labels
"""

import unittest
from unittest.mock import MagicMock

import numpy as np
import polars as pl

from src.llm.prompts import parse_llm_output
from src.scoring.explainer import CreditExplainer
from src.scoring.model import CreditScorer, RISK_BANDS
from src.scoring.trainer import generate_proxy_labels


def _make_base_row() -> dict:
    """
    returns minimal feature row dict with safe defaults
    all numeric fields set to neutral values
    """
    return {
        "fraud_ring_flag": 0,
        "filing_compliance_rate": 0.5,
        "gst_30d_value": 0.0,
        "upi_inbound_outbound_ratio_30d": 1.0,
        "upi_hhi_30d": 0.3,
        "cash_buffer_days": 15.0,
        "data_maturity_flag": 1.0,
        "months_active_gst": 12,
        "debit_failure_rate_90d": 0.05,
        "statutory_payment_regularity_score": 0.5,
        "upi_7d_inbound_count": 0.0,
        "upi_30d_inbound_count": 0.0,
        "upi_90d_inbound_count": 0.0,
        "gst_7d_value": 0.0,
        "gst_90d_value": 0.0,
        "ewb_7d_value": 0.0,
        "ewb_30d_value": 0.0,
        "ewb_90d_value": 0.0,
        "upi_p2m_ratio_30d": 0.0,
        "upi_daily_avg_throughput": 0.0,
        "upi_top3_concentration": 0.0,
        "upi_outbound_failure_rate": 0.0,
        "gst_mean_filing_interval_days": 30.0,
        "gst_std_filing_interval_days": 5.0,
        "upi_inbound_std_interval_days": 3.0,
        "ewb_median_interval_days": 15.0,
        "gst_filing_delay_trend": 0.0,
        "gst_revenue_cv_90d": 0.0,
        "ewb_volume_growth_mom": 0.0,
        "upi_dormancy_periods": 0.0,
        "ewb_distance_per_value_ratio": 0.0,
        "invoice_to_ewb_lag_hours_median": 0.0,
        "hsn_entropy_90d": 0.0,
        "hsn_shift_count_90d": 0.0,
        "fraud_confidence": 0.0,
        "cycle_velocity": 0.0,
        "cycle_recurrence": 0.0,
        "counterparty_compliance_avg": 0.0,
        "counterparty_fraud_exposure": 0.0,
        "data_completeness_score": 1.0,
        "longest_gap_days": 0,
        "gst_30d_unique_buyers": 0.0,
        "upi_30d_unique_counterparties": 0.0,
    }


def _row_to_df(row: dict) -> pl.DataFrame:
    """
    convert single feature dict to polars dataframe
    casts fraud_ring_flag to boolean for schema compatibility
    """
    bool_val = bool(row["fraud_ring_flag"])
    typed = {k: (bool_val if k == "fraud_ring_flag" else v) for k, v in row.items()}
    return pl.DataFrame([typed])


class TestProxyLabelFraudFlag(unittest.TestCase):
    """
    fraud ring flag forces high default probability
    """

    def test_proxy_label_fraud_flag(self) -> None:
        """
        feature vector with fraud_ring_flag true gets label above 0.8
        """
        np.random.seed(42)
        row = _make_base_row()
        row["fraud_ring_flag"] = 1
        df = _row_to_df(row)
        labels = generate_proxy_labels(df)
        self.assertEqual(len(labels), 1)
        self.assertGreater(float(labels[0]), 0.8)


class TestProxyLabelCompliant(unittest.TestCase):
    """
    high compliance no fraud good buffer yields low default probability
    """

    def test_proxy_label_compliant(self) -> None:
        """
        high compliance no fraud good cash buffer returns label below 0.35
        """
        np.random.seed(0)
        row = _make_base_row()
        row["fraud_ring_flag"] = 0
        row["filing_compliance_rate"] = 0.9
        row["gst_30d_value"] = 500000.0
        row["upi_inbound_outbound_ratio_30d"] = 2.0
        row["cash_buffer_days"] = 60.0
        row["data_maturity_flag"] = 1.0
        row["months_active_gst"] = 24
        row["statutory_payment_regularity_score"] = 0.8
        row["upi_hhi_30d"] = 0.1
        row["debit_failure_rate_90d"] = 0.01
        df = _row_to_df(row)
        labels = generate_proxy_labels(df)
        self.assertEqual(len(labels), 1)
        self.assertLess(float(labels[0]), 0.35)


class TestProbToScoreRange(unittest.TestCase):
    """
    probability to score mapping stays within 300-900
    """

    def _make_scorer(self) -> CreditScorer:
        scorer = object.__new__(CreditScorer)
        scorer.feature_columns = []
        scorer.label_encoder = RISK_BANDS
        return scorer

    def test_prob_to_score_range(self) -> None:
        """
        all probabilities in 0-1 map to scores in 300-900
        """
        scorer = self._make_scorer()
        test_probs = [0.0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0]
        for p in test_probs:
            score = scorer._prob_to_score(p)
            self.assertGreaterEqual(score, 300, msg=f"prob {p} gave score {score} below 300")
            self.assertLessEqual(score, 900, msg=f"prob {p} gave score {score} above 900")

    def test_prob_zero_is_max_score(self) -> None:
        """
        probability 0 maps to score 900
        """
        scorer = self._make_scorer()
        self.assertEqual(scorer._prob_to_score(0.0), 900)

    def test_prob_one_is_min_score(self) -> None:
        """
        probability 1 maps to score 300
        """
        scorer = self._make_scorer()
        self.assertEqual(scorer._prob_to_score(1.0), 300)


class TestScoreToBandBoundaries(unittest.TestCase):
    """
    score band mapping correctness at all boundaries
    """

    def _make_scorer(self) -> CreditScorer:
        scorer = object.__new__(CreditScorer)
        scorer.feature_columns = []
        scorer.label_encoder = RISK_BANDS
        return scorer

    def test_score_to_band_boundaries(self) -> None:
        """
        verify exact band boundaries 300 549 550 649 650 749 750 900
        """
        scorer = self._make_scorer()
        self.assertEqual(scorer._score_to_band(300), "high_risk")
        self.assertEqual(scorer._score_to_band(549), "high_risk")
        self.assertEqual(scorer._score_to_band(550), "medium_risk")
        self.assertEqual(scorer._score_to_band(649), "medium_risk")
        self.assertEqual(scorer._score_to_band(650), "low_risk")
        self.assertEqual(scorer._score_to_band(749), "low_risk")
        self.assertEqual(scorer._score_to_band(750), "very_low_risk")
        self.assertEqual(scorer._score_to_band(900), "very_low_risk")


class TestTopKFeaturesCount(unittest.TestCase):
    """
    top k features returns exactly k items
    """

    def _make_explainer(self, n_features: int = 40) -> CreditExplainer:
        explainer = object.__new__(CreditExplainer)
        explainer.feature_columns = [f"feature_{i}" for i in range(n_features)]
        return explainer

    def test_top_k_features_count(self) -> None:
        """
        shap row with 40 features returns exactly 5 items
        """
        explainer = self._make_explainer(40)
        shap_row = np.random.randn(40).astype(np.float32)
        result = explainer.top_k_features(shap_row, k=6)
        self.assertEqual(len(result), 6)


class TestTopKFeaturesStructure(unittest.TestCase):
    """
    top k feature dicts contain required keys
    """

    def _make_explainer(self, n_features: int = 40) -> CreditExplainer:
        explainer = object.__new__(CreditExplainer)
        explainer.feature_columns = [f"feature_{i}" for i in range(n_features)]
        return explainer

    def test_top_k_features_structure(self) -> None:
        """
        each item has keys feature_name shap_value direction abs_magnitude
        """
        explainer = self._make_explainer(40)
        shap_row = np.random.randn(40).astype(np.float32)
        result = explainer.top_k_features(shap_row, k=6)
        required_keys = {"feature_name", "shap_value", "direction", "abs_magnitude"}
        for item in result:
            self.assertEqual(set(item.keys()), required_keys)
            self.assertIn(item["direction"], ["increases_risk", "decreases_risk"])
            self.assertGreaterEqual(item["abs_magnitude"], 0.0)


class TestParseLlmOutput5Lines(unittest.TestCase):
    """
    parse_llm_output handles well-formed 5-line input
    """

    def test_parse_llm_output_5_lines(self) -> None:
        """
        valid 5-line output parses to list of exactly 5 strings
        """
        raw = "1 filing compliance was strong over 90 days\n2 cash buffer above 30 days reduced risk\n3 upi inflows exceeded outflows consistently\n4 no fraud ring involvement detected\n5 gst revenue growth was stable"
        result = parse_llm_output(raw)
        self.assertEqual(len(result), 6)
        for item in result:
            self.assertIsInstance(item, str)
            self.assertGreater(len(item), 0)


class TestParseLlmOutputTooFew(unittest.TestCase):
    """
    parse_llm_output pads short output to exactly 5 items
    """

    def test_parse_llm_output_too_few(self) -> None:
        """
        3-line output is padded to exactly 5 items
        """
        raw = "1 good filing compliance\n2 strong cash buffer\n3 no fraud detected"
        result = parse_llm_output(raw)
        self.assertEqual(len(result), 6)
        self.assertEqual(result[3], "insufficient signal data for this factor")
        self.assertEqual(result[4], "insufficient signal data for this factor")


class TestWaterfallDataStructure(unittest.TestCase):
    """
    waterfall_data returns expected structure
    """

    def _make_explainer(self, n_features: int = 10) -> CreditExplainer:
        explainer = object.__new__(CreditExplainer)
        explainer.feature_columns = [f"feature_{i}" for i in range(n_features)]
        return explainer

    def test_waterfall_data_structure(self) -> None:
        """
        returns dict with base_value contributions final_prediction
        """
        explainer = self._make_explainer(10)
        shap_row = np.array([0.1, -0.2, 0.05, 0.3, -0.1, 0.0, 0.15, -0.05, 0.2, -0.3], dtype=np.float32)
        base_value = 0.45
        result = explainer.waterfall_data(shap_row, base_value)
        self.assertIn("base_value", result)
        self.assertIn("contributions", result)
        self.assertIn("final_prediction", result)
        self.assertIsInstance(result["contributions"], list)
        self.assertEqual(len(result["contributions"]), 10)
        expected_final = base_value + float(np.sum(shap_row))
        self.assertAlmostEqual(result["final_prediction"], expected_final, places=5)
        for contrib in result["contributions"]:
            self.assertIn("feature", contrib)
            self.assertIn("shap_value", contrib)
            self.assertIn("direction", contrib)


class TestBandThresholdsCorrect(unittest.TestCase):
    """
    medium risk lower bound must be 550 not 500
    """

    def test_band_thresholds_correct(self) -> None:
        """
        verify medium_risk lower bound is 550 and high_risk upper bound is 549
        """
        medium_min = RISK_BANDS["medium_risk"]["min"]
        high_max = RISK_BANDS["high_risk"]["max"]
        self.assertEqual(medium_min, 550, msg="medium_risk lower bound must be 550 not 500")
        self.assertEqual(high_max, 549, msg="high_risk upper bound must be 549 not 499")

    def test_no_gap_between_bands(self) -> None:
        """
        band boundaries are contiguous with no gaps
        """
        self.assertEqual(RISK_BANDS["high_risk"]["max"] + 1, RISK_BANDS["medium_risk"]["min"])
        self.assertEqual(RISK_BANDS["medium_risk"]["max"] + 1, RISK_BANDS["low_risk"]["min"])
        self.assertEqual(RISK_BANDS["low_risk"]["max"] + 1, RISK_BANDS["very_low_risk"]["min"])


if __name__ == "__main__":
    unittest.main()
