// Casino Express — Apollo Prospección Search Proxy
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const APOLLO_KEY = process.env.APOLLO_API_KEY;
  if (!APOLLO_KEY) return res.status(500).json({ error: 'API key not configured' });

  const { person_titles, person_locations, organization_industry_tag_values, q_keywords, page, per_page } = req.body;

  // Palabras a excluir fuera del rubro educación
  const EXCLUDE_EDUCATION = ['universidad', 'university', 'instituto', 'institute', 'academia'];

  try {
    const payload = {
      person_titles: person_titles || [],
      person_locations: person_locations || [],
      page: page || 1,
      per_page: Math.min(per_page || 100, 100)
    };

    // Si hay sub-rubro (q_keywords) usar keyword específica
    // Si no, usar tags de industria — Apollo los filtra correctamente
    if (q_keywords) {
      payload.q_keywords = q_keywords;
    } else if (organization_industry_tag_values?.length) {
      payload.organization_industry_tag_values = organization_industry_tag_values;
    }

    const apolloRes = await fetch('https://api.apollo.io/v1/mixed_people/api_search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': APOLLO_KEY, 'Cache-Control': 'no-cache' },
      body: JSON.stringify(payload)
    });

    const data = await apolloRes.json();
    let people = data.people || [];

    // Excluir empresas educativas fuera del rubro educación
    const isEducation = (organization_industry_tag_values || []).some(t =>
      ['primary_secondary_education','higher_education','education_management','e_learning'].includes(t)
    );

    if (!isEducation && !q_keywords) {
      people = people.filter(p => {
        const name = (p.organization?.name || '').toLowerCase();
        return !EXCLUDE_EDUCATION.some(w => name.includes(w));
      });
    }

    return res.status(200).json({
      people,
      total_entries: data.pagination?.total_entries || 0,
      page: data.pagination?.page || 1
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
