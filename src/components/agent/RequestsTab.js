import React, { useEffect, useState, useCallback } from 'react';
import { Plus, ChevronDown, ChevronLeft, Wrench } from 'lucide-react';
import api from '../../utils/api';
import { Section, Empty, Badge, btnPrimary, btnGhost, input, fmtDate, errMsg } from './ui';

const SOURCE_LABEL = { api: 'API', crm: 'CRM', telegram: 'טלגרם', 'yoav-agent': 'יואב' };
const TYPE_LABEL   = { fix_request: 'תיקון', info_request: 'מידע', cancel_latest: 'ביטול', general: 'כללי' };
const STATUS_CLS   = {
  pending:    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  processing: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  done:       'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  failed:     'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  cancelled:  'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

// ── Release request row ───────────────────────────────────────────────────────
const Row = ({ r }) => {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState(null);

  useEffect(() => {
    if (!open || r.request_type !== 'info_request' || r.status !== 'done') return;
    api.get(`/agent/release-history/${r.release_id}`)
      .then(({ data }) => {
        const entry = data.find((h) => h.request_id === r.id && h.summary === 'answer_info_request');
        if (entry?.details?.answer) setAnswer(entry.details.answer);
      })
      .catch(() => {});
  }, [open, r.id, r.release_id, r.request_type, r.status]);

  return (
    <>
      <tr
        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-3 py-2 text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {open ? <ChevronDown className="w-3 h-3 inline ml-1" /> : <ChevronLeft className="w-3 h-3 inline ml-1" />}
          {r.release_id}
        </td>
        <td className="px-3 py-2 text-xs whitespace-nowrap">
          <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            {TYPE_LABEL[r.request_type] || r.request_type}
          </Badge>
        </td>
        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 max-w-xs truncate">
          {r.raw_text}
        </td>
        <td className="px-3 py-2 text-xs whitespace-nowrap">
          <Badge className={STATUS_CLS[r.status] || ''}>{r.status}</Badge>
        </td>
        <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {SOURCE_LABEL[r.source] || r.source}
        </td>
        <td className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {fmtDate(r.created_at)}
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50 dark:bg-gray-800/60">
          <td colSpan={6} className="px-4 py-3 space-y-2">
            {answer && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">תשובת יואב:</p>
                <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">{answer}</p>
              </div>
            )}
            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
              {r.raw_text}
            </pre>
            {r.error && <p className="text-xs text-red-600 dark:text-red-400">שגיאה: {r.error}</p>}
            {r.parsed_params && (
              <pre className="text-xs text-gray-500 dark:text-gray-400">
                params: {JSON.stringify(r.parsed_params, null, 2)}
              </pre>
            )}
          </td>
        </tr>
      )}
    </>
  );
};

// ── Free-text request modal (renamed) ────────────────────────────────────────
const NewRequestModal = ({ onClose, onCreate }) => {
  const [f, setF] = useState({ release_id: '', request_type: 'fix_request', raw_text: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    if (!f.release_id.trim() || !f.raw_text.trim()) return alert('release_id ו-raw_text חובה');
    setBusy(true);
    try {
      await api.post('/agent/release-requests', f);
      onCreate();
      onClose();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">בקשת תיקון מיואב</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">מזהה ריליס</label>
            <input className={input} dir="ltr" placeholder="DEMO-1001" value={f.release_id} onChange={set('release_id')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">סוג</label>
            <select className={input} value={f.request_type} onChange={set('request_type')}>
              <option value="fix_request">תיקון</option>
              <option value="info_request">בקשת מידע</option>
              <option value="cancel_latest">ביטול בקשה קודמת</option>
              <option value="general">כללי</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">הוראה (טקסט חופשי)</label>
            <textarea rows={4} className={input} value={f.raw_text} onChange={set('raw_text')} placeholder="לדוגמה: שנה את שם הכותב ברצועה 1 מ-X ל-Y" />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button className={btnGhost} onClick={onClose}>ביטול</button>
          <button className={btnPrimary} disabled={busy} onClick={submit}>שלח</button>
        </div>
      </div>
    </div>
  );
};

// ── Manual correction modal (dynamic form) ───────────────────────────────────
const ManualCorrectionModal = ({ onClose, onCreate }) => {
  const [corrTypes, setCorrTypes] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/agent/fix-correction-types')
      .then(({ data }) => {
        const nonRelease = (data || []).filter((ct) => ct.entity_type !== 'release' && ct.enabled);
        setCorrTypes(nonRelease);
        if (nonRelease.length) setSelectedKey(nonRelease[0].key);
      })
      .catch(() => {});
  }, []);

  const selectedType = corrTypes.find((ct) => ct.key === selectedKey);
  const inputFields = selectedType?.input_fields || [];

  const setField = (key, val) => setFieldValues((prev) => ({ ...prev, [key]: val }));

  const submit = async () => {
    if (!selectedKey) return alert('בחר סוג תיקון');
    for (const f of inputFields) {
      if (f.required && !fieldValues[f.key]?.trim()) return alert(`השדה "${f.label}" חובה`);
    }
    setBusy(true);
    try {
      const fields = {};
      for (const f of inputFields) {
        if (fieldValues[f.key]) {
          fields[f.key] = f.type === 'release_ids'
            ? fieldValues[f.key].split(',').map((s) => s.trim()).filter(Boolean)
            : fieldValues[f.key].trim();
        }
      }
      await api.post('/agent/corrections', { correction_type_key: selectedKey, fields, note: note || undefined });
      onCreate();
      onClose();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">תיקון ידני</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">סוג תיקון</label>
            <select
              className={input}
              value={selectedKey}
              onChange={(e) => { setSelectedKey(e.target.value); setFieldValues({}); }}
            >
              {corrTypes.map((ct) => (
                <option key={ct.key} value={ct.key}>{ct.label}</option>
              ))}
              {!corrTypes.length && <option value="">טוען...</option>}
            </select>
          </div>

          {inputFields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {f.label}{f.required && <span className="text-red-500 mr-1">*</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  rows={3}
                  className={input}
                  dir="ltr"
                  placeholder={f.placeholder || ''}
                  value={fieldValues[f.key] || ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
              ) : (
                <input
                  className={input}
                  dir="ltr"
                  placeholder={f.placeholder || (f.type === 'release_ids' ? '174, 182, 203' : '')}
                  value={fieldValues[f.key] || ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
              )}
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">הערה (רשות — תיכלל במייל לפי"ל)</label>
            <textarea rows={2} className={input} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button className={btnGhost} onClick={onClose}>ביטול</button>
          <button className={btnPrimary} disabled={busy || !selectedKey} onClick={submit}>שלח ליואב</button>
        </div>
      </div>
    </div>
  );
};

// ── Correction row (general corrections) ─────────────────────────────────────
const CorrectionRow = ({ r }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 max-w-[180px] truncate">
          {open ? <ChevronDown className="w-3 h-3 inline ml-1" /> : <ChevronLeft className="w-3 h-3 inline ml-1" />}
          {r.correction_type_key}
        </td>
        <td className="px-3 py-2 text-xs whitespace-nowrap">
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
            {r.entity_type}
          </Badge>
        </td>
        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 max-w-xs truncate">
          {r.note || Object.values(r.fields || {}).join(' · ')}
        </td>
        <td className="px-3 py-2 text-xs whitespace-nowrap">
          <Badge className={STATUS_CLS[r.status] || ''}>{r.status}</Badge>
        </td>
        <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {SOURCE_LABEL[r.source] || r.source}
        </td>
        <td className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {fmtDate(r.created_at)}
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50 dark:bg-gray-800/60">
          <td colSpan={6} className="px-4 py-3 space-y-2">
            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
              {JSON.stringify(r.fields, null, 2)}
            </pre>
            {r.note && <p className="text-xs text-gray-500 dark:text-gray-400">הערה: {r.note}</p>}
            {r.error && <p className="text-xs text-red-600 dark:text-red-400">שגיאה: {r.error}</p>}
          </td>
        </tr>
      )}
    </>
  );
};

// ── Main tab ─────────────────────────────────────────────────────────────────
const RequestsTab = ({ onChanged, tick }) => {
  const [rows, setRows] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCorrModal, setShowCorrModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const [reqRes, corrRes] = await Promise.all([
        api.get('/agent/release-requests', { params: { limit: 100, ...(status && { status }) } }),
        api.get('/agent/corrections', { params: { limit: 50, ...(status && { status }) } }),
      ]);
      setRows(reqRes.data);
      setCorrections(corrRes.data);
    } catch (e) {
      console.error('[RequestsTab]', errMsg(e));
    }
  }, [status, tick]);

  useEffect(() => { load(); }, [load]);

  const refresh = () => { load(); onChanged?.(); };

  return (
    <div className="space-y-6">
      {/* ── Release requests ── */}
      <Section
        title="בקשות שירות ריליסים"
        actions={
          <div className="flex items-center gap-2">
            <select
              className="text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 px-2 py-1"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">הכל</option>
              <option value="pending">ממתינות</option>
              <option value="processing">בטיפול</option>
              <option value="done">הושלמו</option>
              <option value="failed">נכשלו</option>
              <option value="cancelled">בוטלו</option>
            </select>
            <button className={btnPrimary} onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> בקשת תיקון מיואב
            </button>
          </div>
        }
      >
        {rows.length === 0 ? (
          <Empty>אין בקשות</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2 text-right font-medium">ריליס</th>
                  <th className="px-3 py-2 text-right font-medium">סוג</th>
                  <th className="px-3 py-2 text-right font-medium">הוראה</th>
                  <th className="px-3 py-2 text-right font-medium">סטטוס</th>
                  <th className="px-3 py-2 text-right font-medium">מקור</th>
                  <th className="px-3 py-2 text-right font-medium">תאריך</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {rows.map((r) => <Row key={r.id} r={r} />)}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── General corrections ── */}
      <Section
        title="תיקונים כלליים"
        actions={
          <button className={btnPrimary} onClick={() => setShowCorrModal(true)}>
            <Wrench className="w-4 h-4" /> תיקון ידני
          </button>
        }
      >
        {corrections.length === 0 ? (
          <Empty>אין תיקונים</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2 text-right font-medium">סוג</th>
                  <th className="px-3 py-2 text-right font-medium">ישות</th>
                  <th className="px-3 py-2 text-right font-medium">פרטים</th>
                  <th className="px-3 py-2 text-right font-medium">סטטוס</th>
                  <th className="px-3 py-2 text-right font-medium">מקור</th>
                  <th className="px-3 py-2 text-right font-medium">תאריך</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {corrections.map((r) => <CorrectionRow key={r.id} r={r} />)}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {showModal && <NewRequestModal onClose={() => setShowModal(false)} onCreate={refresh} />}
      {showCorrModal && <ManualCorrectionModal onClose={() => setShowCorrModal(false)} onCreate={refresh} />}
    </div>
  );
};

export default RequestsTab;
