import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Avatar, Descriptions, Button, Tag, Divider, Typography,
  Form, Input, Select, Upload, message,
} from 'antd';
import {
  UserOutlined, MailOutlined, MedicineBoxOutlined, ArrowLeftOutlined,
  LogoutOutlined, EditOutlined, SaveOutlined, CloseOutlined,
  PhoneOutlined, SafetyCertificateOutlined, CameraOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../store/useStore';

const { Title, Text } = Typography;

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { doctorProfile, updateDoctorProfile, hospitals } = useStore();
  const [editMode, setEditMode] = useState(false);
  const [form] = Form.useForm();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleEdit = () => {
    form.setFieldsValue(doctorProfile);
    setEditMode(true);
  };

  const handleSave = () => {
    form.validateFields().then((values) => {
      updateDoctorProfile(values);
      setEditMode(false);
      message.success('Profile updated successfully!');
    });
  };

  const handleCancel = () => {
    setEditMode(false);
    form.resetFields();
  };

  const initials = (doctorProfile.name || user?.name || 'DR')
    .split(' ')
    .filter((_: string, i: number, a: string[]) => i === 0 || i === a.length - 1)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

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

        <Card style={styles.card} bordered={false}>
          {/* Profile Header */}
          <div style={styles.header}>
            <div style={{ position: 'relative' }}>
              {doctorProfile.profileImage ? (
                <Avatar size={80} src={doctorProfile.profileImage} />
              ) : (
                <Avatar size={80} style={styles.avatar}>
                  {initials}
                </Avatar>
              )}
              {editMode && (
                <Upload
                  showUploadList={false}
                  beforeUpload={(file) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      updateDoctorProfile({ profileImage: reader.result as string });
                    };
                    reader.readAsDataURL(file);
                    return false;
                  }}
                >
                  <Button
                    shape="circle"
                    icon={<CameraOutlined />}
                    size="small"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      background: '#4f46e5',
                      color: '#fff',
                      border: '2px solid #fff',
                    }}
                  />
                </Upload>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Title level={3} style={{ margin: 0 }}>
                    {doctorProfile.name || user?.name}
                  </Title>
                  <Text style={{ color: '#64748b' }}>
                    {doctorProfile.specialization || user?.specialty}
                  </Text>
                </div>
                {!editMode ? (
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={handleEdit}
                    style={{
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                      border: 'none',
                    }}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button icon={<CloseOutlined />} onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSave}
                      style={{
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                        border: 'none',
                      }}
                    >
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 8 }}>
                <Tag color="blue">Verified Doctor</Tag>
                {user?.googleId && <Tag color="green">Google Linked</Tag>}
                <Tag color="purple">{doctorProfile.hospital}</Tag>
              </div>
            </div>
          </div>

          <Divider />

          {/* View Mode */}
          {!editMode ? (
            <>
              <Descriptions
                column={2}
                labelStyle={{ fontWeight: 600, color: '#475569', fontSize: 13 }}
                contentStyle={{ fontSize: 13 }}
              >
                <Descriptions.Item
                  label={<><UserOutlined style={{ marginRight: 4 }} /> Full Name</>}
                >
                  {doctorProfile.name}
                </Descriptions.Item>
                <Descriptions.Item
                  label={<><MailOutlined style={{ marginRight: 4 }} /> Email</>}
                >
                  {user?.email}
                </Descriptions.Item>
                <Descriptions.Item
                  label={<><MedicineBoxOutlined style={{ marginRight: 4 }} /> Specialization</>}
                >
                  {doctorProfile.specialization}
                </Descriptions.Item>
                <Descriptions.Item
                  label={<><MedicineBoxOutlined style={{ marginRight: 4 }} /> Hospital</>}
                >
                  {doctorProfile.hospital}
                </Descriptions.Item>
                <Descriptions.Item
                  label={<><SafetyCertificateOutlined style={{ marginRight: 4 }} /> License Number</>}
                >
                  {doctorProfile.licenseNumber}
                </Descriptions.Item>
                <Descriptions.Item
                  label={<><PhoneOutlined style={{ marginRight: 4 }} /> Phone</>}
                >
                  {doctorProfile.phone}
                </Descriptions.Item>
                <Descriptions.Item label="Doctor ID">
                  {user?.id}
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              <Button danger icon={<LogoutOutlined />} onClick={handleLogout} size="large">
                Sign Out
              </Button>
            </>
          ) : (
            /* Edit Mode */
            <Form
              form={form}
              layout="vertical"
              initialValues={doctorProfile}
              requiredMark={false}
              size="large"
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <Form.Item
                  name="name"
                  label="Full Name"
                  rules={[{ required: true, message: 'Name is required' }]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                    placeholder="Dr. Jane Doe"
                    style={{ borderRadius: 10 }}
                  />
                </Form.Item>

                <Form.Item
                  name="specialization"
                  label="Specialization"
                  rules={[{ required: true, message: 'Specialization is required' }]}
                >
                  <Select
                    placeholder="Select specialization"
                    style={{ borderRadius: 10 }}
                    options={[
                      { value: 'Cardiology', label: 'Cardiology' },
                      { value: 'Neurology', label: 'Neurology' },
                      { value: 'Pulmonology', label: 'Pulmonology' },
                      { value: 'General Medicine', label: 'General Medicine' },
                      { value: 'Pediatrics', label: 'Pediatrics' },
                      { value: 'Orthopedics', label: 'Orthopedics' },
                      { value: 'Dermatology', label: 'Dermatology' },
                      { value: 'Oncology', label: 'Oncology' },
                    ]}
                  />
                </Form.Item>

                <Form.Item
                  name="hospital"
                  label="Hospital"
                  rules={[{ required: true, message: 'Hospital is required' }]}
                >
                  <Select
                    placeholder="Select hospital"
                    options={hospitals.map((h) => ({
                      value: h.name,
                      label: h.name,
                    }))}
                  />
                </Form.Item>

                <Form.Item
                  name="licenseNumber"
                  label="License Number"
                  rules={[{ required: true, message: 'License number is required' }]}
                >
                  <Input
                    prefix={<SafetyCertificateOutlined style={{ color: '#94a3b8' }} />}
                    placeholder="MCI-XXXX-XXXXX"
                    style={{ borderRadius: 10 }}
                  />
                </Form.Item>

                <Form.Item
                  name="phone"
                  label="Phone Number"
                >
                  <Input
                    prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
                    placeholder="+91 XXXXX XXXXX"
                    style={{ borderRadius: 10 }}
                  />
                </Form.Item>
              </div>
            </Form>
          )}
        </Card>
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
    maxWidth: 800,
    margin: '0 auto',
  },
  card: {
    borderRadius: 16,
    boxShadow: '0 2px 20px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  avatar: {
    background: 'linear-gradient(135deg, #4f46e5, #818cf8)',
    fontSize: 28,
    fontWeight: 600,
  },
};
