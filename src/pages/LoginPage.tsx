import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Divider, Alert, Typography } from 'antd';
import {
  MailOutlined,
  LockOutlined,
  GoogleOutlined,
  DashboardOutlined,
  BankOutlined,
  MedicineBoxOutlined,
  UserOutlined,
  ExperimentOutlined,
  MedicineBoxFilled,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from './UnauthorizedPage';
import GoogleRoleModal from '../components/GoogleRoleModal';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { login, demoLogin, googleLogin, pendingGoogleUser, completeGoogleSignup, clearPendingGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { email: string; password: string; remember: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      await login(values.email, values.password, values.remember);
      // Fetch current user to determine role-based redirect
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';
      const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        navigate(getDashboardPath(data.user.role), { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: string, label: string) => {
    setDemoLoading(label);
    setError(null);
    try {
      await demoLogin(role);
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';
      const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        navigate(getDashboardPath(data.user.role), { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(`Demo login failed for ${label}. ${err.message || 'Is the server running?'}`);
    } finally {
      setDemoLoading(null);
    }
  };

  const handleGoogleRoleSelect = async (role: string) => {
    if (!pendingGoogleUser) return;
    try {
      await completeGoogleSignup({ ...pendingGoogleUser, role });
      navigate(getDashboardPath(role), { replace: true });
    } catch (err: any) {
      setError(err.message || 'Google signup failed.');
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* Decorative background shapes */}
      <div style={styles.bgCircle1} />
      <div style={styles.bgCircle2} />

      <div style={styles.card}>
        {/* ── Branding ── */}
        <div style={styles.brandSection}>
          <div style={styles.logoRow}>
            <div style={styles.logoIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <Title level={3} style={styles.brandTitle}>
              UrbanCare <span style={{ fontWeight: 400, color: '#818cf8' }}>AI</span>
            </Title>
          </div>
          <Text style={styles.subtitle}>Clinical Dashboard — Secure Access</Text>
        </div>

        {/* ── Error ── */}
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 20, borderRadius: 10 }}
          />
        )}

        {/* ── Email Login Form ── */}
        <Form
          name="login"
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ remember: true }}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Email"
              autoComplete="email"
              style={styles.input}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Password"
              autoComplete="current-password"
              style={styles.input}
            />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>Remember me</Checkbox>
              </Form.Item>
              <a href="#" style={{ color: '#4f46e5', fontSize: 13 }}>
                Forgot password?
              </a>
            </div>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={styles.loginBtn}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </Form.Item>
        </Form>

        {/* ── Divider ── */}
        <Divider style={{ margin: '4px 0 16px', color: '#94a3b8', fontSize: 13 }}>
          or continue with
        </Divider>

        {/* ── Google Login ── */}
        <Button
          block
          size="large"
          icon={<GoogleOutlined />}
          onClick={googleLogin}
          style={styles.googleBtn}
        >
          Sign in with Google
        </Button>

        {/* ── Demo Login Buttons ── */}
        <Divider style={{ margin: '16px 0 12px', color: '#94a3b8', fontSize: 12 }}>
          🔬 Demo Access
        </Divider>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            size="middle"
            loading={demoLoading === 'super_admin'}
            onClick={() => handleDemoLogin('SUPER_ADMIN', 'super_admin')}
            icon={<DashboardOutlined />}
            style={{
              ...styles.demoBtn,
              flex: '1 1 calc(33.33% - 6px)',
              background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
              color: 'white',
              border: 'none',
            }}
          >
            Super Admin
          </Button>
          <Button
            size="middle"
            loading={demoLoading === 'hospital_admin'}
            onClick={() => handleDemoLogin('HOSPITAL_ADMIN', 'hospital_admin')}
            icon={<BankOutlined />}
            style={{
              ...styles.demoBtn,
              flex: '1 1 calc(33.33% - 6px)',
              background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
              color: 'white',
              border: 'none',
            }}
          >
            Hospital Admin
          </Button>
          <Button
            size="middle"
            loading={demoLoading === 'doctor'}
            onClick={() => handleDemoLogin('DOCTOR', 'doctor')}
            icon={<MedicineBoxOutlined />}
            style={{
              ...styles.demoBtn,
              flex: '1 1 calc(33.33% - 6px)',
              background: 'linear-gradient(135deg, #059669, #10b981)',
              color: 'white',
              border: 'none',
            }}
          >
            Doctor
          </Button>
          <Button
            size="middle"
            loading={demoLoading === 'patient'}
            onClick={() => handleDemoLogin('PATIENT', 'patient')}
            icon={<UserOutlined />}
            style={{
              ...styles.demoBtn,
              flex: '1 1 calc(33.33% - 6px)',
              background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
              color: 'white',
              border: 'none',
            }}
          >
            Patient
          </Button>
          <Button
            size="middle"
            loading={demoLoading === 'lab'}
            onClick={() => handleDemoLogin('LAB', 'lab')}
            icon={<ExperimentOutlined />}
            style={{
              ...styles.demoBtn,
              flex: '1 1 calc(33.33% - 6px)',
              background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
              color: 'white',
              border: 'none',
            }}
          >
            Laboratory
          </Button>
          <Button
            size="middle"
            loading={demoLoading === 'pharmacist'}
            onClick={() => handleDemoLogin('PHARMACIST', 'pharmacist')}
            icon={<MedicineBoxFilled />}
            style={{
              ...styles.demoBtn,
              flex: '1 1 calc(33.33% - 6px)',
              background: 'linear-gradient(135deg, #ef4444, #f87171)',
              color: 'white',
              border: 'none',
            }}
          >
            Pharmacist
          </Button>
        </div>

        {/* ── Footer ── */}
        <div style={styles.footer}>
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>
            Protected by HIPAA-compliant authentication
          </Text>
          <div style={{ marginTop: 8 }}>
            <Text style={{ color: '#64748b', fontSize: 13 }}>
              Don't have an account?{' '}
              <a
                onClick={() => navigate('/signup')}
                style={{ color: '#4f46e5', fontWeight: 600, cursor: 'pointer' }}
              >
                Create Account
              </a>
            </Text>
          </div>
        </div>
      </div>

      {/* ── Google Role Selection Modal ── */}
      <GoogleRoleModal
        visible={!!pendingGoogleUser}
        googleData={pendingGoogleUser}
        onComplete={handleGoogleRoleSelect}
        onCancel={clearPendingGoogle}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Styles (inline to keep it self-contained)
// ──────────────────────────────────────────────────────────

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
  },
  bgCircle1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
    top: -120,
    right: -100,
    pointerEvents: 'none',
  },
  bgCircle2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 70%)',
    bottom: -80,
    left: -60,
    pointerEvents: 'none',
  },
  card: {
    width: 480,
    maxWidth: '94vw',
    background: '#ffffff',
    borderRadius: 20,
    padding: '40px 36px 28px',
    boxShadow: '0 4px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0',
    position: 'relative',
    zIndex: 1,
  },
  brandSection: {
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 6,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #c7d2fe',
  },
  brandTitle: {
    margin: 0,
    color: '#1e293b',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
  },
  input: {
    borderRadius: 10,
    height: 44,
  },
  loginBtn: {
    height: 46,
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 15,
    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
    border: 'none',
    boxShadow: '0 2px 12px rgba(79,70,229,0.3)',
  },
  googleBtn: {
    height: 46,
    borderRadius: 10,
    fontWeight: 500,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  demoBtn: {
    height: 40,
    borderRadius: 10,
    fontWeight: 500,
    fontSize: 12,
    boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
  },
  footer: {
    textAlign: 'center' as const,
    marginTop: 20,
  },
};
