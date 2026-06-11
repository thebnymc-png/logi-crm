// Pluggable auth provider, selected at startup by environment.
//
//  • Clerk mode  — active when CLERK_SECRET_KEY is set. Verifies Clerk session
//    tokens, requires an active Organization (multi-tenant), and maps the Clerk
//    user → a local `users` row (so existing owner_id relationships keep working).
//  • Legacy mode — the original custom JWT/bcrypt auth, used when Clerk is not
//    configured. Keeps the app and CI fully working without any Clerk keys.
const jwt = require('jsonwebtoken');

const CLERK_ENABLED = !!process.env.CLERK_SECRET_KEY;

// Clerk org roles arrive as e.g. "org:admin" / "org:member". Map to app roles.
function mapClerkRole(orgRole) {
  const r = (orgRole || '').replace(/^org:/, '');
  if (r === 'admin') return 'admin';
  if (r === 'manager') return 'manager';
  return 'sales_rep';
}

module.exports = function createAuth(getDb) {
  // Shared role guard — relies on req.user.role set by authenticate().
  function requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    };
  }

  if (CLERK_ENABLED) {
    const { verifyToken, createClerkClient } = require('@clerk/backend');
    const secretKey = process.env.CLERK_SECRET_KEY;
    const clerk = createClerkClient({ secretKey });

    async function authenticate(req, res, next) {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Authentication required' });

      let claims;
      try {
        claims = await verifyToken(token, { secretKey });
      } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Multi-tenant: every request must be scoped to a Clerk Organization.
      const orgId = claims.org_id || null;
      if (!orgId) return res.status(403).json({ error: 'Select an organization to continue' });

      const role = mapClerkRole(claims.org_role);
      const db = getDb();

      // Upsert a local user mapped to the Clerk identity (cache profile once).
      let user = db.prepare('SELECT * FROM users WHERE clerk_user_id = ?').get(claims.sub);
      if (!user) {
        let email = claims.email || null;
        let first = 'User';
        let last = '';
        try {
          const cu = await clerk.users.getUser(claims.sub);
          email = cu.primaryEmailAddress?.emailAddress || cu.emailAddresses?.[0]?.emailAddress || email;
          first = cu.firstName || first;
          last = cu.lastName || last;
        } catch (err) { /* fall back to claim/sentinel below */ }
        email = email || `${claims.sub}@clerk.local`;
        const result = db.prepare(
          'INSERT INTO users (email, password, first_name, last_name, role, clerk_user_id, org_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(email, 'clerk-managed', first, last, role, claims.sub, orgId);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      } else if (user.org_id !== orgId || user.role !== role) {
        db.prepare('UPDATE users SET org_id = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(orgId, role, user.id);
      }

      req.user = { id: user.id, email: user.email, role, clerk_user_id: claims.sub, org_id: orgId };
      req.orgId = orgId;
      next();
    }

    return { authenticate, requireRole, CLERK_ENABLED: true, jwtSecret: null };
  }

  // ── Legacy custom-JWT mode ──
  const isProduction = process.env.NODE_ENV === 'production';
  const jwtSecret = process.env.JWT_SECRET || (isProduction ? null : 'insecure-dev-only-secret');

  function authenticate(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
      req.user = jwt.verify(token, jwtSecret);
      req.orgId = null;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  return { authenticate, requireRole, CLERK_ENABLED: false, jwtSecret };
};
