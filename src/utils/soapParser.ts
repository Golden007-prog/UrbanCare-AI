/**
 * SOAP Parser — Extract structured clinical data from markdown notes
 *
 * Parses the SOAP, HPI, Assessment, and Plan markdown stored in
 * `patient.notes` into structured objects for the Clinical Report UI.
 */

// ── Types ────────────────────────────────────────────────

export interface ClinicalReport {
  diagnosis: DiagnosisData;
  findings: FindingsData;
  patientExplanation: string;
  recommendations: string[];
  medications: MedicationItem[];
  labs: LabResult[];
  forwardPlan: ForwardPlanData;
  rawSoap: string;
}

export interface DiagnosisData {
  title: string;
  status: string;
  riskLevel: string;
}

export interface FindingsData {
  summary: string;
  vitalFindings: string[];
  examFindings: string[];
}

export interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface LabResult {
  testName: string;
  result: string;
  referenceRange: string;
  unit: string;
  status: 'HIGH' | 'LOW' | 'NORMAL';
  explanation?: string;
}

export interface ForwardPlanData {
  timeframe: string;
  instructions: string[];
}

// ── Helpers ──────────────────────────────────────────────

function extractBetween(text: string, startMarker: string, endMarker?: string): string {
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) return '';
  const afterStart = text.substring(startIdx + startMarker.length);
  if (!endMarker) return afterStart.trim();
  const endIdx = afterStart.indexOf(endMarker);
  return endIdx === -1 ? afterStart.trim() : afterStart.substring(0, endIdx).trim();
}

function extractListItems(text: string): string[] {
  return text
    .split('\n')
    .map(l => l.replace(/^[\s]*[-*•]\s*/, '').trim())
    .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('|'));
}

// ── Main Parser ──────────────────────────────────────────

export function parseSoapToReport(
  notes: { soap: string; hpi: string; assessment: string; plan: string },
  patient: { name: string; age: number; gender: string; condition: string; riskLevel: string },
): ClinicalReport {
  const soap = notes.soap || '';
  const assessment = notes.assessment || '';
  const plan = notes.plan || '';
  const hpi = notes.hpi || '';

  // ── Diagnosis ─────────────────────────────────────────
  let diagnosisTitle = patient.condition;
  const diagMatch = assessment.match(/Primary Clinical Impression:\*?\*?\s*(.+)/i);
  if (diagMatch) diagnosisTitle = diagMatch[1].trim();

  let statusText = 'Stable with controlled vitals';
  const statusMatch = assessment.match(/Current Status:\*?\*?\s*(.+)/i);
  if (statusMatch) statusText = statusMatch[1].trim();

  // ── Findings ──────────────────────────────────────────
  const objectiveSection = extractBetween(soap, '## OBJECTIVE', '## ASSESSMENT');
  const examLines = objectiveSection
    .split('\n')
    .filter(l => l.startsWith('- ') && !l.includes('|'))
    .map(l => l.replace(/^-\s*/, '').trim());

  // Extract vitals table rows
  const vitalFindings: string[] = [];
  const tableMatch = objectiveSection.match(/\|[^|]+\|[^|]+\|[^|]+\|/g);
  if (tableMatch) {
    tableMatch.forEach(row => {
      if (!row.includes('Parameter') && !row.includes('---')) {
        const cells = row.split('|').filter(c => c.trim());
        if (cells.length >= 3) {
          const param = cells[0].trim();
          const value = cells[1].trim();
          const status = cells[2].trim();
          if (status !== 'Normal') {
            vitalFindings.push(`${param}: ${value} (${status})`);
          }
        }
      }
    });
  }

  const findingsSummary = assessment
    .split('\n')
    .filter(l => l.startsWith('Clinical reasoning:') || l.includes('Clinical reasoning:'))
    .map(l => l.replace(/^.*Clinical reasoning:\s*/, '').trim())
    .join(' ') || `Patient presents with ${patient.condition}. Clinical assessment in progress.`;

  // ── Patient Explanation ───────────────────────────────
  const explanation = hpi
    ? `Based on the clinical evaluation, ${patient.name} (${patient.age}, ${patient.gender}) presents with ${patient.condition}. ${findingsSummary} Your care team is monitoring your condition closely and will keep you informed of any changes to your treatment plan.`
    : `${patient.name} is being evaluated for ${patient.condition}. The medical team is working to ensure the best possible care.`;

  // ── Medications ───────────────────────────────────────
  const medications: MedicationItem[] = [];
  const medsSection = extractBetween(plan, '### Medications', '###');
  const medLines = medsSection.split('\n').filter(l => l.trim().startsWith('-'));

  medLines.forEach(line => {
    const cleaned = line.replace(/^[\s]*-\s*/, '').trim();
    if (cleaned.toLowerCase().includes('continue current')) {
      medications.push({ name: 'Current Regimen', dosage: 'As prescribed', frequency: 'Ongoing', duration: 'Continue' });
    } else if (cleaned.toLowerCase().includes('prn') || cleaned.toLowerCase().includes('analgesic')) {
      medications.push({ name: 'PRN Analgesics', dosage: 'As needed', frequency: 'PRN', duration: 'As required' });
    } else if (cleaned.toLowerCase().includes('acetaminophen')) {
      medications.push({ name: 'Acetaminophen', dosage: '650mg', frequency: 'PO q6h PRN', duration: 'As needed' });
    } else if (cleaned.length > 3) {
      medications.push({ name: cleaned, dosage: '', frequency: '', duration: '' });
    }
  });

  if (medications.length === 0) {
    medications.push({ name: 'Current Regimen', dosage: 'As prescribed', frequency: 'Ongoing', duration: 'Continue' });
  }

  // ── Labs ──────────────────────────────────────────────
  const labs: LabResult[] = [];
  const diagSection = extractBetween(plan, '### Diagnostics', '###');
  const labLines = diagSection.split('\n').filter(l => l.trim().startsWith('-'));

  labLines.forEach(line => {
    const cleaned = line.replace(/^[\s]*-\s*/, '').trim();
    if (cleaned.toLowerCase().includes('cbc')) {
      labs.push({ testName: 'Complete Blood Count (CBC)', result: 'Ordered', referenceRange: '-', unit: '-', status: 'NORMAL' });
    }
    if (cleaned.toLowerCase().includes('bmp') || cleaned.toLowerCase().includes('cmp')) {
      labs.push({ testName: 'Basic Metabolic Panel (BMP)', result: 'Ordered', referenceRange: '-', unit: '-', status: 'NORMAL' });
    }
    if (cleaned.toLowerCase().includes('troponin')) {
      labs.push({ testName: 'Troponin', result: 'Pending', referenceRange: '< 0.04', unit: 'ng/mL', status: 'NORMAL' });
    }
    if (cleaned.toLowerCase().includes('bnp')) {
      labs.push({ testName: 'BNP', result: 'Pending', referenceRange: '< 100', unit: 'pg/mL', status: 'NORMAL' });
    }
    if (cleaned.toLowerCase().includes('abg')) {
      labs.push({ testName: 'Arterial Blood Gas (ABG)', result: 'Ordered', referenceRange: '-', unit: '-', status: 'HIGH', explanation: 'Ordered due to persistent hypoxemia' });
    }
    if (cleaned.toLowerCase().includes('blood culture')) {
      labs.push({ testName: 'Blood Cultures x2', result: 'Pending', referenceRange: 'Negative', unit: '-', status: 'NORMAL' });
    }
  });

  // Add vitals-based lab interpretations
  if (patient.riskLevel === 'Critical') {
    if (!labs.some(l => l.testName.includes('CBC'))) {
      labs.push({ testName: 'Complete Blood Count (CBC)', result: 'STAT', referenceRange: '-', unit: '-', status: 'HIGH', explanation: 'Critical patient — STAT labs ordered' });
    }
  }

  if (labs.length === 0) {
    labs.push({ testName: 'Routine Panel', result: 'Pending', referenceRange: '-', unit: '-', status: 'NORMAL' });
  }

  // ── Recommendations ───────────────────────────────────
  const recommendations: string[] = [];
  const monitorSection = extractBetween(plan, '### Monitoring', '###');
  const monitorItems = extractListItems(monitorSection);
  monitorItems.forEach(item => {
    if (item.length > 5) recommendations.push(item);
  });

  const followUpSection = extractBetween(plan, '### Follow-up', '###');
  const followUpItems = extractListItems(followUpSection);
  followUpItems.forEach(item => {
    if (item.length > 5) recommendations.push(item);
  });

  if (recommendations.length === 0) {
    recommendations.push(
      'Continue current monitoring protocol',
      'Reassess vitals at next shift change',
      'Patient and family counseled regarding condition',
    );
  }

  // ── Forward Plan ──────────────────────────────────────
  const timeframeMatch = plan.match(/Re-evaluate in (\d[\w\s-]+hour|day|week)/i);
  const timeframe = timeframeMatch ? `After ${timeframeMatch[1]}` : 'Follow-up as scheduled';

  const safetySection = extractBetween(plan, '### Safety Considerations', '');
  const safetyItems = extractListItems(safetySection);

  const forwardInstructions = [
    ...followUpItems.filter(i => i.length > 5),
    ...safetyItems.filter(i => i.length > 5),
  ];

  if (forwardInstructions.length === 0) {
    forwardInstructions.push('Standard escalation protocols apply if clinical deterioration occurs');
  }

  return {
    diagnosis: { title: diagnosisTitle, status: statusText, riskLevel: patient.riskLevel },
    findings: { summary: findingsSummary, vitalFindings, examFindings: examLines },
    patientExplanation: explanation,
    recommendations,
    medications,
    labs,
    forwardPlan: { timeframe, instructions: forwardInstructions },
    rawSoap: soap,
  };
}
