# System Architecture

## Overview
This document provides a visual representation of the user management system architecture using Mermaid diagrams.

## High-Level Architecture

```mermaid
graph TD
    A[Client Applications] --> B[API Gateway/Load Balancer]
    B --> C[Express.js Application]
    C --> D[MongoDB Database]
    C --> E[Redis Cache]
    C --> F[JWT Service]
    C --> G[Email Service]
    C --> H[Logging Service]
    
    subgraph "Application Layer"
        C
    end
    
    subgraph "Data Layer"
        D
        E
    end
    
    subgraph "External Services"
        F
        G
        H
    end
```

## Component Diagram

```mermaid
graph TD
    A[Client] --> B[Authentication Controller]
    A --> C[User Controller]
    A --> D[Role Controller]
    A --> E[Audit Controller]
    
    B --> F[Auth Service]
    C --> G[User Service]
    D --> H[Role Service]
    E --> I[Audit Service]
    
    F --> J[User Model]
    G --> J
    H --> K[Role Model]
    I --> L[Audit Model]
    
    F --> M[JWT Utility]
    F --> N[Email Utility]
    G --> O[Validation Utility]
    I --> P[Logging Utility]
    
    J --> Q[MongoDB]
    K --> Q
    L --> Q
    
    subgraph "Controllers"
        B
        C
        D
        E
    end
    
    subgraph "Services"
        F
        G
        H
        I
    end
    
    subgraph "Models"
        J
        K
        L
    end
    
    subgraph "Utilities"
        M
        N
        O
        P
    end
    
    subgraph "Database"
        Q
    end
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant A as Auth Controller
    participant S as Auth Service
    participant M as User Model
    participant J as JWT Utility
    participant DB as MongoDB
    
    U->>C: Enter credentials
    C->>A: POST /auth/login
    A->>S: validateCredentials(email, password)
    S->>M: findByEmail(email)
    M-->>S: User document
    S->>S: comparePasswords(input, hashed)
    S-->>A: {valid: true, user}
    A->>J: generateAccessToken(user)
    A->>J: generateRefreshToken(user)
    J-->>A: access_token
    J-->>A: refresh_token
    A->>M: updateLastLogin(user._id)
    M-->>A: success
    A-->>C: {access_token, refresh_token, user}
    C->>U: Store tokens, redirect to dashboard
```

## Data Flow for User Management

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant UC as User Controller
    participant US as User Service
    participant UM as User Model
    participant AL as Audit Logger
    participant DB as MongoDB
    
    U->>C: Request to update profile
    C->>UC: PUT /users/profile
    UC->>UC: validateToken()
    UC->>US: updateProfile(userId, data)
    US->>UM: findById(userId)
    UM-->>US: existingUser
    US->>UM: update(userId, data)
    UM-->>US: updatedUser
    US->>AL: logAction(userId, "UPDATE_PROFILE", "users", userId, existingUser, updatedUser)
    AL->>DB: save audit log
    DB-->>AL: success
    AL-->>US: success
    US-->>UC: updatedUser
    UC-->>C: success response
    C->>U: Show updated profile
```

## Security Layers

```mermaid
graph TD
    A[Incoming Request] --> B[Rate Limiting]
    B --> C[Authentication Check]
    C --> D[Authorization Check]
    D --> E[Input Validation]
    E --> F[Business Logic]
    F --> G[Database Access]
    
    subgraph "Security Layers"
        B
        C
        D
        E
    end
```

## Audit Logging Flow

```mermaid
graph TD
    A[User Action] --> B[Controller]
    B --> C[Service Layer]
    C --> D[Model Operation]
    D --> E[Database]
    C --> F[Audit Logger]
    F --> G[Audit Collection]
    
    subgraph "Audit Trail"
        F
        G
    end