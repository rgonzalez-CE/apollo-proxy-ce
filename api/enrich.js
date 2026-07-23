// Casino Express — Apollo Enrichment Proxy
// Vercel serverless function — keeps API key secure server-side

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const APOLLO_KEY = process.env.APOLLO_API_KEY;
  if (!APOLLO_KEY) return res.status(500).json({ error: 'API key not configured' });

  const { first_name, last_name, organization_name, domain, id } = req.body;

  try {
    const payload = { reveal_personal_emails: true, reveal_phone_number: false };
    if (id) { payload.id = id; }
    else {
      payload.first_name = first_name || '';
      payload.last_name = last_name || '';
      payload.organization_name = organization_name || '';
      if (domain) payload.domain = domain;
    }

    const apolloRes = await fetch('https://api.apollo.io/api/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': APOLLO_KEY,
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(payload),
    });

    const data = await apolloRes.json();
    const person = data.person || {};

    return res.status(200).json({
      email: person.email || person.personal_emails?.[0] || '',
      linkedin_url: person.linkedin_url || '',
      name: person.name || '',
      title: person.title || '',
      missing: !person.email && !person.linkedin_url ? 1 : 0,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
