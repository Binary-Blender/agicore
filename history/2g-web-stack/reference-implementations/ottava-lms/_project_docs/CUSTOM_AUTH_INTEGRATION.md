# Custom Authentication Integration Guide

## Overview

MelodyLMS is designed for enterprise deployment with **custom authentication integration** for each client. Authentication has been intentionally left as a placeholder to allow seamless integration with your organization's existing identity management systems.

## Supported Authentication Methods

Enterprise clients typically integrate one of the following:

### 1. **Active Directory (AD) / LDAP**
- Direct LDAP authentication
- AD Federation Services (ADFS)
- Azure Active Directory (Azure AD)

### 2. **Single Sign-On (SSO)**
- SAML 2.0
- OAuth 2.0 / OpenID Connect
- Okta, Auth0, OneLogin, Ping Identity

### 3. **Multi-Factor Authentication (MFA)**
- SMS-based verification
- Authenticator apps (Google Authenticator, Microsoft Authenticator)
- Hardware tokens (YubiKey)
- Biometric authentication

### 4. **Custom Identity Providers**
- Internal proprietary auth systems
- Legacy authentication systems
- Hybrid authentication models

## Integration Points

### Frontend Integration
**Location**: `frontend/lib/AuthContext.tsx` (placeholder)

Replace the placeholder AuthContext with your authentication provider:

```typescript
// Example: Azure AD Integration
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";

const msalConfig = {
  auth: {
    clientId: "YOUR_CLIENT_ID",
    authority: "https://login.microsoftonline.com/YOUR_TENANT_ID",
    redirectUri: "https://your-domain.com"
  }
};

const msalInstance = new PublicClientApplication(msalConfig);

// Wrap your app with MsalProvider
<MsalProvider instance={msalInstance}>
  <YourApp />
</MsalProvider>
```

### Backend Integration
**Location**: `backend/src/middleware/auth.ts`

Update the authentication middleware to validate tokens from your identity provider:

```typescript
// Example: JWT validation with custom issuer
import jwt from 'jsonwebtoken';

export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  try {
    // Validate against your identity provider
    const decoded = jwt.verify(token, YOUR_PUBLIC_KEY, {
      issuer: 'YOUR_ISSUER',
      audience: 'YOUR_AUDIENCE'
    });

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
```

### Navigation Component
**Location**: `frontend/components/Navigation.tsx`

The navigation bar currently shows "Custom Auth Placeholder" - replace this with:
- User profile information from your identity provider
- Logout handler that redirects to your SSO logout endpoint
- Role-based menu items based on your authorization claims

## Role-Based Access Control (RBAC)

### Roles
The system supports these roles (customize as needed):
- **Employee** - Can view videos and take quizzes
- **Manager** - Employee permissions + view team progress
- **Admin** - Full system access

### Mapping Roles
Map your organization's roles/groups to MelodyLMS roles:

```typescript
// Example: Azure AD group mapping
const roleMapping = {
  'LMS-Admins': 'admin',
  'LMS-Managers': 'manager',
  'AllEmployees': 'employee'
};

function getUserRole(adGroups) {
  for (const [adGroup, role] of Object.entries(roleMapping)) {
    if (adGroups.includes(adGroup)) {
      return role;
    }
  }
  return 'employee'; // default role
}
```

## Database User Synchronization

### Option 1: Just-In-Time (JIT) Provisioning
Create user records automatically on first login:

```typescript
// On successful authentication
const user = await findOrCreateUser({
  email: authResult.email,
  name: authResult.name,
  role: getUserRole(authResult.groups),
  organization_id: YOUR_ORG_ID
});
```

### Option 2: Pre-Provisioning
Sync users from your directory service:
- Scheduled sync job (hourly/daily)
- Webhook-based updates
- Directory change notifications

## Security Considerations

### 1. Token Validation
- Always validate tokens server-side
- Check token expiration
- Verify issuer and audience claims
- Implement token revocation if needed

### 2. Session Management
- Use secure, HttpOnly cookies for session tokens
- Implement session timeout
- Clear sessions on logout
- Consider refresh token rotation

### 3. API Security
- Rate limiting
- CORS configuration
- API key management for service accounts
- Audit logging of authentication events

## Common Integration Patterns

### Pattern 1: Azure AD (Most Common for Enterprise)
```bash
npm install @azure/msal-react @azure/msal-browser
```

### Pattern 2: Okta
```bash
npm install @okta/okta-react @okta/okta-auth-js
```

### Pattern 3: Auth0
```bash
npm install @auth0/auth0-react
```

### Pattern 4: LDAP/Active Directory
```bash
npm install ldapjs  # Backend only
```

## Implementation Checklist

- [ ] Choose authentication method
- [ ] Configure identity provider
- [ ] Update frontend AuthContext
- [ ] Update backend auth middleware
- [ ] Implement role mapping
- [ ] Configure user provisioning strategy
- [ ] Set up session management
- [ ] Test authentication flow
- [ ] Test authorization (role-based access)
- [ ] Configure logout flow
- [ ] Set up audit logging
- [ ] Perform security review
- [ ] Document custom configuration

## Demo Mode

The current deployment runs in **Demo Mode** with authentication disabled. This allows:
- Quick demonstrations
- UI/UX evaluation
- Feature testing
- Sales presentations

**Note**: Demo mode should NEVER be used in production. Always implement proper authentication before deploying to production.

## Support

For custom authentication integration support:
1. Review your identity provider's documentation
2. Consult your IT security team for requirements
3. Contact your MelodyLMS implementation consultant
4. Reference the example integrations in this document

## Example Deployment Configurations

### Azure AD Enterprise Deployment
- Azure AD tenant integration
- Conditional access policies
- MFA enforcement
- Device compliance checks
- Azure AD app registration
- API permissions configuration

### On-Premises AD with ADFS
- ADFS server configuration
- Claims provider trust
- WS-Federation or SAML integration
- Certificate management
- Firewall/network configuration

### Hybrid Cloud (AD + Cloud IdP)
- Azure AD Connect synchronization
- Pass-through authentication
- Seamless SSO configuration
- Hybrid identity considerations

---

**Remember**: Security is critical. Always follow your organization's security policies and compliance requirements when implementing authentication.
