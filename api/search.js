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

  // Mapeo de industry tags a keywords que Apollo entiende mejor
  const INDUSTRY_KEYWORDS = {
    'food_and_beverages':   'alimentos bebidas food beverage',
    'food_production':      'alimentos produccion food',
    'dairy':                'lacteos dairy',
    'beverages':            'bebidas beverages',
    'industrial_automation':'industrial manufactura manufacturing',
    'plastics':             'plasticos plastics',
    'construction':         'construccion construction',
    'chemicals':            'quimica chemicals',
    'packaging_and_containers': 'envases packaging',
    'mining_and_metals':    'metalurgica mineria metals mining',
    'mechanical_or_industrial_engineering': 'ingenieria industrial engineering',
    'logistics_and_supply_chain': 'logistica supply chain',
    'transportation_trucking_railroad': 'transporte transportation',
    'retail':               'retail',
    'warehousing':          'bodega warehouse',
    'pharmaceuticals':      'farmaceutica pharmaceuticals',
    'hospital_and_health_care': 'salud health',
    'medical_devices':      'dispositivos medicos medical',
    'biotechnology':        'biotecnologia biotech',
    'farming':              'agricola farming',
    'wine_and_spirits':     'vina winery wine',
    'ranching':             'agricola agro',
    'primary_secondary_education': 'colegio educacion school',
    'higher_education':     'universidad university',
    'education_management': 'educacion education',
    'e_learning':           'educacion learning',
  };

  try {
    const payload = {
      person_titles: person_titles || [],
      person_locations: person_locations || [],
      page: page || 1,
      per_page: Math.min(per_page || 25, 100)
    };

    // Construir q_keywords combinando industria + subrubro
    const industryKeywords = (organization_industry_tag_values || [])
      .map(tag => INDUSTRY_KEYWORDS[tag] || tag)
      .join(' ');
    
    const allKeywords = [industryKeywords, q_keywords].filter(Boolean).join(' ').trim();
    if (allKeywords) payload.q_keywords = allKeywords;

    // También enviar organization_industry_tag_values por si Apollo los soporta
    if (organization_industry_tag_values?.length) {
      payload.organization_industry_tag_values = organization_industry_tag_values;
    }

    const apolloRes = await fetch('https://api.apollo.io/v1/mixed_people/api_search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': APOLLO_KEY, 'Cache-Control': 'no-cache' },
      body: JSON.stringify(payload)
    });

    const data = await apolloRes.json();
    return res.status(200).json({
      people: data.people || [],
      total_entries: data.pagination?.total_entries || 0,
      page: data.pagination?.page || 1
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
