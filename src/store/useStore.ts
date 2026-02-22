import { create } from 'zustand';
import type { Alert } from '../services/csvImporter';

// ──────────────────────────────────────────────────────────
// Interfaces
// ──────────────────────────────────────────────────────────

export interface VitalSign {
  name: string;
  value: number;
  unit: string;
  trend: number; // percentage change
  status: 'stable' | 'warning' | 'critical';
  history: { time: string; value: number }[];
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  condition: string;
  riskLevel: 'Stable' | 'Warning' | 'Critical';
  lastUpdated: string;
  hospitalId?: string;
  vitals: {
    heartRate: VitalSign;
    bloodPressure: { sys: number; dia: number; status: 'stable' | 'warning' | 'critical'; trend: number };
    spO2: VitalSign;
    temperature: VitalSign;
    respiration: VitalSign;
  };
  notes: {
    soap: string;
    hpi: string;
    assessment: string;
    plan: string;
  };
}

export interface Hospital {
  id: string;
  name: string;
  location: string;
  department: string;
  status: 'Active' | 'Inactive';
  compliance: string[];
  support: string;
}

export interface DoctorProfile {
  name: string;
  specialization: string;
  hospital: string;
  licenseNumber: string;
  phone: string;
  profileImage: string;
}

export interface AppSettings {
  notifications: {
    criticalAlerts: boolean;
    newPatients: boolean;
    aiSummaries: boolean;
  };
  offlineMode: boolean;
  language: 'en' | 'hi' | 'bn' | 'es' | 'fr';
  multilingualExplanations: boolean;
  twoFactorAuth: boolean;
  sessionTimeout: boolean;
  auditLogging: boolean;
  compactVitals: boolean;
  showTrends: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  doctorName: string;
}

// ──────────────────────────────────────────────────────────
// State interface
// ──────────────────────────────────────────────────────────

interface AppState {
  // Patients
  patients: Patient[];
  selectedPatientId: string | null;
  selectPatient: (id: string) => void;
  addPatient: (patient: Patient) => void;
  addPatients: (patients: Patient[]) => void;
  updatePatientNotes: (id: string, notes: Partial<Patient['notes']>) => void;
  updatePatientVitals: (id: string, vitals: Patient['vitals']) => void;

  // Alerts (CSV-imported)
  alerts: Alert[];
  addAlerts: (alerts: Alert[]) => void;

  // Import toast
  importToast: string | null;
  setImportToast: (msg: string | null) => void;

  // Hospital
  hospitals: Hospital[];
  activeHospitalId: string;
  setActiveHospital: (id: string) => void;

  // Doctor Profile
  doctorProfile: DoctorProfile;
  updateDoctorProfile: (updates: Partial<DoctorProfile>) => void;
  syncProfileFromAuth: (user: { name: string; email: string; specialty: string }) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  updateNotificationSettings: (updates: Partial<AppSettings['notifications']>) => void;

  // Audit Log
  auditLog: AuditEntry[];
  addAuditEntry: (action: string, details: string) => void;
}

// ──────────────────────────────────────────────────────────
// Mock data
// ──────────────────────────────────────────────────────────

const generateHistory = (base: number, variance: number) => {
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    value: base + (Math.random() * variance * 2 - variance),
  }));
};

const mockHospitals: Hospital[] = [
  {
    id: 'H001',
    name: 'UrbanCare Medical Center',
    location: 'Metro Healthcare Campus, Block A',
    department: 'Cardiology',
    status: 'Active',
    compliance: ['HIPAA', 'HL7 FHIR'],
    support: 'support@urbancare.com',
  },
  {
    id: 'H002',
    name: 'City General Hospital',
    location: 'Downtown Medical District, Tower B',
    department: 'Neurology',
    status: 'Active',
    compliance: ['HIPAA', 'NABH'],
    support: 'admin@citygeneral.com',
  },
  {
    id: 'H003',
    name: 'Green Valley Clinic',
    location: 'Suburban Health Park, Unit 5',
    department: 'General Medicine',
    status: 'Active',
    compliance: ['HIPAA'],
    support: 'info@greenvalley.com',
  },
];

const mockPatients: Patient[] = [
  {
    id: 'P001',
    name: 'John Doe',
    age: 45,
    gender: 'Male',
    condition: 'Hypertension',
    riskLevel: 'Stable',
    lastUpdated: 'Just now',
    hospitalId: 'H001',
    vitals: {
      heartRate: {
        name: 'Heart Rate',
        value: 82,
        unit: 'BPM',
        trend: 2.5,
        status: 'stable',
        history: generateHistory(80, 5),
      },
      bloodPressure: {
        sys: 138,
        dia: 88,
        status: 'warning',
        trend: 15,
      },
      spO2: {
        name: 'SpO2',
        value: 96,
        unit: '%',
        trend: -2.0,
        status: 'stable',
        history: generateHistory(97, 2),
      },
      temperature: {
        name: 'Temperature',
        value: 98.8,
        unit: '°F',
        trend: -1.4,
        status: 'stable',
        history: generateHistory(98.6, 0.5),
      },
      respiration: {
        name: 'Respiration',
        value: 18,
        unit: '/min',
        trend: 12.5,
        status: 'warning',
        history: generateHistory(16, 4),
      },
    },
    notes: {
      soap: '',
      hpi: '',
      assessment: '',
      plan: '',
    },
  },
  {
    id: 'P002',
    name: 'Jane Smith',
    age: 29,
    gender: 'Female',
    condition: 'Post-op Recovery',
    riskLevel: 'Stable',
    lastUpdated: '5 min ago',
    hospitalId: 'H001',
    vitals: {
      heartRate: {
        name: 'Heart Rate',
        value: 72,
        unit: 'BPM',
        trend: -1.2,
        status: 'stable',
        history: generateHistory(75, 3),
      },
      bloodPressure: {
        sys: 118,
        dia: 76,
        status: 'stable',
        trend: -2,
      },
      spO2: {
        name: 'SpO2',
        value: 99,
        unit: '%',
        trend: 0.5,
        status: 'stable',
        history: generateHistory(98, 1),
      },
      temperature: {
        name: 'Temperature',
        value: 98.4,
        unit: '°F',
        trend: 0.1,
        status: 'stable',
        history: generateHistory(98.4, 0.2),
      },
      respiration: {
        name: 'Respiration',
        value: 16,
        unit: '/min',
        trend: 0,
        status: 'stable',
        history: generateHistory(16, 1),
      },
    },
    notes: {
      soap: '',
      hpi: '',
      assessment: '',
      plan: '',
    },
  },
  {
    id: 'P003',
    name: 'Robert Brown',
    age: 61,
    gender: 'Male',
    condition: 'COPD Exacerbation',
    riskLevel: 'Critical',
    lastUpdated: '1 min ago',
    hospitalId: 'H002',
    vitals: {
      heartRate: {
        name: 'Heart Rate',
        value: 104,
        unit: 'BPM',
        trend: 12.5,
        status: 'critical',
        history: generateHistory(100, 10),
      },
      bloodPressure: {
        sys: 155,
        dia: 95,
        status: 'critical',
        trend: 8,
      },
      spO2: {
        name: 'SpO2',
        value: 88,
        unit: '%',
        trend: -5.0,
        status: 'critical',
        history: generateHistory(90, 3),
      },
      temperature: {
        name: 'Temperature',
        value: 101.2,
        unit: '°F',
        trend: 2.4,
        status: 'warning',
        history: generateHistory(100, 1),
      },
      respiration: {
        name: 'Respiration',
        value: 28,
        unit: '/min',
        trend: 25.0,
        status: 'critical',
        history: generateHistory(24, 6),
      },
    },
    notes: {
      soap: '',
      hpi: '',
      assessment: '',
      plan: '',
    },
  },
];

const defaultDoctorProfile: DoctorProfile = {
  name: 'Dr. Ayesha Smith',
  specialization: 'Cardiology',
  hospital: 'UrbanCare Medical Center',
  licenseNumber: 'MCI-2024-78432',
  phone: '+91 98765 43210',
  profileImage: '',
};

const defaultSettings: AppSettings = {
  notifications: {
    criticalAlerts: true,
    newPatients: true,
    aiSummaries: false,
  },
  offlineMode: false,
  language: 'en',
  multilingualExplanations: false,
  twoFactorAuth: false,
  sessionTimeout: true,
  auditLogging: true,
  compactVitals: false,
  showTrends: true,
};

const initialAuditLog: AuditEntry[] = [
  {
    id: 'AUD001',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    action: 'Login',
    details: 'Doctor logged in via email authentication',
    doctorName: 'Dr. Ayesha Smith',
  },
  {
    id: 'AUD002',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    action: 'View Patient',
    details: 'Accessed patient record: John Doe (P001)',
    doctorName: 'Dr. Ayesha Smith',
  },
];

// ──────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────

let auditCounter = 3;

export const useStore = create<AppState>((set, get) => ({
  // ── Patients ──
  patients: mockPatients,
  selectedPatientId: 'P001',
  selectPatient: (id) => {
    set({ selectedPatientId: id });
    const p = get().patients.find((pt) => pt.id === id);
    if (p) {
      get().addAuditEntry('View Patient', `Accessed patient record: ${p.name} (${p.id})`);
    }
  },
  addPatient: (patient) =>
    set((state) => ({
      patients: [
        ...state.patients,
        { ...patient, hospitalId: patient.hospitalId || state.activeHospitalId },
      ],
    })),
  addPatients: (newPatients) =>
    set((state) => ({
      patients: [
        ...state.patients,
        ...newPatients.map((p) => ({ ...p, hospitalId: p.hospitalId || state.activeHospitalId })),
      ],
    })),
  updatePatientNotes: (id, notes) =>
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === id ? { ...p, notes: { ...p.notes, ...notes } } : p
      ),
    })),
  updatePatientVitals: (id, vitals) =>
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === id ? { ...p, vitals, lastUpdated: 'Just now' } : p
      ),
    })),

  // ── Alerts ──
  alerts: [],
  addAlerts: (newAlerts) =>
    set((state) => ({ alerts: [...state.alerts, ...newAlerts] })),

  // ── Import Toast ──
  importToast: null,
  setImportToast: (msg) => set({ importToast: msg }),

  // ── Hospitals ──
  hospitals: mockHospitals,
  activeHospitalId: 'H001',
  setActiveHospital: (id) => {
    const hospital = get().hospitals.find((h) => h.id === id);
    set({ activeHospitalId: id });
    if (hospital) {
      get().addAuditEntry('Switch Hospital', `Switched to ${hospital.name}`);
    }
  },

  // ── Doctor Profile ──
  doctorProfile: defaultDoctorProfile,
  updateDoctorProfile: (updates) => {
    set((state) => ({
      doctorProfile: { ...state.doctorProfile, ...updates },
    }));
    get().addAuditEntry('Update Profile', `Updated profile fields: ${Object.keys(updates).join(', ')}`);
  },
  syncProfileFromAuth: (user) => {
    set((state) => ({
      doctorProfile: {
        ...state.doctorProfile,
        name: user.name || state.doctorProfile.name,
        specialization: user.specialty || state.doctorProfile.specialization,
      },
    }));
  },

  // ── Settings ──
  settings: defaultSettings,
  updateSettings: (updates) => {
    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));
    get().addAuditEntry('Update Settings', `Changed settings: ${Object.keys(updates).join(', ')}`);
  },
  updateNotificationSettings: (updates) =>
    set((state) => ({
      settings: {
        ...state.settings,
        notifications: { ...state.settings.notifications, ...updates },
      },
    })),

  // ── Audit Log ──
  auditLog: initialAuditLog,
  addAuditEntry: (action, details) =>
    set((state) => ({
      auditLog: [
        {
          id: `AUD${String(auditCounter++).padStart(3, '0')}`,
          timestamp: new Date().toISOString(),
          action,
          details,
          doctorName: state.doctorProfile.name,
        },
        ...state.auditLog,
      ],
    })),
}));
