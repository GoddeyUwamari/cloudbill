import { Request, Response } from 'express';
import { query, setTenantContext } from '@shared/database/connection';
import { ApiResponse } from '@shared/types';
import { logger } from '@shared/utils/logger';

/**
 * Calculate percentage change between current and previous periods
 * @param current Current period value
 * @param previous Previous period value
 * @returns Percentage change (positive or negative)
 */
function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Get dashboard statistics with percentage changes
 * GET /api/billing/stats/dashboard
 */
export async function getDashboardStats(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      const errorResponse: ApiResponse = {
        success: false,
        message: 'Tenant ID is required',
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Set tenant context for Row-Level Security
    await setTenantContext(tenantId);

    // Calculate date ranges
    const now = new Date();
    const currentPeriodStart = new Date(now);
    currentPeriodStart.setDate(now.getDate() - 30); // Last 30 days

    const previousPeriodEnd = new Date(currentPeriodStart);
    const previousPeriodStart = new Date(previousPeriodEnd);
    previousPeriodStart.setDate(previousPeriodEnd.getDate() - 30); // 30 days before that

    // Query 1: Revenue (Current Period)
    const currentRevenueResult = await query<{ total: string }>(
      `SELECT COALESCE(SUM(total_amount), 0) as total
       FROM invoices
       WHERE tenant_id=$1 AND status=$2 AND created_at >= $3`,
      [tenantId, 'paid', currentPeriodStart.toISOString()]
    );

    // Query 2: Revenue (Previous Period)
    const previousRevenueResult = await query<{ total: string }>(
      `SELECT COALESCE(SUM(total_amount), 0) as total
       FROM invoices
       WHERE tenant_id=$1 AND status=$2 AND created_at >= $3 AND created_at < $4`,
      [tenantId, 'paid', previousPeriodStart.toISOString(), previousPeriodEnd.toISOString()]
    );

    // Query 3: Active Subscriptions (Current)
    const currentSubscriptionsResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM subscriptions
       WHERE tenant_id=$1 AND status=$2 AND created_at <= $3`,
      [tenantId, 'active', now.toISOString()]
    );

    // Query 4: Active Subscriptions (Previous Period)
    const previousSubscriptionsResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM subscriptions
       WHERE tenant_id=$1 AND status=$2 AND created_at <= $3`,
      [tenantId, 'active', previousPeriodEnd.toISOString()]
    );

    // Query 5: Total Invoices (Current Period)
    const currentInvoicesResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM invoices
       WHERE tenant_id=$1 AND created_at >= $2`,
      [tenantId, currentPeriodStart.toISOString()]
    );

    // Query 6: Total Invoices (Previous Period)
    const previousInvoicesResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM invoices
       WHERE tenant_id=$1 AND created_at >= $2 AND created_at < $3`,
      [tenantId, previousPeriodStart.toISOString(), previousPeriodEnd.toISOString()]
    );

    // Query 7: Active Tenants (all tenants, not filtered by tenantId for super admin view)
    // Note: For now, counting total tenants in the system
    const currentTenantsResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM tenants
       WHERE status='ACTIVE' AND created_at <= $1`,
      [now.toISOString()]
    );

    // Query 8: Active Tenants (Previous Period)
    const previousTenantsResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM tenants
       WHERE status='ACTIVE' AND created_at <= $1`,
      [previousPeriodEnd.toISOString()]
    );

    // Parse results
    const currentRevenue = parseFloat(currentRevenueResult[0]?.total || '0');
    const previousRevenue = parseFloat(previousRevenueResult[0]?.total || '0');

    const currentSubscriptions = parseInt(currentSubscriptionsResult[0]?.count || '0');
    const previousSubscriptions = parseInt(previousSubscriptionsResult[0]?.count || '0');

    const currentInvoices = parseInt(currentInvoicesResult[0]?.count || '0');
    const previousInvoices = parseInt(previousInvoicesResult[0]?.count || '0');

    const currentTenants = parseInt(currentTenantsResult[0]?.count || '0');
    const previousTenants = parseInt(previousTenantsResult[0]?.count || '0');

    // Calculate percentage changes
    const revenueChange = calculatePercentageChange(currentRevenue, previousRevenue);
    const subscriptionsChange = calculatePercentageChange(currentSubscriptions, previousSubscriptions);
    const invoicesChange = calculatePercentageChange(currentInvoices, previousInvoices);
    const tenantsChange = calculatePercentageChange(currentTenants, previousTenants);

    const response: ApiResponse = {
      success: true,
      data: {
        totalRevenue: currentRevenue,
        revenueChange: parseFloat(revenueChange.toFixed(1)),
        activeSubscriptions: currentSubscriptions,
        subscriptionsChange: parseFloat(subscriptionsChange.toFixed(1)),
        totalInvoices: currentInvoices,
        invoicesChange: parseFloat(invoicesChange.toFixed(1)),
        activeTenants: currentTenants,
        tenantsChange: parseFloat(tenantsChange.toFixed(1)),
      },
      timestamp: new Date().toISOString(),
    };

    logger.info('Dashboard stats retrieved successfully', {
      service: 'billing-service',
      tenantId,
      currentRevenue,
      revenueChange,
    });

    res.json(response);
  } catch (error) {
    logger.error('Error fetching dashboard stats', {
      service: 'billing-service',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorResponse: ApiResponse = {
      success: false,
      message: 'Failed to retrieve dashboard stats',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(errorResponse);
  }
}

/**
 * Get subscriptions list with tenant names (for dashboard)
 * GET /api/billing/stats/subscriptions
 * Query Parameters: ?status=active|cancelled|past_due
 */
export async function getSubscriptionsList(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      const errorResponse: ApiResponse = {
        success: false,
        message: 'Tenant ID is required',
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Set tenant context for Row-Level Security
    await setTenantContext(tenantId);

    // Get optional status filter from query params
    const statusFilter = req.query.status as string | undefined;

    // Build query with JOIN to get tenant name
    let queryText = `
      SELECT
        ts.id,
        ts.tenant_id,
        t.name as "tenantName",
        sp.display_name as "plan",
        ts.status,
        ts.current_price as amount,
        ts.current_period_end as "nextBillingDate",
        ts.created_at as "createdAt"
      FROM subscriptions ts
      INNER JOIN tenants t ON ts.tenant_id = t.id
      INNER JOIN subscription_plans sp ON ts.plan_id = sp.id
      WHERE ts.tenant_id = $1
    `;

    const params: any[] = [tenantId];

    // Add status filter if provided
    if (statusFilter) {
      queryText += ` AND ts.status = $2`;
      params.push(statusFilter);
    }

    queryText += ` ORDER BY ts.created_at DESC`;

    const subscriptions = await query<{
      id: string;
      tenant_id: string;
      tenantName: string;
      plan: string;
      status: string;
      amount: number;
      nextBillingDate: string;
      createdAt: string;
    }>(queryText, params);

    const response: ApiResponse = {
      success: true,
      data: subscriptions,
      timestamp: new Date().toISOString(),
    };

    logger.info('Subscriptions list retrieved successfully', {
      service: 'billing-service',
      tenantId,
      count: subscriptions.length,
      statusFilter,
    });

    res.json(response);
  } catch (error) {
    logger.error('Error fetching subscriptions list', {
      service: 'billing-service',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorResponse: ApiResponse = {
      success: false,
      message: 'Failed to retrieve subscriptions list',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(errorResponse);
  }
}

/**
 * Get invoices list with tenant names (for dashboard)
 * GET /api/billing/stats/invoices
 * Query Parameters: ?status=paid|pending|open|overdue|void&limit=50
 */
export async function getInvoicesList(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      const errorResponse: ApiResponse = {
        success: false,
        message: 'Tenant ID is required',
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Set tenant context for Row-Level Security
    await setTenantContext(tenantId);

    // Get optional query parameters
    const statusFilter = req.query.status as string | undefined;
    const limitParam = req.query.limit as string | undefined;

    // Parse and validate limit (default 50, max 100)
    let limit = 50;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit)) {
        limit = Math.min(Math.max(1, parsedLimit), 100);
      }
    }

    // Build query with JOIN to get tenant name
    let queryText = `
      SELECT
        i.id,
        i.tenant_id as "tenantId",
        t.name as "tenantName",
        i.total_amount as amount,
        i.status,
        i.due_date as "dueDate",
        i.created_at as "createdAt"
      FROM invoices i
      INNER JOIN tenants t ON i.tenant_id = t.id
      WHERE i.tenant_id = $1
    `;

    const params: any[] = [tenantId];

    // Add status filter if provided
    if (statusFilter) {
      queryText += ` AND i.status = $2`;
      params.push(statusFilter);
    }

    queryText += ` ORDER BY i.created_at DESC`;
    queryText += ` LIMIT $${params.length + 1}`;
    params.push(limit);

    const invoices = await query<{
      id: string;
      tenantId: string;
      tenantName: string;
      amount: number;
      status: string;
      dueDate: string;
      createdAt: string;
    }>(queryText, params);

    const response: ApiResponse = {
      success: true,
      data: invoices,
      timestamp: new Date().toISOString(),
    };

    logger.info('Invoices list retrieved successfully', {
      service: 'billing-service',
      tenantId,
      count: invoices.length,
      statusFilter,
      limit,
    });

    res.json(response);
  } catch (error) {
    logger.error('Error fetching invoices list', {
      service: 'billing-service',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorResponse: ApiResponse = {
      success: false,
      message: 'Failed to retrieve invoices list',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(errorResponse);
  }
}
