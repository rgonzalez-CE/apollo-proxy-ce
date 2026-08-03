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

  // Keywords por tag — rota según página para maximizar resultados únicos
  const TAG_KEYWORDS = {
    // Alimentos
    'food_and_beverages':   ['alimentos','bebidas','cecinas','lacteos','frigorifico','congelados','alimento'],
    'food_production':      ['alimentos','cecinas','lacteos'],
    'dairy':                ['lacteos','leche'],
    'beverages':            ['bebidas','jugos'],
    // Industrial
    'industrial_automation':['industrial','manufactura','metalurgica','plasticos','quimica','envases','construccion','aceros'],
    'plastics':             ['plasticos','polimeros'],
    'construction':         ['construccion','edificacion'],
    'chemicals':            ['quimica','pinturas'],
    'packaging_and_containers': ['envases','embalaje'],
    'mining_and_metals':    ['metalurgica','aceros','metales'],
    'mechanical_or_industrial_engineering': ['ingenieria','manufactura'],
    // Logística
    'logistics_and_supply_chain': ['logistica','distribucion','bodega'],
    'transportation_trucking_railroad': ['transporte','camiones'],
    'retail':               ['retail','supermercado'],
    'warehousing':          ['bodega','almacen'],
    // Farmacéutica
    'pharmaceuticals':      ['laboratorio','farmacia','medicamentos'],
    'hospital_and_health_care': ['clinica','hospital','salud'],
    'medical_devices':      ['laboratorio','equipos medicos'],
    'biotechnology':        ['biotecnologia'],
    // Agrícola
    'farming':              ['agricola','agricultura','fruta','cosecha'],
    'wine_and_spirits':     ['vina','vino'],
    'ranching':             ['agricola','ganadero'],
    // Educación
    'primary_secondary_education': ['colegio','escuela','liceo'],
    'higher_education':     ['universidad','instituto'],
    'education_management': ['educacion'],
    'e_learning':           ['educacion','capacitacion'],
  };

  const EXCLUDE_EDUCATION = ['universidad', 'university', 'instituto', 'institute', 'academia'];

  try {
    const pageNum = page || 1;

    // Determinar keyword final
    let finalKeyword = q_keywords || '';

    if (!finalKeyword) {
      // Recopilar todas las keywords de los tags del rubro
      const allKeywords = (organization_industry_tag_values || [])
        .flatMap(tag => TAG_KEYWORDS[tag] || []);
      
      // Deduplicar
      const uniqueKeywords = [...new Set(allKeywords)];
      
      if (uniqueKeywords.length > 0) {
        // Rotar según página
        finalKeyword = uniqueKeywords[(pageNum - 1) % uniqueKeywords.length];
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
