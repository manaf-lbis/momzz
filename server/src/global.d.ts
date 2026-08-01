import { UserRole } from './constants/status';

export interface AuthUserPayload {
  id: string;
  name: string;
  mobile: string;
  role: UserRole;
  isApproved: boolean;
  status?: 'ACTIVE' | 'BLOCKED';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}
