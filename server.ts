import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;

// Lazy initialization of Gemini SDK client to prevent startup crashes when API key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please add it via Settings > Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();

  // Support large base64 uploads for images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API endpoint for health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API endpoint for advanced handwritten OCR
  app.post("/api/ocr", async (req, res) => {
    try {
      const { image, mimeType = "image/jpeg" } = req.body;

      if (!image) {
        return res.status(400).json({ error: "Missing image data in request body." });
      }

      // Strip potential base64 prefix if present
      let base64Data = image;
      if (image.includes("base64,")) {
        base64Data = image.split("base64,")[1];
      }

      const ai = getGeminiClient();

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      };

      const promptPart = {
        text: `You are an expert medical records and handwriting transcriber. 
Analyze the uploaded image of handwritten notebook pages or patient records.
Carefully extract and digitize each row of handwritten entries. 

For each record entry, find the following fields:
1. Name: The full name of the patient or individual. Clean up spelling where obvious, capitalize names properly (e.g., "John Doe").
2. NHIS Number: National Health Insurance Scheme ID. Usually a string of numbers or sometimes letters and numbers (e.g., "12345678"). Extract the numbers precisely. Return empty string if missing or completely unreadable.
3. Date: The date of the record entry. Standardize to YYYY-MM-DD format (e.g., 2026-06-26). If the year is missing in the handwriting, assume 2026. If the date is completely missing, return the current date or empty string.

Be extremely precise. Do not invent records. If a page contains no visible records, return an empty array.
Assign a confidence score (0.0 to 1.0) based on how clear or blurry the handwriting is for that particular entry.
`,
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [imagePart, promptPart],
        config: {
          systemInstruction: "You are a specialized handwriting digitizer. Only output valid JSON matching the requested schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              records: {
                type: Type.ARRAY,
                description: "List of digitized handwritten patient/individual entries.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "The full name of the individual (properly capitalized).",
                    },
                    nhisNumber: {
                      type: Type.STRING,
                      description: "The NHIS scheme number. Leave empty if not found.",
                    },
                    date: {
                      type: Type.STRING,
                      description: "The date of the record in YYYY-MM-DD format.",
                    },
                    confidence: {
                      type: Type.NUMBER,
                      description: "A confidence estimate between 0.0 and 1.0 for this transcription.",
                    },
                    originalText: {
                      type: Type.STRING,
                      description: "The exact words or context transcribed from this row to help with manual validation.",
                    },
                  },
                  required: ["name", "nhisNumber", "date", "confidence", "originalText"],
                },
              },
            },
            required: ["records"],
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response received from the Gemini model.");
      }

      const result = JSON.parse(text);
      return res.json(result);
    } catch (error: any) {
      console.error("OCR API error:", error);
      const message = error.message || "An error occurred during handwriting digitization.";
      return res.status(500).json({ error: message });
    }
  });

  // Vite middleware setup for development, static fallback for production
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Express server:", err);
});
