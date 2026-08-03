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

  // Keywords por rubro — múltiples para ampliar búsqueda
  const RUBRO_KEYWORDS = {
    'food_and_beverages':   ['alimentos','bebidas','cecinas','lacteos','frigorifico','congelados','alimento'],
    'food_production':      ['alimentos','produccion alimentos','cecinas'],
    'dairy':                ['lacteos','leche'],
    'beverages':            ['bebidas','jugos'],
    'industrial_automation':['industrial','manufactura','metalurgica','plasticos','quimica','envases','construccion','aceros'],
    'plastics':             ['plasticos','polimeros','envases plasticos'],
    'construction':         ['construccion','edificacion','obras'],
    'chemicals':            ['quimica','pinturas','adhesivos'],
    'packaging_and_containers': ['envases','embalaje','packaging'],
    'mining_and_metals':    ['metalurgica','aceros','metales','mineria'],
    'mechanical_or_industrial_engineering': ['industrial','ingenieria','manufactura'],
    'logistics_and_supply_chain': ['logistica','distribucion','bodega','almacen','cadena suministro'],
    'transportation_trucking_railroad': ['transporte','camiones','carga','flota'],
    'retail':               ['retail','supermercado','tienda','comercial'],
    'warehousing':          ['bodega','almacen','centro logistico'],
    'pharmaceuticals':      ['laboratorio','farmacia','medicamentos','farmaceutica'],
    'hospital_and_health_care': ['clinica','hospital','salud'],
    'medical_devices':      ['laboratorio','equipos medicos'],
    'biotechnology':        ['biotecnologia','laboratorio ciencias'],
    'farming':              ['agricola','agricultura','campo','cosecha','fruta'],
    'wine_and_spirits':     ['vina','vino','viñedo','bodega vino'],
    'ranching':             ['agricola','ganadero'],
    'primary_secondary_education': ['colegio','escuela','liceo'],
    'higher_education':     ['universidad','instituto'],
    'education_management': ['educacion','academico'],
    'e_learning':           ['educacion','capacitacion'],
  };

  const EXCLUDE_EDUCATION = ['universidad', 'university', 'institute', 'academia'];

  try {
    const pageNum = page || 1;
    let finalKeyword = q_keywords || '';

    if (!finalKeyword) {
      const primaryTag = (organization_industry_tag_values || [])[0];
      if (primaryTag && RUBRO_KEYWORDS[primaryTag]) {
        const keywords = RUBRO_KEYWORDS[primaryTag];
        finalKeyword = keywords[(pageNum - 1) % keywords.length];
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
    let people = data.people || [];

    // Excluir empresas educativas fuera del rubro educación
    const isEducation = (organization_industry_tag_values || []).some(t =>
      ['primary_secondary_education','higher_education','education_management','e_learning'].includes(t)
    );

    if (!isEducation) {
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
