"""
feature engineering engine msme credit scoring
computes velocity cadence ratio sparsity extended subvectors gst upi ewb signal
parquet spill cache keyed gstin partition path datafeaturesgstinstinfeaturesparquet
"""

import glob
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import polars as pl
import psutil
from sklearn.impute import KNNImputer
from sklearn.ensemble import IsolationForest

from src.features.schemas import EngineeredFeatureVector


class FeatureEngine:
    """
    stateful feature engine pergstin parquet cache memory pressure guard
    compute methods nullsafe return zerofilled vectors empty input
    """

    def __init__(self, cache_dir: str = "data/features", spill_threshold_gb: float = 3.0) -> None:
        """
        init cache root dir memory spill threshold gb
        """
        self.cache_dir = cache_dir
        self.spill_threshold_gb = spill_threshold_gb

    def _check_memory_pressure(self) -> bool:
        """
        returns true if process rss exceeds 90pct spill_threshold_gb
        psutil read current process memory
        """
        proc = psutil.Process()
        rss_gb = proc.memory_info().rss / (1024 ** 3)
        return rss_gb >= (self.spill_threshold_gb * 0.9)

    def _load_cached_features(self, gstin: str) -> pl.DataFrame | None:
        """
        reads parquet feature cache gstin partition
        returns none if file not exist
        """
        path = Path(self.cache_dir) / f"gstin={gstin}" / "features.parquet"
        if not path.exists():
            return None
        return pl.read_parquet(path)

    def _save_cached_features(self, gstin: str, df: pl.DataFrame) -> None:
        """
        writes feature dataframe partitioned parquet path gstin
        creates parent dirs if absent
        """
        path = Path(self.cache_dir) / f"gstin={gstin}" / "features.parquet"
        path.parent.mkdir(parents=True, exist_ok=True)
        df.write_parquet(path)

    def _compute_velocity_features(
        self,
        gstin: str,
        gst_df: pl.DataFrame,
        upi_df: pl.DataFrame,
        ewb_df: pl.DataFrame,
    ) -> dict:
        """
        rolling sum count features over 7d 30d 90d temporal windows
        reference time anchored max timestamp each signal frame
        fill_null00 outputs since absence equals zero activity
        """
        gst_g = gst_df.filter(pl.col("gstin") == gstin)
        upi_g = upi_df.filter(pl.col("gstin") == gstin)
        ewb_g = ewb_df.filter(pl.col("gstin") == gstin)

        if gst_g.height == 0:
            gst_7d_value = np.nan
            gst_30d_value = np.nan
            gst_90d_value = np.nan
            gst_30d_unique_buyers = np.nan
        else:
            gst_now = gst_g["timestamp"].max()
            gst_7d_value = float(
                gst_g.filter(pl.col("timestamp") >= gst_now - timedelta(days=7))["taxable_value"].sum() or 0.0
            )
            gst_30d_value = float(
                gst_g.filter(pl.col("timestamp") >= gst_now - timedelta(days=30))["taxable_value"].sum() or 0.0
            )
            gst_90d_value = float(
                gst_g.filter(pl.col("timestamp") >= gst_now - timedelta(days=90))["taxable_value"].sum() or 0.0
            )
            gst_30d_unique_buyers = float(
                gst_g.filter(pl.col("timestamp") >= gst_now - timedelta(days=30))["buyer_gstin"].n_unique()
            )

        if upi_g.height == 0:
            upi_7d_inbound_count = 0.0
            upi_30d_inbound_count = 0.0
            upi_90d_inbound_count = 0.0
            upi_30d_unique_counterparties = 0.0
        else:
            upi_now = upi_g["timestamp"].max()
            upi_inbound = upi_g.filter(pl.col("direction") == "inbound")
            upi_7d_inbound_count = float(
                upi_inbound.filter(pl.col("timestamp") >= upi_now - timedelta(days=7)).height
            )
            upi_30d_inbound_count = float(
                upi_inbound.filter(pl.col("timestamp") >= upi_now - timedelta(days=30)).height
            )
            upi_90d_inbound_count = float(
                upi_inbound.filter(pl.col("timestamp") >= upi_now - timedelta(days=90)).height
            )
            upi_30d_unique_counterparties = float(
                upi_g.filter(pl.col("timestamp") >= upi_now - timedelta(days=30))["counterparty_vpa"].n_unique()
            )

        if ewb_g.height == 0:
            ewb_7d_value = 0.0
            ewb_30d_value = 0.0
            ewb_90d_value = 0.0
        else:
            ewb_now = ewb_g["timestamp"].max()
            ewb_7d_value = float(
                ewb_g.filter(pl.col("timestamp") >= ewb_now - timedelta(days=7))["tot_inv_value"].sum() or 0.0
            )
            ewb_30d_value = float(
                ewb_g.filter(pl.col("timestamp") >= ewb_now - timedelta(days=30))["tot_inv_value"].sum() or 0.0
            )
            ewb_90d_value = float(
                ewb_g.filter(pl.col("timestamp") >= ewb_now - timedelta(days=90))["tot_inv_value"].sum() or 0.0
            )

        return {
            "gst_7d_value": gst_7d_value,
            "gst_30d_value": gst_30d_value,
            "gst_90d_value": gst_90d_value,
            "upi_7d_inbound_count": upi_7d_inbound_count,
            "upi_30d_inbound_count": upi_30d_inbound_count,
            "upi_90d_inbound_count": upi_90d_inbound_count,
            "ewb_7d_value": ewb_7d_value,
            "ewb_30d_value": ewb_30d_value,
            "ewb_90d_value": ewb_90d_value,
            "gst_30d_unique_buyers": gst_30d_unique_buyers,
            "upi_30d_unique_counterparties": upi_30d_unique_counterparties,
        }

    def _compute_cadence_features(
        self,
        gstin: str,
        gst_df: pl.DataFrame,
        upi_df: pl.DataFrame,
        ewb_df: pl.DataFrame,
    ) -> dict:
        """
        interarrival time statistics across gst upi ewb signal streams
        diffs converted float days via total_seconds forward_fill fill_null00
        gst_filing_delay_trend signed delta last 3 filing_delay_days values
        """
        gst_g = gst_df.filter(pl.col("gstin") == gstin).sort("timestamp")
        upi_g = upi_df.filter(pl.col("gstin") == gstin)
        ewb_g = ewb_df.filter(pl.col("gstin") == gstin).sort("timestamp")

        if gst_g.height < 2:
            gst_mean_filing_interval_days = np.nan
            gst_std_filing_interval_days = np.nan
        else:
            gst_diffs = (
                gst_g["timestamp"]
                .diff()
                .dt.total_seconds()
                .cast(pl.Float64)
                / 86400.0
            ).forward_fill().fill_null(0.0)
            gst_mean_filing_interval_days = float(gst_diffs.mean() or 0.0)
            gst_std_filing_interval_days = float(gst_diffs.std() or 0.0)

        upi_inbound_sorted = upi_g.filter(pl.col("direction") == "inbound").sort("timestamp")
        if upi_inbound_sorted.height < 2:
            upi_inbound_std_interval_days = 0.0
        else:
            upi_diffs = (
                upi_inbound_sorted["timestamp"]
                .diff()
                .dt.total_seconds()
                .cast(pl.Float64)
                / 86400.0
            ).forward_fill().fill_null(0.0)
            upi_inbound_std_interval_days = float(upi_diffs.std() or 0.0)

        if ewb_g.height < 2:
            ewb_median_interval_days = 0.0
        else:
            ewb_diffs = (
                ewb_g["timestamp"]
                .diff()
                .dt.total_seconds()
                .cast(pl.Float64)
                / 86400.0
            ).forward_fill().fill_null(0.0)
            ewb_median_interval_days = float(ewb_diffs.median() or 0.0)

        if gst_g.height < 3:
            gst_filing_delay_trend = 0.0
        else:
            last_3 = gst_g.tail(3)["filing_delay_days"].to_list()
            gst_filing_delay_trend = float(last_3[-1] - last_3[0])

        return {
            "gst_mean_filing_interval_days": gst_mean_filing_interval_days,
            "gst_std_filing_interval_days": gst_std_filing_interval_days,
            "upi_inbound_std_interval_days": upi_inbound_std_interval_days,
            "ewb_median_interval_days": ewb_median_interval_days,
            "gst_filing_delay_trend": gst_filing_delay_trend,
        }

    def _compute_ratio_features(
        self,
        gstin: str,
        gst_df: pl.DataFrame,
        upi_df: pl.DataFrame,
        ewb_df: pl.DataFrame,
    ) -> dict:
        """
        ratio concentration features derived 30d 90d fullhistory windows
        divisions guarded maxdenominator 10 prevent dividebyzero
        hhi computed sum squared counterparty vpa share over 30d inbound
        invoicetoewb lag parsed ddmmyyyy doc_date strictfalse fallback
        """
        gst_g = gst_df.filter(pl.col("gstin") == gstin)
        upi_g = upi_df.filter(pl.col("gstin") == gstin)
        ewb_g = ewb_df.filter(pl.col("gstin") == gstin)

        if upi_g.height == 0:
            upi_inbound_outbound_ratio_30d = 0.0
            upi_hhi_30d = 0.0
            upi_p2m_ratio_30d = 0.0
            upi_outbound_failure_rate = 0.0
        else:
            upi_now = upi_g["timestamp"].max()
            cutoff_30d = upi_now - timedelta(days=30)
            upi_30d = upi_g.filter(pl.col("timestamp") >= cutoff_30d)
            upi_30d_inbound = upi_30d.filter(pl.col("direction") == "inbound")
            upi_30d_outbound = upi_30d.filter(pl.col("direction") == "outbound")

            inbound_amt = float(upi_30d_inbound["amount"].sum() or 0.0)
            outbound_amt = float(upi_30d_outbound["amount"].sum() or 0.0)
            upi_inbound_outbound_ratio_30d = inbound_amt / max(outbound_amt, 1.0)

            if upi_30d_inbound.height == 0:
                upi_hhi_30d = 0.0
            else:
                total_inbound = float(upi_30d_inbound.height)
                hhi_df = (
                    upi_30d_inbound.group_by("counterparty_vpa")
                    .agg(pl.len().alias("cnt"))
                    .with_columns((pl.col("cnt").cast(pl.Float64) / total_inbound).alias("share"))
                )
                upi_hhi_30d = float(hhi_df.select((pl.col("share") ** 2).sum())["share"][0] or 0.0)

            p2m_inbound = upi_30d_inbound.filter(pl.col("txn_type") == "p2m").height
            upi_p2m_ratio_30d = p2m_inbound / max(upi_30d_inbound.height, 1)

            upi_all_outbound = upi_g.filter(pl.col("direction") == "outbound")
            failed_outbound = upi_all_outbound.filter(
                pl.col("status").is_in(["failed_technical", "failed_funds"])
            ).height
            upi_outbound_failure_rate = failed_outbound / max(upi_all_outbound.height, 1)

        if gst_g.height == 0:
            gst_revenue_cv_90d = 0.0
            filing_compliance_rate = 0.0
        else:
            gst_now = gst_g["timestamp"].max()
            gst_90d = gst_g.filter(pl.col("timestamp") >= gst_now - timedelta(days=90))
            if gst_90d.height < 2:
                gst_revenue_cv_90d = 0.0
            else:
                monthly = (
                    gst_90d.with_columns(pl.col("timestamp").dt.truncate("1mo").alias("month"))
                    .group_by("month")
                    .agg(pl.col("taxable_value").sum().alias("monthly_value"))
                )
                if monthly.height < 2:
                    gst_revenue_cv_90d = 0.0
                else:
                    std_val = float(monthly["monthly_value"].std() or 0.0)
                    mean_val = float(monthly["monthly_value"].mean() or 0.0)
                    gst_revenue_cv_90d = std_val / max(mean_val, 1.0)

            ontime_count = gst_g.filter(pl.col("filing_status") == "ontime").height
            filing_compliance_rate = ontime_count / max(gst_g.height, 1)

        if ewb_g.height == 0:
            ewb_volume_growth_mom = 0.0
            ewb_distance_per_value_ratio = 0.0
            invoice_to_ewb_lag_hours_median = 0.0
        else:
            ewb_now = ewb_g["timestamp"].max()
            this_month_start = ewb_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if this_month_start.month == 1:
                last_month_start = this_month_start.replace(year=this_month_start.year - 1, month=12)
            else:
                last_month_start = this_month_start.replace(month=this_month_start.month - 1)

            this_month_val = float(
                ewb_g.filter(pl.col("timestamp") >= this_month_start)["tot_inv_value"].sum() or 0.0
            )
            last_month_val = float(
                ewb_g.filter(
                    (pl.col("timestamp") >= last_month_start) & (pl.col("timestamp") < this_month_start)
                )["tot_inv_value"].sum() or 0.0
            )
            ewb_volume_growth_mom = (this_month_val - last_month_val) / max(last_month_val, 1.0)

            total_dist = float(ewb_g["trans_distance"].sum() or 0)
            total_val = float(ewb_g["tot_inv_value"].sum() or 0.0)
            ewb_distance_per_value_ratio = total_dist / max(total_val, 1.0)

            try:
                ewb_with_lag = (
                    ewb_g.with_columns(
                        pl.col("doc_date")
                        .str.to_date(format="%d/%m/%Y", strict=False)
                        .cast(pl.Datetime)
                        .alias("doc_dt")
                    )
                    .filter(pl.col("doc_dt").is_not_null())
                    .with_columns(
                        (
                            (pl.col("timestamp") - pl.col("doc_dt"))
                            .dt.total_seconds()
                            .cast(pl.Float64)
                            / 3600.0
                        ).alias("lag_hours")
                    )
                )
                invoice_to_ewb_lag_hours_median = float(ewb_with_lag["lag_hours"].median() or 0.0)
            except Exception:
                invoice_to_ewb_lag_hours_median = 0.0

        return {
            "upi_inbound_outbound_ratio_30d": upi_inbound_outbound_ratio_30d,
            "gst_revenue_cv_90d": gst_revenue_cv_90d,
            "ewb_volume_growth_mom": ewb_volume_growth_mom,
            "filing_compliance_rate": filing_compliance_rate,
            "upi_hhi_30d": upi_hhi_30d,
            "ewb_distance_per_value_ratio": ewb_distance_per_value_ratio,
            "invoice_to_ewb_lag_hours_median": invoice_to_ewb_lag_hours_median,
            "upi_p2m_ratio_30d": upi_p2m_ratio_30d,
            "upi_outbound_failure_rate": upi_outbound_failure_rate,
        }

    def _compute_sparsity_features(
        self,
        gstin: str,
        gst_df: pl.DataFrame,
        upi_df: pl.DataFrame,
        ewb_df: pl.DataFrame,
    ) -> dict:
        """
        data availability gap metrics across three signal types
        longest_gap_days merges timestamps frames finds max interevent gap
        data_maturity_flag 10 months_active_gst reaches 3 or more
        """
        gst_g = gst_df.filter(pl.col("gstin") == gstin)
        upi_g = upi_df.filter(pl.col("gstin") == gstin)
        ewb_g = ewb_df.filter(pl.col("gstin") == gstin)

        if gst_g.height == 0:
            months_active_gst = 0
        else:
            months_active_gst = gst_g.select(pl.col("timestamp").dt.truncate("1mo")).unique().height

        data_completeness_score = sum([
            1 if gst_g.height > 0 else 0,
            1 if upi_g.height > 0 else 0,
            1 if ewb_g.height > 0 else 0,
        ]) / 3.0

        ts_parts = []
        if gst_g.height > 0:
            ts_parts.append(gst_g.select("timestamp"))
        if upi_g.height > 0:
            ts_parts.append(upi_g.select("timestamp"))
        if ewb_g.height > 0:
            ts_parts.append(ewb_g.select("timestamp"))

        total_ts_count = sum(p.height for p in ts_parts)
        if total_ts_count < 2:
            longest_gap_days = 0
        else:
            all_ts = pl.concat(ts_parts).sort("timestamp")
            gap_series = (
                all_ts["timestamp"]
                .diff()
                .dt.total_seconds()
                .cast(pl.Float64)
                / 86400.0
            ).fill_null(0.0)
            longest_gap_days = int(gap_series.max() or 0)

        data_maturity_flag = 1.0 if months_active_gst >= 3 else 0.0

        return {
            "months_active_gst": months_active_gst,
            "data_completeness_score": data_completeness_score,
            "longest_gap_days": longest_gap_days,
            "data_maturity_flag": data_maturity_flag,
        }

    def _compute_extended_features(
        self,
        gstin: str,
        gst_df: pl.DataFrame,
        upi_df: pl.DataFrame,
        ewb_df: pl.DataFrame,
    ) -> dict:
        """
        extended domain feature computation cash buffer debit failure hsn diversity
        upi throughput dormancy statutory compliance from nayak committee framework
        cash_buffer_days estimate from upi inflow outflow balance per rbi norms
        hsn_entropy_90d shannon entropy hsn distribution indicates sector diversification
        statutory_payment_regularity_score inverse avg filing delay normalised 30d
        """
        gst_g = gst_df.filter(pl.col("gstin") == gstin)
        upi_g = upi_df.filter(pl.col("gstin") == gstin)
        ewb_g = ewb_df.filter(pl.col("gstin") == gstin)

        if upi_g.height == 0:
            upi_daily_avg_throughput = 0.0
            upi_top3_concentration = 0.0
            upi_dormancy_periods = 0
            cash_buffer_days = 0.0
            debit_failure_rate_90d = 0.0
        else:
            upi_now = upi_g["timestamp"].max()
            upi_min_ts = upi_g["timestamp"].min()
            span_seconds = (upi_now - upi_min_ts).total_seconds()
            active_days = max(span_seconds / 86400.0, 1.0)
            total_amount = float(upi_g["amount"].sum() or 0.0)
            upi_daily_avg_throughput = total_amount / active_days

            cutoff_30d = upi_now - timedelta(days=30)
            upi_30d_inbound = upi_g.filter(
                (pl.col("timestamp") >= cutoff_30d) & (pl.col("direction") == "inbound")
            )

            if upi_30d_inbound.height == 0:
                upi_top3_concentration = 0.0
            else:
                cp_agg = (
                    upi_30d_inbound.group_by("counterparty_vpa")
                    .agg(pl.col("amount").sum().alias("total_amt"))
                    .sort("total_amt", descending=True)
                )
                total_inbound_amt = float(upi_30d_inbound["amount"].sum() or 0.0)
                top3_amt = float(cp_agg.head(3)["total_amt"].sum() or 0.0)
                upi_top3_concentration = top3_amt / max(total_inbound_amt, 1.0)

            if upi_g.height < 2:
                upi_dormancy_periods = 0
            else:
                total_possible_weeks = max(int(span_seconds / (7.0 * 86400.0)), 1)
                active_weeks = (
                    upi_g.select(
                        (
                            (pl.col("timestamp") - pl.lit(upi_min_ts))
                            .dt.total_seconds()
                            .cast(pl.Float64)
                            / (7.0 * 86400.0)
                        )
                        .cast(pl.Int32)
                        .alias("week_num")
                    )
                    .unique()
                    .height
                )
                upi_dormancy_periods = max(0, total_possible_weeks - active_weeks)

            upi_30d_inbound_all = upi_g.filter(
                (pl.col("timestamp") >= cutoff_30d) & (pl.col("direction") == "inbound")
            )
            upi_30d_outbound_all = upi_g.filter(
                (pl.col("timestamp") >= cutoff_30d) & (pl.col("direction") == "outbound")
            )
            inbound_30d_amt = float(upi_30d_inbound_all["amount"].sum() or 0.0)
            outbound_30d_amt = float(upi_30d_outbound_all["amount"].sum() or 0.0)
            daily_outflow = outbound_30d_amt / 30.0
            if daily_outflow > 0:
                cash_buffer_days = float(min(inbound_30d_amt / daily_outflow, 90.0))
            else:
                cash_buffer_days = 90.0 if inbound_30d_amt > 0 else 0.0

            upi_90d = upi_g.filter(pl.col("timestamp") >= upi_now - timedelta(days=90))
            upi_90d_outbound = upi_90d.filter(pl.col("direction") == "outbound")
            failed_90d = upi_90d_outbound.filter(
                pl.col("status").is_in(["failed_technical", "failed_funds"])
            ).height
            debit_failure_rate_90d = failed_90d / max(upi_90d_outbound.height, 1)

        if ewb_g.height == 0:
            hsn_entropy_90d = 0.0
            hsn_shift_count_90d = 0
        else:
            ewb_now = ewb_g["timestamp"].max()
            ewb_90d = ewb_g.filter(pl.col("timestamp") >= ewb_now - timedelta(days=90))

            if ewb_90d.height == 0 or "main_hsn_code" not in ewb_90d.columns:
                hsn_entropy_90d = 0.0
                hsn_shift_count_90d = 0
            else:
                hsn_counts = (
                    ewb_90d.group_by("main_hsn_code")
                    .agg(pl.len().alias("cnt"))
                )
                shares_arr = (
                    hsn_counts.with_columns(
                        (pl.col("cnt").cast(pl.Float64) / float(ewb_90d.height)).alias("p")
                    )["p"]
                    .to_numpy()
                )
                shares_arr = shares_arr[shares_arr > 0]
                if shares_arr.size == 0:
                    hsn_entropy_90d = 0.0
                else:
                    hsn_entropy_90d = float(-np.sum(shares_arr * np.log(shares_arr)))

                buckets = [
                    ewb_90d.filter(pl.col("timestamp") >= ewb_now - timedelta(days=30)),
                    ewb_90d.filter(
                        (pl.col("timestamp") >= ewb_now - timedelta(days=60))
                        & (pl.col("timestamp") < ewb_now - timedelta(days=30))
                    ),
                    ewb_90d.filter(
                        (pl.col("timestamp") >= ewb_now - timedelta(days=90))
                        & (pl.col("timestamp") < ewb_now - timedelta(days=60))
                    ),
                ]
                dominant_hsns: list[str | None] = []
                for bucket in buckets:
                    if bucket.height > 0:
                        top = (
                            bucket.group_by("main_hsn_code")
                            .agg(pl.len().alias("cnt"))
                            .sort("cnt", descending=True)
                            .head(1)["main_hsn_code"]
                            .to_list()
                        )
                        dominant_hsns.append(top[0] if top else None)
                    else:
                        dominant_hsns.append(None)

                shift_count = 0
                for i in range(1, len(dominant_hsns)):
                    if dominant_hsns[i] is not None and dominant_hsns[i - 1] is not None:
                        if dominant_hsns[i] != dominant_hsns[i - 1]:
                            shift_count += 1
                hsn_shift_count_90d = shift_count

        if gst_g.height == 0:
            statutory_payment_regularity_score = 0.0
        else:
            avg_delay = float(gst_g["filing_delay_days"].mean() or 0.0)
            statutory_payment_regularity_score = max(0.0, 1.0 - min(avg_delay / 30.0, 1.0))

        return {
            "upi_daily_avg_throughput": upi_daily_avg_throughput,
            "upi_top3_concentration": upi_top3_concentration,
            "upi_dormancy_periods": upi_dormancy_periods,
            "hsn_entropy_90d": hsn_entropy_90d,
            "hsn_shift_count_90d": hsn_shift_count_90d,
            "cash_buffer_days": cash_buffer_days,
            "statutory_payment_regularity_score": statutory_payment_regularity_score,
            "debit_failure_rate_90d": debit_failure_rate_90d,
        }

    def compute_features(
        self,
        gstin: str,
        gst_df: pl.DataFrame,
        upi_df: pl.DataFrame,
        ewb_df: pl.DataFrame,
        skip_cache: bool = False,
    ) -> EngineeredFeatureVector | dict:
        """
        full feature vector computation single gstin
        merges velocity cadence ratio sparsity extended dicts into raw dict
        persists onerow parquet partitioned cache if skip_cache false
        """
        print(f"computing features for gstin {gstin}")

        velocity = self._compute_velocity_features(gstin, gst_df, upi_df, ewb_df)
        cadence = self._compute_cadence_features(gstin, gst_df, upi_df, ewb_df)
        ratio = self._compute_ratio_features(gstin, gst_df, upi_df, ewb_df)
        sparsity = self._compute_sparsity_features(gstin, gst_df, upi_df, ewb_df)
        extended = self._compute_extended_features(gstin, gst_df, upi_df, ewb_df)

        all_features: dict = {
            "gstin": gstin,
            "computed_at": datetime.utcnow(),
            **velocity,
            **cadence,
            **ratio,
            **sparsity,
            **extended,
            "fraud_ring_flag": False,
            "fraud_confidence": 0.0,
            "cycle_velocity": 0.0,
            "cycle_recurrence": 0.0,
            "counterparty_compliance_avg": 0.0,
            "counterparty_fraud_exposure": 0.0,
        }

        if not skip_cache:
            vector = EngineeredFeatureVector(**all_features)
            cache_row = {k: [v] for k, v in all_features.items()}
            feature_df = pl.DataFrame(cache_row)
            self._save_cached_features(gstin, feature_df)
            return vector
            
        return all_features

    def compute_batch(
        self,
        gst_df: pl.DataFrame,
        upi_df: pl.DataFrame,
        ewb_df: pl.DataFrame,
    ) -> list[EngineeredFeatureVector]:
        """
        batch feature computation over unique gstins found gst_df
        applies knn imputation missing gst values based on upi metrics
        runs isolation forest detecting temporal cadence anomalies
        """
        unique_gstins: list[str] = gst_df["gstin"].unique().to_list()
        total = len(unique_gstins)
        print(f"starting batch feature computation for {total} gstins")

        raw_results: list[dict] = []

        for idx, gstin in enumerate(unique_gstins):
            if self._check_memory_pressure():
                print("memory pressure near spill threshold proceeding with caution")

            if idx > 0 and idx % 50 == 0:
                print(f"processed {idx} of {total} gstins")

            raw_dict = self.compute_features(gstin, gst_df, upi_df, ewb_df, skip_cache=True)
            raw_results.append(raw_dict)

        if not raw_results:
            return []

        df_pl = pl.DataFrame(raw_results)
        
        impute_cols = [
            "gst_7d_value", "gst_30d_value", "gst_90d_value", 
            "gst_30d_unique_buyers", "gst_mean_filing_interval_days", 
            "gst_std_filing_interval_days"
        ]
        ref_cols = [
            "upi_7d_inbound_count", "upi_30d_inbound_count", 
            "upi_90d_inbound_count", "upi_30d_unique_counterparties"
        ]

        if df_pl.height > 1:
            matrix = df_pl.select(impute_cols + ref_cols).to_numpy()
            imputer = KNNImputer(n_neighbors=min(5, df_pl.height))
            imputed_matrix = imputer.fit_transform(matrix)
            
            for i, col in enumerate(impute_cols):
                s = pl.Series(col, imputed_matrix[:, i])
                df_pl = df_pl.with_columns(s)
                
            iso_cols = ["gst_mean_filing_interval_days", "upi_inbound_std_interval_days"]
            iso_matrix = df_pl.select(iso_cols).fill_null(0.0).to_numpy()
            iso = IsolationForest(contamination=0.05, random_state=42)
            preds = iso.fit_predict(iso_matrix)
            flags = (preds == -1).astype(float)
            df_pl = df_pl.with_columns(pl.Series("temporal_anomaly_flag", flags))
        else:
            for col in impute_cols:
                df_pl = df_pl.with_columns(pl.Series(col, [0.0]).fill_null(0.0))
            df_pl = df_pl.with_columns(pl.lit(0.0).alias("temporal_anomaly_flag"))

        results: list[EngineeredFeatureVector] = []
        for row in df_pl.to_dicts():
            vector = EngineeredFeatureVector(**row)
            cache_row = {k: [v] for k, v in row.items()}
            self._save_cached_features(row["gstin"], pl.DataFrame(cache_row))
            results.append(vector)

        print(f"batch complete {total} feature vectors computed imputed cached")
        return results


def _run_feature_pipeline(raw_dir: str = "data/raw", features_dir: str = "data/features") -> None:
    """
    standalone entry point batch feature computation over all raw parquets
    loads gst upi ewb chunks scans glob calls compute_batch writes partitioned cache
    """
    raw = Path(raw_dir)
    gst_files = sorted(glob.glob(str(raw / "gst_invoices_chunk_*.parquet")))
    upi_files = sorted(glob.glob(str(raw / "upi_transactions_chunk_*.parquet")))
    ewb_files = sorted(glob.glob(str(raw / "eway_bills_chunk_*.parquet")))

    print(f"gst chunks {len(gst_files)} upi chunks {len(upi_files)} ewb chunks {len(ewb_files)}")

    if not gst_files:
        print("no raw parquets found run src.ingestion.generator first")
        return

    gst_df = pl.read_parquet(gst_files).with_columns(
        pl.col("timestamp").str.to_datetime(format="%Y-%m-%dT%H:%M:%S%.f", strict=False)
    )
    upi_df = pl.read_parquet(upi_files).with_columns(
        pl.col("timestamp").str.to_datetime(format="%Y-%m-%dT%H:%M:%S%.f", strict=False)
    )
    ewb_df = (
        pl.read_parquet(ewb_files)
        .rename({
            "totInvValue": "tot_inv_value",
            "transDistance": "trans_distance",
            "docDate": "doc_date",
            "mainHsnCode": "main_hsn_code",
        })
        .with_columns(
            pl.col("timestamp").str.to_datetime(format="%Y-%m-%dT%H:%M:%S%.f", strict=False)
        )
    )

    print(f"loaded gst {gst_df.height} upi {upi_df.height} ewb {ewb_df.height} rows")

    engine = FeatureEngine(cache_dir=features_dir)
    engine.compute_batch(gst_df, upi_df, ewb_df)
    print("feature pipeline complete")


if __name__ == "__main__":
    _run_feature_pipeline()
