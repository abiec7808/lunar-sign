import { dbQuery } from '@/lib/db';
import { UserSession } from '@/lib/auth/session';

export interface CalcProduct {
  id: string;
  org_id: string;
  name: string;
  code: string | null;
  description: string | null;
  cost_price: number;
  selling_price: number;
  unit_profit: number;
  profit_margin_pct: number;
  billing_cycle: 'monthly' | 'annually' | 'once_off';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalcClientItem {
  id: string;
  client_id: string;
  product_id: string;
  product_name: string;
  product_code: string | null;
  billing_cycle: 'monthly' | 'annually' | 'once_off';
  quantity: number;
  cost_price: number;
  selling_price: number;
  unit_profit: number;
  total_cost: number;
  total_selling: number;
  total_profit: number;
  profit_margin_pct: number;
  notes: string | null;
}

export interface CalcClient {
  id: string;
  org_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: 'active' | 'pending' | 'inactive';
  created_at: string;
  updated_at: string;
  items: CalcClientItem[];
  totals: {
    totalLicenses: number;
    totalCost: number;
    totalSelling: number;
    totalProfit: number;
    profitMarginPct: number;
  };
}

export interface CalcSummary {
  grandTotalCost: number;
  grandTotalSelling: number;
  grandTotalProfit: number;
  overallMarginPct: number;
  totalClients: number;
  totalLicenses: number;
  activeClientsCount: number;
  byBillingCycle: {
    monthly: { cost: number; selling: number; profit: number; licenses: number };
    annually: { cost: number; selling: number; profit: number; licenses: number };
    once_off: { cost: number; selling: number; profit: number; licenses: number };
  };
}

// Short 30s cache for org permission check to avoid repeating SELECT on every parallel request
const orgCalcCache = new Map<string, { enabled: boolean; expires: number }>();

export function invalidateCalcOrgCache(orgId?: string) {
  if (orgId) {
    orgCalcCache.delete(orgId);
  } else {
    orgCalcCache.clear();
  }
}

/**
 * Checks whether user has permission to access Lunar Calc for given targetOrgId.
 * Super Admin (or admin@lunarposgeorge.co.za) has unconditional access and can inspect any org.
 * Other users require lunar_calc_enabled = true on their own organisation.
 */
export async function verifyCalcAccess(
  session: UserSession | null,
  targetOrgId?: string | null
): Promise<{ allowed: boolean; effectiveOrgId: string; error?: string }> {
  if (!session) {
    return { allowed: false, effectiveOrgId: '', error: 'Authentication required' };
  }

  const isSuper = Boolean(
    session.isSuperAdmin || session.email === 'admin@lunarposgeorge.co.za'
  );

  if (isSuper) {
    const effective = targetOrgId && targetOrgId.trim() ? targetOrgId.trim() : session.orgId;
    return { allowed: true, effectiveOrgId: effective };
  }

  // Check 30s cache first
  const now = Date.now();
  const cached = orgCalcCache.get(session.orgId);
  let isEnabled = false;

  if (cached && cached.expires > now) {
    isEnabled = cached.enabled;
  } else {
    const res = await dbQuery(
      `SELECT lunar_calc_enabled FROM organisations WHERE id = $1 LIMIT 1`,
      [session.orgId]
    );
    isEnabled = Boolean(res.rows[0]?.lunar_calc_enabled);
    orgCalcCache.set(session.orgId, { enabled: isEnabled, expires: now + 30000 });
  }

  if (!isEnabled) {
    return {
      allowed: false,
      effectiveOrgId: session.orgId,
      error: 'Lunar Calc is not enabled for your organisation. Contact Lunar Admin.',
    };
  }

  return { allowed: true, effectiveOrgId: session.orgId };
}

/**
 * Fetch all products for an organisation
 */
export async function getProducts(orgId: string): Promise<CalcProduct[]> {
  const res = await dbQuery(
    `SELECT id, org_id, name, code, description,
            cost_price::float, selling_price::float,
            billing_cycle, is_active, created_at, updated_at
     FROM calc_products
     WHERE org_id = $1
     ORDER BY is_active DESC, name ASC`,
    [orgId]
  );

  return res.rows.map((row) => {
    const cost = Number(row.cost_price) || 0;
    const selling = Number(row.selling_price) || 0;
    const profit = selling - cost;
    const margin = selling > 0 ? (profit / selling) * 100 : 0;
    return {
      ...row,
      cost_price: cost,
      selling_price: selling,
      unit_profit: profit,
      profit_margin_pct: Math.round(margin * 10) / 10,
    };
  });
}

/**
 * Save (create or update) a product
 */
export async function saveProduct(
  orgId: string,
  data: {
    id?: string;
    name: string;
    code?: string | null;
    description?: string | null;
    cost_price: number;
    selling_price: number;
    billing_cycle?: 'monthly' | 'annually' | 'once_off';
    is_active?: boolean;
  }
): Promise<CalcProduct> {
  const billingCycle = data.billing_cycle || 'monthly';
  const isActive = data.is_active !== undefined ? data.is_active : true;

  if (data.id) {
    const res = await dbQuery(
      `UPDATE calc_products
       SET name = $1, code = $2, description = $3,
           cost_price = $4, selling_price = $5, billing_cycle = $6,
           is_active = $7, updated_at = NOW()
       WHERE id = $8 AND org_id = $9
       RETURNING *`,
      [
        data.name,
        data.code || null,
        data.description || null,
        data.cost_price,
        data.selling_price,
        billingCycle,
        isActive,
        data.id,
        orgId,
      ]
    );
    const r = res.rows[0];
    const cost = Number(r.cost_price);
    const selling = Number(r.selling_price);
    return {
      ...r,
      cost_price: cost,
      selling_price: selling,
      unit_profit: selling - cost,
      profit_margin_pct: selling > 0 ? ((selling - cost) / selling) * 100 : 0,
    };
  } else {
    const res = await dbQuery(
      `INSERT INTO calc_products (org_id, name, code, description, cost_price, selling_price, billing_cycle, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        orgId,
        data.name,
        data.code || null,
        data.description || null,
        data.cost_price,
        data.selling_price,
        billingCycle,
        isActive,
      ]
    );
    const r = res.rows[0];
    const cost = Number(r.cost_price);
    const selling = Number(r.selling_price);
    return {
      ...r,
      cost_price: cost,
      selling_price: selling,
      unit_profit: selling - cost,
      profit_margin_pct: selling > 0 ? ((selling - cost) / selling) * 100 : 0,
    };
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(orgId: string, productId: string) {
  await dbQuery(`DELETE FROM calc_products WHERE id = $1 AND org_id = $2`, [
    productId,
    orgId,
  ]);
  return { success: true };
}

/**
 * Fetch all clients with their license allocations and real-time calculations
 */
export async function getClientsWithCalculations(orgId: string): Promise<{
  clients: CalcClient[];
  summary: CalcSummary;
}> {
  // 1 & 2. Concurrently fetch clients and their license items
  const [clientsRes, itemsRes] = await Promise.all([
    dbQuery(
      `SELECT id, org_id, name, contact_person, email, phone, notes, status, created_at, updated_at
       FROM calc_clients
       WHERE org_id = $1
       ORDER BY created_at DESC, name ASC`,
      [orgId]
    ),
    dbQuery(
      `SELECT ci.id, ci.client_id, ci.product_id, ci.quantity, ci.notes,
              ci.custom_cost_price::float, ci.custom_selling_price::float,
              p.name as product_name, p.code as product_code,
              p.cost_price::float as default_cost_price,
              p.selling_price::float as default_selling_price,
              p.billing_cycle
       FROM calc_client_items ci
       JOIN calc_clients c ON ci.client_id = c.id
       JOIN calc_products p ON ci.product_id = p.id
       WHERE c.org_id = $1
       ORDER BY p.name ASC`,
      [orgId]
    ),
  ]);

  // Group items by client_id
  const itemsByClient = new Map<string, CalcClientItem[]>();
  for (const row of itemsRes.rows) {
    const qty = Number(row.quantity) || 1;
    const cost =
      row.custom_cost_price !== null && row.custom_cost_price !== undefined
        ? Number(row.custom_cost_price)
        : Number(row.default_cost_price) || 0;
    const selling =
      row.custom_selling_price !== null && row.custom_selling_price !== undefined
        ? Number(row.custom_selling_price)
        : Number(row.default_selling_price) || 0;

    const totalCost = cost * qty;
    const totalSelling = selling * qty;
    const totalProfit = totalSelling - totalCost;
    const unitProfit = selling - cost;
    const margin = totalSelling > 0 ? (totalProfit / totalSelling) * 100 : 0;

    const item: CalcClientItem = {
      id: row.id,
      client_id: row.client_id,
      product_id: row.product_id,
      product_name: row.product_name,
      product_code: row.product_code,
      billing_cycle: row.billing_cycle || 'monthly',
      quantity: qty,
      cost_price: cost,
      selling_price: selling,
      unit_profit: unitProfit,
      total_cost: totalCost,
      total_selling: totalSelling,
      total_profit: totalProfit,
      profit_margin_pct: Math.round(margin * 10) / 10,
      notes: row.notes,
    };

    if (!itemsByClient.has(row.client_id)) {
      itemsByClient.set(row.client_id, []);
    }
    itemsByClient.get(row.client_id)!.push(item);
  }

  // Accumulate grand totals
  let grandTotalCost = 0;
  let grandTotalSelling = 0;
  let grandTotalProfit = 0;
  let totalLicenses = 0;
  let activeClientsCount = 0;

  const byBillingCycle = {
    monthly: { cost: 0, selling: 0, profit: 0, licenses: 0 },
    annually: { cost: 0, selling: 0, profit: 0, licenses: 0 },
    once_off: { cost: 0, selling: 0, profit: 0, licenses: 0 },
  };

  const clients: CalcClient[] = clientsRes.rows.map((c) => {
    const items = itemsByClient.get(c.id) || [];
    let cCost = 0;
    let cSelling = 0;
    let cProfit = 0;
    let cLicenses = 0;

    for (const item of items) {
      cCost += item.total_cost;
      cSelling += item.total_selling;
      cProfit += item.total_profit;
      cLicenses += item.quantity;

      const cycle = item.billing_cycle as 'monthly' | 'annually' | 'once_off';
      if (byBillingCycle[cycle]) {
        byBillingCycle[cycle].cost += item.total_cost;
        byBillingCycle[cycle].selling += item.total_selling;
        byBillingCycle[cycle].profit += item.total_profit;
        byBillingCycle[cycle].licenses += item.quantity;
      }
    }

    grandTotalCost += cCost;
    grandTotalSelling += cSelling;
    grandTotalProfit += cProfit;
    totalLicenses += cLicenses;
    if (c.status === 'active') activeClientsCount++;

    const cMargin = cSelling > 0 ? (cProfit / cSelling) * 100 : 0;

    return {
      ...c,
      items,
      totals: {
        totalLicenses: cLicenses,
        totalCost: cCost,
        totalSelling: cSelling,
        totalProfit: cProfit,
        profitMarginPct: Math.round(cMargin * 10) / 10,
      },
    };
  });

  const overallMargin =
    grandTotalSelling > 0 ? (grandTotalProfit / grandTotalSelling) * 100 : 0;

  const summary: CalcSummary = {
    grandTotalCost,
    grandTotalSelling,
    grandTotalProfit,
    overallMarginPct: Math.round(overallMargin * 10) / 10,
    totalClients: clients.length,
    totalLicenses,
    activeClientsCount,
    byBillingCycle,
  };

  return { clients, summary };
}

/**
 * Save (create or update) a client
 */
export async function saveClient(
  orgId: string,
  data: {
    id?: string;
    name: string;
    contact_person?: string | null;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
    status?: 'active' | 'pending' | 'inactive';
  }
) {
  const status = data.status || 'active';
  if (data.id) {
    const res = await dbQuery(
      `UPDATE calc_clients
       SET name = $1, contact_person = $2, email = $3,
           phone = $4, notes = $5, status = $6, updated_at = NOW()
       WHERE id = $7 AND org_id = $8
       RETURNING *`,
      [
        data.name,
        data.contact_person || null,
        data.email || null,
        data.phone || null,
        data.notes || null,
        status,
        data.id,
        orgId,
      ]
    );
    return res.rows[0];
  } else {
    const res = await dbQuery(
      `INSERT INTO calc_clients (org_id, name, contact_person, email, phone, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        orgId,
        data.name,
        data.contact_person || null,
        data.email || null,
        data.phone || null,
        data.notes || null,
        status,
      ]
    );
    return res.rows[0];
  }
}

/**
 * Delete a client
 */
export async function deleteClient(orgId: string, clientId: string) {
  await dbQuery(`DELETE FROM calc_clients WHERE id = $1 AND org_id = $2`, [
    clientId,
    orgId,
  ]);
  return { success: true };
}

/**
 * Assign or update a license item on a client
 */
export async function saveClientItem(
  orgId: string,
  clientId: string,
  data: {
    id?: string;
    product_id: string;
    quantity: number;
    custom_cost_price?: number | null;
    custom_selling_price?: number | null;
    notes?: string | null;
  }
) {
  // Concurrently validate client and check existing item line in single round-trip
  const [clientCheck, existing] = await Promise.all([
    dbQuery(
      `SELECT id FROM calc_clients WHERE id = $1 AND org_id = $2 LIMIT 1`,
      [clientId, orgId]
    ),
    !data.id
      ? dbQuery(
          `SELECT id, quantity FROM calc_client_items WHERE client_id = $1 AND product_id = $2 LIMIT 1`,
          [clientId, data.product_id]
        )
      : Promise.resolve({ rows: [] as any[] }),
  ]);

  if (clientCheck.rows.length === 0) {
    throw new Error('Client not found or unauthorized');
  }

  const qty = Math.max(1, data.quantity || 1);

  if (data.id) {
    const res = await dbQuery(
      `UPDATE calc_client_items
       SET product_id = $1, quantity = $2,
           custom_cost_price = $3, custom_selling_price = $4,
           notes = $5, updated_at = NOW()
       WHERE id = $6 AND client_id = $7
       RETURNING *`,
      [
        data.product_id,
        qty,
        data.custom_cost_price !== undefined ? data.custom_cost_price : null,
        data.custom_selling_price !== undefined ? data.custom_selling_price : null,
        data.notes || null,
        data.id,
        clientId,
      ]
    );
    return res.rows[0];
  } else {
    if (existing.rows.length > 0) {
      const newQty = existing.rows[0].quantity + qty;
      const res = await dbQuery(
        `UPDATE calc_client_items
         SET quantity = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [newQty, existing.rows[0].id]
      );
      return res.rows[0];
    } else {
      const res = await dbQuery(
        `INSERT INTO calc_client_items (client_id, product_id, quantity, custom_cost_price, custom_selling_price, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          clientId,
          data.product_id,
          qty,
          data.custom_cost_price !== undefined ? data.custom_cost_price : null,
          data.custom_selling_price !== undefined ? data.custom_selling_price : null,
          data.notes || null,
        ]
      );
      return res.rows[0];
    }
  }
}

/**
 * Remove an item from client
 */
export async function deleteClientItem(orgId: string, clientId: string, itemId: string) {
  // Validate client belongs to org
  const clientCheck = await dbQuery(
    `SELECT id FROM calc_clients WHERE id = $1 AND org_id = $2 LIMIT 1`,
    [clientId, orgId]
  );
  if (clientCheck.rows.length === 0) {
    throw new Error('Client not found or unauthorized');
  }

  await dbQuery(`DELETE FROM calc_client_items WHERE id = $1 AND client_id = $2`, [
    itemId,
    clientId,
  ]);
  return { success: true };
}
