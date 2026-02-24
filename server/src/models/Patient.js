// ──────────────────────────────────────────────────────────
// Patient Model — In-Memory Store
// ──────────────────────────────────────────────────────────

const patients = [
  {
    id: 'P001',
    hospitalID: 'H001',
    name: 'John Doe',
    age: 45,
    gender: 'Male',
    patientType: 'admitted',       // private | admitted
    admissionStatus: 'admitted',   // not_admitted | admitted | discharged
    monitoringEnabled: true,
    heartRate: 82,
    spo2: 96,
    temperature: 98.8,
    respiration: 18,
    primaryCondition: 'Hypertension',
    riskLevel: 'Stable',
    doctorID: 'U001',
    createdAt: new Date('2024-09-01').toISOString(),
  },
  {
    id: 'P002',
    hospitalID: 'H001',
    name: 'Jane Smith',
    age: 29,
    gender: 'Female',
    patientType: 'private',
    admissionStatus: 'not_admitted',
    monitoringEnabled: false,
    heartRate: null,
    spo2: null,
    temperature: null,
    respiration: null,
    primaryCondition: 'Post-op Recovery',
    riskLevel: 'Stable',
    doctorID: 'U001',
    createdAt: new Date('2024-10-15').toISOString(),
  },
  {
    id: 'P003',
    hospitalID: 'H002',
    name: 'Robert Brown',
    age: 61,
    gender: 'Male',
    patientType: 'admitted',
    admissionStatus: 'admitted',
    monitoringEnabled: true,
    heartRate: 104,
    spo2: 88,
    temperature: 101.2,
    respiration: 28,
    primaryCondition: 'COPD Exacerbation',
    riskLevel: 'Critical',
    doctorID: 'U002',
    createdAt: new Date('2024-11-20').toISOString(),
  },
];

let counter = patients.length + 1;

function findById(id) {
  return patients.find((p) => p.id === id) || null;
}

function findByHospitalID(hospitalID) {
  return patients.filter((p) => p.hospitalID === hospitalID);
}

function findByDoctorID(doctorID) {
  return patients.filter((p) => p.doctorID === doctorID);
}

function create(data) {
  const isAdmitted = data.admissionStatus === 'admitted';
  const patient = {
    id: `P${String(counter++).padStart(3, '0')}`,
    hospitalID: data.hospitalID,
    name: data.name,
    age: data.age,
    gender: data.gender,
    patientType: data.patientType || 'private',
    admissionStatus: data.admissionStatus || 'not_admitted',
    monitoringEnabled: isAdmitted,
    heartRate: isAdmitted ? (data.heartRate || null) : null,
    spo2: isAdmitted ? (data.spo2 || null) : null,
    temperature: isAdmitted ? (data.temperature || null) : null,
    respiration: isAdmitted ? (data.respiration || null) : null,
    primaryCondition: data.primaryCondition || '',
    riskLevel: data.riskLevel || 'Stable',
    doctorID: data.doctorID,
    createdAt: new Date().toISOString(),
  };
  patients.push(patient);
  return patient;
}

function update(id, updates) {
  const idx = patients.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  patients[idx] = { ...patients[idx], ...updates };
  return patients[idx];
}

module.exports = { patients, findById, findByHospitalID, findByDoctorID, create, update };
