import React, { useEffect, useState, useCallback } from 'react';
import { Plus, ChevronDown, ChevronLeft } from 'lucide-react';
import api from '../../utils/api';
import { Section, Empty, Badge, btnPrimary, btnGhost, input, fmtDate, errMsg } from './ui';

const SOURCE_LABEL = { api: 'API', crm: 'CRM', telegram: 'טלגרם' };
const TYPE_LABEL   = { fix_request: 'תיקון', info_request: 'מידע', cancel_latest: 'ביטול', general: 'כללי' };
const STATUS_CLS   = {
  pending:    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  processing: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  done:       'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  failed:     'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  cancelled:  'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

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

// ── New request modal ────────────────────────────────────────────────────────
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">הוראה חדשה ליואב</h3>
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

// ── Main tab ─────────────────────────────────────────────────────────────────
const RequestsTab = ({ onChanged, tick }) => {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/agent/release-requests', { params: { limit: 100, ...(status && { status }) } });
      setRows(data);
    } catch (e) {
      console.error('[RequestsTab]', errMsg(e));
    }
  }, [status, tick]);

  useEffect(() => { load(); }, [load]);

  return (
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
            <Plus className="w-4 h-4" /> הוראה חדשה
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
      {showModal && <NewRequestModal onClose={() => setShowModal(false)} onCreate={() => { load(); onChanged?.(); }} />}
    </Section>
  );
};

export default RequestsTab;
