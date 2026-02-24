import React, { useState } from 'react';
import { Modal, Button, Typography } from 'antd';
import {
  MedicineBoxOutlined,
  UserOutlined,
  ExperimentOutlined,
  MedicineBoxFilled,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface GoogleRoleModalProps {
  visible: boolean;
  googleData: { googleId: string; email: string; name: string } | null;
  onComplete: (role: string) => Promise<void>;
  onCancel: () => void;
}

const ROLE_OPTIONS = [
  {
    key: 'doctor',
    label: 'Doctor',
    icon: <MedicineBoxOutlined style={{ fontSize: 22 }} />,
    color: '#059669',
    gradient: 'linear-gradient(135deg, #059669, #10b981)',
    desc: 'Clinical dashboard, patient management',
  },
  {
    key: 'patient',
    label: 'Patient',
    icon: <UserOutlined style={{ fontSize: 22 }} />,
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    desc: 'View reports, book appointments',
  },
  {
    key: 'laboratory',
    label: 'Laboratory',
    icon: <ExperimentOutlined style={{ fontSize: 22 }} />,
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    desc: 'Upload lab results, manage tests',
  },
  {
    key: 'pharmacist',
    label: 'Pharmacist',
    icon: <MedicineBoxFilled style={{ fontSize: 22 }} />,
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444, #f87171)',
    desc: 'Dispense medications, billing',
  },
];

export default function GoogleRoleModal({
  visible,
  googleData,
  onComplete,
  onCancel,
}: GoogleRoleModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (role: string) => {
    setLoading(role);
    try {
      await onComplete(role);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      centered
      closable
      width={440}
      styles={{
        body: { padding: '32px 28px 24px' },
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            border: '1px solid #c7d2fe',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
          Select Your Role
        </Title>
        {googleData && (
          <Text style={{ color: '#64748b', fontSize: 13 }}>
            Welcome, {googleData.name || googleData.email}
          </Text>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ROLE_OPTIONS.map((opt) => (
          <Button
            key={opt.key}
            block
            size="large"
            loading={loading === opt.key}
            disabled={loading !== null && loading !== opt.key}
            onClick={() => handleSelect(opt.key)}
            style={{
              height: 60,
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              textAlign: 'left',
              padding: '0 18px',
              transition: 'all 0.2s ease',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: opt.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0,
              }}
            >
              {opt.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>
                {opt.desc}
              </div>
            </div>
          </Button>
        ))}
      </div>
    </Modal>
  );
}
