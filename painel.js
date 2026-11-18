'use strict';

const $ = id => document.getElementById(id);
const locale = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const n = value => Number.isFinite(value) ? locale.format(value) : '—';
const ratio = (part, total) => total ? part / total : NaN;
const percent = (part, total) => total ? n(100 * part / total) + '%' : '—';
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
const esc = value => String(value ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shortDate = date => date ? date.slice(8,10) + '/' + date.slice(5,7) : '—';
const dateLabel = date => date ? shortDate(date) + '/' + date.slice(0,4) : '—';
const calendar = date => new Date(date + 'T00:00:00Z');
const dayOfWeek = date => (calendar(date).getUTCDay() + 6) % 7;
function addDays(date, days) {
  const time = calendar(date);
  time.setUTCDate(time.getUTCDate() + days);
  return time.toISOString().slice(0,10);
}
function range(start, end) {
  const days = [];
  for (let date = start; date <= end; date = addDays(date, 1)) days.push(date);
  return days;
}
const weekday = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const hours = Array.from({length:24}, (_, i) => i);
const hh = h => String(h).padStart(2,'0') + 'h';
const minuteOf = time => Number(time.slice(0,2)) * 60 + Number(time.slice(3,5)) + Number(time.slice(6,8) || 0) / 60;
const ts = iso => iso ? Date.parse(iso + 'Z') : NaN;
const locName = key => key.replace('|',' · Rua ');
const place = key => key.split('|');
const people = DATA.people;
const locations = DATA.locations;
const depots = [...new Set(locations.map(key => place(key)[0]))].sort((a,b) => b.localeCompare(a));
const records = DATA.records.map(([id,start,end,location,person,answers]) => ({
  id, start, end, location, person: String(person), answers,
  date: start.slice(0,10), time: start.slice(11), hour: Number(start.slice(11,13)),
  startMs: ts(start), endMs: ts(end), minutes: (ts(end) - ts(start)) / 60000
}));
const first = records[0].date;
const last = records.at(-1).date;

const pages = {
  visao: ['Visão geral','Inspeções de ruas','Acompanhe o volume, a cobertura e a duração das inspeções da Loja 30.'],
  volume: ['Volume e frequência','Volume e frequência','Veja quando as inspeções acontecem e onde há dias sem registro.'],
  duracao: ['Tempo e duração','Tempo e duração','Compare a duração dos registros entre datas, ruas e atendentes.'],
  equipe: ['Atendentes','Atendentes','Acompanhe a distribuição das inspeções e a janela de atuação da equipe.'],
  cobertura: ['Ruas e depósitos','Ruas e depósitos','Compare a frequência de visitas com a programação cadastrada.'],
  carga: ['Balanceamento','Balanceamento','Cruze ruas, dias e horários com a equipe para entender a distribuição da carga.'],
  qualidade: ['Qualidade dos dados','Qualidade dos dados','Revise registros que merecem conferência e acompanhe o preenchimento.']
};

const paths = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  bars:'<path d="M4 3v17h16M8 16v-4m5 4V8m5 8V5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2m1-15a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2"/>',
  pin:'<path d="M20 10c0 6-8 11-8 11s-8-5-8-11a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  stack:'<path d="m12 3 9 5-9 5-9-5 9-5Zm9 9-9 5-9-5m18 4-9 5-9-5"/>',
  shield:'<path d="M12 3 4 6v5c0 4 3 8 8 10 5-2 8-6 8-10V6l-8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle fill="white" cx="9" cy="6" r="2"/><circle fill="white" cx="16" cy="12" r="2"/><circle fill="white" cx="7" cy="18" r="2"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  reset:'<path d="M4 11a8 8 0 1 1 2 6M4 5v6h6"/>',
  check:'<path d="M8 4h11v17H5V4h3m1-2h6v5H9zM8 14l2 2 5-5"/>',
  warning:'<path d="M12 3 2.5 20h19L12 3Zm0 6v5m0 3v.1"/>',
  warehouse:'<path d="M3 21V8l9-5 9 5v13M7 21V11h10v10M7 15h10m-10 3h10"/>'
};
const icon = key => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' + paths[key] + '</svg>';
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));

function defaults() {
  return {sla:15, fast:1, dup:5, windowStart:'07:00', windowEnd:'18:00',
    weekdays:[0,1,2,3,4,5,6], expected:[...locations], exceptions:[]};
}
let rules = defaults();
try {
  const saved = JSON.parse(localStorage.getItem('loja30-checklist-v1'));
  if (saved) rules = {...rules, ...saved};
} catch {}
let bucketMode = 'month';
let coverageDate = last;
let windowDate = last;
let loadMode = 'street';
let currentPage = '';
let chartObserver;

function groups(items, key) {
  const out = new Map();
  for (const item of items) {
    const group = key(item);
    if (!out.has(group)) out.set(group, []);
    out.get(group).push(item);
  }
  return out;
}
function percentile(sorted, proportion) {
  if (!sorted.length) return NaN;
  const position = (sorted.length - 1) * proportion;
  const index = Math.floor(position);
  return sorted[index] + (position - index) * (sorted[Math.ceil(position)] - sorted[index]);
}
const valid = rows => rows.filter(row => row.minutes > 0);
const daysWith = rows => new Set(rows.map(row => row.date));
function timeCaption(minutes) {
  if (!Number.isFinite(minutes)) return '—';
  const seconds = Math.round(minutes * 60);
  return seconds < 60 ? seconds + ' s' : Math.floor(seconds / 60) + ' min' + (seconds % 60 ? ' ' + seconds % 60 + ' s' : '');
}
function readModel() {
  const start = $('start').value || first;
  const end = $('end').value || last;
  const depot = $('depot').value;
  const street = $('street').value;
  const employee = $('employee').value;
  const inLocation = key => (!depot || place(key)[0] === depot) && (!street || key === street);
  const periodRows = records.filter(row => row.date >= start && row.date <= end);
  const rows = periodRows.filter(row => inLocation(row.location) && (!employee || row.person === employee));
  const calendarDays = range(start, end);
  const scheduled = calendarDays.filter(day => rules.weekdays.includes(dayOfWeek(day)) && !rules.exceptions.includes(day));
  const byDate = groups(rows, row => row.date);
  const byPlace = groups(rows, row => row.location);
  const byDepot = groups(rows, row => place(row.location)[0]);
  const staff = [...groups(rows, row => row.person)].map(([id, list]) => ({
    id, list, active:daysWith(list).size, average:mean(valid(list).map(row => row.minutes))
  })).sort((a,b) => b.list.length - a.list.length || people[a.id].localeCompare(people[b.id], 'pt-BR'));
  const positive = valid(rows);
  const durations = positive.map(row => row.minutes).sort((a,b) => a-b);
  const p10 = percentile(durations,.1);
  const p90 = percentile(durations,.9);
  const expected = rules.expected.filter(inLocation);
  const scheduledSet = new Set(scheduled);
  const expectedSet = new Set(expected);
  const checked = new Set(rows.filter(row => scheduledSet.has(row.date) && expectedSet.has(row.location)).map(row => row.date + ' ' + row.location));
  return {
    start,end,depot,street,employee,rows,periodRows,calendarDays,scheduled,byDate,byPlace,byDepot,staff,positive,durations,p10,p90,expected,checked,
    missing: scheduled.filter(day => !byDate.has(day)),
    above: positive.filter(row => row.minutes > rules.sla),
    fast: positive.filter(row => row.minutes < rules.fast),
    outlier: positive.filter(row => row.minutes < p10 || row.minutes > p90),
    noEnd: rows.filter(row => !row.end),
    invalid: rows.filter(row => row.end && row.minutes <= 0),
    outside: rows.filter(row => minuteOf(row.time) < minuteOf(rules.windowStart) || minuteOf(row.time) > minuteOf(rules.windowEnd)),
    topThree: staff.slice(0,3).reduce((sum, member) => sum + member.list.length,0),
    personDays: staff.reduce((sum, member) => sum + member.active,0)
  };
}

const kpi = (label,value,caption,symbol,warning = false) =>
  '<article class="kpi' + (warning ? ' warn' : '') + '"><div class="kpi-top"><span>' + label +
  '</span><span class="kpi-icon">' + icon(symbol) + '</span></div><strong class="kpi-value">' + value +
  '</strong><small>' + caption + '</small></article>';
const cards = (...items) => '<div class="cards">' + items.join('') + '</div>';
const panel = (title,caption,content,controls = '') =>
  '<section class="panel"><div class="panel-head"><div><h2>' + title + '</h2>' +
  (caption ? '<p>' + caption + '</p>' : '') + '</div>' + controls + '</div>' + content + '</section>';
const split = (a,b,even = false) => '<div class="split' + (even ? ' even' : '') + '">' + a + b + '</div>';
const empty = (message = 'Sem registros no recorte selecionado.') => '<div class="empty">' + message + '</div>';
const note = copy => '<div class="note-block">' + copy + '</div>';
const badge = (copy, warn = false) => '<span class="badge' + (warn ? ' warn' : '') + '">' + copy + '</span>';
const table = (head,rows,tall = false) => rows.length ? '<div class="table-scroll' + (tall ? ' tall' : '') +
  '" tabindex="0" role="region" aria-label="Tabela de indicadores"><table><thead><tr>' +
  head.map(([label,numeric]) => '<th scope="col"' + (numeric ? ' class="num"' : '') + '>' + label + '</th>').join('') +
  '</tr></thead><tbody>' + rows.map(row => '<tr>' + row.map((value,index) => index === 0 ?
    '<th scope="row">' + value + '</th>' : '<td' + (head[index][1] ? ' class="num"' : '') + '>' + value + '</td>').join('') +
  '</tr>').join('') + '</tbody></table></div>' : empty();
const labels = (...text) => text.map(value => value.startsWith('#') ? [value.slice(1),true] : [value,false]);
function bars(items) {
  const maximum = Math.max(1,...items.map(item => item[1]));
  return '<div class="bars">' + items.map(([label,value,caption]) =>
    '<div><div class="bar-copy"><span>' + esc(label) + '</span><span><b>' + n(value) + '</b>' +
    (caption ? '<small>' + caption + '</small>' : '') + '</span></div><div class="track" aria-hidden="true"><span style="width:' +
    value / maximum * 100 + '%"></span></div></div>').join('') + '</div>';
}
function segments(name, options, selected) {
  return '<div class="segments" role="group" aria-label="' + name + '">' + options.map(([key,label]) =>
    '<button type="button" data-segment="' + key + '" aria-pressed="' + (selected === key) + '">' + label + '</button>').join('') + '</div>';
}
const slotLabel = (key,mode) => mode === 'month' ? monthNames[Number(key.slice(5,7)) - 1] + '/' + key.slice(2,4) :
  shortDate(key) + (mode === 'week' ? '–' + shortDate(addDays(key,6)) : '');
function series(model,mode) {
  const key = date => mode === 'month' ? date.slice(0,7) : mode === 'week' ? addDays(date,-dayOfWeek(date)) : date;
  return [...groups(model.calendarDays,key)].map(([slot,dates]) => ({
    label:slotLabel(slot,mode), value:dates.reduce((sum, day) => sum + (model.byDate.get(day)?.length || 0),0)
  }));
}
function chartPanel(model) {
  const items = series(model,bucketMode);
  const dataTable = table(labels('Período','#Checklists'),items.map(item => [item.label,n(item.value)]),true);
  const chart = '<div class="chart-wrap"><canvas class="chart" id="volume-chart" role="img" ' +
    'aria-label="Gráfico de volume de inspeções. Os valores também estão na tabela abaixo."></canvas><div class="chart-tooltip" id="chart-tip"></div></div>';
  return panel('Evolução das inspeções','Contagem pela data de início. Inclui períodos com zero registros.',chart +
    '<details><summary>Ver valores do gráfico</summary>' + dataTable + '</details>',
    segments('Agrupar volume',[['day','Dia'],['week','Semana'],['month','Mês']],bucketMode));
}
function drawChart(items) {
  const canvas = $('volume-chart');
  if (!canvas) return;
  const tip = $('chart-tip');
  let geometry;
  function paint(index = -1) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(scale,scale);
    const left = 32;
    const bottom = height - 26;
    const top = 17;
    const available = width - left - 8;
    const step = available / Math.max(1, items.length);
    const raw = Math.max(1,...items.map(item => item.value));
    const magnitude = 10 ** Math.floor(Math.log10(raw / 4));
    const tick = Math.max(1,Math.ceil(raw / (4 * magnitude)) * magnitude);
    const max = tick * 4;
    geometry = {left,step};

    ctx.font = '11px Segoe UI, sans-serif';
    ctx.textBaseline = 'middle';
    for (let grid = 0; grid <= 4; grid++) {
      const y = bottom - grid * (bottom - top) / 4;
      ctx.fillStyle = '#5b7062';
      ctx.textAlign = 'right';
      ctx.fillText(n(grid * tick),left - 7,y);
      ctx.strokeStyle = '#e1ebe4';
      ctx.beginPath();
      ctx.moveTo(left,y);
      ctx.lineTo(width - 5,y);
      ctx.stroke();
    }
    const skip = Math.max(1,Math.ceil(items.length / Math.max(2,Math.floor(available / (bucketMode === 'week' ? 72 : 42)))));
    items.forEach(({value,label}, i) => {
      const x = left + step * (i + .5);
      const size = Math.max(1,Math.min(step * .64,57));
      const bar = (bottom - top) * value / max;
      ctx.fillStyle = i === index ? '#154131' : i === items.length - 1 ? '#8fb99f' : '#40835d';
      if (bar > 0) ctx.fillRect(x - size / 2,bottom - bar,size,bar);
      if (i % skip === 0) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#516658';
        ctx.fillText(label,x,height - 10,Math.max(35,step * skip - 4));
      }
    });
  }
  function hide() { tip.style.display = 'none'; paint(); }
  chartObserver = new ResizeObserver(() => paint());
  chartObserver.observe(canvas);
  canvas.onpointermove = event => {
    if (!geometry) return;
    const pos = event.clientX - canvas.getBoundingClientRect().left;
    const index = Math.floor((pos - geometry.left) / geometry.step);
    if (!items[index]) { hide(); return; }
    tip.textContent = items[index].label + ' · ' + n(items[index].value) + ' checklists';
    tip.style.display = 'block';
    tip.style.top = Math.max(0,event.clientY - canvas.getBoundingClientRect().top - 31) + 'px';
    tip.style.left = Math.max(0,Math.min(pos + 8,canvas.clientWidth - tip.offsetWidth)) + 'px';
    paint(index);
  };
  canvas.onpointerleave = hide;
  paint();
}

const colors = ['#f3f6f3','#dcece0','#b8dac2','#86bd98','#4b916b','#256247'];
function matrix(rowLabels,colLabels,counts) {
  if (!rowLabels.length || !colLabels.length) return empty();
  let peak = 0;
  for (const row of counts) for (const value of row) peak = Math.max(peak,value);
  const header = colLabels.map(label => '<th scope="col">' + esc(label) + '</th>').join('');
  const body = counts.map((row, i) => '<tr><th scope="row">' + esc(rowLabels[i]) + '</th>' + row.map((value,j) => {
    const shade = value ? Math.ceil(value / peak * 5) : 0;
    const description = rowLabels[i] + ' · ' + colLabels[j] + ' · ' + n(value) + ' checklists';
    return '<td><span title="' + esc(description) + '" style="background:' + colors[shade] +
      ';color:' + (shade >= 4 ? '#fff' : '#233d2e') + '">' + (value || '·') + '</span></td>';
  }).join('') + '</tr>').join('');
  return '<div class="table-scroll tall" tabindex="0" role="region" aria-label="Mapa de calor com contagem de checklists"><table class="matrix"><thead><tr><th scope="col">Recorte</th>' +
    header + '</tr></thead><tbody>' + body + '</tbody></table></div><div class="matrix-key"><span>0</span>' +
    colors.map(color => '<span class="key-swatch" style="background:' + color + '"></span>').join('') +
    '<span>' + n(peak) + (peak ? ' (máximo no mapa)' : '') + '</span></div>';
}
function byWeekday(model) {
  const buckets = groups(model.rows,row => dayOfWeek(row.date));
  return weekday.map((label,index) => [label,buckets.get(index)?.length || 0]);
}
function timeHeat(model) {
  const bins = groups(model.rows,row => dayOfWeek(row.date) + ':' + row.hour);
  const byHour = groups(model.rows,row => row.hour);
  return matrix(weekday,hours.map(hh),weekday.map((_,index) => hours.map(hour => bins.get(index + ':' + hour)?.length || 0))) +
    '<details><summary>Ver total por hora</summary>' + table(labels('Hora','#Checklists'),
      hours.map(hour => [hh(hour),n(byHour.get(hour)?.length || 0)]),true) + '</details>';
}

const totalCard = m => kpi('Checklists realizados',n(m.rows.length),n(m.byDate.size) + ' dias com registro','check');
const averageCard = m => kpi('Checklists por dia ativo',n(ratio(m.rows.length,m.byDate.size)),'Média nos dias com registro','bars');
const meanCard = m => kpi('Duração média',timeCaption(mean(m.durations)),'Mediana de ' + timeCaption(percentile(m.durations,.5)),'clock');
const slaCard = m => kpi('Acima do limite de tempo',percent(m.above.length,m.positive.length),n(m.above.length) + ' checklists acima de ' + n(rules.sla) + ' min','warning',true);
const lackCard = m => kpi('Dias sem checklist',n(m.missing.length),n(m.scheduled.length) + ' dias programados','calendar',true);
const coverageValue = m => m.employee ? '—' : percent(m.checked.size,m.expected.length * m.scheduled.length);
const coverageCard = m => kpi('Cobertura das ruas',coverageValue(m),m.employee ? 'Remova o filtro de atendente para medir a cobertura' : n(m.checked.size) + ' de ' + n(m.expected.length * m.scheduled.length) + ' visitas previstas','pin');
const unusualCard = m => kpi('Duração atípica',percent(m.outlier.length,m.positive.length),n(m.outlier.length) + ' fora da faixa entre P10 e P90','warning',true);
function depotBars(m) {
  return bars(depots.filter(depot => !m.depot || depot === m.depot).map(depot => {
    const list = m.byDepot.get(depot) || [];
    return [depot,list.length,percent(list.length,m.rows.length)];
  }));
}
function overview(m) {
  const highlights = [
    ['pin','Cobertura das ruas',m.employee ? '—' : coverageValue(m),m.employee ? 'Indicador disponível sem filtro de atendente.' : n(m.expected.length) + ' ruas cadastradas para este recorte.'],
    ['calendar','Dias sem checklist',n(m.missing.length) + ' dias sem registro',m.missing.length ? m.missing.slice(0,4).map(shortDate).join(', ') + (m.missing.length > 4 ? '…' : '') : 'Todos os dias programados tiveram registro no recorte.'],
    ['warning','Duração atípica',percent(m.outlier.length,m.positive.length) + ' dos tempos válidos','Valores abaixo do P10 ou acima do P90.']
  ];
  const snapshots = '<ul class="insight-list">' + highlights.map(([symbol,label,value,description]) =>
    '<li><span class="kpi-icon">' + icon(symbol) + '</span><div><strong>' + label + ' · ' + value + '</strong>' + description + '</div></li>').join('') + '</ul>';
  return cards(totalCard(m),averageCard(m),meanCard(m),slaCard(m)) +
    split(chartPanel(m),panel('Inspeções por depósito','Participação no volume filtrado.',depotBars(m) + snapshots)) +
    split(panel('Atendentes com maior volume','Cinco maiores volumes no recorte.',m.staff.length ? bars(m.staff.slice(0,5).map(member => [
      people[member.id],member.list.length,percent(member.list.length,m.rows.length)
    ])) : empty()),panel('Distribuição por dia da semana','Soma das inspeções registradas.',bars(byWeekday(m))),true) +
    panel('Horários de inspeção','Contagem por dia da semana e hora de início.',timeHeat(m));
}
function volume(m) {
  const daily = m.calendarDays.map(date => [dateLabel(date),weekday[dayOfWeek(date)],n(m.byDate.get(date)?.length || 0),
    m.scheduled.includes(date) ? (m.byDate.has(date) ? badge('Com registro') : badge('Sem registro',true)) : 'Fora da programação']);
  return cards(totalCard(m),averageCard(m),kpi('Dias com registro',n(m.byDate.size),'Datas distintas com checklist','calendar'),lackCard(m)) +
    split(chartPanel(m),panel('Checklists por dia da semana','Distribuição acumulada no período.',bars(byWeekday(m)))) +
    panel('Checklists por hora e dia da semana','A hora corresponde ao início do checklist.',timeHeat(m)) +
    panel('Calendário de registros','Inclui dias com e sem inspeção.', table(labels('Data','Dia da semana','#Checklists','Situação'),daily,true) +
      '<details><summary>Ver somente dias programados sem registro (' + n(m.missing.length) + ')</summary>' +
      (m.missing.length ? '<p>' + m.missing.map(dateLabel).join(' · ') + '</p>' : empty('Todos os dias programados tiveram registro no recorte.')) + '</details>');
}
function duration(m) {
  return cards(meanCard(m),slaCard(m),
    kpi('Inspeções muito rápidas',percent(m.fast.length,m.positive.length),n(m.fast.length) + ' abaixo de ' + n(rules.fast) + ' min','clock'),
    kpi('Duração nula ou negativa',n(m.invalid.length),'Registros com fim igual ou anterior ao início','warning',true)) +
    note('Menor duração válida de <strong>' + timeCaption(m.durations[0]) + '</strong> e maior de <strong>' +
      timeCaption(m.durations.at(-1)) + '</strong>. As medidas de tempo usam ' + n(m.positive.length) +
      ' registros com início, fim e duração positiva. O tempo mostra o intervalo gravado no sistema.') +
    split(
      panel('Tempo médio por rua','Agrupado por depósito e rua.',table(labels('Depósito e rua','#Registros válidos','#Tempo médio'),
        [...m.byPlace].sort(([a],[b]) => a.localeCompare(b)).map(([key,list]) => [esc(locName(key)),n(valid(list).length),timeCaption(mean(valid(list).map(row => row.minutes)))]),true)),
      panel('Tempo médio por atendente','Agrupado pelo ID de atendente.',table(labels('Atendente','#Registros válidos','#Tempo médio'),
        m.staff.map(member => [esc(people[member.id]),n(valid(member.list).length),timeCaption(member.average)]),true)),true) +
    panel('Tempo total de execução por dia','Soma das durações válidas. Registros simultâneos entram individualmente.',table(labels('Data','#Checklists válidos','#Tempo total'),
      m.calendarDays.map(date => {
        const rows = valid(m.byDate.get(date) || []);
        return [dateLabel(date),n(rows.length),timeCaption(rows.reduce((sum,row) => sum + row.minutes,0))];
      }),true));
}
function datePicker(id,caption,value,m) {
  return '<div class="field"><label for="' + id + '">' + caption + '</label><input type="date" id="' + id +
    '" value="' + value + '" min="' + m.start + '" max="' + m.end + '"></div>';
}
const selectedDate = (date,m) => date < m.start || date > m.end ? m.end : date;
function team(m) {
  const selected = selectedDate(windowDate,m);
  const daily = [...groups(m.byDate.get(selected) || [],row => row.person)].map(([id,list]) => [
    esc(people[id]),list[0].time.slice(0,8),list.at(-1).time.slice(0,8),n(list.length)
  ]).sort((a,b) => a[0].localeCompare(b[0],'pt-BR'));
  return cards(kpi('Atendentes ativos',n(m.staff.length),'Com registros no período','people'),totalCard(m),
    kpi('Concentração no top 3',percent(m.topThree,m.rows.length),n(m.topThree) + ' checklists dos três maiores volumes','bars'),
    kpi('Checklists por atendente/dia',n(ratio(m.rows.length,m.personDays)),n(m.personDays) + ' dias ativos somados por atendente','calendar')) +
    panel('Ranking por volume','Participação sobre todos os checklists da Loja 30 no período selecionado.',table(
      labels('Atendente','#Checklists','#Participação','#Dias ativos','#Média diária','#Tempo médio'),
      m.staff.map(member => [esc(people[member.id]),n(member.list.length),percent(member.list.length,m.periodRows.length),
        n(member.active),n(ratio(member.list.length,member.active)),timeCaption(member.average)]),true) +
      '<p class="table-note">Volume e duração devem ser lidos junto com as ruas atribuídas, o tipo de operação e a qualidade da inspeção.</p>') +
    panel('Primeiro e último checklist do dia','Ambos os horários usam o início do checklist.',table(
      labels('Atendente','Primeiro início','Último início','#Checklists'),daily),datePicker('window-date','Dia',selected,m));
}
function dayGap(list) {
  const days = [...daysWith(list)];
  return mean(days.slice(1).map((day,i) => (calendar(day) - calendar(days[i])) / 86400000));
}
function coverage(m) {
  const selected = selectedDate(coverageDate,m);
  const available = new Set((m.byDate.get(selected) || []).map(row => row.location));
  const isScheduled = m.scheduled.includes(selected);
  const coverageRows = [...new Set([...m.expected,...m.byPlace.keys()])].sort().map(key => {
    const list = m.byPlace.get(key) || [];
    const expected = m.expected.includes(key);
    const completed = m.scheduled.filter(day => m.checked.has(day + ' ' + key)).length;
    return [esc(locName(key)),n(list.length),n(daysWith(list).size),n(ratio(list.length,m.calendarDays.length)),
      Number.isFinite(dayGap(list)) ? n(dayGap(list)) + ' d' : '—',
      !m.employee && expected ? percent(completed,m.scheduled.length) : '—'];
  });
  const dep = depots.filter(depot => !m.depot || m.depot === depot).map(depot => {
    const list = m.byDepot.get(depot) || [];
    const expected = m.expected.filter(key => place(key)[0] === depot);
    const covered = expected.reduce((sum,key) => sum + m.scheduled.filter(day => m.checked.has(day + ' ' + key)).length,0);
    return [esc(depot),n(list.length),percent(list.length,m.rows.length),timeCaption(mean(valid(list).map(row => row.minutes))),
      m.employee ? '—' : percent(covered,expected.length * m.scheduled.length)];
  });
  const dayRows = m.expected.map(key => [esc(locName(key)),available.has(key) ? badge('Com registro') : badge('Sem registro',true)])
    .sort((a,b) => Number(a[1].includes('Com registro')) - Number(b[1].includes('Com registro')) || a[0].localeCompare(b[0]));
  return cards(coverageCard(m),kpi('Ruas com registro',n(m.byPlace.size),'Combinações de depósito e rua','pin'),
    kpi('Participação de Cabos',percent(m.periodRows.filter(row => place(row.location)[0] === 'Cabos').length,m.periodRows.length),'Cabos sobre toda a loja no período','warehouse'),lackCard(m)) +
    note('Cobertura é a proporção de visitas previstas com registro. Cada rua esperada conta uma vez por dia programado. Ajuste a programação em <strong>Parâmetros</strong>.') +
    panel('Comparação por depósito','Volume, duração média e cobertura.',table(labels('Depósito','#Checklists','#Participação','#Duração média','#Cobertura'),dep)) +
    panel('Frequência e cobertura por rua','A frequência divide checklists pelos dias corridos do período. O intervalo usa datas distintas consecutivas.',table(
      labels('Depósito e rua','#Checklists','#Dias com registro','#Checklists/dia','#Intervalo médio','#Cobertura'),coverageRows,true)) +
    panel('Cobertura por dia','Filtre a data para localizar as ruas esperadas sem checklist.',
      m.employee ? empty('Remova o filtro de atendente para medir a cobertura diária.') : !isScheduled ?
        empty('A data selecionada está fora da programação.') : m.expected.length ?
        '<p class="table-note">' + n(m.expected.filter(key => !available.has(key)).length) + ' ruas esperadas sem registro em ' + dateLabel(selected) +
          '.</p>' + table(labels('Depósito e rua','Situação'),dayRows) : empty('Cadastre as ruas esperadas em Parâmetros.'),
      datePicker('coverage-date','Dia',selected,m));
}

function overlap(model) {
  const result = [];
  for (const member of model.staff) {
    let prior;
    for (const row of member.list) {
      if (!(row.minutes > 0)) continue;
      if (prior && row.startMs < prior.endMs) result.push({row,prior});
      if (!prior || prior.endMs < row.endMs) prior = row;
    }
  }
  return result;
}
function duplicates(model) {
  const hits = new Map();
  for (const list of groups(model.rows,row => [row.person,row.location,row.date].join(':')).values()) {
    for (let index = 1; index < list.length; index++) {
      const previous = list[index - 1];
      const row = list[index];
      if (row.startMs - previous.startMs <= rules.dup * 60000) {
        hits.set(previous.id,previous);
        hits.set(row.id,row);
      }
    }
  }
  return [...hits.values()];
}
function loadMatrix(model) {
  const dimensions = {
    street: ['Ruas × atendentes','Cada linha representa uma combinação de depósito e rua.',
      row => row.location,[...model.byPlace.keys()].sort(),locName],
    day: ['Dias × atendentes','Inclui dias sem registro no período.',
      row => row.date,model.calendarDays,dateLabel],
    hour: ['Horas × atendentes','Cada linha representa uma hora de início.',
      row => row.hour,hours,hh]
  };
  const [title,caption,group,keys,label] = dimensions[loadMode];
  const byKey = groups(model.rows,group);
  const counts = keys.map(key => {
    const employees = groups(byKey.get(key) || [],row => row.person);
    return model.staff.map(member => employees.get(member.id)?.length || 0);
  });
  const staffLabels = model.staff.map(member => {
    const parts = people[member.id].split(/\s+/);
    return parts.length > 1 ? parts[0] + ' ' + parts.at(-1) + ' · ' + member.id : people[member.id] + ' · ' + member.id;
  });
  return panel(title,caption,matrix(keys.map(label),staffLabels,counts),
    segments('Cruzar atendentes com',[['street','Rua'],['day','Dia'],['hour','Hora']],loadMode));
}
function load(m) {
  const simultaneous = overlap(m);
  const simultaneousPeople = new Set(simultaneous.map(item => item.row.person)).size;
  return cards(kpi('Maior participação',percent(m.staff[0]?.list.length || 0,m.rows.length),
    esc(m.staff[0] ? people[m.staff[0].id] : 'Sem atendentes no recorte'),'people'),
    kpi('Concentração no top 3',percent(m.topThree,m.rows.length),'Participação dos três maiores volumes','bars'),
    kpi('Checklists por atendente/dia',n(ratio(m.rows.length,m.personDays)),n(m.personDays) + ' dias ativos somados por atendente','calendar'),
    kpi('Atendentes com sobreposição',n(simultaneousPeople),n(simultaneous.length) + ' inícios durante outro registro','warning',true)) +
    loadMatrix(m) +
    panel('Horários sobrepostos','Mesmo atendente, com duração válida e início antes do fim de outro registro do recorte.',
      table(labels('Atendente','Checklist que já estava aberto','Fim do registro anterior','Checklist iniciado','Novo início'),
        simultaneous.sort((a,b) => b.row.startMs - a.row.startMs).map(({row,prior}) => [
          esc(people[row.person]),n(prior.id),dateLabel(prior.end.slice(0,10)) + ' · ' + prior.end.slice(11),
          n(row.id),dateLabel(row.date) + ' · ' + row.time
        ]),true));
}
function flagged(rows,reason) {
  return '<details><summary>' + reason + ' (' + n(rows.length) + ')</summary>' +
    table(labels('Checklist','Início','Fim','Depósito e rua','Atendente','#Duração'),
      [...rows].sort((a,b) => b.startMs - a.startMs).map(row => [String(row.id),dateLabel(row.date) + ' · ' + row.time,
        row.end ? dateLabel(row.end.slice(0,10)) + ' · ' + row.end.slice(11) : '—',
        esc(locName(row.location)),esc(people[row.person]),Number.isFinite(row.minutes) ? n(row.minutes) + ' min' : '—']),true) +
    '</details>';
}
function quality(m) {
  const close = duplicates(m);
  const answered = m.rows.filter(row => Number.isFinite(row.answers));
  const seven = answered.filter(row => row.answers === 7).length;
  const distribution = [...groups(answered,row => row.answers)].sort(([a],[b]) => a - b);
  return cards(unusualCard(m),
    kpi('Sem hora de fim',percent(m.noEnd.length,m.rows.length),n(m.noEnd.length) + ' de ' + n(m.rows.length) + ' registros','clock'),
    kpi('Fora da janela operacional',percent(m.outside.length,m.rows.length),n(m.outside.length) + ' inícios fora de ' + rules.windowStart + '–' + rules.windowEnd,'calendar',true),
    kpi('Possíveis duplicidades',n(close.length),'Registros a até ' + n(rules.dup) + ' min de outro início','warning',true)) +
    split(panel('Preenchimento das respostas','Quantidade de respostas informada por checklist.',distribution.length ?
      bars(distribution.map(([count,list]) => [count + ' respostas',list.length,percent(list.length,m.rows.length)])) +
      '<p class="table-note">Média de <strong>' + n(mean(answered.map(row => row.answers))) +
      '</strong> respostas por checklist. <strong>' + percent(seven,m.rows.length) + '</strong> dos registros têm sete respostas.</p>' +
      '<p>No arquivo original, 147 checklists da loja têm seis respostas. Neles, o kit de limpeza aparece junto à pergunta de limpeza.</p>' : empty()),
    panel('Como ler as verificações','Faixas calculadas para o recorte selecionado.',
      '<ul class="insight-list">' + [
        ['clock','Duração atípica','Abaixo de ' + timeCaption(m.p10) + ' (P10) ou acima de ' + timeCaption(m.p90) + ' (P90), entre os tempos positivos.'],
        ['check','Possíveis duplicidades','Dois inícios próximos no mesmo dia, na mesma rua e depósito, pelo mesmo atendente. Cada registro é contado uma vez.'],
        ['warning','Duração nula ou negativa',n(m.invalid.length) + ' registros com fim igual ou anterior ao início.']
      ].map(([symbol,label,description]) => '<li><span class="kpi-icon">' + icon(symbol) + '</span><div><strong>' + label +
        '</strong>' + description + '</div></li>').join('') + '</ul>'),true) +
    panel('Registros para conferência','Abra um grupo para ver os checklists. Um registro pode aparecer em mais de um grupo.',
      flagged(m.outlier,'Duração atípica') + flagged(m.noEnd,'Sem hora de fim') +
      flagged(m.invalid,'Duração nula ou negativa') + flagged(m.outside,'Fora da janela operacional') +
      flagged(close,'Possíveis duplicidades') + flagged(m.fast,'Inspeções muito rápidas'));
}

const pageViews = {visao:overview,volume,duracao:duration,equipe:team,cobertura:coverage,carga:load,qualidade:quality};
const option = (key,name) => '<option value="' + esc(key) + '">' + esc(name) + '</option>';
const tickbox = (key,label,checked) => '<label><input type="checkbox" value="' + esc(key) + '"' +
  (checked ? ' checked' : '') + '>' + esc(label) + '</label>';
function refreshStreets() {
  const current = $('street').value;
  const depot = $('depot').value;
  const candidates = [...new Set([...locations,...rules.expected])].sort().filter(key => !depot || place(key)[0] === depot);
  $('street').innerHTML = option('','Todas') + candidates.map(key => option(key,depot ? 'Rua ' + place(key)[1] : locName(key))).join('');
  if (candidates.includes(current)) $('street').value = current;
}
function navigate() {
  const target = location.hash.slice(1);
  const page = Object.hasOwn(pages,target) ? target : 'visao';
  if (currentPage !== page) {
    currentPage = page;
    window.scrollTo(0,0);
  }
  const [name,title,subtitle] = pages[page];
  $('breadcrumb').textContent = name;
  $('page-title').textContent = title;
  $('page-subtitle').textContent = subtitle;
  document.querySelectorAll('[data-page]').forEach(link => {
    if (link.dataset.page === page) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  render();
}
function render() {
  chartObserver?.disconnect();
  const start = $('start').value || first;
  const end = $('end').value || last;
  $('period').textContent = dateLabel(start) + ' a ' + dateLabel(end);
  if (start > end || start < first || end > last) {
    $('filter-note').textContent = 'Selecione um intervalo válido dentro do período da base (' + dateLabel(first) + ' a ' + dateLabel(last) + ').';
    $('view').innerHTML = empty('Aguardando ajuste nas datas.');
    return;
  }
  const model = readModel();
  $('filter-note').textContent = model.rows.length ? '' : 'Nenhum checklist encontrado com esses filtros.';
  $('view').innerHTML = pageViews[currentPage](model);
  if ($('volume-chart')) drawChart(series(model,bucketMode));
}
function fillSettings(values) {
  $('sla').value = values.sla;
  $('fast').value = values.fast;
  $('duplicate').value = values.dup;
  $('window-start').value = values.windowStart;
  $('window-end').value = values.windowEnd;
  $('weekday-settings').innerHTML = weekday.map((day,index) =>
    tickbox(index,day.slice(0,3),values.weekdays.includes(index))).join('');
  $('street-settings').innerHTML = locations.map(key => tickbox(key,locName(key),values.expected.includes(key))).join('');
  $('extra-streets').value = values.expected.filter(key => !locations.includes(key)).map(key => place(key).join(' ')).join(', ');
  $('exceptions').value = values.exceptions.map(dateLabel).join(', ');
  $('settings-error').textContent = '';
}
function parseExceptions(input) {
  const days = input.split(',').map(value => value.trim()).filter(Boolean);
  return days.map(day => {
    const [d,m,y] = day.split('/');
    const date = [y,m,d].join('-');
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(day) || !Number.isFinite(calendar(date).getTime()) ||
        calendar(date).toISOString().slice(0,10) !== date) throw new Error('Informe datas válidas no formato dd/mm/aaaa.');
    return date;
  });
}
function parseStreets(input) {
  return input.split(',').map(value => value.trim()).filter(Boolean).map(value => {
    const match = /^(Geral|Cabos)\s+(\d+)$/i.exec(value);
    if (!match) throw new Error('Informe o depósito e o número de cada rua, por exemplo Geral 16.');
    const depot = depots.find(item => item.toLowerCase() === match[1].toLowerCase());
    const street = match[2].replace(/^0+(?=\d)/,'').padStart(2,'0');
    return depot + '|' + street;
  });
}
function resetFilters() {
  $('start').value = first;
  $('end').value = last;
  $('depot').value = '';
  $('employee').value = '';
  $('street').value = '';
  refreshStreets();
}

$('depot').innerHTML = option('','Todos') + depots.map(depot => option(depot,depot)).join('');
$('employee').innerHTML = option('','Todos') + Object.entries(people).sort((a,b) => a[1].localeCompare(b[1],'pt-BR'))
  .map(([id,name]) => option(id,name)).join('');
for (const id of ['start','end']) {
  $(id).min = first;
  $(id).max = last;
}
$('snapshot').textContent = 'Dados até ' + dateLabel(last);
resetFilters();
$('filters').addEventListener('submit',event => event.preventDefault());
$('filters').addEventListener('change',event => {
  if (event.target.id === 'depot') refreshStreets();
  render();
});
$('reset').addEventListener('click',() => { resetFilters(); render(); });
$('rules').addEventListener('click',() => { fillSettings(rules); $('settings').showModal(); });
$('close-settings').addEventListener('click',() => $('settings').close());
$('default-rules').addEventListener('click',() => fillSettings(defaults()));
$('settings-form').addEventListener('submit',event => {
  event.preventDefault();
  const checked = id => [...$(id).querySelectorAll('input:checked')].map(input => input.value);
  try {
    const windowStart = $('window-start').value;
    const windowEnd = $('window-end').value;
    if (windowStart > windowEnd) throw new Error('O início da janela deve ser anterior ou igual ao fim.');
    const weekdays = checked('weekday-settings').map(Number);
    if (!weekdays.length) throw new Error('Selecione pelo menos um dia programado.');
    const expected = [...new Set([...checked('street-settings'),...parseStreets($('extra-streets').value)])];
    rules = {sla:Number($('sla').value),fast:Number($('fast').value),dup:Number($('duplicate').value),
      windowStart,windowEnd,weekdays,expected,exceptions:parseExceptions($('exceptions').value)};
    try { localStorage.setItem('loja30-checklist-v1',JSON.stringify(rules)); } catch {}
    $('settings').close();
    refreshStreets();
    render();
  } catch (error) {
    $('settings-error').textContent = error.message;
  }
});
$('view').addEventListener('click',event => {
  const button = event.target.closest('[data-segment]');
  if (!button) return;
  const key = button.dataset.segment;
  if (currentPage === 'carga') loadMode = key;
  else bucketMode = key;
  render();
  $('view').querySelector('[data-segment="' + key + '"]')?.focus({preventScroll:true});
});
$('view').addEventListener('change',event => {
  const {id,value} = event.target;
  if (id === 'coverage-date' && value) coverageDate = value;
  else if (id === 'window-date' && value) windowDate = value;
  else return;
  render();
  $(id)?.focus({preventScroll:true});
});
window.addEventListener('hashchange',navigate);
navigate();
