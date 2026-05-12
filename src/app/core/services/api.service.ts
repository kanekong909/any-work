import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Tenant, Product, Category, Expense, Sale, Plan,
  TenantSubscription, PagedResponse, AdminStats, User
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  // ── Tenant / Onboarding ───────────────────────────────────
  getTenant(): Observable<Tenant> {
    return this.http.get<Tenant>(`${this.api}/tenants/me`);
  }
  updateTenant(data: Partial<Tenant>): Observable<Tenant> {
    return this.http.patch<Tenant>(`${this.api}/tenants/me`, data);
  }
  saveOnboardingStep(step: number, data: any): Observable<any> {
    return this.http.post(`${this.api}/tenants/onboarding`, { step, data });
  }

  // ── Products ──────────────────────────────────────────────
  getProducts(params?: any): Observable<PagedResponse<Product>> {
    return this.http.get<PagedResponse<Product>>(`${this.api}/products`, { params });
  }
  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.api}/products/${id}`);
  }
  createProduct(data: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.api}/products`, data);
  }
  updateProduct(id: string, data: Partial<Product>): Observable<Product> {
    return this.http.patch<Product>(`${this.api}/products/${id}`, data);
  }
  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.api}/products/${id}`);
  }
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.api}/products/categories/all`);
  }
  createCategory(data: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(`${this.api}/products/categories`, data);
  }
  updateCategory(id: string, data: any): Observable<any> {
  return this.http.patch<any>(`${this.api}/products/categories/${id}`, data);
  }
  deleteCategory(id: string): Observable<any> {
    return this.http.delete(`${this.api}/products/categories/${id}`);
  }

  // ── Expenses ──────────────────────────────────────────────
  getExpenses(params?: any): Observable<PagedResponse<Expense> & { sum: number }> {
    return this.http.get<any>(`${this.api}/expenses`, { params });
  }
  createExpense(data: Partial<Expense>): Observable<Expense> {
    return this.http.post<Expense>(`${this.api}/expenses`, data);
  }
  updateExpense(id: string, data: Partial<Expense>): Observable<Expense> {
    return this.http.patch<Expense>(`${this.api}/expenses/${id}`, data);
  }
  deleteExpense(id: string): Observable<any> {
    return this.http.delete(`${this.api}/expenses/${id}`);
  }
  // En api.service.ts
  getExpensesMonths(): Observable<{ month: number; year: number }[]> {
    return this.http.get<{ month: number; year: number }[]>(`${this.api}/expenses/months`);
  }

  // ── Sales ─────────────────────────────────────────────────
  getSales(params?: any): Observable<PagedResponse<Sale> & { totalRevenue: number }> {
    return this.http.get<any>(`${this.api}/sales`, { params });
  }
  createSale(data: any): Observable<Sale> {
    return this.http.post<Sale>(`${this.api}/sales`, data);
  }
  getSalesSummary(): Observable<{ today: any; month: any }> {
    return this.http.get<any>(`${this.api}/sales/summary`);
  }
  updateSale(id: string, data: any): Observable<any> {
  return this.http.patch<any>(`${this.api}/sales/${id}`, data);
  }
  deleteSale(id: string): Observable<any> {
    return this.http.delete(`${this.api}/sales/${id}`);
  }

  // ── Plans ─────────────────────────────────────────────────
  getPlans(): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${this.api}/plans`);
  }
  getMySubscription(): Observable<TenantSubscription> {
    return this.http.get<TenantSubscription>(`${this.api}/plans/my-subscription`);
  }
  requestUpgrade(data: any): Observable<any> {
    return this.http.post(`${this.api}/plans/request-upgrade`, data);
  }

  // ── Users ─────────────────────────────────────────────────
  getUsers(): Observable<any[]> {
  return this.http.get<any[]>(`${this.api}/users`);
  }
  createUser(data: any): Observable<any> {
    return this.http.post<any>(`${this.api}/users`, data);
  }
  updateUser(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.api}/users/${id}`, data);
  }
  deleteUser(id: string): Observable<any> { // 👈 NUEVO MÉTODO
    return this.http.delete<any>(`${this.api}/users/${id}`);
  }

  // ── Customers ─────────────────────────────────────────────────
  getCustomers(params?: any) { 
    return this.http.get<any>(`${this.api}/customers`, { params }); 
  }
  createCustomer(data: any) { 
    return this.http.post<any>(`${this.api}/customers`, data); 
  }
  updateCustomer(id: string, data: any) { 
    return this.http.patch<any>(`${this.api}/customers/${id}`, data); 
  }
  deleteCustomer(id: string) { 
    return this.http.delete(`${this.api}/customers/${id}`); 
  }

  // ── Suppliers ─────────────────────────────────────────────────
  getSuppliers(params?: any) { 
    return this.http.get<any>(`${this.api}/suppliers`, { params }); 
  }
  createSupplier(data: any) { 
    return this.http.post<any>(`${this.api}/suppliers`, data); 
  }
  updateSupplier(id: string, data: any) { 
    return this.http.patch<any>(`${this.api}/suppliers/${id}`, data); 
  }
  deleteSupplier(id: string) { 
    return this.http.delete(`${this.api}/suppliers/${id}`); 
  }

  // ── Reports ───────────────────────────────────────────────────
  getReportSummary(from: string, to: string): Observable<any> {
    return this.http.get<any>(`${this.api}/reports/summary`, { params: { from, to } });
  }
  getSalesDetail(from: string, to: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/reports/sales-detail`, { params: { from, to } });
  }

  // ── Audit ───────────────────────────────────────────────────
  getAuditLogs(params?: any): Observable<any> {
    return this.http.get(`${this.api}/audit`, { params });
  }

  // ── Admin ─────────────────────────────────────────────────
  getAdminStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.api}/admin/stats`);
  }
  getAdminTenants(params?: any): Observable<PagedResponse<Tenant>> {
    return this.http.get<any>(`${this.api}/admin/tenants`, { params });
  }
  updateTenantStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.api}/admin/tenants/${id}/status`, { status });
  }
  getPendingSubscriptions(): Observable<TenantSubscription[]> {
    return this.http.get<TenantSubscription[]>(`${this.api}/admin/subscriptions/pending`);
  }
  activateSubscription(id: string, notes?: string): Observable<any> {
    return this.http.post(`${this.api}/admin/subscriptions/${id}/activate`, { notes });
  }
  rejectSubscription(id: string, reason: string): Observable<any> {
    return this.http.post(`${this.api}/admin/subscriptions/${id}/reject`, { reason });
  }
  
  // ── Eliminar cuenta ─────────────────────────────────────────────────
  deleteTenant(): Observable<any> {
    return this.http.delete(`${this.api}/tenants/me`);
  }

  // ── Subir Logo ─────────────────────────────────────────────────
  uploadLogo(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post(`${this.api}/tenants/me/logo`, formData);
  }

  // ── Bold ─────────────────────────────────────────────────
  getBoldCheckoutLink(tenantId: string, planId: string): Observable<any> {
    return this.http.get<any>(`${this.api}/payments/bold/links`, {
      params: { tenantId, planId }
    });
  }

}
