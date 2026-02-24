import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface RequireRoleProps {
  allowedRoles: string[];
}

/**
 * Protects routes based on user role.
 * - If loading → spinner
 * - If not logged in → /login
 * - If role not in allowedRoles → /unauthorized
 * - Otherwise → render child routes
 */
export function RequireRole({ allowedRoles }: RequireRoleProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
        }}
      >
        <Spin indicator={<LoadingOutlined style={{ fontSize: 40, color: '#4f46e5' }} spin />} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
