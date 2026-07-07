import { prisma, Prisma } from "@agency/database";
import { resolveReportDateRange } from "./date-range.js";

// Unified financial statement: quotations, invoices, and payments normalized
// into one row shape via a raw SQL UNION ALL, so search/filter/sort/paginate
// all happen in a single indexed query instead of fetching three tables into
// memory and merging in JS.

export interface ReportFilters {
  search?: string;
  type?: "QUOTATION" | "INVOICE" | "PAYMENT";
  clientId?: string;
  projectId?: string;
  paymentStatus?: string;
  invoiceStatus?: string;
  paymentMethod?: string;
  currency?: string;
  datePreset?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportRow {
  id: string;
  type: "QUOTATION" | "INVOICE" | "PAYMENT";
  date: Date;
  referenceNo: string;
  invoiceNumber: string | null;
  quotationNumber: string | null;
  projectId: string | null;
  projectName: string | null;
  clientId: string;
  clientName: string;
  transactionId: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  invoiceStatus: string | null;
  status: string;
  amount: unknown;
  tax: unknown;
  discount: unknown;
  netAmount: unknown;
  balanceDue: unknown;
  dueDate: Date | null;
  expiryDate: Date | null;
  paidDate: Date | null;
  createdBy: string | null;
  notes: string | null;
  currency: string;
}

// The derived "payment status" an invoice/payment row is in -- computed the
// same way as the overdue fix on /finance/clients/:id/summary: an invoice is
// only OVERDUE once its due date has passed *and* it still has a balance,
// regardless of the (rarely, manually set) OVERDUE enum value.
const PAYMENT_STATUS_CASE = Prisma.sql`
  CASE
    WHEN i.status = 'CANCELLED' THEN 'CANCELLED'
    WHEN i.status = 'PAID' THEN 'PAID'
    WHEN i.status = 'PARTIALLY_PAID' THEN 'PARTIALLY_PAID'
    WHEN i.status IN ('SENT', 'OVERDUE') AND i."dueDate" < now() AND i.balance > 0 THEN 'OVERDUE'
    ELSE 'PENDING'
  END
`;

const QUOTATION_SELECT = Prisma.sql`
  SELECT
    q.id AS "id",
    'QUOTATION'::text AS "type",
    q."issueDate" AS "date",
    q."quoteNumber" AS "referenceNo",
    NULL::text AS "invoiceNumber",
    q."quoteNumber" AS "quotationNumber",
    q."projectId" AS "projectId",
    proj.title AS "projectName",
    q."clientId" AS "clientId",
    cl.name AS "clientName",
    NULL::text AS "transactionId",
    NULL::text AS "paymentMethod",
    NULL::text AS "paymentStatus",
    NULL::text AS "invoiceStatus",
    q.status::text AS "status",
    q.subtotal AS "amount",
    q."taxTotal" AS "tax",
    q."discountTotal" AS "discount",
    q."grandTotal" AS "netAmount",
    NULL::numeric AS "balanceDue",
    NULL::timestamp(3) AS "dueDate",
    q."expiryDate" AS "expiryDate",
    NULL::timestamp(3) AS "paidDate",
    usr.name AS "createdBy",
    q.notes AS "notes",
    q.currency AS "currency"
  FROM finance_quotations q
  JOIN finance_clients cl ON cl.id = q."clientId"
  LEFT JOIN projects proj ON proj.id = q."projectId"
  LEFT JOIN users usr ON usr.id = q."createdById"
`;

const INVOICE_SELECT = Prisma.sql`
  SELECT
    i.id AS "id",
    'INVOICE'::text AS "type",
    i."issueDate" AS "date",
    i."invoiceNumber" AS "referenceNo",
    i."invoiceNumber" AS "invoiceNumber",
    NULL::text AS "quotationNumber",
    i."projectId" AS "projectId",
    proj.title AS "projectName",
    i."clientId" AS "clientId",
    cl.name AS "clientName",
    NULL::text AS "transactionId",
    NULL::text AS "paymentMethod",
    ${PAYMENT_STATUS_CASE} AS "paymentStatus",
    i.status::text AS "invoiceStatus",
    i.status::text AS "status",
    i.subtotal AS "amount",
    i."taxTotal" AS "tax",
    i."discountTotal" AS "discount",
    i."grandTotal" AS "netAmount",
    i.balance AS "balanceDue",
    i."dueDate" AS "dueDate",
    NULL::timestamp(3) AS "expiryDate",
    NULL::timestamp(3) AS "paidDate",
    usr.name AS "createdBy",
    i.notes AS "notes",
    i.currency AS "currency"
  FROM finance_invoices i
  JOIN finance_clients cl ON cl.id = i."clientId"
  LEFT JOIN projects proj ON proj.id = i."projectId"
  LEFT JOIN users usr ON usr.id = i."createdById"
`;

const PAYMENT_SELECT = Prisma.sql`
  SELECT
    pay.id AS "id",
    'PAYMENT'::text AS "type",
    pay."paymentDate" AS "date",
    -- Reconciliation-friendly: a payment's reference should point at the
    -- invoice it settles, not an internal payment id. Falls back to the
    -- transaction ID / synthetic id for the (currently impossible, since
    -- Payment.invoiceId is required) case of an unlinked payment.
    COALESCE(i."invoiceNumber", pay."transactionId", 'PAY-' || pay.id) AS "referenceNo",
    i."invoiceNumber" AS "invoiceNumber",
    NULL::text AS "quotationNumber",
    i."projectId" AS "projectId",
    proj.title AS "projectName",
    i."clientId" AS "clientId",
    cl.name AS "clientName",
    pay."transactionId" AS "transactionId",
    pay.method::text AS "paymentMethod",
    ${PAYMENT_STATUS_CASE} AS "paymentStatus",
    i.status::text AS "invoiceStatus",
    i.status::text AS "status",
    pay.amount AS "amount",
    0::numeric AS "tax",
    0::numeric AS "discount",
    pay.amount AS "netAmount",
    NULL::numeric AS "balanceDue",
    i."dueDate" AS "dueDate",
    NULL::timestamp(3) AS "expiryDate",
    pay."paymentDate" AS "paidDate",
    usr.name AS "createdBy",
    pay.notes AS "notes",
    pay.currency AS "currency"
  FROM finance_payments pay
  JOIN finance_invoices i ON i.id = pay."invoiceId"
  JOIN finance_clients cl ON cl.id = i."clientId"
  LEFT JOIN projects proj ON proj.id = i."projectId"
  LEFT JOIN users usr ON usr.id = pay."createdById"
`;

const REPORT_ROWS_CTE = Prisma.sql`
  WITH report_rows AS (
    ${QUOTATION_SELECT}
    UNION ALL
    ${INVOICE_SELECT}
    UNION ALL
    ${PAYMENT_SELECT}
  )
`;

function buildWhereSql(filters: ReportFilters): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];

  if (filters.type) conditions.push(Prisma.sql`"type" = ${filters.type}`);
  if (filters.clientId) conditions.push(Prisma.sql`"clientId" = ${filters.clientId}`);
  if (filters.projectId) conditions.push(Prisma.sql`"projectId" = ${filters.projectId}`);
  if (filters.paymentStatus) conditions.push(Prisma.sql`"paymentStatus" = ${filters.paymentStatus}`);
  if (filters.invoiceStatus) conditions.push(Prisma.sql`"invoiceStatus" = ${filters.invoiceStatus}`);
  if (filters.paymentMethod) conditions.push(Prisma.sql`"paymentMethod" = ${filters.paymentMethod}`);
  if (filters.currency) conditions.push(Prisma.sql`"currency" = ${filters.currency}`);

  const range = resolveReportDateRange(filters.datePreset, filters.dateFrom, filters.dateTo);
  if (range) {
    conditions.push(Prisma.sql`"date" >= ${range.start}`);
    conditions.push(Prisma.sql`"date" <= ${range.end}`);
  }

  if (filters.search) {
    const like = `%${filters.search}%`;
    conditions.push(Prisma.sql`(
      "clientName" ILIKE ${like} OR
      "projectName" ILIKE ${like} OR
      "invoiceNumber" ILIKE ${like} OR
      "quotationNumber" ILIKE ${like} OR
      "transactionId" ILIKE ${like} OR
      "referenceNo" ILIKE ${like} OR
      "notes" ILIKE ${like}
    )`);
  }

  return conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
}

// Whitelist only -- these become raw (unparameterized) identifiers in the
// ORDER BY clause, so only fixed, known-safe column names may ever reach
// Prisma.raw here, never a request-supplied string directly.
const SORT_COLUMNS: Record<string, string> = {
  date: '"date"',
  amount: '"netAmount"',
  client: '"clientName"',
  invoiceNumber: '"invoiceNumber"',
  dueDate: '"dueDate"',
  paidDate: '"paidDate"',
};

export const REPORT_SORT_FIELDS = Object.keys(SORT_COLUMNS);

function orderBySql(sortBy: string, sortOrder: "asc" | "desc"): Prisma.Sql {
  const column = SORT_COLUMNS[sortBy] ?? SORT_COLUMNS.date!;
  const direction = sortOrder === "asc" ? "ASC" : "DESC";
  return Prisma.sql`ORDER BY ${Prisma.raw(column)} ${Prisma.raw(direction)} NULLS LAST, "id" ASC`;
}

interface ReportRowWithCount extends ReportRow {
  totalCount: number;
}

export async function getReportRows(
  filters: ReportFilters,
  opts: { skip: number; take: number; sortBy: string; sortOrder: "asc" | "desc" },
): Promise<{ items: ReportRow[]; total: number }> {
  const whereSql = buildWhereSql(filters);
  const orderSql = orderBySql(opts.sortBy, opts.sortOrder);

  const rows = await prisma.$queryRaw<ReportRowWithCount[]>`
    ${REPORT_ROWS_CTE}
    SELECT *, count(*) OVER()::int AS "totalCount"
    FROM report_rows
    ${whereSql}
    ${orderSql}
    LIMIT ${opts.take}
    OFFSET ${opts.skip}
  `;

  const total = rows[0]?.totalCount ?? 0;
  return { items: rows.map(({ totalCount: _totalCount, ...row }) => row), total };
}

// Same query, no OFFSET, capped at `cap` rows -- used for exports, which need
// "every matching row" rather than one page, but still must never pull an
// unbounded result set into memory.
export async function getReportRowsForExport(
  filters: ReportFilters,
  opts: { sortBy: string; sortOrder: "asc" | "desc" },
  cap = 5000,
): Promise<{ items: ReportRow[]; total: number; truncated: boolean }> {
  const whereSql = buildWhereSql(filters);
  const orderSql = orderBySql(opts.sortBy, opts.sortOrder);

  const rows = await prisma.$queryRaw<ReportRowWithCount[]>`
    ${REPORT_ROWS_CTE}
    SELECT *, count(*) OVER()::int AS "totalCount"
    FROM report_rows
    ${whereSql}
    ${orderSql}
    LIMIT ${cap}
  `;

  const total = rows[0]?.totalCount ?? 0;
  return { items: rows.map(({ totalCount: _totalCount, ...row }) => row), total, truncated: total > rows.length };
}
