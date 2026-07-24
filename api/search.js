import { validateToken } from './_validate.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CE-Token');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!await validateToken(req)) return res.status(401).json({ error: 'Unauthorized' });

  const APOLLO_KEY = process.env.APOLLO_API_KEY;
  if (!APOLLO_KEY) return res.status(500).json({ error: 'API key not configured' });

  const { person_titles, person_locations, organization_industry_tag_values, q_keywords, page, per_page } = req.body;

  try {
    const payload = {
      person_titles: person_titles || [],
      person_locations: person_locations || [],
      page: page || 1,
      per_page: Math.min(per_page || 25, 100)
    };
    if (organization_industry_tag_values?.length) payload.organization_industry_tag_values = organization_industry_tag_values;
    if (q_keywords) payload.q_keywords = q_keywords;

    let apolloRes, attempts = 0;
    while (attempts < 3) {
      apolloRes = await fetch('https://api.apollo.io/v1/mixed_people/api_search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': APOLLO_KEY, 'Cache-Control': 'no-cache' },
        body: JSON.stringify(payload)
      });
      if (apolloRes.status === 429) { attempts++; await new Promise(r => setTimeout(r, 1000 * attempts)); continue; }
      break;
    }

    if (apolloRes.status === 429) return res.status(429).json({ error: 'rate_limit', message: 'Rate limit alcanzado' });
    if (!apolloRes.ok) return res.status(apolloRes.status).json({ error: 'apollo_error' });

    const data = await apolloRes.json();
    return res.status(200).json({
      people: data.people || [],
      total_entries: data.pagination?.total_entries || 0,
      page: data.pagination?.page || 1
    });
  } catch (err) {
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
}
