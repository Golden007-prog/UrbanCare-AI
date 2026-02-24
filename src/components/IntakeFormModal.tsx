import React, { useState } from 'react';
import { Modal, Button, Input, Typography, message, Divider, Tag, Steps } from 'antd';
import {
  LinkOutlined,
  CopyOutlined,
  UserAddOutlined,
  FormOutlined,
  CheckCircleOutlined,
  AudioOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';
import { VoiceMicButton } from './VoiceMicButton';

const { Text } = Typography;

interface IntakeFormModalProps {
  open: boolean;
  onClose: () => void;
}

export function IntakeFormModal({ open, onClose }: IntakeFormModalProps) {
  const { addPatient, activeHospitalId, addAuditEntry } = useStore();
  const [formLink] = useState(
    `https://urbancare.app/intake/${crypto.randomUUID().slice(0, 8)}`
  );
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [complaint, setComplaint] = useState('');

  const copyLink = () => {
    navigator.clipboard.writeText(formLink);
    setCopied(true);
    message.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTranscript = (text: string) => {
    setComplaint((prev) => {
      const separator = prev.trim() ? '\n\n' : '';
      return prev + separator + text;
    });
    message.success('Voice transcript added to complaint field');
  };

  const simulateSubmission = () => {
    setSimulating(true);
    setTimeout(() => {
      const newId = `P${String(Math.floor(Math.random() * 900 + 100))}`;
      addPatient({
        id: newId,
        name: 'Priya Sharma',
        age: 34,
        gender: 'Female',
        condition: complaint ? complaint.slice(0, 60) : 'New Patient — Intake Pending',
        riskLevel: 'Stable',
        lastUpdated: 'Just now',
        hospitalId: activeHospitalId,
        patientType: 'private',
        admissionStatus: 'discharged',
        vitals: {
          heartRate: { name: 'Heart Rate', value: 76, unit: 'BPM', trend: 0, status: 'stable', history: [] },
          bloodPressure: { sys: 120, dia: 78, status: 'stable', trend: 0 },
          spO2: { name: 'SpO2', value: 98, unit: '%', trend: 0, status: 'stable', history: [] },
          temperature: { name: 'Temperature', value: 98.6, unit: '°F', trend: 0, status: 'stable', history: [] },
          respiration: { name: 'Respiration', value: 16, unit: '/min', trend: 0, status: 'stable', history: [] },
        },
        notes: {
          soap: '',
          hpi: complaint || '',
          assessment: '',
          plan: '',
        },
      });
      addAuditEntry('Generate Intake Form', `Created intake form link and simulated patient submission (${newId})`);
      setSimulating(false);
      setSimulated(true);
      message.success('Patient "Priya Sharma" added from intake form!');
    }, 1500);
  };

  const handleClose = () => {
    setSimulated(false);
    setCopied(false);
    setComplaint('');
    onClose();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FormOutlined style={{ color: '#4f46e5' }} />
          <span>Patient Intake Form</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={520}
      styles={{ body: { paddingTop: 16 } }}
    >
      <Text style={{ color: '#64748b', display: 'block', marginBottom: 20 }}>
        Generate a secure intake form link to send to new patients. Once submitted, a patient
        entry is automatically created in the system.
      </Text>

      {/* Steps preview */}
      <Steps
        size="small"
        current={simulated ? 2 : 0}
        style={{ marginBottom: 24 }}
        items={[
          { title: 'Generate Link', icon: <LinkOutlined /> },
          { title: 'Patient Fills Form', icon: <FormOutlined /> },
          { title: 'Auto-Created', icon: <UserAddOutlined /> },
        ]}
      />

      {/* Link display */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 4,
          marginBottom: 16,
        }}
      >
        <Input
          value={formLink}
          readOnly
          style={{ border: 'none', background: 'transparent', fontSize: 13 }}
        />
        <Button
          icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
          type={copied ? 'primary' : 'default'}
          onClick={copyLink}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      {/* Primary Complaint — voice intake */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text strong style={{ fontSize: 13 }}>
            <AudioOutlined style={{ marginRight: 6, color: '#4f46e5' }} />
            Primary Complaint
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Voice intake</span>
            <VoiceMicButton onTranscript={handleTranscript} size="small" />
          </div>
        </div>
        <Input.TextArea
          rows={3}
          placeholder="Type or use the microphone to record patient's primary complaint…"
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          style={{ borderRadius: 10, fontSize: 13 }}
        />
        {complaint && (
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: '#6366f1',
            }}
          >
            <AudioOutlined style={{ fontSize: 10 }} />
            <span>MedASR transcript • will be added to patient HPI</span>
          </div>
        )}
      </div>

      {/* Form preview */}
      <div
        style={{
          background: '#fafbfc',
          border: '1px dashed #d1d5db',
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <Text strong style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
          Form Fields Preview
        </Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {['Full Name', 'Date of Birth', 'Gender', 'Phone', 'Email', 'Insurance ID', 'Primary Complaint', 'Medical History', 'Allergies', 'Current Medications'].map((field) => (
            <Tag
              key={field}
              style={{
                borderRadius: 6,
                ...(field === 'Primary Complaint' && complaint ? { color: '#4f46e5', borderColor: '#4f46e5', background: '#eef2ff' } : {}),
              }}
            >
              {field}{field === 'Primary Complaint' && complaint ? ' ✓' : ''}
            </Tag>
          ))}
        </div>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      <Button
        type="primary"
        icon={<UserAddOutlined />}
        onClick={simulateSubmission}
        loading={simulating}
        disabled={simulated}
        block
        size="large"
        style={{
          borderRadius: 10,
          height: 44,
          fontWeight: 600,
          background: simulated ? '#10b981' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
          border: 'none',
        }}
      >
        {simulated ? '✓ Patient Created Successfully' : 'Simulate Patient Submission'}
      </Button>
    </Modal>
  );
}
