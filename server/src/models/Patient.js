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
  const patient = {
    id: `P${String(counter++).padStart(3, '0')}`,
    hospitalID: data.hospitalID,
    name: data.name,
    age: data.age,
    gender: data.gender,
    patientType: data.patientType || 'private',
    admissionStatus: data.admissionStatus || 'not_admitted',
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
