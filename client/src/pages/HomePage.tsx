import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { AdminHome } from './AdminHome';
import { MechanicHome } from './MechanicHome';
import { UnapprovedWorkerHome } from './UnapprovedWorkerHome';
import { ROLES } from '../constants/roles';

export const HomePage: React.FC = () => {
  const { user, isApproved } = useAuth();
  if (!user) return null;

  if (user.role === ROLES.ADMIN) {
    return <AdminHome />;
  }

  if (!isApproved) {
    return <UnapprovedWorkerHome />;
  }

  return <MechanicHome />;
};

