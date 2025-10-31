# Angular State Management Plan

## 1. State Management Approach

For this Angular application, we'll use a combination of:
1. **Service-based state management** with RxJS BehaviorSubject for simple state
2. **NgRx** for complex global state (optional, can be added later)

### Why This Approach?
- Service-based state is sufficient for most applications and easier to implement
- NgRx provides powerful tools for complex state management when needed
- This hybrid approach allows for gradual adoption of NgRx

## 2. Core State Models

### Authentication State
```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}
```

### User Management State
```typescript
interface UserState {
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
```

### Role Management State
```typescript
interface RoleState {
  roles: Role[];
  selectedRole: Role | null;
  permissions: string[];
  loading: boolean;
  error: string | null;
}
```

### Audit State
```typescript
interface AuditState {
  logs: AuditLog[];
  selectedLog: AuditLog | null;
  statistics: AuditStatistics | null;
  actions: string[];
  resources: string[];
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  filters: {
    userId: string | null;
    action: string | null;
    resource: string | null;
    startDate: Date | null;
    endDate: Date | null;
  };
}
```

## 3. Service-Based State Implementation

### AuthService with State
```typescript
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
  
  constructor(private http: HttpClient) {}
  
  // Selectors
  isAuthenticated$ = this.authState$.pipe(
    map(state => state.isAuthenticated)
  );
  
  user$ = this.authState$.pipe(
    map(state => state.user)
  );
  
  // Actions
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.setLoading(true);
    
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.setAuthState(response);
          this.setLoading(false);
        }),
        catchError(error => {
          this.setError(error.message);
          this.setLoading(false);
          throw error;
        })
      );
  }
  
  private setAuthState(response: AuthResponse): void {
    const newState: AuthState = {
      ...this.authState.value,
      isAuthenticated: true,
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      error: null
    };
    
    this.authState.next(newState);
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

### UserService with State
```typescript
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
  
  // Actions
  loadUsers(params?: UserQueryParams): void {
    this.setLoading(true);
    
    this.http.get<PaginatedResponse<User>>(`${environment.apiUrl}/users`, { params })
      .pipe(
        catchError(error => {
          this.setError(error.message);
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

## 4. NgRx Implementation (Optional Future Enhancement)

If the application grows in complexity, we can implement NgRx for more robust state management.

### NgRx Store Structure
```
src/app/store/
├── actions/
│   ├── auth.actions.ts
│   ├── user.actions.ts
│   ├── role.actions.ts
│   └── audit.actions.ts
├── reducers/
│   ├── auth.reducer.ts
│   ├── user.reducer.ts
│   ├── role.reducer.ts
│   └── audit.reducer.ts
├── selectors/
│   ├── auth.selectors.ts
│   ├── user.selectors.ts
│   ├── role.selectors.ts
│   └── audit.selectors.ts
├── effects/
│   ├── auth.effects.ts
│   ├── user.effects.ts
│   ├── role.effects.ts
│   └── audit.effects.ts
└── index.ts
```

### Example NgRx Auth Actions
```typescript
// actions/auth.actions.ts
import { createAction, props } from '@ngrx/store';
import { User, AuthResponse } from '../models';

export const login = createAction(
  '[Auth] Login',
  props<{ email: string; password: string }>()
);

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ response: AuthResponse }>()
);

export const loginFailure = createAction(
  '[Auth] Login Failure',
  props<{ error: string }>()
);

export const logout = createAction('[Auth] Logout');

export const loadProfile = createAction('[Auth] Load Profile');

export const loadProfileSuccess = createAction(
  '[Auth] Load Profile Success',
  props<{ user: User }>()
);

export const loadProfileFailure = createAction(
  '[Auth] Load Profile Failure',
  props<{ error: string }>()
);
```

### Example NgRx Auth Reducer
```typescript
// reducers/auth.reducer.ts
import { createReducer, on } from '@ngrx/store';
import * as AuthActions from '../actions/auth.actions';
import { User } from '../models';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

export const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  error: null
};

export const authReducer = createReducer(
  initialState,
  on(AuthActions.login, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  on(AuthActions.loginSuccess, (state, { response }) => ({
    ...state,
    isAuthenticated: true,
    user: response.user,
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    loading: false
  })),
  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  on(AuthActions.logout, () => initialState),
  on(AuthActions.loadProfileSuccess, (state, { user }) => ({
    ...state,
    user
  })),
  on(AuthActions.loadProfileFailure, (state, { error }) => ({
    ...state,
    error
  }))
);
```

## 5. State Management Best Practices

### 1. Immutability
Always treat state as immutable. Create new objects/arrays instead of modifying existing ones.

### 2. Selectors
Use selectors to derive data from the state:
```typescript
// Good
export const selectActiveUsers = createSelector(
  selectUsers,
  (users) => users.filter(user => user.isActive)
);

// Avoid
this.userState$.pipe(
  map(state => state.users.filter(user => user.isActive))
);
```

### 3. Error Handling
Always handle errors in state management:
```typescript
private setError(error: string | null): void {
  const newState: AuthState = {
    ...this.authState.value,
    error
  };
  
  this.authState.next(newState);
}
```

### 4. Loading States
Implement loading states for better UX:
```typescript
loading$ = this.userState$.pipe(map(state => state.loading));

// In component template
<ng-container *ngIf="loading$ | async as loading">
  <div *ngIf="loading" class="loading">Loading...</div>
  <user-list *ngIf="!loading" [users]="users$ | async"></user-list>
</ng-container>
```

### 5. Pagination and Filtering
Handle pagination and filtering in state:
```typescript
// State includes pagination and filter information
pagination$ = this.userState$.pipe(map(state => state.pagination));
filters$ = this.userState$.pipe(map(state => state.filters));

// Actions to update pagination and filters
updatePagination(page: number): void {
  const currentFilters = this.userState.value.filters;
  this.loadUsers({ ...currentFilters, page });
}

updateFilters(filters: Partial<UserFilters>): void {
  const newFilters = { ...this.userState.value.filters, ...filters };
  this.loadUsers({ ...newFilters, page: 1 }); // Reset to first page
}
```

## 6. Performance Considerations

### 1. Memoization
Use `distinctUntilChanged()` to prevent unnecessary emissions:
```typescript
user$ = this.authState$.pipe(
  map(state => state.user),
  distinctUntilChanged()
);
```

### 2. Unsubscribing
Always unsubscribe from observables to prevent memory leaks:
```typescript
// In component
private destroy$ = new Subject<void>();

ngOnInit(): void {
  this.authState$
    .pipe(takeUntil(this.destroy$))
    .subscribe(state => {
      // Handle state changes
    });
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### 3. OnPush Change Detection
Use `ChangeDetectionStrategy.OnPush` for better performance:
```typescript
@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent {
  // Component logic
}
```

This state management plan provides a solid foundation for the Angular application, with the flexibility to scale to more complex solutions like NgRx when needed.