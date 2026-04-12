# Multi-Tenant SaaS Backend with Job Queue & Notifications

A production-grade multi-tenant SaaS backend built with **Node.js**, **Express**, and **Prisma**. This system features data isolation, background job processing with **BullMQ**, and a **PostgreSQL** database hosted on **Neon**.

## 🚀 Key Features
- **Multi-Tenancy:** Strict data isolation using `tenantId` filtering at the database level.
- **Role-Based Access Control (RBAC):** Distinct permissions for `ADMIN` and `USER` roles.
- **Asynchronous Processing:** Offloads heavy notification tasks to a **Redis-backed BullMQ** queue.
- **Service-Repository Pattern:** Clean architecture for better maintainability and testing.
- **Database:** Managed PostgreSQL (Neon) with connection pooling.

## 🛠️ Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **ORM:** Prisma 6
- **Database:** PostgreSQL (Neon)
- **Cache/Queue:** Redis & BullMQ
- **Security:** JWT & Bcrypt

## 🏗️ Architecture
The system uses a shared-database approach with a "Discriminator Column" (`tenantId`) to ensure that users only interact with data belonging to their organization.



## 🚦 Getting Started

### Prerequisites
- Node.js installed
- Redis server running locally or via Docker
- A Neon PostgreSQL account

### Installation
1. Clone the repo: `git clone <your-repo-link>`
2. Install dependencies: `npm install`
3. Set up your `.env` file (see `.env.example`)
4. Run migrations: `npx prisma migrate dev`
5. Start the server: `npm run start`