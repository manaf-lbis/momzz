import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../shared/hooks/useAuth';
import { useGetMeQuery } from '../features/auth/api/authApi';
import { useAppDispatch } from '../shared/hooks/useAppDispatch';
import { updateUser } from '../features/auth/store/authSlice';
import { TermsAcceptanceModal } from '../shared/components/legal/TermsAcceptanceModal';
import { LEGAL_METADATA } from '../shared/components/legal/legalContent';

interface ProtectedRouteProps {
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const dispatch = useAppDispatch();

  // Keep user profile and terms acceptance in sync with database
  const { data: meData } = useGetMeQuery(undefined, { skip: !isAuthenticated });

  useEffect(() => {
    if (meData?.data) {
      dispatch(updateUser(meData.data));
    }
  }, [meData, dispatch]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const currentUser = meData?.data || user;
  const needsTerms =
    currentUser &&
    (currentUser.needsTermsAcceptance ||
      currentUser.acceptedTermsVersion !== LEGAL_METADATA.version);

  return (
    <>
      {needsTerms && <TermsAcceptanceModal user={currentUser} />}
      <Outlet />
    </>
  );
};
