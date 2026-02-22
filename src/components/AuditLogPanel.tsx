import React from 'react';
import { Drawer, Table, Tag, Typography, Empty } from 'antd';
import { AuditOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useStore, AuditEntry } from '../store/useStore';

const { Text } = Typography;

interface AuditLogPanelProps {
  open: boolean;
  onClose: () => void;
}

const actionColors: Record<string, string> = {
  Login: 'green',
  Logout: 'red',
  'View Patient': 'blue',
  'Update Profile': 'purple',
  'Update Settings': 'orange',
  'Switch Hospital': 'cyan',
  'Generate Referral': 'geekblue',
  'Generate Intake Form': 'magenta',
};

export function AuditLogPanel({ open, onClose }: AuditLogPanelProps) {
  const { auditLog } = useStore();

  const columns = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (ts: string) => (
        <Text style={{ fontSize: 12, color: '#64748b' }}>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          {new Date(ts).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 160,
      render: (action: string) => (
        <Tag color={actionColors[action] || 'default'} style={{ borderRadius: 6 }}>
          {action}
        </Tag>
      ),
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      render: (details: string) => (
        <Text style={{ fontSize: 13, color: '#475569' }}>{details}</Text>
      ),
    },
    {
      title: 'Doctor',
      dataIndex: 'doctorName',
      key: 'doctorName',
      width: 160,
      render: (name: string) => (
        <Text style={{ fontSize: 13, fontWeight: 500 }}>{name}</Text>
      ),
    },
  ];

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AuditOutlined style={{ color: '#4f46e5', fontSize: 18 }} />
          <span>Audit Log</span>
        </div>
      }
      placement="right"
      width={720}
      open={open}
      onClose={onClose}
      styles={{ body: { padding: 0 } }}
    >
      {auditLog.length === 0 ? (
        <Empty
          description="No audit entries yet"
          style={{ marginTop: 80 }}
        />
      ) : (
        <Table<AuditEntry>
          dataSource={auditLog}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 15, size: 'small' }}
          size="small"
          style={{ margin: 16 }}
        />
      )}
    </Drawer>
  );
}
