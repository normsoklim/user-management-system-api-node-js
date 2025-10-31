# Angular 20 Integration Guide with Express User Management API

## 1. Project Setup

### Prerequisites
- Node.js 18+ installed
- Angular CLI 17+ installed
- MongoDB database running
- Express API server running on `http://localhost:3000`

### Creating a New Angular Project
```bash
ng new user-management-frontend --strict=true --style=scss --routing=true
cd user-management-frontend
```

### Installing Required Dependencies
```bash
npm install @angular/material @angular/cdk @angular/animations
npm install @angular/forms @angular/common @angular/router
npm install rxjs
```

## 2. Environment Configuration

### Environment Files
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://your-production-api.com/api'
};
```

## 3. Core Services Implementation

### AuthService Implementation
```typescript
// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { User, AuthResponse, LoginCredentials, RegisterData } from '../models';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authState = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    loading: false,
    error: null
  });
  
  public authState$ = this.authState.asObservable();
  
  // Selectors
  isAuthenticated$ = this.authState$.pipe(
    map(state => state.isAuthenticated)
  );
  
  user$ = this.authState$.pipe(
    map(state => state.user)
  );
  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Check for existing tokens on app initialization
    this.checkInitialAuthState();
  }
  
  private checkInitialAuthState(): void {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const user = localStorage.getItem('user');
    
    if (accessToken && refreshToken && user) {
      try {
        const parsedUser = JSON.parse(user);
        this.setAuthState({
          accessToken,
          refreshToken,
          user: parsedUser
        });
      } catch (error) {
        // Clear invalid data
        this.clearAuthState();
      }
    }
  }
  
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.setLoading(true);
    
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.setAuthState(response);
          this.setLoading(false);
        }),
        catchError(error => {
          this.setError(error.error?.message || 'Login failed');
          this.setLoading(false);
          return throwError(() => error);
        })
      );
  }
  
  register(userData: RegisterData): Observable<AuthResponse> {
    this.setLoading(true);
    
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, userData)
      .pipe(
        tap(response => {
          // Optionally auto-login after registration
          this.setAuthState(response);
          this.setLoading(false);
        }),
        catchError(error => {
          this.setError(error.error?.message || 'Registration failed');
          this.setLoading(false);
          return throwError(() => error);
        })
      );
  }
  
  logout(): Observable<void> {
    const refreshToken = this.authState.value.refreshToken;
    
    return this.http.post<void>(`${environment.apiUrl}/auth/logout`, { refreshToken })
      .pipe(
        tap(() => {
          this.clearAuthState();
          this.router.navigate(['/login']);
        }),
        catchError(error => {
          // Even if logout fails on server, clear local state
          this.clearAuthState();
          this.router.navigate(['/login']);
          return throwError(() => error);
        })
      );
  }
  
  refreshToken(): Observable<{ accessToken: string }> {
    const refreshToken = this.authState.value.refreshToken;
    
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    
    return this.http.post<{ accessToken: string }>(
      `${environment.apiUrl}/auth/refresh`, 
      { refreshToken }
    ).pipe(
      tap(response => {
        const newState: AuthState = {
          ...this.authState.value,
          accessToken: response.accessToken
        };
        this.authState.next(newState);
        localStorage.setItem('accessToken', response.accessToken);
      }),
      catchError(error => {
        // If refresh fails, force logout
        this.clearAuthState();
        this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }
  
  loadProfile(): Observable<User> {
    return this.http.get<{ data: User }>(`${environment.apiUrl}/auth/profile`)
      .pipe(
        tap(response => {
          const newState: AuthState = {
            ...this.authState.value,
            user: response.data
          };
          this.authState.next(newState);
          localStorage.setItem('user', JSON.stringify(response.data));
        }),
        catchError(error => {
          this.setError(error.error?.message || 'Failed to load profile');
          return throwError(() => error);
        })
      );
  }
  
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/change-password`, {
      currentPassword,
      newPassword
    }).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }
  
  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/forgot-password`, { email })
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }
  
  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/reset-password`, {
      token,
      newPassword
    }).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }
  
  isAuthenticated(): boolean {
    return this.authState.value.isAuthenticated;
  }
  
  getAccessToken(): string | null {
    return this.authState.value.accessToken;
  }
  
  getUser(): User | null {
    return this.authState.value.user;
  }
  
  private setAuthState(response: AuthResponse): void {
    const newState: AuthState = {
      isAuthenticated: true,
      user: response.data.user,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      loading: false,
      error: null
    };
    
    this.authState.next(newState);
    
    // Persist to localStorage
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  
  private clearAuthState(): void {
    const newState: AuthState = {
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      loading: false,
      error: null
    };
    
    this.authState.next(newState);
    
    // Clear from localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
  
  private setLoading(loading: boolean): void {
    const newState: AuthState = {
      ...this.authState.value,
      loading
    };
    
    this.authState.next(newState);
  }
  
  private setError(error: string | null): void {
    const newState: AuthState = {
      ...this.authState.value,
      error
    };
    
    this.authState.next(newState);
  }
}
```

### UserService Implementation
```typescript
// src/app/core/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User, PaginatedResponse, UserQueryParams, CreateUserDto, UpdateUserDto } from '../models';

export interface UserState {
  users: User[];
  selectedUser: User | null;
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  filters: {
    search: string;
    role: string | null;
    status: boolean | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private userState = new BehaviorSubject<UserState>({
    users: [],
    selectedUser: null,
    loading: false,
    error: null,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10
    },
    filters: {
      search: '',
      role: null,
      status: null
    }
  });
  
  public userState$ = this.userState.asObservable();
  
  // Selectors
  users$ = this.userState$.pipe(map(state => state.users));
  selectedUser$ = this.userState$.pipe(map(state => state.selectedUser));
  loading$ = this.userState$.pipe(map(state => state.loading));
  error$ = this.userState$.pipe(map(state => state.error));
  pagination$ = this.userState$.pipe(map(state => state.pagination));
  
  constructor(private http: HttpClient) {}
  
  loadUsers(params?: UserQueryParams): void {
    this.setLoading(true);
    
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof UserQueryParams];
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    
    this.http.get<PaginatedResponse<User>>(`${environment.apiUrl}/users`, { params: httpParams })
      .pipe(
        catchError(error => {
          this.setError(error.error?.message || 'Failed to load users');
          this.setLoading(false);
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.setUsers(response.data, {
            currentPage: response.currentPage,
            totalPages: response.totalPages,
            totalItems: response.totalItems,
            itemsPerPage: response.itemsPerPage
          });
        }
        this.setLoading(false);
      });
  }
  
  getUserById(id: string): Observable<User> {
    return this.http.get<{ data: User }>(`${environment.apiUrl}/users/${id}`)
      .pipe(
        map(response => response.data),
        tap(user => {
          const newState: UserState = {
            ...this.userState.value,
            selectedUser: user
          };
          this.userState.next(newState);
        }),
        catchError(error => {
          this.setError(error.error?.message || 'Failed to load user');
          return throwError(() => error);
        })
      );
  }
  
  createUser(userData: CreateUserDto): Observable<User> {
    return this.http.post<{ data: User }>(`${environment.apiUrl}/users`, userData)
      .pipe(
        map(response => response.data),
        tap(newUser => {
          // Add to users list
          const currentUsers = this.userState.value.users;
          const newState: UserState = {
            ...this.userState.value,
            users: [newUser, ...currentUsers]
          };
          this.userState.next(newState);
        }),
        catchError(error => {
          this.setError(error.error?.message || 'Failed to create user');
          return throwError(() => error);
        })
      );
  }
  
  updateUser(id: string, userData: UpdateUserDto): Observable<User> {
    return this.http.put<{ data: User }>(`${environment.apiUrl}/users/${id}`, userData)
      .pipe(
        map(response => response.data),
        tap(updatedUser => {
          // Update in users list
          const currentUsers = this.userState.value.users;
          const updatedUsers = currentUsers.map(user => 
            user._id === id ? updatedUser : user
          );
          
          const newState: UserState = {
            ...this.userState.value,
            users: updatedUsers,
            selectedUser: updatedUser
          };
          this.userState.next(newState);
        }),
        catchError(error => {
          this.setError(error.error?.message || 'Failed to update user');
          return throwError(() => error);
        })
      );
  }
  
  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/users/${id}`)
      .pipe(
        tap(() => {
          // Remove from users list
          const currentUsers = this.userState.value.users;
          const updatedUsers = currentUsers.filter(user => user._id !== id);
          
          const newState: UserState = {
            ...this.userState.value,
            users: updatedUsers
          };
          this.userState.next(newState);
        }),
        catchError(error => {
          this.setError(error.error?.message || 'Failed to delete user');
          return throwError(() => error);
        })
      );
  }
  
  updateProfile(profileData: UpdateUserDto): Observable<User> {
    return this.http.put<{ data: User }>(`${environment.apiUrl}/users/profile`, profileData)
      .pipe(
        map(response => response.data),
        catchError(error => {
          this.setError(error.error?.message || 'Failed to update profile');
          return throwError(() => error);
        })
      );
  }
  
  updatePagination(page: number): void {
    const currentFilters = this.userState.value.filters;
    this.loadUsers({ 
      ...currentFilters, 
      page,
      limit: this.userState.value.pagination.itemsPerPage
    });
  }
  
  updateFilters(filters: Partial<UserState['filters']>): void {
    const newFilters = { ...this.userState.value.filters, ...filters };
    const newState: UserState = {
      ...this.userState.value,
      filters: newFilters
    };
    this.userState.next(newState);
    
    this.loadUsers({ ...newFilters, page: 1, limit: this.userState.value.pagination.itemsPerPage });
  }
  
  getPagination(): UserState['pagination'] {
    return this.userState.value.pagination;
  }
  
  private setUsers(users: User[], pagination: UserState['pagination']): void {
    const newState: UserState = {
      ...this.userState.value,
      users,
      pagination
    };
    
    this.userState.next(newState);
  }
  
  private setLoading(loading: boolean): void {
    const newState: UserState = {
      ...this.userState.value,
      loading
    };
    
    this.userState.next(newState);
  }
  
  private setError(error: string | null): void {
    const newState: UserState = {
      ...this.userState.value,
      error
    };
    
    this.userState.next(newState);
  }
}
```

### RoleService Implementation
```typescript
// src/app/core/services/role.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Role, CreateRoleDto, UpdateRoleDto } from '../models';

export interface RoleState {
  roles: Role[];
  selectedRole: Role | null;
  permissions: string[];
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private roleState = new BehaviorSubject<RoleState>({
    roles: [],
    selectedRole: null,
    permissions: [],
    loading: false,
    error: null
  });
  
  public roleState$ = this.roleState.asObservable();
  
  // Selectors
  roles$ = this.roleState$.pipe(map(state => state.roles));
  selectedRole$ = this.roleState$.pipe(map(state => state.selectedRole));
  permissions$ = this.roleState$.pipe(map(state => state.permissions));
  loading$ = this.roleState$.pipe(map(state => state.loading));
  error$ = this.roleState$.pipe(map(state => state.error));
  
  constructor(private http: HttpClient) {}
  
  loadRoles(): void {
    this.setLoading(true);
    
    this.http.get<{ data: Role[] }>(`${environment.apiUrl}/roles`)
      .pipe(
        catchError(error => {
          this.setError(error.error?.message || 'Failed to load roles');
          this.setLoading(false);
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.setRoles(response.data);
        }
        this.setLoading(false);
      });
  }
  
  getRoleById(id: string): Observable<Role> {
    return this.http.get<{ data: Role }>(`${environment.apiUrl}/roles/${id}`)
      .pipe(
        map(response => response.data),
        tap(role => {
          const newState: RoleState = {
            ...this.roleState.value,
            selectedRole: role
          };
          this.roleState.next(newState);
        }),
        catchError(error => {
          this.setError(error.error?.message || 'Failed to load role');
          return throwError(() => error);
        })
      );
  }
  
  createRole(roleData: CreateRoleDto): Observable<Role> {
    return this.http.post<{ data: Role }>(`${environment.apiUrl}/roles`, roleData)
      .pipe(
        map(response => response.data),
        tap(newRole => {
          // Add to roles list
          const currentRoles = this.roleState.value.roles;
          const newState: RoleState = {
            ...this.roleState.value,
            roles: [newRole, ...currentRoles]
          };
          this.roleState.next(newState);
        }),
        catchError(error => {
          this.setError(error.error?.message || 'Failed to create role');
          return throwError(() => error);
        })
      );
  }
  
  updateRole(id: string, roleData: UpdateRoleDto): Observable<Role> {
    return this.http.put<{ data: Role }>(`${environment.apiUrl}/roles/${id}`, roleData)
      .pipe(
        map(response => response.data),
        tap(updatedRole => {
          // Update in roles list
          const currentRoles = this.roleState.value.roles;
          const updatedRoles = currentRoles.map(role => 
            role._id === id ? updatedRole : role
          );
          
          const newState: RoleState = {
            ...this.roleState.value,
            roles: updatedRoles,
            selectedRole: updatedRole
          };
          this.roleState.next(newState);
        }),
        catchError(error => {
          this.setError(error.error?.message || 'Failed to update role');
          return throwError(() => error);
        })
      );
  }
  
  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/roles/${id}`)
      .pipe(
        tap(() => {
          // Remove from roles list
          const currentRoles = this.roleState.value.roles;
          const updatedRoles = currentRoles.filter(role => role._id !== id);
          
          const newState: RoleState = {
            ...this.roleState.value,
            roles: updatedRoles
          };
          this.roleState.next(newState);
        }),
        catchError(error => {
          this.setError(error.error?.message || 'Failed to delete role');
          return throwError(() => error);
        })
      );
  }
  
  loadPermissions(): void {
    this.http.get<{ data: string[] }>(`${environment.apiUrl}/roles/permissions`)
      .pipe(
        catchError(error => {
          this.setError(error.error?.message || 'Failed to load permissions');
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          const newState: RoleState = {
            ...this.roleState.value,
            permissions: response.data
          };
          this.roleState.next(newState);
        }
      });
  }
  
  private setRoles(roles: Role[]): void {
    const newState: RoleState = {
      ...this.roleState.value,
      roles
    };
    
    this.roleState.next(newState);
  }
  
  private setLoading(loading: boolean): void {
    const newState: RoleState = {
      ...this.roleState.value,
      loading
    };
    
    this.roleState.next(newState);
  }
  
  private setError(error: string | null): void {
    const newState: RoleState = {
      ...this.roleState.value,
      error
    };
    
    this.roleState.next(newState);
  }
}
```

## 4. HTTP Interceptors

### AuthInterceptor Implementation
```typescript
// src/app/core/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Clone the request and add the authorization header
    const accessToken = this.authService.getAccessToken();
    
    if (accessToken) {
      const authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${accessToken}`)
      });
      
      return next.handle(authReq).pipe(
        catchError(error => {
          // Handle 401 errors (token expired)
          if (error.status === 401) {
            // Try to refresh the token
            return this.authService.refreshToken().pipe(
              catchError(refreshError => {
                // If refresh fails, logout and redirect to login
                this.authService.logout().subscribe();
                return throwError(() => refreshError);
              })
            );
          }
          
          return throwError(() => error);
        })
      );
    }
    
    return next.handle(req);
  }
}
```

### ErrorInterceptor Implementation
```typescript
// src/app/core/interceptors/error.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private snackBar: MatSnackBar,
    private router: Router
  ) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An error occurred';
        
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 0) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (error.status === 400) {
          errorMessage = 'Invalid request data.';
        } else if (error.status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (error.status === 404) {
          errorMessage = 'The requested resource was not found.';
        } else if (error.status === 409) {
          errorMessage = 'Resource conflict. Please check your data.';
        } else if (error.status === 500) {
          errorMessage = 'A server error occurred. Please try again later.';
        }
        
        // Show error message
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        
        return throwError(() => error);
      })
    );
  }
}
```

## 5. Route Guards

### AuthGuard Implementation
```typescript
// src/app/core/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (this.authService.isAuthenticated()) {
      return true;
    }
    
    // Redirect to login page
    return this.router.createUrlTree(['/login']);
  }
}
```

### RoleGuard Implementation
```typescript
// src/app/core/guards/role.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { RbacService } from '../services/rbac.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private rbacService: RbacService,
    private router: Router
  ) {}
  
  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const requiredPermission = route.data['permission'];
    
    if (!requiredPermission) {
      return true; // No permission required
    }
    
    const user = this.authService.getUser();
    
    if (user && this.rbacService.hasPermission(user, requiredPermission)) {
      return true;
    }
    
    // Redirect to unauthorized page or home
    return this.router.createUrlTree(['/unauthorized']);
  }
}
```

## 6. RBAC Service

### RbacService Implementation
```typescript
// src/app/core/services/rbac.service.ts
import { Injectable } from '@angular/core';
import { User } from '../models';

@Injectable({
  providedIn: 'root'
})
export class RbacService {
  /**
   * Check if user has a specific permission
   * @param user - User object with role populated
   * @param requiredPermission - Permission to check
   * @returns True if user has permission
   */
  hasPermission(user: User | null, requiredPermission: string): boolean {
    // Check if user exists and has role
    if (!user || !user.role) {
      return false;
    }
    
    // Super admin has all permissions
    if (user.role.permissions && user.role.permissions.includes('*:*')) {
      return true;
    }
    
    // Check for exact permission
    if (user.role.permissions && user.role.permissions.includes(requiredPermission)) {
      return true;
    }
    
    // Check for wildcard permissions (e.g., "user:*")
    const [resource] = requiredPermission.split(':');
    if (user.role.permissions && user.role.permissions.includes(`${resource}:*`)) {
      return true;
    }
    
    // Special case for self permissions
    if (requiredPermission.endsWith(':self')) {
      const basePermission = requiredPermission.replace(':self', '');
      return this.hasPermission(user, basePermission);
    }
    
    return false;
  }
  
  /**
   * Check if user can access their own resource
   * @param user - User object
   * @param resourceUserId - ID of the resource owner
   * @param requiredPermission - Permission to check
   * @returns True if user can access resource
   */
  canAccessResource(user: User | null, resourceUserId: string, requiredPermission: string): boolean {
    // If user is the resource owner, check self permissions
    if (user && user._id && user._id.toString() === resourceUserId.toString()) {
      const selfPermission = requiredPermission + ':self';
      return this.hasPermission(user, selfPermission);
    }
    
    // Otherwise, check regular permissions
    return this.hasPermission(user, requiredPermission);
  }
  
  /**
   * Get all permissions for a user
   * @param user - User object with role populated
   * @returns Array of permissions
   */
  getUserPermissions(user: User | null): string[] {
    if (!user || !user.role || !user.role.permissions) {
      return [];
    }
    
    return user.role.permissions;
  }
  
  /**
   * Check if user has any of the specified permissions
   * @param user - User object with role populated
   * @param permissions - Array of permissions to check
   * @returns True if user has any of the permissions
   */
  hasAnyPermission(user: User | null, permissions: string[]): boolean {
    if (!permissions || permissions.length === 0) {
      return false;
    }
    
    return permissions.some(permission => this.hasPermission(user, permission));
  }
  
  /**
   * Check if user has all of the specified permissions
   * @param user - User object with role populated
   * @param permissions - Array of permissions to check
   * @returns True if user has all permissions
   */
  hasAllPermissions(user: User | null, permissions: string[]): boolean {
    if (!permissions || permissions.length === 0) {
      return false;
    }
    
    return permissions.every(permission => this.hasPermission(user, permission));
  }
}
```

## 7. Data Models

### Core Models
```typescript
// src/app/core/models/index.ts
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  isActive: boolean;
  avatar?: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  _id: string;
  name: string;
  permissions: string[];
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  _id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  before?: any;
  after?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: boolean;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: string;
  isActive: boolean;
  gender?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  roleId?: string;
  isActive?: boolean;
  gender?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
}

export interface CreateRoleDto {
  name: string;
  description: string;
  permissions: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: string[];
}
```

## 8. Module Configuration

### AppModule Configuration
```typescript
// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Core services
import { AuthService } from './core/services/auth.service';
import { UserService } from './core/services/user.service';
import { RoleService } from './core/services/role.service';
import { RbacService } from './core/services/rbac.service';

// Interceptors
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';

// Guards
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';

// Layout components
import { HeaderComponent } from './layouts/header/header.component';
import { SidebarComponent } from './layouts/sidebar/sidebar.component';
import { FooterComponent } from './layouts/footer/footer.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    SidebarComponent,
    FooterComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    AppRoutingModule
  ],
  providers: [
    AuthService,
    UserService,
    RoleService,
    RbacService,
    AuthGuard,
    RoleGuard,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

## 9. Routing Configuration

### AppRoutingModule
```typescript
// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Guards
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';

// Components
import { AppComponent } from './app.component';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'users',
    loadChildren: () => import('./features/users/users.module').then(m => m.UsersModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { permission: 'user:read' }
  },
  {
    path: 'roles',
    loadChildren: () => import('./features/roles/roles.module').then(m => m.RolesModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { permission: 'role:read' }
  },
  {
    path: 'audit',
    loadChildren: () => import('./features/audit/audit.module').then(m => m.AuditModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { permission: 'audit:read' }
  },
  {
    path: 'profile',
    loadChildren: () => import('./features/profile/profile.module').then(m => m.ProfileModule),
    canActivate: [AuthGuard]
  },
  { path: 'unauthorized', component: UnauthorizedComponent },
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
```

## 10. Usage Examples

### Login Component
```typescript
// src/app/features/auth/components/login/login.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-container">
      <div class="login-form">
        <h2>Login</h2>
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              id="email" 
              formControlName="email" 
              type="email"
              [class.error]="isFieldInvalid('email')">
            <div class="error-message" *ngIf="isFieldInvalid('email')">
              {{ getErrorMessage('email') }}
            </div>
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input 
              id="password" 
              formControlName="password" 
              type="password"
              [class.error]="isFieldInvalid('password')">
            <div class="error-message" *ngIf="isFieldInvalid('password')">
              {{ getErrorMessage('password') }}
            </div>
          </div>
          
          <button 
            type="submit" 
            [disabled]="loginForm.invalid || (loading$ | async)"
            class="primary">
            Login
          </button>
        </form>
        
        <div class="loading" *ngIf="loading$ | async">
          Authenticating...
        </div>
        
        <div class="error" *ngIf="error$ | async as error">
          {{ error }}
        </div>
        
        <div class="links">
          <a routerLink="/auth/forgot-password">Forgot Password?</a>
          <a routerLink="/auth/register">Create Account</a>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  loginForm: FormGroup;
  loading$ = this.authService.authState$.pipe(map(state => state.loading));
  error$ = this.authService.authState$.pipe(map(state => state.error));
  
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }
  
  onSubmit(): void {
    if (this.loginForm.valid) {
      const credentials = this.loginForm.value;
      
      this.authService.login(credentials).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Login error:', error);
        }
      });
    }
  }
  
  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }
  
  getErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email';
      }
      if (field.errors['minlength']) {
        return 'Password must be at least 6 characters';
      }
    }
    return '';
  }
  
  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      email: 'Email',
      password: 'Password'
    };
    return labels[fieldName] || fieldName;
  }
}
```

This comprehensive integration guide provides all the necessary code examples and implementation details to connect an Angular 20 frontend with the Express User Management API. The architecture follows Angular best practices with proper separation of concerns, state management, and security considerations.