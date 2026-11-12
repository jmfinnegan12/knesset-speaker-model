// The Model page for this event. The maths is in model.js; the shared look and controls come from eventneutral.com/kit/v1.
fetch('inputs.json', { cache: 'no-cache' }).then((r) => r.json()).then((cfg) => {
  const M = window.SpeakerModel.fromConfig(cfg);
  const pct1 = (v) => `${+(v * 100).toFixed(1)}%`;

  const GROUPS = [
    { key: 'vote', name: 'The Nov 17 vote' },
    { key: 'later', name: 'If not by Nov 17' },
  ];
  const INPUTS = [
    { key: 'A', group: 'vote', label: 'A. Chance the vote is held by 23:59 ET Nov 17', step: 1 },
    { key: 'B', group: 'vote', label: 'B. Chance someone is elected, if the vote is held', step: 1 },
    { key: 'C', group: 'later', label: 'C. Chance a Speaker is elected by 23:59 ET Nov 30, if not by Nov 17', step: 1 },
    { key: 'D', group: 'later', label: 'D. Chance a Speaker is elected by 23:59 ET Dec 31, if not by Nov 30', step: 1 },
    { key: 'P0', group: 'later', label: 'Chance a Speaker is elected by 23:59 ET Nov 12', step: 0.1, sliderMax: 10,
      note: 'No sitting is scheduled before then.' },
  ];

  const clone = (o) => JSON.parse(JSON.stringify(o));
  let params = clone(M.DEFAULTS);

  // ---------- inputs ----------
  const fields = {};
  const root = document.getElementById('inputs');
  const el = (tag, cls, parent, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; if (parent) parent.appendChild(n); return n; };
  GROUPS.forEach((g) => {
    const sec = el('section', 'group', root);
    el('h3', '', sec, g.name);
    INPUTS.filter((i) => i.group === g.key).forEach((inp) => {
      const row = el('div', 'field', sec);
      el('div', 'name', row, inp.label);
      const f = EN.sliderField({
        value: params[inp.key] * 100, min: 0, max: 100, step: inp.step, unit: '%', sliderMax: inp.sliderMax,
        label: inp.label, onChange: (v) => { params[inp.key] = v / 100; changed(); },
      });
      row.appendChild(f.range);
      row.appendChild(f.box.el);
      if (inp.note) el('p', 'note', row, inp.note);
      fields[inp.key] = f;
    });
  });

  const resetBtn = document.getElementById('reset');
  resetBtn.textContent = `Reset to ${M.AS_OF} values`;
  resetBtn.addEventListener('click', () => { params = clone(M.DEFAULTS); changed(); });

  // ---------- the Nov 17 vote, drawn as a tree ----------
  const tree = EN.chart.frame(document.getElementById('tree'), (w) => (w < 520 ? 250 : 200), ({ svg, width }) => {
    svg.selectAll('*').remove();
    const narrow = width < 520;
    const A = params.A, B = params.B;
    const leaves = [
      { t: 'Held, someone elected', v: A * B, yes: true },
      { t: 'Held, no one elected', v: A * (1 - B) },
      { t: 'Not held by Nov 17', v: 1 - A },
    ];
    const x0 = 0, xMid = narrow ? 0 : width * 0.28, barX = narrow ? 0 : width * 0.62, barW = width - barX - 60;
    if (!narrow) {
      svg.append('text').attr('class', 'branch').attr('x', x0).attr('y', 34).text('Vote held');
      svg.append('text').attr('class', 'val').attr('x', x0).attr('y', 56).text(pct1(A));
      svg.append('text').attr('class', 'branch').attr('x', x0).attr('y', 150).text('Not held');
      svg.append('text').attr('class', 'val').attr('x', x0).attr('y', 172).text(pct1(1 - A));
    }
    const rowY = narrow ? [30, 110, 190] : [34, 92, 160];
    leaves.forEach((l, i) => {
      const y = rowY[i];
      const lx = narrow ? 0 : (i < 2 ? xMid : xMid);
      svg.append('text').attr('class', 'leaf').attr('x', lx).attr('y', y).text(l.t);
      const by = narrow ? y + 12 : y - 14;
      const bx = narrow ? 0 : barX;
      const bw = narrow ? width - 70 : barW;
      svg.append('rect').attr('x', bx).attr('y', by).attr('width', bw).attr('height', 18).attr('fill', 'var(--line)');
      svg.append('rect').attr('x', bx).attr('y', by).attr('width', Math.max(0, bw * l.v)).attr('height', 18)
        .attr('fill', l.yes ? 'var(--accent)' : 'var(--ink-faint)');
      svg.append('text').attr('class', 'leaf-val').attr('x', bx + bw + 8).attr('y', by + 14).text(pct1(l.v));
    });
  });

  // ---------- the forecast, day by day ----------
  // Contract markers sit on the last day each contract covers (it closes 23:59 ET the day before its date).
  const MARKS = [
    { d: '2026-11-12', k: 'Nov 13' }, { d: '2026-11-17', k: 'Nov 18' },
    { d: '2026-11-30', k: 'Dec 1' }, { d: '2026-12-31', k: 'Jan 1' },
  ];
  const fmtDay = d3.utcFormat('%a %b %-d');
  let sel = new Date('2026-11-17T00:00:00Z');
  const box = document.getElementById('ladder');
  const chart = EN.chart.frame(box, (w) => Math.max(240, Math.min(340, w * 0.5)), ({ svg, width, height }) => {
    svg.selectAll('*').remove();
    const rows = M.curve(params);
    const base = M.curve(M.DEFAULTS);
    const moved = INPUTS.some((inp) => Math.abs(params[inp.key] - M.DEFAULTS[inp.key]) > 1e-12);
    const m = { t: 18, r: 54, b: 30, l: 44 };
    const t0 = rows[0].t, t1 = new Date(rows[rows.length - 1].t.getTime() + 86400000);
    const x = d3.scaleUtc([t0, t1], [m.l, width - m.r]);
    const y = d3.scaleLinear([0, 1], [height - m.b, m.t]);
    svg.append('g').attr('transform', `translate(0,${height - m.b})`)
      .call(d3.axisBottom(x).ticks(width < 520 ? 4 : 7).tickFormat(d3.utcFormat('%b %-d')).tickSizeOuter(0));
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5, '%'));
    // each day's value holds from that day to the next
    const pts = (rs) => rs.flatMap((r) => [[x(r.t), y(r.v)], [x(new Date(r.t.getTime() + 86400000)), y(r.v)]]);
    const line = d3.line();
    if (moved) svg.append('path').attr('d', line(pts(base))).attr('fill', 'none')
      .attr('stroke', 'var(--ink-soft)').attr('stroke-width', 1.5).attr('stroke-dasharray', '4 3');
    svg.append('path').attr('d', line(pts(rows))).attr('fill', 'none').attr('stroke', 'var(--accent)').attr('stroke-width', 2.5);
    const at = (s) => rows.find((r) => r.t.toISOString().slice(0, 10) === s);
    const mk = svg.append('g').selectAll('g').data(MARKS).join('g')
      .attr('transform', (d) => { const r = at(d.d); return `translate(${x(new Date(r.t.getTime() + 86400000))},${y(r.v)})`; });
    mk.append('circle').attr('r', 4.5).attr('fill', 'var(--bg)').attr('stroke', 'var(--ink)').attr('stroke-width', 1.5);
    // the selected day
    const r = rows.find((q) => q.t.getTime() === sel.getTime()) || rows[0];
    const cx = x(new Date(r.t.getTime() + 43200000));
    const cur = svg.append('g').attr('class', 'cursor');
    cur.append('line').attr('x1', cx).attr('x2', cx).attr('y1', m.t).attr('y2', height - m.b).attr('stroke', 'var(--ink-faint)');
    cur.append('circle').attr('cx', cx).attr('cy', y(r.v)).attr('r', 5).attr('fill', 'var(--accent)');
    cur.append('text').attr('x', Math.min(cx + 8, width - 50)).attr('y', y(r.v) + 18).attr('fill', 'var(--ink)')
      .attr('font-size', 13.5).attr('font-weight', 600).text(pct1(r.v));
    // drag or click across the chart to pick a day; arrow keys move a day
    const pick = (px) => {
      const t = x.invert(Math.max(m.l, Math.min(width - m.r - 1, px)));
      sel = d3.utcDay.floor(t); changed();
    };
    svg.append('rect').attr('class', 'plot-hit').attr('x', m.l).attr('y', m.t).attr('width', width - m.l - m.r).attr('height', height - m.t - m.b)
      .attr('fill', 'transparent').attr('tabindex', 0).attr('aria-label', 'Pick a day')
      .on('pointerdown pointermove', (e) => { if (e.type === 'pointerdown' || e.buttons || e.pointerType === 'mouse') pick(d3.pointer(e)[0]); })
      .on('keydown', (e) => {
        const k = { ArrowLeft: -1, ArrowRight: 1 }[e.key]; if (!k) return; e.preventDefault();
        const n = new Date(sel.getTime() + k * 86400000);
        if (n >= rows[0].t && n <= rows[rows.length - 1].t) { sel = n; changed(); }
      });
  });

  function changed() {
    INPUTS.forEach((inp) => fields[inp.key].set(params[inp.key] * 100));
    resetBtn.disabled = INPUTS.every((inp) => Math.abs(params[inp.key] - M.DEFAULTS[inp.key]) < 1e-12);
    tree.redraw();
    chart.redraw();
    const rows = M.curve(params);
    const r = rows.find((q) => q.t.getTime() === sel.getTime()) || rows[0];
    const v = M.ladder(params);
    document.getElementById('say').innerHTML =
      `Chance a Speaker is elected by the end of ${fmtDay(r.t)} (ET): <b>${pct1(r.v)}</b>.`;
    document.getElementById('contracts').innerHTML = M.CONTRACTS
      .map((k, i) => `Before ${k}: <b>${pct1(v[i])}</b>`).join(' · ');
    document.getElementById('legend').hidden = resetBtn.disabled;
  }
  changed();
});
