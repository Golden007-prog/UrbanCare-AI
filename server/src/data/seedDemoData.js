// ──────────────────────────────────────────────────────────
// Seed Demo Data — Full Hospital Ecosystem
// Runs on server startup to populate in-memory + AlloyDB
// ──────────────────────────────────────────────────────────

const { logExecution } = require('../models/AgentStatus');
const { addLog } = require('../models/SystemLog');
const PatientModel = require('../models/Patient');
const DocumentModel = require('../models/Document');

// ── Agent Demo Data ───────────────────────────────────────

const AGENT_NAMES = [
  'ReportPageClassifier', 'MedicalImageConfirmAgent', 'PatientTypeClassifier',
  'TabularLabExtractor', 'LabDeviationAnalyzer', 'DetailedReportSummary',
  'PatientDoctorInfoExtractor', 'PatientHistoryExtractor', 'MedicationExtractor',
  'PharmacyBillExtractor', 'DifferentialDiagnosisAgent', 'SOAPGeneratorAgent',
  'ReferralGenerator', 'ClinicalRiskPredictor', 'TreatmentGuidelineAgent',
  'XRayAnalyzer', 'YOLORegionDetector', 'ImageCaptionAgent', 'ImageComparisonAgent',
  'SmartIntakeAgent', 'FamilyDashboardAgent', 'AdmissionStatusAgent', 'TimelineBuilderAgent',
  'RealTimeVitalsMonitor', 'AlertGenerator', 'RiskEscalationAgent',
  'DoctorCopilotAgent', 'VoiceIntakeAgent',
  'JSONCleanupAgent', 'DataValidatorAgent',
];

// ── In-Memory Demo Beds ───────────────────────────────────

const demoBeds = [];

// ── In-Memory Demo Patient Profiles ───────────────────────

const demoPatientProfiles = [];

// ── In-Memory Demo Lab Reports ────────────────────────────

const demoLabReports = [];

// ── In-Memory Demo Pharmacy Bills ─────────────────────────

const demoPharmacyBills = [];

// ── In-Memory Demo Patient Documents ──────────────────────

const demoPatientDocuments = [];

// ──────────────────────────────────────────────────────────
// Main Seed Function
// ──────────────────────────────────────────────────────────

function seedDemoData() {
  console.log('\n📦 Seeding full demo hospital ecosystem...\n');

  seedAgentStatuses();
  seedAuditLogs();
  seedBeds();
  seedPatientProfiles();
  seedPatientDocuments();
  seedLabReports();
  seedPharmacyBills();
  seedDemoReports();

  console.log('  ────────────────────────────────────────');
  console.log('  📋 Demo Login Credentials:');
  console.log('  ────────────────────────────────────────');
  console.log('  🩺 Doctor:      dr.smith@urbancare.com / password123');
  console.log('  🧑 Patient:     john.doe@urbancare.com / patient123');
  console.log('  🧑 Patient:     jane.smith@urbancare.com / patient123');
  console.log('  🧪 Lab:         priya.lab@urbancare.com / lab123');
  console.log('  💊 Pharmacy:    neha.pharma@urbancare.com / pharma123');
  console.log('  🏥 Admin:       admin@urbancare.com / admin123');
  console.log('  🌐 SuperAdmin:  super@urbancare.com / super123');
  console.log('  ────────────────────────────────────────\n');
}

// ── Seed Agent Statuses ───────────────────────────────────

function seedAgentStatuses() {
  const hospitalIds = ['H001', 'H002', 'H999'];

  for (const hospitalId of hospitalIds) {
    AGENT_NAMES.forEach((name, idx) => {
      let status = 'active';
      let error = null;
      if (idx % 7 === 5) { status = 'idle'; }
      if (idx % 11 === 10) { status = 'failed'; error = 'Timeout — model inference exceeded 30s limit'; }
      if (idx === 16 && hospitalId === 'H999') { status = 'failed'; error = 'HuggingFace API returned 503'; }

      logExecution({
        hospitalId,
        agentName: name,
        status,
        error_message: error,
        latency_ms: Math.floor(Math.random() * 800) + 50,
      });
    });
  }
  console.log(`  ✅ Seeded ${hospitalIds.length * AGENT_NAMES.length} agent status entries`);
}

// ── Seed Audit Logs ───────────────────────────────────────

function seedAuditLogs() {
  const sampleLogs = [
    { hospitalId: 'H001', eventType: 'PATIENT_ACCESS', message: 'Dr. Ayesha Smith viewed patient John Doe chart', userId: 'U001', patientId: 'P001' },
    { hospitalId: 'H001', eventType: 'SOAP_GENERATED', message: 'SOAP note generated for Jane Smith', userId: 'U001', patientId: 'P002' },
    { hospitalId: 'H001', eventType: 'REPORT_UPLOADED', message: 'X-ray report uploaded for John Doe', userId: 'U001', patientId: 'P001' },
    { hospitalId: 'H001', eventType: 'LAB_REPORT_ADDED', message: 'CBC results uploaded by Lab Tech Priya', userId: 'U006', patientId: 'P001' },
    { hospitalId: 'H001', eventType: 'PHARMACY_BILL', message: 'Medication dispensed for Jane Smith by Pharmacist Neha', userId: 'U008', patientId: 'P002' },
    { hospitalId: 'H001', eventType: 'BED_ASSIGNED', message: 'Bed A101 assigned to John Doe (Cardiology)', userId: 'U012', patientId: 'P001' },
    { hospitalId: 'H001', eventType: 'SETTINGS_UPDATE', message: 'Hospital settings updated by Admin Director Singh', userId: 'U012' },
    { hospitalId: 'H001', eventType: 'AGENT_RESTART', message: 'Agent YOLORegionDetector restarted by admin', userId: 'U012' },
    { hospitalId: 'H002', eventType: 'PATIENT_ACCESS', message: 'Dr. James Patel viewed patient Robert Brown chart', userId: 'U002', patientId: 'P003' },
    { hospitalId: 'H002', eventType: 'SOAP_GENERATED', message: 'SOAP note generated for Robert Brown', userId: 'U002', patientId: 'P003' },
    { hospitalId: 'H999', eventType: 'PATIENT_ACCESS', message: 'Dr. Demo accessed patient P-DEMO-001 records', userId: 'U011', patientId: 'P-DEMO-001' },
    { hospitalId: 'H999', eventType: 'SETTINGS_UPDATE', message: 'Hospital settings updated by Admin', userId: 'U010' },
  ];

  sampleLogs.forEach((log) => addLog(log));
  console.log(`  ✅ Seeded ${sampleLogs.length} audit log entries`);
}

// ── Seed Beds (all 3 hospitals) ───────────────────────────

function seedBeds() {
  const bedData = [
    // Hospital H001 — UrbanCare Medical Center
    { id: 'BED-H001-001', hospital_id: 'H001', bed_number: 'A101', ward: 'Cardiology', occupied: true, patient_profile_id: 'PP-001' },
    { id: 'BED-H001-002', hospital_id: 'H001', bed_number: 'A102', ward: 'Cardiology', occupied: false, patient_profile_id: null },
    { id: 'BED-H001-003', hospital_id: 'H001', bed_number: 'B201', ward: 'Orthopedics', occupied: true, patient_profile_id: 'PP-002' },
    { id: 'BED-H001-004', hospital_id: 'H001', bed_number: 'B202', ward: 'Orthopedics', occupied: false, patient_profile_id: null },
    { id: 'BED-H001-005', hospital_id: 'H001', bed_number: 'C301', ward: 'General', occupied: false, patient_profile_id: null },
    { id: 'BED-H001-006', hospital_id: 'H001', bed_number: 'C302', ward: 'General', occupied: false, patient_profile_id: null },
    { id: 'BED-H001-007', hospital_id: 'H001', bed_number: 'D401', ward: 'ICU', occupied: false, patient_profile_id: null },
    { id: 'BED-H001-008', hospital_id: 'H001', bed_number: 'D402', ward: 'ICU', occupied: false, patient_profile_id: null },
    // Hospital H002 — City General Hospital
    { id: 'BED-H002-001', hospital_id: 'H002', bed_number: 'A101', ward: 'General', occupied: false, patient_profile_id: null },
    { id: 'BED-H002-002', hospital_id: 'H002', bed_number: 'B201', ward: 'ICU', occupied: true, patient_profile_id: 'PP-003' },
    { id: 'BED-H002-003', hospital_id: 'H002', bed_number: 'B202', ward: 'ICU', occupied: false, patient_profile_id: null },
    { id: 'BED-H002-004', hospital_id: 'H002', bed_number: 'C301', ward: 'Neurology', occupied: false, patient_profile_id: null },
    // Hospital H003 — Green Valley Clinic (from patientIntake.js)
    { id: 'BED-H003-001', hospital_id: 'H003', bed_number: 'A101', ward: 'General', occupied: true, patient_profile_id: 'PP-004' },
    { id: 'BED-H003-002', hospital_id: 'H003', bed_number: 'A102', ward: 'General', occupied: false, patient_profile_id: null },
  ];

  bedData.forEach((bed) => demoBeds.push(bed));
  console.log(`  ✅ Seeded ${bedData.length} beds across 3 hospitals`);
}

// ── Seed Patient Profiles (linked to user accounts) ──────

function seedPatientProfiles() {
  const profileData = [
    { id: 'PP-001', user_id: 'U013', hospital_id: 'H001', bed_id: 'BED-H001-001', age: 45, gender: 'Male', condition: 'Hypertension', onboarded: true },
    { id: 'PP-002', user_id: 'U014', hospital_id: 'H001', bed_id: 'BED-H001-003', age: 29, gender: 'Female', condition: 'Fractured wrist', onboarded: true },
    { id: 'PP-003', user_id: 'U015', hospital_id: 'H002', bed_id: 'BED-H002-002', age: 60, gender: 'Male', condition: 'Pneumonia', onboarded: true },
    { id: 'PP-004', user_id: 'U016', hospital_id: 'H003', bed_id: 'BED-H003-001', age: 34, gender: 'Female', condition: 'Diabetes Type 2', onboarded: true },
  ];

  profileData.forEach((p) => {
    p.created_at = new Date().toISOString();
    p.hospital_name = p.hospital_id === 'H001' ? 'UrbanCare Medical Center' :
                      p.hospital_id === 'H002' ? 'City General Hospital' : 'Green Valley Clinic';
    const bed = demoBeds.find((b) => b.id === p.bed_id);
    if (bed) {
      p.bed_number = bed.bed_number;
      p.ward = bed.ward;
    }
    demoPatientProfiles.push(p);
  });

  console.log(`  ✅ Seeded ${profileData.length} patient profiles`);
}

// ── Seed Patient Documents ────────────────────────────────

function seedPatientDocuments() {
  const docs = [
    { id: 'PD-001', patient_profile_id: 'PP-001', type: 'doctor_report', file_url: '/uploads/demo/john-doe-cardio-report.pdf', original_name: 'Cardiology-Consult-Report.pdf', status: 'complete', uploaded_by: 'U001', uploader_role: 'doctor', ai_summary: { summary: 'Patient presents with essential hypertension (I10). BP readings consistently elevated at 150/95 mmHg. Started on Lisinopril 10mg daily.', diagnosis: 'Essential Hypertension (Stage 2)', medications: ['Lisinopril 10mg', 'Aspirin 81mg'], risks: ['Cardiovascular event risk', 'Kidney function monitoring needed'], recommendations: 'Follow-up in 4 weeks, repeat BP monitoring' } },
    { id: 'PD-002', patient_profile_id: 'PP-001', type: 'lab_report', file_url: '/uploads/demo/john-doe-cbc.pdf', original_name: 'Complete-Blood-Count.pdf', status: 'complete', uploaded_by: 'U006', uploader_role: 'lab', ai_summary: { summary: 'CBC within normal limits. Hemoglobin 14.2 g/dL, WBC 7,800/μL, Platelets 245,000/μL.', diagnosis: 'Normal CBC results', medications: [], risks: [], test_results: [{ test: 'Hemoglobin', value: '14.2 g/dL', status: 'normal' }, { test: 'WBC', value: '7,800/μL', status: 'normal' }, { test: 'Platelets', value: '245,000/μL', status: 'normal' }], recommendations: 'No action required' } },
    { id: 'PD-003', patient_profile_id: 'PP-001', type: 'pharmacy_bill', file_url: '/uploads/demo/john-doe-pharmacy.pdf', original_name: 'Pharmacy-Receipt-Jan.pdf', status: 'complete', uploaded_by: 'U008', uploader_role: 'pharmacist', ai_summary: { summary: 'Medication purchase: Lisinopril 10mg (30 tablets) and Aspirin 81mg (60 tablets). Total: ₹450.', medications: ['Lisinopril 10mg x30', 'Aspirin 81mg x60'], diagnosis: '', risks: [], recommendations: 'Ensure medication adherence' } },
    { id: 'PD-004', patient_profile_id: 'PP-002', type: 'doctor_report', file_url: '/uploads/demo/jane-smith-ortho.pdf', original_name: 'Orthopedic-Evaluation.pdf', status: 'complete', uploaded_by: 'U001', uploader_role: 'doctor', ai_summary: { summary: 'X-ray confirms hairline fracture of the 3rd metacarpal (right hand). Cast applied. Prognosis good — expected healing in 4-6 weeks.', diagnosis: 'Hairline fracture, 3rd metacarpal (right)', medications: ['Ibuprofen 400mg PRN', 'Calcium + Vitamin D supplement'], risks: ['Improper healing if cast removed early'], recommendations: 'Follow-up X-ray in 3 weeks, avoid heavy lifting' } },
    { id: 'PD-005', patient_profile_id: 'PP-003', type: 'doctor_report', file_url: '/uploads/demo/michael-pulmo.pdf', original_name: 'Pulmonology-Report.pdf', status: 'complete', uploaded_by: 'U002', uploader_role: 'doctor', ai_summary: { summary: 'Chest X-ray shows bilateral opacity consistent with community-acquired pneumonia. Started on IV antibiotics.', diagnosis: 'Community-acquired pneumonia (J18.9)', medications: ['Azithromycin 500mg IV', 'Ceftriaxone 1g IV', 'Paracetamol 500mg PRN'], risks: ['Respiratory failure', 'Sepsis if not responding to antibiotics'], recommendations: 'Monitor O2 saturation, repeat chest X-ray in 48h' } },
    { id: 'PD-006', patient_profile_id: 'PP-004', type: 'lab_report', file_url: '/uploads/demo/sara-hba1c.pdf', original_name: 'HbA1c-Report.pdf', status: 'complete', uploaded_by: 'U007', uploader_role: 'lab', ai_summary: { summary: 'HbA1c level at 8.2% — indicates poorly controlled diabetes. Fasting glucose 186 mg/dL.', diagnosis: 'Poorly controlled Type 2 Diabetes Mellitus', medications: [], risks: ['Diabetic nephropathy', 'Retinopathy screening needed', 'Neuropathy risk'], test_results: [{ test: 'HbA1c', value: '8.2%', status: 'abnormal' }, { test: 'Fasting Glucose', value: '186 mg/dL', status: 'abnormal' }], recommendations: 'Adjust insulin dosage, dietitian referral, recheck in 3 months' } },
  ];

  docs.forEach((doc) => {
    doc.created_at = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
    doc.extracted_text = `Extracted from: ${doc.original_name}`;
    demoPatientDocuments.push(doc);
  });

  console.log(`  ✅ Seeded ${docs.length} patient documents with AI summaries`);
}

// ── Seed Lab Reports ──────────────────────────────────────

function seedLabReports() {
  const labs = [
    { id: 'LR-001', patient_id: 'P001', hospital_id: 'H001', lab_user_id: 'U006', test_name: 'Complete Blood Count', status: 'complete', result_data: { hemoglobin: '14.2 g/dL', wbc: '7,800/μL', platelets: '245,000/μL', rbc: '4.8 M/μL' } },
    { id: 'LR-002', patient_id: 'P001', hospital_id: 'H001', lab_user_id: 'U006', test_name: 'Lipid Panel', status: 'complete', result_data: { totalCholesterol: '220 mg/dL', ldl: '140 mg/dL', hdl: '45 mg/dL', triglycerides: '175 mg/dL' } },
    { id: 'LR-003', patient_id: 'P002', hospital_id: 'H001', lab_user_id: 'U006', test_name: 'X-Ray Right Hand', status: 'complete', result_data: { findings: 'Hairline fracture 3rd metacarpal', severity: 'Mild', radiologist: 'Dr. Imaging' } },
    { id: 'LR-004', patient_id: 'P003', hospital_id: 'H002', lab_user_id: 'U007', test_name: 'Chest X-Ray', status: 'complete', result_data: { findings: 'Bilateral opacity — lower lobes', impression: 'Community-acquired pneumonia' } },
    { id: 'LR-005', patient_id: 'P003', hospital_id: 'H002', lab_user_id: 'U007', test_name: 'Blood Culture', status: 'pending', result_data: null },
    { id: 'LR-006', patient_id: 'PP-004', hospital_id: 'H003', lab_user_id: 'U007', test_name: 'HbA1c', status: 'complete', result_data: { hba1c: '8.2%', fasting_glucose: '186 mg/dL', post_prandial: '245 mg/dL' } },
  ];

  labs.forEach((lab) => {
    lab.created_at = new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString();
    lab.report_url = `/uploads/demo/${lab.test_name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    demoLabReports.push(lab);
  });

  console.log(`  ✅ Seeded ${labs.length} lab reports`);
}

// ── Seed Pharmacy Bills ───────────────────────────────────

function seedPharmacyBills() {
  const bills = [
    { id: 'PB-001', patient_id: 'P001', hospital_id: 'H001', pharmacist_user_id: 'U008', total_amount: 450, status: 'paid', medications: [{ name: 'Lisinopril 10mg', qty: 30, price: 250 }, { name: 'Aspirin 81mg', qty: 60, price: 200 }] },
    { id: 'PB-002', patient_id: 'P002', hospital_id: 'H001', pharmacist_user_id: 'U008', total_amount: 650, status: 'paid', medications: [{ name: 'Ibuprofen 400mg', qty: 20, price: 150 }, { name: 'Calcium + Vit D', qty: 30, price: 350 }, { name: 'Crepe Bandage', qty: 2, price: 150 }] },
    { id: 'PB-003', patient_id: 'P003', hospital_id: 'H002', pharmacist_user_id: 'U009', total_amount: 2800, status: 'unpaid', medications: [{ name: 'Azithromycin 500mg IV', qty: 5, price: 1500 }, { name: 'Ceftriaxone 1g IV', qty: 5, price: 1000 }, { name: 'Paracetamol 500mg', qty: 20, price: 300 }] },
    { id: 'PB-004', patient_id: 'PP-004', hospital_id: 'H003', pharmacist_user_id: 'U009', total_amount: 1200, status: 'paid', medications: [{ name: 'Metformin 500mg', qty: 60, price: 400 }, { name: 'Glimepiride 2mg', qty: 30, price: 350 }, { name: 'Insulin Glargine', qty: 1, price: 450 }] },
  ];

  bills.forEach((bill) => {
    bill.created_at = new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString();
    bill.bill_url = `/uploads/demo/pharmacy-bill-${bill.id.toLowerCase()}.pdf`;
    demoPharmacyBills.push(bill);
  });

  console.log(`  ✅ Seeded ${bills.length} pharmacy bills`);
}

// ── Seed Demo Reports (in-memory Document model) ─────────

function seedDemoReports() {
  try {
    const demoDocuments = [
      { patientID: 'P001', hospitalID: 'H001', type: 'doctor_report', title: 'Cardiology Consultation — BP Assessment', uploaderRole: 'doctor', uploadedByUserID: 'U001', extractedData: { category: 'doctor_report', summary: 'Essential hypertension Stage 2. Started Lisinopril 10mg.' } },
      { patientID: 'P001', hospitalID: 'H001', type: 'lab_report', title: 'Complete Blood Count — Normal', uploaderRole: 'lab', uploadedByUserID: 'U006', extractedData: { category: 'lab_report', summary: 'All values within normal limits.', labs: [{ test: 'Hemoglobin', value: '14.2', unit: 'g/dL', status: 'normal' }] } },
      { patientID: 'P002', hospitalID: 'H001', type: 'doctor_report', title: 'Orthopedic Evaluation — Hairline Fracture', uploaderRole: 'doctor', uploadedByUserID: 'U001', extractedData: { category: 'doctor_report', summary: 'Hairline fracture 3rd metacarpal. Cast applied.' } },
      { patientID: 'P003', hospitalID: 'H002', type: 'doctor_report', title: 'Pulmonology Report — Pneumonia', uploaderRole: 'doctor', uploadedByUserID: 'U002', extractedData: { category: 'doctor_report', summary: 'Community-acquired pneumonia. IV antibiotics started.' } },
    ];

    demoDocuments.forEach((doc) => {
      DocumentModel.create({
        ...doc,
        fileURL: `/uploads/demo/${doc.title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        originalName: `${doc.title}.pdf`,
        fileType: 'pdf',
        fileSize: Math.floor(Math.random() * 500000) + 100000,
        status: 'complete',
        notes: '',
      });
    });

    console.log(`  ✅ Seeded ${demoDocuments.length} in-memory document records`);
  } catch (err) {
    console.warn(`  ⚠️  Document seeding skipped: ${err.message}`);
  }
}

// ── Exported data accessors (for routes to query) ─────────

function getDemoBeds(hospitalId) {
  if (hospitalId) return demoBeds.filter((b) => b.hospital_id === hospitalId);
  return demoBeds;
}

function getDemoPatientProfiles(hospitalId) {
  if (hospitalId) return demoPatientProfiles.filter((p) => p.hospital_id === hospitalId);
  return demoPatientProfiles;
}

function getDemoPatientProfileByUserId(userId) {
  return demoPatientProfiles.find((p) => p.user_id === userId) || null;
}

function getDemoPatientDocuments(profileId) {
  return demoPatientDocuments.filter((d) => d.patient_profile_id === profileId);
}

function getAllDemoPatientDocuments() {
  return demoPatientDocuments;
}

function getDemoLabReports(hospitalId) {
  if (hospitalId) return demoLabReports.filter((r) => r.hospital_id === hospitalId);
  return demoLabReports;
}

function getDemoPharmacyBills(hospitalId) {
  if (hospitalId) return demoPharmacyBills.filter((b) => b.hospital_id === hospitalId);
  return demoPharmacyBills;
}

module.exports = {
  seedDemoData,
  getDemoBeds,
  getDemoPatientProfiles,
  getDemoPatientProfileByUserId,
  getDemoPatientDocuments,
  getAllDemoPatientDocuments,
  getDemoLabReports,
  getDemoPharmacyBills,
};
