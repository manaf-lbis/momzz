import { useAppSelector } from './useAppSelector';
import { ROLES } from '../constants/roles';

export const useAuth = () => {
  const { user, token, isAuthenticated } = useAppSelector((state) => state.auth);

  return {
    user,
    token,
    isAuthenticated,
    isAdmin: user?.role === ROLES.ADMIN,
    isWorker: user?.role === ROLES.WORKER,
    isApproved: user?.isApproved ?? false,
  };
};
