/**
 * Financial calculations for Etsy orders
 *
 * Fee Structure:
 * - Transaction Fee: 6.5% of sale price
 * - Processing Fee: 4.5% of sale price
 * - Fixed Processing Fee: 1.1 NIS per transaction
 * - Listing Fee: $0.20 per listing
 */

export interface FeeBreakdown {
  transactionFee: number;
  processingFee: number;
  fixedProcessingFee: number;
  listingFee: number;
  totalFees: number;
}

export interface ProfitCalculation {
  revenue: number;
  fees: FeeBreakdown;
  supplierCost: number;
  netProfit: number;
  marginPercent: number;
}

// Exchange rate for NIS to USD (can be made dynamic later)
const NIS_TO_USD = 0.27; // Approximate, should be updated regularly
const FIXED_PROCESSING_FEE_NIS = 1.1;
const LISTING_FEE_USD = 0.20;

/**
 * Calculate all Etsy fees for an order
 */
export function calculateFees(revenue: number): FeeBreakdown {
  const transactionFee = revenue * 0.065; // 6.5%
  const processingFee = revenue * 0.045; // 4.5%
  const fixedProcessingFee = FIXED_PROCESSING_FEE_NIS * NIS_TO_USD; // Convert NIS to USD
  const listingFee = LISTING_FEE_USD;

  const totalFees = transactionFee + processingFee + fixedProcessingFee + listingFee;

  return {
    transactionFee,
    processingFee,
    fixedProcessingFee,
    listingFee,
    totalFees,
  };
}

/**
 * Calculate net profit for an order
 * Formula: Revenue - Total Fees - Supplier Cost
 */
export function calculateProfit(
  revenue: number,
  supplierCost: number = 0
): ProfitCalculation {
  const fees = calculateFees(revenue);
  const netProfit = revenue - fees.totalFees - supplierCost;
  const marginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    revenue,
    fees,
    supplierCost,
    netProfit,
    marginPercent,
  };
}

/**
 * Calculate total metrics for multiple orders
 */
export function calculateTotalMetrics(
  orders: Array<{ revenue: number; supplierCost: number }>
): {
  totalRevenue: number;
  totalProfit: number;
  totalFees: number;
  totalSupplierCost: number;
  averageMargin: number;
} {
  let totalRevenue = 0;
  let totalProfit = 0;
  let totalFees = 0;
  let totalSupplierCost = 0;

  orders.forEach((order) => {
    const profit = calculateProfit(order.revenue, order.supplierCost);
    totalRevenue += profit.revenue;
    totalProfit += profit.netProfit;
    totalFees += profit.fees.totalFees;
    totalSupplierCost += order.supplierCost;
  });

  const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalProfit,
    totalFees,
    totalSupplierCost,
    averageMargin,
  };
}

/**
 * Format currency with proper symbol and decimals
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage with proper decimals
 */
export function formatPercent(percent: number, decimals: number = 1): string {
  return `${percent.toFixed(decimals)}%`;
}
