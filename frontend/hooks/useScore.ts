"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { scoreApi } from "@/dib/api";

export type ScoreStatus = "idle" | "pending" | "processing" | "complete" | "failed";

export interface ShapEntry {
  feature_name: string;
  shap_value: number;
  direction: "increases_risk" | "decreases_risk";
  abs_magnitude: number;
}

export interface ScoreData {
  task_id: string;
  gstin: string;
  status: string;
  credit_score: number;
  risk_band: string;
  top_reasons: string[];
  recommended_wc_amount: number;
  recommended_term_amount: number;
  msme_category: string;
  cgtmse_eligible: boolean;
  mudra_eligible: boolean;
  fraud_flag: boolean;
  fraud_details: { confidence: number; cycle_velocity?: number; cycle_recurrence?: number; cycle_members?: string[] } | null;
  shap_waterfall: ShapEntry[] | null;
  score_freshness: string;
  data_maturity_months: number;
  error?: string | null;
}

const taskKey = (gstin: string) => `msme_task_${gstin}`;

export function useScore(gstin: string | undefined) {
  const [score, setScore] = useState<ScoreData | null>(null);
  const [status, setStatus] = useState<ScoreStatus>("idle");
  const pollingRef = useRef(false);

  const poll = useCallback(async (taskId: string) => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const result = await scoreApi.get(taskId).catch(() => null);
        if (!result) { setStatus("failed"); break; }

        const s = (result as ScoreData).status;
        if (s === "complete") {
          setScore(result as ScoreData);
          setStatus("complete");
          break;
        }
        if (s === "failed") {
          setScore(result as ScoreData);
          setStatus("failed");
          break;
        }
        setStatus(s as ScoreStatus);
        await new Promise((r) => setTimeout(r, 2000));
      }
    } finally {
      pollingRef.current = false;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!gstin) return;
    setStatus("pending");
    setScore(null);
    try {
      const { task_id } = await scoreApi.submit(gstin);
      sessionStorage.setItem(taskKey(gstin), task_id);
      await poll(task_id);
    } catch {
      setStatus("failed");
    }
  }, [gstin, poll]);

  useEffect(() => {
    if (!gstin) return;
    const stored = sessionStorage.getItem(taskKey(gstin));
    if (stored) {
      poll(stored);
    } else {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gstin]);

  return { score, status, refresh };
}
