// Casino Express — Apollo People Search Proxy
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const APOLLO_KEY = process.env.APOLLO_API_KEY;
  if (!APOLLO_KEY) return res.status(500).json({ error: 'API key not configured' });

  const { empresa, dominio } = req.body;
  if (!empresa) return res.status(400).json({ error: 'empresa requerida' });

  const DECISION_TITLES = [
    'Gerente General', 'Gerente de Administración y Finanzas', 'Jefe de Administración y Finanzas',
    'Gerente de Recursos Humanos', 'Jefe de Recursos Humanos', 'Gerente de RRHH', 'Jefe de RRHH',
    'Gerente de Compras', 'Jefe de Compras', 'Gerente de Abastecimiento', 'Jefe de Abastecimiento',
    'Gerente de Personas', 'Jefe de Personas', 'Director', 'HR Manager', 'Supply Chain Manager',
    'Procurement Manager', 'Head of HR', 'Chief Operating Officer', 'Gerente de Operaciones',
    'Jefe de Operaciones', 'CFO', 'COO', 'CEO', 'CTO', 'VP', 'Vice President', 'Head of'
  ];

  try {
    const payload = {
      person_titles: DECISION_TITLES,
      q_keywords: empresa,
      page: 1,
      per_page: 25
    };

    if (dominio) {
      payload.q_organization_domains = [dominio];
      delete payload.q_keywords;
    }

    const apolloRes = await fetch('https://api.apollo.io/v1/mixed_people/api_search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': APOLLO_KEY,
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(payload)
    });

    if (!apolloRes.ok) {
      const errText = await apolloRes.text();
      return res.status(apolloRes.status).json({ error: `Apollo error ${apolloRes.status}: ${errText.substring(0, 200)}` });
    }

    const data = await apolloRes.json();
    let people = data.people || [];

    // Filtrar solo contactos cuya empresa coincida con la buscada
    if (!dominio && people.length > 0) {
      // Limpiar nombre — quitar sufijos legales y caracteres especiales
      const limpiarEmpresa = (nombre) => nombre
        .toLowerCase()
        .replace(/['\u2019\.]/g, '') // quitar apóstrofes y puntos
        .replace(/\b(s\.?a\.?|ltda\.?|spa\.?|s\.a\.s\.?|e\.i\.r\.l\.?|s\.r\.l\.?|inc\.?|corp\.?|chile|de|del|los|las|the)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const empresaNorm = limpiarEmpresa(empresa);
      const palabras = empresaNorm.split(/\s+/).filter(p => p.length > 3);

      const filtered = people.filter(p => {
        const orgName = limpiarEmpresa(p.organization?.name || '');
        if (!orgName) return false;
        return palabras.length > 0
          ? palabras.every(palabra => orgName.includes(palabra))
          : orgName.includes(empresaNorm);
      });

      if (filtered.length > 0) people = filtered;
    }

    return res.status(200).json({
      people,
      total_entries: people.length,
      page: data.pagination?.page || 1
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
