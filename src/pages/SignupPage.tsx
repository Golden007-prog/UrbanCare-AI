import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getDashboardPath } from './UnauthorizedPage';
import { 
  Form, Input, Button, Select, Radio, Steps, Typography, Alert, 
  Row, Col, InputNumber, Space, Divider, message
} from 'antd';
import { 
  UserOutlined, MailOutlined, LockOutlined, MedicineBoxOutlined, 
  ExperimentOutlined, ShopOutlined, BankOutlined, ArrowLeftOutlined,
  ArrowRightOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;



const ROLE_CONFIG: Record<string, { 
  icon: React.ReactNode; label: string; color: string; gradient: string; description: string 
}> = {
  doctor: {
    icon: <MedicineBoxOutlined />,
    label: 'Doctor',
    color: '#4f46e5',
    gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)',
    description: 'Clinical practice & patient management',
  },
  patient: {
    icon: <UserOutlined />,
    label: 'Patient',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #059669, #10b981)',
    description: 'Health records & appointments',
  },
  laboratory: {
    icon: <ExperimentOutlined />,
    label: 'Laboratory',
    color: '#7c3aed',
    gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
    description: 'Lab results & diagnostics reporting',
  },
  pharmacist: {
    icon: <ShopOutlined />,
    label: 'Pharmacist',
    color: '#0891b2',
    gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)',
    description: 'Prescription management & billing',
  },
};

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  const handleRoleSelect = (r: string) => {
    setRole(r);
    setError(null);
  };

  const goToForm = () => {
    if (!role) {
      setError('Please select a role to continue.');
      return;
    }
    setStep(1);
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      const payload = { ...values, role };
      const newUser = await register(payload);
      message.success('Account created successfully!');
      navigate(getDashboardPath(newUser.role || role), { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Dynamic form fields based on role ──────────────────
  const renderFormFields = () => {
    const commonFields = (
      <>
        <Form.Item
          name="email"
          rules={[
            { required: true, message: 'Email is required' },
            { type: 'email', message: 'Enter a valid email' },
          ]}
        >
          <Input 
            prefix={<MailOutlined style={{ color: '#94a3b8' }} />} 
            placeholder="Email address" 
            size="large"
            style={inputStyle}
          />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[
            { required: true, message: 'Password is required' },
            { min: 6, message: 'Minimum 6 characters' },
          ]}
        >
          <Input.Password 
            prefix={<LockOutlined style={{ color: '#94a3b8' }} />} 
            placeholder="Password (min 6 chars)" 
            size="large"
            style={inputStyle}
          />
        </Form.Item>
      </>
    );

    switch (role) {
      case 'doctor':
        return (
          <>
            <Form.Item name="name" rules={[{ required: true, message: 'Name is required' }]}>
              <Input prefix={<MedicineBoxOutlined style={{ color: '#94a3b8' }} />} placeholder="Full Name (e.g. Dr. Jane Doe)" size="large" style={inputStyle} />
            </Form.Item>
            {commonFields}
            <Form.Item name="specialty" rules={[{ required: true, message: 'Specialization is required' }]}>
              <Select placeholder="Specialization" size="large">
                <Option value="Cardiology">Cardiology</Option>
                <Option value="Neurology">Neurology</Option>
                <Option value="Orthopedics">Orthopedics</Option>
                <Option value="Pediatrics">Pediatrics</Option>
                <Option value="Dermatology">Dermatology</Option>
                <Option value="General Medicine">General Medicine</Option>
                <Option value="Radiology">Radiology</Option>
                <Option value="Surgery">Surgery</Option>
                <Option value="Oncology">Oncology</Option>
                <Option value="Psychiatry">Psychiatry</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>
            <Form.Item name="hospital_id">
              <Select placeholder="Hospital (optional)" size="large" allowClear>
                <Option value="H001">UrbanCare Medical Center</Option>
                <Option value="H002">City General Hospital</Option>
                <Option value="H003">Green Valley Clinic</Option>
              </Select>
            </Form.Item>
          </>
        );
      case 'patient':
        return (
          <>
            <Form.Item name="name" rules={[{ required: true, message: 'Name is required' }]}>
              <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="Full Name" size="large" style={inputStyle} />
            </Form.Item>
            {commonFields}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="age" rules={[{ required: true, message: 'Age is required' }]}>
                  <InputNumber placeholder="Age" size="large" min={0} max={150} style={{ width: '100%', borderRadius: 10 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="gender" rules={[{ required: true, message: 'Gender is required' }]}>
                  <Select placeholder="Gender" size="large">
                    <Option value="Male">Male</Option>
                    <Option value="Female">Female</Option>
                    <Option value="Other">Other</Option>
                    <Option value="Prefer not to say">Prefer not to say</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </>
        );
      case 'laboratory':
        return (
          <>
            <Form.Item name="name" rules={[{ required: true, message: 'Lab name is required' }]}>
              <Input prefix={<ExperimentOutlined style={{ color: '#94a3b8' }} />} placeholder="Lab Name" size="large" style={inputStyle} />
            </Form.Item>
            {commonFields}
            <Form.Item name="address" rules={[{ required: true, message: 'Address is required' }]}>
              <Input.TextArea placeholder="Lab Address" rows={2} style={{ borderRadius: 10 }} />
            </Form.Item>
          </>
        );
      case 'pharmacist':
        return (
          <>
            <Form.Item name="name" rules={[{ required: true, message: 'Pharmacy name is required' }]}>
              <Input prefix={<ShopOutlined style={{ color: '#94a3b8' }} />} placeholder="Pharmacy Name" size="large" style={inputStyle} />
            </Form.Item>
            {commonFields}
            <Form.Item name="address" rules={[{ required: true, message: 'Address is required' }]}>
              <Input.TextArea placeholder="Pharmacy Address" rows={2} style={{ borderRadius: 10 }} />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.bgCircle1} />
      <div style={styles.bgCircle2} />

      <div style={styles.card}>
        {/* ── Branding ── */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
            <div style={styles.logoIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <Title level={3} style={{ margin: 0, color: '#1e293b', fontWeight: 700, letterSpacing: '-0.02em' }}>
              UrbanCare <span style={{ fontWeight: 400, color: '#818cf8' }}>AI</span>
            </Title>
          </div>
          <Text style={{ color: '#64748b', fontSize: 14 }}>Create your account</Text>
        </div>

        {/* ── Steps indicator ── */}
        <Steps 
          current={step}
          size="small"
          style={{ marginBottom: 24 }}
          items={[
            { title: 'Select Role' },
            { title: 'Your Details' },
          ]}
        />

        {error && (
          <Alert 
            message={error} 
            type="error" 
            showIcon 
            closable 
            onClose={() => setError(null)} 
            style={{ marginBottom: 16, borderRadius: 10 }} 
          />
        )}

        {/* ── Step 1: Role Selection ── */}
        {step === 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                <div
                  key={key}
                  onClick={() => handleRoleSelect(key)}
                  style={{
                    border: role === key ? `2px solid ${cfg.color}` : '2px solid #e2e8f0',
                    borderRadius: 14,
                    padding: '20px 16px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    background: role === key ? `${cfg.color}08` : 'white',
                    transform: role === key ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: role === key ? `0 0 0 1px ${cfg.color}20, 0 4px 12px ${cfg.color}15` : '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, margin: '0 auto 10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: role === key ? cfg.gradient : '#f1f5f9',
                    color: role === key ? 'white' : cfg.color,
                    fontSize: 22, transition: 'all 0.2s ease',
                  }}>
                    {cfg.icon}
                  </div>
                  <Text strong style={{ display: 'block', color: '#1e293b', fontSize: 15 }}>{cfg.label}</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 11 }}>{cfg.description}</Text>
                </div>
              ))}
            </div>

            <Button 
              type="primary" 
              block 
              size="large" 
              onClick={goToForm}
              disabled={!role}
              icon={<ArrowRightOutlined />}
              style={{
                height: 46, borderRadius: 10, fontWeight: 600,
                background: role ? ROLE_CONFIG[role]?.gradient : '#e2e8f0',
                border: 'none',
                boxShadow: role ? `0 2px 12px ${ROLE_CONFIG[role]?.color}30` : 'none',
              }}
            >
              Continue as {role ? ROLE_CONFIG[role]?.label : '...'}
            </Button>
          </>
        )}

        {/* ── Step 2: Dynamic Form ── */}
        {step === 1 && (
          <>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
              padding: '8px 12px', borderRadius: 8, 
              background: `${ROLE_CONFIG[role]?.color}08`,
              border: `1px solid ${ROLE_CONFIG[role]?.color}20`,
            }}>
              <div style={{ 
                width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: ROLE_CONFIG[role]?.gradient, color: 'white', fontSize: 14,
              }}>
                {ROLE_CONFIG[role]?.icon}
              </div>
              <Text strong style={{ fontSize: 13, color: ROLE_CONFIG[role]?.color }}>
                Registering as {ROLE_CONFIG[role]?.label}
              </Text>
            </div>

            <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
              {renderFormFields()}
              <Form.Item style={{ marginTop: 8 }}>
                <Space style={{ width: '100%' }} direction="vertical" size={8}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading} 
                    block 
                    size="large"
                    icon={<CheckCircleOutlined />}
                    style={{
                      height: 46, borderRadius: 10, fontWeight: 600,
                      background: ROLE_CONFIG[role]?.gradient,
                      border: 'none',
                      boxShadow: `0 2px 12px ${ROLE_CONFIG[role]?.color}30`,
                    }}
                  >
                    {loading ? 'Creating Account…' : 'Create Account'}
                  </Button>
                  <Button 
                    block 
                    size="large" 
                    onClick={() => { setStep(0); form.resetFields(); setError(null); }}
                    icon={<ArrowLeftOutlined />}
                    style={{ height: 42, borderRadius: 10 }}
                  >
                    Back to Role Selection
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}

        {/* ── Footer ── */}
        <Divider style={{ margin: '12px 0', fontSize: 13 }} />
        <div style={{ textAlign: 'center' }}>
          <Text style={{ color: '#64748b', fontSize: 13 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#4f46e5', fontWeight: 600 }}>
              Sign In
            </Link>
          </Text>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { borderRadius: 10, height: 44 };

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 40%, #e0e7ff 100%)',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: '"Inter", system-ui, sans-serif',
    padding: '40px 16px',
  },
  bgCircle1: {
    position: 'absolute', width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
    top: -120, right: -100, pointerEvents: 'none' as const,
  },
  bgCircle2: {
    position: 'absolute', width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 70%)',
    bottom: -80, left: -60, pointerEvents: 'none' as const,
  },
  card: {
    width: 500, maxWidth: '94vw', background: '#ffffff', borderRadius: 20,
    padding: '36px 32px 24px', boxShadow: '0 4px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0', position: 'relative' as const, zIndex: 1,
  },
  logoIcon: {
    width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', border: '1px solid #c7d2fe',
  },
};
