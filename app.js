const views = [
  { id: 'overview', label: 'Overview' },
  { id: 'sources', label: 'Sources collectées' },
  { id: 'relevance', label: 'Pertinence' },
  { id: 'assets', label: 'Documents / Images / Carto' },
  { id: 'evidence', label: 'Evidence & claims' },
  { id: 'queue', label: 'Pipeline tasks' },
];

const menu = document.getElementById('menu');
const view = document.getElementById('view');
const viewTitle = document.getElementById('view-title');
const meta = document.getElementById('meta');

const badge = (value = '') => `<span class="badge ${String(value)}">${value}</span>`;
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

function renderOverview(data) {
  const totals = data.meta?.totals || {};
  const b = data.meta?.breakdowns || {};
  return `
    <div class="grid">
      <div class="card"><div class="small">Goals</div><div class="kpi">${totals.goals || 0}</div></div>
      <div class="card"><div class="small">Queue items</div><div class="kpi">${totals.queue_items || 0}</div></div>
      <div class="card"><div class="small">Sources</div><div class="kpi">${totals.sources || 0}</div></div>
      <div class="card"><div class="small">Evidence</div><div class="kpi">${totals.evidence || 0}</div></div>
      <div class="card"><div class="small">Assets</div><div class="kpi">${totals.assets || 0}</div></div>
    </div>
    <div class="card" style="margin-top:12px;">
      <h3>Breakdowns</h3>
      <p class="small">Queue: ${Object.entries(b.queue_status || {}).map(([k,v])=>`${k}:${v}`).join(' · ') || 'n/a'}</p>
      <p class="small">Pertinence: ${Object.entries(b.relevance || {}).map(([k,v])=>`${k}:${v}`).join(' · ') || 'n/a'}</p>
      <p class="small">Confiance: ${Object.entries(b.confidence || {}).map(([k,v])=>`${k}:${v}`).join(' · ') || 'n/a'}</p>
    </div>
  `;
}

function renderSources(data) {
  return tableWithSearch(data.sources || [], ['source_key', 'title', 'source_type', 'access_status', 'fetch_status'], (r) => `
    <tr>
      <td>${esc(r.source_key)}</td>
      <td>${esc(r.title)}</td>
      <td>${badge(r.source_type)}</td>
      <td>${badge(r.access_status || 'unknown')}</td>
      <td>${badge(r.fetch_status || 'unknown')}</td>
    </tr>`);
}

function renderRelevance(data) {
  return tableWithSearch(data.sources || [], ['title', 'relevance_level', 'relevance_reason'], (r) => `
    <tr>
      <td>${esc(r.title)}</td>
      <td>${badge(r.relevance_level)}</td>
      <td>${r.relevance_score == null ? '—' : Number(r.relevance_score).toFixed(2)}</td>
      <td>${esc(r.source_url || r.landing_url || '')}</td>
    </tr>`);
}

function renderAssets(data) {
  return tableWithSearch(data.assets || [], ['source_title', 'path', 'kind'], (r) => `
    <tr>
      <td>${esc(r.source_title)}</td>
      <td>${badge(r.kind)}</td>
      <td><code>${esc(r.path)}</code></td>
      <td>${esc(r.fetched_at || '')}</td>
    </tr>`);
}

function renderEvidence(data) {
  return tableWithSearch(data.evidence || [], ['claim', 'source_title', 'confidence', 'citation'], (r) => `
    <tr>
      <td>${esc(r.claim)}</td>
      <td>${esc(r.source_title || '')}</td>
      <td>${badge(r.confidence)}</td>
      <td>${esc(r.locator || '')}</td>
    </tr>`);
}

function renderQueue(data) {
  return tableWithSearch(data.queue_items || [], ['question', 'assigned_role', 'task_type', 'status'], (r) => `
    <tr>
      <td>${esc(r.question)}</td>
      <td>${badge(r.assigned_role)}</td>
      <td>${badge(r.task_type)}</td>
      <td>${badge(r.status)}</td>
      <td>P${esc(r.priority)}</td>
    </tr>`);
}

function tableWithSearch(rows, fields, rowRenderer) {
  const id = `s-${Math.random().toString(36).slice(2, 7)}`;
  const htmlRows = rows.map((r) => `<tbody data-scope="${id}">${rowRenderer(r)}</tbody>`).join('');
  setTimeout(() => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('input', () => {
      const v = input.value.toLowerCase().trim();
      document.querySelectorAll(`tbody[data-scope='${id}']`).forEach((tb, i) => {
        const r = rows[i];
        const hit = !v || fields.some((f) => String(r?.[f] ?? '').toLowerCase().includes(v));
        tb.style.display = hit ? '' : 'none';
      });
    });
  }, 0);
  return `<input class='input' id='${id}' placeholder='Filtrer…' /><table class='table'>${htmlRows || '<tr><td>Aucune donnée</td></tr>'}</table>`;
}

const renderers = { overview: renderOverview, sources: renderSources, relevance: renderRelevance, assets: renderAssets, evidence: renderEvidence, queue: renderQueue };

function setView(id, data) {
  viewTitle.textContent = views.find((v) => v.id === id)?.label || id;
  view.innerHTML = (renderers[id] || (() => '<p>View inconnue</p>'))(data);
  [...menu.querySelectorAll('button')].forEach((b) => b.classList.toggle('active', b.dataset.id === id));
}

function boot(data) {
  menu.innerHTML = views.map((v) => `<button data-id='${v.id}'>${v.label}</button>`).join('');
  menu.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.id, data)));
  meta.innerHTML = `Maj: ${new Date(data.meta.generated_at).toLocaleString()}<br/>DB: ${data.meta.db_path}`;
  setView('overview', data);
}

fetch('./data.json').then((r) => r.json()).then(boot).catch((e) => {
  view.innerHTML = `<div class='card'>Erreur chargement data.json: ${esc(e.message)}</div>`;
});
