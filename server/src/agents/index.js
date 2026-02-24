// ──────────────────────────────────────────────────────────
// Agent Index — Registers all 30 agents into the registry
// ──────────────────────────────────────────────────────────

const registry = require('./AgentRegistry');

// ── Layer 1: Classification ─────────────────────────────
const ReportPageClassifier = require('./classification/ReportPageClassifier');
const MedicalImageConfirmAgent = require('./classification/MedicalImageConfirmAgent');
const PatientTypeClassifier = require('./classification/PatientTypeClassifier');

// ── Layer 2: Extraction ─────────────────────────────────
const TabularLabExtractor = require('./extraction/TabularLabExtractor');
const LabDeviationAnalyzer = require('./extraction/LabDeviationAnalyzer');
const DetailedReportSummary = require('./extraction/DetailedReportSummary');
const PatientDoctorInfoExtractor = require('./extraction/PatientDoctorInfoExtractor');
const PatientHistoryExtractor = require('./extraction/PatientHistoryExtractor');
const MedicationExtractor = require('./extraction/MedicationExtractor');
const PharmacyBillExtractor = require('./extraction/PharmacyBillExtractor');

// ── Layer 3: Clinical Reasoning ─────────────────────────
const DifferentialDiagnosisAgent = require('./reasoning/DifferentialDiagnosisAgent');
const SOAPGeneratorAgent = require('./reasoning/SOAPGeneratorAgent');
const ReferralGenerator = require('./reasoning/ReferralGenerator');
const ClinicalRiskPredictor = require('./reasoning/ClinicalRiskPredictor');
const TreatmentGuidelineAgent = require('./reasoning/TreatmentGuidelineAgent');

// ── Layer 4: Multimodal Image ───────────────────────────
const XRayAnalyzer = require('./multimodal/XRayAnalyzer');
const YOLORegionDetector = require('./multimodal/YOLORegionDetector');
const ImageCaptionAgent = require('./multimodal/ImageCaptionAgent');
const ImageComparisonAgent = require('./multimodal/ImageComparisonAgent');

// ── Layer 5: Patient Workflow ───────────────────────────
const SmartIntakeAgent = require('./workflow/SmartIntakeAgent');
const FamilyDashboardAgent = require('./workflow/FamilyDashboardAgent');
const AdmissionStatusAgent = require('./workflow/AdmissionStatusAgent');
const TimelineBuilderAgent = require('./workflow/TimelineBuilderAgent');

// ── Layer 6: Monitoring & Alert ─────────────────────────
const RealTimeVitalsMonitor = require('./monitoring/RealTimeVitalsMonitor');
const AlertGenerator = require('./monitoring/AlertGenerator');
const RiskEscalationAgent = require('./monitoring/RiskEscalationAgent');

// ── Layer 7: Interaction ────────────────────────────────
const DoctorCopilotAgent = require('./interaction/DoctorCopilotAgent');
const VoiceIntakeAgent = require('./interaction/VoiceIntakeAgent');

// ── Layer 8: Utility ────────────────────────────────────
const JSONCleanupAgent = require('./utility/JSONCleanupAgent');
const DataValidatorAgent = require('./utility/DataValidatorAgent');

// ── Register all agents ─────────────────────────────────

function registerAllAgents() {
  console.log('\n🤖 ═══ Registering 30 AI Agents ═══\n');

  // Layer 1
  registry.register(new ReportPageClassifier());
  registry.register(new MedicalImageConfirmAgent());
  registry.register(new PatientTypeClassifier());

  // Layer 2
  registry.register(new TabularLabExtractor());
  registry.register(new LabDeviationAnalyzer());
  registry.register(new DetailedReportSummary());
  registry.register(new PatientDoctorInfoExtractor());
  registry.register(new PatientHistoryExtractor());
  registry.register(new MedicationExtractor());
  registry.register(new PharmacyBillExtractor());

  // Layer 3
  registry.register(new DifferentialDiagnosisAgent());
  registry.register(new SOAPGeneratorAgent());
  registry.register(new ReferralGenerator());
  registry.register(new ClinicalRiskPredictor());
  registry.register(new TreatmentGuidelineAgent());

  // Layer 4
  registry.register(new XRayAnalyzer());
  registry.register(new YOLORegionDetector());
  registry.register(new ImageCaptionAgent());
  registry.register(new ImageComparisonAgent());

  // Layer 5
  registry.register(new SmartIntakeAgent());
  registry.register(new FamilyDashboardAgent());
  registry.register(new AdmissionStatusAgent());
  registry.register(new TimelineBuilderAgent());

  // Layer 6
  registry.register(new RealTimeVitalsMonitor());
  registry.register(new AlertGenerator());
  registry.register(new RiskEscalationAgent());

  // Layer 7
  registry.register(new DoctorCopilotAgent());
  registry.register(new VoiceIntakeAgent());

  // Layer 8
  registry.register(new JSONCleanupAgent());
  registry.register(new DataValidatorAgent());

  console.log(`  ✅ ${registry.getAll().length} agents registered successfully\n`);

  // Print summary table
  for (let layer = 1; layer <= 8; layer++) {
    const agents = registry.getByLayer(layer);
    if (agents.length > 0) {
      console.log(`  Layer ${layer}: ${agents[0].layer}`);
      for (const agent of agents) {
        console.log(`    #${agent.number.toString().padStart(2, '0')} ${agent.name.padEnd(30)} → ${agent.modelName}`);
      }
    }
  }
  console.log('');

  return registry;
}

module.exports = { registerAllAgents, registry };
