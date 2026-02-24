<div align="center">
<img width="1280" height="720" alt="yt" src="https://github.com/user-attachments/assets/a9447147-00a8-48ef-980c-120880a48cf4" />


# UrbanCare AI

**An AI-Native Clinical Ecosystem for Mechanistic Interpretability of Medical AI Models**

[![Deploy](https://github.com/Golden007-prog/UrbanCare-AI/actions/workflows/deploy.yml/badge.svg)](https://github.com/Golden007-prog/UrbanCare-AI/actions)
[![Live Demo](https://img.shields.io/badge/Demo-GitHub%20Pages-blue)](https://golden007-prog.github.io/UrbanCare-AI/)

_Built with MedGemma · TxGemma · Gemini · React · Node.js · PostgreSQL_

</div>

---

## Table of Contents

- [Overview](#overview)
- [Mechanistic Interpretability & the Semantics-to-Vector Interface](#mechanistic-interpretability--the-semantics-to-vector-interface)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Quickstart](#quickstart)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [AI Agents (30-Agent Pipeline)](#ai-agents-30-agent-pipeline)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

Modern healthcare systems impose an enormous administrative and cognitive burden on physicians — clunky EMR interfaces, unstructured lab reports, and repetitive documentation steal time from direct patient care. **UrbanCare AI** solves this by providing a production-ready, AI-native clinical dashboard that acts as a true _Doctor Consultant_.

The platform leverages Google HAI-DEF open-weight models — specifically **MedGemma** (`medgemma-4b-it`) for vision/document tasks and **TxGemma** for therapeutic reasoning — to automate data extraction, streamline radiology analysis, and deliver a specialized medical AI copilot. By making the internal reasoning of these models transparent and actionable, UrbanCare AI serves as a **mechanistic interpretability tool** that lets clinicians inspect, understand, and trust the AI's decision-making process at every step.

---

## Mechanistic Interpretability & the Semantics-to-Vector Interface

### What is Mechanistic Interpretability?

Mechanistic interpretability is the discipline of reverse-engineering the internal computations of AI models to understand _how_ they arrive at specific outputs. In a clinical setting, this is not a luxury — it is a safety requirement. Physicians must be able to inspect, validate, and override AI recommendations before they reach a patient.

### How UrbanCare AI Implements This

UrbanCare AI provides a **Semantics-to-Vector (S2V) interface** — a transparent bridge between human-readable clinical semantics (symptoms, lab values, imaging findings) and the internal vector representations used by the underlying AI models. This interface works at multiple levels:

| Layer                   | Semantics (Human-Readable)                                | Vector / Model Layer                                                                                       | How It's Exposed                                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Document Extraction** | Lab values, patient info, medication names                | MedGemma's vision encoder converts document images into embedding vectors, then decodes to structured JSON | The `TabularLabExtractor` agent outputs structured tables with explicit field-level confidence, so doctors can verify each extracted value against the source document                 |
| **Clinical Reasoning**  | Differential diagnoses, SOAP notes, treatment guidelines  | TxGemma maps patient context vectors to therapeutic outcome predictions                                    | The `DifferentialDiagnosisAgent` and `SOAPGeneratorAgent` produce structured **Findings → Impression → Recommendation** outputs, making the model's reasoning chain fully visible      |
| **Radiology Analysis**  | Fracture locations, anatomical landmarks, severity grades | MedGemma's vision encoder maps X-ray pixel regions to diagnostic feature vectors                           | The `XRayAnalyzer` agent returns bounding-box annotations and per-region severity scores, allowing doctors to see _which_ image regions drove the model's conclusion                   |
| **Voice Copilot**       | Spoken clinical queries, patient history context          | Speech → embedding → TxGemma context vector → response generation                                          | The `VoiceClinicalCopilotAgent` builds a RAG context window from `patient_memory_vectors`, exposing which historical data points (labs, notes, prior imaging) influenced each response |
| **Risk Prediction**     | Patient acuity scores, escalation triggers                | Vitals time-series → risk feature vector → escalation threshold comparison                                 | The `ClinicalRiskPredictor` makes its risk factors and threshold crossings explicit in structured output                                                                               |

### The 8-Layer Agent Pipeline as an Interpretability Stack

The 30-agent pipeline is itself a mechanistic interpretability tool. Each layer transforms input data through a traceable, auditable path:

```
Input Document/Image
    │
    ▼
Layer 1: Classification  →  "What type of data is this?" (Report, X-ray, Rx)
Layer 2: Extraction       →  "What facts can be pulled from it?" (Structured JSON)
Layer 3: Clinical Reason  →  "What does it mean clinically?" (Diagnoses, SOAP)
Layer 4: Multimodal       →  "What does the image show?" (Fractures, regions)
Layer 5: Patient Workflow →  "How does this affect the patient journey?"
Layer 6: Monitoring       →  "Are any vitals or trends alarming?"
Layer 7: Interaction      →  "How should this be communicated to the doctor?"
Layer 8: Utility          →  "Is the output clean and valid?"
```

At every layer transition, intermediate results are available through the **Agent Dashboard** (`/api/agents/architecture`), enabling clinicians and developers to inspect the exact data transformations the system performed — turning the AI from a black box into a transparent reasoning chain.

---

## Key Features

### 🩺 Doctor Dashboard

- EMR-grade patient management with real-time vitals (SSE streaming)
- AI-generated clinical reports with **Findings / Impression / Recommendation** structure
- Drag-and-drop document upload with automatic AI analysis
- Interactive X-ray viewer with coordinate bounding boxes and region-of-interest selection

### 🧠 AI Clinical Copilot

- Voice-activated clinical assistant powered by TxGemma + Gemini
- RAG-enhanced responses using patient memory vectors
- SOAP note generation, differential diagnosis, and treatment guidelines
- Structured, physician-facing response format

### 📄 Intelligent Document Processing

- MedGemma-powered extraction of lab reports, pharmacy bills, and medical documents
- Automatic classification of document types (lab report, prescription, imaging)
- Structured tabular output without hallucinated mock data
- Support for PDF, XML, JPG, and PNG uploads

### 🦴 Radiology / X-Ray Analysis

- Specialized MedGemma vision agent for fracture detection
- Intelligent region-of-interest cropping for targeted analysis
- Per-region severity scoring with bounding-box annotations
- Full-image and regional analysis modes

### 🏥 Multi-Tenant Hospital Platform

- Role-based access control: Doctor, Patient, Lab Technician, Pharmacist, Hospital Admin, Super Admin
- Multi-hospital tenant isolation
- Patient admission, bed management, and discharge workflows
- Family portal with secure, time-limited access links

### 📊 Administrative Dashboards

- Hospital admin overview with patient census and bed occupancy
- Lab report tracking and pharmacy bill management
- Agent status monitoring and system log auditing
- Demo ecosystem with pre-seeded data for testing

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)               │
│  ┌──────────┐ ┌──────────┐ ┌──────┐ ┌───────────────┐  │
│  │  Doctor   │ │ Patient  │ │ Lab  │ │  Admin / Rx   │  │
│  │Dashboard  │ │Dashboard │ │Dash  │ │  Dashboards   │  │
│  └────┬─────┘ └────┬─────┘ └──┬───┘ └───────┬───────┘  │
│       └─────────────┴──────────┴─────────────┘          │
│         Voice Assistant  ·  X-Ray Viewer  ·  Uploads    │
└──────────────────────────┬──────────────────────────────┘
                           │ REST API + SSE
┌──────────────────────────┴──────────────────────────────┐
│               Backend (Node.js / Express)               │
│  ┌───────────────────────────────────────────────────┐  │
│  │          30-Agent Pipeline (8 Layers)              │  │
│  │  Classification → Extraction → Reasoning →        │  │
│  │  Multimodal → Workflow → Monitoring →              │  │
│  │  Interaction → Utility                             │  │
│  └───────────────────┬───────────────────────────────┘  │
│  ┌──────────┐ ┌──────┴──────┐ ┌──────────────────────┐  │
│  │ Auth/JWT │ │ AI Services │ │  Upload / GCS        │  │
│  │ Passport │ │ MedGemma    │ │  Multer + Sharp      │  │
│  │ OAuth2.0 │ │ TxGemma     │ │  Google Cloud Stor.  │  │
│  └──────────┘ │ Gemini      │ └──────────────────────┘  │
│               └──────┬──────┘                           │
└──────────────────────┼──────────────────────────────────┘
                       │
    ┌──────────────────┼─────────────────────┐
    │                  │                     │
┌───▼───┐    ┌────────▼────────┐    ┌───────▼──────┐
│ Hugging│    │   PostgreSQL    │    │ Google Cloud  │
│ Face   │    │   (AlloyDB)     │    │ Storage (GCS) │
│Endpoints│   │ Users, Patients │    │ Reports, X-rays│
│MedGemma│    │ Vitals, Agents  │    │ Documents      │
│TxGemma │    │ Voice History   │    │                │
└────────┘    └─────────────────┘    └────────────────┘
```

---

## Tech Stack

| Component            | Technology                                         |
| -------------------- | -------------------------------------------------- |
| **Frontend**         | React 19, Vite 6, TypeScript, Tailwind CSS 4       |
| **UI Library**       | Ant Design 6, Lucide React, Recharts               |
| **State Management** | Zustand                                            |
| **Animations**       | Motion (Framer Motion)                             |
| **Backend**          | Node.js, Express 4, Passport.js                    |
| **Database**         | PostgreSQL 17 (AlloyDB-compatible)                 |
| **AI Models**        | MedGemma 4B (`medgemma-4b-it`), TxGemma 9B, Gemini |
| **AI Inference**     | HuggingFace Inference Endpoints, Google GenAI SDK  |
| **File Storage**     | Google Cloud Storage, Multer                       |
| **Image Processing** | Sharp                                              |
| **Authentication**   | JWT, Google OAuth 2.0, bcrypt                      |
| **Deployment**       | GitHub Actions → GitHub Pages (frontend)           |

---

## Installation

### Prerequisites

| Requirement    | Version                  |
| -------------- | ------------------------ |
| **Node.js**    | ≥ 18.x                   |
| **npm**        | ≥ 9.x                    |
| **PostgreSQL** | ≥ 15 (or Google AlloyDB) |
| **Git**        | latest                   |

You will also need:

- A [HuggingFace API token](https://huggingface.co/settings/tokens) (for MedGemma & TxGemma inference)
- A [Gemini API key](https://ai.google.dev/) (for the Gemini copilot fallback)
- A [Google OAuth 2.0 client](https://console.cloud.google.com/apis/credentials) (for Google Sign-In)
- _(Optional)_ A Google Cloud Storage bucket for file uploads

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Golden007-prog/UrbanCare-AI.git
cd UrbanCare-AI
```

### Step 2 — Install Frontend Dependencies

```bash
npm install
```

### Step 3 — Install Backend Dependencies

```bash
cd server
npm install
cd ..
```

### Step 4 — Configure Environment Variables

#### Frontend (root `.env.local`)

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
```

#### Backend (`server/.env`)

Copy the example and fill in your credentials:

```bash
cp server/.env.example server/.env
```

Then edit `server/.env`:

```env
# ─── Server ───────────────────────────────────────────
PORT=5001

# ─── JWT ──────────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_strong_random_secret

# ─── Google OAuth 2.0 ────────────────────────────────
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ─── Frontend URL (for CORS & redirect after OAuth) ──
CLIENT_URL=http://localhost:3000

# ─── HuggingFace Inference API ────────────────────────
# Required for MedGemma, TxGemma, and speech models
HF_TOKEN=hf_your_huggingface_token

# ─── Gemini API Key ──────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key

# ─── PostgreSQL / AlloyDB ─────────────────────────────
DATABASE_URL=postgresql://postgres:your_password@HOST:5432/urbancare

# ─── Google Cloud Storage (optional) ──────────────────
GCS_BUCKET_NAME=urbancare-reports
GCS_PROJECT_ID=your_gcp_project_id

# ─── Dedicated MedGemma Endpoint (optional) ──────────
# When set, routes image analysis to this endpoint
MEDGEMMA_ENDPOINT=https://your-medgemma-endpoint.endpoints.huggingface.cloud

# ─── Dedicated TxGemma Endpoint (optional) ───────────
TXGEMMA_ENDPOINT=https://your-txgemma-endpoint.endpoints.huggingface.cloud
```

### Step 5 — Set Up the Database

Make sure your PostgreSQL instance is running and the `DATABASE_URL` in `server/.env` points to it.

```bash
cd server
node setupDb.js
cd ..
```

This script will:

1. Connect to the default `postgres` database
2. Create the `urbancare` database if it doesn't exist
3. Execute `schema.sql` to create all tables, indexes, and enum types

---

## Quickstart

Once installation is complete, start both the frontend and backend servers:

### Terminal 1 — Start the Backend

```bash
cd server
npm run dev
```

The server will start on `http://localhost:5001` (or the `PORT` in your `.env`) and will:

- Register all 30 AI agents
- Seed demo data for testing
- Print a full route map to the console

### Terminal 2 — Start the Frontend

```bash
npm run dev
```

The frontend dev server starts on `http://localhost:3000`.

### Open the Dashboard

1. Navigate to **http://localhost:3000** in your browser
2. **Sign up** or log in with one of the demo accounts:
   - Use **Google Sign-In** for OAuth-based login
   - Use the **Demo Login** buttons for quick role-based access (Doctor, Patient, Lab, Pharmacy, Admin)
3. You will be automatically redirected to your role-specific dashboard

### Try It Out

| Action                         | How                                                                       |
| ------------------------------ | ------------------------------------------------------------------------- |
| **Upload a lab report**        | Go to Doctor Dashboard → Documents tab → Drag & drop a PDF/image          |
| **Analyze an X-ray**           | Go to Doctor Dashboard → Click Upload X-ray → Select region or full image |
| **Generate a clinical report** | Open a patient → Click "Generate AI Report"                               |
| **Use the voice copilot**      | Click the microphone icon on any patient view                             |
| **View agent pipeline**        | Hit `GET /api/agents/architecture` to see the full 30-agent diagram       |

---

## Environment Variables

| Variable               | Required | Description                                 |
| ---------------------- | -------- | ------------------------------------------- |
| `PORT`                 | No       | Backend server port (default: `5000`)       |
| `JWT_SECRET`           | **Yes**  | Secret key for signing JWT tokens           |
| `GOOGLE_CLIENT_ID`     | **Yes**  | Google OAuth 2.0 client ID                  |
| `GOOGLE_CLIENT_SECRET` | **Yes**  | Google OAuth 2.0 client secret              |
| `CLIENT_URL`           | **Yes**  | Frontend URL for CORS and OAuth redirects   |
| `HF_TOKEN`             | **Yes**  | HuggingFace API token for model inference   |
| `GEMINI_API_KEY`       | **Yes**  | Google Gemini API key                       |
| `DATABASE_URL`         | **Yes**  | PostgreSQL connection string                |
| `GCS_BUCKET_NAME`      | No       | Google Cloud Storage bucket name            |
| `GCS_PROJECT_ID`       | No       | GCP project ID                              |
| `MEDGEMMA_ENDPOINT`    | No       | Dedicated HuggingFace endpoint for MedGemma |
| `TXGEMMA_ENDPOINT`     | No       | Dedicated HuggingFace endpoint for TxGemma  |

> [!TIP]
> Without `HF_TOKEN`, AI endpoints will fall back to mock responses. For full functionality, obtain a free token from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).

---

## Project Structure

```
UrbanCare-AI/
├── index.html                  # Vite entry point
├── vite.config.ts              # Vite + Tailwind + React config
├── package.json                # Frontend dependencies
├── .env.example                # Frontend env template
├── metadata.json               # App metadata
│
├── src/                        # ── Frontend Source ──
│   ├── App.tsx                 # Route definitions & role-based navigation
│   ├── main.tsx                # React entry point
│   ├── index.css               # Global styles
│   ├── context/                # AuthContext (JWT + Google OAuth state)
│   ├── store/                  # Zustand state management
│   ├── pages/
│   │   ├── Dashboard.tsx       # Legacy shared dashboard
│   │   ├── LoginPage.tsx       # Multi-role login + Google OAuth
│   │   ├── SignupPage.tsx      # Registration with role selection
│   │   ├── doctor/             # Doctor-specific dashboard
│   │   ├── patient/            # Patient portal
│   │   ├── lab/                # Lab technician dashboard
│   │   ├── pharmacy/           # Pharmacy dashboard
│   │   └── admin/              # Super Admin & Hospital Admin
│   ├── components/
│   │   ├── VoiceAssistantPanel.tsx      # Voice clinical copilot
│   │   ├── DoctorClinicalReport.tsx     # AI report generation
│   │   ├── DocumentsTab.tsx             # Document management + AI extraction
│   │   ├── ImageDiagnosticsWidget.tsx   # X-ray analysis UI
│   │   ├── AIConsultPanel.tsx           # AI consultation interface
│   │   ├── RiskPredictionPanel.tsx      # Clinical risk scoring
│   │   ├── image-diagnostics/           # X-ray viewer sub-components
│   │   ├── clinical-report/             # Report editor sub-components
│   │   └── chat/                        # Chat UI components
│   ├── services/               # API client layer
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility libraries
│   ├── utils/                  # Shared utilities
│   └── styles/                 # Component stylesheets
│
├── server/                     # ── Backend Source ──
│   ├── package.json            # Backend dependencies
│   ├── .env.example            # Backend env template
│   ├── schema.sql              # Full PostgreSQL schema (241 lines)
│   ├── setupDb.js              # Database creation & migration script
│   └── src/
│       ├── index.js            # Express server entry point
│       ├── agents/             # 30 AI agents across 8 layers
│       │   ├── AgentOrchestrator.js
│       │   ├── AgentRegistry.js
│       │   ├── BaseAgent.js
│       │   ├── VoiceClinicalCopilotAgent.js
│       │   ├── classification/     # Layer 1: Document/image classifiers
│       │   ├── extraction/         # Layer 2: Data extraction agents
│       │   ├── reasoning/          # Layer 3: Clinical reasoning agents
│       │   ├── multimodal/         # Layer 4: X-ray & image analysis
│       │   ├── workflow/           # Layer 5: Patient workflow automation
│       │   ├── monitoring/         # Layer 6: Vitals monitoring & alerts
│       │   ├── interaction/        # Layer 7: Copilot & voice agents
│       │   └── utility/            # Layer 8: JSON cleanup & validation
│       ├── ai/                 # AI model clients & routing
│       │   ├── router.js           # Central AI route dispatcher
│       │   ├── huggingfaceClient.js # HF Inference API client
│       │   ├── imageModel.js       # MedGemma image analysis
│       │   ├── textModel.js        # TxGemma text generation
│       │   ├── consultModel.js     # Gemini consultation
│       │   ├── speechModel.js      # Speech-to-text / TTS
│       │   └── offlineMiddleware.js # Mock fallback when offline
│       ├── services/           # Business logic layer
│       │   ├── medgemmaClient.js   # MedGemma endpoint wrapper
│       │   ├── txgemmaClient.js    # TxGemma with retries + Gemini fallback
│       │   ├── XRayPipeline.js     # X-ray analysis pipeline
│       │   ├── documentService.js  # Document processing orchestration
│       │   └── voiceOrchestrator.js # Voice copilot orchestration
│       ├── models/             # Database models (PostgreSQL)
│       ├── routes/             # 18 Express route modules
│       ├── middleware/         # Auth, rate-limiting, CORS
│       ├── config/             # Passport, DB, and app config
│       └── data/               # Demo data seeding
│
└── .github/
    └── workflows/
        └── deploy.yml          # GitHub Actions → GitHub Pages
```

---

## AI Agents (30-Agent Pipeline)

All agents extend a common `BaseAgent` class and are registered in an 8-layer pipeline:

| Layer                 | Name                  | Agents                                                                                                                                                                          | Model            |
| --------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **1. Classification** | Input Triage          | `ReportPageClassifier`, `MedicalImageConfirmAgent`, `PatientTypeClassifier`                                                                                                     | MedGemma         |
| **2. Extraction**     | Data Extraction       | `TabularLabExtractor`, `LabDeviationAnalyzer`, `DetailedReportSummary`, `PatientDoctorInfoExtractor`, `PatientHistoryExtractor`, `MedicationExtractor`, `PharmacyBillExtractor` | MedGemma         |
| **3. Reasoning**      | Clinical Intelligence | `DifferentialDiagnosisAgent`, `SOAPGeneratorAgent`, `ReferralGenerator`, `ClinicalRiskPredictor`, `TreatmentGuidelineAgent`                                                     | TxGemma          |
| **4. Multimodal**     | Image Analysis        | `XRayAnalyzer`, `YOLORegionDetector`, `ImageCaptionAgent`, `ImageComparisonAgent`                                                                                               | MedGemma         |
| **5. Workflow**       | Patient Journey       | `SmartIntakeAgent`, `FamilyDashboardAgent`, `AdmissionStatusAgent`, `TimelineBuilderAgent`                                                                                      | TxGemma          |
| **6. Monitoring**     | Real-Time Alerts      | `RealTimeVitalsMonitor`, `AlertGenerator`, `RiskEscalationAgent`                                                                                                                | TxGemma          |
| **7. Interaction**    | Doctor-Facing         | `DoctorCopilotAgent`, `VoiceIntakeAgent`                                                                                                                                        | Gemini / TxGemma |
| **8. Utility**        | Data Quality          | `JSONCleanupAgent`, `DataValidatorAgent`                                                                                                                                        | Rule-based       |

### Running the Pipeline

```bash
# List all agents
curl http://localhost:5001/api/agents

# View full architecture diagram
curl http://localhost:5001/api/agents/architecture

# Execute the full 8-layer pipeline
curl -X POST http://localhost:5001/api/agents/pipeline \
  -H "Content-Type: application/json" \
  -d '{"input": "base64-encoded-document-image"}'

# Execute a single agent
curl -X POST http://localhost:5001/api/agents/TabularLabExtractor/execute \
  -H "Content-Type: application/json" \
  -d '{"input": "base64-encoded-lab-report"}'
```

---

## API Reference

### Authentication

| Method | Endpoint                | Description                    |
| ------ | ----------------------- | ------------------------------ |
| `POST` | `/auth/login`           | Email + password login         |
| `POST` | `/auth/signup`          | Create new account             |
| `GET`  | `/auth/google`          | Initiate Google OAuth flow     |
| `GET`  | `/auth/google/callback` | Google OAuth callback          |
| `GET`  | `/auth/me`              | Get current authenticated user |
| `POST` | `/auth/logout`          | Logout (clears JWT cookie)     |

### Patients & Vitals

| Method | Endpoint                        | Description                     |
| ------ | ------------------------------- | ------------------------------- |
| `GET`  | `/api/patients`                 | List patients (hospital-scoped) |
| `POST` | `/api/patients`                 | Create a new patient            |
| `POST` | `/api/patients/:id/admit`       | Admit a patient                 |
| `POST` | `/api/patients/:id/discharge`   | Discharge a patient             |
| `GET`  | `/api/patients/:id/vitals`      | Get vitals history              |
| `POST` | `/api/patients/:id/vitals`      | Record new vitals               |
| `GET`  | `/api/patients/:id/vitals/live` | Live vitals stream (SSE)        |

### AI & Agents

| Method | Endpoint                   | Description                   |
| ------ | -------------------------- | ----------------------------- |
| `POST` | `/api/analyze-image`       | MedGemma image analysis       |
| `POST` | `/api/generate-soap`       | Generate SOAP notes (TxGemma) |
| `POST` | `/api/generate-referral`   | Generate referral letter      |
| `POST` | `/api/ai-consult`          | AI clinical consultation      |
| `GET`  | `/api/agents`              | List all 30 registered agents |
| `GET`  | `/api/agents/architecture` | Full architecture diagram     |
| `POST` | `/api/agents/pipeline`     | Run 8-layer pipeline          |
| `POST` | `/api/agents/:id/execute`  | Execute a specific agent      |

### Voice Clinical Copilot

| Method   | Endpoint                 | Description                |
| -------- | ------------------------ | -------------------------- |
| `POST`   | `/api/voice/message`     | Process voice/text message |
| `GET`    | `/api/voice/history/:id` | Fetch chat history         |
| `DELETE` | `/api/voice/history/:id` | Delete chat session        |

### X-Ray Analysis

| Method | Endpoint            | Description                    |
| ------ | ------------------- | ------------------------------ |
| `POST` | `/api/xray/analyze` | Analyze X-ray (full or region) |

### Documents & Uploads

| Method | Endpoint                | Description                     |
| ------ | ----------------------- | ------------------------------- |
| `POST` | `/api/documents/upload` | Upload document for AI analysis |
| `POST` | `/api/upload-report`    | Upload file → GCS + DB          |
| `POST` | `/api/patient/upload`   | Patient document upload         |

### Dashboard Overview

| Method | Endpoint                         | Description             |
| ------ | -------------------------------- | ----------------------- |
| `GET`  | `/api/dashboard/hospital/:id`    | Hospital admin overview |
| `GET`  | `/api/dashboard/doctor/patients` | Doctor's patient list   |
| `GET`  | `/api/dashboard/lab/reports`     | Lab reports list        |
| `GET`  | `/api/dashboard/pharmacy/bills`  | Pharmacy bills list     |

---

## Deployment

### Frontend → GitHub Pages

The frontend is automatically deployed via GitHub Actions. The workflow at `.github/workflows/deploy.yml` builds the Vite app and publishes to the `gh-pages` branch.

To trigger a manual deployment:

1. Go to **Actions** tab in GitHub
2. Select the **Deploy** workflow
3. Click **Run workflow**

The live site is available at: **https://golden007-prog.github.io/UrbanCare-AI/**

> [!IMPORTANT]
> The frontend uses `HashRouter` for SPA compatibility on static hosting. The Vite base path is set to `/UrbanCare-AI/`.

### Backend

The backend is a standard Node.js/Express server. Deploy it to any platform that supports Node.js (e.g., Google Cloud Run, Railway, Render, or a VPS):

```bash
cd server
npm start
```

Ensure all environment variables in `server/.env` are configured in your deployment environment.

---

## License

This project was built for the Google HAI-DEF challenge. See the repository for license details.

---

<div align="center">

**Built with ❤️ using Google MedGemma, TxGemma, and Gemini**

</div>
