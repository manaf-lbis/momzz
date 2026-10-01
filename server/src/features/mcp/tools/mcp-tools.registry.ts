import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { AuthUserContext, ToolDefinition } from '../mcp.types';
import { mcpService } from '../mcp.service';
import { sanitizeErrorMessage } from '../mcp.utils';

/**
 * Evaluates whether granted user scopes satisfy required tool scopes.
 * Supports wildcard '*' and category wildcards like 'admin:*'.
 */
export const checkScopeMatch = (grantedScopes: string[], requiredScopes: string[]): boolean => {
  if (grantedScopes.includes('*')) return true;

  return requiredScopes.every((required) => {
    if (grantedScopes.includes(required)) return true;
    const [domain] = required.split(':');
    return grantedScopes.includes(`${domain}:*`);
  });
};

/**
 * Hard RBAC and Scope Evaluation Guard.
 */
export const isUserAuthorizedForTool = (
  context: AuthUserContext,
  tool: ToolDefinition<any>
): boolean => {
  // 1. Role-based access control
  if (tool.requiredRole === 'ADMIN' && context.role !== 'ADMIN') {
    return false;
  }

  // 2. Scope-based access control
  if (tool.requiredScopes.length > 0 && !checkScopeMatch(context.scopes, tool.requiredScopes)) {
    return false;
  }

  return true;
};

// Tool Definitions with Zod Input Schemas & Declarative Permission Guards

const get_user_profile: ToolDefinition = {
  name: 'get_user_profile',
  description: 'Retrieve profile details, name, mobile, and status for the currently authenticated user.',
  parameters: z.object({}),
  requiredRole: 'ANY',
  requiredScopes: ['profile:read'],
  execute: async (_args, context) => {
    return mcpService.getUserProfile(context);
  },
};

const update_user_profile: ToolDefinition = {
  name: 'update_user_profile',
  description:
    'Update safe profile fields (display name or avatar URL). Security credentials and roles cannot be modified.',
  parameters: z.object({
    name: z.string().trim().min(2).max(60).optional(),
    profileImageUrl: z.string().url().optional(),
  }),
  requiredRole: 'ANY',
  requiredScopes: ['profile:write'],
  execute: async (args: any, context) => {
    return mcpService.updateUserProfile(args, context);
  },
};

const list_jobs: ToolDefinition = {
  name: 'list_jobs',
  description: 'List and filter vehicle service job cards in Momzz garage.',
  parameters: z.object({
    status: z.string().optional(),
    search: z.string().trim().max(100).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(50).default(10),
  }),
  requiredRole: 'ANY',
  requiredScopes: ['jobs:read'],
  execute: async (args: any, context) => {
    return mcpService.listJobs(args, context);
  },
};

const get_job_details: ToolDefinition = {
  name: 'get_job_details',
  description: 'Retrieve detailed tasks, items, labor, and timeline for a specific job card.',
  parameters: z.object({
    jobId: z.string().trim().min(1, 'jobId must not be empty'),
  }),
  requiredRole: 'ANY',
  requiredScopes: ['jobs:read'],
  execute: async (args: any, context) => {
    return mcpService.getJobDetails(args.jobId, context);
  },
};

const search_inventory: ToolDefinition = {
  name: 'search_inventory',
  description: 'Search garage spare parts, catalog items, unit prices, and live stock levels.',
  parameters: z.object({
    query: z.string().trim().max(80).optional(),
    category: z.string().trim().optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  }),
  requiredRole: 'ANY',
  requiredScopes: ['inventory:read'],
  execute: async (args: any, context) => {
    return mcpService.searchInventory(args, context);
  },
};

const admin_list_workers: ToolDefinition = {
  name: 'admin_list_workers',
  description: 'ADMIN ONLY: List all technicians, worker accounts, and verification statuses in the garage.',
  parameters: z.object({}),
  requiredRole: 'ADMIN',
  requiredScopes: ['admin:workers'],
  execute: async (_args, context) => {
    return mcpService.adminListWorkers(context);
  },
};

const admin_get_system_overview: ToolDefinition = {
  name: 'admin_get_system_overview',
  description: 'ADMIN ONLY: Retrieve garage backend operational metrics, server uptime, and diagnostics.',
  parameters: z.object({}),
  requiredRole: 'ADMIN',
  requiredScopes: ['admin:overview'],
  execute: async (_args, context) => {
    return mcpService.adminGetSystemOverview(context);
  },
};

export const toolRegistry: ToolDefinition<any>[] = [
  get_user_profile,
  update_user_profile,
  list_jobs,
  get_job_details,
  search_inventory,
  admin_list_workers,
  admin_get_system_overview,
];

/**
 * DYNAMIC CAPABILITY GATING (tools/list):
 * Evaluates the authenticated user context and returns ONLY the tools
 * that the user is permitted to see and invoke.
 */
export const getVisibleToolsForUser = (context: AuthUserContext) => {
  return toolRegistry
    .filter((tool) => isUserAuthorizedForTool(context, tool))
    .map((tool) => {
      const rawJsonSchema = zodToJsonSchema(tool.parameters as any, {
        target: 'jsonSchema7',
        $refStrategy: 'none',
      }) as any;

      return {
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: 'object',
          properties: rawJsonSchema.properties || {},
          required: rawJsonSchema.required || [],
        },
      };
    });
};

/**
 * HARD AUTHORIZATION & EXECUTION GUARD (tools/call):
 * Strictly validates role & scopes, parses inputs via Zod, and executes the tool.
 */
export const executeToolWithGuard = async (
  name: string,
  rawArgs: unknown,
  context: AuthUserContext
): Promise<unknown> => {
  const tool = toolRegistry.find((t) => t.name === name);

  if (!tool) {
    throw new McpError(ErrorCode.MethodNotFound, `Tool '${name}' was not found in the server registry.`);
  }

  // 1. Hard RBAC check
  if (!isUserAuthorizedForTool(context, tool)) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Forbidden: User role '${context.role}' or granted scopes do not authorize invocation of tool '${name}'.`
    );
  }

  // 2. Strict Zod input schema validation
  const validationResult = tool.parameters.safeParse(rawArgs || {});
  if (!validationResult.success) {
    const issues = (validationResult.error as any).issues || (validationResult.error as any).errors || [];
    const errorDetails = issues
      .map((err: any) => `${(err.path || []).join('.')}: ${err.message}`)
      .join('; ');
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid arguments for tool '${name}': ${errorDetails}`
    );
  }

  // 3. Safe Execution with sanitized error handling
  try {
    return await tool.execute(validationResult.data, context);
  } catch (executionError: any) {
    const safeError = sanitizeErrorMessage(executionError);
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool '${name}': ${safeError}`
    );
  }
};
