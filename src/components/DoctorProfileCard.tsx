import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, Modal, Descriptions, Tag, Typography } from 'antd';
import {
  UserOutlined,
  EditOutlined,
  MedicineBoxOutlined,
  SettingOutlined,
  LogoutOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../store/useStore';
import type { MenuProps } from 'antd';

const { Text } = Typography;

interface DoctorProfileCardProps {
  onOpenAuditLog?: () => void;
}

export function DoctorProfileCard({ onOpenAuditLog }: DoctorProfileCardProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { doctorProfile, hospitals, activeHospitalId } = useStore();
  const [hospitalModalOpen, setHospitalModalOpen] = useState(false);

  const activeHospital = hospitals.find((h) => h.id === activeHospitalId);

  // Use doctorProfile from store with fallback to auth user
  const displayName = doctorProfile.name || user?.name || 'Doctor';
  const displaySpecialty = doctorProfile.specialization || user?.specialty || 'Specialist';

  const initials = displayName
    .split(' ')
    .filter((_: string, i: number, a: string[]) => i === 0 || i === a.length - 1)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const items: MenuProps['items'] = [
    {
      key: 'header',
      type: 'group',
      label: (
        <div style={{ padding: '4px 0 8px' }}>
          <Text strong style={{ fontSize: 14 }}>{displayName}</Text>
          <br />
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>{user?.email}</Text>
          <br />
          <Text style={{ color: '#818cf8', fontSize: 11 }}>{activeHospital?.name}</Text>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'view-profile',
      icon: <UserOutlined />,
      label: 'View Profile',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'edit-profile',
      icon: <EditOutlined />,
      label: 'Edit Profile',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'hospital-info',
      icon: <MedicineBoxOutlined />,
      label: 'Hospital Info',
      onClick: () => setHospitalModalOpen(true),
    },
    { type: 'divider' },
    {
      key: 'audit-log',
      icon: <AuditOutlined />,
      label: 'Audit Log',
      onClick: () => onOpenAuditLog?.(),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <>
      <Dropdown
        menu={{ items, style: { minWidth: 220, borderRadius: 12, padding: 4 } }}
        trigger={['click']}
        placement="bottomRight"
      >
        <button
          className="flex items-center gap-3 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-slate-50 transition-colors"
          style={{ border: 'none', background: 'transparent' }}
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm ring-2 ring-indigo-100">
            {initials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-slate-900 leading-tight">
              {displayName}
            </p>
            <p className="text-xs text-slate-500 leading-tight">
              {displaySpecialty}
            </p>
          </div>
          <svg
            className="w-4 h-4 text-slate-400 hidden md:block"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </Dropdown>

      {/* Hospital Info Modal — now dynamic from store */}
      <Modal
        title="Hospital Information"
        open={hospitalModalOpen}
        onCancel={() => setHospitalModalOpen(false)}
        footer={null}
        width={500}
        styles={{ body: { paddingTop: 16 } }}
      >
        {activeHospital && (
          <Descriptions column={1} bordered size="small" labelStyle={{ fontWeight: 600, width: 140 }}>
            <Descriptions.Item label="Hospital">{activeHospital.name}</Descriptions.Item>
            <Descriptions.Item label="Department">{activeHospital.department}</Descriptions.Item>
            <Descriptions.Item label="Location">{activeHospital.location}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={activeHospital.status === 'Active' ? 'green' : 'red'}>
                {activeHospital.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Compliance">
              {activeHospital.compliance.map((c) => (
                <Tag key={c} color={c === 'HIPAA' ? 'blue' : 'purple'}>{c}</Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="Support">{activeHospital.support}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
}
