import React, { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import api from '../../utils/api';
import { card, btnPrimary, btnGhost, Empty, RUN_STATUS, fmtDate, fmtUsd, errMsg } from './ui';

const AUTONOMY_LABEL = { shadow: 'צל', approve: 'באישור', auto: 'אוטומטי' };

const CRON_PRESETS = [
  ['כל יום',   '0 7 * * *'],
  ['2×שבוע',  '0 7 * * 1,4'],
  ['3×שבוע',  '0 7 * * 1,3,5'],
  ['5×שבוע',  '0 7 * * 1,2,3,4,5'],
];

function TaskRow({ task, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ enabled: task.enabled, autonomy: task.autonomy, cron: task.cron || '' });
  const [queued, setQueued] = useState(false);
  const [err, setErr] = useState(null);
  const timersRef = useRef([]);

  // Clean up timers on unmount
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const save = async () => {
    setErr(null);
    try {
      await api.put(`/marketing/tasks/${task.key}`, { enabled: form.enabled, autonomy: form.autonomy, cron: form.cron || null });
      setEditing(false);
      onChanged();
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  const runNow = async (dry) => {
    if (queued) return;
    setQueued(true); setErr(null);
    try {
      await api.post(`/marketing/tasks/${task.key}/run`, { dry_run: dry });
      // Reload at 5s (catches fast tasks) and 30s (catches LLM tasks)
      timersRef.current.push(setTimeout(() => onChanged(), 5000));
      timersRef.current.push(setTimeout(() => { onChanged(); setQueued(false); }, 30000));
    } catch (e) {
      setErr(errMsg(e));
      setQueued(false);
    }
  };

  const lr = task.last_run;
  const [rsLabel, rsColor] = RUN_STATUS[lr?.status] || ['—', 'text-gray-400'];

  return (
    <div className={`${card} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 dark:text-white text-sm">{task.name}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono">{task.key}</span>
            {task.enabled
              ? <span className="text-xs text-green-600 dark:text-green-400">● פעיל</span>
              : <span className="text-xs text-gray-400">● כבוי</span>}
            <span className="text-xs text-gray-500 dark:text-gray-400">{AUTONOMY_LABEL[task.autonomy]}</span>
            {task.cron && <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{task.cron}</span>}
          </div>
          {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>}
          {queued && (
            <p className="text-xs mt-1 text-blue-500 dark:text-blue-400">⏳ נשלח לתור — מתרענן עוד רגע...</p>
          )}
          {!queued && lr && (
            <p className="text-xs mt-1">
              <span className={rsColor}>{rsLabel}</span>
              <span className="text-gray-400 dark:text-gray-500 ml-2">{fmtDate(lr.started_at)}</span>
              {lr.cost_usd > 0 && <span className="text-gray-400 dark:text-gray-500 ml-2">{fmtUsd(lr.cost_usd)}</span>}
              {lr.summary && <span className="text-gray-500 dark:text-gray-400 ml-2 truncate">{lr.summary}</span>}
            </p>
          )}
          {err && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{err}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => runNow(true)} disabled={queued} className={btnGhost} title="dry run">🔍</button>
          <button onClick={() => runNow(false)} disabled={queued} className={btnGhost} title="הרץ עכשיו">
            <Play className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setEditing((v) => !v)} className={btnGhost}>⚙️</button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 col-span-2">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} />
            פעיל
          </label>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">מצב</label>
            <select value={form.autonomy} onChange={(e) => setForm((f) => ({ ...f, autonomy: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="shadow">צל</option>
              <option value="approve">באישור</option>
              <option value="auto">אוטומטי</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Cron (5 שדות)</label>
            <input type="text" value={form.cron} onChange={(e) => setForm((f) => ({ ...f, cron: e.target.value }))}
              placeholder="0 7 * * 1,3,5"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {CRON_PRESETS.map(([label, expr]) => (
                <button key={expr} type="button"
                  onClick={() => setForm((f) => ({ ...f, cron: expr }))}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                    form.cron === expr
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600'
                  }`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="col-span-2 flex gap-2">
            <button onClick={save} className={btnPrimary}>שמור</button>
            <button onClick={() => setEditing(false)} className={btnGhost}>ביטול</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksTab({ tasks, reload }) {
  if (!tasks?.length) return <Empty>אין משימות</Empty>;
  return (
    <div className="space-y-3">
      {tasks.map((t) => <TaskRow key={t.key} task={t} onChanged={reload} />)}
    </div>
  );
}
