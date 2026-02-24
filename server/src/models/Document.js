// ──────────────────────────────────────────────────────────
// Document Model — In-Memory Store (Extended with File Upload)
// ──────────────────────────────────────────────────────────

const VALID_TYPES = ['xray', 'lab_report', 'pharmacy_bill', 'previous_doctor_report', 'mri', 'ct'];

// Role → allowed upload types mapping
const ROLE_UPLOAD_PERMISSIONS = {
  doctor: VALID_TYPES,                        // can upload all
  admin: VALID_TYPES,                         // can upload all
  lab: ['lab_report'],                        // lab reports only
  pharmacist: ['pharmacy_bill'],              // pharmacy bills only
  family: [],                                 // read-only, no uploads
};

let counter = 3;

const documents = [
  {
    id: 'D001',
    patientID: 'P001',
    hospitalID: 'H001',
    type: 'lab_report',
    fileURL: '/uploads/P001_blood_panel.pdf',
    filePath: '',
    originalName: 'P001_blood_panel.pdf',
    fileType: 'pdf',
    fileSize: 245000,
    uploadedByUserID: 'U001',
    uploaderRole: 'doctor',
    title: 'Complete Blood Panel',
    notes: 'Routine CBC + metabolic panel. All values within normal range.',
    status: 'complete',
    extractedData: {
      category: 'lab_report',
      labs: [
        { test: 'Hemoglobin', value: '14.2', unit: 'g/dL', referenceRange: '12.0-16.0', status: 'normal' },
        { test: 'WBC', value: '7800', unit: '/μL', referenceRange: '4000-11000', status: 'normal' },
        { test: 'Platelets', value: '265000', unit: '/μL', referenceRange: '150000-400000', status: 'normal' },
      ],
    },
    createdAt: new Date('2024-12-01').toISOString(),
  },
  {
    id: 'D002',
    patientID: 'P003',
    hospitalID: 'H002',
    type: 'xray',
    fileURL: '/uploads/P003_chest_xray.png',
    filePath: '',
    originalName: 'P003_chest_xray.png',
    fileType: 'png',
    fileSize: 1850000,
    uploadedByUserID: 'U002',
    uploaderRole: 'doctor',
    title: 'Chest X-Ray PA View',
    notes: 'Mild hyperinflation consistent with COPD. No acute infiltrate.',
    status: 'complete',
    extractedData: {
      category: 'radiology_report',
      findings: 'Mild hyperinflation consistent with COPD. No acute infiltrate.',
    },
    createdAt: new Date('2024-12-10').toISOString(),
  },
];

function getByPatientID(patientID) {
  return documents.filter((d) => d.patientID === patientID);
}

function getByPatientAndHospital(patientID, hospitalID) {
  return documents.filter((d) => d.patientID === patientID && d.hospitalID === hospitalID);
}

function getById(id) {
  return documents.find((d) => d.id === id) || null;
}

function create(data) {
  if (!VALID_TYPES.includes(data.type)) {
    throw new Error(`Invalid document type. Must be one of: ${VALID_TYPES.join(', ')}`);
  }

  // Enforce role-based type restrictions
  const allowedTypes = ROLE_UPLOAD_PERMISSIONS[data.uploaderRole] || [];
  if (allowedTypes.length === 0) {
    throw new Error('Your role does not have permission to upload documents.');
  }
  if (!allowedTypes.includes(data.type)) {
    throw new Error(
      `Role "${data.uploaderRole}" can only upload: ${allowedTypes.join(', ')}. Cannot upload type "${data.type}".`
    );
  }

  const doc = {
    id: `D${String(counter++).padStart(3, '0')}`,
    patientID: data.patientID,
    hospitalID: data.hospitalID,
    type: data.type,
    fileURL: data.fileURL || '',
    filePath: data.filePath || '',
    originalName: data.originalName || '',
    fileType: data.fileType || '',
    fileSize: data.fileSize || 0,
    uploadedByUserID: data.uploadedByUserID,
    uploaderRole: data.uploaderRole,
    title: data.title || '',
    notes: data.notes || '',
    status: data.status || 'processing',
    extractedData: data.extractedData || null,
    createdAt: new Date().toISOString(),
  };
  documents.push(doc);
  return doc;
}

function updateStatus(id, status, extractedData) {
  const doc = documents.find((d) => d.id === id);
  if (!doc) return null;
  doc.status = status;
  if (extractedData) doc.extractedData = extractedData;
  return doc;
}

module.exports = {
  documents,
  getByPatientID,
  getByPatientAndHospital,
  getById,
  create,
  updateStatus,
  VALID_TYPES,
  ROLE_UPLOAD_PERMISSIONS,
};
