// The signing secret for login tokens.
// In production (Vercel, or NODE_ENV=production) a missing JWT_SECRET is an error:
// falling back to a known default would let anyone forge a login for any account.
// Locally a dev-only default keeps setup simple.
const DEV_SECRET = 'dev-only-secret-not-for-production';
const isProduction = () => process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

function getJWTSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (isProduction()) {
    throw Object.assign(new Error('Server misconfigured: JWT_SECRET is missing or too short'), { status: 500 });
  }
  if (!getJWTSecret.warned) {
    console.warn('JWT_SECRET is not set; using a development-only secret. Set it in .env for anything real.');
    getJWTSecret.warned = true;
  }
  return DEV_SECRET;
}

module.exports = { getJWTSecret };
