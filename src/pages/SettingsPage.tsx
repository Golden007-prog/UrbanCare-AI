import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Switch, Divider, Typography, Button, Select, List, Tag } from 'antd';
import {
  ArrowLeftOutlined, BellOutlined, LockOutlined, GlobalOutlined,
  EyeOutlined, WifiOutlined, CloudOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const navigate = useNavigate();
  const { settings, updateSettings, updateNotificationSettings } = useStore();

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/dashboard')}
          style={{ marginBottom: 16, color: '#64748b' }}
        >
          Back to Dashboard
        </Button>

        <Title level={2} style={{ marginBottom: 4 }}>Settings</Title>
        <Text style={{ color: '#64748b', display: 'block', marginBottom: 28 }}>
          Configure your clinical dashboard preferences
        </Text>

        {/* Language selector */}
        <Card style={styles.card} bordered={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <GlobalOutlined style={{ color: '#4f46e5', fontSize: 18 }} />
              <div>
                <Text strong>Language</Text>
                <br />
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Dashboard display language</Text>
              </div>
            </div>
            <Select
              value={settings.language}
              onChange={(v) => updateSettings({ language: v })}
              style={{ width: 160 }}
              options={[
                { value: 'en', label: '🇺🇸 English' },
                { value: 'es', label: '🇪🇸 Español' },
                { value: 'hi', label: '🇮🇳 हिन्दी' },
                { value: 'bn', label: '🇧🇩 বাংলা' },
                { value: 'fr', label: '🇫🇷 Français' },
              ]}
            />
          </div>
        </Card>

        {/* Offline Clinic Mode */}
        <Card style={{ ...styles.card, marginTop: 16 }} bordered={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {settings.offlineMode ? (
                <CloudOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
              ) : (
                <WifiOutlined style={{ color: '#10b981', fontSize: 18 }} />
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong>Offline Clinic Mode</Text>
                  {settings.offlineMode && (
                    <Tag color="warning" style={{ borderRadius: 6 }}>Active</Tag>
                  )}
                </div>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                  Work without internet connection. Data syncs when back online.
                </Text>
              </div>
            </div>
            <Switch
              checked={settings.offlineMode}
              onChange={(checked) => updateSettings({ offlineMode: checked })}
            />
          </div>
        </Card>

        {/* Multilingual AI Explanations */}
        <Card style={{ ...styles.card, marginTop: 16 }} bordered={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <GlobalOutlined style={{ color: '#8b5cf6', fontSize: 18 }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong>Multilingual Patient Explanations</Text>
                  {settings.multilingualExplanations && (
                    <Tag color="purple" style={{ borderRadius: 6 }}>On</Tag>
                  )}
                </div>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                  Show AI-translated explanations in Hindi/Bengali for patients
                </Text>
              </div>
            </div>
            <Switch
              checked={settings.multilingualExplanations}
              onChange={(checked) => updateSettings({ multilingualExplanations: checked })}
            />
          </div>
        </Card>

        {/* Notifications */}
        <Card style={{ ...styles.card, marginTop: 16 }} bordered={false}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BellOutlined style={{ color: '#4f46e5' }} />
            <Title level={5} style={{ margin: 0 }}>Notifications</Title>
          </div>
          <List
            dataSource={[
              {
                label: 'Critical vital alerts',
                description: 'Receive alerts when patient vitals are critical',
                key: 'criticalAlerts' as const,
              },
              {
                label: 'New patient assignments',
                description: 'Notify when new patients are assigned',
                key: 'newPatients' as const,
              },
              {
                label: 'AI report summaries',
                description: 'Daily AI-generated patient summaries',
                key: 'aiSummaries' as const,
              },
            ]}
            renderItem={(item) => (
              <List.Item style={{ padding: '12px 0', border: 'none' }}>
                <div style={{ flex: 1 }}>
                  <Text strong>{item.label}</Text>
                  <br />
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>{item.description}</Text>
                </div>
                <Switch
                  checked={settings.notifications[item.key]}
                  onChange={(checked) => updateNotificationSettings({ [item.key]: checked })}
                />
              </List.Item>
            )}
          />
        </Card>

        {/* Privacy & Security */}
        <Card style={{ ...styles.card, marginTop: 16 }} bordered={false}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <LockOutlined style={{ color: '#4f46e5' }} />
            <Title level={5} style={{ margin: 0 }}>Privacy & Security</Title>
          </div>
          <List
            dataSource={[
              {
                label: 'Two-factor authentication',
                description: 'Add an extra layer of security',
                value: settings.twoFactorAuth,
                key: 'twoFactorAuth',
              },
              {
                label: 'Session timeout (30 min)',
                description: 'Auto-logout after inactivity',
                value: settings.sessionTimeout,
                key: 'sessionTimeout',
              },
              {
                label: 'Audit logging',
                description: 'Log all access to patient records',
                value: settings.auditLogging,
                key: 'auditLogging',
              },
            ]}
            renderItem={(item) => (
              <List.Item style={{ padding: '12px 0', border: 'none' }}>
                <div style={{ flex: 1 }}>
                  <Text strong>{item.label}</Text>
                  <br />
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>{item.description}</Text>
                </div>
                <Switch
                  checked={item.value}
                  onChange={(checked) => updateSettings({ [item.key]: checked })}
                />
              </List.Item>
            )}
          />
        </Card>

        {/* Display */}
        <Card style={{ ...styles.card, marginTop: 16 }} bordered={false}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <EyeOutlined style={{ color: '#4f46e5' }} />
            <Title level={5} style={{ margin: 0 }}>Display</Title>
          </div>
          <List
            dataSource={[
              {
                label: 'Compact vital cards',
                description: 'Show condensed vital sign cards',
                value: settings.compactVitals,
                key: 'compactVitals',
              },
              {
                label: 'Show trend charts',
                description: 'Display trend data on vital cards',
                value: settings.showTrends,
                key: 'showTrends',
              },
            ]}
            renderItem={(item) => (
              <List.Item style={{ padding: '12px 0', border: 'none' }}>
                <div style={{ flex: 1 }}>
                  <Text strong>{item.label}</Text>
                  <br />
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>{item.description}</Text>
                </div>
                <Switch
                  checked={item.value}
                  onChange={(checked) => updateSettings({ [item.key]: checked })}
                />
              </List.Item>
            )}
          />
        </Card>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text style={{ color: '#cbd5e1', fontSize: 12 }}>
            Settings are stored locally and will sync when connected
          </Text>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: 40,
    fontFamily: '"Inter", system-ui, sans-serif',
  },
  container: {
    maxWidth: 680,
    margin: '0 auto',
  },
  card: {
    borderRadius: 16,
    boxShadow: '0 2px 20px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
  },
};
