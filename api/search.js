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

  // Mapeo de industry tags a keywords que Apollo entiende
  const INDUSTRY_KEYWORDS = {
    'food_and_beverages':   'alimentos bebidas',
    'food_production':      'alimentos',
    'dairy':                'lacteos',
    'beverages':            'bebidas',
    'industrial_automation':'industrial manufactura',
    'plastics':             'plasticos',
    'construction':         'construccion',
    'chemicals':            'quimica',
    'packaging_and_containers': 'envases packaging',
    'mining_and_metals':    'metalurgica mineria',
    'mechanical_or_industrial_engineering': 'ingenieria industrial',
    'logistics_and_supply_chain': 'logistica',
    'transportation_trucking_railroad': 'transporte',
    'retail':               'retail',
    'warehousing':          'bodega',
    'pharmaceuticals':      'farmaceutica',
    'hospital_and_health_care': 'salud',
    'medical_devices':      'dispositivos medicos',
    'biotechnology':        'biotecnologia',
    'farming':              'agricola',
    'wine_and_spirits':     'vina viña',
    'ranching':             'agricola',
    'primary_secondary_education': 'colegio',
    'higher_education':     'universidad',
    'education_management': 'educacion',
    'e_learning':           'educacion',
  };

  try {
    const payload = {
      person_titles: person_titles || [],
      person_locations: person_locations || [],
      page: page || 1,
      per_page: Math.min(per_page || 25, 100)
    };

    // Usar solo el primer tag como keyword principal — más restrictivo da mejores resultados
    const primaryTag = (organization_industry_tag_values || [])[0];
    const industryKeyword = primaryTag ? (INDUSTRY_KEYWORDS[primaryTag] || '') : '';
    
    // Combinar keyword de industria con subrubro si existe
    // Usar solo uno a la vez para no sobre-restringir
    const finalKeyword = q_keywords || industryKeyword;
    if (finalKeyword) payload.q_keywords = finalKeyword;

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
