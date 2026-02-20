import { create } from 'zustand';

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

interface AppState {
  patients: Patient[];
  selectedPatientId: string | null;
  selectPatient: (id: string) => void;
  addPatient: (patient: Patient) => void;
  addPatients: (patients: Patient[]) => void;
  updatePatientNotes: (id: string, notes: Partial<Patient['notes']>) => void;
}

const generateHistory = (base: number, variance: number) => {
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    value: base + (Math.random() * variance * 2 - variance),
  }));
};

const mockPatients: Patient[] = [
  {
    id: 'P001',
    name: 'John Doe',
    age: 45,
    gender: 'Male',
    condition: 'Hypertension',
    riskLevel: 'Stable',
    lastUpdated: 'Just now',
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
        value: 98.8, // Fahrenheit
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

export const useStore = create<AppState>((set) => ({
  patients: mockPatients,
  selectedPatientId: 'P001',
  selectPatient: (id) => set({ selectedPatientId: id }),
  addPatient: (patient) => set((state) => ({ patients: [...state.patients, patient] })),
  addPatients: (newPatients) => set((state) => ({ patients: [...state.patients, ...newPatients] })),
  updatePatientNotes: (id, notes) =>
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === id ? { ...p, notes: { ...p.notes, ...notes } } : p
      ),
    })),
}));
