import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import Dashboard from './pages/Dashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PatientDashboard from './pages/patient/PatientDashboard';
import LabDashboard from './pages/lab/LabDashboard';
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import FamilyPortal from './pages/FamilyPortal';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import HospitalAdminDashboard from './pages/admin/HospitalAdminDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequireRole } from './components/RequireRole';
import { useAuth } from './context/AuthContext';
import { useStore } from './store/useStore';
import { getDashboardPath } from './pages/UnauthorizedPage';

/** Syncs auth user data → Zustand doctorProfile */
function AuthStoreSync({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const syncProfileFromAuth = useStore((s) => s.syncProfileFromAuth);

  useEffect(() => {
    if (user) {
      syncProfileFromAuth({
        name: user.name,
        email: user.email,
        specialty: user.specialty || '',
      });
    }
  }, [user, syncProfileFromAuth]);

  return <>{children}</>;
}

/** Smart root redirect — sends authenticated users to their role dashboard */
function RoleBasedRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardPath(user.role)} replace />;
}

function App() {
  return (
    <Routes>
      {/* ──── Public routes ──── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/family/:token" element={<FamilyPortal />} />

      {/* ──── Doctor routes ──── */}
      <Route element={<RequireRole allowedRoles={['doctor']} />}>
        <Route
          path="/doctor/dashboard"
          element={<AuthStoreSync><DoctorDashboard /></AuthStoreSync>}
        />
      </Route>

      {/* ──── Patient routes ──── */}
      <Route element={<RequireRole allowedRoles={['patient']} />}>
        <Route path="/patient/dashboard" element={<PatientDashboard />} />
      </Route>

      {/* ──── Laboratory routes ──── */}
      <Route element={<RequireRole allowedRoles={['laboratory', 'lab']} />}>
        <Route path="/lab/dashboard" element={<LabDashboard />} />
      </Route>

      {/* ──── Pharmacy routes ──── */}
      <Route element={<RequireRole allowedRoles={['pharmacist']} />}>
        <Route path="/pharmacy/dashboard" element={<PharmacyDashboard />} />
      </Route>

      {/* ──── Super Admin ──── */}
      <Route element={<RequireRole allowedRoles={['super_admin']} />}>
        <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
      </Route>

      {/* ──── Hospital Admin ──── */}
      <Route element={<RequireRole allowedRoles={['hospital_admin']} />}>
        <Route path="/hospital-admin/dashboard" element={<HospitalAdminDashboard />} />
      </Route>

      {/* ──── Shared protected routes (any authenticated user) ──── */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={<RoleBasedRedirect />}
        />
        <Route
          path="/profile"
          element={<AuthStoreSync><ProfilePage /></AuthStoreSync>}
        />
        <Route
          path="/settings"
          element={<AuthStoreSync><SettingsPage /></AuthStoreSync>}
        />
      </Route>

      {/* ──── Catch-all → smart redirect ──── */}
      <Route path="*" element={<RoleBasedRedirect />} />
    </Routes>
  );
}

export default App;
