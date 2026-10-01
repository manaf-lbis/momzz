import { z } from 'zod';

export type UserRole = 'ADMIN' | 'WORKER';

export interface AuthUserContext {
  userId: string;
  name: string;
  mobile: string;
  role: UserRole;
  scopes: string[];
  accessToken: string;
}

export interface ToolDefinition<T = any> {
  name: string;
  description: string;
  parameters: z.ZodType<T>;
  requiredRole: 'ADMIN' | 'WORKER' | 'ANY';
  requiredScopes: string[];
  execute: (args: T, context: AuthUserContext) => Promise<unknown>;
}
