# Secrets Management & Key Rotation Policy
## Project: School Finance OS

---

## 1. Secrets Inventory & Storage Rules

| Secret Name | Purpose | Authorized Storage | Git Policy |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | Signing and verifying user session tokens | `.env.local` | **STRICTLY EXCLUDED** (Must match `.gitignore`) |
| `ENCRYPTION_KEY` | Optional at-rest local backup cipher | `.env.local` | **STRICTLY EXCLUDED** |
| `ADMIN_DEFAULT_PASS`| Seed initialization password | Environment Variable Only | Never stored in plain text source files |
| `UPI_VPA` | School payment Virtual Payment Address | `school.json` (via Admin UI) | Configurable via settings UI; zero hardcoded fallback |

---

## 2. `.gitignore` Compliance & Verification

The project root `.gitignore` must always include:
```gitignore
# Environment variables and secrets
.env
.env*.local
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### Verification Command
Run periodically to ensure zero tracked environment files:
```bash
git ls-files | grep -i "\.env"
```
*(Must output only `.env.example` if any, never real secrets).*

---

## 3. Secret Rotation Protocols

### 3.1 JWT Secret Key Rotation
1. Generate a high-entropy 256-bit random string:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update `JWT_SECRET` in `.env.local`.
3. Restart Next.js application server.
4. *Effect*: All current sessions will expire, requiring staff to re-authenticate with their credentials.

### 3.2 Staff Password Reset Protocol
1. User requests password change or administrator triggers reset.
2. System hashes new password with secure salt.
3. System automatically increments `tokenVersion += 1` on the user record in `users.json`.
4. *Effect*: All other devices currently logged into this account are instantly revoked.
