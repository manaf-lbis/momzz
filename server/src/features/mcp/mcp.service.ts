import mongoose from 'mongoose';
import { AuthUserContext } from './mcp.types';
import { authService } from '../authentication/auth.service';
import { userRepository } from '../users/user.repository';
import { jobRepository } from '../jobs/job.repository';
import { catalogRepository } from '../catalog/catalog.repository';
import { JobCard } from '../../models/JobCard.model';
import { Task } from '../../models/Task.model';
import Item from '../../models/Item.model';
import Category from '../../models/Category.model';
import Sale from '../../models/Sale.model';
import User from '../../models/User.model';
import { getCloudinaryUrl } from '../../shared/utils/cloudinary.helper';

export class McpService {
  /**
   * =========================================================================
   * DOMAIN 1: AUTHENTICATION & USER PROFILE (READ-ONLY)
   * =========================================================================
   */

  /**
   * Returns currently authenticated staff profile.
   */
  async getUserProfile(context: AuthUserContext) {
    const user = await authService.getMe(context.userId);
    return {
      id: user.id || (user as any)._id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      status: user.status,
      isApproved: user.isApproved,
      profileImageUrl: user.profileImageUrl ? getCloudinaryUrl(user.profileImageUrl) : '',
    };
  }

  /**
   * =========================================================================
   * DOMAIN 2: VEHICLE JOB CARDS & GARAGE WORKSPACE (READ-ONLY)
   * =========================================================================
   */

  /**
   * Search, filter, and paginate vehicle service job cards.
   */
  async listJobs(
    params: {
      search?: string;
      status?: string;
      vehicleNumber?: string;
      customerMobile?: string;
      customerName?: string;
      timeframe?: string;
      tab?: string;
      liveOnly?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    _context: AuthUserContext
  ) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(1, params.limit || 20), 50);

    const query: any = { isDeleted: false };

    // Status filter
    if (params.status && params.status !== 'ALL') {
      query.status = params.status;
    }

    // Vehicle plate filter
    if (params.vehicleNumber?.trim()) {
      query.vehicleNumber = { $regex: params.vehicleNumber.trim(), $options: 'i' };
    }

    // Customer mobile
    if (params.customerMobile?.trim()) {
      query.customerMobile = { $regex: params.customerMobile.trim(), $options: 'i' };
    }

    // Customer name
    if (params.customerName?.trim()) {
      query.customerName = { $regex: params.customerName.trim(), $options: 'i' };
    }

    // Live garage vehicles only
    if (params.liveOnly) {
      query.status = { $in: ['IN_PROGRESS', 'READY'] };
    }

    // Timeframe filters
    if (params.timeframe && params.timeframe !== 'ALL') {
      const now = new Date();
      if (params.timeframe === 'TODAY') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query.createdAt = { $gte: start };
      } else if (params.timeframe === 'THIS_WEEK') {
        const start = new Date(now.setDate(now.getDate() - now.getDay()));
        start.setHours(0, 0, 0, 0);
        query.createdAt = { $gte: start };
      } else if (params.timeframe === 'THIS_MONTH') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        query.createdAt = { $gte: start };
      }
    }

    // Free text search
    if (params.search?.trim()) {
      const s = params.search.trim();
      query.$or = [
        { vehicleNumber: { $regex: s, $options: 'i' } },
        { vehicleName: { $regex: s, $options: 'i' } },
        { customerName: { $regex: s, $options: 'i' } },
        { customerMobile: { $regex: s, $options: 'i' } },
      ];
    }

    const sortField = params.sortBy || 'createdAt';
    const sortDirection = params.sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * limit;

    const [total, jobs] = await Promise.all([
      JobCard.countDocuments(query),
      JobCard.find(query)
        .populate('createdBy', 'name mobile role')
        .populate('verifiedBy', 'name mobile role')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Fetch brief task counts for each job card
    const jobIds = jobs.map((j: any) => j._id);
    const tasks = await Task.find({ jobCardId: { $in: jobIds }, isDeleted: false })
      .select('jobCardId status finalPrice')
      .lean();

    const taskCountMap = new Map<string, { total: number; completed: number; billAmount: number }>();
    for (const t of tasks) {
      const key = t.jobCardId.toString();
      const current = taskCountMap.get(key) || { total: 0, completed: 0, billAmount: 0 };
      current.total += 1;
      if (t.status === 'COMPLETED') current.completed += 1;
      current.billAmount += t.finalPrice || 0;
      taskCountMap.set(key, current);
    }

    return {
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      limit,
      jobs: jobs.map((j: any) => {
        const stats = taskCountMap.get(j._id.toString()) || { total: 0, completed: 0, billAmount: 0 };
        return {
          id: j._id.toString(),
          vehicleName: j.vehicleName,
          vehicleNumber: j.vehicleNumber,
          vehicleColor: j.vehicleColor,
          customerName: j.customerName,
          customerMobile: j.customerMobile,
          customerEmail: j.customerEmail,
          status: j.status,
          expectedDeliveryDate: j.expectedDeliveryDate,
          thumbnailUrl: j.thumbnailUrl ? getCloudinaryUrl(j.thumbnailUrl) : '',
          taskSummary: {
            totalTasks: stats.total,
            completedTasks: stats.completed,
            estimatedTotal: stats.billAmount,
          },
          createdBy: j.createdBy ? { name: (j.createdBy as any).name, role: (j.createdBy as any).role } : undefined,
          createdAt: j.createdAt,
          updatedAt: j.updatedAt,
        };
      }),
    };
  }

  /**
   * Retrieves full details, customer information, tasks, items used, and timeline for a specific job card.
   */
  async getJobDetails(jobIdOrPlate: string, _context: AuthUserContext) {
    const isObjectId = mongoose.Types.ObjectId.isValid(jobIdOrPlate);
    const query = isObjectId
      ? { _id: jobIdOrPlate, isDeleted: false }
      : { vehicleNumber: jobIdOrPlate.trim().toUpperCase(), isDeleted: false };

    const job = await JobCard.findOne(query)
      .populate('createdBy', 'name mobile role')
      .populate('verifiedBy', 'name mobile role')
      .lean();

    if (!job) {
      throw new Error(`Job card not found for identifier '${jobIdOrPlate}'.`);
    }

    const tasks = await Task.find({ jobCardId: job._id, isDeleted: false })
      .populate('inventoryItem', 'title sku price stockQuantity')
      .populate('activityLog.user', 'name role')
      .sort({ createdAt: 1 })
      .lean();

    const formattedPhotos = (job.photos || []).map((p: any) => {
      const publicId = typeof p === 'string' ? p : p.publicId;
      return {
        url: getCloudinaryUrl(publicId),
        remarks: p.remarks || '',
        capturedAt: p.capturedAt || null,
        isThumbnail: Boolean(p.isThumbnail),
      };
    });

    const subtotal = tasks.reduce((sum: number, t: any) => sum + (t.finalPrice || 0), 0);

    return {
      id: job._id.toString(),
      vehicle: {
        name: job.vehicleName,
        number: job.vehicleNumber,
        color: job.vehicleColor || '',
        thumbnailUrl: job.thumbnailUrl ? getCloudinaryUrl(job.thumbnailUrl) : '',
        photos: formattedPhotos,
      },
      customer: {
        name: job.customerName || 'Walk-in Customer',
        mobile: job.customerMobile || '',
        email: job.customerEmail || '',
      },
      status: job.status,
      expectedDeliveryDate: job.expectedDeliveryDate,
      estimatedBillAmount: subtotal,
      createdBy: job.createdBy ? { name: (job.createdBy as any).name, role: (job.createdBy as any).role } : undefined,
      verifiedBy: job.verifiedBy ? { name: (job.verifiedBy as any).name, role: (job.verifiedBy as any).role } : undefined,
      verifiedAt: job.verifiedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      tasks: tasks.map((t: any) => ({
        id: t._id.toString(),
        title: t.title,
        status: t.status,
        itemType: t.itemType,
        quantityUsed: t.quantityUsed || 1,
        unitPrice: t.unitPrice || 0,
        discountAmount: t.discountAmount || 0,
        finalPrice: t.finalPrice || 0,
        inventoryItem: t.inventoryItem
          ? {
              id: t.inventoryItem._id.toString(),
              title: t.inventoryItem.title,
              sku: t.inventoryItem.sku,
            }
          : undefined,
        activityCount: (t.activityLog || []).length,
      })),
    };
  }

  /**
   * Retrieves aggregated vehicle job stats for the garage workspace.
   */
  async getJobStats(_context: AuthUserContext) {
    const stats = await jobRepository.getJobStats();
    return stats;
  }

  /**
   * =========================================================================
   * DOMAIN 3: INVENTORY & STOCK MANAGEMENT (READ-ONLY)
   * =========================================================================
   */

  /**
   * Searches spare parts, catalog items, unit prices, and live stock levels.
   */
  async searchInventory(
    params: {
      query?: string;
      category?: string;
      lowStockOnly?: boolean;
      page?: number;
      limit?: number;
    },
    _context: AuthUserContext
  ) {
    const limit = Math.min(Math.max(1, params.limit || 20), 100);
    const page = Math.max(1, params.page || 1);
    const skip = (page - 1) * limit;

    const query: any = { isDeleted: false };

    if (params.lowStockOnly) {
      query.trackStock = true;
      query.$expr = { $lte: ['$stockQuantity', '$minimumStockQuantity'] };
    }

    if (params.category?.trim()) {
      if (mongoose.Types.ObjectId.isValid(params.category)) {
        query.category = params.category;
      } else {
        const cat = await Category.findOne({ name: { $regex: params.category.trim(), $options: 'i' } });
        if (cat) query.category = cat._id;
      }
    }

    if (params.query?.trim()) {
      const q = params.query.trim();
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    const [total, items] = await Promise.all([
      Item.countDocuments(query),
      Item.find(query)
        .populate('category', 'name type')
        .sort({ stockQuantity: 1, title: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      items: items.map((i: any) => ({
        id: i._id.toString(),
        title: i.title,
        sku: i.sku || '',
        category: (i.category as any)?.name || 'General',
        itemType: i.itemType,
        price: i.price,
        stockQuantity: i.stockQuantity,
        minimumStockQuantity: i.minimumStockQuantity,
        trackStock: i.trackStock,
        isLowStock: i.trackStock && (i.stockQuantity || 0) <= (i.minimumStockQuantity || 0),
        isAvailable: i.isAvailable,
        thumbnailUrl: i.thumbnailUrl ? getCloudinaryUrl(i.thumbnailUrl) : '',
      })),
    };
  }

  /**
   * Retrieves full specifications of an inventory spare part by ID or SKU.
   */
  async getInventoryItem(itemIdOrSku: string, _context: AuthUserContext) {
    const isObjectId = mongoose.Types.ObjectId.isValid(itemIdOrSku);
    const query = isObjectId
      ? { _id: itemIdOrSku, isDeleted: false }
      : { sku: itemIdOrSku.trim(), isDeleted: false };

    const item = await Item.findOne(query).populate('category', 'name type').lean();
    if (!item) {
      throw new Error(`Inventory item '${itemIdOrSku}' not found.`);
    }

    return {
      id: item._id.toString(),
      title: item.title,
      sku: item.sku || '',
      category: (item.category as any)?.name || 'General',
      itemType: item.itemType,
      price: item.price,
      stockQuantity: item.stockQuantity,
      minimumStockQuantity: item.minimumStockQuantity,
      trackStock: item.trackStock,
      isLowStock: item.trackStock && (item.stockQuantity || 0) <= (item.minimumStockQuantity || 0),
      isAvailable: item.isAvailable,
      description: item.description || '',
      thumbnailUrl: item.thumbnailUrl ? getCloudinaryUrl(item.thumbnailUrl) : '',
      images: (item.images || []).map((img: string) => getCloudinaryUrl(img)),
      createdAt: (item as any).createdAt,
      updatedAt: (item as any).updatedAt,
    };
  }

  /**
   * Retrieves low stock items that need reordering.
   */
  async getLowStockAlerts(params: { limit?: number }, _context: AuthUserContext) {
    const limit = Math.min(Math.max(1, params.limit || 50), 100);

    const items = await Item.find({
      isDeleted: false,
      trackStock: true,
      $expr: { $lte: ['$stockQuantity', '$minimumStockQuantity'] },
    })
      .populate('category', 'name')
      .sort({ stockQuantity: 1 })
      .limit(limit)
      .lean();

    return {
      count: items.length,
      alerts: items.map((i: any) => ({
        id: i._id.toString(),
        title: i.title,
        sku: i.sku || '',
        category: (i.category as any)?.name || 'General',
        currentStock: i.stockQuantity || 0,
        minimumStock: i.minimumStockQuantity || 0,
        deficit: Math.max(0, (i.minimumStockQuantity || 0) - (i.stockQuantity || 0)),
        unitPrice: i.price,
      })),
    };
  }

  /**
   * =========================================================================
   * DOMAIN 4: CATALOG (PRODUCTS & LABOR SERVICES) (READ-ONLY)
   * =========================================================================
   */

  /**
   * Lists all catalog categories with item counts.
   */
  async listCatalogCategories(params: { type?: string }, _context: AuthUserContext) {
    const query: any = {};
    if (params.type && params.type !== 'ALL') {
      query.type = params.type;
    }

    const categories = await Category.find(query).sort({ name: 1 }).lean();

    // Compute active item counts per category
    const categoryIds = categories.map((c: any) => c._id);
    const itemCounts = await Item.aggregate([
      { $match: { category: { $in: categoryIds }, isDeleted: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    for (const entry of itemCounts) {
      countMap.set(entry._id.toString(), entry.count);
    }

    return {
      categories: categories.map((c: any) => ({
        id: c._id.toString(),
        name: c.name,
        type: c.type,
        description: c.description || '',
        itemCount: countMap.get(c._id.toString()) || 0,
      })),
    };
  }

  /**
   * Lists and filters products and services from catalog.
   */
  async listCatalogItems(
    params: {
      q?: string;
      category?: string;
      itemType?: string;
      inStockOnly?: boolean;
      limit?: number;
    },
    _context: AuthUserContext
  ) {
    const limit = Math.min(Math.max(1, params.limit || 50), 100);

    const filters: any = {
      q: params.q,
      itemType: params.itemType && params.itemType !== 'ALL' ? params.itemType : undefined,
      category: params.category,
    };

    const rawItems = await catalogRepository.getItems(filters);
    let filtered = rawItems;
    if (params.inStockOnly) {
      filtered = filtered.filter((i: any) => i.itemType === 'SERVICE' || (i.stockQuantity || 0) > 0);
    }

    const sliced = filtered.slice(0, limit);

    return {
      count: sliced.length,
      totalMatched: filtered.length,
      items: sliced.map((i: any) => ({
        id: i._id.toString(),
        title: i.title,
        sku: i.sku || '',
        itemType: i.itemType,
        category: (i.category as any)?.name || 'General',
        price: i.price,
        stockQuantity: i.stockQuantity,
        trackStock: i.trackStock,
        thumbnailUrl: i.thumbnailUrl ? getCloudinaryUrl(i.thumbnailUrl) : '',
        description: i.description || '',
      })),
    };
  }

  /**
   * Retrieves full details of a specific catalog product or service.
   */
  async getCatalogItemDetails(itemId: string, _context: AuthUserContext) {
    const item = await catalogRepository.findItem(itemId);
    if (!item) {
      throw new Error(`Catalog item '${itemId}' not found.`);
    }

    // Find recent job task usage for this item
    const recentTasks = await Task.find({ inventoryItem: item._id, isDeleted: false })
      .select('jobCardId title finalPrice createdAt')
      .populate('jobCardId', 'vehicleNumber vehicleName customerName')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return {
      id: item._id.toString(),
      title: item.title,
      sku: item.sku || '',
      category: (item.category as any)?.name || 'General',
      itemType: item.itemType,
      price: item.price,
      stockQuantity: item.stockQuantity,
      minimumStockQuantity: item.minimumStockQuantity,
      trackStock: item.trackStock,
      isAvailable: item.isAvailable,
      description: item.description || '',
      thumbnailUrl: item.thumbnailUrl ? getCloudinaryUrl(item.thumbnailUrl) : '',
      images: (item.images || []).map((img: string) => getCloudinaryUrl(img)),
      recentUsage: recentTasks.map((t: any) => ({
        vehicleNumber: (t.jobCardId as any)?.vehicleNumber || '',
        vehicleName: (t.jobCardId as any)?.vehicleName || '',
        finalPrice: t.finalPrice,
        date: t.createdAt,
      })),
    };
  }

  /**
   * =========================================================================
   * DOMAIN 5: SALES, BILLING & FINANCIAL INVOICES (READ-ONLY)
   * =========================================================================
   */

  /**
   * Lists customer sales and checkout bills.
   */
  async listSales(
    params: {
      q?: string;
      status?: string;
      paymentMethod?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      page?: number;
    },
    _context: AuthUserContext
  ) {
    const limit = Math.min(Math.max(1, params.limit || 20), 100);
    const page = Math.max(1, params.page || 1);
    const skip = (page - 1) * limit;

    const query: any = {};

    if (params.status && params.status !== 'ALL') {
      query.status = params.status;
    }

    if (params.paymentMethod && params.paymentMethod !== 'ALL') {
      query.paymentMethod = params.paymentMethod;
    }

    if (params.startDate || params.endDate) {
      query.createdAt = {};
      if (params.startDate) query.createdAt.$gte = new Date(params.startDate);
      if (params.endDate) query.createdAt.$lte = new Date(params.endDate);
    }

    if (params.q?.trim()) {
      const q = params.q.trim();
      query.$or = [
        { invoiceNumber: { $regex: q, $options: 'i' } },
        { customerName: { $regex: q, $options: 'i' } },
        { customerMobile: { $regex: q, $options: 'i' } },
      ];
    }

    const [total, sales] = await Promise.all([
      Sale.countDocuments(query),
      Sale.find(query)
        .populate('soldBy', 'name mobile role')
        .populate('items.item', 'title sku')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const completedSales = sales.filter((s: any) => s.status === 'COMPLETED');
    const totalRevenue = completedSales.reduce((acc: number, s: any) => acc + (s.grandTotal || 0), 0);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      pageRevenue: totalRevenue,
      sales: sales.map((s: any) => ({
        id: s._id.toString(),
        invoiceNumber: s.invoiceNumber,
        customerName: s.customerName || 'Walk-in Customer',
        customerMobile: s.customerMobile || '',
        paymentMethod: s.paymentMethod,
        itemCount: (s.items || []).length,
        subtotal: s.subtotal,
        totalDiscount: s.totalDiscount || 0,
        grandTotal: s.grandTotal,
        status: s.status,
        soldBy: s.soldBy ? { name: (s.soldBy as any).name, role: (s.soldBy as any).role } : undefined,
        createdAt: s.createdAt,
      })),
    };
  }

  /**
   * Retrieves full details for a specific sales invoice.
   */
  async getSaleDetails(saleIdOrInvoice: string, _context: AuthUserContext) {
    const isObjectId = mongoose.Types.ObjectId.isValid(saleIdOrInvoice);
    const query = isObjectId
      ? { _id: saleIdOrInvoice }
      : { invoiceNumber: saleIdOrInvoice.trim() };

    const sale = await Sale.findOne(query)
      .populate('soldBy', 'name mobile role')
      .populate('items.item', 'title sku price thumbnailUrl')
      .lean();

    if (!sale) {
      throw new Error(`Sale bill '${saleIdOrInvoice}' not found.`);
    }

    return {
      id: sale._id.toString(),
      invoiceNumber: sale.invoiceNumber,
      customer: {
        name: sale.customerName || 'Walk-in Customer',
        mobile: sale.customerMobile || '',
      },
      paymentMethod: sale.paymentMethod,
      notes: sale.notes || '',
      status: sale.status,
      cancelReason: sale.cancelReason || '',
      subtotal: sale.subtotal,
      totalDiscount: sale.totalDiscount || 0,
      grandTotal: sale.grandTotal,
      soldBy: sale.soldBy ? { name: (sale.soldBy as any).name, role: (sale.soldBy as any).role } : undefined,
      createdAt: sale.createdAt,
      items: (sale.items || []).map((line: any) => ({
        title: (line.item as any)?.title || 'Custom Item',
        sku: (line.item as any)?.sku || '',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountAmount: line.discountAmount || 0,
        totalPrice: line.totalPrice,
      })),
    };
  }

  /**
   * [ADMIN ONLY] Comprehensive financial revenue reporting.
   */
  async getSalesAnalytics(params: { timeframe?: string }, _context: AuthUserContext) {
    const query: any = { status: 'COMPLETED' };
    const now = new Date();

    if (params.timeframe === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      query.createdAt = { $gte: start };
    } else if (params.timeframe === 'THIS_WEEK') {
      const start = new Date(now.setDate(now.getDate() - now.getDay()));
      start.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: start };
    } else if (params.timeframe === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      query.createdAt = { $gte: start };
    }

    const [allSales, cancelledCount] = await Promise.all([
      Sale.find(query).select('grandTotal totalDiscount paymentMethod createdAt').lean(),
      Sale.countDocuments({ status: 'CANCELLED' }),
    ]);

    const totalRevenue = allSales.reduce((acc, s: any) => acc + (s.grandTotal || 0), 0);
    const totalDiscounts = allSales.reduce((acc, s: any) => acc + (s.totalDiscount || 0), 0);

    const paymentMethods: Record<string, number> = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      CREDIT: 0,
      OTHER: 0,
    };

    for (const s of allSales) {
      const m = s.paymentMethod || 'CASH';
      paymentMethods[m] = (paymentMethods[m] || 0) + (s.grandTotal || 0);
    }

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaySales = allSales.filter((s: any) => new Date(s.createdAt) >= startOfToday);
    const todayRevenue = todaySales.reduce((acc, s: any) => acc + (s.grandTotal || 0), 0);

    return {
      timeframe: params.timeframe || 'ALL',
      completedSalesCount: allSales.length,
      cancelledSalesCount: cancelledCount,
      totalRevenue,
      todaySalesCount: todaySales.length,
      todayRevenue,
      totalDiscountsGiven: totalDiscounts,
      averageBillValue: allSales.length > 0 ? Math.round(totalRevenue / allSales.length) : 0,
      revenueByPaymentMethod: paymentMethods,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * =========================================================================
   * DOMAIN 6: WORKERS & STAFF MANAGEMENT (ADMIN RESTRICTED, READ-ONLY)
   * =========================================================================
   */

  /**
   * [ADMIN ONLY] Lists technicians, staff accounts, and verification statuses.
   */
  async adminListWorkers(
    params: {
      status?: string;
      isApproved?: boolean;
      role?: string;
      onlineOnly?: boolean;
    },
    _context: AuthUserContext
  ) {
    const query: any = {};

    if (params.status && params.status !== 'ALL') {
      query.status = params.status;
    }
    if (params.isApproved !== undefined) {
      query.isApproved = params.isApproved;
    }
    if (params.role && params.role !== 'ALL') {
      query.role = params.role;
    }
    if (params.onlineOnly) {
      query.isOnline = true;
    }

    const users = await User.find(query)
      .select('-password -loginAudit')
      .sort({ isOnline: -1, lastSeen: -1, name: 1 })
      .lean();

    return {
      count: users.length,
      workers: users.map((u: any) => ({
        id: u._id.toString(),
        name: u.name,
        mobile: u.mobile,
        role: u.role,
        isApproved: Boolean(u.isApproved),
        status: u.status || 'ACTIVE',
        isOnline: Boolean(u.isOnline),
        lastSeen: u.lastSeen,
        createdAt: u.createdAt,
      })),
    };
  }

  /**
   * [ADMIN ONLY] Deep-dive into a specific technician's profile, history, and tasks.
   */
  async adminGetWorkerDetails(workerId: string, _context: AuthUserContext) {
    const isObjectId = mongoose.Types.ObjectId.isValid(workerId);
    const query = isObjectId ? { _id: workerId } : { mobile: workerId.trim() };

    const user = await User.findOne(query).select('-password').lean();
    if (!user) {
      throw new Error(`Worker not found for identifier '${workerId}'.`);
    }

    return {
      id: user._id.toString(),
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      isApproved: Boolean(user.isApproved),
      status: user.status || 'ACTIVE',
      isOnline: Boolean(user.isOnline),
      lastSeen: user.lastSeen,
      failedLoginAttempts: user.failedLoginAttempts || 0,
      loginLockedUntil: user.loginLockedUntil,
      recentLoginAudit: (user.loginAudit || []).slice(-5),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * =========================================================================
   * DOMAIN 7: SYSTEM PULSE & GARAGE OVERVIEW (READ-ONLY)
   * =========================================================================
   */

  /**
   * Operational metrics, system diagnostics, and live garage counts.
   */
  async getSystemOverview(_context: AuthUserContext) {
    const [onlineWorkers, totalWorkers, liveJobs, catalogCount, lowStockCount] =
      await Promise.all([
        User.countDocuments({ isOnline: true }),
        User.countDocuments({}),
        JobCard.countDocuments({ isDeleted: false, status: { $in: ['IN_PROGRESS', 'READY'] } }),
        Item.countDocuments({ isDeleted: false }),
        Item.countDocuments({
          isDeleted: false,
          trackStock: true,
          $expr: { $lte: ['$stockQuantity', '$minimumStockQuantity'] },
        }),
      ]);

    return {
      system: 'Momzz Garage Vehicle & Task Command API',
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      garage: {
        activeWorkersOnline: onlineWorkers,
        totalRegisteredWorkers: totalWorkers,
        liveVehiclesInGarage: liveJobs,
        totalCatalogItems: catalogCount,
        lowStockAlertsCount: lowStockCount,
      },
    };
  }
}

export const mcpService = new McpService();
