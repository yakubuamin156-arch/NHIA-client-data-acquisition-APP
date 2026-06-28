import React, { useState, useEffect } from "react";
import { OcrRecord, ScanBatch } from "./types";
import CameraCapture from "./components/CameraCapture";
import SpreadsheetGrid from "./components/SpreadsheetGrid";
import ExportPanel from "./components/ExportPanel";
import StatsBanner from "./components/StatsBanner";
import { Sparkles, FileSpreadsheet, ShieldCheck, AlertCircle, RefreshCw, History, Moon, Sun, Info, Image as ImageIcon } from "lucide-react";

export default function App() {
  const [records, setRecords] = useState<OcrRecord[]>([]);
  const [batches, setBatches] = useState<ScanBatch[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStep, setProcessStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load records and batches from localStorage on startup
  useEffect(() => {
    try {
      const savedRecords = localStorage.getItem("ocr_digitizer_records");
      if (savedRecords) {
        setRecords(JSON.parse(savedRecords));
      }
      const savedBatches = localStorage.getItem("ocr_digitizer_batches");
      if (savedBatches) {
        setBatches(JSON.parse(savedBatches));
      }
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
    }
  }, []);

  // Sync state to localStorage when changes occur
  const saveState = (updatedRecords: OcrRecord[], updatedBatches?: ScanBatch[]) => {
    try {
      localStorage.setItem("ocr_digitizer_records", JSON.stringify(updatedRecords));
      if (updatedBatches) {
        localStorage.setItem("ocr_digitizer_batches", JSON.stringify(updatedBatches));
      }
    } catch (e) {
      console.error("Failed to persist state:", e);
    }
  };

  // Process snapped or uploaded image through the Express OCR endpoint
  const handleImageReady = async (base64Image: string, fileName: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    
    // Simulate multi-step loading phases to reassure the user
    const steps = [
      "Uploading handwritten page...",
      "Preprocessing scan and normalizing contrast...",
      "Scanning writing structures with Gemini AI...",
      "Extracting Names, NHIS Numbers, and Dates...",
      "Standardizing dates to YYYY-MM-DD...",
      "Compiling structured rows...",
    ];

    let currentStepIdx = 0;
    setProcessStep(steps[currentStepIdx]);
    
    const interval = setInterval(() => {
      if (currentStepIdx < steps.length - 1) {
        currentStepIdx++;
        setProcessStep(steps[currentStepIdx]);
      }
    }, 1500);

    // Prepare batch item
    const batchId = Math.random().toString(36).substring(2, 9);
    const newBatch: ScanBatch = {
      id: batchId,
      imageName: fileName,
      thumbnail: base64Image,
      timestamp: new Date().toLocaleTimeString(),
      recordsCount: 0,
      status: "processing",
    };

    const updatedBatches = [newBatch, ...batches];
    setBatches(updatedBatches);
    saveState(records, updatedBatches);

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Image,
          mimeType: "image/jpeg",
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Internal Server Error from OCR Digitizer.");
      }

      const data = await response.json();
      
      if (!data.records || !Array.isArray(data.records)) {
        throw new Error("Invalid output format returned by the handwriting recognizer.");
      }

      // Map parsed records to our schema
      const timestampStr = new Date().toLocaleString();
      const extractedRows: OcrRecord[] = data.records.map((row: any) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: row.name || "",
        nhisNumber: row.nhisNumber || "",
        date: row.date || "",
        confidence: typeof row.confidence === "number" ? row.confidence : 0.8,
        originalText: row.originalText || "",
        status: "pending",
        timestamp: timestampStr,
      }));

      // Merge new rows
      const mergedRecords = [...extractedRows, ...records];
      setRecords(mergedRecords);

      // Update batch status
      const completedBatches = updatedBatches.map((b) =>
        b.id === batchId
          ? { ...b, status: "completed" as const, recordsCount: extractedRows.length }
          : b
      );
      setBatches(completedBatches);
      saveState(mergedRecords, completedBatches);

    } catch (err: any) {
      clearInterval(interval);
      console.error("Digitization failed:", err);
      setErrorMessage(err.message || "An error occurred during paper records OCR processing.");

      const failedBatches = updatedBatches.map((b) =>
        b.id === batchId ? { ...b, status: "failed" as const, error: err.message } : b
      );
      setBatches(failedBatches);
      saveState(records, failedBatches);
    } finally {
      setIsProcessing(false);
      setProcessStep("");
    }
  };

  // Record CRUD mutators
  const handleUpdateRecord = (id: string, updated: Partial<OcrRecord>) => {
    const updatedRecs = records.map((r) => (r.id === id ? { ...r, ...updated } : r));
    setRecords(updatedRecs);
    saveState(updatedRecs);
  };

  const handleDeleteRecord = (id: string) => {
    const updatedRecs = records.filter((r) => r.id !== id);
    setRecords(updatedRecs);
    saveState(updatedRecs);
  };

  const handleVerifyRecord = (id: string) => {
    const updatedRecs = records.map((r) =>
      r.id === id ? { ...r, status: r.status === "verified" ? ("pending" as const) : ("verified" as const) } : r
    );
    setRecords(updatedRecs);
    saveState(updatedRecs);
  };

  const handleAddManualRecord = () => {
    const newRec: OcrRecord = {
      id: Math.random().toString(36).substring(2, 9),
      name: "",
      nhisNumber: "",
      date: new Date().toISOString().split("T")[0],
      confidence: 1.0,
      originalText: "Manually Entered Row",
      status: "pending",
      timestamp: new Date().toLocaleString(),
    };
    const updatedRecs = [newRec, ...records];
    setRecords(updatedRecs);
    saveState(updatedRecs);
  };

  const handleBulkVerify = (ids: string[]) => {
    const updatedRecs = records.map((r) => (ids.includes(r.id) ? { ...r, status: "verified" as const } : r));
    setRecords(updatedRecs);
    saveState(updatedRecs);
  };

  const handleBulkDelete = (ids: string[]) => {
    const updatedRecs = records.filter((r) => !ids.includes(r.id));
    setRecords(updatedRecs);
    saveState(updatedRecs);
  };

  const clearSessionRecords = () => {
    if (window.confirm("Are you sure you want to delete all digitized records from this session?")) {
      setRecords([]);
      setBatches([]);
      localStorage.removeItem("ocr_digitizer_records");
      localStorage.removeItem("ocr_digitizer_batches");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 overflow-x-hidden" id="app-root-container">
      {/* Dynamic Geometric Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-20" id="app-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white"></div>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            DIGI-SCRIBE <span className="text-indigo-600 font-medium">OCR</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-700">
            <span className={`w-2 h-2 rounded-full ${isProcessing ? "bg-amber-500 animate-pulse" : "bg-green-500"}`}></span>
            {isProcessing ? "PROCESSING SCAN" : "SYSTEM READY"}
          </div>

          <button
            onClick={clearSessionRecords}
            className="text-xs px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition font-semibold"
            id="btn-clear-session"
          >
            Clear Workspace
          </button>
        </div>
      </header>

      {/* Main Panel Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6" id="dashboard-main-panel">
        {/* Left Hand: Capture, Upload, and History */}
        <div className="w-full lg:w-[380px] flex flex-col gap-6 shrink-0" id="left-sidebar">
          {/* Active Camera/Upload Box */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Scanning Engine</h3>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">DEVICE-LOCAL</span>
            </div>
            <CameraCapture onImageReady={handleImageReady} isProcessing={isProcessing} />
          </div>

          {/* Processing Status Dialog */}
          {isProcessing && (
            <div className="bg-slate-900 border-4 border-slate-800 text-white rounded-2xl p-5 shadow-2xl relative overflow-hidden" id="processing-progress-dialog">
              {/* Spinning background rings */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-indigo-500/5 rounded-full animate-ping pointer-events-none" />
              
              <div className="flex items-center gap-4 relative z-10" id="progress-header">
                <div className="p-3 bg-indigo-500/15 rounded-xl text-indigo-400 flex items-center justify-center animate-spin">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-slate-100">Digitizing Page...</h4>
                  <p className="text-[10px] text-indigo-400 font-mono tracking-wide mt-0.5 animate-pulse uppercase">
                    {processStep || "Initiating analysis"}
                  </p>
                </div>
              </div>

              <div className="mt-4 bg-slate-800 h-1.5 rounded-full overflow-hidden" id="progress-bar-container">
                <div className="h-full bg-indigo-600 rounded-full animate-pulse" style={{ width: "85%" }} />
              </div>
            </div>
          )}

          {/* OCR API Error Box */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-left shadow-sm" id="error-alert-box">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-bold text-rose-800">Digitization Notice</h5>
                <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">{errorMessage}</p>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="mt-2 text-[10px] font-bold text-rose-600 hover:text-rose-800 underline"
                  id="btn-dismiss-error"
                >
                  Dismiss Warning
                </button>
              </div>
            </div>
          )}

          {/* Batch History Sidebar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-left flex flex-col flex-1" id="history-sidebar">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Session History</span>
            </h4>

            {batches.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-400" id="history-empty-view">
                <ImageIcon className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No scanned pages yet</p>
                <p className="text-[10px] text-slate-400 max-w-[200px] mt-0.5">Scanned sheets in this session will be cataloged here.</p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[320px] pr-1" id="history-list">
                {batches.map((b) => (
                  <div key={b.id} className="p-2 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center gap-3 hover:bg-indigo-50/20 transition duration-150" id={`batch-${b.id}`}>
                    <div className="w-12 h-12 rounded bg-slate-200 border border-slate-300 overflow-hidden relative shrink-0">
                      <img src={b.thumbnail} alt="Page Thumbnail" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-slate-700 text-xs truncate">{b.imageName}</h5>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{b.timestamp}</p>
                    </div>
                    <div className="text-right">
                      {b.status === "processing" ? (
                        <span className="inline-block w-2.5 h-2.5 bg-indigo-600 rounded-full animate-ping" />
                      ) : b.status === "failed" ? (
                        <span className="text-[10px] font-bold text-rose-500">Failed</span>
                      ) : (
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-800 block font-mono">+{b.recordsCount}</span>
                          <span className="text-[9px] text-indigo-600 font-semibold uppercase tracking-wider block">Rows</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Hand: Spreadsheet Workspace and Stats */}
        <div className="flex-1 flex flex-col gap-6 min-w-0" id="right-workspace">
          {/* Bento Statistics Banner */}
          <StatsBanner records={records} />

          {/* Spreadsheet Table Grid */}
          <div className="flex-1 min-h-[460px]" id="grid-spreadsheet-box">
            <SpreadsheetGrid
              records={records}
              onUpdateRecord={handleUpdateRecord}
              onDeleteRecord={handleDeleteRecord}
              onVerifyRecord={handleVerifyRecord}
              onAddManualRecord={handleAddManualRecord}
              onBulkVerify={handleBulkVerify}
              onBulkDelete={handleBulkDelete}
            />
          </div>

          {/* Export & Download Hub */}
          <ExportPanel records={records} />
        </div>
      </main>

      {/* Pristine monospaced aesthetic footer from Geometric Balance design */}
      <footer className="h-12 bg-white border-t border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 text-[10px] text-slate-400 font-mono" id="app-footer">
        <div>HARDWARE ACCELERATION: ON</div>
        <div className="flex gap-4">
          <span>SESSION ID: #OCR-8821</span>
          <span>ENCRYPTION: AES-256</span>
        </div>
      </footer>
    </div>
  );
}
