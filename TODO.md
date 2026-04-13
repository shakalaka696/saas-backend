# API TODO List

All APIs you need to implement. Each entry includes the HTTP method, path, auth level, request body, and what it should do.

> **Auth levels:**
> - `Public` — no token required
> - `JWT` — any valid admin JWT
> - `ADMIN` — JWT with role `ADMIN` or `SUPER_ADMIN`
> - `SUPER_ADMIN` — JWT with role `SUPER_ADMIN` only

---

## Tenant Management

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| T1 | `POST` | `/api/tenants` | Public | Create a tenant + its first admin user (SUPER_ADMIN role) in a single DB transaction. Body: `{ tenantName, adminEmail, adminPassword }` |
| T2 | `GET` | `/api/tenants` | SUPER_ADMIN | List all tenants in the system |
| T3 | `GET` | `/api/tenants/:id` | SUPER_ADMIN | Get a single tenant by ID |
| T4 | `PATCH` | `/api/tenants/:id` | SUPER_ADMIN | Update tenant name. Body: `{ name }` |
| T5 | `DELETE` | `/api/tenants/:id` | SUPER_ADMIN | Delete tenant and cascade-delete all its data |

---

## Admin Authentication

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| A1 | `POST` | `/api/admin/auth/login` | Public | Login with email + password. Returns JWT containing `{ id, tenantId, role }`. Body: `{ email, password }` |
| A2 | `GET` | `/api/admin/auth/me` | JWT | Return the currently logged-in admin user's profile (decoded from JWT, fetched from DB) |

---

## Admin User Management

All routes are scoped to the requesting admin's `tenantId` from the JWT.

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| AU1 | `POST` | `/api/admin/users` | ADMIN | Create a new admin user in the same tenant. Body: `{ email, password, role }` where role is `ADMIN` |
| AU2 | `GET` | `/api/admin/users` | ADMIN | List all admin users in the requesting admin's tenant |
| AU3 | `GET` | `/api/admin/users/:id` | ADMIN | Get a single admin user (must belong to same tenant) |
| AU4 | `PATCH` | `/api/admin/users/:id` | ADMIN | Update email or role of an admin user in the same tenant. Body: `{ email?, role? }` |
| AU5 | `DELETE` | `/api/admin/users/:id` | ADMIN | Delete an admin user from the tenant. Should prevent deleting yourself. |

---

## Customer Self-Registration & OTP

These are public-facing APIs called from the customer HTML pages. No JWT needed.

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| CR1 | `POST` | `/api/customers/register` | Public | Customer submits registration. Creates a `Customer` record with `isVerified: false`, generates a 6-digit OTP (10-min expiry), stores it in the `otps` table, queues an OTP email via BullMQ. Body: `{ email, firstName, lastName, tenantId }` |
| CR2 | `POST` | `/api/customers/verify-otp` | Public | Customer submits the OTP code. Validate: code matches, not expired, not already used. On success: mark `Customer.isVerified = true`, mark `OTP.used = true` (use a DB transaction). Body: `{ email, tenantId, code }` |
| CR3 | `POST` | `/api/customers/resend-otp` | Public | Invalidate all unused OTPs for this `email + tenantId` (set `used = true`), generate a new OTP, queue a new OTP email. Body: `{ email, tenantId }` |

---

## Admin — Customer Management

All routes are scoped to the requesting admin's `tenantId`.

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| AC1 | `GET` | `/api/admin/customers` | ADMIN | List all customers in the tenant. Supports optional query param: `?verified=true` or `?verified=false` for filtering |
| AC2 | `GET` | `/api/admin/customers/:id` | ADMIN | Get a single customer by ID (must belong to same tenant) |
| AC3 | `DELETE` | `/api/admin/customers/:id` | ADMIN | Delete a customer from the tenant |

---

## Segment Management

All routes are scoped to the requesting admin's `tenantId`.

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| S1 | `POST` | `/api/admin/segments` | ADMIN | Create a new segment. Body: `{ name }` |
| S2 | `GET` | `/api/admin/segments` | ADMIN | List all segments for the tenant |
| S3 | `GET` | `/api/admin/segments/:id` | ADMIN | Get a single segment including its customer list |
| S4 | `PATCH` | `/api/admin/segments/:id` | ADMIN | Update segment name. Body: `{ name }` |
| S5 | `DELETE` | `/api/admin/segments/:id` | ADMIN | Delete a segment (does NOT delete the customers, only the segment and its memberships) |
| S6 | `POST` | `/api/admin/segments/:id/customers` | ADMIN | Add one or more customers to a segment. Body: `{ customerIds: string[] }` |
| S7 | `DELETE` | `/api/admin/segments/:id/customers` | ADMIN | Remove one or more customers from a segment. Body: `{ customerIds: string[] }` |

---

## Campaign Management

All routes are scoped to the requesting admin's `tenantId`.

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| C1 | `POST` | `/api/admin/campaigns` | ADMIN | Create a new campaign in `DRAFT` status. Body: `{ name, subject, body }` |
| C2 | `GET` | `/api/admin/campaigns` | ADMIN | List all campaigns for the tenant (include status in response) |
| C3 | `GET` | `/api/admin/campaigns/:id` | ADMIN | Get campaign details including attached segments and job stats |
| C4 | `PATCH` | `/api/admin/campaigns/:id` | ADMIN | Update campaign content. Only allowed when status is `DRAFT`. Body: `{ name?, subject?, body? }` |
| C5 | `DELETE` | `/api/admin/campaigns/:id` | ADMIN | Delete a campaign. Only allowed when status is `DRAFT`. |
| C6 | `POST` | `/api/admin/campaigns/:id/segments` | ADMIN | Attach one or more segments to a campaign. Body: `{ segmentIds: string[] }` |
| C7 | `DELETE` | `/api/admin/campaigns/:id/segments` | ADMIN | Detach one or more segments from a campaign. Body: `{ segmentIds: string[] }` |
| C8 | `POST` | `/api/admin/campaigns/:id/execute` | ADMIN | Execute the campaign: fetch all verified customers across all attached segments (deduplicate by customerId), create a `CampaignJob` DB record per customer (status: `PENDING`), enqueue a BullMQ job per customer, set campaign status → `RUNNING`. Guards: campaign must be `DRAFT`, must have segments attached, segments must contain at least one verified customer. |
| C9 | `GET` | `/api/admin/campaigns/:id/status` | ADMIN | Return execution stats: `{ total, sent, failed, pending }` by counting `CampaignJob` records grouped by status |

---

## Implementation Notes

### Tenant isolation
Every service method must filter by `tenantId` taken from `req.user.tenantId` (decoded from JWT). Never trust a `tenantId` from the request body for authenticated routes.

### OTP generation
```
const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
```

# System Diagrams

## Entity Relationship Diagram

```mermaid
erDiagram
    TENANT {
        uuid id PK
        varchar name
        timestamp createdAt
    }

    ADMIN_USER {
        uuid id PK
        varchar email
        varchar password
        enum role "SUPER_ADMIN | ADMIN"
        uuid tenantId FK
        timestamp createdAt
    }

    CUSTOMER {
        uuid id PK
        varchar email
        varchar firstName
        varchar lastName
        boolean isVerified
        uuid tenantId FK
        timestamp createdAt
    }

    OTP {
        uuid id PK
        varchar email
        uuid tenantId
        char code "6 digits"
        timestamp expiresAt
        boolean used
        timestamp createdAt
    }

    SEGMENT {
        uuid id PK
        varchar name
        uuid tenantId FK
        timestamp createdAt
    }

    EMAIL_CAMPAIGN {
        uuid id PK
        varchar name
        varchar subject
        text body
        enum status "DRAFT | RUNNING | COMPLETED | FAILED"
        uuid tenantId FK
        uuid createdById FK
        timestamp createdAt
    }

    CAMPAIGN_JOB {
        uuid id PK
        uuid campaignId FK
        uuid customerId FK
        uuid tenantId
        enum status "PENDING | SENT | FAILED"
        timestamp sentAt
        text error
        timestamp createdAt
    }

    SEGMENT_CUSTOMERS {
        uuid segmentId FK
        uuid customerId FK
    }

    CAMPAIGN_SEGMENTS {
        uuid campaignId FK
        uuid segmentId FK
    }

    TENANT ||--o{ ADMIN_USER : "has"
    TENANT ||--o{ CUSTOMER : "has"
    TENANT ||--o{ SEGMENT : "has"
    TENANT ||--o{ EMAIL_CAMPAIGN : "has"

    ADMIN_USER ||--o{ EMAIL_CAMPAIGN : "creates"

    SEGMENT ||--o{ SEGMENT_CUSTOMERS : "contains"
    CUSTOMER ||--o{ SEGMENT_CUSTOMERS : "belongs to"

    EMAIL_CAMPAIGN ||--o{ CAMPAIGN_SEGMENTS : "targets"
    SEGMENT ||--o{ CAMPAIGN_SEGMENTS : "used in"

    EMAIL_CAMPAIGN ||--o{ CAMPAIGN_JOB : "generates"
    CUSTOMER ||--o{ CAMPAIGN_JOB : "receives"
```

---

## Customer Registration + OTP Verification Flow

```mermaid
sequenceDiagram
    participant C as Customer Browser
    participant API as Express API
    participant DB as PostgreSQL
    participant Q as BullMQ (otpQueue)
    participant W as OTP Worker
    participant M as Mailtrap

    C->>API: POST /api/customers/register<br/>{email, firstName, lastName, tenantId}
    API->>DB: Check if email+tenantId already exists
    DB-->>API: Not found
    API->>DB: INSERT Customer (isVerified=false)
    API->>DB: Invalidate old unused OTPs for email+tenantId
    API->>DB: INSERT OTP (code, expiresAt=+10min, used=false)
    API->>Q: Add job {email, firstName, code, tenantId}
    API-->>C: 201 { message: "OTP sent to your email" }

    W->>Q: Pick up OTP job
    W->>M: sendMail(OTP email with 6-digit code)
    M-->>W: Message sent
    W-->>Q: Job completed

    Note over C,M: Customer checks Mailtrap inbox for OTP

    C->>API: POST /api/customers/verify-otp<br/>{email, tenantId, code}
    API->>DB: Find OTP (email+tenantId+code, used=false)
    DB-->>API: OTP record found
    API->>API: Check expiresAt > now()
    API->>DB: UPDATE OTP set used=true
    API->>DB: UPDATE Customer set isVerified=true
    API-->>C: 200 { message: "Email verified successfully" }
```

---

## Campaign Execution Flow

```mermaid
sequenceDiagram
    participant A as Admin Browser
    participant API as Express API
    participant DB as PostgreSQL
    participant Q as BullMQ (campaignQueue)
    participant W as Campaign Worker
    participant M as Mailtrap

    A->>API: POST /api/admin/campaigns/:id/execute
    API->>DB: Load Campaign with segments.customers (isVerified=true)
    DB-->>API: Campaign + nested customers

    API->>API: Deduplicate customers across segments (Map by customerId)
    API->>API: Guard: status must be DRAFT, segments exist, customers exist

    API->>DB: UPDATE Campaign status = RUNNING

    loop For each unique verified customer
        API->>DB: INSERT CampaignJob (status=PENDING)
        API->>Q: Add job {campaignJobId, customerEmail, subject, body, ...}
    end

    API-->>A: 202 { message: "Campaign running", recipientCount: N }

    loop For each queued job (concurrency: 5)
        W->>Q: Pick up campaign email job
        W->>M: sendMail(to: customerEmail, subject, html body)
        M-->>W: Message sent (preview URL in console)
        W->>DB: UPDATE CampaignJob status=SENT, sentAt=now()
        W->>DB: COUNT remaining PENDING jobs for campaign
        alt All jobs done
            W->>DB: UPDATE Campaign status=COMPLETED
        end
    end

    A->>API: GET /api/admin/campaigns/:id/status
    API->>DB: COUNT jobs by status
    API-->>A: { total: N, sent: N, failed: 0, pending: 0 }
```

---

## Admin User Creation Flow

```mermaid
flowchart TD
    A[POST /api/tenants\ntenantName + adminEmail + adminPassword] --> B[Create Tenant record]
    B --> C[Create AdminUser\nrole: SUPER_ADMIN\ntenantId: new tenant]
    C --> D[Atomic DB transaction commits]
    D --> E[Return tenant + admin user]

    F[POST /api/admin/users\nJWT required - ADMIN role] --> G{Requesting admin\nhas ADMIN role?}
    G -- No --> H[403 Forbidden]
    G -- Yes --> I[Create AdminUser\nrole: ADMIN\ntenantId: from JWT]
    I --> J[New admin user returned]
```

---

## Multi-Tenancy Isolation Model

```mermaid
flowchart LR
    subgraph Tenant A
        TA_ADMIN[Admin Users A]
        TA_CUST[Customers A]
        TA_SEG[Segments A]
        TA_CAMP[Campaigns A]
    end

    subgraph Tenant B
        TB_ADMIN[Admin Users B]
        TB_CUST[Customers B]
        TB_SEG[Segments B]
        TB_CAMP[Campaigns B]
    end

    JWT_A[JWT Token\ntenantId: A] --> TA_ADMIN
    JWT_B[JWT Token\ntenantId: B] --> TB_ADMIN

    note[All queries WHERE tenantId = req.user.tenantId\nCross-tenant access is impossible]
```
