import { UserRole } from './constants/status';

export interface AuthUserPayload {
  id: string;
  name: string;
  mobile: string;
  role: UserRole;
  isApproved: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}
