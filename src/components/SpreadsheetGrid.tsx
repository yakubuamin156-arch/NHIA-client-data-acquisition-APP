import React, { useState } from "react";
import { OcrRecord } from "../types";
import { Check, Edit2, Trash2, ShieldAlert, Sparkles, Filter, Plus, Search, HelpCircle, Eye } from "lucide-react";

interface SpreadsheetGridProps {
  records: OcrRecord[];
  onUpdateRecord: (id: string, updated: Partial<OcrRecord>) => void;
  onDeleteRecord: (id: string) => void;
  onVerifyRecord: (id: string) => void;
  onAddManualRecord: () => void;
  onBulkVerify: (ids: string[]) => void;
  onBulkDelete: (ids: string[]) => void;
}

export default function SpreadsheetGrid({
  records,
  onUpdateRecord,
  onDeleteRecord,
  onVerifyRecord,
  onAddManualRecord,
  onBulkVerify,
  onBulkDelete,
}: SpreadsheetGridProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "pending" | "verified" | "warnings">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempEdit, setTempEdit] = useState<Partial<OcrRecord>>({});
  const [showExplanationId, setShowExplanationId] = useState<string | null>(null);

  // Validation functions
  const validateNhis = (nhis: string): { isValid: boolean; message?: string } => {
    if (!nhis) return { isValid: false, message: "NHIS Number is missing" };
    // NHIS standard is usually exactly 8 or 10 digits
    const cleaned = nhis.replace(/\s+/g, "");
    const onlyDigits = /^\d+$/.test(cleaned);
    if (!onlyDigits) {
      return { isValid: false, message: "NHIS should contain numbers only" };
    }
    if (cleaned.length !== 8 && cleaned.length !== 10) {
      return { isValid: false, message: "Standard NHIS is 8 or 10 digits" };
    }
    return { isValid: true };
  };

  const validateDate = (dateStr: string): { isValid: boolean; message?: string } => {
    if (!dateStr) return { isValid: false, message: "Date is missing" };
    // Format must be YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) {
      return { isValid: false, message: "Format must be YYYY-MM-DD" };
    }
    const dateParsed = Date.parse(dateStr);
    if (isNaN(dateParsed)) {
      return { isValid: false, message: "Invalid calendar date" };
    }
    return { isValid: true };
  };

  const validateRecord = (rec: OcrRecord): boolean => {
    return validateNhis(rec.nhisNumber).isValid && validateDate(rec.date).isValid && rec.name.trim().length > 0;
  };

  // Filtering logic
  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.nhisNumber.includes(searchTerm) ||
      rec.date.includes(searchTerm) ||
      rec.originalText.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === "pending") return rec.status === "pending";
    if (filterType === "verified") return rec.status === "verified";
    if (filterType === "warnings") {
      const nhisVal = validateNhis(rec.nhisNumber);
      const dateVal = validateDate(rec.date);
      return !nhisVal.isValid || !dateVal.isValid || !rec.name.trim();
    }
    return true;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredRecords.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const startEditing = (rec: OcrRecord) => {
    setEditingId(rec.id);
    setTempEdit({ ...rec });
  };

  const saveEditing = (id: string) => {
    onUpdateRecord(id, tempEdit);
    setEditingId(null);
    setTempEdit({});
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTempEdit({});
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden" id="spreadsheet-grid-wrapper">
      {/* Search, Action & Filter Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50" id="grid-action-bar">
        {/* Left Side: Filter buttons & search */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto" id="filters-container">
          <div className="relative w-full sm:w-64" id="search-input-box">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, ID or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition bg-white"
              id="search-input"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100/70 p-1 rounded-xl" id="filter-pills-group">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterType === "all" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-indigo-600"
              }`}
              id="filter-all"
            >
              All ({records.length})
            </button>
            <button
              onClick={() => setFilterType("pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterType === "pending" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
              id="filter-pending"
            >
              Pending ({records.filter((r) => r.status === "pending").length})
            </button>
            <button
              onClick={() => setFilterType("verified")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterType === "verified" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-indigo-600"
              }`}
              id="filter-verified"
            >
              Verified ({records.filter((r) => r.status === "verified").length})
            </button>
            <button
              onClick={() => setFilterType("warnings")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                filterType === "warnings"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-rose-600"
              }`}
              id="filter-warnings"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Warnings</span>
            </button>
          </div>
        </div>

        {/* Right Side: Spreadsheet utilities */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end" id="spreadsheet-header-buttons">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-1.5 mr-2" id="bulk-actions-group">
              <button
                onClick={() => {
                  onBulkVerify(selectedIds);
                  setSelectedIds([]);
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100/70 text-xs font-semibold flex items-center gap-1 transition"
                id="btn-bulk-verify"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Verify ({selectedIds.length})</span>
              </button>
              <button
                onClick={() => {
                  onBulkDelete(selectedIds);
                  setSelectedIds([]);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1 transition"
                id="btn-bulk-delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}

          <button
            onClick={onAddManualRecord}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-sm"
            id="btn-add-manual-row"
          >
            <Plus className="w-4 h-4" />
            <span>Add Row</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Grid Table */}
      <div className="flex-1 overflow-auto" id="table-scroll-area">
        <table className="w-full text-left border-collapse" id="spreadsheet-html-table">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200 select-none sticky top-0 z-10" id="table-head-row">
              <th className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length}
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  id="select-all-checkbox"
                />
              </th>
              <th className="p-3 w-12 text-center text-slate-300">#</th>
              <th className="p-3">Patient Name</th>
              <th className="p-3">NHIS Number</th>
              <th className="p-3">Record Date</th>
              <th className="p-3 w-28">Confidence</th>
              <th className="p-3 w-36">Status</th>
              <th className="p-3 w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs" id="table-body">
            {filteredRecords.length === 0 ? (
              <tr id="empty-table-row">
                <td colSpan={8} className="p-12 text-center text-slate-400" id="empty-table-cell">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <HelpCircle className="w-8 h-8 text-slate-300" />
                    <p className="font-semibold text-slate-700 text-sm">No digitized records match current selection.</p>
                    <p className="text-slate-400 text-xs max-w-sm mt-0.5">Capture or upload handwritten sheets, or click &quot;Add Row&quot; above to create spreadsheet entries manually.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec, index) => {
                const isEditing = editingId === rec.id;
                const nhisVal = validateNhis(isEditing ? tempEdit.nhisNumber || "" : rec.nhisNumber);
                const dateVal = validateDate(isEditing ? tempEdit.date || "" : rec.date);
                const isVerified = rec.status === "verified";

                return (
                  <React.Fragment key={rec.id}>
                    <tr
                      className={`group transition duration-150 ${
                        isVerified ? "bg-indigo-50/30" : "hover:bg-slate-50"
                      } ${!rec.name.trim() || !nhisVal.isValid || !dateVal.isValid ? "bg-rose-50/10" : ""}`}
                      id={`row-${rec.id}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(rec.id)}
                          onChange={(e) => handleSelectOne(rec.id, e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          id={`checkbox-${rec.id}`}
                        />
                      </td>

                      {/* Index counter */}
                      <td className="p-3 text-center text-slate-400 font-mono text-[11px] font-semibold">
                        {index + 1}
                      </td>

                      {/* Name Cell */}
                      <td className="p-3 font-medium text-slate-800">
                        {isEditing ? (
                          <input
                            type="text"
                            value={tempEdit.name || ""}
                            onChange={(e) => setTempEdit({ ...tempEdit, name: e.target.value })}
                            className="w-full px-2 py-1 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            id={`edit-name-${rec.id}`}
                          />
                        ) : (
                          <div className="flex flex-col">
                            <span className={rec.name.trim() ? "text-slate-900 font-semibold" : "text-rose-500 italic font-semibold"}>
                              {rec.name.trim() || "[Missing Name]"}
                            </span>
                            {rec.originalText && (
                              <button
                                onClick={() => setShowExplanationId(showExplanationId === rec.id ? null : rec.id)}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 mt-0.5 select-none text-left"
                                id={`btn-explain-${rec.id}`}
                              >
                                <Eye className="w-3 h-3" />
                                <span>See original transcript context</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* NHIS Number Cell */}
                      <td className="p-3 font-mono">
                        {isEditing ? (
                          <div className="flex flex-col">
                            <input
                              type="text"
                              value={tempEdit.nhisNumber || ""}
                              onChange={(e) => setTempEdit({ ...tempEdit, nhisNumber: e.target.value })}
                              className={`w-full px-2 py-1 rounded border text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none ${
                                !nhisVal.isValid ? "border-amber-400 bg-amber-50" : "border-slate-300"
                              }`}
                              id={`edit-nhis-${rec.id}`}
                            />
                            {!nhisVal.isValid && (
                              <span className="text-[9px] text-amber-700 mt-0.5">{nhisVal.message}</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className={rec.nhisNumber ? "text-slate-700 font-mono text-[11px]" : "text-slate-400 italic font-mono text-[11px]"}>
                              {rec.nhisNumber || "[Empty]"}
                            </span>
                            {!nhisVal.isValid && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-semibold font-sans flex items-center gap-0.5 cursor-help"
                                title={nhisVal.message}
                                id={`nhis-warn-${rec.id}`}
                              >
                                <ShieldAlert className="w-2.5 h-2.5" />
                                <span>Format</span>
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Date Cell */}
                      <td className="p-3 font-mono">
                        {isEditing ? (
                          <div className="flex flex-col">
                            <input
                              type="text"
                              value={tempEdit.date || ""}
                              placeholder="YYYY-MM-DD"
                              onChange={(e) => setTempEdit({ ...tempEdit, date: e.target.value })}
                              className={`w-full px-2 py-1 rounded border text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none ${
                                !dateVal.isValid ? "border-rose-400 bg-rose-50" : "border-slate-300"
                              }`}
                              id={`edit-date-${rec.id}`}
                            />
                            {!dateVal.isValid && (
                              <span className="text-[9px] text-rose-700 mt-0.5">{dateVal.message}</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className={rec.date ? "text-slate-700 font-mono text-[11px]" : "text-slate-400 italic font-mono text-[11px]"}>
                              {rec.date || "[Empty]"}
                            </span>
                            {!dateVal.isValid && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[9px] font-semibold font-sans flex items-center gap-0.5 cursor-help"
                                title={dateVal.message}
                                id={`date-warn-${rec.id}`}
                              >
                                <ShieldAlert className="w-2.5 h-2.5" />
                                <span>Invalid</span>
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Confidence Cell */}
                      <td className="p-3 font-mono">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                rec.confidence >= 0.85
                                  ? "bg-indigo-600"
                                  : rec.confidence >= 0.6
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${rec.confidence * 100}%` }}
                            />
                          </div>
                          <span
                            className={`font-semibold text-[10px] ${
                              rec.confidence >= 0.85
                                ? "text-indigo-600"
                                : rec.confidence >= 0.6
                                ? "text-amber-600"
                                : "text-rose-600"
                            }`}
                          >
                            {Math.round(rec.confidence * 100)}%
                          </span>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="p-3">
                        <button
                          onClick={() => onVerifyRecord(rec.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border transition flex items-center gap-1 cursor-pointer ${
                            isVerified
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                          }`}
                          id={`btn-status-${rec.id}`}
                        >
                          {isVerified ? (
                            <>
                              <Check className="w-3 h-3 text-indigo-600" />
                              <span>Verified</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>Verify Row</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions Column */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1" id={`actions-box-${rec.id}`}>
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEditing(rec.id)}
                                className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm text-[10px] font-semibold"
                                title="Save Row Changes"
                                id={`btn-save-${rec.id}`}
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 transition text-[10px] font-semibold"
                                title="Cancel Edit"
                                id={`btn-cancel-${rec.id}`}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(rec)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                title="Edit Record Row"
                                id={`btn-edit-action-${rec.id}`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteRecord(rec.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition"
                                title="Delete Record Row"
                                id={`btn-delete-action-${rec.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Explanatory panel for handwriting transcript */}
                    {showExplanationId === rec.id && (
                      <tr className="bg-indigo-50/10" id={`row-explain-${rec.id}`}>
                        <td colSpan={8} className="p-3 pl-16 text-left border-t border-b border-slate-200/50">
                          <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-lg text-[11px] text-slate-700">
                            <span className="font-semibold text-slate-900 block mb-1">Raw handwriting context identified by Gemini:</span>
                            <blockquote className="italic text-slate-600 font-mono">
                              &ldquo;{rec.originalText}&rdquo;
                            </blockquote>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
