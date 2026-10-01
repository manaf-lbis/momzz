import { config } from '../config.js';
import { AuthUserContext } from '../auth/middleware.js';

export interface UpstreamRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  context: AuthUserContext;
}

/**
 * Strips sensitive internal details (stack traces, DB strings, internal IP/ports) from error messages
 * before returning them to the LLM context.
 */
export const sanitizeErrorMessage = (error: any): string => {
  if (!error) return 'An unexpected upstream error occurred.';

  const message = error.message || String(error);

  // Sanitize MongoDB connection strings, credentials, or internal file paths
  const sanitized = message
    .replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, '[DATABASE_URI_REDACTED]')
    .replace(/password[:=]\s*[^\s&]+/gi, 'password=[REDACTED]')
    .replace(/key[:=]\s*[^\s&]+/gi, 'key=[REDACTED]')
    .replace(/[a-zA-Z]:\\[^\n]+/g, '[INTERNAL_PATH_REDACTED]')
    .replace(/\/[a-zA-Z0-9_\-./]+\.(ts|js|json)/g, '[INTERNAL_PATH_REDACTED]');

  return sanitized.trim();
};

export class UpstreamApiClient {
  private baseUrl: string;
  private internalServiceKey: string;

  constructor() {
    this.baseUrl = config.UPSTREAM_API_URL.replace(/\/+$/, '');
    this.internalServiceKey = config.INTERNAL_SERVICE_KEY;
  }

  /**
   * Dispatches an authenticated request to the upstream Node.js Express backend.
   * ANTI-CONFUSED DEPUTY: Never forwards client Bearer tokens.
   * Uses internal service credentials combined with explicit user context headers.
   */
  async request<T = any>(options: UpstreamRequestOptions): Promise<T> {
    const { method = 'GET', path, query, body, context } = options;

    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);

    if (query) {
      Object.entries(query).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, String(val));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // Attach verified session Bearer token issued by Momzz API
      'Authorization': `Bearer ${context.accessToken}`,
      'X-Internal-Service-Key': this.internalServiceKey,
      'X-Authenticated-User-Id': context.userId,
      'X-User-Role': context.role,
      'X-User-Name': encodeURIComponent(context.name),
    };

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseData = (await response.json().catch(() => null)) as any;

      if (!response.ok) {
        const errorDetail =
          responseData?.message ||
          responseData?.error ||
          `Upstream service responded with HTTP status ${response.status}`;
        throw new Error(errorDetail);
      }

      return responseData as T;
    } catch (err: any) {
      const safeMessage = sanitizeErrorMessage(err);
      throw new Error(`Upstream API communication error: ${safeMessage}`);
    }
  }

  // Domain-Specific Upstream Operations

  async getUserProfile(context: AuthUserContext) {
    return this.request({
      method: 'GET',
      path: '/api/auth/me',
      context,
    });
  }

  async updateUserProfile(data: { name?: string; profileImageUrl?: string }, context: AuthUserContext) {
    return this.request({
      method: 'PUT',
      path: '/api/users/profile',
      body: data,
      context,
    });
  }

  async listJobs(
    params: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    context: AuthUserContext
  ) {
    return this.request({
      method: 'GET',
      path: '/api/jobs',
      query: params,
      context,
    });
  }

  async getJobDetails(jobId: string, context: AuthUserContext) {
    return this.request({
      method: 'GET',
      path: `/api/jobs/${encodeURIComponent(jobId)}`,
      context,
    });
  }

  async searchInventory(
    params: {
      query?: string;
      category?: string;
      page?: number;
      limit?: number;
    },
    context: AuthUserContext
  ) {
    return this.request({
      method: 'GET',
      path: '/api/inventory',
      query: params,
      context,
    });
  }

  async adminListWorkers(context: AuthUserContext) {
    return this.request({
      method: 'GET',
      path: '/api/public/workers',
      context,
    });
  }

  async adminGetSystemOverview(context: AuthUserContext) {
    return this.request({
      method: 'GET',
      path: '/api/health',
      context,
    });
  }
}

export const upstreamApiClient = new UpstreamApiClient();
