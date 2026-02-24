import React, { useEffect, useState } from 'react';
import { 
  Layout, Typography, Card, Row, Col, Statistic, Table, Spin, Badge, Button, 
  Space, message, Modal, Form, Input, Select, Tabs, Tag, Progress, Tooltip
} from 'antd';
import { 
  BankOutlined, 
  ApiOutlined, 
  DashboardOutlined, 
  WarningOutlined,
  ThunderboltOutlined,
  LogoutOutlined,
  PlusOutlined,
  DollarOutlined,
  BarChartOutlined,
  CloudServerOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  LineChartOutlined,
  DatabaseOutlined,
  FieldTimeOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// ── Simple inline SVG bar chart ────────────────────────────
function MiniBarChart({ data, labels, color = '#4f46e5', height = 120 }: { data: number[]; labels: string[]; color?: string; height?: number }) {
  const max = Math.max(...data, 1);
  const barW = 100 / data.length;
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

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      
      const [metricsRes, hospitalsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/metrics`, { credentials: 'include' }),
        fetch(`${API_URL}/api/admin/hospitals`, { credentials: 'include' })
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.data);
      }
      
      if (hospitalsRes.ok) {
        const data = await hospitalsRes.json();
        setHospitals(data.data);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
      message.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCreateHospital = async (values: any) => {
    try {
      setCreating(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const res = await fetch(`${API_URL}/api/admin/hospitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success('Hospital created successfully');
        setModalVisible(false);
        form.resetFields();
        fetchData();
      } else {
        const data = await res.json();
        message.error(data.error || 'Failed to create hospital');
      }
    } catch (err) {
      message.error('Network error');
    } finally {
      setCreating(false);
    }
  };

  const handleSuspendToggle = async (hospitalId: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const res = await fetch(`${API_URL}/api/admin/hospitals/${hospitalId}/suspend`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        message.success(data.message);
        fetchData();
      }
    } catch (err) {
      message.error('Failed to update hospital status');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: 'Name', dataIndex: 'name', key: 'name', render: (name: string) => <Text strong>{name}</Text> },
    { title: 'Contact', dataIndex: 'contact_email', key: 'contact' },
    { 
      title: 'Plan', 
      dataIndex: 'subscription_plan', 
      key: 'plan', 
      render: (plan: string) => {
        const colors: Record<string, string> = { enterprise: 'purple', premium: 'gold', basic: 'blue' };
        return <Tag color={colors[plan] || 'default'}>{plan.toUpperCase()}</Tag>;
      }
    },
    { 
      title: 'Status', 
      key: 'status', 
      render: (_: any, record: any) => (
        record.suspended 
          ? <Badge status="error" text="Suspended" /> 
          : <Badge status="success" text="Active" />
      )
    },
    { 
      title: 'Action', 
      key: 'action', 
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" type="primary" ghost>Manage</Button>
          <Button 
            size="small" 
            danger={!record.suspended}
            type={record.suspended ? 'primary' : 'default'}
            icon={record.suspended ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
            onClick={() => handleSuspendToggle(record.id)}
          >
            {record.suspended ? 'Reactivate' : 'Suspend'}
          </Button>
        </Space>
      )
    },
  ];

  if (loading || !metrics) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header style={{ background: 'linear-gradient(135deg, #001529, #0f172a)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={4} style={{ color: 'white', margin: 0 }}>
          <DashboardOutlined /> UrbanCare Platform Admin
        </Title>
        <Space>
          <Tag color="gold" style={{ marginRight: 8 }}>SUPER ADMIN</Tag>
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
            label: <span><BankOutlined /> Overview</span>,
            children: (
              <>
                {/* KPI Cards */}
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderTop: '3px solid #4f46e5' }}>
                      <Statistic title="Total Hospitals" value={metrics.totalHospitals} prefix={<BankOutlined />} />
                      <Text type="secondary" style={{ fontSize: 12 }}>{metrics.activeHospitals} active</Text>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderTop: '3px solid #22c55e' }}>
                      <Statistic 
                        title="Active Agents" 
                        value={metrics.activeAgents} 
                        prefix={<ApiOutlined />} 
                        valueStyle={{ color: '#3f8600' }}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>{metrics.idleAgents} idle</Text>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderTop: `3px solid ${metrics.failedAgents > 0 ? '#ef4444' : '#22c55e'}` }}>
                      <Statistic 
                        title="Failed Agents" 
                        value={metrics.failedAgents} 
                        prefix={<WarningOutlined />} 
                        valueStyle={{ color: metrics.failedAgents > 0 ? '#cf1322' : '#3f8600' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderTop: '3px solid #eab308' }}>
                      <Statistic 
                        title="Avg Agent Latency" 
                        value={metrics.avgLatencyMs} 
                        suffix="ms" 
                        prefix={<ThunderboltOutlined />} 
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Hospital Table + Sidebar */}
                <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                  <Col xs={24} lg={16}>
                    <Card 
                      title="Registered Hospitals" 
                      extra={
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
                          Add Hospital
                        </Button>
                      }
                    >
                      <Table 
                        dataSource={hospitals} 
                        columns={columns} 
                        rowKey="id" 
                        pagination={{ pageSize: 5 }} 
                        size="middle"
                      />
                    </Card>
                  </Col>
                  
                  <Col xs={24} lg={8}>
                    <Card title={<><DollarOutlined /> API Cost Estimation (MTD)</>} style={{ marginBottom: 16 }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text>HuggingFace API</Text>
                          <Text>${metrics.apiCostEstimate.huggingface.toFixed(2)}</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text>Gemini API</Text>
                          <Text>${metrics.apiCostEstimate.gemini.toFixed(2)}</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text>Cloud Storage</Text>
                          <Text>${metrics.apiCostEstimate.storage.toFixed(2)}</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: 8, marginTop: 4 }}>
                          <Text strong>Total</Text>
                          <Text strong type="warning">${metrics.apiCostEstimate.total.toFixed(2)}</Text>
                        </div>
                      </Space>
                    </Card>

                    <Card title={<><ExperimentOutlined /> Model Usage Stats</>} style={{ marginBottom: 16 }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {Object.entries(metrics.modelUsage as Record<string, number>).map(([model, calls]) => {
                          const maxCalls = Math.max(...Object.values(metrics.modelUsage as Record<string, number>));
                          return (
                            <div key={model}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <Text style={{ fontSize: 12 }}>{model}</Text>
                                <Text style={{ fontSize: 12 }}>{calls} calls</Text>
                              </div>
                              <Progress 
                                percent={Math.round((calls / maxCalls) * 100)} 
                                showInfo={false} 
                                size="small"
                                strokeColor="#6366f1"
                              />
                            </div>
                          );
                        })}
                      </Space>
                    </Card>

                    <Card title="Global AI Health">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text>Model API Uptime</Text>
                          <Text type="success">99.99%</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text>Edge Nodes Active</Text>
                          <Text strong>4 / 4</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                </Row>
              </>
            ),
          },
          {
            key: '2',
            label: <span><BarChartOutlined /> System Metrics</span>,
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Card title={<><LineChartOutlined /> AI Calls Per Day</>}>
                    <MiniBarChart data={metrics.aiCallsPerDay} labels={metrics.dayLabels} color="#4f46e5" height={140} />
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title={<><WarningOutlined /> Agent Failures Per Day</>}>
                    <MiniBarChart data={metrics.agentFailuresPerDay} labels={metrics.dayLabels} color="#ef4444" height={140} />
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title={<><FieldTimeOutlined /> Avg Response Time (ms)</>}>
                    <MiniBarChart data={metrics.avgResponseTimePerDay} labels={metrics.dayLabels} color="#22c55e" height={140} />
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title={<><DatabaseOutlined /> Storage Usage (MB)</>}>
                    <MiniBarChart data={metrics.storageUsageMB} labels={metrics.dayLabels} color="#eab308" height={140} />
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]} />
      </Content>

      {/* Create Hospital Modal */}
      <Modal
        title="Create New Hospital"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateHospital}>
          <Form.Item name="name" label="Hospital Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. City Medical Center" />
          </Form.Item>
          <Form.Item name="address" label="Address" rules={[{ required: true }]}>
            <Input placeholder="e.g. 123 Healthcare Blvd" />
          </Form.Item>
          <Form.Item name="contact_email" label="Contact Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="e.g. admin@hospital.com" />
          </Form.Item>
          <Form.Item name="subscription_plan" label="Subscription Plan" initialValue="basic">
            <Select>
              <Select.Option value="basic">Basic</Select.Option>
              <Select.Option value="premium">Premium</Select.Option>
              <Select.Option value="enterprise">Enterprise</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={creating} block>
              Create Hospital
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
