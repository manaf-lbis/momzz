import React from 'react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { PayrollDashboardPage } from './PayrollDashboardPage';
import { WorkerLedgerPage } from './WorkerLedgerPage';

export const PayrollRoute: React.FC = () => {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? <PayrollDashboardPage /> : <WorkerLedgerPage />;
};
