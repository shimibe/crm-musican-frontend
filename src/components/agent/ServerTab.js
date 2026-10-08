import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../../utils/api';
import { Section, Empty, Badge, fmtDate } from './ui';

const RANGES = [[24, '24 שעות'], [72, '3 ימים'], [168, 'שבוע'], [720, '30 יום']];

/** Single-series line chart with a hover crosshair + tooltip. Threshold drawn as a dashed line. */
const LineChart = ({ points, yMax, threshold, format, height = 140 }) => {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(Math.max(200, el.clientWidth));
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (points.length < 2) return <div ref={ref} className="w-full"><Empty>אין מספיק דגימות עדיין</Empty></div>;
  const pad = { l: 36, r: 8, t: 8, b: 20 };
  const iw = w - pad.l - pad.r, ih = height - pad.t - pad.b;
  const t0 = points[0].t, t1 = points[points.length - 1].t;
  const x = (t) => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * iw;
  const y = (v) => pad.t + ih - (Math.min(v, yMax) / yMax) * ih;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const ticks = [0, yMax / 2, yMax];

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = points[0];
    for (const p of points) if (Math.abs(x(p.t) - px) < Math.abs(x(best.t) - px)) best = p;
    setHover(best);
  };

  return (
    <div ref={ref} className="relative w-full min-w-0" dir="ltr">
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} className="block">
        {ticks.map((tv) => (
          <g key={tv}>
            <line x1={pad.l} x2={w - pad.r} y1={y(tv)} y2={y(tv)} className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="1" />
            <text x={pad.l - 6} y={y(tv) + 4} textAnchor="end" className="fill-gray-400 text-[10px]">{format(tv)}</text>
          </g>
        ))}
        {threshold != null && threshold < yMax && (
          <line x1={pad.l} x2={w - pad.r} y1={y(threshold)} y2={y(threshold)} className="stroke-amber-500" strokeWidth="1" strokeDasharray="4 4" />
        )}
        <path d={d} fill="none" className="stroke-primary-500" strokeWidth="2" strokeLinejoin="round" />
        {points.filter((p) => p.alert).map((p) => (
          <circle key={p.t} cx={x(p.t)} cy={y(p.v)} r="4" className="fill-red-500 stroke-white dark:stroke-gray-800" strokeWidth="2" />
        ))}
        <text x={pad.l} y={height - 4} className="fill-gray-400 text-[10px]">{fmtDate(t0)}</text>
        <text x={w - pad.r} y={height - 4} textAnchor="end" className="fill-gray-400 text-[10px]">{fmtDate(t1)}</text>
        {hover && (
          <>
            <line x1={x(hover.t)} x2={x(hover.t)} y1={pad.t} y2={pad.t + ih} className="stroke-gray-400" strokeWidth="1" />
            <circle cx={x(hover.t)} cy={y(hover.v)} r="4" className="fill-primary-500 stroke-white dark:stroke-gray-800" strokeWidth="2" />
          </>
        )}
      </svg>
      {hover && (
        <div
          className="absolute pointer-events-none px-2 py-1 rounded bg-gray-900 text-white text-xs shadow whitespace-nowrap"
          style={{ left: Math.min(x(hover.t) + 8, w - 140), top: 0 }}
        >
          {fmtDate(hover.t)} · <b>{format(hover.v)}</b>
        </div>
      )}
    </div>
  );
};

const Tile = ({ label, value, sub, warn }) => (
  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
      {warn ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : null}
      {label}
    </div>
    <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white tabular-nums" dir="ltr">{value}</div>
    {sub && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</div>}
  </div>
);

const ServerTab = () => {
  const [hours, setHours] = useState(24);
  const [data, setData] = useState(null);
  const [rules, setRules] = useState({});

  const load = useCallback(async () => {
    const [s, r] = await Promise.all([
      api.get('/agent/system', { params: { hours } }),
      api.get('/agent/rules', { params: { task_key: 'system_monitor' } }),
    ]);
    setData(s.data);
    setRules(Object.fromEntries(r.data.map((x) => [x.rule_key, Number(x.value)])));
  }, [hours]);
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  if (!data) return null;
  const m = data.latest;
  if (!m)
    return (
      <Section title="בריאות השרת">
        <Empty>אין עדיין דגימות. הניטור מתחיל לעבוד ברגע שיואב רץ על השרת (משימה "ניטור שרת", כל 5 דקות).</Empty>
      </Section>
    );

  const loadPerCpu = m.load5 / (m.cpus || 1);
  const memUsedPct = 100 - (100 * m.mem_available_mb) / (m.mem_total_mb || 1);
  const diskFreePct = m.disk_total_gb ? (100 * m.disk_free_gb) / m.disk_total_gb : null;
  const pts = (key, fn = (v) => v) =>
    data.series.map((s) => ({ t: new Date(s.t).getTime(), v: fn(s[key], s), alert: s.alert }));
  const loadPts = pts('load5', (v, s) => v / (s.cpus || 1));
  const memPts = pts('mem_used_pct');
  const loadMax = Math.max(2, rules.max_load_per_cpu ?? 1.5, ...loadPts.map((p) => p.v)) * 1.1;
  const stale = Date.now() - new Date(m.sampled_at).getTime() > 15 * 60000;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm flex items-center gap-1.5 ${stale ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {stale ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
          דגימה אחרונה: {fmtDate(m.sampled_at)}{stale ? ' — הניטור לא דוגם! לבדוק שיואב רץ' : ''}
        </p>
        <div className="flex gap-1 p-1 rounded-md bg-gray-100 dark:bg-gray-900">
          {RANGES.map(([h, l]) => (
            <button key={h} onClick={() => setHours(h)} className={`px-2.5 py-1 text-xs rounded ${hours === h ? 'bg-white dark:bg-gray-700 shadow font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Tile label="עומס CPU (5 דק׳)" value={`${m.load5.toFixed(2)} / ${m.cpus}`} sub={`${loadPerCpu.toFixed(2)} לליבה`} warn={loadPerCpu > (rules.max_load_per_cpu ?? 1.5)} />
        <Tile label="זיכרון בשימוש" value={`${memUsedPct.toFixed(0)}%`} sub={`${m.mem_available_mb}MB פנויים מתוך ${m.mem_total_mb}MB${m.swap_used_mb ? ` · swap ${m.swap_used_mb}MB` : ''}`} warn={100 - memUsedPct < (rules.min_mem_available_pct ?? 15)} />
        <Tile label="דיסק פנוי" value={m.disk_free_gb != null ? `${m.disk_free_gb}GB` : '—'} sub={diskFreePct != null ? `${diskFreePct.toFixed(0)}% מתוך ${m.disk_total_gb}GB` : null} warn={diskFreePct != null && diskFreePct < (rules.min_disk_free_pct ?? 15)} />
        <Tile label="Postgres" value={`${m.pg_connections ?? '—'} / ${m.pg_max_connections ?? '—'}`} sub={m.pg_db_size_mb != null ? `חיבורים · DB ${m.pg_db_size_mb}MB` : 'חיבורים'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="עומס CPU לליבה">
          <LineChart points={loadPts} yMax={loadMax} threshold={rules.max_load_per_cpu ?? 1.5} format={(v) => v.toFixed(1)} />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">קו מקווקו = סף ההתראה · נקודה אדומה = הייתה התראה</p>
        </Section>
        <Section title="זיכרון בשימוש (%)">
          <LineChart points={memPts} yMax={100} threshold={100 - (rules.min_mem_available_pct ?? 15)} format={(v) => `${Math.round(v)}%`} />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">שיא בכל {data.bucket_minutes} דקות</p>
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="תהליכים (pm2)">
          {(m.processes || []).length === 0 ? (
            <Empty>pm2 לא זמין לתהליך של יואב</Empty>
          ) : (
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400">
                  <th className="py-1 font-medium">שם</th><th className="py-1 font-medium">סטטוס</th>
                  <th className="py-1 font-medium">זיכרון</th><th className="py-1 font-medium">CPU</th><th className="py-1 font-medium">ריסטרטים</th>
                </tr>
              </thead>
              <tbody>
                {m.processes.map((p) => (
                  <tr key={p.name} className="border-t border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                    <td className="py-1.5 font-mono text-xs" dir="ltr">{p.name}</td>
                    <td className="py-1.5">
                      <Badge className={p.status === 'online' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}>{p.status}</Badge>
                    </td>
                    <td className="py-1.5 tabular-nums" dir="ltr">{p.mem_mb}MB</td>
                    <td className="py-1.5 tabular-nums" dir="ltr">{p.cpu ?? '—'}%</td>
                    <td className="py-1.5 tabular-nums">{p.restarts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
        <Section title="התראות אחרונות">
          {data.alerts.length === 0 ? (
            <Empty>אין התראות בטווח הזה</Empty>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.alerts.map((a) => (
                <li key={a.sampled_at} className="flex gap-3">
                  <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(a.sampled_at)}</span>
                  <span className="text-gray-800 dark:text-gray-200">{a.alerts.join(' · ')}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">ספי ההתראה נערכים בלשונית הוראות ← ניטור שרת. התראות נשלחות לטלגרם, עם הפסקה בין התראות זהות.</p>
    </div>
  );
};

export default ServerTab;
