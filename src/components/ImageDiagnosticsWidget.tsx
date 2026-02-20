import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';

export const ImageDiagnosticsWidget = () => {
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // Extract base64 data
      const base64Data = image.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-latest",
        contents: {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Data } },
            { text: "Analyze this medical image for any anomalies. Provide a brief clinical summary." }
          ]
        }
      });

      setAnalysis(response.text);
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalysis("Error analyzing image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <ImageIcon className="w-5 h-5 text-indigo-500" />
        Image Diagnostics
      </h3>

      {!image ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer h-48"
        >
          <Upload className="w-8 h-8 mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">Upload X-ray or MRI</p>
          <p className="text-xs text-slate-400 mt-1">Click to browse files</p>
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-slate-200 h-48 bg-black">
            <img src={image} alt="Uploaded scan" className="w-full h-full object-contain" />
            <button 
              onClick={() => { setImage(null); setAnalysis(null); }}
              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
          </div>

          {!analysis && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Run AI Analysis
                </>
              )}
            </button>
          )}

          {analysis && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 max-h-40 overflow-y-auto prose prose-sm">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
