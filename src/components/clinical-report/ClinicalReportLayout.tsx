import React from 'react';
import { Row, Col } from 'antd';
import { DiagnosisCard } from './DiagnosisCard';
import { FindingsCard } from './FindingsCard';
import { PatientExplanationCard } from './PatientExplanationCard';
import { RecommendationsCard } from './RecommendationsCard';
import { MedicationsPanel } from './MedicationsPanel';
import { LabsTable } from './LabsTable';
import { ForwardPlanningCard } from './ForwardPlanningCard';
import type { ClinicalReport } from '../../utils/soapParser';
import '../../styles/clinicalReport.css';

interface Props {
  report: ClinicalReport;
  patientAge: number;
  patientGender: string;
}

export const ClinicalReportLayout: React.FC<Props> = ({
  report,
  patientAge,
  patientGender,
}) => {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  return (
    <div className="clinical-report">
      <Row gutter={[24, 24]}>
        {/* ── Left Column (62%) ────────────────────────── */}
        <Col xs={24} lg={15}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <DiagnosisCard
              diagnosis={report.diagnosis}
              patientAge={patientAge}
              patientGender={patientGender}
              date={today}
              source="AI Generated"
            />

            <FindingsCard findings={report.findings} />

            <PatientExplanationCard explanation={report.patientExplanation} />

            <RecommendationsCard recommendations={report.recommendations} />

            <ForwardPlanningCard plan={report.forwardPlan} />
          </div>
        </Col>

        {/* ── Right Column (38%) ───────────────────────── */}
        <Col xs={24} lg={9}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              position: 'sticky',
              top: 24,
            }}
          >
            <MedicationsPanel medications={report.medications} />

            <LabsTable labs={report.labs} />
          </div>
        </Col>
      </Row>
    </div>
  );
};
