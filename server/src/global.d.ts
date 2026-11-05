import { UserRole } from './constants/status';

export interface AuthUserPayload {
  id: string;
  _id?: string;
  name: string;
  mobile: string;
  role: UserRole;
  isApproved: boolean;
  status?: 'ACTIVE' | 'BLOCKED';
  dailyWage?: number;
  dailyWageEffectiveDate?: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}
