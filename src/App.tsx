import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { useStore } from './store/useStore';

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

function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes — profile synced from auth */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={<AuthStoreSync><Dashboard /></AuthStoreSync>}
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

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
