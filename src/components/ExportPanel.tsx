import React, { useState } from "react";
import { OcrRecord } from "../types";
import { FileSpreadsheet, Download, Copy, Check, FileText } from "lucide-react";
import * as XLSX from "xlsx";

interface ExportPanelProps {
  records: OcrRecord[];
}

export default function ExportPanel({ records }: ExportPanelProps) {
  const [filename, setFilename] = useState<string>("notebook_digitized_records");
  const [copied, setCopied] = useState<boolean>(false);

  const cleanFilename = (name: string): string => {
    return name.replace(/[^a-zA-Z0-9_\-]/g, "") || "digitized_records";
  };

  const getExportData = () => {
    return records.map((r, index) => ({
      "Row Number": index + 1,
      "Patient Name": r.name,
      "NHIS Number": r.nhisNumber ? `'${r.nhisNumber}` : "", // Prefix with apostrophe to keep leading zeros in Excel
      "Record Date": r.date,
      "OCR Confidence": `${Math.round(r.confidence * 100)}%`,
      "Handwriting Transcript": r.originalText,
      "Status": r.status.toUpperCase(),
      "Digitized Date": r.timestamp,
    }));
  };

  const exportToExcel = () => {
    if (records.length === 0) return;

    try {
      const data = getExportData();
      const worksheet = XLSX.utils.json_to_sheet(data);
      
      // Auto-fit column widths
      const maxLens = Object.keys(data[0] || {}).map((key) => {
        let maxLen = key.length;
        data.forEach((row: any) => {
          const val = row[key]?.toString() || "";
          if (val.length > maxLen) maxLen = val.length;
        });
        return { wch: maxLen + 3 };
      });
      worksheet["!cols"] = maxLens;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Patient Records");

      const fileToSave = `${cleanFilename(filename)}.xlsx`;
      XLSX.writeFile(workbook, fileToSave);
    } catch (error) {
      console.error("Failed to generate Excel file:", error);
    }
  };

  const exportToCsv = () => {
    if (records.length === 0) return;

    try {
      const headers = ["Row Number", "Patient Name", "NHIS Number", "Record Date", "OCR Confidence", "Handwriting Transcript", "Status", "Digitized Date"];
      const rows = records.map((r, index) => [
        index + 1,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.nhisNumber}"`,
        `"${r.date}"`,
        `"${Math.round(r.confidence * 100)}%"`,
        `"${r.originalText.replace(/"/g, '""')}"`,
        `"${r.status}"`,
        `"${r.timestamp}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${cleanFilename(filename)}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to generate CSV file:", error);
    }
  };

  const copyToClipboard = () => {
    if (records.length === 0) return;

    try {
      const headers = ["Row", "Patient Name", "NHIS Number", "Date", "Confidence", "Status"];
      const tsvRows = records.map((r, i) => [
        i + 1,
        r.name,
        r.nhisNumber,
        r.date,
        `${Math.round(r.confidence * 100)}%`,
        r.status,
      ]);

      const tsvContent = [headers.join("\t"), ...tsvRows.map((row) => row.join("\t"))].join("\n");
      navigator.clipboard.writeText(tsvContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Clipboard copy failed:", error);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5" id="export-panel-container">
      <div className="flex items-center gap-2 mb-4" id="export-header">
        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div className="text-left">
          <h4 className="text-sm font-semibold text-slate-800">Export Spreadsheet</h4>
          <p className="text-xs text-slate-500">Instant Excel output for paper records digitization</p>
        </div>
      </div>

      <div className="space-y-4 text-left" id="export-actions-layout">
        {/* Filename Input */}
        <div className="flex flex-col gap-1.5" id="filename-group">
          <label className="text-xs font-semibold text-slate-600">Spreadsheet Filename</label>
          <div className="relative flex rounded-xl border border-slate-200 overflow-hidden" id="filename-input-container">
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Enter file name"
              disabled={records.length === 0}
              className="flex-1 px-3 py-2 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
              id="filename-input"
            />
            <span className="bg-slate-50 px-3 py-2 text-[10px] text-slate-400 font-medium border-l border-slate-200 flex items-center justify-center">
              .xlsx / .csv
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" id="export-buttons-grid">
          <button
            onClick={exportToExcel}
            disabled={records.length === 0}
            className="w-full px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white disabled:bg-slate-100 disabled:text-slate-400 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            id="btn-export-excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel</span>
          </button>

          <button
            onClick={exportToCsv}
            disabled={records.length === 0}
            className="w-full px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            id="btn-export-csv"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>

          <button
            onClick={copyToClipboard}
            disabled={records.length === 0}
            className="w-full px-4 py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 disabled:bg-slate-50 disabled:text-slate-400 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            id="btn-copy-tsv"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copied!" : "Copy to Clip"}</span>
          </button>
        </div>

        {/* Records Summary Hint */}
        {records.length > 0 ? (
          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[11px] text-indigo-800 flex items-center gap-2" id="export-hint-box">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shrink-0" />
            <p>
              Your spreadsheet is ready for download with <strong>{records.length} digitized record rows</strong> (
              {records.filter((r) => r.status === "verified").length} rows verified).
            </p>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2" id="export-empty-hint">
            <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
            <p>No records in your workspace yet. Snap or upload handwritten rows to begin exporting.</p>
          </div>
        )}
      </div>
    </div>
  );
}
