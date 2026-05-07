# Customization Notes (Storage & Auth)

Use this as the jump start doc when tailoring MelodyLMS for a specific client deployment.

## 1. Storage Strategy

- **Current demo default:** Policy PDFs and future rich assets live in Postgres (`training_modules.policy_document_blob`, filename/mime/size). Upload endpoint `/api/training-modules/:id/policy` writes into BYTEA; download endpoint streams back.
- **Swapping storage providers:**
  - Abstract the upload logic inside `backend/src/controllers/trainingModuleController.ts` (placeholder helper already isolates the blob write). Replace the `policy_document_blob` block with a provider-specific uploader (S3, Azure Blob, SharePoint, etc.) and update `policy_document_url` to the public/shared link.
  - Keep the fallback download endpoint for authenticated access; if the provider wants signed URLs, hook their SDK there.
  - Add provider-specific env vars to `backend/fly.toml` or a customer `.env`, and update secrets with `flyctl secrets set` (example: `AZURE_STORAGE_ACCOUNT`, `S3_BUCKET`, etc.).
- **Migration reminders:** If you rip out the Postgres blob, also create a migration to drop unused columns and/or move existing demo data to the client’s store. Keep note of maximum upload size via `POLICY_DOCUMENT_MAX_BYTES`.

## 2. Authentication Layer

- **Current demo default:** Static “Custom Auth Placeholder” banner, JWT login hitting `/api/auth/login` with in-database users seeded via docs (see `CREDENTIALS.md`). No SSO, no tenant-specific IdP.
- **Client-specific auth:**
  - Plug into their identity provider (Okta, Azure AD, Google, internal SAML) by swapping the middleware in `backend/src/middleware/auth.ts`. For OAuth/OIDC, add an `/auth/callback` route and exchange tokens for a MelodyLMS session/JWT.
  - If the client requires SCIM/user provisioning, implement endpoints under `/api/users` with RBAC tied to the org’s directory groups.
  - Update the frontend auth hooks (`frontend/lib/api.ts` + login/register pages) to redirect to the IdP instead of capturing passwords locally. Remember to pass tokens through to the API via the existing `Authorization` header.
  - Document required secrets (client_id, client_secret, tenant IDs) and ensure they’re stored only in Fly secrets or the target platform’s vault.

## General Onboarding Steps

1. Clone the repo, run `npm install` in both `backend` and `frontend` if local testing is allowed (otherwise rely on Fly deploy pipeline).
2. Review `backend/migrations` to understand current schema; apply custom migrations per client.
3. Update `fly.toml` (or the target PaaS config) with client-specific env vars for storage/auth.
4. Re-run `flyctl deploy` (or the client’s CI/CD) for API + web after each customization.
5. Update `_project_docs` with any client-specific overrides so future agents see the history.

Keep this doc short and focused—expand sections as new custom surfaces (analytics, AI providers, etc.) come online.
