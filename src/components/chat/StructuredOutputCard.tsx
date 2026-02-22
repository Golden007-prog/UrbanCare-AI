import React from 'react';
import { FileText, AlertTriangle, Lightbulb, ClipboardList } from 'lucide-react';

interface StructuredData {
  summary?: string;
  clinicalReasoning?: string;
  recommendations?: string[];
  warnings?: string[];
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  [key: string]: any;
}

interface StructuredOutputCardProps {
  data: StructuredData;
}

export function StructuredOutputCard({ data }: StructuredOutputCardProps) {
  // Try to detect SOAP structure
  const isSOAP = data.subjective || data.objective || data.assessment || data.plan;

  return (
    <div className="copilot-structured-card">
      <h4>
        <FileText style={{ width: 14, height: 14, color: '#6366f1' }} />
        {isSOAP ? 'SOAP Note' : 'Clinical Output'}
      </h4>

      {/* Summary */}
      {data.summary && (
        <div className="copilot-structured-section">
          <div className="copilot-structured-label">Summary</div>
          <div className="copilot-structured-text">{data.summary}</div>
        </div>
      )}

      {/* SOAP Sections */}
      {isSOAP && (
        <>
          {data.subjective && (
            <div className="copilot-structured-section">
              <div className="copilot-structured-label">Subjective</div>
              <div className="copilot-structured-text">{data.subjective}</div>
            </div>
          )}
          {data.objective && (
            <div className="copilot-structured-section">
              <div className="copilot-structured-label">Objective</div>
              <div className="copilot-structured-text">{data.objective}</div>
            </div>
          )}
          {data.assessment && (
            <div className="copilot-structured-section">
              <div className="copilot-structured-label">Assessment</div>
              <div className="copilot-structured-text">{data.assessment}</div>
            </div>
          )}
          {data.plan && (
            <div className="copilot-structured-section">
              <div className="copilot-structured-label">Plan</div>
              <div className="copilot-structured-text">{data.plan}</div>
            </div>
          )}
        </>
      )}

      {/* Clinical Reasoning */}
      {data.clinicalReasoning && (
        <div className="copilot-structured-section">
          <div className="copilot-structured-label">
            <Lightbulb style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />
            Clinical Reasoning
          </div>
          <div className="copilot-structured-text">{data.clinicalReasoning}</div>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="copilot-structured-section">
          <div className="copilot-structured-label">
            <ClipboardList style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />
            Recommendations
          </div>
          <ul className="copilot-structured-list">
            {data.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {data.warnings && data.warnings.length > 0 && (
        <div className="copilot-structured-warnings">
          <div className="copilot-structured-label" style={{ color: '#d97706' }}>
            <AlertTriangle style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />
            Warnings
          </div>
          <ul className="copilot-structured-list">
            {data.warnings.map((warn, i) => (
              <li key={i}>{warn}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
