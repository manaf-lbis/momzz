import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthPage } from '../pages/Auth';
import { Dashboard } from '../pages/Dashboard';
import { JobsListPage } from '../pages/JobsListPage';
import { JobDetailPage } from '../pages/JobDetailPage';
import { AdminApproval } from '../pages/AdminApproval';
import { HomePage } from '../pages/HomePage';
import { ProfilePage } from '../pages/ProfilePage';
import { UserManagementPage } from '../pages/UserManagementPage';
import { ProtectedRoute } from './ProtectedRoute';
import { SocketProvider } from '../context/SocketContext';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />

      {/* Authenticated Routes with Socket Provider */}
      <Route
        element={
          <SocketProvider>
            <ProtectedRoute />
          </SocketProvider>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jobs" element={<JobsListPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Admin Only Routes */}
      <Route
        element={
          <SocketProvider>
            <ProtectedRoute requireAdmin={true} />
          </SocketProvider>
        }
      >
        <Route path="/admin/approvals" element={<AdminApproval />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
