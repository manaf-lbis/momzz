import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { AuthUserContext, ToolDefinition } from '../mcp.types';
import { mcpService } from '../mcp.service';
import { sanitizeErrorMessage } from '../mcp.utils';
import { mcpAuditService } from '../mcp-audit.service';

/**
 * Evaluates whether granted user scopes satisfy required tool scopes.
 * Supports wildcard '*' and category wildcards like 'admin:*' or 'jobs:*'.
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

// ============================================================================
// MCP TOOL DEFINITIONS (STRICTLY READ-ONLY / GET QUERIES, ZERO MUTATIONS)
// ============================================================================

/**
 * Common optional auth parameters for Stdio / CLI tools invocation
 */
const authParams = {
  token: z
    .string()
    .optional()
    .describe('Optional Momzz Personal Access Token (PAT) for direct Stdio authentication.'),
  username: z
    .string()
    .optional()
    .describe('Optional Momzz staff login mobile number (e.g., "7994414155") for identity verification.'),
};

// --- DOMAIN 1: AUTHENTICATION & USER PROFILE ---

const momzz_get_user_profile: ToolDefinition = {
  name: 'momzz_get_user_profile',
  description:
    '[ROLE: ALL STAFF] Retrieve the authenticated staff member profile details including staff ID, display name, mobile phone number, system role (ADMIN or WORKER), and account approval status.',
  parameters: z.object({
    ...authParams,
  }),
  requiredRole: 'ANY',
  requiredScopes: ['profile:read'],
  execute: async (_args, context) => {
    return mcpService.getUserProfile(context);
  },
};

// --- DOMAIN 2: VEHICLE JOB CARDS & GARAGE WORKSPACE ---

const momzz_list_jobs: ToolDefinition = {
  name: 'momzz_list_jobs',
  description:
    '[ROLE: ALL STAFF] Search, filter, and paginate vehicle service job cards in Momzz garage. Supports filtering by vehicle license plate, customer mobile, status, timeframe, and garage live active presence.',
  parameters: z.object({
    ...authParams,
    search: z
      .string()
      .trim()
      .max(100)
      .optional()
      .describe(
        'Free-text search matching vehicle license plate (e.g., "MH12AB1234"), vehicle model/brand (e.g., "Honda City", "Activa"), or customer name.'
      ),
    status: z
      .enum(['PENDING', 'IN_PROGRESS', 'READY', 'COMPLETED', 'ALL'])
      .optional()
      .describe(
        'Filter by vehicle service status: "PENDING" (queued), "IN_PROGRESS" (actively in repair), "READY" (inspection passed, ready for pickup), "COMPLETED" (delivered), or "ALL" (default: "ALL").'
      ),
    vehicleNumber: z
      .string()
      .trim()
      .max(20)
      .optional()
      .describe('Exact or partial vehicle license plate number (case-insensitive, e.g. "KL07CC1234").'),
    customerMobile: z
      .string()
      .trim()
      .max(15)
      .optional()
      .describe('Exact or partial 10-digit customer mobile phone number to find associated vehicles.'),
    customerName: z
      .string()
      .trim()
      .max(80)
      .optional()
      .describe('Filter vehicles by customer display name.'),
    timeframe: z
      .enum(['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'ALL'])
      .optional()
      .describe('Filter jobs created within a specific timeframe: "TODAY", "THIS_WEEK", "THIS_MONTH", or "ALL" (default: "ALL").'),
    liveOnly: z
      .boolean()
      .optional()
      .describe('When true, returns only vehicles currently physically located in the garage (status IN_PROGRESS or READY). Default: false.'),
    page: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('1-based page number for paginated job card results. Default: 1.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of job records to return per page (min: 1, max: 50, default: 20).'),
    sortBy: z
      .enum(['createdAt', 'updatedAt', 'expectedDeliveryDate', 'status'])
      .optional()
      .describe('Field name to sort job records by. Default: "createdAt".'),
    sortOrder: z
      .enum(['asc', 'desc'])
      .optional()
      .describe('Sort direction: "desc" (newest first) or "asc" (oldest first). Default: "desc".'),
  }),
  requiredRole: 'ANY',
  requiredScopes: ['jobs:read'],
  execute: async (args: any, context) => {
    return mcpService.listJobs(args, context);
  },
};

const momzz_get_job_details: ToolDefinition = {
  name: 'momzz_get_job_details',
  description:
    '[ROLE: ALL STAFF] Retrieve complete specifications, customer details, assigned technicians, repair tasks, spare parts used, pricing breakdown, and vehicle intake photos for a specific job card.',
  parameters: z.object({
    ...authParams,
    jobId: z
      .string()
      .trim()
      .min(1, 'jobId must not be empty')
      .describe(
        'The unique 24-character hexadecimal MongoDB ObjectId of the job card, or an exact vehicle registration license plate number (e.g. "MH12AB1234").'
      ),
  }),
  requiredRole: 'ANY',
  requiredScopes: ['jobs:read'],
  execute: async (args: any, context) => {
    return mcpService.getJobDetails(args.jobId, context);
  },
};

const momzz_get_job_stats: ToolDefinition = {
  name: 'momzz_get_job_stats',
  description:
    '[ROLE: ALL STAFF] Retrieve aggregated real-time garage vehicle metrics, including total vehicles in progress, ready for delivery, completed today, live active vehicles in garage, and pending tasks.',
  parameters: z.object({
    ...authParams,
  }),
  requiredRole: 'ANY',
  requiredScopes: ['jobs:read'],
  execute: async (_args, context) => {
    return mcpService.getJobStats(context);
  },
};

// --- DOMAIN 3: INVENTORY & STOCK MANAGEMENT ---

const momzz_search_inventory: ToolDefinition = {
  name: 'momzz_search_inventory',
  description:
    '[ROLE: ALL STAFF] Search garage spare parts, catalog stock items, unit prices, available quantities, and low-stock reorder thresholds in the workshop inventory.',
  parameters: z.object({
    ...authParams,
    query: z
      .string()
      .trim()
      .max(80)
      .optional()
      .describe('Search query matching part name, title, description, or SKU code (e.g., "Brake Pad", "Mobil 1", "Oil Filter").'),
    category: z
      .string()
      .trim()
      .optional()
      .describe('Filter by inventory category name (e.g., "Lubricants", "Brakes", "Electrical") or category ObjectId.'),
    lowStockOnly: z
      .boolean()
      .optional()
      .describe('If true, filters results to only show spare parts whose stock quantity is at or below the minimum stock threshold. Default: false.'),
    page: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Page number for paginated search results. Default: 1.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of inventory items to return per page (min: 1, max: 100, default: 20).'),
  }),
  requiredRole: 'ANY',
  requiredScopes: ['inventory:read'],
  execute: async (args: any, context) => {
    return mcpService.searchInventory(args, context);
  },
};

const momzz_get_inventory_item: ToolDefinition = {
  name: 'momzz_get_inventory_item',
  description:
    '[ROLE: ALL STAFF] Retrieve detailed specifications, current stock quantity, reorder threshold, unit pricing, category, and storage location for a specific inventory spare part.',
  parameters: z.object({
    ...authParams,
    itemId: z
      .string()
      .trim()
      .min(1, 'itemId must not be empty')
      .describe('The 24-character hexadecimal MongoDB ObjectId or unique SKU code of the inventory item.'),
  }),
  requiredRole: 'ANY',
  requiredScopes: ['inventory:read'],
  execute: async (args: any, context) => {
    return mcpService.getInventoryItem(args.itemId, context);
  },
};

const momzz_get_low_stock_alerts: ToolDefinition = {
  name: 'momzz_get_low_stock_alerts',
  description:
    '[ROLE: ALL STAFF] Retrieve all garage inventory spare parts and consumables that are currently running below their minimum safety stock threshold and urgently require purchase replenishment.',
  parameters: z.object({
    ...authParams,
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of low stock alert items to return (min: 1, max: 100, default: 50).'),
  }),
  requiredRole: 'ANY',
  requiredScopes: ['inventory:read'],
  execute: async (args: any, context) => {
    return mcpService.getLowStockAlerts(args, context);
  },
};

// --- DOMAIN 4: CATALOG (PRODUCTS & LABOR SERVICES) ---

const momzz_list_catalog_categories: ToolDefinition = {
  name: 'momzz_list_catalog_categories',
  description:
    '[ROLE: ALL STAFF] List all garage catalog categories (e.g. Periodic Maintenance, Engine Repair, Accessories) with their descriptions, types, and associated active item counts.',
  parameters: z.object({
    ...authParams,
    type: z
      .enum(['PRODUCT', 'SERVICE', 'BOTH', 'ALL'])
      .optional()
      .describe(
        'Filter category classification: "PRODUCT" (spare parts & goods), "SERVICE" (labor & repair packages), "BOTH" (hybrid), or "ALL" (default: "ALL").'
      ),
  }),
  requiredRole: 'ANY',
  requiredScopes: ['catalog:read'],
  execute: async (args: any, context) => {
    return mcpService.listCatalogCategories(args, context);
  },
};

const momzz_list_catalog_items: ToolDefinition = {
  name: 'momzz_list_catalog_items',
  description:
    '[ROLE: ALL STAFF] List and filter sellable products, parts, and labor services from the catalog with price list, category info, and stock tracking status.',
  parameters: z.object({
    ...authParams,
    q: z
      .string()
      .trim()
      .optional()
      .describe('Fuzzy search query matching catalog title, SKU, or description.'),
    category: z
      .string()
      .trim()
      .optional()
      .describe('Filter items by category ObjectId or category name.'),
    itemType: z
      .enum(['PRODUCT', 'SERVICE', 'ALL'])
      .optional()
      .describe('Filter by catalog item type: "PRODUCT" (physical goods/spares), "SERVICE" (labor procedures), or "ALL" (default: "ALL").'),
    inStockOnly: z
      .boolean()
      .optional()
      .describe('If true, excludes products that currently have 0 stock (services are always included). Default: false.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of catalog items to return (min: 1, max: 100, default: 50).'),
  }),
  requiredRole: 'ANY',
  requiredScopes: ['catalog:read'],
  execute: async (args: any, context) => {
    return mcpService.listCatalogItems(args, context);
  },
};

const momzz_get_catalog_item_details: ToolDefinition = {
  name: 'momzz_get_catalog_item_details',
  description:
    '[ROLE: ALL STAFF] Retrieve comprehensive catalog item details, including pricing, category information, image URLs, and recent vehicle job card usage history.',
  parameters: z.object({
    ...authParams,
    itemId: z
      .string()
      .trim()
      .min(1, 'itemId must not be empty')
      .describe('The 24-character hexadecimal MongoDB ObjectId of the catalog item.'),
  }),
  requiredRole: 'ANY',
  requiredScopes: ['catalog:read'],
  execute: async (args: any, context) => {
    return mcpService.getCatalogItemDetails(args.itemId, context);
  },
};

// --- DOMAIN 5: SALES, BILLING & FINANCIAL INVOICES ---

const momzz_list_sales: ToolDefinition = {
  name: 'momzz_list_sales',
  description:
    '[ROLE: ALL STAFF] List and search customer sales invoices and checkout billing records in Momzz. Returns customer details, line items, discounts, grand totals, and payment status.',
  parameters: z.object({
    ...authParams,
    q: z
      .string()
      .trim()
      .optional()
      .describe('Search query matching invoice number (e.g. "INV-001"), customer name, or customer mobile number.'),
    status: z
      .enum(['COMPLETED', 'CANCELLED', 'ALL'])
      .optional()
      .describe('Filter by billing status: "COMPLETED" (finalized paid bills), "CANCELLED" (voided sales), or "ALL" (default: "ALL").'),
    paymentMethod: z
      .enum(['CASH', 'UPI', 'CARD', 'CREDIT', 'OTHER', 'ALL'])
      .optional()
      .describe('Filter transactions by payment method: "CASH", "UPI", "CARD", "CREDIT", "OTHER", or "ALL" (default: "ALL").'),
    startDate: z
      .string()
      .trim()
      .optional()
      .describe('ISO 8601 date string (e.g. "2026-10-01") for the beginning of the sales date filter.'),
    endDate: z
      .string()
      .trim()
      .optional()
      .describe('ISO 8601 date string (e.g. "2026-10-31") for the end of the sales date filter.'),
    page: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('1-based page number for pagination. Default: 1.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of sales records to return per page (min: 1, max: 100, default: 20).'),
  }),
  requiredRole: 'ANY',
  requiredScopes: ['sales:read'],
  execute: async (args: any, context) => {
    return mcpService.listSales(args, context);
  },
};

const momzz_get_sale_details: ToolDefinition = {
  name: 'momzz_get_sale_details',
  description:
    '[ROLE: ALL STAFF] Retrieve full itemized bill breakdown for a specific sale: customer info, individual line items, unit prices, discounts, taxes, grand total, payment method, cashier details, and timestamp.',
  parameters: z.object({
    ...authParams,
    saleId: z
      .string()
      .trim()
      .min(1, 'saleId must not be empty')
      .describe('The 24-character MongoDB ObjectId or exact invoice number (e.g. "INV-2026-001") of the sale.'),
  }),
  requiredRole: 'ANY',
  requiredScopes: ['sales:read'],
  execute: async (args: any, context) => {
    return mcpService.getSaleDetails(args.saleId, context);
  },
};

const momzz_get_sales_analytics: ToolDefinition = {
  name: 'momzz_get_sales_analytics',
  description:
    '[ROLE: ADMIN ONLY] High-level financial revenue analytics: total sales revenue, today revenue, completed vs cancelled counts, discounts given, average ticket size, and revenue breakdown by payment method.',
  parameters: z.object({
    ...authParams,
    timeframe: z
      .enum(['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'ALL'])
      .optional()
      .describe('Reporting time window: "TODAY", "THIS_WEEK", "THIS_MONTH", or "ALL" (default: "ALL").'),
  }),
  requiredRole: 'ADMIN',
  requiredScopes: ['admin:analytics'],
  execute: async (args: any, context) => {
    return mcpService.getSalesAnalytics(args, context);
  },
};

// --- DOMAIN 6: WORKERS & STAFF (ADMIN RESTRICTED) ---

const momzz_admin_list_workers: ToolDefinition = {
  name: 'momzz_admin_list_workers',
  description:
    '[ROLE: ADMIN ONLY] List all technicians, mechanics, and worker accounts in the garage, including administrator approval status, active/blocked status, live online presence, and last seen timestamps.',
  parameters: z.object({
    ...authParams,
    status: z
      .enum(['ACTIVE', 'BLOCKED', 'ALL'])
      .optional()
      .describe('Filter workers by account status: "ACTIVE", "BLOCKED", or "ALL" (default: "ALL").'),
    isApproved: z
      .boolean()
      .optional()
      .describe('Filter by administrator approval status (true for approved staff, false for pending approval).'),
    role: z
      .enum(['ADMIN', 'WORKER', 'ALL'])
      .optional()
      .describe('Filter staff by role: "ADMIN", "WORKER", or "ALL" (default: "ALL").'),
    onlineOnly: z
      .boolean()
      .optional()
      .describe('If true, only returns technicians currently online and active in the garage system. Default: false.'),
  }),
  requiredRole: 'ADMIN',
  requiredScopes: ['admin:workers'],
  execute: async (args: any, context) => {
    return mcpService.adminListWorkers(args, context);
  },
};

const momzz_admin_get_worker_details: ToolDefinition = {
  name: 'momzz_admin_get_worker_details',
  description:
    '[ROLE: ADMIN ONLY] Retrieve detailed staff profile, registration date, recent login security audit history, lock status, and active task assignments for a specific technician.',
  parameters: z.object({
    ...authParams,
    workerId: z
      .string()
      .trim()
      .min(1, 'workerId must not be empty')
      .describe('The 24-character hexadecimal MongoDB ObjectId or registered mobile number of the technician.'),
  }),
  requiredRole: 'ADMIN',
  requiredScopes: ['admin:workers'],
  execute: async (args: any, context) => {
    return mcpService.adminGetWorkerDetails(args.workerId, context);
  },
};

// --- DOMAIN 7: SYSTEM PULSE & GARAGE OVERVIEW ---

const momzz_get_system_overview: ToolDefinition = {
  name: 'momzz_get_system_overview',
  description:
    '[ROLE: ALL STAFF] Retrieve garage backend operational pulse: service status, uptime, active technicians currently online, count of live vehicles in garage, catalog item count, and low-stock alerts count.',
  parameters: z.object({
    ...authParams,
  }),
  requiredRole: 'ANY',
  requiredScopes: ['system:read'],
  execute: async (_args, context) => {
    return mcpService.getSystemOverview(context);
  },
};

// ============================================================================
// COMPLETE TOOL REGISTRY
// ============================================================================

export const toolRegistry: ToolDefinition<any>[] = [
  momzz_get_user_profile,
  momzz_list_jobs,
  momzz_get_job_details,
  momzz_get_job_stats,
  momzz_search_inventory,
  momzz_get_inventory_item,
  momzz_get_low_stock_alerts,
  momzz_list_catalog_categories,
  momzz_list_catalog_items,
  momzz_get_catalog_item_details,
  momzz_list_sales,
  momzz_get_sale_details,
  momzz_get_sales_analytics,
  momzz_admin_list_workers,
  momzz_admin_get_worker_details,
  momzz_get_system_overview,
];

/**
 * Helper to match tool by name supporting optional 'momzz_' prefix
 */
export const findToolByName = (name: string): ToolDefinition<any> | undefined => {
  const cleanName = name.trim();
  const stripped = cleanName.replace(/^momzz_/, '');
  const prefixed = `momzz_${stripped}`;

  return toolRegistry.find(
    (t) => t.name === cleanName || t.name === stripped || t.name === prefixed
  );
};

/**
 * DYNAMIC CAPABILITY GATING (tools/list):
 * Evaluates the authenticated user context and returns ONLY the tools
 * that the user is permitted to see and invoke.
 * Admin-restricted tools are completely omitted for non-admin users.
 */
export const getVisibleToolsForUser = (context: AuthUserContext) => {
  return toolRegistry
    .filter((tool) => isUserAuthorizedForTool(context, tool))
    .map((tool) => {
      const rawJsonSchema =
        typeof (tool.parameters as any).toJSONSchema === 'function'
          ? (tool.parameters as any).toJSONSchema()
          : (zodToJsonSchema(tool.parameters as any, {
              target: 'jsonSchema7',
              $refStrategy: 'none',
            }) as any);

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
 * Prevents non-admins from executing admin-restricted tools.
 */
/**
 * Resolves authentication context from request arguments (e.g. token, username),
 * environment variables, or database active user session for Stdio callers.
 */
export const resolveContextFromArgsOrEnv = async (args?: any): Promise<AuthUserContext> => {
  const token = (args?.token || process.env.MOMZZ_MCP_TOKEN || '').trim();
  const username = (args?.username || process.env.MOMZZ_MCP_USERNAME || '').trim();

  // Lazy-load UserModel to avoid circular dependencies during testing
  const { default: UserModel } = await import('../../../models/User.model');
  const { hashToken } = await import('../mcp.utils');

  let query: any = { isApproved: true, status: 'ACTIVE' };

  if (token) {
    const tokenHash = hashToken(token);
    query = {
      $or: [{ mcpToken: token }, { mcpTokenHash: tokenHash }],
      mcpTokenRevoked: { $ne: true },
      isApproved: true,
      status: 'ACTIVE',
    };
    if (username) query.mobile = username;
  } else if (username) {
    query.mobile = username;
  } else {
    // If no credentials supplied in CLI/stdio, resolve to active Admin
    query.role = 'ADMIN';
  }

  const user = await UserModel.findOne(query).lean();
  if (!user) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Authentication required: Invalid or missing MCP access token. Please provide your Momzz MCP token in the 'token' parameter."
    );
  }

  const role = user.role as 'ADMIN' | 'WORKER';
  return {
    userId: user._id.toString(),
    name: user.name,
    mobile: user.mobile,
    role,
    scopes:
      role === 'ADMIN'
        ? ['*']
        : ['profile:read', 'jobs:read', 'inventory:read', 'catalog:read', 'sales:read', 'system:read'],
    accessToken: token || 'internal_stdio_session',
  };
};

/**
 * HARD AUTHORIZATION & EXECUTION GUARD (tools/call):
 * Strictly validates role & scopes, parses inputs via Zod, and executes the tool.
 * Prevents non-admins from executing admin-restricted tools.
 */
export const executeToolWithGuard = async (
  name: string,
  rawArgs: unknown,
  context?: AuthUserContext
): Promise<unknown> => {
  const tool = findToolByName(name);

  if (!tool) {
    throw new McpError(ErrorCode.MethodNotFound, `Tool '${name}' was not found in the server registry.`);
  }

  const activeContext = context || (await resolveContextFromArgsOrEnv(rawArgs));
  const startTime = performance.now();

  // 1. Hard RBAC check
  if (!isUserAuthorizedForTool(activeContext, tool)) {
    const errorMsg = `Forbidden: User role '${activeContext.role}' or granted scopes do not authorize invocation of tool '${tool.name}'.`;
    mcpAuditService.logToolExecution(activeContext, tool.name, rawArgs, startTime, 'FORBIDDEN', errorMsg);
    throw new McpError(ErrorCode.InvalidRequest, errorMsg);
  }

  // 2. Strict Zod input schema validation
  const validationResult = tool.parameters.safeParse(rawArgs || {});
  if (!validationResult.success) {
    const issues = (validationResult.error as any).issues || (validationResult.error as any).errors || [];
    const errorDetails = issues
      .map((err: any) => `${(err.path || []).join('.')}: ${err.message}`)
      .join('; ');
    mcpAuditService.logToolExecution(activeContext, tool.name, rawArgs, startTime, 'ERROR', errorDetails);
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid arguments for tool '${tool.name}': ${errorDetails}`
    );
  }

  // 3. Safe Execution with sanitized error handling
  try {
    const result = await tool.execute(validationResult.data, activeContext);
    mcpAuditService.logToolExecution(activeContext, tool.name, rawArgs, startTime, 'SUCCESS');
    return result;
  } catch (executionError: any) {
    const safeError = sanitizeErrorMessage(executionError);
    mcpAuditService.logToolExecution(activeContext, tool.name, rawArgs, startTime, 'ERROR', safeError);
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool '${tool.name}': ${safeError}`
    );
  }
};
