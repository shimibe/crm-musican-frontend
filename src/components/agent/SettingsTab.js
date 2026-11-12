import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronLeft, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import api from '../../utils/api';
import { Section, Field, input, btnPrimary, btnGhost, btnDanger, errMsg } from './ui';

// ── Main settings ─────────────────────────────────────────────────────────────
const SettingsTab = ({ settings, reload }) => {
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (settings)
      setF({
        daily_budget_usd: settings.daily_budget_usd,
        monthly_budget_usd: settings.monthly_budget_usd,
        manager_email: settings.manager_email || '',
        manager_email_enabled: settings.manager_email_enabled !== false,
        telegram_chat_id: settings.telegram_chat_id || '',
        pil_default_email: settings.pil_default_email || '',
      });
  }, [settings]);

  const save = async () => {
    setBusy(true);
    try {
      await api.put('/agent/settings', { ...f, daily_budget_usd: Number(f.daily_budget_usd), monthly_budget_usd: Number(f.monthly_budget_usd) });
      await reload();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <Section title="הגדרות">
      <div className="grid gap-4 md:grid-cols-2 max-w-3xl">
        <Field label="תקרה יומית ($)" hint="בהגעה לתקרה יואב נעצר עד מחר ושולח התראה">
          <input type="number" step="0.5" min="0" className={input} dir="ltr" value={f.daily_budget_usd ?? ''} onChange={set('daily_budget_usd')} />
        </Field>
        <Field label="תקרה חודשית ($)">
          <input type="number" step="1" min="0" className={input} dir="ltr" value={f.monthly_budget_usd ?? ''} onChange={set('monthly_budget_usd')} />
        </Field>
        <Field label="מייל מנהל" hint="סיכום יומי ודוחות שיחות">
          <input type="email" className={input} dir="ltr" value={f.manager_email ?? ''} onChange={set('manager_email')} />
          <label className="flex items-center gap-2 mt-2 cursor-pointer select-none text-sm">
            <input
              type="checkbox"
              checked={f.manager_email_enabled ?? true}
              onChange={(e) => setF({ ...f, manager_email_enabled: e.target.checked })}
            />
            <span>שליחת מיילים מופעלת</span>
          </label>
        </Field>
        <Field label="Telegram chat ID" hint="בקשות אישור והתערבות, עם כפתורים">
          <input className={input} dir="ltr" value={f.telegram_chat_id ?? ''} onChange={set('telegram_chat_id')} />
        </Field>
        <Field label='מייל פי"ל — ברירת מחדל' hint="נמען גיבוי כשאין נמענים מוגדרים לסוג התיקון">
          <input type="email" className={input} dir="ltr" value={f.pil_default_email ?? ''} onChange={set('pil_default_email')} placeholder="pil@example.com" />
        </Field>
      </div>
      <div className="mt-6">
        <button className={btnPrimary} disabled={busy} onClick={save}>שמור</button>
      </div>

      <ReleaseEditRuleToggle />
      <AdvancedSection />
    </Section>
  );
};

// ── Post-submission edit toggle ────────────────────────────────────────────────
const ReleaseEditRuleToggle = () => {
  const [value, setValue] = useState(false);
  const [busy, setBusy]   = useState(false);

  useEffect(() => {
    api.get('/agent/rules?task_key=release_request_handler')
      .then((r) => {
        const rule = (r.data || []).find((x) => x.rule_key === 'allow_post_submission_edit');
        if (rule) setValue(rule.value === 'true');
      })
      .catch(() => {});
  }, []);

  const toggle = async (checked) => {
    setBusy(true);
    try {
      await api.put('/agent/rules/release_request_handler/allow_post_submission_edit', { value: checked, value_type: 'boolean' });
      setValue(checked);
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-5">
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          className="w-4 h-4 accent-indigo-600"
          checked={value}
          disabled={busy}
          onChange={(e) => toggle(e.target.checked)}
        />
        <div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">אפשר עריכת ריליס לאחר שליחה</span>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">כשמופעל, יואב יוכל לעדכן ריליסים שנשלחו או שפורסמו (force_update)</p>
        </div>
      </label>
    </div>
  );
};

// ── Advanced settings (collapsed by default) ──────────────────────────────────
const AdvancedSection = () => {
  const [open, setOpen] = useState(false);
  const [corrTypes, setCorrTypes]   = useState([]);
  const [pilContacts, setPilContacts] = useState([]);
  const [loading, setLoading]       = useState(false);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const [ct, pc] = await Promise.all([
        api.get('/agent/fix-correction-types').then((r) => r.data),
        api.get('/agent/pil-contacts').then((r) => r.data),
      ]);
      setCorrTypes(ct);
      setPilContacts(pc);
    } catch (e) {
      console.error('[SettingsTab]', errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
      <button
        className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        הגדרות מתקדמות ⚙️
      </button>

      {open && (
        <div className="mt-5 space-y-8">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">טוען...</p>
          ) : (
            <>
              <CorrectionTypesTable rows={corrTypes} onChanged={load} pilContacts={pilContacts} />
              <PilContactsTable rows={pilContacts} corrTypes={corrTypes} onChanged={load} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Correction types table ──────────────────────────────────────────────────
const EMPTY_CT = { key: '', label: '', entity_type: 'release', send_pil: true, regenerate_docs: [], requires_file: false, file_type: '', fields_allowed: '', input_fields: '', pil_subject_tmpl: '', pil_body_tmpl: '', notes: '' };

const CorrectionTypesTable = ({ rows, onChanged }) => {
  const [editing, setEditing] = useState(null); // null | 'new' | { key }
  const [f, setF]             = useState(EMPTY_CT);
  const [busy, setBusy]       = useState(false);

  const startNew  = () => { setF(EMPTY_CT); setEditing('new'); };
  const startEdit = (r) => { setF({ ...r, fields_allowed: (r.fields_allowed || []).join(', '), regenerate_docs: r.regenerate_docs || [], file_type: r.file_type || '', input_fields: r.input_fields ? JSON.stringify(r.input_fields, null, 2) : '', entity_type: r.entity_type || 'release', send_pil: r.send_pil !== false }); setEditing(r.key); };
  const cancel    = () => setEditing(null);

  const save = async () => {
    setBusy(true);
    try {
      let parsedInputFields = null;
      if (f.input_fields?.trim()) {
        try { parsedInputFields = JSON.parse(f.input_fields); }
        catch { alert('input_fields — JSON לא תקין'); setBusy(false); return; }
      }
      const payload = {
        ...f,
        fields_allowed: f.fields_allowed ? f.fields_allowed.split(',').map((s) => s.trim()).filter(Boolean) : null,
        file_type: f.file_type || null,
        input_fields: parsedInputFields,
        entity_type: f.entity_type || 'release',
        send_pil: f.send_pil !== false,
      };
      if (editing === 'new') await api.post('/agent/fix-correction-types', payload);
      else await api.put(`/agent/fix-correction-types/${editing}`, payload);
      setEditing(null);
      onChanged();
    } catch (e) { alert(errMsg(e)); } finally { setBusy(false); }
  };

  const del = async (key) => {
    if (!window.confirm(`למחוק סוג תיקון "${key}"?`)) return;
    try { await api.delete(`/agent/fix-correction-types/${key}`); onChanged(); }
    catch (e) { alert(errMsg(e)); }
  };

  const toggle = async (key, enabled) => {
    try { await api.put(`/agent/fix-correction-types/${key}`, { enabled: !enabled }); onChanged(); }
    catch (e) { alert(errMsg(e)); }
  };

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">סוגי תיקונים</h3>
        <button className={btnGhost} onClick={startNew}><Plus className="w-3.5 h-3.5" /> הוסף</button>
      </div>
      {rows.length === 0 && editing !== 'new' && <p className="text-xs text-gray-400 dark:text-gray-500">אין סוגי תיקונים מוגדרים</p>}
      <div className="space-y-1">
        {rows.map((r) => editing === r.key ? (
          <CorrTypeForm key={r.key} f={f} set={set} setF={setF} busy={busy} onSave={save} onCancel={cancel} isNew={false} />
        ) : (
          <div key={r.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${r.enabled ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-200 dark:border-gray-700 opacity-50'}`}>
            <code className="font-mono text-xs text-gray-500 dark:text-gray-400 w-32 shrink-0">{r.key}</code>
            <span className="flex-1 text-gray-800 dark:text-gray-200">{r.label}</span>
            <span className="text-xs text-gray-400">{(r.regenerate_docs || []).join(', ')}</span>
            <button onClick={() => toggle(r.key, r.enabled)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">{r.enabled ? 'פעיל' : 'כבוי'}</button>
            <button onClick={() => startEdit(r)} className="p-1 text-gray-400 hover:text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={() => del(r.key)}  className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        {editing === 'new' && <CorrTypeForm f={f} set={set} setF={setF} busy={busy} onSave={save} onCancel={cancel} isNew={true} />}
      </div>
    </div>
  );
};

const CorrTypeForm = ({ f, set, setF, busy, onSave, onCancel, isNew }) => (
  <div className="border border-indigo-200 dark:border-indigo-700 rounded-lg p-3 space-y-2 bg-indigo-50/30 dark:bg-indigo-900/10">
    <div className="grid grid-cols-2 gap-2">
      {isNew && <div><label className="block text-xs text-gray-500 mb-0.5">key</label><input className={input} dir="ltr" value={f.key} onChange={set('key')} placeholder="writer_credit" /></div>}
      <div className={isNew ? '' : 'col-span-2'}><label className="block text-xs text-gray-500 mb-0.5">תווית (עברית)</label><input className={input} value={f.label} onChange={set('label')} /></div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block text-xs text-gray-500 mb-0.5">entity_type</label>
        <select className={input} value={f.entity_type || 'release'} onChange={set('entity_type')}>
          <option value="release">release</option>
          <option value="artist">artist</option>
          <option value="channel">channel</option>
          <option value="general">general</option>
        </select>
      </div>
      <div className="flex items-center gap-2 pt-4">
        <input type="checkbox" id="send_pil_chk" checked={f.send_pil !== false} onChange={(e) => setF({ ...f, send_pil: e.target.checked })} />
        <label htmlFor="send_pil_chk" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">שלח מייל לפי"ל</label>
      </div>
    </div>
    <div>
      <label className="block text-xs text-gray-500 mb-0.5">regenerate_docs (מופרד בפסיקים)</label>
      <input className={input} dir="ltr" value={(f.regenerate_docs || []).join(', ')} onChange={(e) => setF({ ...f, regenerate_docs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="contractSigned, pilOwnershipDoc" />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div><label className="block text-xs text-gray-500 mb-0.5">fields_allowed (פסיקים)</label><input className={input} dir="ltr" value={f.fields_allowed || ''} onChange={set('fields_allowed')} placeholder="tracks[*].writer" /></div>
      <div>
        <label className="block text-xs text-gray-500 mb-0.5">file_type</label>
        <select className={input} value={f.file_type || ''} onChange={set('file_type')}>
          <option value="">—</option><option value="audio">audio</option><option value="cover">cover</option>
        </select>
      </div>
    </div>
    <div>
      <label className="block text-xs text-gray-500 mb-0.5">input_fields (JSON — לסוגי תיקון כלליים)</label>
      <textarea rows={3} className={input} dir="ltr" value={f.input_fields || ''} onChange={set('input_fields')}
        placeholder={'[{"key":"url","type":"url","label":"קישור","required":true}]'} />
    </div>
    <div><label className="block text-xs text-gray-500 mb-0.5">PIL subject template</label><input className={input} value={f.pil_subject_tmpl || ''} onChange={set('pil_subject_tmpl')} /></div>
    <div><label className="block text-xs text-gray-500 mb-0.5">PIL body template</label><textarea rows={3} className={input} value={f.pil_body_tmpl || ''} onChange={set('pil_body_tmpl')} /></div>
    <div className="flex gap-2 justify-end pt-1">
      <button className={btnGhost} onClick={onCancel}><X className="w-3.5 h-3.5" /> ביטול</button>
      <button className={btnPrimary} disabled={busy} onClick={onSave}><Check className="w-3.5 h-3.5" /> שמור</button>
    </div>
  </div>
);

// ── PIL contacts table ──────────────────────────────────────────────────────
const PilContactsTable = ({ rows, corrTypes, onChanged }) => {
  const [editing, setEditing] = useState(null);
  const [f, setF]             = useState({ name: '', email: '', fix_type_keys: [] });
  const [busy, setBusy]       = useState(false);

  const startNew  = ()  => { setF({ name: '', email: '', fix_type_keys: [] }); setEditing('new'); };
  const startEdit = (r) => { setF({ name: r.name, email: r.email, fix_type_keys: r.fix_type_keys || [] }); setEditing(r.id); };
  const cancel    = ()  => setEditing(null);

  const save = async () => {
    setBusy(true);
    try {
      if (editing === 'new') await api.post('/agent/pil-contacts', f);
      else await api.put(`/agent/pil-contacts/${editing}`, f);
      setEditing(null);
      onChanged();
    } catch (e) { alert(errMsg(e)); } finally { setBusy(false); }
  };

  const del = async (id) => {
    if (!window.confirm('למחוק נמען PIL?')) return;
    try { await api.delete(`/agent/pil-contacts/${id}`); onChanged(); }
    catch (e) { alert(errMsg(e)); }
  };

  const toggleType = (key) => setF((prev) => ({
    ...prev,
    fix_type_keys: prev.fix_type_keys.includes(key)
      ? prev.fix_type_keys.filter((k) => k !== key)
      : [...prev.fix_type_keys, key],
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">נמעני פי"ל</h3>
        <button className={btnGhost} onClick={startNew}><Plus className="w-3.5 h-3.5" /> הוסף</button>
      </div>
      {rows.length === 0 && editing !== 'new' && <p className="text-xs text-gray-400 dark:text-gray-500">אין נמענים מוגדרים</p>}
      <div className="space-y-1">
        {rows.map((r) => editing === r.id ? (
          <ContactForm key={r.id} f={f} setF={setF} corrTypes={corrTypes} toggleType={toggleType} busy={busy} onSave={save} onCancel={cancel} />
        ) : (
          <div key={r.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 ${!r.enabled ? 'opacity-50' : ''}`}>
            <span className="font-medium text-gray-800 dark:text-gray-200 w-32 shrink-0 truncate">{r.name}</span>
            <span className="text-gray-500 dark:text-gray-400 flex-1 font-mono text-xs" dir="ltr">{r.email}</span>
            <span className="text-xs text-gray-400">{(r.fix_type_keys || []).join(', ') || '—'}</span>
            <button onClick={() => startEdit(r)} className="p-1 text-gray-400 hover:text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={() => del(r.id)}    className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        {editing === 'new' && <ContactForm f={f} setF={setF} corrTypes={corrTypes} toggleType={toggleType} busy={busy} onSave={save} onCancel={cancel} />}
      </div>
    </div>
  );
};

const ContactForm = ({ f, setF, corrTypes, toggleType, busy, onSave, onCancel }) => (
  <div className="border border-indigo-200 dark:border-indigo-700 rounded-lg p-3 space-y-2 bg-indigo-50/30 dark:bg-indigo-900/10">
    <div className="grid grid-cols-2 gap-2">
      <div><label className="block text-xs text-gray-500 mb-0.5">שם</label><input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><label className="block text-xs text-gray-500 mb-0.5">מייל</label><input type="email" className={input} dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
    </div>
    {corrTypes.length > 0 && (
      <div>
        <label className="block text-xs text-gray-500 mb-1">שיוך לסוגי תיקון</label>
        <div className="flex flex-wrap gap-2">
          {corrTypes.map((ct) => (
            <label key={ct.key} className="flex items-center gap-1 text-xs cursor-pointer">
              <input type="checkbox" checked={f.fix_type_keys.includes(ct.key)} onChange={() => toggleType(ct.key)} />
              <span>{ct.label || ct.key}</span>
            </label>
          ))}
        </div>
      </div>
    )}
    <div className="flex gap-2 justify-end pt-1">
      <button className={btnGhost} onClick={onCancel}><X className="w-3.5 h-3.5" /> ביטול</button>
      <button className={btnPrimary} disabled={busy} onClick={onSave}><Check className="w-3.5 h-3.5" /> שמור</button>
    </div>
  </div>
);

export default SettingsTab;
