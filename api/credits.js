// Casino Express — Apollo Credits Check
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const APOLLO_KEY = process.env.APOLLO_API_KEY;
  if (!APOLLO_KEY) return res.status(500).json({ error: 'API key not configured' });

  try {
    const r = await fetch('https://api.apollo.io/api/v1/auth/health', {
      method: 'GET',
      headers: {
        'X-Api-Key': APOLLO_KEY,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    const d = await r.json();

    // Apollo returns credits in different places depending on plan
    const credits = d.user?.credits_information || {};
    const used  = credits.used_credits_count  || credits.credits_used  || 0;
    const total = credits.total_credits_count || credits.credits_limit || 0;
    const remaining = total - used;

    // Log full response for debugging
    console.log('Apollo health response keys:', Object.keys(d));
    console.log('Credits info:', JSON.stringify(credits));

    return res.status(200).json({
      used,
      total,
      remaining,
      raw_credits: credits // include raw for debugging
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
