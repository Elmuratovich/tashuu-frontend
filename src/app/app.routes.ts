import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/marketplace/marketplace-home.component').then(m => m.MarketplaceHomeComponent)
  },
  {
    path: 'orders/:id',
    loadComponent: () => import('./features/marketplace/marketplace-order-detail.component').then(m => m.MarketplaceOrderDetailComponent)
  },
  {
    path: 'drivers',
    loadComponent: () => import('./features/marketplace/marketplace-drivers.component').then(m => m.MarketplaceDriversComponent)
  },
  {
    path: 'taxi',
    loadComponent: () => import('./features/taxi/taxi-booking.component').then(m => m.TaxiBookingComponent)
  },
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'register/customer', loadComponent: () => import('./features/auth/register-customer/register-customer.component').then(m => m.RegisterCustomerComponent) },
  { path: 'register/driver', loadComponent: () => import('./features/auth/register-driver/register-driver.component').then(m => m.RegisterDriverComponent) },
  {
    path: 'customer/orders',
    canActivate: [authGuard, roleGuard('Customer')],
    loadComponent: () => import('./features/customer/order-list/order-list.component').then(m => m.OrderListComponent)
  },
  {
    path: 'customer/orders/new',
    canActivate: [authGuard, roleGuard('Customer', 'Driver')],
    loadComponent: () => import('./features/customer/order-create/order-create.component').then(m => m.OrderCreateComponent)
  },
  {
    path: 'customer/orders/:id',
    canActivate: [authGuard, roleGuard('Customer')],
    loadComponent: () => import('./features/customer/order-detail/order-detail.component').then(m => m.OrderDetailComponent)
  },
  {
    path: 'driver/orders',
    canActivate: [authGuard, roleGuard('Driver')],
    loadComponent: () => import('./features/driver/available-orders/available-orders.component').then(m => m.AvailableOrdersComponent)
  },
  {
    path: 'driver/orders/:id',
    canActivate: [authGuard, roleGuard('Driver')],
    loadComponent: () => import('./features/driver/driver-order-detail/driver-order-detail.component').then(m => m.DriverOrderDetailComponent)
  },
  {
    path: 'driver/vehicles',
    canActivate: [authGuard, roleGuard('Driver')],
    loadComponent: () => import('./features/driver/vehicles/vehicles.component').then(m => m.VehiclesComponent)
  },
  {
    path: 'driver/profile',
    canActivate: [authGuard, roleGuard('Driver')],
    loadComponent: () => import('./features/driver/profile/profile.component').then(m => m.DriverProfileComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard('Admin')],
    loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.AdminDashboardComponent)
  },
  {
    path: 'admin/users',
    canActivate: [authGuard, roleGuard('Admin')],
    loadComponent: () => import('./features/admin/users/users.component').then(m => m.AdminUsersComponent)
  },
  {
    path: 'admin/users/:id',
    canActivate: [authGuard, roleGuard('Admin')],
    loadComponent: () => import('./features/admin/users/user-detail.component').then(m => m.AdminUserDetailComponent)
  },
  {
    path: 'admin/orders',
    canActivate: [authGuard, roleGuard('Admin')],
    loadComponent: () => import('./features/admin/orders/admin-orders.component').then(m => m.AdminOrdersComponent)
  },
  {
    path: 'admin/vehicle-types',
    canActivate: [authGuard, roleGuard('Admin')],
    loadComponent: () => import('./features/admin/vehicle-types/vehicle-types.component').then(m => m.AdminVehicleTypesComponent)
  },
  {
    path: 'admin/cargo-types',
    canActivate: [authGuard, roleGuard('Admin')],
    loadComponent: () => import('./features/admin/cargo-types/cargo-types.component').then(m => m.AdminCargoTypesComponent)
  },
  {
    path: 'admin/locations',
    canActivate: [authGuard, roleGuard('Admin')],
    loadComponent: () => import('./features/admin/locations/locations.component').then(m => m.AdminLocationsComponent)
  }
];
