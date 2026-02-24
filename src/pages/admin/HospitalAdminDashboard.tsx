import React, { useEffect, useState } from 'react';
import { 
  Layout, Typography, Card, Row, Col, Table, Switch, Button, 
  Space, Form, Input, Select, Badge, message, Spin, Tabs, Statistic,
  Tag, Modal, Tooltip, Progress
} from 'antd';
import { 
  SafetyCertificateOutlined, 
  ApiOutlined, 
  DesktopOutlined, 
  CloudOutlined,
  LogoutOutlined,
  SyncOutlined,
  UserOutlined,
  PlusOutlined,
  LineChartOutlined,
  TeamOutlined,
  FileProtectOutlined,
  MedicineBoxOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  BarChartOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// ── Simple inline SVG bar chart ────────────────────────────
function MiniBarChart({ data, labels, color = '#4f46e5', height = 120 }: { data: number[]; labels: string[]; color?: string; height?: number }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ width: '100%', height, display: 'flex', alignItems: 'flex-end', gap: 4, padding: '0 4px' }}>
      {data.map((v, i) => (
        <Tooltip key={i} title={`${labels[i]}: ${v}`}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div
              style={{
                width: '100%',
                maxWidth: 40,
                height: `${(v / max) * (height - 24)}px`,
                background: `linear-gradient(180deg, ${color}, ${color}99)`,
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.3s ease',
                minHeight: 2,
              }}
            />
            <Text style={{ fontSize: 10, color: '#94a3b8' }}>{labels[i]}</Text>
          </div>
        </Tooltip>
      ))}
    </div>
  );
}

export default function HospitalAdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [hospitalUsers, setHospitalUsers] = useState<any[]>([]);
  const [hospitalMetrics, setHospitalMetrics] = useState<any>(null);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [logFilter, setLogFilter] = useState<{ userId?: string }>({});
  const [form] = Form.useForm();
  const [userForm] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      
      const [settingsRes, agentsRes, logsRes, usersRes, metricsRes] = await Promise.all([
        fetch(`${API_URL}/api/hospital-admin/settings`, { credentials: 'include' }),
        fetch(`${API_URL}/api/hospital-admin/agents`, { credentials: 'include' }),
        fetch(`${API_URL}/api/hospital-admin/audit-logs`, { credentials: 'include' }),
        fetch(`${API_URL}/api/hospital-admin/users`, { credentials: 'include' }),
        fetch(`${API_URL}/api/hospital-admin/metrics`, { credentials: 'include' }),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.data);
        form.setFieldsValue({
          offline_mode_enabled: data.data.offline_mode_enabled,
          model_preference: data.data.model_preference,
        });
      }
      
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data.data);
      }

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.data);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setHospitalUsers(data.data);
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setHospitalMetrics(data.data);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
      message.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (values: any) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const res = await fetch(`${API_URL}/api/hospital-admin/settings/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success('Settings updated successfully');
        fetchData();
        form.setFieldsValue({ hf_token: '', gemini_api_key: '' });
      } else {
        message.error('Failed to update settings');
      }
    } catch (err) {
      message.error('Error updating settings');
    }
  };

  const restartAgent = async (agentName: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const res = await fetch(`${API_URL}/api/hospital-admin/agents/${agentName}/restart`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        message.success(`Agent ${agentName} restarted`);
        fetchData();
      }
    } catch (err) {
      message.error('Failed to restart agent');
    }
  };

  const handleCreateUser = async (values: any) => {
    try {
      setCreatingUser(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const res = await fetch(`${API_URL}/api/hospital-admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success('User created successfully');
        setUserModalVisible(false);
        userForm.resetFields();
        fetchData();
      } else {
        const data = await res.json();
        message.error(data.error || 'Failed to create user');
      }
    } catch (err) {
      message.error('Network error');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading || !settings) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <Spin size="large" />
      </div>
    );
  }

  // ── Agent Health Table ──────────────────────────────────
  const agentColumns = [
    { title: 'Agent Name', dataIndex: 'agent_name', key: 'name', render: (n: string) => <Text strong>{n}</Text> },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; badge: 'success' | 'warning' | 'error' }> = {
          active: { color: 'green', badge: 'success' },
          idle: { color: 'gold', badge: 'warning' },
          failed: { color: 'red', badge: 'error' },
        };
        const c = config[status] || config.idle;
        return <Badge status={c.badge} text={<Tag color={c.color}>{status.toUpperCase()}</Tag>} />;
      }
    },
    { title: 'Last Run', dataIndex: 'last_run', key: 'run', render: (d: string) => new Date(d).toLocaleString() },
    { title: 'Latency (ms)', dataIndex: 'avg_latency_ms', key: 'latency', render: (v: number) => {
      const color = v < 200 ? '#22c55e' : v < 500 ? '#eab308' : '#ef4444';
      return <Text style={{ color, fontWeight: 600 }}>{v}</Text>;
    }},
    { title: 'Errors', dataIndex: 'error_message', key: 'errors', render: (e: string) => e ? <Text type="danger" style={{ fontSize: 12 }}>{e}</Text> : <Text type="secondary">—</Text> },
    { 
      title: 'Action', 
      key: 'action', 
      render: (_: any, record: any) => (
        <Button size="small" icon={<SyncOutlined />} onClick={() => restartAgent(record.agent_name)}>
          Restart
        </Button>
      )
    },
  ];

  // ── Audit Log Table ─────────────────────────────────────
  const filteredLogs = logFilter.userId 
    ? logs.filter(l => l.user_id === logFilter.userId) 
    : logs;

  const logColumns = [
    { title: 'Timestamp', dataIndex: 'timestamp', key: 'time', render: (d: string) => new Date(d).toLocaleString(), width: 180 },
    { title: 'Event', dataIndex: 'event_type', key: 'event', render: (e: string) => <Tag>{e}</Tag> },
    { title: 'Message', dataIndex: 'message', key: 'message' },
    { title: 'User ID', dataIndex: 'user_id', key: 'user', render: (u: string) => u || '—' },
    { title: 'Patient ID', dataIndex: 'patient_id', key: 'patient', render: (p: string) => p || '—' },
  ];

  // ── User Management Table ───────────────────────────────
  const userColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (n: string) => <Text strong>{n}</Text> },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { 
      title: 'Role', 
      dataIndex: 'role', 
      key: 'role',
      render: (role: string) => {
        const colors: Record<string, string> = { doctor: 'blue', lab: 'purple', pharmacist: 'cyan', hospital_admin: 'gold', family: 'green' };
        return <Tag color={colors[role] || 'default'}>{role.toUpperCase()}</Tag>;
      }
    },
    { title: 'Specialty', dataIndex: 'specialty', key: 'specialty', render: (s: string) => s || '—' },
    { title: 'Joined', dataIndex: 'createdAt', key: 'joined', render: (d: string) => new Date(d).toLocaleDateString() },
  ];

  // Counts
  const activeCount = agents.filter(a => a.status === 'active').length;
  const failedCount = agents.filter(a => a.status === 'failed').length;

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={4} style={{ color: 'white', margin: 0 }}>
          <SafetyCertificateOutlined /> Hospital Control Center
        </Title>
        <Space>
          <Tag color="cyan">{user?.hospitalID}</Tag>
          <Text style={{ color: 'rgba(255,255,255,0.85)' }}>{user?.name}</Text>
          <Button type="text" style={{ color: 'white' }} icon={<LogoutOutlined />} onClick={handleLogout}>
            Logout
          </Button>
        </Space>
      </Header>
      
      <Content style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        <Tabs defaultActiveKey="1" type="card" items={[
          {
            key: '1',
            label: <span><ApiOutlined /> Model & API Settings</span>,
            children: (
              <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                  <Card title="API Keys (AES-256 Encrypted)" style={{ borderTop: '3px solid #6366f1' }}>
                    <Form form={form} layout="vertical" onFinish={handleUpdateSettings}>
                      <Form.Item label="HuggingFace Token" name="hf_token">
                        <Input.Password placeholder={settings.hasHfToken ? '••••••••••••••••' : 'Enter new HF token'} />
                      </Form.Item>
                      <Form.Item label="Gemini API Key" name="gemini_api_key">
                        <Input.Password placeholder={settings.hasGeminiKey ? '••••••••••••••••' : 'Enter new Gemini key'} />
                      </Form.Item>
                      <Form.Item>
                         <Button type="primary" htmlType="submit" icon={<SafetyCertificateOutlined />}>Save Keys Securely</Button>
                      </Form.Item>
                    </Form>
                  </Card>
                </Col>
                
                <Col xs={24} md={12}>
                  <Card title="Edge / Cloud Model Configuration" style={{ borderTop: '3px solid #22c55e' }}>
                    <Form form={form} layout="vertical" onFinish={handleUpdateSettings}>
                      <Form.Item label="Force Offline Clinic Mode" name="offline_mode_enabled" valuePropName="checked">
                        <Switch checkedChildren={<DesktopOutlined />} unCheckedChildren={<CloudOutlined />} />
                      </Form.Item>
                      
                      <Form.Item label="Default Multimodal Model">
                        <Select defaultValue={settings.model_preference} onChange={(v) => form.setFieldsValue({ model_preference: v })}>
                          <Select.OptGroup label="MedGemma (Multimodal)">
                            <Select.Option value="medgemma-4b-it">MedGemma 4B IT</Select.Option>
                            <Select.Option value="medgemma-4b-it">MedGemma 4B IT (Fast)</Select.Option>
                          </Select.OptGroup>
                          <Select.OptGroup label="TxGemma (Text)">
                            <Select.Option value="txgemma-27b">TxGemma 27B (Heavy)</Select.Option>
                            <Select.Option value="txgemma-9b">TxGemma 9B (Standard)</Select.Option>
                            <Select.Option value="txgemma-2b">TxGemma 2B (Edge / Offline)</Select.Option>
                          </Select.OptGroup>
                        </Select>
                      </Form.Item>
                      <Form.Item>
                         <Button type="primary" htmlType="submit">Apply Policy</Button>
                      </Form.Item>
                    </Form>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Offline mode forces TxGemma-2B + MedGemma-4B quantized. Gemini calls disabled.
                    </Text>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: '2',
            label: <span><DesktopOutlined /> Agent Health ({agents.length})</span>,
            children: (
              <>
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Card><Statistic title="Active" value={activeCount} valueStyle={{ color: '#22c55e' }} prefix={<ThunderboltOutlined />} /></Card>
                  </Col>
                  <Col span={6}>
                    <Card><Statistic title="Failed" value={failedCount} valueStyle={{ color: '#ef4444' }} prefix={<WarningOutlined />} /></Card>
                  </Col>
                  <Col span={6}>
                    <Card><Statistic title="Idle" value={agents.length - activeCount - failedCount} valueStyle={{ color: '#eab308' }} /></Card>
                  </Col>
                  <Col span={6}>
                    <Card><Statistic title="Avg Latency" value={hospitalMetrics?.avgLatencyMs || 0} suffix="ms" /></Card>
                  </Col>
                </Row>
                <Card>
                  <Table 
                    dataSource={agents} 
                    columns={agentColumns} 
                    rowKey="agent_name"
                    pagination={{ pageSize: 10 }}
                    size="middle"
                  />
                </Card>
              </>
            ),
          },
          {
            key: '3',
            label: <span><TeamOutlined /> User Management</span>,
            children: (
              <Card 
                title={`Hospital Staff (${hospitalUsers.length} accounts)`}
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setUserModalVisible(true)}>
                    Add Staff
                  </Button>
                }
              >
                <Table 
                  dataSource={hospitalUsers} 
                  columns={userColumns} 
                  rowKey="id" 
                  pagination={{ pageSize: 10 }} 
                  size="middle"
                />
              </Card>
            ),
          },
          {
            key: '4',
            label: <span><SafetyCertificateOutlined /> Audit Logs</span>,
            children: (
              <>
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                   <Col span={8}>
                     <Card><Statistic title="Total Patients" value={hospitalMetrics?.patientsCount || 0} prefix={<MedicineBoxOutlined />} /></Card>
                   </Col>
                   <Col span={8}>
                     <Card><Statistic title="Reports Uploaded" value={hospitalMetrics?.reportsUploaded || 0} prefix={<FileProtectOutlined />} /></Card>
                   </Col>
                   <Col span={8}>
                     <Card><Statistic title="Total Users" value={hospitalMetrics?.totalUsers || 0} prefix={<UserOutlined />} /></Card>
                   </Col>
                </Row>
                <Card 
                  title="System Audit Trail"
                  extra={
                    <Space>
                      <Select 
                        placeholder="Filter by user" 
                        allowClear 
                        style={{ width: 200 }}
                        onChange={(v) => setLogFilter({ userId: v })}
                      >
                        {Array.from(new Set(logs.map(l => l.user_id).filter(Boolean))).map(uid => (
                          <Select.Option key={uid} value={uid}>{uid}</Select.Option>
                        ))}
                      </Select>
                    </Space>
                  }
                >
                  <Table 
                    dataSource={filteredLogs} 
                    columns={logColumns} 
                    rowKey="id" 
                    pagination={{ pageSize: 10 }} 
                    size="small"
                  />
                </Card>
              </>
            ),
          },
          {
            key: '5',
            label: <span><BarChartOutlined /> Analytics</span>,
            children: hospitalMetrics ? (
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Card title={<><LineChartOutlined /> AI Calls Per Day</>}>
                    <MiniBarChart data={hospitalMetrics.aiCallsPerDay} labels={hospitalMetrics.dayLabels} color="#4f46e5" height={140} />
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title="Staff Breakdown">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Doctors</Text>
                        <Tag color="blue">{hospitalMetrics.doctors}</Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Lab Technicians</Text>
                        <Tag color="purple">{hospitalMetrics.labs}</Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Pharmacists</Text>
                        <Tag color="cyan">{hospitalMetrics.pharmacists}</Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                        <Text strong>Total</Text>
                        <Text strong>{hospitalMetrics.totalUsers}</Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
              </Row>
            ) : <Spin />,
          },
        ]} />
      </Content>

      {/* Add User Modal */}
      <Modal
        title="Add Staff Member"
        open={userModalVisible}
        onCancel={() => setUserModalVisible(false)}
        footer={null}
      >
        <Form form={userForm} layout="vertical" onFinish={handleCreateUser}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Dr. Jane Doe" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="e.g. jane@hospital.com" />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select placeholder="Select role">
              <Select.Option value="doctor">Doctor</Select.Option>
              <Select.Option value="lab">Lab Technician</Select.Option>
              <Select.Option value="pharmacist">Pharmacist</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="specialty" label="Specialty (for doctors)">
            <Input placeholder="e.g. Cardiology" />
          </Form.Item>
          <Form.Item name="password" label="Initial Password">
            <Input.Password placeholder="Default: urbancare123" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={creatingUser} block>
              Create Account
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
