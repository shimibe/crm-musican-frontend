import React, { useState, useEffect, useRef } from 'react';
import { Play, FlaskConical, Pencil, Plus, X, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import { Section, Badge, Field, input, btnPrimary, btnGhost, MODE_LABEL, MODE_HINT, RUN_STATUS, fmtDate, fmtUsd, errMsg } from './ui';
import { RunDetail } from './LogTab';

const CRON_PRESETS = [
  ['*/30 8-20 * * 0-4', 'כל חצי שעה, א׳–ה׳ 08:00–20:00'],
  ['0 9,13,17 * * 0-5', '3 פעמים ביום (9, 13, 17), א׳–ו׳'],
  ['0 19 * * 0-4', 'פעם ביום ב-19:00, א׳–ה׳'],
  ['0 9 * * 0', 'פעם בשבוע, יום א׳ 09:00'],
];

const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} max-h-[90vh] flex flex-col`}>
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-5 overflow-y-auto">{children}</div>
    </div>
  </div>
);

const TaskEditor = ({ task, meta, onClose, onSaved }) => {
  const [f, setF] = useState({
    name: task.name, description: task.description || '', enabled: task.enabled, cron: task.cron || '',
    model: task.model, escalation_model: task.escalation_model || '', autonomy: task.autonomy,
    allowed_tools: task.allowed_tools || [], max_actions_per_run: task.max_actions_per_run, max_items_per_run: task.max_items_per_run,
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e });
  const toggleTool = (name) =>
    setF({ ...f, allowed_tools: f.allowed_tools.includes(name) ? f.allowed_tools.filter((x) => x !== name) : [...f.allowed_tools, name] });

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/agent/tasks/${task.key}`, {
        ...f,
        max_actions_per_run: Number(f.max_actions_per_run),
        max_items_per_run: Number(f.max_items_per_run),
      });
      onSaved();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`עריכת משימה — ${task.name}`} onClose={onClose} wide>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="שם"><input className={input} value={f.name} onChange={set('name')} /></Field>
        <Field label="פעילה">
          <label className="flex items-center gap-2 h-[38px] text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={f.enabled} onChange={set('enabled')} /> רצה לפי התזמון
          </label>
        </Field>
        <div className="md:col-span-2">
          <Field label="תיאור"><textarea rows={2} className={input} value={f.description} onChange={set('description')} /></Field>
        </div>
        <Field label="תזמון (cron, שעון ישראל)" hint="ריק = רק ידני / אירוע">
          <input className={`${input} font-mono`} dir="ltr" value={f.cron} onChange={set('cron')} placeholder="0 9,13,17 * * 0-4" />
          <div className="flex flex-wrap gap-1 mt-1.5">
            {CRON_PRESETS.map(([v, l]) => (
              <button key={v} type="button" onClick={() => setF({ ...f, cron: v })} className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200">{l}</button>
            ))}
          </div>
        </Field>
        <Field label="רמת אוטונומיה" hint={MODE_HINT[f.autonomy] + ' · מוגבל לתקרה הכללית'}>
          <select className={input} value={f.autonomy} onChange={set('autonomy')}>
            {['shadow', 'approve', 'auto'].map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
          </select>
        </Field>
        <Field label="מודל">
          <select className={input} value={f.model} onChange={set('model')} dir="ltr">
            {meta.models.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="מודל למקרים גבוליים" hint="ביטחון נמוך → בדיקה חוזרת במודל חזק יותר">
          <select className={input} value={f.escalation_model} onChange={set('escalation_model')} dir="ltr">
            <option value="">— ללא —</option>
            {meta.models.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="מקסימום פריטים לריצה"><input type="number" min={1} className={input} value={f.max_items_per_run} onChange={set('max_items_per_run')} /></Field>
        <Field label="מקסימום פעולות כתיבה לריצה" hint="בלם בטיחות — חריגה עוצרת את הריצה"><input type="number" min={1} className={input} value={f.max_actions_per_run} onChange={set('max_actions_per_run')} /></Field>
        <div className="md:col-span-2">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">כלים מותרים</span>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {meta.tools.map((t) => (
              <label key={t.name} className={`flex items-center gap-2 text-sm p-2 rounded border border-gray-200 dark:border-gray-700 ${t.planned ? 'opacity-50' : ''}`}>
                <input type="checkbox" disabled={t.planned} checked={f.allowed_tools.includes(t.name)} onChange={() => toggleTool(t.name)} />
                <span className="text-gray-800 dark:text-gray-200">{t.label}</span>
                {t.kind === 'write' && !t.internal && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">כתיבה</Badge>}
                {t.irreversible && <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">בלתי הפיך</Badge>}
                {t.planned && <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">בפיתוח</Badge>}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button className={btnGhost} onClick={onClose}>ביטול</button>
        <button className={btnPrimary} disabled={busy} onClick={save}>שמור</button>
      </div>
    </Modal>
  );
};

/** Queue a run (or dry run) and poll until the agent finishes it. */
const RunDialog = ({ task, dry, onClose }) => {
  const [releaseId, setReleaseId] = useState('');
  const [promptId, setPromptId] = useState('');
  const [prompts, setPrompts] = useState([]);
  const [req, setReq] = useState(null);
  const timer = useRef();

  useEffect(() => {
    if (dry) api.get('/agent/prompts', { params: { task_key: task.key } }).then((r) => setPrompts(r.data));
    return () => clearTimeout(timer.current);
  }, [dry, task.key]);

  const poll = async (id) => {
    const { data } = await api.get(`/agent/run-requests/${id}`);
    setReq(data);
    if (['queued', 'running'].includes(data.status)) timer.current = setTimeout(() => poll(id), 2000);
  };

  const start = async () => {
    const params = {};
    if (releaseId.trim()) params.release_id = releaseId.trim();
    if (promptId) params.prompt_id = Number(promptId);
    try {
      const { data } = await api.post(`/agent/tasks/${task.key}/run`, { dry_run: dry, params });
      setReq(data);
      poll(data.id);
    } catch (e) {
      alert(errMsg(e));
    }
  };

  const waiting = req && ['queued', 'running'].includes(req.status);
  return (
    <Modal title={`${dry ? 'בדיקה יבשה' : 'הרצה עכשיו'} — ${task.name}`} onClose={onClose} wide>
      {!req ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {dry
              ? 'יואב יבצע את כל השיקול אבל שום דבר לא ייצא מהמערכת — גם לא אליך. מעולה לבדיקת הוראות חדשות לפני שמפעילים אותן.'
              : `ריצה רגילה לפי מצב "${MODE_LABEL[task.autonomy]}" (מוגבל לתקרה הכללית).`}
          </p>
          {task.key === 'release_review' && (
            <Field label="מזהה ריליס (אופציונלי)" hint="ריק = כל הממתינים">
              <input className={input} dir="ltr" value={releaseId} onChange={(e) => setReleaseId(e.target.value)} placeholder="DEMO-1002" />
            </Field>
          )}
          {dry && prompts.length > 0 && (
            <Field label="גרסת הוראות לבדיקה" hint="אפשר לבדוק טיוטה שעוד לא הופעלה">
              <select className={input} value={promptId} onChange={(e) => setPromptId(e.target.value)}>
                <option value="">הגרסה הפעילה</option>
                {prompts.map((p) => (
                  <option key={p.id} value={p.id}>v{p.version}{p.is_active ? ' (פעילה)' : ''} — {p.change_note || fmtDate(p.created_at)}</option>
                ))}
              </select>
            </Field>
          )}
          <div className="flex justify-end">
            <button className={btnPrimary} onClick={start}>{dry ? <FlaskConical className="w-4 h-4" /> : <Play className="w-4 h-4" />} הפעל</button>
          </div>
        </div>
      ) : waiting ? (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 py-6 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> {req.status === 'queued' ? 'ממתין שיואב יאסוף את הבקשה…' : 'יואב עובד…'}
        </div>
      ) : (
        <div className="space-y-3">
          {req.error && <p className="text-sm text-red-600 dark:text-red-400">{req.error}</p>}
          <RunDetail run={req.run} />
        </div>
      )}
    </Modal>
  );
};

const NewTask = ({ onClose, onSaved }) => {
  const [f, setF] = useState({ key: '', name: '', description: '' });
  const save = async () => {
    try {
      await api.post('/agent/tasks', f);
      onSaved();
    } catch (e) {
      alert(errMsg(e));
    }
  };
  return (
    <Modal title="משימה חדשה" onClose={onClose}>
      <div className="space-y-4">
        <Field label="מזהה (אנגלית)" hint="a-z, 0-9, _ — למשל weekly_report">
          <input className={`${input} font-mono`} dir="ltr" value={f.key} onChange={(e) => setF({ ...f, key: e.target.value.toLowerCase() })} />
        </Field>
        <Field label="שם"><input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="תיאור"><textarea className={input} rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          משימה חדשה נוצרת כבויה ובמצב צל. היא תוכל לרוץ אחרי שייכתב לה קוד בסוכן (משימה שמשתמשת בכלים קיימים — פיתוח קצר).
        </p>
        <div className="flex justify-end gap-2">
          <button className={btnGhost} onClick={onClose}>ביטול</button>
          <button className={btnPrimary} onClick={save}>צור</button>
        </div>
      </div>
    </Modal>
  );
};

const TasksTab = ({ tasks, meta, reload }) => {
  const [editing, setEditing] = useState(null);
  const [running, setRunning] = useState(null);
  const [creating, setCreating] = useState(false);

  const quickToggle = async (t) => {
    try {
      await api.put(`/agent/tasks/${t.key}`, { enabled: !t.enabled });
      reload();
    } catch (e) {
      alert(errMsg(e));
    }
  };

  return (
    <Section title="משימות" actions={<button className={btnGhost} onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> משימה חדשה</button>}>
      <div className="space-y-3">
        {tasks.map((t) => {
          const lr = t.last_run;
          const [lbl, cls] = lr ? RUN_STATUS[lr.status] || [lr.status, ''] : [];
          return (
            <div key={t.key} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white">{t.name}</span>
                    <Badge className={t.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}>
                      {t.enabled ? 'פעילה' : 'כבויה'}
                    </Badge>
                    <Badge className="bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">{MODE_LABEL[t.autonomy]}</Badge>
                    {t.prompt_version && <span className="text-xs text-gray-500 dark:text-gray-400">הוראות v{t.prompt_version}</span>}
                  </div>
                  {t.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t.description}</p>}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    <bdi dir="ltr" className="font-mono">{t.cron || 'manual'}</bdi>
                    <bdi dir="ltr">{t.model}</bdi>
                    {lr && (
                      <span className="flex items-center gap-1">
                        ריצה אחרונה {fmtDate(lr.started_at)} <Badge className={cls}>{lbl}</Badge> {fmtUsd(lr.cost_usd)}
                      </span>
                    )}
                  </div>
                  {lr?.error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{lr.error}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className={btnGhost} onClick={() => quickToggle(t)}>{t.enabled ? 'כבה' : 'הפעל'}</button>
                  <button className={btnGhost} onClick={() => setRunning({ task: t, dry: true })} title="בדיקה יבשה"><FlaskConical className="w-4 h-4" /></button>
                  <button className={btnGhost} onClick={() => setRunning({ task: t, dry: false })} title="הרץ עכשיו"><Play className="w-4 h-4" /></button>
                  <button className={btnGhost} onClick={() => setEditing(t)} title="עריכה"><Pencil className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {editing && <TaskEditor task={editing} meta={meta} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {running && <RunDialog task={running.task} dry={running.dry} onClose={() => { setRunning(null); reload(); }} />}
      {creating && <NewTask onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); }} />}
    </Section>
  );
};

export default TasksTab;
export { Modal };
