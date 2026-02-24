-- =========================================================================
-- UrbanCare AI Multi-Tenant SaaS Platform
-- PostgreSQL Schema Definitions
-- =========================================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'hospital_admin', 'doctor', 'patient', 'laboratory', 'pharmacist', 'family');
CREATE TYPE agent_state AS ENUM ('active', 'idle', 'failed');
CREATE TYPE log_severity AS ENUM ('info', 'warning', 'error', 'critical');

CREATE TABLE hospitals (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    subscription_plan VARCHAR(100) DEFAULT 'basic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hospital_settings (
    hospital_id VARCHAR(50) PRIMARY KEY REFERENCES hospitals(id) ON DELETE CASCADE,
    hf_token_encrypted TEXT,
    gemini_api_key_encrypted TEXT,
    offline_mode_enabled BOOLEAN DEFAULT FALSE,
    edge_model_enabled BOOLEAN DEFAULT FALSE,
    max_patients INTEGER DEFAULT 1000,
    model_preference VARCHAR(100) DEFAULT 'txgemma-9b'
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'patient',
    hospital_id VARCHAR(50) REFERENCES hospitals(id) ON DELETE SET NULL,
    specialty VARCHAR(255),
    address TEXT,
    age INTEGER,
    gender VARCHAR(20),
    google_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_hospital ON users(hospital_id);

CREATE TABLE agent_status (
    id SERIAL PRIMARY KEY,
    hospital_id VARCHAR(50) REFERENCES hospitals(id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL,
    last_run TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status agent_state DEFAULT 'idle',
    error_message TEXT,
    avg_latency_ms INTEGER DEFAULT 0
);

CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    hospital_id VARCHAR(50) REFERENCES hospitals(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    severity log_severity DEFAULT 'info',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(50),
    patient_id VARCHAR(50)
);

-- Note: The User table would map its 'role' column to the 'user_role' enum.
-- The existing tables for Patients, Vitals, Documents, etc. would have a 'hospital_id' 
-- foreign key added to support strict multi-tenant isolation.

-- =========================================================================
-- Patients Table (AlloyDB-backed)
-- =========================================================================

CREATE TABLE IF NOT EXISTS patients (
    id              SERIAL PRIMARY KEY,
    hospital_id     VARCHAR(50) REFERENCES hospitals(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    age             INTEGER,
    gender          VARCHAR(20),
    patient_type    VARCHAR(50) DEFAULT 'private',       -- private | admitted
    admission_status VARCHAR(50) DEFAULT 'not_admitted', -- not_admitted | admitted | discharged
    primary_condition TEXT,
    risk_level      VARCHAR(50) DEFAULT 'Stable',
    doctor_id       VARCHAR(50),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    monitoring_enabled BOOLEAN DEFAULT false,
    heart_rate      INTEGER,
    spo2            INTEGER,
    temperature     FLOAT,
    respiration     INTEGER,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- Reports Table (metadata for GCS-uploaded files)
-- =========================================================================

CREATE TABLE IF NOT EXISTS reports (
    id                  SERIAL PRIMARY KEY,
    patient_id          INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    title               VARCHAR(500),
    original_filename   VARCHAR(500) NOT NULL,
    mime_type           VARCHAR(100) NOT NULL,
    file_size_bytes     INTEGER,
    file_url            TEXT NOT NULL,
    notes               TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- Voice Chat History (Voice Clinical Copilot)
-- =========================================================================

CREATE TABLE IF NOT EXISTS voice_chat_history (
    id              SERIAL PRIMARY KEY,
    patient_id      VARCHAR(50) NOT NULL,
    doctor_id       VARCHAR(50) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('doctor', 'assistant')),
    message_text    TEXT NOT NULL,
    audio_url       TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_voice_chat_patient ON voice_chat_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_voice_chat_doctor ON voice_chat_history(doctor_id);
CREATE INDEX IF NOT EXISTS idx_voice_chat_expires ON voice_chat_history(expires_at);

-- =========================================================================
-- Patient Memory Vectors (RAG context for voice copilot)
-- =========================================================================

CREATE TABLE IF NOT EXISTS patient_memory_vectors (
    id              SERIAL PRIMARY KEY,
    patient_id      VARCHAR(50) NOT NULL,
    embedding       TEXT,
    content_text    TEXT NOT NULL,
    source_type     VARCHAR(50) NOT NULL CHECK (source_type IN ('xray', 'lab', 'soap', 'notes', 'prescription', 'vitals')),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memory_patient ON patient_memory_vectors(patient_id);
CREATE INDEX IF NOT EXISTS idx_memory_source ON patient_memory_vectors(source_type);

-- =========================================================================
-- Patient Profiles (Extended profile linked to user account)
-- =========================================================================

CREATE TABLE IF NOT EXISTS patient_profiles (
    id              VARCHAR(50) PRIMARY KEY,
    user_id         VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    hospital_id     VARCHAR(50) REFERENCES hospitals(id) ON DELETE SET NULL,
    bed_id          VARCHAR(50),
    age             INTEGER,
    gender          VARCHAR(20),
    condition       TEXT,
    onboarded       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_profiles_user ON patient_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_hospital ON patient_profiles(hospital_id);

-- =========================================================================
-- Patient Documents (Uploaded by patients, labs, pharmacies)
-- =========================================================================

CREATE TABLE IF NOT EXISTS patient_documents (
    id                  VARCHAR(50) PRIMARY KEY,
    patient_profile_id  VARCHAR(50),
    type                VARCHAR(50), -- doctor_report | pharmacy_bill | lab_report
    file_url            TEXT,
    original_name       VARCHAR(500),
    extracted_text      TEXT,
    ai_summary          JSONB,
    uploaded_by         VARCHAR(50),
    uploader_role       VARCHAR(50),
    status              VARCHAR(20) DEFAULT 'processing',
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_docs_profile ON patient_documents(patient_profile_id);
CREATE INDEX IF NOT EXISTS idx_patient_docs_type ON patient_documents(type);

-- =========================================================================
-- Beds (Hospital bed tracking)
-- =========================================================================

CREATE TABLE IF NOT EXISTS beds (
    id                  VARCHAR(50) PRIMARY KEY,
    hospital_id         VARCHAR(50) REFERENCES hospitals(id) ON DELETE CASCADE,
    bed_number          VARCHAR(50),
    ward                VARCHAR(100) DEFAULT 'General',
    occupied            BOOLEAN DEFAULT FALSE,
    patient_profile_id  VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_beds_hospital ON beds(hospital_id);
CREATE INDEX IF NOT EXISTS idx_beds_occupied ON beds(occupied);

-- =========================================================================
-- Lab Reports (Lab-generated test results)
-- =========================================================================

CREATE TABLE IF NOT EXISTS lab_reports (
    id                  VARCHAR(50) PRIMARY KEY,
    patient_id          VARCHAR(50),
    hospital_id         VARCHAR(50) REFERENCES hospitals(id) ON DELETE CASCADE,
    lab_user_id         VARCHAR(50),
    test_name           VARCHAR(255),
    result_data         JSONB,
    report_url          TEXT,
    status              VARCHAR(20) DEFAULT 'pending', -- pending | complete | reviewed
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lab_reports_patient ON lab_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_hospital ON lab_reports(hospital_id);

-- =========================================================================
-- Pharmacy Bills (Medication purchase records)
-- =========================================================================

CREATE TABLE IF NOT EXISTS pharmacy_bills (
    id                  VARCHAR(50) PRIMARY KEY,
    patient_id          VARCHAR(50),
    hospital_id         VARCHAR(50) REFERENCES hospitals(id) ON DELETE CASCADE,
    pharmacist_user_id  VARCHAR(50),
    medications         JSONB,
    total_amount        DECIMAL(10,2),
    bill_url            TEXT,
    status              VARCHAR(20) DEFAULT 'unpaid', -- unpaid | paid
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_bills_patient ON pharmacy_bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_bills_hospital ON pharmacy_bills(hospital_id);
