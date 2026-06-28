import React from "react";
import { OcrRecord } from "../types";
import { BarChart2, CheckCircle2, ShieldAlert, BadgeHelp, Sparkles } from "lucide-react";

interface StatsBannerProps {
  records: OcrRecord[];
}

export default function StatsBanner({ records }: StatsBannerProps) {
  const total = records.length;
  const verifiedCount = records.filter((r) => r.status === "verified").length;
  
  // Calculate average confidence
  const averageConfidence =
    total > 0
      ? Math.round((records.reduce((acc, curr) => acc + curr.confidence, 0) / total) * 100)
      : 0;

  // Formatting warnings count
  const warningsCount = records.filter((rec) => {
    const nhis = rec.nhisNumber.replace(/\s+/g, "");
    const onlyDigits = /^\d+$/.test(nhis);
    const hasNhisFormatError = nhis && (!onlyDigits || (nhis.length !== 8 && nhis.length !== 10));
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const hasDateFormatError = rec.date && !dateRegex.test(rec.date);
    
    return !rec.name.trim() || hasNhisFormatError || hasDateFormatError;
  }).length;

  // Percentage complete
  const completionPercent = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-banner-container">
      {/* Stat 1: Total Entries */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between" id="stat-card-total">
        <div className="text-left">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Rows</p>
          <h3 className="text-2xl font-black text-slate-800 mt-1 font-mono">{total}</h3>
          <p className="text-[10px] text-slate-500 mt-1">Digitized in session</p>
        </div>
        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600" id="stat-total-icon">
          <BarChart2 className="w-5 h-5" />
        </div>
      </div>

      {/* Stat 2: Verified Progress */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between" id="stat-card-verified">
        <div className="text-left">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verification</p>
          <h3 className="text-2xl font-black text-slate-800 mt-1 font-mono">
            {verifiedCount} <span className="text-xs text-slate-400 font-sans">/ {total}</span>
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-12 bg-slate-100 rounded-full h-1 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${completionPercent}%` }} />
            </div>
            <span className="text-[10px] font-semibold text-slate-600">{completionPercent}%</span>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600" id="stat-verified-icon">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      {/* Stat 3: Handwriting confidence */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between" id="stat-card-confidence">
        <div className="text-left">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Confidence</p>
          <h3 className="text-2xl font-black text-slate-800 mt-1 font-mono">
            {averageConfidence}%
          </h3>
          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-0.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Handwriting score</span>
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-500" id="stat-confidence-icon">
          <Sparkles className="w-5 h-5" />
        </div>
      </div>

      {/* Stat 4: Formatting warnings */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between" id="stat-card-warnings">
        <div className="text-left">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Warnings</p>
          <h3 className="text-2xl font-black text-slate-800 mt-1 font-mono">
            {warningsCount}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            {warningsCount > 0 ? "Requires correction" : "Pristine spreadsheet data"}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl ${warningsCount > 0 ? "bg-rose-50 text-rose-500" : "bg-slate-100 text-slate-400"}`} id="stat-warnings-icon">
          <ShieldAlert className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
