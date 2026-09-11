---
name: mern-backend-clean-architecture
description: Comprehensive architectural rules, SOLID guidelines, security practices, and backend standards for a Node.js/Express MERN backend using the Repository Pattern.
---

# MERN Backend Architecture, SOLID & Security Standards

Whenever generating, refactoring, or reviewing backend code in this codebase, adhere strictly to the following 3-tier architecture, SOLID principles, security standards, and operational guidelines.

---

## 1. High-Level 3-Tier Architecture

The backend follows a strict decoupled, 3-tier architecture. Information flows downward, and each layer maintains complete isolation.

```text
HTTP REQUEST
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ CONTROLLER LAYER (HTTP Gatekeeper)                      │
│ - Reads HTTP requests, query strings, and body payloads │
│ - Delegates work immediately to the Service Layer       │
│ - Formats HTTP responses (Status Codes, JSON Structure) │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ SERVICE LAYER (Business Logic Hub)                      │
│ - Executes core business rules, algorithms, & logic     │
│ - Performs data transformations and validation rules     │
│ - Orchestrates calls to one or more Repositories        │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ REPOSITORY LAYER (Data Access Manager)                  │
│ - Executes raw Mongoose / MongoDB queries               │
│ - Handles database CRUD operations                      │
│ - Serves as the sole gateway to persistent storage       │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
                    DATABASE (MongoDB)
```

---

## 2. SOLID Principles Enforcement

* **Single Responsibility Principle (SRP):**
  * Controllers only map HTTP inputs and outputs. No database queries or business logic allowed.
  * Services contain core business logic and orchestration. No Express request or response objects allowed.
  * Repositories handle raw Mongoose database interactions and queries.
* **Open/Closed Principle (OCP):**
  * Extend backend behavior by adding new service methods or extending base repositories without modifying existing core logic.
* **Liskov Substitution Principle (LSP):**
  * Concrete repository implementations must satisfy generic interface contracts, allowing in-memory test repositories to replace MongoDB repositories seamlessly during testing.
* **Interface Segregation Principle (ISP):**
  * Keep service and repository interfaces small, modular, and focused. Classes must never be forced to implement database methods they do not need.
* **Dependency Inversion Principle (DIP):**
  * High-level modules (Services) depend on abstraction interfaces, not concrete implementations or raw Mongoose models directly. Dependencies must be injected upon initialization.

---

## 3. Backend Security Practices

Security must be built into all layers of the application.

### Authentication & Authorization
* Use stateless JWT (JSON Web Tokens) or secure session cookies passed via Authorization headers.
* Implement dedicated authentication middleware to verify token validity before requests reach controllers.
* Enforce Role-Based Access Control (RBAC) to ensure users can only perform operations permitted by their assigned roles.

### Input Validation & Sanitization
* Validate all incoming request payloads at the controller boundary using validation schemas before passing data to services.
* Sanitize all inputs to prevent MongoDB Query Injection and Cross-Site Scripting (XSS).

### Data Protection & Cryptography
* Never store plain-text passwords. Passwords must be hashed using strong algorithms (such as bcrypt or Argon2) inside the service layer before reaching the repository.
* Store sensitive system configuration (JWT secrets, database connection strings) strictly in environment variables.

### Error Handling & Data Leakage Prevention
* Implement a centralized Express error-handling middleware.
* Catch exceptions cleanly and return sanitized error messages. Never expose internal stack traces, database schemas, or database field names in production API responses.

### Rate Limiting & Security Headers
* Apply rate-limiting middleware to sensitive endpoints (e.g., login, password resets) to prevent brute-force attacks.
* Enforce security headers across all endpoints using header security middleware (such as Helmet).

---

## 4. Operational Naming & Coding Standards

### File & Folder Naming
| Entity | Naming Convention | Example |
| :--- | :--- | :--- |
| **Feature Folders** | `kebab-case` | `user-management/`, `authentication/` |
| **Controllers** | `camelCase` + `.controller.ts` | `user.controller.ts` |
| **Services** | `camelCase` + `.service.ts` | `user.service.ts` |
| **Repositories** | `camelCase` + `.repository.ts` | `user.repository.ts` |
| **Interfaces / DTOs** | `PascalCase` (prefixed with `I`) | `IUserRepository.ts`, `IUser.ts` |
| **Mongoose Models** | `PascalCase` + `.model.ts` | `User.model.ts` |

### Code Variable & Method Naming
* **Variables & Functions:** `camelCase` (e.g., `findUserById`, `calculateTotal`).
* **Classes & Interfaces:** `PascalCase` (e.g., `UserRepository`, `IBaseRepository`).
* **Constants & Environment Variables:** `UPPER_SNAKE_CASE` (e.g., `PORT`, `MONGO_URI`, `JWT_SECRET`).
* **Booleans:** Prefix with verbs like `is`, `has`, or `should` (e.g., `isActive`, `hasPermission`).

---

## 5. Architectural Checklist for AI Code Generation

When generating or editing backend code:
1. **No direct model imports in controllers:** Never import Mongoose models in route handlers or controller files.
2. **DTO & Interface Enforcement:** Define strict interfaces for request bodies, query params, and database documents.
3. **Layer Isolation:** Keep HTTP objects in Controllers, business logic in Services, and database queries in Repositories.
4. **Async Execution:** Use structured `async/await` control flow with standardized error propagation.