# Web Target — Agicore as a Startup Machine

**Status: Phase 1 complete**

Compile a deployable SaaS product from a single `.agi` file.

## Vision

Agicore already compiles desktop apps from a single `.agi` file. The web target extends this to produce complete, production-ready web applications — Axum backend, React frontend, PostgreSQL database, Docker deployment — from the same DSL, the same declarations, the same mental model.

The compilation target changes. The language doesn't.

```agi
APP my_saas { TITLE "My SaaS" DB app.db THEME dark }

TARGET web {
  RUNTIME   axum
  FRONTEND  react
  DEPLOY    docker
}

AUTH {
  STRATEGY  jwt
  PROVIDERS google, github
  EXPIRY    "8h"
  REFRESH   true
}

TENANT {
  MODEL    row_level
  KEY      tenant_id
  ISOLATE  strict
}

ENTITY Customer {
  tenant_id: string REQUIRED
  name:      string REQUIRED
  email:     string REQUIRED UNIQUE
  TIMESTAMPS
  CRUD create, read, update, delete, list
}
```

That `.agi` file compiles to a multi-tenant SaaS with JWT auth, PostgreSQL, Docker deployment, and a React frontend — with tenant isolation enforced structurally at the query layer.

---

## What Changes vs Desktop

The DSL is target-agnostic. The generators are not.

| Layer | Desktop (Tauri) | Web (Axum) |
|---|---|---|
| Backend | Tauri commands (Rust) | Axum route handlers (Rust) |
| Database | SQLite via rusqlite | PostgreSQL via sqlx |
| Frontend delivery | Tauri WebView | Vite build → static hosting |
| API client | `invoke()` wrappers | `fetch()` wrappers |
| Auth | None (desktop) | JWT middleware from AUTH |
| Multi-tenancy | None | Row-level isolation from TENANT |
| Deployment | .exe / .dmg | Dockerfile + docker-compose |
| Streaming | Tauri IPC events | Server-Sent Events |

Existing generators (`generateRust`, `generateTauriConfig`, `generateTypeScript`) return empty maps when TARGET web is detected. New generators activate.

---

## Three New Declarations

### TARGET

Selects the compilation profile. Activates web generators; deactivates Tauri generators.

```agi
TARGET web {
  RUNTIME   axum       // axum | tauri (default when absent: tauri)
  FRONTEND  react      // react | nextjs
  DEPLOY    docker     // docker | k8s | lambda | fly
}
```

### AUTH

Generates JWT middleware, route protection, token helpers. Wires into AUTHORITY levels.

```agi
AUTH {
  STRATEGY  jwt          // jwt | session | oauth | saml
  PROVIDERS google, github
  EXPIRY    "8h"
  REFRESH   true
}
```

### TENANT

Generates row-level isolation: every query is structurally filtered by tenant_id. The query builder enforces it — no query path exists without the tenant filter.

```agi
TENANT {
  MODEL    row_level   // row_level | schema | database
  KEY      tenant_id   // field name on every entity
  ISOLATE  strict      // strict | advisory
}
```

---

## What the Web Target Generates

```
my_app.agi  (TARGET web { RUNTIME axum })
        │
        ▼  agicore compile
├── Cargo.toml                     axum, sqlx/postgres, tokio, jsonwebtoken, uuid
├── src/
│   ├── main.rs                    Axum server, pool init, route registration, CORS
│   ├── db.rs                      PgPool setup from DATABASE_URL
│   ├── error.rs                   AppError → HTTP response (404, 422, 500)
│   ├── models/
│   │   ├── mod.rs
│   │   └── {entity}.rs            Serde structs: Response, Create, Update
│   ├── routes/
│   │   ├── mod.rs                 Router merging all entity + action routes
│   │   └── {entity}.rs           CRUD handlers with tenant isolation + auth
│   └── middleware/
│       └── auth.rs                JWT extraction → AuthClaims, route guard
├── migrations/
│   └── 001_initial.sql            PostgreSQL dialect: TIMESTAMPTZ, UUID, BOOLEAN
├── frontend/src/api/
│   ├── client.ts                  Base fetch client: auth header, error handling
│   └── {entity}.ts                Per-entity typed API calls (replaces invoke)
├── Dockerfile                     Multi-stage: Rust builder + Node builder → slim
├── docker-compose.yml             App service + PostgreSQL service + volumes
└── .env.example                   DATABASE_URL, JWT_SECRET, PORT, CORS_ORIGIN
```

---

## Tenant Isolation

Every generated route handler that reads entity data includes the tenant filter structurally:

```rust
// Generated — cannot omit tenant_id
let rows = sqlx::query_as!(
    OrgInsight,
    "SELECT * FROM org_insights WHERE tenant_id = $1 ORDER BY created_at DESC",
    auth.tenant_id,  // ← from JWT, not from request body
)
.fetch_all(&state.pool)
.await?;
```

The `tenant_id` comes from the verified JWT claims, not from the request. A malicious client cannot inject a different tenant_id.

---

## Implementation Phases

### Phase 1 — Foundation (complete)
- [x] `TARGET`, `AUTH`, `TENANT` declarations (lexer, types, parser, index)
- [x] `generateAxum()` — main.rs, routes, models, middleware, Cargo.toml
- [x] `generateSql()` PostgreSQL dialect (switched by TARGET)
- [x] `generateDocker()` — Dockerfile, docker-compose.yml, .env.example
- [x] `generateWebClient()` — fetch-based API client replacing invoke wrappers

### Phase 2 — Auth Hardening (next)
- [ ] JWT generation + refresh token rotation
- [ ] OAuth provider integration (Google, GitHub)
- [ ] RBAC from AUTHORITY levels → route middleware
- [ ] Schema-per-tenant mode
- [ ] Rate limiting from SUBSCRIPTION declaration

### Phase 3 — SaaS Primitives (future)
- [ ] `generateOpenApi()` — OpenAPI 3.1 spec from ENTITY + ACTION
- [ ] `generateKubernetes()` — Helm chart + K8s manifests
- [ ] `generateFlyToml()` — fly.io deployment config
- [ ] Stripe integration from SUBSCRIPTION declaration
- [ ] Webhook dispatch from EVENT declaration

---

## From .agi to Production

```bash
# Compile to web target
agicore compile my_app.agi

# Develop locally
docker-compose up

# Build for production
docker build -t my-app .
docker push registry/my-app:latest
```

Zero manual wiring. Generated Rust and TypeScript are production-grade — not scaffolding, not stubs. If `cargo build` passes and `tsc --noEmit` passes, it works.
