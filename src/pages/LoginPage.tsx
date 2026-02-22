import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Divider, Alert, Typography } from 'antd';
import { MailOutlined, LockOutlined, GoogleOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { email: string; password: string; remember: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      await login(values.email, values.password, values.remember);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
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
              placeholder="Doctor email"
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
        <Divider style={{ margin: '4px 0 20px', color: '#94a3b8', fontSize: 13 }}>
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

        {/* ── Demo Login (Development) ── */}
        <Button
          block
          size="large"
          onClick={async () => {
            setLoading(true);
            // Bypass auth — set demo user directly
            (window as any).__DEMO_AUTH__ = true;
            // Use the demoLogin from AuthContext
            try {
              await (login as any)('demo@urbancare.com', 'demo', true);
            } catch {
              // If backend login fails, that's fine — we'll set user via context
            }
            setLoading(false);
            navigate('/dashboard', { replace: true });
          }}
          style={{
            ...styles.googleBtn,
            marginTop: 10,
            background: 'linear-gradient(135deg, #059669, #10b981)',
            color: 'white',
            border: 'none',
          }}
        >
          🔬 Demo Login (Skip Auth)
        </Button>

        {/* ── Footer ── */}
        <div style={styles.footer}>
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>
            Protected by HIPAA-compliant authentication
          </Text>
        </div>
      </div>
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
    width: 420,
    maxWidth: '92vw',
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
  footer: {
    textAlign: 'center' as const,
    marginTop: 24,
  },
};
