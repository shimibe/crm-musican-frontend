import React, { useEffect, useState, useCallback } from 'react';
import { History, Save, RotateCcw } from 'lucide-react';
import api from '../../utils/api';
import { Section, Empty, Field, Badge, input, btnPrimary, btnGhost, fmtDate, errMsg } from './ui';

// ── Prompt editor with versions ─────────────────────────────────────────────
const PromptEditor = ({ taskKey }) => {
  const [versions, setVersions] = useState([]);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [viewing, setViewing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/agent/prompts', { params: { task_key: taskKey || undefined } });
    setVersions(data);
    const active = data.find((p) => p.is_active);
    setText(active?.content || '');
    setViewing(null);
    setNote('');
  }, [taskKey]);
  useEffect(() => { load(); }, [load]);

  const active = versions.find((p) => p.is_active);
  const dirty = text !== (active?.content || '');

  const save = async (activate) => {
    setBusy(true);
    try {
      await api.post('/agent/prompts', { task_key: taskKey || null, content: text, change_note: note, activate });
      await load();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const activate = async (id) => {
    if (!window.confirm('להפעיל את הגרסה הזו? יואב ישתמש בה מהריצה הבאה.')) return;
    await api.post(`/agent/prompts/${id}/activate`);
    load();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-3">
        <textarea
          className={`${input} leading-relaxed`}
          rows={18}
          value={viewing ? viewing.content : text}
          readOnly={!!viewing}
          onChange={(e) => setText(e.target.value)}
        />
        {viewing ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">צופה בגרסה v{viewing.version} (קריאה בלבד)</span>
            <div className="flex gap-2">
              <button className={btnGhost} onClick={() => { setText(viewing.content); setViewing(null); }}>העתק לעריכה</button>
              <button className={btnGhost} onClick={() => setViewing(null)}>חזרה</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <input className={`${input} flex-1 min-w-[200px]`} placeholder="מה שינית? (לזיהוי הגרסה)" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className={btnGhost} disabled={!dirty || busy} onClick={() => save(false)} title="נשמר כטיוטה — אפשר לבדוק אותה בבדיקה יבשה לפני הפעלה">
              <Save className="w-4 h-4" /> שמור כטיוטה
            </button>
            <button className={btnPrimary} disabled={!dirty || busy} onClick={() => save(true)}>שמור והפעל</button>
          </div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          טיפ: שמור כטיוטה → משימות → 🧪 בדיקה יבשה על ריליס ספציפי עם הטיוטה → אם טוב, הפעל אותה מההיסטוריה.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <History className="w-4 h-4" /> היסטוריית גרסאות
        </div>
        {versions.length === 0 ? (
          <Empty>אין עדיין הוראות</Empty>
        ) : (
          <ul className="space-y-2">
            {versions.map((p) => (
              <li key={p.id} className={`p-3 rounded border text-sm ${p.is_active ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">v{p.version}</span>
                  {p.is_active ? <Badge className="bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300">פעילה</Badge> : null}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{fmtDate(p.created_at)} · {p.created_by}</div>
                {p.change_note && <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">{p.change_note}</div>}
                <div className="flex gap-3 mt-2 text-xs">
                  <button className="text-primary-600 dark:text-primary-400 hover:underline" onClick={() => setViewing(p)}>צפייה</button>
                  {!p.is_active && (
                    <button className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1" onClick={() => activate(p.id)}>
                      <RotateCcw className="w-3 h-3" /> הפעל
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// ── Rules (structured thresholds) ───────────────────────────────────────────
const RuleInput = ({ rule, onSave }) => {
  const toText = (r) => (r.value_type === 'text_list' || r.value_type === 'number_list' ? (r.value || []).join(', ') : r.value_type === 'json' ? JSON.stringify(r.value) : String(r.value));
  const [v, setV] = useState(toText(rule));
  useEffect(() => setV(toText(rule)), [rule]);

  const parse = () => {
    switch (rule.value_type) {
      case 'number': return Number(v);
      case 'boolean': return v === true || v === 'true';
      case 'text_list': return v.split(',').map((s) => s.trim()).filter(Boolean);
      case 'number_list': return v.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
      case 'json': return JSON.parse(v);
      default: return v;
    }
  };
  const changed = v !== toText(rule);

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Field label={rule.label} hint={rule.description}>
          {rule.value_type === 'boolean' ? (
            <select className={input} value={String(v)} onChange={(e) => setV(e.target.value)}>
              <option value="true">כן</option>
              <option value="false">לא</option>
            </select>
          ) : (
            <input className={input} value={v} onChange={(e) => setV(e.target.value)} dir={rule.value_type.includes('list') || rule.value_type === 'number' ? 'ltr' : undefined} />
          )}
        </Field>
      </div>
      <button
        className={btnPrimary}
        disabled={!changed}
        onClick={async () => {
          try { await onSave(rule, parse()); } catch (e) { alert(errMsg(e)); }
        }}
      >
        שמור
      </button>
    </div>
  );
};

const Rules = ({ taskKey }) => {
  const [rules, setRules] = useState([]);
  const load = useCallback(async () => setRules((await api.get('/agent/rules', { params: { task_key: taskKey } })).data), [taskKey]);
  useEffect(() => { load(); }, [load]);
  const save = async (rule, value) => {
    await api.put(`/agent/rules/${taskKey}/${rule.rule_key}`, { value });
    load();
  };
  if (!rules.length) return <Empty>אין כללים מובנים למשימה הזו</Empty>;
  return <div className="grid gap-4 md:grid-cols-2">{rules.map((r) => <RuleInput key={r.rule_key} rule={r} onSave={save} />)}</div>;
};

// ── Learned examples ────────────────────────────────────────────────────────
const Examples = ({ taskKey }) => {
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => setRows((await api.get('/agent/examples', { params: { task_key: taskKey } })).data), [taskKey]);
  useEffect(() => { load(); }, [load]);
  const toggle = async (ex) => { await api.put(`/agent/examples/${ex.id}`, { active: !ex.active }); load(); };
  if (!rows.length) return <Empty>עדיין אין דוגמאות. הן נוצרות כשמתקנים החלטה בלשונית "החלטות לבדיקה".</Empty>;
  return (
    <ul className="space-y-2">
      {rows.map((ex) => (
        <li key={ex.id} className={`p-3 rounded border border-gray-200 dark:border-gray-700 text-sm ${ex.active ? '' : 'opacity-50'}`}>
          <div className="text-gray-800 dark:text-gray-200">{ex.input_summary}</div>
          <div className="mt-1 text-green-700 dark:text-green-400">← {ex.correct_decision}</div>
          {ex.note && <div className="text-xs text-gray-500 mt-1">{ex.note}</div>}
          <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{fmtDate(ex.created_at)} · {ex.created_by}</span>
            <button className="text-primary-600 dark:text-primary-400 hover:underline" onClick={() => toggle(ex)}>{ex.active ? 'השבת' : 'הפעל'}</button>
          </div>
        </li>
      ))}
    </ul>
  );
};

const InstructionsTab = ({ tasks }) => {
  const [scope, setScope] = useState(''); // '' = global
  const task = tasks.find((t) => t.key === scope);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setScope('')} className={`px-3 py-1.5 text-sm rounded-md border ${scope === '' ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
          כללי (כל המשימות)
        </button>
        {tasks.map((t) => (
          <button key={t.key} onClick={() => setScope(t.key)} className={`px-3 py-1.5 text-sm rounded-md border ${scope === t.key ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
            {t.name}
          </button>
        ))}
      </div>

      <Section title={scope ? `הוראות — ${task?.name}` : 'הוראות כלליות (מדיניות, טון, גבולות)'}>
        <PromptEditor taskKey={scope} />
      </Section>

      {scope && (
        <>
          <Section title="כללים וספים">
            <Rules taskKey={scope} />
          </Section>
          <Section title="דוגמאות שיואב לומד מהן">
            <Examples taskKey={scope} />
          </Section>
        </>
      )}
    </div>
  );
};

export default InstructionsTab;
