export const ROLES = {
  ADMIN: 'ADMIN',
  WORKER: 'WORKER',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];
