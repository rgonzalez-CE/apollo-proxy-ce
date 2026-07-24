// Shared token validation — derives expected token from PIN hash stored in env
export async function validateToken(req) {
  const token = req.headers['x-ce-token'];
  if (!token) return false;
  
  const expectedToken = process.env.CE_SECRET_TOKEN;
  if (!expectedToken) return false;
  
  // Constant-time comparison to prevent timing attacks
  if (token.length !== expectedToken.length) return false;
  let equal = 0;
  for (let i = 0; i < token.length; i++) {
    equal |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  return equal === 0;
}
