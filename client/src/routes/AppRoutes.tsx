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
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { CreateJobPage } from '../pages/CreateJobPage';
import { InventoryPage } from '../pages/InventoryPage';
import { InventoryDetailPage } from '../pages/InventoryDetailPage';
import { AddInventoryItemPage } from '../pages/AddInventoryItemPage';
import { TrackServicePage } from '../pages/TrackServicePage';
import { SalesPage } from '../pages/SalesPage';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="/track" element={<TrackServicePage />} />

      {/* Admin-Only Routes */}
      <Route element={<ProtectedRoute requireAdmin={true} />}>
        <Route path="/admin/approvals" element={<AdminApproval />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route path="/jobs/create" element={<CreateJobPage />} />
        <Route path="/inventory/new" element={<AddInventoryItemPage />} />
      </Route>

      {/* Authenticated Routes — available to all logged-in users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jobs" element={<JobsListPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/:id" element={<InventoryDetailPage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
