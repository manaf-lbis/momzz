import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { AdminHome } from './AdminHome';
import { MechanicHome } from './MechanicHome';
import { ROLES } from '../constants/roles';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null; // should be protected
  return user.role === ROLES.ADMIN ? <AdminHome /> : <MechanicHome />;
};

