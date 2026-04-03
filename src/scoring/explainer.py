"""
shap treeexplainer wrapper for xgboost credit model
extracts top 5 feature attributions with direction labels
prepares waterfall data for dashboard
"""

import numpy as np
import scipy.sparse as sp
import shap
import xgboost as xgb


class CreditExplainer:
    """
    wraps shap treeexplainer for dual models
    computes top 5 feature shap values with direction
    """

    def __init__(
        self, scorer 
    ) -> None:
        self.explainer_full = shap.TreeExplainer(scorer.model_full)
        self.explainer_upi = shap.TreeExplainer(scorer.model_upi)
        self.feature_columns = scorer.feature_columns
        print("explainers ready for dual models")

    def compute_shap(self, X: np.ndarray, use_upi_model: bool = False) -> np.ndarray:
        """
        compute shap values for input feature matrix
        converts sparse input to dense before passing to treeexplainer
        returns array shape n_samples x n_features
        """
        if sp.issparse(X):
            X = X.toarray()
        explainer = self.explainer_upi if use_upi_model else self.explainer_full
        shap_values = explainer.shap_values(X)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]
        return shap_values

    def top_k_features(
        self, shap_row: np.ndarray, k: int = 5
    ) -> list[dict]:
        """
        extract top k features by absolute shap magnitude
        returns list of dicts with feature name value direction label
        """
        abs_vals = np.abs(shap_row)
        top_indices = np.argsort(abs_vals)[::-1][:k]
        result = []
        for idx in top_indices:
            sv = float(shap_row[idx])
            result.append(
                {
                    "feature_name": self.feature_columns[idx],
                    "shap_value": sv,
                    "direction": "increases_risk" if sv > 0 else "decreases_risk",
                    "abs_magnitude": float(abs(shap_row[idx])),
                }
            )
        return result

    def waterfall_data(
        self, shap_row: np.ndarray, base_value: float
    ) -> dict:
        """
        prepare shap waterfall chart data for dashboard
        returns base value feature contributions and final prediction
        """
        abs_vals = np.abs(shap_row)
        sorted_indices = np.argsort(abs_vals)[::-1]
        contributions = []
        for idx in sorted_indices:
            sv = float(shap_row[idx])
            contributions.append(
                {
                    "feature": self.feature_columns[idx],
                    "shap_value": sv,
                    "direction": "increases_risk" if sv > 0 else "decreases_risk",
                }
            )
        final_prediction = float(base_value + float(np.sum(shap_row)))
        return {
            "base_value": float(base_value),
            "contributions": contributions,
            "final_prediction": final_prediction,
        }

    def explain_single(
        self, feature_dict: dict, feature_columns: list[str], use_upi_model: bool = False
    ) -> dict:
        """
        full explanation for single feature vector routing to dual models
        returns top5 and waterfall data
        """
        X = np.array(
            [float(feature_dict.get(col, 0)) for col in feature_columns],
            dtype=np.float32,
        ).reshape(1, -1)

        shap_vals = self.compute_shap(X, use_upi_model)
        shap_row = shap_vals[0]

        explainer = self.explainer_upi if use_upi_model else self.explainer_full
        ev = explainer.expected_value
        if isinstance(ev, (list, np.ndarray)):
            base_value = float(ev[1])
        else:
            base_value = float(ev)

        return {
            "top_5_features": self.top_k_features(shap_row, k=5),
            "waterfall_data": self.waterfall_data(shap_row, base_value),
            "base_value": base_value,
        }
