import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ScrollToTop } from '../components/common/ScrollToTop';
import { lazy, Suspense } from 'react';
import { PageShimmer } from '../components/common/PageShimmer';
import { ProtectedRoute } from './ProtectedRoute';

// Lazy load pages
const AuthPage = lazy(() => import('../pages/Auth').then((m) => ({ default: m.AuthPage })));
const Dashboard = lazy(() => import('../pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const JobsListPage = lazy(() => import('../pages/JobsListPage').then((m) => ({ default: m.JobsListPage })));
const JobDetailPage = lazy(() => import('../pages/JobDetailPage').then((m) => ({ default: m.JobDetailPage })));
const AdminApproval = lazy(() => import('../pages/AdminApproval').then((m) => ({ default: m.AdminApproval })));
const HomePage = lazy(() => import('../pages/HomePage').then((m) => ({ default: m.HomePage })));
const ProfilePage = lazy(() => import('../pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const UserManagementPage = lazy(() => import('../pages/UserManagementPage').then((m) => ({ default: m.UserManagementPage })));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const LeaderboardPage = lazy(() => import('../pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })));
const WorkLogsPage = lazy(() => import('../pages/WorkLogsPage').then((m) => ({ default: m.WorkLogsPage })));
const CreateJobPage = lazy(() => import('../pages/CreateJobPage').then((m) => ({ default: m.CreateJobPage })));
const EditJobPage = lazy(() => import('../pages/EditJobPage').then((m) => ({ default: m.EditJobPage })));
const InventoryPage = lazy(() => import('../pages/InventoryPage').then((m) => ({ default: m.InventoryPage })));
const InventoryDetailPage = lazy(() => import('../pages/InventoryDetailPage').then((m) => ({ default: m.InventoryDetailPage })));
const AddInventoryItemPage = lazy(() => import('../pages/AddInventoryItemPage').then((m) => ({ default: m.AddInventoryItemPage })));
const TrackServicePage = lazy(() => import('../pages/TrackServicePage').then((m) => ({ default: m.TrackServicePage })));
const SalesPage = lazy(() => import('../pages/SalesPage').then((m) => ({ default: m.SalesPage })));

export const AppRoutes: React.FC = () => {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageShimmer label="Loading..." />}>
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
        <Route path="/jobs/edit/:id" element={<EditJobPage />} />
        <Route path="/inventory/new" element={<AddInventoryItemPage />} />
      </Route>

      {/* Authenticated Routes — available to all logged-in users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jobs" element={<JobsListPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/analytics" element={<LeaderboardPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/top-performers" element={<LeaderboardPage />} />
        <Route path="/work-logs" element={<WorkLogsPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/:id" element={<InventoryDetailPage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </>
  );
};
