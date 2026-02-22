import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, Switch, Typography } from 'antd';
import {
  BellOutlined,
  WifiOutlined,
  GlobalOutlined,
  SettingOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';
import type { MenuProps } from 'antd';

const { Text } = Typography;

interface SettingsDropdownProps {
  children: React.ReactNode;
  onOpenAuditLog?: () => void;
}

export function SettingsDropdown({ children, onOpenAuditLog }: SettingsDropdownProps) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useStore();

  const items: MenuProps['items'] = [
    {
      key: 'header',
      type: 'group',
      label: (
        <div style={{ padding: '2px 0 6px' }}>
          <Text strong style={{ fontSize: 13, color: '#1e293b' }}>
            <SettingOutlined style={{ marginRight: 6 }} />
            Quick Settings
          </Text>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'notifications',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 200 }}>
          <span>
            <BellOutlined style={{ marginRight: 8 }} />
            Notifications
          </span>
          <Switch
            size="small"
            checked={settings.notifications.criticalAlerts}
            onChange={(checked) => updateSettings({
              notifications: { ...settings.notifications, criticalAlerts: checked },
            } as any)}
            onClick={(_, e) => e.stopPropagation()}
          />
        </div>
      ),
    },
    {
      key: 'offline-mode',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 200 }}>
          <span>
            <WifiOutlined style={{ marginRight: 8 }} />
            Offline Clinic Mode
          </span>
          <Switch
            size="small"
            checked={settings.offlineMode}
            onChange={(checked) => updateSettings({ offlineMode: checked })}
            onClick={(_, e) => e.stopPropagation()}
          />
        </div>
      ),
    },
    {
      key: 'multilingual',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 200 }}>
          <span>
            <GlobalOutlined style={{ marginRight: 8 }} />
            Multilingual AI
          </span>
          <Switch
            size="small"
            checked={settings.multilingualExplanations}
            onChange={(checked) => updateSettings({ multilingualExplanations: checked })}
            onClick={(_, e) => e.stopPropagation()}
          />
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'audit-log',
      icon: <AuditOutlined />,
      label: 'Audit Log',
      onClick: () => onOpenAuditLog?.(),
    },
    {
      key: 'all-settings',
      icon: <SettingOutlined />,
      label: 'All Settings',
      onClick: () => navigate('/settings'),
    },
  ];

  return (
    <Dropdown
      menu={{ items, style: { minWidth: 260, borderRadius: 12, padding: 4 } }}
      trigger={['click']}
      placement="bottomRight"
    >
      {children}
    </Dropdown>
  );
}
