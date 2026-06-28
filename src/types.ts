export interface OcrRecord {
  id: string;
  name: string;
  nhisNumber: string;
  date: string;
  confidence: number;
  originalText: string;
  status: "pending" | "verified";
  pageNumber?: number;
  timestamp: string;
}

export interface DigitizationStats {
  totalRecords: number;
  verifiedCount: number;
  averageConfidence: number;
  missingNhisCount: number;
  missingDateCount: number;
}

export interface ScanBatch {
  id: string;
  imageName: string;
  thumbnail: string; // base64 or object URL
  timestamp: string;
  recordsCount: number;
  status: "processing" | "completed" | "failed";
  error?: string;
}
