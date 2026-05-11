// ── Auth ──────────────────────────────────────────────────────
export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest {
  name: string; email: string; password: string;
  businessName: string; businessType?: string;
}
export interface AuthResponse {
  accessToken: string; refreshToken: string;
  user: User; tenant: Tenant;
}

// ── User ──────────────────────────────────────────────────────
export interface User {
  id: string; name: string; email: string;
  role: UserRole; isActive: boolean;
  tenantId?: string; lastLoginAt?: string;
  createdAt: string;
}
export type UserRole = 'superadmin' | 'admin' | 'cashier' | 'warehouse' | 'supervisor';

// ── Tenant ────────────────────────────────────────────────────
export interface Tenant {
  id: string; slug: string; businessName: string;
  businessType: BusinessType; logoUrl?: string;
  phone?: string; city?: string; taxId?: string;
  primaryColor: string; accentColor: string; colorTheme: string;
  status: TenantStatus; onboardingCompleted: boolean; onboardingStep: number;
  enabledModules: Record<string, boolean>;
  createdAt: string;
}
export type BusinessType =
  'bakery' | 'pastry' | 'hardware' | 'restaurant' |
  'boutique' | 'services' | 'grocery' | 'pharmacy' | 'other';
export type TenantStatus = 'pending' | 'active' | 'suspended' | 'cancelled';

// ── Plans ─────────────────────────────────────────────────────
export interface Plan {
  id: string; name: string; displayName: string;
  priceMonthly: number; maxUsers: number;
  maxExpensesPerMonth: number;
  features: Record<string, boolean>; isActive: boolean;
}
export interface TenantSubscription {
  id: string; tenantId: string; planId: string;
  plan: Plan; status: string;
  paymentMethod: string; amountPaid: number;
  activatedAt?: string; expiresAt?: string;
  createdAt: string; // <-- Faltaba esta
  tenant?: Tenant;
}

// ── Products ──────────────────────────────────────────────────
export interface Product {
  id: string; name: string; description?: string;
  sku?: string; imageUrl?: string;
  costPrice: number; salePrice: number;
  stock: number; minStock: number; unit: string;
  isActive: boolean; categoryId?: string;
  category?: Category; tenantId: string;
  createdAt: string;
}
export interface Category {
  id: string; name: string; color?: string;
  icon?: string; tenantId: string;
}

// ── Expenses ──────────────────────────────────────────────────
export interface Expense {
  id: string; 
  description: string; 
  amount: number;
  category: ExpenseCategory; 
  date: string;
  receiptUrl?: string; 
  notes?: string;
  
  // ── NUEVOS ATRIBUTOS DEL PROVEEDOR ─────────────────────────
  supplierId?: string | null;  // Identificador de la llave foránea
  supplier?: {                 // Objeto relacional del proveedor
    id: string;
    name: string;
  } | null;
  // ──────────────────────────────────────────────────────────

  tenantId: string; 
  createdById: string;
  createdBy?: User; 
  createdAt: string;
}

export type ExpenseCategory =
  'supplies' | 'utilities' | 'rent' | 'salary' |
  'transport' | 'maintenance' | 'marketing' | 'other';

// ── Sales ─────────────────────────────────────────────────────
export interface Sale {
  id: string; saleNumber: string;
  subtotal: number; discount: number; total: number;
  paymentType: PaymentType; status: SaleStatus;
  customerName?: string; notes?: string;
  items: SaleItem[]; tenantId: string;
  cashierId: string; cashier?: User; createdAt: string;
}
export interface SaleItem {
  id: string; productId: string; productName: string;
  quantity: number; unitPrice: number; subtotal: number;
}
export type PaymentType = 'cash' | 'card' | 'transfer' | 'nequi' | 'credit';
export type SaleStatus = 'completed' | 'cancelled' | 'refunded';

// ── Pagination ────────────────────────────────────────────────
export interface PagedResponse<T> {
  items: T[]; total: number; page: number; limit: number;
}

// ── Admin ─────────────────────────────────────────────────────
export interface AdminStats {
  totalTenants: number; activeTenants: number;
  pendingTenants: number; totalUsers: number; pendingPayments: number;
}
