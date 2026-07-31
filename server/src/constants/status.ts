export const ROLES = {
  ADMIN: 'ADMIN',
  WORKER: 'WORKER',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const TASK_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];
