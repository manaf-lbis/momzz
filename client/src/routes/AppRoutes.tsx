import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthPage } from '../pages/Auth';
import { Dashboard } from '../pages/Dashboard';
import { AdminApproval } from '../pages/AdminApproval';
import { HomePage } from '../pages/HomePage';
import { AdminHome } from '../pages/AdminHome';
import { MechanicHome } from '../pages/MechanicHome';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />

      {/* Authenticated Routes */}
      <Route element={<ProtectedRoute />}>
  import { HomePage } from '../pages/HomePage';
      <Route path="/" element={<HomePage />} />
      </Route>

      {/* Admin Only Routes */}
      <Route element={<ProtectedRoute requireAdmin={true} />}>
        <Route path="/admin/approvals" element={<AdminApproval />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
