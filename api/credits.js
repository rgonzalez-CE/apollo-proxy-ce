// Casino Express — Apollo Credits Check
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const APOLLO_KEY = process.env.APOLLO_API_KEY;
  if (!APOLLO_KEY) return res.status(500).json({ error: 'API key not configured' });

  try {
    const r = await fetch('https://api.apollo.io/api/v1/auth/health', {
      headers: { 'X-Api-Key': APOLLO_KEY, 'Content-Type': 'application/json' }
    });
    const d = await r.json();
    const credits = d.user?.credits_information;
    return res.status(200).json({
      used:  credits?.used_credits_count || 0,
      total: credits?.total_credits_count || 0
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
