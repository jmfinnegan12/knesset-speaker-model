// The forecast's maths. Read inputs from model/inputs.json; SpeakerModel.ladder(params) gives the contract values,
// SpeakerModel.curve(params) the chance for every day.
//
// Contract values (chance a Speaker is elected by 23:59 ET the day before each date):
//   Nov 13: P0
//   Nov 18: A x B                       (the Nov 17 vote is held and someone wins)
//   Dec 1:  Nov 18 + (1 - Nov 18) x C   (a late vote or a revote by Nov 30)
//   Jan 1:  Dec 1 + (1 - Dec 1) x D     (anything by Dec 31, including a government-formation sitting)
//
// Daily curve: a Speaker can only be elected at a plenum sitting, and the plenum sits Monday to Wednesday.
// So the curve is flat between sittings and steps up on sitting days. The Nov 17 vote takes A x B at once.
// The chance left over in each window (C for Nov 18-30, D for Dec 1-31) is split so each sitting day in it
// carries the same chance of a vote, given none yet.
(function () {
  const DAY = 86400000;
  const day = (s) => new Date(`${s}T00:00:00Z`);
  const iso = (d) => d.toISOString().slice(0, 10);

  function ladder(p) {
    const nov18 = Math.max(p.P0, p.A * p.B);
    const dec1 = nov18 + (1 - nov18) * p.C;
    const jan1 = dec1 + (1 - dec1) * p.D;
    return [p.P0, nov18, dec1, jan1];
  }

  const sitting = (d) => [1, 2, 3].includes(d.getUTCDay()); // Mon, Tue, Wed
  function sittingDays(from, to) {
    const out = [];
    for (let t = day(from).getTime(); t <= day(to).getTime(); t += DAY) if (sitting(new Date(t))) out.push(iso(new Date(t)));
    return out;
  }

  // One point per day: v = chance a Speaker has been elected by the end of that day (ET).
  function curve(p, start = '2026-11-12', end = '2026-12-31') {
    const [p0, nov18] = ladder(p);
    const steps = {};
    steps['2026-11-17'] = nov18 - p0;
    const win = (from, to, prob) => {
      const ds = sittingDays(from, to);
      const h = ds.length ? 1 - Math.pow(1 - prob, 1 / ds.length) : 0;
      return { ds, h };
    };
    const w1 = win('2026-11-18', '2026-11-30', p.C);
    const w2 = win('2026-12-01', '2026-12-31', p.D);
    const out = [];
    let v = p0;
    for (let t = day(start).getTime(); t <= day(end).getTime(); t += DAY) {
      const s = iso(new Date(t));
      if (steps[s] != null) v += steps[s];
      if (w1.ds.includes(s)) v += (1 - v) * w1.h;
      if (w2.ds.includes(s)) v += (1 - v) * w2.h;
      out.push({ t: new Date(t), v, step: steps[s] != null || w1.ds.includes(s) || w2.ds.includes(s) });
    }
    return out;
  }

  window.SpeakerModel = {
    ladder,
    curve,
    fromConfig(cfg) {
      const DEFAULTS = {};
      Object.entries(cfg.inputs).forEach(([k, v]) => { DEFAULTS[k] = v.value; });
      return { DEFAULTS, AS_OF: cfg.as_of, CONTRACTS: cfg.contracts, ladder, curve };
    },
  };
})();
