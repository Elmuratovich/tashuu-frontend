import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResponse, Order, Region, District, VehicleType, CargoType, Vehicle, AdminStatistics, UserListItem, AdminUserDetail, DriverProfile, AvailableDriver } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getRegions() {
    return this.http.get<Region[]>(`${environment.apiUrl}/regions`);
  }

  getAllRegions() {
    return this.http.get<Region[]>(`${environment.apiUrl}/regions/all`);
  }

  upsertRegion(id: string | null, body: unknown) {
    return id
      ? this.http.put<Region>(`${environment.apiUrl}/regions/${id}`, body)
      : this.http.post<Region>(`${environment.apiUrl}/regions`, body);
  }

  getDistricts(regionId?: string) {
    let params = new HttpParams();
    if (regionId) params = params.set('regionId', regionId);
    return this.http.get<District[]>(`${environment.apiUrl}/districts`, { params });
  }

  getAllDistricts(regionId?: string) {
    let params = new HttpParams();
    if (regionId) params = params.set('regionId', regionId);
    return this.http.get<District[]>(`${environment.apiUrl}/districts/all`, { params });
  }

  upsertDistrict(id: string | null, body: unknown) {
    return id
      ? this.http.put<District>(`${environment.apiUrl}/districts/${id}`, body)
      : this.http.post<District>(`${environment.apiUrl}/districts`, body);
  }

  getVehicleTypes() {
    return this.http.get<VehicleType[]>(`${environment.apiUrl}/vehicle-types`);
  }

  getCargoTypes() {
    return this.http.get<CargoType[]>(`${environment.apiUrl}/cargo-types`);
  }

  getOrders(params: Record<string, string | number | boolean>) {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<PaginatedResponse<Order>>(`${environment.apiUrl}/orders`, { params: httpParams });
  }

  getMarketplaceOrders(params: Record<string, string | number | boolean> = {}) {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<PaginatedResponse<Order>>(`${environment.apiUrl}/marketplace/orders`, { params: httpParams });
  }

  getMarketplaceOrder(id: string) {
    return this.http.get<Order>(`${environment.apiUrl}/marketplace/orders/${id}`);
  }

  getMarketplaceDrivers(params: Record<string, string | number | boolean> = {}) {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<PaginatedResponse<AvailableDriver>>(`${environment.apiUrl}/marketplace/drivers`, { params: httpParams });
  }

  getOrder(id: string) {
    return this.http.get<Order>(`${environment.apiUrl}/orders/${id}`);
  }

  createOrder(body: unknown) {
    return this.http.post<Order>(`${environment.apiUrl}/orders`, body);
  }

  updateOrder(id: string, body: unknown) {
    return this.http.put<Order>(`${environment.apiUrl}/orders/${id}`, body);
  }

  acceptOrder(id: string, vehicleId: string) {
    return this.http.post<Order>(`${environment.apiUrl}/orders/${id}/accept`, { vehicleId });
  }

  startOrder(id: string) {
    return this.http.post<Order>(`${environment.apiUrl}/orders/${id}/start`, {});
  }

  completeOrder(id: string) {
    return this.http.post<Order>(`${environment.apiUrl}/orders/${id}/complete`, {});
  }

  cancelOrder(id: string, reason?: string) {
    return this.http.post<Order>(`${environment.apiUrl}/orders/${id}/cancel`, { reason });
  }

  createReview(body: { orderId: string; rating: number; comment?: string }) {
    return this.http.post(`${environment.apiUrl}/reviews`, body);
  }

  getVehicles() {
    return this.http.get<Vehicle[]>(`${environment.apiUrl}/vehicles`);
  }

  createVehicle(body: unknown) {
    return this.http.post<Vehicle>(`${environment.apiUrl}/vehicles`, body);
  }

  updateVehicle(id: string, body: unknown) {
    return this.http.put<Vehicle>(`${environment.apiUrl}/vehicles/${id}`, body);
  }

  deleteVehicle(id: string) {
    return this.http.delete(`${environment.apiUrl}/vehicles/${id}`);
  }

  getDriverProfile() {
    return this.http.get<DriverProfile>(`${environment.apiUrl}/drivers/me`);
  }

  updateDriverProfile(body: { isAvailable: boolean; licenseNumber?: string; availabilityNote?: string }) {
    return this.http.put<DriverProfile>(`${environment.apiUrl}/drivers/me`, body);
  }

  getAdminStatistics() {
    return this.http.get<AdminStatistics>(`${environment.apiUrl}/admin/statistics`);
  }

  getAdminUsers(params: {
    page?: number;
    pageSize?: number;
    role?: string;
    search?: string;
    accountStatus?: string;
  } = {}) {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('pageSize', String(params.pageSize ?? 20));
    if (params.role) httpParams = httpParams.set('role', params.role);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.accountStatus) httpParams = httpParams.set('accountStatus', params.accountStatus);
    return this.http.get<PaginatedResponse<UserListItem>>(`${environment.apiUrl}/admin/users`, { params: httpParams });
  }

  getAdminUser(id: string) {
    return this.http.get<AdminUserDetail>(`${environment.apiUrl}/admin/users/${id}`);
  }

  createAdminUser(body: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string | null;
    role: string;
    districtId?: string | null;
  }) {
    return this.http.post<UserListItem>(`${environment.apiUrl}/admin/users`, body);
  }

  updateAdminUser(id: string, body: {
    firstName: string;
    lastName: string;
    phoneNumber?: string | null;
    accountStatus?: string;
  }) {
    return this.http.put<UserListItem>(`${environment.apiUrl}/admin/users/${id}`, body);
  }

  markUserSubscriptionPaid(id: string, months = 1, amount = 500) {
    let params = new HttpParams().set('months', months).set('amount', amount);
    return this.http.post(`${environment.apiUrl}/admin/users/${id}/subscription`, {}, { params });
  }

  cancelUserSubscription(id: string) {
    return this.http.delete(`${environment.apiUrl}/admin/users/${id}/subscription`);
  }

  blockUser(id: string) {
    return this.http.put(`${environment.apiUrl}/admin/users/${id}/block`, {});
  }

  unblockUser(id: string) {
    return this.http.put(`${environment.apiUrl}/admin/users/${id}/unblock`, {});
  }

  getAllVehicleTypes() {
    return this.http.get<VehicleType[]>(`${environment.apiUrl}/vehicle-types/all`);
  }

  getAllCargoTypes() {
    return this.http.get<CargoType[]>(`${environment.apiUrl}/cargo-types/all`);
  }

  upsertVehicleType(id: string | null, body: unknown) {
    return id
      ? this.http.put(`${environment.apiUrl}/vehicle-types/${id}`, body)
      : this.http.post(`${environment.apiUrl}/vehicle-types`, body);
  }

  upsertCargoType(id: string | null, body: unknown) {
    return id
      ? this.http.put(`${environment.apiUrl}/cargo-types/${id}`, body)
      : this.http.post(`${environment.apiUrl}/cargo-types`, body);
  }
}
