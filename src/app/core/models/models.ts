export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: string;
  accountStatus: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  user: User;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface Region {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  isRepublicanCity: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface District {
  id: string;
  regionId: string;
  regionName: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

export interface VehicleType {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CargoType {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Vehicle {
  id: string;
  driverProfileId: string;
  vehicleTypeId: string;
  vehicleTypeName: string;
  plateNumber: string;
  brand?: string;
  model?: string;
  capacityKg?: number;
  volumeM3?: number;
  isActive: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehiclePlateNumber?: string;
  vehicleTypeId: string;
  vehicleTypeName: string;
  cargoTypeId: string;
  cargoTypeName: string;
  districtId: string;
  districtName: string;
  regionName?: string;
  pickupAddress: string;
  destinationAddress: string;
  description?: string;
  estimatedWeightKg?: number;
  estimatedVolumeM3?: number;
  scheduledAt: string;
  price?: number;
  status: string;
  cancellationReason?: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
}

export interface AdminStatistics {
  totalUsers: number;
  totalCustomers: number;
  totalDrivers: number;
  totalOrders: number;
  pendingOrders: number;
  acceptedOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  availableDrivers: number;
}

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: string;
  accountStatus: string;
  createdAt: string;
  hasActiveSubscription?: boolean;
  subscriptionEndsAt?: string | null;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: string;
  accountStatus: string;
  emailConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
  hasActiveSubscription: boolean;
  subscriptionEndsAt?: string | null;
  subscriptions: AdminSubscriptionItem[];
  customer?: AdminCustomerInfo | null;
  driver?: AdminDriverInfo | null;
  orderStats: AdminUserOrderStats;
  recentOrders: AdminUserOrderItem[];
}

export interface AdminSubscriptionItem {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  isActive: boolean;
  amount: number;
  currency: string;
  provider?: string;
  note?: string;
  createdAt: string;
}

export interface AdminCustomerInfo {
  profileId: string;
  defaultDistrictId?: string | null;
  defaultDistrictName?: string | null;
  regionName?: string | null;
  preferredLanguage?: string | null;
}

export interface AdminDriverInfo {
  profileId: string;
  districtId: string;
  districtName: string;
  regionName: string;
  isAvailable: boolean;
  licenseNumber?: string | null;
  availabilityNote?: string | null;
  averageRating: number;
  reviewCount: number;
  vehicles: AdminDriverVehicle[];
}

export interface AdminDriverVehicle {
  id: string;
  vehicleTypeId: string;
  vehicleTypeName: string;
  plateNumber: string;
  brand?: string | null;
  model?: string | null;
  capacityKg?: number | null;
  volumeM3?: number | null;
  isActive: boolean;
}

export interface AdminUserOrderStats {
  postedTotal: number;
  postedPending: number;
  postedCompleted: number;
  postedCancelled: number;
  assignedTotal: number;
  assignedInProgress: number;
  assignedCompleted: number;
}

export interface AdminUserOrderItem {
  id: string;
  orderNumber: string;
  status: string;
  relation: string;
  pickupAddress: string;
  destinationAddress: string;
  districtName: string;
  vehicleTypeName: string;
  cargoTypeName: string;
  price?: number | null;
  scheduledAt: string;
  createdAt: string;
}

export interface DriverProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  districtId: string;
  districtName: string;
  regionName?: string;
  isAvailable: boolean;
  licenseNumber?: string;
  availabilityNote?: string;
  averageRating: number;
  reviewCount: number;
}

export interface AvailableDriverVehicle {
  vehicleTypeId: string;
  vehicleTypeName: string;
  brand?: string;
  model?: string;
  capacityKg?: number;
}

export interface AvailableDriver {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  districtId: string;
  districtName: string;
  regionName?: string;
  availabilityNote?: string;
  averageRating: number;
  reviewCount: number;
  vehicles: AvailableDriverVehicle[];
}
