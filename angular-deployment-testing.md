# Angular Deployment and Testing Guidelines

## 1. Deployment Configuration

### Environment-Specific Configuration

#### Development Environment
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3001/api'
};
```

#### Production Environment
```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://your-production-api.com/api'
};
```

### Build Configuration

#### Angular CLI Build Commands
```bash
# Development build
ng build

# Production build with optimizations
ng build --prod

# Build with specific configuration
ng build --configuration=production
```

#### Custom Webpack Configuration (if needed)
```javascript
// webpack.config.js
module.exports = {
  // Custom webpack configuration for production
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
};
```

### Docker Deployment

#### Dockerfile for Angular App
```dockerfile
# Dockerfile
# Stage 1: Build Angular app
FROM node:18 AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build --prod

# Stage 2: Serve app with Nginx
FROM nginx:alpine

# Copy build artifacts
COPY --from=build /app/dist/user-management-frontend /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx Configuration
```nginx
# nginx.conf
events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  
  sendfile on;
  tcp_nopush on;
  tcp_nodelay on;
  keepalive_timeout 65;
  
  # Gzip compression
  gzip on;
  gzip_vary on;
  gzip_min_length 1024;
  gzip_proxied any;
  gzip_comp_level 6;
  gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/json
    application/javascript
    application/xml+rss
    application/atom+xml
    image/svg+xml;
  
  # Server block
  server {
    listen 80;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Serve static files
    location / {
      try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
      expires 1y;
      add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
  }
}
```

#### Docker Compose for Full Stack Deployment
```yaml
# docker-compose.yml
version: '3.8'

services:
  # MongoDB
  mongodb:
    image: mongo:latest
    container_name: user-management-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  # Express API
  api:
    build: ./api
    container_name: user-management-api
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:password@mongodb:27017/user-management?authSource=admin
      - JWT_ACCESS_SECRET=your-secret-key
      - JWT_REFRESH_SECRET=your-refresh-secret-key
    depends_on:
      - mongodb
    restart: unless-stopped

  # Angular Frontend
  frontend:
    build: ./frontend
    container_name: user-management-frontend
    ports:
      - "80:80"
    depends_on:
      - api
    restart: unless-stopped

volumes:
  mongodb_data:
```

## 2. CORS Configuration

### Express API CORS Setup
```javascript
// server.js
const cors = require('cors');

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com', 'https://www.yourdomain.com'] 
    : ['http://localhost:4200', 'http://localhost:3001'],
  credentials: true
}));
```

### Proxy Configuration for Development
```json
// proxy.conf.json
{
  "/api": {
    "target": "http://localhost:3001",
    "secure": false,
    "changeOrigin": true
  }
}
```

Add to `angular.json`:
```json
"serve": {
  "builder": "@angular-devkit/build-angular:dev-server",
  "options": {
    "proxyConfig": "proxy.conf.json"
  }
}
```

## 3. Testing Strategy

### Unit Testing

#### Testing Services
```typescript
// src/app/core/services/auth.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login successfully', () => {
    const mockResponse = {
      success: true,
      message: 'Login successful',
      data: {
        user: { _id: '1', email: 'test@example.com' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      }
    };

    service.login({ email: 'test@example.com', password: 'password' }).subscribe(
      response => {
        expect(response).toEqual(mockResponse);
        expect(service.isAuthenticated()).toBe(true);
      }
    );

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should handle login error', () => {
    const errorMessage = 'Invalid credentials';

    service.login({ email: 'test@example.com', password: 'wrong' }).subscribe(
      () => fail('should have failed'),
      error => {
        expect(error.status).toBe(401);
      }
    );

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush({ message: errorMessage }, { status: 401, statusText: 'Unauthorized' });
  });
});
```

#### Testing Components
```typescript
// src/app/features/auth/components/login/login.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate required fields', () => {
    const emailControl = component.loginForm.get('email');
    const passwordControl = component.loginForm.get('password');
    
    emailControl?.setValue('');
    passwordControl?.setValue('');
    
    expect(emailControl?.valid).toBeFalsy();
    expect(passwordControl?.valid).toBeFalsy();
    expect(component.loginForm.valid).toBeFalsy();
  });

  it('should validate email format', () => {
    const emailControl = component.loginForm.get('email');
    
    emailControl?.setValue('invalid-email');
    expect(emailControl?.valid).toBeFalsy();
    
    emailControl?.setValue('valid@example.com');
    expect(emailControl?.valid).toBeTruthy();
  });

  it('should call AuthService on valid form submission', () => {
    const credentials = { email: 'test@example.com', password: 'password123' };
    
    component.loginForm.setValue(credentials);
    authService.login.and.returnValue(of({} as any));
    
    component.onSubmit();
    
    expect(authService.login).toHaveBeenCalledWith(credentials);
  });

  it('should navigate on successful login', () => {
    const credentials = { email: 'test@example.com', password: 'password123' };
    
    component.loginForm.setValue(credentials);
    authService.login.and.returnValue(of({} as any));
    
    component.onSubmit();
    
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
```

#### Testing HTTP Interceptors
```typescript
// src/app/core/interceptors/auth.interceptor.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('AuthInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getAccessToken']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true
        }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add authorization header', () => {
    authService.getAccessToken.and.returnValue('test-token');

    httpClient.get('/test').subscribe();

    const req = httpMock.expectOne('/test');
    expect(req.request.headers.has('Authorization')).toBeTruthy();
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('should not add authorization header when no token', () => {
    authService.getAccessToken.and.returnValue(null);

    httpClient.get('/test').subscribe();

    const req = httpMock.expectOne('/test');
    expect(req.request.headers.has('Authorization')).toBeFalsy();
  });
});
```

### Integration Testing

#### Testing API Integration
```typescript
// src/app/integration-tests/user.integration.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from '../core/services/user.service';
import { environment } from '../../environments/environment';

describe('User API Integration', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService]
    });
    
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch users with pagination', () => {
    const mockResponse = {
      success: true,
      data: [
        { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
      ],
      currentPage: 1,
      totalPages: 5,
      totalItems: 50,
      itemsPerPage: 10
    };

    service.loadUsers({ page: 1, limit: 10 });

    service.users$.subscribe(users => {
      expect(users.length).toBe(1);
      expect(users[0].firstName).toBe('John');
    });

    service.pagination$.subscribe(pagination => {
      expect(pagination.currentPage).toBe(1);
      expect(pagination.totalPages).toBe(5);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/users?page=1&limit=10`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
```

### End-to-End Testing with Cypress

#### Cypress Configuration
```javascript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
```

#### Authentication E2E Test
```javascript
// cypress/e2e/auth.cy.ts
describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should display login form', () => {
    cy.get('h2').should('contain', 'Login');
    cy.get('input#email').should('be.visible');
    cy.get('input#password').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('should login with valid credentials', () => {
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Login successful',
        data: {
          user: { _id: '1', email: 'test@example.com' },
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        }
      }
    }).as('login');

    cy.get('input#email').type('test@example.com');
    cy.get('input#password').type('password123');
    cy.get('button[type="submit"]').click();

    cy.wait('@login');
    cy.url().should('include', '/dashboard');
    cy.get('app-header').should('contain', 'test@example.com');
  });

  it('should show error for invalid credentials', () => {
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 401,
      body: {
        success: false,
        message: 'Invalid credentials'
      }
    }).as('login');

    cy.get('input#email').type('invalid@example.com');
    cy.get('input#password').type('wrongpassword');
    cy.get('button[type="submit"]').click();

    cy.wait('@login');
    cy.get('.error').should('contain', 'Invalid credentials');
  });
});
```

#### User Management E2E Test
```javascript
// cypress/e2e/users.cy.ts
describe('User Management', () => {
  beforeEach(() => {
    // Login first
    cy.login('admin@example.com', 'admin123');
    cy.visit('/users');
  });

  it('should display users list', () => {
    cy.get('h2').should('contain', 'Users');
    cy.get('table.users-table').should('be.visible');
    cy.get('table.users-table tbody tr').should('have.length.greaterThan', 0);
  });

  it('should create a new user', () => {
    cy.intercept('POST', '/api/users').as('createUser');
    cy.intercept('GET', '/api/users*').as('getUsers');

    cy.get('button').contains('Add User').click();
    
    cy.get('input#firstName').type('Jane');
    cy.get('input#lastName').type('Smith');
    cy.get('input#email').type('jane.smith@example.com');
    cy.get('input#password').type('password123');
    cy.get('select#roleId').select('User');
    
    cy.get('button[type="submit"]').click();
    
    cy.wait('@createUser');
    cy.wait('@getUsers');
    
    cy.get('table.users-table').should('contain', 'Jane Smith');
  });

  it('should edit a user', () => {
    cy.intercept('PUT', '/api/users/*').as('updateUser');
    
    cy.get('table.users-table tbody tr:first button').contains('Edit').click();
    
    cy.get('input#firstName').clear().type('John Updated');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@updateUser');
    
    cy.get('table.users-table').should('contain', 'John Updated');
  });

  it('should delete a user', () => {
    cy.intercept('DELETE', '/api/users/*').as('deleteUser');
    
    cy.get('table.users-table tbody tr:first button.danger').click();
    
    cy.on('window:confirm', () => true);
    
    cy.wait('@deleteUser');
    
    cy.get('table.users-table').should('not.contain', 'Deleted User');
  });
});
```

#### Custom Cypress Commands
```javascript
// cypress/support/commands.ts
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  
  cy.intercept('POST', '/api/auth/login', {
    statusCode: 200,
    body: {
      success: true,
      message: 'Login successful',
      data: {
        user: { _id: '1', email, role: { name: 'admin' } },
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      }
    }
  }).as('login');
  
  cy.get('input#email').type(email);
  cy.get('input#password').type(password);
  cy.get('button[type="submit"]').click();
  
  cy.wait('@login');
});

Cypress.Commands.add('logout', () => {
  cy.get('button').contains('Logout').click();
  cy.url().should('include', '/login');
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
    }
  }
}
```

## 4. Performance Optimization

### Lazy Loading Modules
```typescript
// app-routing.module.ts
const routes: Routes = [
  {
    path: 'users',
    loadChildren: () => import('./features/users/users.module').then(m => m.UsersModule)
  },
  {
    path: 'roles',
    loadChildren: () => import('./features/roles/roles.module').then(m => m.RolesModule)
  }
];
```

### OnPush Change Detection
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

### TrackBy Functions
```typescript
// In component
trackByUserId(index: number, user: User): string {
  return user._id;
}

// In template
<tr *ngFor="let user of users; trackBy: trackByUserId">
```

## 5. Security Considerations

### Token Storage
```typescript
// Use secure storage for tokens in production
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  
  setTokens(accessToken: string, refreshToken: string): void {
    if (this.isSecureContext()) {
      // Use secure storage (HttpOnly cookies handled by backend)
      sessionStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    } else {
      // Fallback for development
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
  }
  
  getAccessToken(): string | null {
    return sessionStorage.getItem(this.ACCESS_TOKEN_KEY) || 
           localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }
  
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }
  
  clearTokens(): void {
    sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }
  
  private isSecureContext(): boolean {
    return window.isSecureContext;
  }
}
```

### Input Sanitization
```typescript
// Sanitize user inputs
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  // Component configuration
})
export class UserProfileComponent {
  constructor(private sanitizer: DomSanitizer) {}
  
  sanitizeUrl(url: string) {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }
  
  sanitizeHtml(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
```

This comprehensive deployment and testing guide provides all the necessary information to properly deploy and test an Angular application integrated with an Express API, including Docker deployment, CORS configuration, unit testing, integration testing, and end-to-end testing with Cypress.