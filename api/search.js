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

  // Keywords ordenadas por volumen — las más potentes primero
  const TAG_KEYWORDS = {
    'food_and_beverages':   ['alimentos','alimentos','alimentos','bebidas','cecinas','lacteos'],
    'food_production':      ['alimentos','alimentos','cecinas','lacteos'],
    'dairy':                ['lacteos','leche'],
    'beverages':            ['bebidas','jugos'],
    'industrial_automation':['industrial','industrial','industrial','construccion','aceros','quimica','envases','manufactura','plasticos'],
    'plastics':             ['plasticos','envases'],
    'construction':         ['construccion','construccion','edificacion'],
    'chemicals':            ['quimica','quimica','pinturas'],
    'packaging_and_containers': ['envases','envases','embalaje'],
    'mining_and_metals':    ['aceros','aceros','metalurgica','metales'],
    'mechanical_or_industrial_engineering': ['industrial','ingenieria','manufactura'],
    'logistics_and_supply_chain': ['logistica','logistica','distribucion','bodega'],
    'transportation_trucking_railroad': ['transporte','transporte','camiones'],
    'retail':               ['retail','retail','supermercado'],
    'warehousing':          ['bodega','bodega','almacen'],
    'pharmaceuticals':      ['laboratorio','laboratorio','farmacia','medicamentos'],
    'hospital_and_health_care': ['clinica','clinica','hospital','salud'],
    'medical_devices':      ['laboratorio','laboratorio','equipos medicos'],
    'biotechnology':        ['biotecnologia'],
    'farming':              ['agricola','agricola','agricola','agricultura','fruta','cosecha'],
    'wine_and_spirits':     ['vina','vina','vino'],
    'ranching':             ['agricola','ganadero'],
    'primary_secondary_education': ['colegio','colegio','colegio','escuela','liceo'],
    'higher_education':     ['universidad','universidad','instituto'],
    'education_management': ['educacion','educacion'],
    'e_learning':           ['educacion','capacitacion'],
  };

  try {
    const pageNum = page || 1;
    let finalKeyword = q_keywords || '';

    if (!finalKeyword) {
      const allKeywords = (organization_industry_tag_values || [])
        .flatMap(tag => TAG_KEYWORDS[tag] || []);
      if (allKeywords.length > 0) {
        finalKeyword = allKeywords[(pageNum - 1) % allKeywords.length];
      }
    }

    const payload = {
      person_titles: person_titles || [],
      person_locations: person_locations || [],
      page: pageNum,
      per_page: Math.min(per_page || 100, 100)
    };

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
