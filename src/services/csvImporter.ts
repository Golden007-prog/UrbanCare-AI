// ──────────────────────────────────────────────────────────
// CSV Importer Service
// Schema detection, validation, column mapping, parsing,
// synthetic vitals generation, and PHI detection.
// ──────────────────────────────────────────────────────────

import type { Patient } from '../store/useStore';

// ── Types ─────────────────────────────────────────────────

export type CsvFileType = 'patients' | 'vitals' | 'alerts' | 'unknown';

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  extra: string[];
}

export interface Alert {
  patientId: string;
  timestamp: string;
  alertType: string;
  message: string;
}

export interface ParsedVitalRow {
  patientId: string;
  timestamp: string;
  heartRate: number;
  systolicBP: number;
  diastolicBP: number;
  respRate: number;
  spO2: number;
  temperature: number;
}

export interface ColumnMapping {
  [externalName: string]: string;
}

export interface PHIWarning {
  column: string;
  sampleValue: string;
  reason: string;
}

// ── Expected schemas ──────────────────────────────────────

const PATIENTS_REQUIRED = ['PatientID', 'Name', 'Age', 'Gender', 'PrimaryCondition', 'RiskLevel'];
const PATIENTS_OPTIONAL = ['InitialNotes'];

const VITALS_REQUIRED = ['PatientID', 'Timestamp', 'HeartRate', 'SystolicBP', 'DiastolicBP', 'RespRate', 'SpO2', 'Temperature'];

const ALERTS_REQUIRED = ['PatientID', 'Timestamp', 'AlertType', 'Message'];

// ── Column-mapping presets for external datasets ──────────

export const COLUMN_PRESETS: Record<string, ColumnMapping> = {
  eICU: {
    patientunitstayid: 'PatientID',
    uniquepid: 'PatientID',
    patientname: 'Name',
    patient_name: 'Name',
    age: 'Age',
    gender: 'Gender',
    diagnosis: 'PrimaryCondition',
    apacheadmissiondx: 'PrimaryCondition',
    acuity: 'RiskLevel',
    heart_rate: 'HeartRate',
    heartrate: 'HeartRate',
    systemicsystolic: 'SystolicBP',
    systolicbp: 'SystolicBP',
    systemicdiastolic: 'DiastolicBP',
    diastolicbp: 'DiastolicBP',
    respiration: 'RespRate',
    resprate: 'RespRate',
    respiratoryrate: 'RespRate',
    sao2: 'SpO2',
    spo2: 'SpO2',
    o2saturation: 'SpO2',
    temperature: 'Temperature',
    temp: 'Temperature',
    observationtime: 'Timestamp',
    charttime: 'Timestamp',
    nursingcharttime: 'Timestamp',
  },
  zenodo: {
    patient_id: 'PatientID',
    subject_id: 'PatientID',
    name: 'Name',
    age: 'Age',
    sex: 'Gender',
    primary_diagnosis: 'PrimaryCondition',
    risk: 'RiskLevel',
    hr: 'HeartRate',
    sbp: 'SystolicBP',
    dbp: 'DiastolicBP',
    rr: 'RespRate',
    spo2: 'SpO2',
    temp: 'Temperature',
    recorded_at: 'Timestamp',
    timestamp: 'Timestamp',
  },
  covid: {
    patient_id: 'PatientID',
    case_id: 'PatientID',
    full_name: 'Name',
    age: 'Age',
    gender: 'Gender',
    sex: 'Gender',
    condition: 'PrimaryCondition',
    severity: 'RiskLevel',
    pulse: 'HeartRate',
    heart_rate: 'HeartRate',
    sys_bp: 'SystolicBP',
    dia_bp: 'DiastolicBP',
    resp_rate: 'RespRate',
    breathing_rate: 'RespRate',
    oxygen_saturation: 'SpO2',
    spo2: 'SpO2',
    body_temp: 'Temperature',
    temperature: 'Temperature',
    date_time: 'Timestamp',
    timestamp: 'Timestamp',
  },
};

// ── Helpers ───────────────────────────────────────────────

/** Lowercase-normalize a header for comparison */
const norm = (h: string) => h.trim().toLowerCase().replace(/[\s_-]+/g, '');

/** Build a normalised lookup: normKey → original header */
const buildNormMap = (headers: string[]) => {
  const map: Record<string, string> = {};
  headers.forEach((h) => {
    map[norm(h)] = h;
  });
  return map;
};

// ── 1. Detect CSV type ───────────────────────────────────

export function detectCsvType(headers: string[]): CsvFileType {
  const normed = new Set(headers.map(norm));

  // Vitals: must have heartrate + spo2 + patientid
  if (normed.has('heartrate') && normed.has('spo2') && normed.has('patientid')) return 'vitals';

  // Alerts: must have alerttype + message + patientid
  if (normed.has('alerttype') && normed.has('message') && normed.has('patientid')) return 'alerts';

  // Patients: must have name + age + patientid
  if (normed.has('name') && normed.has('age') && normed.has('patientid')) return 'patients';

  return 'unknown';
}

// ── 2. Try to auto-detect a mapping preset ───────────────

export function detectPreset(headers: string[]): string | null {
  const normed = new Set(headers.map(norm));

  // Score each preset by how many of its source columns appear in the headers
  let best: string | null = null;
  let bestScore = 0;

  for (const [presetName, mapping] of Object.entries(COLUMN_PRESETS)) {
    const sourceKeys = Object.keys(mapping);
    const matched = sourceKeys.filter((k) => normed.has(norm(k))).length;
    const score = matched / sourceKeys.length;
    if (score > bestScore && matched >= 3) {
      best = presetName;
      bestScore = score;
    }
  }

  return best;
}

// ── 3. Apply column mapping ──────────────────────────────

export function mapColumns(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): Record<string, string>[] {
  const normMapping: Record<string, string> = {};
  for (const [src, dest] of Object.entries(mapping)) {
    normMapping[norm(src)] = dest;
  }

  return rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const target = normMapping[norm(key)];
      if (target) {
        mapped[target] = value;
      } else {
        mapped[key] = value; // pass through unmapped columns
      }
    }
    return mapped;
  });
}

// ── 4. Validate schema ──────────────────────────────────

export function validateSchema(headers: string[], type: CsvFileType): ValidationResult {
  const required =
    type === 'patients' ? PATIENTS_REQUIRED :
    type === 'vitals' ? VITALS_REQUIRED :
    type === 'alerts' ? ALERTS_REQUIRED : [];

  const normedHeaders = new Set(headers.map(norm));
  const missing = required.filter((col) => !normedHeaders.has(norm(col)));
  const allExpected = new Set(
    (type === 'patients' ? [...PATIENTS_REQUIRED, ...PATIENTS_OPTIONAL] :
     type === 'vitals' ? VITALS_REQUIRED :
     type === 'alerts' ? ALERTS_REQUIRED : []).map(norm),
  );
  const extra = headers.filter((h) => !allExpected.has(norm(h)));

  return { valid: missing.length === 0, missing, extra };
}

// ── 5. Parse patients ────────────────────────────────────

function findCol(row: Record<string, string>, target: string): string {
  const n = norm(target);
  for (const key of Object.keys(row)) {
    if (norm(key) === n) return row[key];
  }
  return '';
}

export function parsePatientsCSV(rows: Record<string, string>[]): Patient[] {
  return rows
    .filter((row) => findCol(row, 'PatientID') || findCol(row, 'Name'))
    .map((row) => {
      const id = findCol(row, 'PatientID') || `P${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      const riskRaw = findCol(row, 'RiskLevel') || 'Stable';
      const riskLevel = (['Critical', 'Warning', 'Stable'].find(
        (r) => norm(r) === norm(riskRaw),
      ) || 'Stable') as 'Critical' | 'Warning' | 'Stable';

      const genderRaw = findCol(row, 'Gender') || 'Other';
      const gender = (['Male', 'Female', 'Other'].find(
        (g) => norm(g) === norm(genderRaw),
      ) || 'Other') as 'Male' | 'Female' | 'Other';

      return {
        id,
        name: findCol(row, 'Name') || 'Unknown',
        age: parseInt(findCol(row, 'Age')) || 0,
        gender,
        condition: findCol(row, 'PrimaryCondition') || findCol(row, 'Condition') || 'General Checkup',
        riskLevel,
        lastUpdated: 'Just now',
        patientType: 'private', // Default to private
        admissionStatus: 'discharged', // Default admission status
        monitoringEnabled: false,
        vitals: generateSyntheticVitals(id),
        notes: {
          soap: findCol(row, 'InitialNotes') || '',
          hpi: '',
          assessment: '',
          plan: '',
        },
      };
    });
}

// ── 6. Parse vitals ──────────────────────────────────────

export function parseVitalsCSV(rows: Record<string, string>[]): Record<string, ParsedVitalRow[]> {
  const grouped: Record<string, ParsedVitalRow[]> = {};

  for (const row of rows) {
    const patientId = findCol(row, 'PatientID');
    if (!patientId) continue;

    const entry: ParsedVitalRow = {
      patientId,
      timestamp: findCol(row, 'Timestamp') || new Date().toISOString(),
      heartRate: parseFloat(findCol(row, 'HeartRate')) || 0,
      systolicBP: parseFloat(findCol(row, 'SystolicBP')) || 0,
      diastolicBP: parseFloat(findCol(row, 'DiastolicBP')) || 0,
      respRate: parseFloat(findCol(row, 'RespRate')) || 0,
      spO2: parseFloat(findCol(row, 'SpO2')) || 0,
      temperature: parseFloat(findCol(row, 'Temperature')) || 0,
    };

    if (!grouped[patientId]) grouped[patientId] = [];
    grouped[patientId].push(entry);
  }

  // Sort each group by timestamp
  for (const pid of Object.keys(grouped)) {
    grouped[pid].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  return grouped;
}

/**
 * Convert grouped vitals rows into the Patient.vitals shape expected by the store.
 */
export function buildVitalsObject(rows: ParsedVitalRow[]): Patient['vitals'] {
  const latest = rows[rows.length - 1];
  const prev = rows.length > 1 ? rows[rows.length - 2] : latest;

  const trendPct = (cur: number, old: number) =>
    old === 0 ? 0 : Number((((cur - old) / old) * 100).toFixed(1));

  const statusFromRange = (val: number, low: number, high: number, critLow: number, critHigh: number): 'stable' | 'warning' | 'critical' => {
    if (val < critLow || val > critHigh) return 'critical';
    if (val < low || val > high) return 'warning';
    return 'stable';
  };

  const history = (extract: (r: ParsedVitalRow) => number) =>
    rows.map((r) => {
      const d = new Date(r.timestamp);
      return { time: `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`, value: extract(r) };
    });

  return {
    heartRate: {
      name: 'Heart Rate',
      value: latest.heartRate,
      unit: 'BPM',
      trend: trendPct(latest.heartRate, prev.heartRate),
      status: statusFromRange(latest.heartRate, 60, 100, 40, 130),
      history: history((r) => r.heartRate),
    },
    bloodPressure: {
      sys: latest.systolicBP,
      dia: latest.diastolicBP,
      status: statusFromRange(latest.systolicBP, 90, 140, 70, 180),
      trend: trendPct(latest.systolicBP, prev.systolicBP),
    },
    spO2: {
      name: 'SpO2',
      value: latest.spO2,
      unit: '%',
      trend: trendPct(latest.spO2, prev.spO2),
      status: statusFromRange(latest.spO2, 94, 100, 88, 101),
      history: history((r) => r.spO2),
    },
    temperature: {
      name: 'Temperature',
      value: latest.temperature,
      unit: '°F',
      trend: trendPct(latest.temperature, prev.temperature),
      status: statusFromRange(latest.temperature, 97, 99.5, 95, 104),
      history: history((r) => r.temperature),
    },
    respiration: {
      name: 'Respiration',
      value: latest.respRate,
      unit: '/min',
      trend: trendPct(latest.respRate, prev.respRate),
      status: statusFromRange(latest.respRate, 12, 20, 8, 30),
      history: history((r) => r.respRate),
    },
  };
}

// ── 7. Parse alerts ──────────────────────────────────────

export function parseAlertsCSV(rows: Record<string, string>[]): Alert[] {
  return rows
    .filter((row) => findCol(row, 'PatientID'))
    .map((row) => ({
      patientId: findCol(row, 'PatientID'),
      timestamp: findCol(row, 'Timestamp') || new Date().toISOString(),
      alertType: findCol(row, 'AlertType') || 'General',
      message: findCol(row, 'Message') || '',
    }));
}

// ── 8. Synthetic vitals generator ────────────────────────

export function generateSyntheticVitals(patientId: string): Patient['vitals'] {
  // Use patientId to seed some determinism (simple hash)
  const seed = patientId.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const rand = (base: number, variance: number) => base + ((((seed * 9301 + 49297) % 233280) / 233280) * variance * 2 - variance);

  const generateHistory = (base: number, variance: number) =>
    Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      value: Number((base + (Math.random() * variance * 2 - variance)).toFixed(1)),
    }));

  const hr = Math.floor(60 + Math.abs(rand(0, 40)));
  const sys = Math.floor(110 + Math.abs(rand(0, 30)));
  const dia = Math.floor(70 + Math.abs(rand(0, 20)));
  const spo2 = Math.floor(95 + Math.abs(rand(0, 5)));
  const temp = Number((97 + Math.abs(rand(0, 2))).toFixed(1));
  const resp = Math.floor(12 + Math.abs(rand(0, 8)));

  const status = (val: number, low: number, high: number): 'stable' | 'warning' | 'critical' => {
    if (val < low * 0.85 || val > high * 1.15) return 'critical';
    if (val < low || val > high) return 'warning';
    return 'stable';
  };

  return {
    heartRate: {
      name: 'Heart Rate',
      value: hr,
      unit: 'BPM',
      trend: Number((Math.random() * 5 - 2.5).toFixed(1)),
      status: status(hr, 60, 100),
      history: generateHistory(80, 5),
    },
    bloodPressure: {
      sys,
      dia,
      status: status(sys, 90, 140),
      trend: Number((Math.random() * 5 - 2.5).toFixed(1)),
    },
    spO2: {
      name: 'SpO2',
      value: spo2,
      unit: '%',
      trend: Number((Math.random() * 2 - 1).toFixed(1)),
      status: status(spo2, 94, 100),
      history: generateHistory(97, 2),
    },
    temperature: {
      name: 'Temperature',
      value: temp,
      unit: '°F',
      trend: Number((Math.random() * 1 - 0.5).toFixed(1)),
      status: status(temp, 97, 99.5),
      history: generateHistory(98.6, 0.5),
    },
    respiration: {
      name: 'Respiration',
      value: resp,
      unit: '/min',
      trend: Number((Math.random() * 2 - 1).toFixed(1)),
      status: status(resp, 12, 20),
      history: generateHistory(16, 4),
    },
  };
}

// ── 9. PHI detection ─────────────────────────────────────

const PHI_PATTERNS: { regex: RegExp; reason: string }[] = [
  { regex: /\b\d{3}-\d{2}-\d{4}\b/, reason: 'Possible SSN detected' },
  { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, reason: 'Email address detected' },
  { regex: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, reason: 'Phone number detected' },
  { regex: /\b\d{1,5}\s+\w+\s+(st|street|ave|avenue|blvd|dr|drive|ln|lane|rd|road|ct|court)\b/i, reason: 'Street address detected' },
  { regex: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b/i, reason: 'Date of birth format detected' },
];

// Simple heuristic: names with both first + last (two+ capitalised words)
const REAL_NAME_PATTERN = /^[A-Z][a-z]+\s[A-Z][a-z]+/;

export function detectPHI(rows: Record<string, string>[]): PHIWarning[] {
  const warnings: PHIWarning[] = [];
  const checked = new Set<string>(); // de-dupe by column+reason

  const sample = rows.slice(0, 50); // scan first 50 rows

  for (const row of sample) {
    for (const [col, value] of Object.entries(row)) {
      if (!value) continue;

      for (const { regex, reason } of PHI_PATTERNS) {
        const key = `${col}|${reason}`;
        if (!checked.has(key) && regex.test(value)) {
          warnings.push({ column: col, sampleValue: value.slice(0, 30), reason });
          checked.add(key);
        }
      }

      // Real-name check only on likely name columns
      if (norm(col).includes('name') && REAL_NAME_PATTERN.test(value)) {
        const key = `${col}|realname`;
        if (!checked.has(key)) {
          warnings.push({ column: col, sampleValue: value.slice(0, 30), reason: 'Possible real patient name detected' });
          checked.add(key);
        }
      }
    }
  }

  return warnings;
}
