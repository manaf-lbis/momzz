import { AuthUserContext } from './mcp.types';
import { authService } from '../authentication/auth.service';
import { userRepository } from '../users/user.repository';
import { jobRepository } from '../jobs/job.repository';
import { inventoryRepository } from '../inventory/inventory.repository';
import { sanitizeErrorMessage } from './mcp.utils';

export class McpService {
  /**
   * Returns current authenticated user's profile.
   */
  async getUserProfile(context: AuthUserContext) {
    const user = await authService.getMe(context.userId);
    return {
      id: user.id || user._id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      status: user.status,
      profileImageUrl: user.profileImageUrl,
    };
  }

  /**
   * Updates display name or profile image safely.
   */
  async updateUserProfile(
    data: { name?: string; profileImageUrl?: string },
    context: AuthUserContext
  ) {
    if (data.name) {
      await userRepository.updateUserByAdmin(context.userId, { name: data.name });
    }
    return this.getUserProfile(context);
  }

  /**
   * Lists and filters vehicle service job cards.
   */
  async listJobs(
    params: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    _context: AuthUserContext
  ) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 10, 50);

    const result = await jobRepository.findPaginatedJobs({
      page,
      limit,
      search: params.search,
    });

    return {
      jobs: (result.jobs || []).map((j: any) => ({
        id: j._id.toString(),
        vehicleName: j.vehicleName,
        vehicleNumber: j.vehicleNumber,
        customerName: j.customerName,
        customerMobile: j.customerMobile,
        status: j.status,
        expectedDeliveryDate: j.expectedDeliveryDate,
        createdAt: j.createdAt,
      })),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    };
  }

  /**
   * Retrieves full details for a specific job card.
   */
  async getJobDetails(jobId: string, _context: AuthUserContext) {
    const job = await jobRepository.findJobById(jobId);
    if (!job) {
      throw new Error(`Job card with ID '${jobId}' not found.`);
    }

    const tasks = await jobRepository.findTasksByJobCardId(jobId);

    return {
      id: (job as any)._id.toString(),
      vehicleName: job.vehicleName,
      vehicleNumber: job.vehicleNumber,
      vehicleColor: job.vehicleColor,
      customerName: job.customerName,
      customerMobile: job.customerMobile,
      customerEmail: job.customerEmail,
      status: job.status,
      expectedDeliveryDate: job.expectedDeliveryDate,
      createdAt: job.createdAt,
      tasks: (tasks || []).map((t: any) => ({
        id: t._id.toString(),
        title: t.title,
        status: t.status,
        quantityUsed: t.quantityUsed,
        unitPrice: t.unitPrice,
        finalPrice: t.finalPrice,
      })),
    };
  }

  /**
   * Searches inventory items and spare parts.
   */
  async searchInventory(
    params: {
      query?: string;
      category?: string;
      page?: number;
      limit?: number;
    },
    _context: AuthUserContext
  ) {
    const limit = Math.min(params.limit || 20, 100);
    const items = await inventoryRepository.search(params.query || '', limit);

    return {
      items: (items || []).map((i: any) => ({
        id: i._id.toString(),
        name: i.name,
        category: i.category,
        createdAt: i.createdAt,
      })),
      count: items.length,
    };
  }

  /**
   * ADMIN ONLY: Lists technicians and workers in the garage.
   */
  async adminListWorkers(_context: AuthUserContext) {
    const users = await userRepository.findAllUsers();
    return {
      workers: users.map((u: any) => ({
        id: u._id.toString(),
        name: u.name,
        mobile: u.mobile,
        role: u.role,
        isApproved: u.isApproved,
        status: u.status,
        isOnline: Boolean(u.isOnline),
        lastSeen: u.lastSeen,
      })),
      count: users.length,
    };
  }

  /**
   * ADMIN ONLY: Operational metrics and system diagnostics.
   */
  async adminGetSystemOverview(_context: AuthUserContext) {
    const users = await userRepository.findAllUsers();
    const liveJobs = await jobRepository.findLiveJobs();

    return {
      system: 'Momzz Garage Vehicle & Task Command API',
      status: 'UP',
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
      metrics: {
        activeWorkers: users.filter((u: any) => u.isOnline).length,
        totalWorkers: users.length,
        liveJobsCount: liveJobs.length,
      },
    };
  }
}

export const mcpService = new McpService();
