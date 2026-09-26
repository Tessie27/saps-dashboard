import sapsData from '../data/saps.json';
import { GENDER } from '../data/gender.js';

const state = { data: sapsData, selectedProvince: null, mapMode: 'total', sortKey: 'total_2024_25', sortDir: -1, search: '', provFilterVal: '' };

const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const t = b.dataset.t;
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  [...themeToggle.children].forEach((c) => c.classList.toggle('active', c === b));
});

function fmt(n) {
  if (n === null || n === undefined) return ' - ';
  return Math.round(n).toLocaleString('en-ZA');
}
function fmtPct(n) {
  if (n === null || n === undefined) return ' - ';
  const s = n > 0 ? '+' : '';
  return s + n.toFixed(1) + '%';
}
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// SVGs stretch to fill their container with no intrinsic width/height, so a
// viewBox sized for desktop renders every font-size far too small on a phone.
// Measuring the real rendered width and using it as the viewBox width keeps
// 1 user-unit == 1 real CSS pixel at any screen size, so font sizes stay crisp.
function renderWidth(svg, fallback) {
  const w = svg.parentElement && svg.parentElement.getBoundingClientRect().width;
  return w && w > 40 ? Math.round(w) : fallback;
}
const MOBILE = 480;

function init(d) {
  renderKpis(d);
  buildMap(d);
  renderTrend(d);
  renderProvBars(d);
  renderGroups(d);
  renderCategories(d);
  buildProvFilter(d);
  renderTable(d);
  renderGenderKpis();
  renderGenderGap();
  renderGenderTrend();
  renderSafety();
}

function renderKpis(d) {
  const top = d.province_summary[0];
  const topCat = d.top_categories[0];
  const kpis = [
    { label: 'National total, FY' + d.meta.latest_year, value: fmt(d.national_total_latest), delta: d.national_pct_change, note: 'crimes recorded' },
    { label: 'Year-on-year change', value: fmtPct(d.national_pct_change), cls: d.national_pct_change > 0 ? 'up' : 'down', note: 'vs FY' + d.meta.prev_year },
    { label: '10-year change', value: fmtPct(d.national_pct_change_10yr), cls: d.national_pct_change_10yr > 0 ? 'up' : 'down', note: 'vs FY' + d.years[0] },
    { label: 'Highest-volume province', value: top.province, note: fmt(top.latest) + ' crimes (' + fmtPct(top.pct_change) + ' YoY)' },
    { label: 'Top crime category', value: topCat[0], note: fmt(topCat[1]) + ' recorded nationally' },
  ];
  const row = document.getElementById('kpiRow');
  row.innerHTML = kpis
    .map((k) => {
      let deltaHtml = '';
      if (k.delta !== undefined) {
        const cls = k.delta > 0 ? 'up' : 'down';
        deltaHtml = '<div class="delta ' + cls + '">' + fmtPct(k.delta) + ' vs prior year</div>';
      }
      const valueCls = k.cls ? ' style="color:var(--' + (k.cls === 'up' ? 'bad' : 'good') + ')"' : '';
      return '<div class="kpi"><div class="label">' + k.label + '</div><div class="value"' + valueCls + '>' + k.value + '</div>' + deltaHtml + '<div class="note">' + k.note + '</div></div>';
    })
    .join('');
}

function renderGenderKpis() {
  const kpis = [
    { label: 'Individual assault, 2025/26', value: '2.5×', note: '293,000 men vs 115,000 women assaulted' },
    { label: 'Housebreaking, 2025/26', value: '1.4×', note: '632,000 vs 446,000 households, by sex of head' },
    { label: 'Assault by a partner', value: '31% vs 2%', note: 'women vs men naming a spouse/partner as attacker' },
    { label: 'Unsafe alone after dark', value: '45% vs 39%', note: 'women vs men who feel "very unsafe", 2025/26' },
  ];
  document.getElementById('genderKpiRow').innerHTML = kpis
    .map((k) => '<div class="kpi"><div class="label">' + k.label + '</div><div class="value">' + k.value + '</div><div class="note">' + k.note + '</div></div>')
    .join('');
}

function buildMap(d) {
  const svg = document.getElementById('mapSvg');
  const g = d.geo;
  svg.setAttribute('viewBox', g.viewbox);

  const maxTotal = Math.max(...d.province_summary.map((p) => p.latest));
  const maxRate = Math.max(...d.province_summary.map((p) => p.per_100k || 0));

  function seqColor(t) {
    const steps = ['--seq-100', '--seq-200', '--seq-300', '--seq-400', '--seq-500', '--seq-600', '--seq-700'];
    const idx = Math.min(steps.length - 1, Math.floor(t * steps.length));
    return cssVar(steps[idx]);
  }

  let html = '';
  d.province_summary.forEach((p) => {
    const path = g.province_paths[p.province];
    if (!path) return;
    html += '<path class="prov-boundary" data-prov="' + p.province + '" d="' + path + '" fill-rule="evenodd"></path>';
  });

  d.province_summary.forEach((p) => {
    const px = g.provinces_px[p.province];
    if (!px) return;
    const val = state.mapMode === 'total' ? p.latest : (p.per_100k || 0);
    const max = state.mapMode === 'total' ? maxTotal : maxRate;
    const t = max ? val / max : 0;
    const r = 14 + Math.sqrt(t) * 34;
    const color = seqColor(t);
    html += '<g class="prov-g" data-prov="' + p.province + '"><circle class="prov-bubble" cx="' + px[0] + '" cy="' + px[1] + '" r="' + r.toFixed(1) + '" fill="' + color + '"></circle></g>';
  });

  Object.keys(g.cities_px).forEach((city) => {
    const stn = d.top_stations.find((s) => s.station === city || (city === 'Mbombela' && s.station === 'Nelspruit') || (city === 'Mmabatho' && s.station === 'Mahikeng'));
    const px = g.cities_px[city];
    const r = stn ? 2.5 + Math.sqrt(stn.total_2024_25) / 45 : 2.2;
    html += '<circle class="city-dot" data-city="' + city + '" data-total="' + (stn ? stn.total_2024_25 : '') + '" cx="' + px[0] + '" cy="' + px[1] + '" r="' + r.toFixed(1) + '"></circle>';
  });

  // the map's viewBox is a fixed geographic coordinate space (bubble/label
  // positions come pre-computed from the data), so unlike the other charts
  // we can't just resize the viewBox to match the container - instead scale
  // the label font-size up to compensate for how much the container shrank it.
  const viewBoxW = parseFloat(g.viewbox.split(' ')[2]) || 760;
  const renderedW = renderWidth(svg, viewBoxW);
  const labelFontPx = (11 * viewBoxW) / renderedW;

  d.province_summary.forEach((p) => {
    const px = g.provinces_px[p.province];
    if (!px) return;
    html += '<text class="prov-label" style="font-size:' + labelFontPx.toFixed(1) + 'px" data-lbl="' + p.province + '" x="' + px[0] + '" y="' + (px[1] - 24) + '">' + p.province + '</text>';
  });

  svg.innerHTML = html;

  const tip = document.getElementById('mapTip');
  function showTip(evt, title, lines) {
    tip.innerHTML = '<div class="t1">' + title + '</div>' + lines.map((l) => '<div class="t2">' + l + '</div>').join('');
    const wrap = svg.parentElement.getBoundingClientRect();
    tip.style.left = evt.clientX - wrap.left + 12 + 'px';
    tip.style.top = evt.clientY - wrap.top + 12 + 'px';
    tip.style.opacity = 1;
  }
  function hideTip() {
    tip.style.opacity = 0;
  }

  svg.querySelectorAll('.prov-g, .prov-boundary').forEach((el) => {
    const prov = el.dataset.prov;
    const pdata = d.province_summary.find((p) => p.province === prov);
    el.addEventListener('mousemove', (e) => {
      showTip(e, prov, ['Total FY' + d.meta.latest_year + ': ' + fmt(pdata.latest), 'YoY change: ' + fmtPct(pdata.pct_change), 'Per 100k pop.: ' + (pdata.per_100k ? fmt(pdata.per_100k) : ' - ')]);
    });
    el.addEventListener('mouseleave', hideTip);
    el.addEventListener('click', () => selectProvince(prov === state.selectedProvince ? null : prov));
  });
  svg.querySelectorAll('.city-dot').forEach((dot) => {
    dot.addEventListener('mousemove', (e) => {
      const city = dot.dataset.city;
      const total = dot.dataset.total;
      showTip(e, city, total ? ['FY' + d.meta.latest_year + ': ' + fmt(total) + ' crimes recorded'] : ['Metro station']);
    });
    dot.addEventListener('mouseleave', hideTip);
  });

  applyMapSelection();
}

function applyMapSelection() {
  const svg = document.getElementById('mapSvg');
  svg.querySelectorAll('.prov-bubble').forEach((b) => {
    const prov = b.parentElement.dataset.prov;
    b.classList.toggle('dim', !!(state.selectedProvince && prov !== state.selectedProvince));
  });
  svg.querySelectorAll('.prov-boundary').forEach((b) => {
    b.classList.toggle('sel', b.dataset.prov === state.selectedProvince);
  });
  svg.querySelectorAll('.prov-label').forEach((l) => {
    l.classList.toggle('sel', l.dataset.lbl === state.selectedProvince);
  });
  document.getElementById('mapClear').style.display = state.selectedProvince ? 'inline' : 'none';
  document.getElementById('provClear').style.display = state.selectedProvince ? 'inline' : 'none';
}

document.getElementById('mapMode').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.mapMode = b.dataset.m;
  [...e.currentTarget.children].forEach((c) => c.classList.toggle('active', c === b));
  buildMap(state.data);
});
document.getElementById('mapClear').addEventListener('click', () => selectProvince(null));
document.getElementById('provClear').addEventListener('click', () => selectProvince(null));

function selectProvince(prov) {
  state.selectedProvince = prov;
  applyMapSelection();
  renderProvBars(state.data);
  renderTable(state.data);
  document.getElementById('provFilter').value = prov || '';
}

function renderTrend(d) {
  const svg = document.getElementById('trendSvg');
  const W = renderWidth(svg, 520), H = 260, M = { t: 26, r: 16, b: 28, l: 52 };
  const vals = d.national_trend;
  const years = d.years;
  let max = Math.max(...vals), min = Math.min(...vals);
  const pad = (max - min) * 0.12;
  max += pad;
  min = Math.max(0, min - pad);
  const x = (i) => M.l + (i * (W - M.l - M.r)) / (years.length - 1);
  const y = (v) => H - M.b - ((v - min) / (max - min)) * (H - M.t - M.b);

  const ticks = 4;
  let gridHtml = '';
  for (let i = 0; i <= ticks; i++) {
    const v = min + ((max - min) * i) / ticks;
    const yy = y(v);
    gridHtml += '<line class="gridline" x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + yy + '" y2="' + yy + '"></line>';
    gridHtml += '<text class="axis-label" x="' + (M.l - 8) + '" y="' + (yy + 3) + '" text-anchor="end">' + Math.round(v / 1000) + 'k</text>';
  }
  let xlabels = '';
  const maxLabels = W < MOBILE ? 5 : years.length;
  const step = Math.max(1, Math.ceil((years.length - 1) / (maxLabels - 1)));
  const idxs = [];
  for (let i = 0; i < years.length; i += step) idxs.push(i);
  const lastIdx = years.length - 1;
  if (idxs[idxs.length - 1] !== lastIdx) {
    if (idxs.length > 1 && lastIdx - idxs[idxs.length - 1] < step / 2) idxs.pop();
    idxs.push(lastIdx);
  }
  const shownYears = new Set(idxs);
  years.forEach((yr, i) => {
    if (!shownYears.has(i)) return;
    xlabels += '<text class="axis-label" x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle">' + yr.slice(2, 4) + '/' + yr.slice(7, 9) + '</text>';
  });

  const pathD = vals.map((v, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
  const areaD = pathD + ' L ' + x(vals.length - 1).toFixed(1) + ',' + (H - M.b) + ' L ' + x(0).toFixed(1) + ',' + (H - M.b) + ' Z';
  const dotsHtml = vals.map((v, i) => '<circle class="hover-dot" cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="3.5" fill="var(--series-1)"></circle>').join('');

  const axisTitleText = W < MOBILE ? 'Crimes recorded' : 'Crimes recorded (17 community-reported serious crimes)';
  const axisTitle = '<text class="axis-title" x="' + M.l + '" y="12">' + axisTitleText + '</text>';

  // annotate the FY2020/21 dip - the year South Africa's COVID-19 lockdown
  // sharply suppressed reported crime - so the chart reads as a story, not
  // just a line.
  const covidIdx = years.indexOf('2020-2021');
  let covidHtml = '';
  if (covidIdx >= 0) {
    const cx = x(covidIdx), cy = y(vals[covidIdx]);
    covidHtml =
      '<line x1="' + cx + '" x2="' + cx + '" y1="' + M.t + '" y2="' + (H - M.b) + '" stroke="var(--baseline)" stroke-width="1" stroke-dasharray="2,3"></line>' +
      '<text class="annotation-label" x="' + cx + '" y="' + (M.t + 12) + '" text-anchor="' + (covidIdx > years.length / 2 ? 'end' : 'start') + '">COVID-19 lockdown</text>';
  }

  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.innerHTML =
    '<defs><linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--series-1)" stop-opacity="0.22"/><stop offset="100%" stop-color="var(--series-1)" stop-opacity="0"/></linearGradient></defs>' +
    gridHtml +
    '<line class="baseline" x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + (H - M.b) + '" y2="' + (H - M.b) + '"></line>' +
    '<path d="' + areaD + '" fill="url(#trendGrad)"></path>' +
    '<path d="' + pathD + '" fill="none" stroke="var(--series-1)" stroke-width="2"></path>' +
    dotsHtml + xlabels + axisTitle + covidHtml +
    '<line class="crosshair" id="trendCross" x1="0" x2="0" y1="' + M.t + '" y2="' + (H - M.b) + '"></line>' +
    '<rect id="trendHitbox" x="' + M.l + '" y="' + M.t + '" width="' + (W - M.l - M.r) + '" height="' + (H - M.t - M.b) + '" fill="transparent"></rect>';

  const latest = vals[vals.length - 1], first = vals[0], low = Math.min(...vals);
  const pctFromLow = (((latest - low) / low) * 100).toFixed(0);
  const pctFromFirst = (((latest - first) / first) * 100).toFixed(0);
  const insight = document.getElementById('trendInsight');
  if (insight) {
    insight.innerHTML =
      'Recorded crime fell <b>' + Math.abs(pctFromFirst) + '%</b> from FY' + years[0] + ' to FY' + years[years.length - 1] +
      ', with the steepest drop during the FY2020/21 COVID-19 lockdown. Since that low point it has climbed back <b>' + pctFromLow + '%</b>, and is now trending down again over the last two years.';
  }

  const tip = document.getElementById('trendTip');
  const hit = document.getElementById('trendHitbox');
  const cross = document.getElementById('trendCross');
  hit.addEventListener('mousemove', (e) => {
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    let i = Math.round((mx - M.l) / ((W - M.l - M.r) / (years.length - 1)));
    i = Math.max(0, Math.min(years.length - 1, i));
    const xi = x(i);
    cross.setAttribute('x1', xi);
    cross.setAttribute('x2', xi);
    cross.style.opacity = 1;
    const wrap = svg.parentElement.getBoundingClientRect();
    const scale = wrap.width / W;
    tip.style.left = xi * scale + 12 + 'px';
    tip.style.top = y(vals[i]) * scale + 'px';
    tip.innerHTML = '<div class="tt-title">FY ' + years[i] + '</div><div class="tt-row"><span>Total</span><b style="margin-left:8px;">' + fmt(vals[i]) + '</b></div>';
    tip.style.opacity = 1;
  });
  hit.addEventListener('mouseleave', () => {
    tip.style.opacity = 0;
    cross.style.opacity = 0;
  });
}

function renderProvBars(d) {
  const svg = document.getElementById('provSvg');
  const list = d.province_summary.slice();
  const W = renderWidth(svg, 620), H = 340, M = { t: 8, r: 70, b: 8, l: W < MOBILE ? 96 : 130 };
  const rowH = (H - M.t - M.b) / list.length;
  const max = Math.max(...list.map((p) => p.latest));
  const bw = (v) => (v / max) * (W - M.l - M.r);

  let html = '';
  list.forEach((p, i) => {
    const w = bw(p.latest);
    const selected = state.selectedProvince === p.province;
    const color = selected ? 'var(--series-1)' : state.selectedProvince ? 'var(--text-muted)' : 'var(--series-1)';
    const opacity = state.selectedProvince && !selected ? 0.35 : 1;
    html +=
      '<g class="bar-row' + (selected ? ' bar-sel' : '') + '" data-prov="' + p.province + '" transform="translate(0,' + i * rowH + ')">' +
      '<text class="bar-label" x="' + (M.l - 8) + '" y="' + (rowH / 2 + 4) + '" text-anchor="end">' + p.province + '</text>' +
      '<rect class="bar" x="' + M.l + '" y="' + rowH * 0.18 + '" width="' + w.toFixed(1) + '" height="' + (rowH * 0.64).toFixed(1) + '" rx="3" fill="' + color + '" opacity="' + opacity + '"></rect>' +
      '<text class="bar-value" x="' + (M.l + w + 6) + '" y="' + (rowH / 2 + 4) + '">' + fmt(p.latest) + '</text>' +
      '</g>';
  });
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.innerHTML = html;

  const tip = document.getElementById('provTip');
  svg.querySelectorAll('.bar-row').forEach((row) => {
    const prov = row.dataset.prov;
    const pdata = list.find((p) => p.province === prov);
    row.addEventListener('mousemove', (e) => {
      const wrap = svg.parentElement.getBoundingClientRect();
      tip.innerHTML =
        '<div class="tt-title">' + prov + '</div>' +
        '<div class="tt-row"><span>FY' + d.meta.latest_year + '</span><b style="margin-left:8px;">' + fmt(pdata.latest) + '</b></div>' +
        '<div class="tt-row"><span>YoY</span><b style="margin-left:8px;">' + fmtPct(pdata.pct_change) + '</b></div>' +
        '<div class="tt-row"><span>Per 100k</span><b style="margin-left:8px;">' + (pdata.per_100k ? fmt(pdata.per_100k) : ' - ') + '</b></div>';
      tip.style.left = e.clientX - wrap.left + 12 + 'px';
      tip.style.top = e.clientY - wrap.top - 10 + 'px';
      tip.style.opacity = 1;
    });
    row.addEventListener('mouseleave', () => (tip.style.opacity = 0));
    row.addEventListener('click', () => selectProvince(prov === state.selectedProvince ? null : prov));
  });

  const insight = document.getElementById('provInsight');
  if (insight && !state.selectedProvince) {
    const top2 = list.slice(0, 2);
    const total = list.reduce((a, p) => a + p.latest, 0);
    const top2Share = (((top2[0].latest + top2[1].latest) / total) * 100).toFixed(0);
    const biggestDrop = list.slice().sort((a, b) => a.pct_change - b.pct_change)[0];
    const biggestRise = list.slice().sort((a, b) => b.pct_change - a.pct_change)[0];
    insight.innerHTML =
      '<b>' + top2[0].province + '</b> and <b>' + top2[1].province + '</b> alone account for <b>' + top2Share + '%</b> of all recorded crime nationally. ' +
      '<b>' + biggestDrop.province + '</b> saw the largest year-on-year fall (' + fmtPct(biggestDrop.pct_change) + '), while ' +
      (biggestRise.pct_change > 0 ? '<b>' + biggestRise.province + '</b> is the only province that got worse (' + fmtPct(biggestRise.pct_change) + ').' : 'every province improved on the year before.');
  } else if (insight && state.selectedProvince) {
    const p = list.find((x) => x.province === state.selectedProvince);
    insight.innerHTML = p
      ? '<b>' + p.province + '</b>: ' + fmt(p.latest) + ' crimes recorded in FY' + d.meta.latest_year + ', ' + fmtPct(p.pct_change) + ' vs the year before' + (p.per_100k ? ' (' + fmt(p.per_100k) + ' per 100,000 people).' : '.')
      : '';
  }
}

function renderGroups(d) {
  const svg = document.getElementById('groupSvg');
  const W = renderWidth(svg, 300), H = W, cx = W / 2, cy = (H * 140) / 300, rOuter = (W * 110) / 300, rInner = (W * 64) / 300;
  const colors = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-7)'];
  const total = d.category_groups.reduce((a, g) => a + g.value, 0);
  let angle = -Math.PI / 2;
  let html = '';
  const segs = [];
  d.category_groups.forEach((g, i) => {
    const frac = g.value / total;
    const a0 = angle, a1 = angle + frac * Math.PI * 2;
    angle = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const pt = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const p0o = pt(rOuter, a0), p1o = pt(rOuter, a1), p0i = pt(rInner, a1), p1i = pt(rInner, a0);
    const d0 =
      'M ' + p0o[0].toFixed(1) + ',' + p0o[1].toFixed(1) +
      ' A ' + rOuter + ',' + rOuter + ' 0 ' + large + ' 1 ' + p1o[0].toFixed(1) + ',' + p1o[1].toFixed(1) +
      ' L ' + p0i[0].toFixed(1) + ',' + p0i[1].toFixed(1) +
      ' A ' + rInner + ',' + rInner + ' 0 ' + large + ' 0 ' + p1i[0].toFixed(1) + ',' + p1i[1].toFixed(1) + ' Z';
    html += '<path class="donut-seg" data-i="' + i + '" d="' + d0 + '" fill="' + colors[i % colors.length] + '" stroke="var(--surface-1)" stroke-width="2"></path>';
    segs.push(g);
  });
  html += '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" font-size="20" font-weight="600" fill="var(--text-primary)">' + fmt(total) + '</text>';
  html += '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="10.5" fill="var(--text-muted)">total recorded</text>';
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.innerHTML = html;

  const tip = document.getElementById('groupTip');
  svg.querySelectorAll('.donut-seg').forEach((seg) => {
    const g = segs[+seg.dataset.i];
    seg.addEventListener('mousemove', (e) => {
      const wrap = svg.parentElement.getBoundingClientRect();
      tip.innerHTML = '<div class="tt-title">' + g.name + '</div><div class="tt-row"><span>' + fmt(g.value) + '</span><b style="margin-left:8px;">' + ((g.value / total) * 100).toFixed(1) + '%</b></div>';
      tip.style.left = e.clientX - wrap.left + 12 + 'px';
      tip.style.top = e.clientY - wrap.top - 10 + 'px';
      tip.style.opacity = 1;
    });
    seg.addEventListener('mouseleave', () => (tip.style.opacity = 0));
  });

  document.getElementById('groupLegend').innerHTML = d.category_groups
    .map((g, i) => '<span class="li"><span class="sw" style="background:' + colors[i % colors.length] + '"></span>' + g.name + '</span>')
    .join('');

  const insight = document.getElementById('groupInsight');
  if (insight) {
    const sorted = d.category_groups.slice().sort((a, b) => b.value - a.value);
    const share = ((sorted[0].value / total) * 100).toFixed(0);
    insight.innerHTML = '<b>' + sorted[0].name + '</b> is the single largest share of recorded crime, at <b>' + share + '%</b> of the national total.';
  }
}

function renderCategories(d) {
  const svg = document.getElementById('catSvg');
  const list = d.top_categories;
  const W = renderWidth(svg, 900);
  const max = Math.max(...list.map((c) => c[1]));
  let html = '', H;

  if (W < MOBILE) {
    // long crime-category names don't fit beside a bar on a phone-width
    // screen, so stack each row: label on its own line, bar below it.
    const rowH = 40;
    H = rowH * list.length;
    const rightPad = 62;
    list.forEach((c, i) => {
      const yy = i * rowH;
      const isOther = c[0] === 'Other categories';
      const barMaxW = W - 8 - rightPad;
      const w = (c[1] / max) * barMaxW;
      html +=
        '<g class="bar-row" transform="translate(0,' + yy + ')">' +
        '<text class="bar-label" style="font-size:10.5px" x="2" y="12" text-anchor="start">' + c[0] + '</text>' +
        '<rect class="bar" x="2" y="18" width="' + w.toFixed(1) + '" height="10" rx="2" fill="' + (isOther ? 'var(--text-muted)' : 'var(--series-1)') + '"></rect>' +
        '<text class="bar-value" style="font-size:10px" x="' + (2 + w + 6) + '" y="27">' + fmt(c[1]) + '</text>' +
        '</g>';
    });
  } else {
    H = 460;
    const M = { t: 10, r: 70, b: 10, l: 330 };
    const rowH = (H - M.t - M.b) / list.length;
    list.forEach((c, i) => {
      const w = (c[1] / max) * (W - M.l - M.r);
      const yy = i * rowH;
      const isOther = c[0] === 'Other categories';
      html +=
        '<g class="bar-row" transform="translate(0,' + yy + ')">' +
        '<text class="bar-label" x="' + (M.l - 8) + '" y="' + (rowH / 2 + 4) + '" text-anchor="end">' + c[0] + '</text>' +
        '<rect class="bar" x="' + M.l + '" y="' + rowH * 0.2 + '" width="' + w.toFixed(1) + '" height="' + (rowH * 0.6).toFixed(1) + '" rx="3" fill="' + (isOther ? 'var(--text-muted)' : 'var(--series-1)') + '"></rect>' +
        '<text class="bar-value" x="' + (M.l + w + 6) + '" y="' + (rowH / 2 + 4) + '">' + fmt(c[1]) + '</text>' +
        '</g>';
    });
  }
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.innerHTML = html;

  const tip = document.getElementById('catTip');
  svg.querySelectorAll('.bar-row').forEach((row, i) => {
    row.addEventListener('mousemove', (e) => {
      const wrap = svg.parentElement.getBoundingClientRect();
      tip.innerHTML = '<div class="tt-title">' + list[i][0] + '</div><div class="tt-row"><span>National total</span><b style="margin-left:8px;">' + fmt(list[i][1]) + '</b></div>';
      tip.style.left = e.clientX - wrap.left + 12 + 'px';
      tip.style.top = e.clientY - wrap.top - 10 + 'px';
      tip.style.opacity = 1;
    });
    row.addEventListener('mouseleave', () => (tip.style.opacity = 0));
  });

  const insight = document.getElementById('catInsight');
  if (insight) {
    const withoutOther = list.filter((c) => c[0] !== 'Other categories');
    const top5 = withoutOther.slice(0, 5);
    const total = list.reduce((a, c) => a + c[1], 0);
    const top5Share = ((top5.reduce((a, c) => a + c[1], 0) / total) * 100).toFixed(0);
    insight.innerHTML =
      'Just <b>5</b> crime types - led by <b>' + top5[0][0].toLowerCase() + '</b> - make up <b>' + top5Share + '%</b> of everything recorded nationally.';
  }
}

function renderGenderGap() {
  const svg = document.getElementById('genderGapSvg');
  const { labels, male, female } = GENDER.gap;
  const W = renderWidth(svg, 620), H = 400, M = { t: 8, r: 60, b: 8, l: W < MOBILE ? 140 : 170 };
  const labelFontPx = W < MOBILE ? 10 : 11.5;
  const rowH = (H - M.t - M.b) / labels.length;
  const max = Math.max(...male, ...female);
  const bw = (v) => (v / max) * (W - M.l - M.r);
  let html = '';
  labels.forEach((lab, i) => {
    const yy = i * rowH;
    const barH = rowH * 0.32;
    const wm = bw(male[i]), wf = bw(female[i]);
    html +=
      '<g transform="translate(0,' + yy + ')">' +
      '<text class="bar-label" style="font-size:' + labelFontPx + 'px" x="' + (M.l - 8) + '" y="' + (rowH / 2 + 4) + '" text-anchor="end">' + lab + '</text>' +
      '<rect x="' + M.l + '" y="' + rowH * 0.1 + '" width="' + wm.toFixed(1) + '" height="' + barH.toFixed(1) + '" rx="3" fill="var(--series-1)"></rect>' +
      '<text class="bar-value" x="' + (M.l + wm + 6) + '" y="' + (rowH * 0.1 + barH * 0.75) + '">' + fmt(male[i]) + 'k</text>' +
      '<rect x="' + M.l + '" y="' + (rowH * 0.1 + barH + 4) + '" width="' + wf.toFixed(1) + '" height="' + barH.toFixed(1) + '" rx="3" fill="var(--series-2)"></rect>' +
      '<text class="bar-value" x="' + (M.l + wf + 6) + '" y="' + (rowH * 0.1 + barH + 4 + barH * 0.75) + '">' + fmt(female[i]) + 'k</text>' +
      '</g>';
  });
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.innerHTML = html;

  const tip = document.getElementById('genderGapTip');
  svg.querySelectorAll('g').forEach((row, i) => {
    row.addEventListener('mousemove', (e) => {
      const wrap = svg.parentElement.getBoundingClientRect();
      tip.innerHTML =
        '<div class="tt-title">' + labels[i] + '</div>' +
        '<div class="tt-row"><span>Male</span><b style="margin-left:8px;">' + fmt(male[i]) + 'k</b></div>' +
        '<div class="tt-row"><span>Female</span><b style="margin-left:8px;">' + fmt(female[i]) + 'k</b></div>';
      tip.style.left = e.clientX - wrap.left + 12 + 'px';
      tip.style.top = e.clientY - wrap.top - 10 + 'px';
      tip.style.opacity = 1;
    });
    row.addEventListener('mouseleave', () => (tip.style.opacity = 0));
  });
}

function renderDualLine(svgId, tipId, years, maleArr, femaleArr, unit, opts = {}) {
  const svg = document.getElementById(svgId);
  const W = renderWidth(svg, 520), H = opts.h || 260, M = { t: opts.title ? 26 : 16, r: 16, b: 28, l: 44 };
  const all = maleArr.concat(femaleArr).filter((v) => v !== null && v !== undefined);
  let max = opts.max !== undefined ? opts.max : Math.max(...all);
  let min = opts.min !== undefined ? opts.min : Math.min(0, Math.min(...all));
  if (opts.max === undefined) {
    const pad = (max - min) * 0.15;
    max += pad;
  }
  const x = (i) => M.l + (i * (W - M.l - M.r)) / (years.length - 1);
  const y = (v) => H - M.b - ((v - min) / (max - min)) * (H - M.t - M.b);

  const ticks = 4;
  let gridHtml = '';
  for (let i = 0; i <= ticks; i++) {
    const v = min + ((max - min) * i) / ticks;
    const yy = y(v);
    gridHtml += '<line class="gridline" x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + yy + '" y2="' + yy + '"></line>';
    gridHtml += '<text class="axis-label" x="' + (M.l - 8) + '" y="' + (yy + 3) + '" text-anchor="end">' + Math.round(v) + unit + '</text>';
  }
  let xlabels = '';
  const maxLabels = W < MOBILE ? 4 : years.length;
  const step = Math.max(1, Math.ceil((years.length - 1) / (maxLabels - 1)));
  const idxs = [];
  for (let i = 0; i < years.length; i += step) idxs.push(i);
  const lastIdx = years.length - 1;
  if (idxs[idxs.length - 1] !== lastIdx) {
    if (idxs.length > 1 && lastIdx - idxs[idxs.length - 1] < step / 2) idxs.pop();
    idxs.push(lastIdx);
  }
  const shown = new Set(idxs);
  years.forEach((yr, i) => {
    if (!shown.has(i)) return;
    xlabels += '<text class="axis-label" x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle">' + yr + '</text>';
  });

  function pathFor(arr) {
    let d = '', started = false;
    arr.forEach((v, i) => {
      if (v === null || v === undefined) return;
      d += (started ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1) + ' ';
      started = true;
    });
    return d.trim();
  }
  function dotsFor(arr, color) {
    return arr
      .map((v, i) => {
        if (v === null || v === undefined) return '';
        return '<circle data-i="' + i + '" cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="3" fill="' + color + '"></circle>';
      })
      .join('');
  }

  const titleHtml = opts.title ? '<text class="axis-title" x="' + M.l + '" y="12">' + opts.title + '</text>' : '';

  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.innerHTML =
    gridHtml + titleHtml +
    '<line class="baseline" x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + (H - M.b) + '" y2="' + (H - M.b) + '"></line>' +
    '<path d="' + pathFor(maleArr) + '" fill="none" stroke="var(--series-1)" stroke-width="2"></path>' +
    '<path d="' + pathFor(femaleArr) + '" fill="none" stroke="var(--series-2)" stroke-width="2"></path>' +
    dotsFor(maleArr, 'var(--series-1)') + dotsFor(femaleArr, 'var(--series-2)') + xlabels +
    '<line class="crosshair" id="' + svgId + 'Cross" x1="0" x2="0" y1="' + M.t + '" y2="' + (H - M.b) + '"></line>' +
    '<rect id="' + svgId + 'Hit" x="' + M.l + '" y="' + M.t + '" width="' + (W - M.l - M.r) + '" height="' + (H - M.t - M.b) + '" fill="transparent"></rect>';

  const tip = document.getElementById(tipId);
  const hit = document.getElementById(svgId + 'Hit');
  const cross = document.getElementById(svgId + 'Cross');
  hit.addEventListener('mousemove', (e) => {
    const rect = svg.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    let i = Math.round((mx - M.l) / ((W - M.l - M.r) / (years.length - 1)));
    i = Math.max(0, Math.min(years.length - 1, i));
    const xi = x(i);
    cross.setAttribute('x1', xi);
    cross.setAttribute('x2', xi);
    cross.style.opacity = 1;
    const wrap = svg.parentElement.getBoundingClientRect();
    const scale = wrap.width / W;
    tip.style.left = xi * scale + 12 + 'px';
    tip.style.top = Math.min(y(maleArr[i] || 0), y(femaleArr[i] || 0)) * scale + 'px';
    const mv = maleArr[i], fv = femaleArr[i];
    tip.innerHTML =
      '<div class="tt-title">' + years[i] + '</div>' +
      '<div class="tt-row"><span>Male</span><b style="margin-left:8px;">' + (mv == null ? 'not collected' : Math.round(mv) + unit) + '</b></div>' +
      '<div class="tt-row"><span>Female</span><b style="margin-left:8px;">' + (fv == null ? 'not collected' : Math.round(fv) + unit) + '</b></div>';
    tip.style.opacity = 1;
  });
  hit.addEventListener('mouseleave', () => {
    tip.style.opacity = 0;
    cross.style.opacity = 0;
  });
}

function drawGenderTrend() {
  const select = document.getElementById('genderCrimeSelect');
  const d = GENDER.crimes[select.value];
  renderDualLine('genderTrendSvg', 'genderTrendTip', GENDER.years, d.male, d.female, 'k', { title: 'Estimated victims (thousands)' });
}

function renderGenderTrend() {
  const select = document.getElementById('genderCrimeSelect');
  Object.keys(GENDER.crimes).forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
  select.value = 'Housebreaking (household)';
  select.addEventListener('change', drawGenderTrend);
  drawGenderTrend();
}

function renderSafety() {
  renderDualLine('safetySvg', 'safetyTip', GENDER.safety.years, GENDER.safety.male, GENDER.safety.female, '%', { h: 220, min: 30, max: 50, title: 'Share who feel "very unsafe" walking alone after dark' });
}

function buildProvFilter(d) {
  const sel = document.getElementById('provFilter');
  d.province_summary.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.province;
    opt.textContent = p.province;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    state.provFilterVal = sel.value;
    selectProvince(sel.value || null);
  });
  document.getElementById('stationSearch').addEventListener('input', (e) => {
    state.search = e.target.value.toLowerCase();
    renderTable(state.data);
  });
  document.querySelectorAll('th[data-k]').forEach((th) => {
    th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (k === 'rank') return;
      if (state.sortKey === k) state.sortDir *= -1;
      else {
        state.sortKey = k;
        state.sortDir = k === 'station' || k === 'province' || k === 'district' ? 1 : -1;
      }
      renderTable(state.data);
    });
  });
}

function renderTable(d) {
  let rows = d.top_stations.slice();
  if (state.selectedProvince) rows = rows.filter((r) => r.province === state.selectedProvince);
  if (state.search) {
    rows = rows.filter(
      (r) => r.station.toLowerCase().indexOf(state.search) >= 0 || r.district.toLowerCase().indexOf(state.search) >= 0 || r.province.toLowerCase().indexOf(state.search) >= 0
    );
  }
  rows.sort((a, b) => {
    const k = state.sortKey;
    if (typeof a[k] === 'string') return a[k].localeCompare(b[k]) * state.sortDir;
    return (a[k] - b[k]) * state.sortDir;
  });
  document.getElementById('tableCount').textContent = rows.length + ' station' + (rows.length === 1 ? '' : 's');
  const tbody = document.getElementById('stationBody');
  tbody.innerHTML = rows
    .map((r, i) => {
      const color = r.pct_change > 0 ? 'var(--bad)' : 'var(--good)';
      return (
        '<tr><td class="rank num">' + (i + 1) + '</td><td>' + r.station + '</td><td><span class="pill">' + r.province + '</span></td><td>' + r.district + '</td>' +
        '<td class="num">' + fmt(r.total_2024_25) + '</td><td class="num">' + fmt(r.total_2023_24) + '</td>' +
        '<td class="num" style="color:' + color + '">' + fmtPct(r.pct_change) + '</td></tr>'
      );
    })
    .join('');
}

init(state.data);

// charts size their viewBox to the measured container width, so they need to
// be redrawn if that width changes (phone rotation, browser resize, etc.)
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    buildMap(state.data);
    renderTrend(state.data);
    renderProvBars(state.data);
    renderGroups(state.data);
    renderCategories(state.data);
    renderGenderGap();
    drawGenderTrend();
    renderSafety();
  }, 200);
});

// back-to-top button
const backToTop = document.getElementById('backToTop');
if (backToTop) {
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 600);
  });
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// scroll-spy: highlight whichever section's anchor is currently in view,
// across both the side nav and the top jump-nav
(function initScrollSpy() {
  const navLinks = document.querySelectorAll('.side-nav a, nav.jump a');
  if (!navLinks.length) return;
  const hrefs = new Set([...navLinks].map((a) => a.getAttribute('href')));
  const sections = [...hrefs].map((h) => document.querySelector(h)).filter(Boolean);
  if (!sections.length) return;
  const setActive = (id) => {
    navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  };
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
    { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
  );
  sections.forEach((s) => observer.observe(s));
})();
