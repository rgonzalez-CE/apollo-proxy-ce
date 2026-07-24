import { validateToken } from './_validate.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CE-Token');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!await validateToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  const APOLLO_KEY = process.env.APOLLO_API_KEY;
  if (!APOLLO_KEY) return res.status(500).json({ error: 'API key not configured' });

  try {
    const r = await fetch('https://api.apollo.io/api/v1/auth/health', {
      headers: { 'X-Api-Key': APOLLO_KEY, 'Content-Type': 'application/json' }
    });
    const d = await r.json();
    const credits = d.user?.credits_information || {};
    const used  = credits.used_credits_count  || 0;
    const total = credits.total_credits_count || 0;
    return res.status(200).json({ used, total, remaining: total - used, raw_credits: credits });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
