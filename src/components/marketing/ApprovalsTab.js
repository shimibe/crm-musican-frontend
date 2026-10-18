import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import api from '../../utils/api';
import { card, btnSuccess, btnDanger, btnGhost, Empty, PostStatusBadge, PLATFORM_EMOJI, PLATFORM_LABEL, fmtDate, errMsg } from './ui';

function ApprovalCard({ ap, onChanged }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const decide = async (approve) => {
    setBusy(true); setErr(null);
    try {
      await api.post(`/marketing/approvals/${ap.id}/decide`, { approve, note: note || undefined });
      onChanged();
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  };

  return (
    <div className={`${card} p-4 space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{ap.kind}</span>
          {ap.task_key && <span className="mr-2 text-xs text-gray-400 dark:text-gray-500">· {ap.task_key}</span>}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">{fmtDate(ap.created_at)}</span>
      </div>

      {ap.description && (
        <p className="text-sm text-gray-800 dark:text-gray-200">{ap.description}</p>
      )}

      {/* Post preview if attached */}
      {ap.text_content && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2">
          {ap.image_url && <img src={ap.image_url} alt="" className="w-full max-h-40 object-cover rounded" />}
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{ap.text_content}</p>
          {ap.platforms?.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {ap.platforms.map((pl) => (
                <span key={pl} className="text-xs text-gray-500 dark:text-gray-400">{PLATFORM_EMOJI[pl]} {PLATFORM_LABEL[pl]}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {ap.payload && typeof ap.payload === 'object' && !ap.text_content && (
        <pre className="text-xs bg-gray-50 dark:bg-gray-700/50 rounded p-2 overflow-auto max-h-32 text-gray-700 dark:text-gray-300">
          {JSON.stringify(ap.payload, null, 2)}
        </pre>
      )}

      <input
        type="text" value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="הערה (אופציונלי)"
        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      />

      {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}

      <div className="flex gap-2">
        <button onClick={() => decide(true)} disabled={busy} className={btnSuccess}>
          <Check className="w-3.5 h-3.5" />אשר
        </button>
        <button onClick={() => decide(false)} disabled={busy} className={btnDanger}>
          <X className="w-3.5 h-3.5" />דחה
        </button>
      </div>
    </div>
  );
}

export default function ApprovalsTab({ onChanged, tick }) {
  const [approvals, setApprovals] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [err, setErr] = useState(null);

  const load = async (all = false) => {
    try {
      const r = await api.get('/marketing/approvals', { params: { status: all ? 'all' : 'pending' } });
      setApprovals(r.data);
      setErr(null);
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  useEffect(() => { load(showAll); }, [tick, showAll]); // eslint-disable-line

  const handleChanged = () => { load(showAll); onChanged?.(); };

  const pending = approvals.filter((a) => a.status === 'pending');
  const done    = approvals.filter((a) => a.status !== 'pending');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {pending.length > 0 ? `${pending.length} ממתינים לאישור` : 'אין אישורים ממתינים'}
        </h2>
        <button onClick={() => setShowAll((v) => !v)} className={btnGhost}>
          {showAll ? 'הסתר היסטוריה' : 'הצג היסטוריה'}
        </button>
      </div>

      {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
      {pending.length === 0 && <Empty>אין אישורים ממתינים</Empty>}

      <div className="grid gap-4 md:grid-cols-2">
        {pending.map((a) => <ApprovalCard key={a.id} ap={a} onChanged={handleChanged} />)}
      </div>

      {showAll && done.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">היסטוריה</h3>
          <div className="space-y-2">
            {done.map((a) => (
              <div key={a.id} className={`${card} px-4 py-3 flex items-center justify-between gap-3 text-sm`}>
                <span className="text-gray-700 dark:text-gray-300">{a.description || a.kind}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    a.status === 'approved' || a.status === 'executed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                  }`}>{a.status === 'approved' || a.status === 'executed' ? '✅ אושר' : '❌ נדחה'}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{a.decided_by}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
