import React, { useEffect, useState, useCallback } from 'react';
import { Check, X, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import { Section, Empty, Badge, btnSuccess, btnDanger, btnGhost, btnPrimary, fmtDate, errMsg, input } from './ui';

const STATUS = {
  pending: ['ממתין', 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'],
  approved: ['אושר — בביצוע', 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'],
  executed: ['בוצע', 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'],
  rejected: ['נדחה', 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'],
  expired: ['פג תוקף', 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'],
  failed: ['נכשל', 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'],
};

// Tools whose params can be edited before approving.
// Each entry: { key, type } — type 'text' = plain textarea, type 'json' = formatted JSON textarea.
const EDITABLE_TOOLS = {
  'musican.save_fix_note':       [{ key: 'note',    type: 'text' }],
  'musican.update_release_data': [{ key: 'changes', type: 'json' }],
};

const ApprovalsTab = ({ onChanged, tick }) => {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('active');
  const [busy, setBusy] = useState(null);
  // { [approvalId]: { [paramKey]: editedValue } }
  const [edits, setEdits] = useState({});

  const load = useCallback(async () => {
    const { data } = await api.get('/agent/approvals', { params: { status } });
    setRows(data);
  }, [status, tick]);
  useEffect(() => { load(); }, [load]);

  const setEdit = (id, key, value) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));

  const decide = async (id, approve, proposed) => {
    setBusy(id);
    try {
      const editedFields = edits[id];
      let override_params = undefined;
      if (approve && editedFields && proposed?.params) {
        const toolFields = EDITABLE_TOOLS[proposed.tool] || [];
        const merged = { ...proposed.params };
        let changed = false;
        for (const field of toolFields) {
          const { key, type } = field;
          const rawEdit = editedFields[key];
          if (rawEdit === undefined) continue;
          const parsed = type === 'json' ? JSON.parse(rawEdit) : rawEdit;
          if (JSON.stringify(parsed) !== JSON.stringify(proposed.params[key])) changed = true;
          merged[key] = parsed;
        }
        if (changed) override_params = { tool: proposed.tool, params: merged };
      }
      await api.post(`/agent/approvals/${id}/decide`, { approve, override_params });
      await load();
      onChanged?.();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const retry = async (id) => {
    setBusy(id);
    try {
      await api.post(`/agent/approvals/${id}/retry`);
      await load();
      onChanged?.();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section
      title="אישורים והתערבויות"
      actions={
        <select className="text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 px-2 py-1" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">ממתינים + נכשלו</option>
          <option value="pending">ממתינים בלבד</option>
          <option value="failed">נכשלו בלבד</option>
          <option value="all">הכול</option>
        </select>
      }
    >
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        פעולות שיואב רוצה לבצע במצב "באישור", ובקשות התערבות כשהוא לא בטוח. אותם כפתורים מגיעים גם בטלגרם.
      </p>
      {rows.length === 0 ? (
        <Empty>אין כרגע בקשות</Empty>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => {
            const [label, cls] = STATUS[a.status] || [a.status, ''];
            const isFailed = a.status === 'failed';
            const isPending = a.status === 'pending';
            const editableFields = isPending && a.proposed?.tool ? (EDITABLE_TOOLS[a.proposed.tool] || null) : null;

            return (
              <div
                key={a.id}
                className={`p-4 rounded-lg border ${isFailed ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className={a.kind === 'intervention' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300'}>
                      {a.kind === 'intervention' ? 'התערבות' : 'פעולה'}
                    </Badge>
                    <span className="font-medium text-gray-900 dark:text-white">{a.title}</span>
                    <Badge className={cls}>{label}</Badge>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(a.created_at)}</span>
                </div>
                {a.details && <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{a.details}</p>}

                {/* Editable params (e.g. save_fix_note) — shown instead of raw JSON */}
                {editableFields ? (
                  <div className="mt-3 space-y-2">
                    {editableFields.map((field) => {
                      const key = field.key;
                      const isJson = field.type === 'json';
                      const rawVal = a.proposed?.params?.[key];
                      const defaultVal = isJson ? JSON.stringify(rawVal, null, 2) : (rawVal || '');
                      return (
                        <div key={key}>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{key}</label>
                          <textarea
                            rows={isJson ? 12 : 4}
                            className={`${input} resize-y${isJson ? ' font-mono text-xs' : ''}`}
                            value={edits[a.id]?.[key] ?? defaultVal}
                            onChange={(e) => setEdit(a.id, key, e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : a.proposed ? (
                  <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 p-2 rounded overflow-x-auto" dir="ltr">
                    {JSON.stringify(a.proposed, null, 2)}
                  </pre>
                ) : null}

                {isFailed && (
                  <div className="mt-2 flex items-center gap-1.5 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>הפעולה נכשלה בביצוע — ייתכן שהתיקון ב-Wix טרם פורסם</span>
                  </div>
                )}
                {isPending ? (
                  <div className="mt-3 flex gap-2">
                    {a.kind === 'action' ? (
                      <>
                        <button disabled={busy === a.id} onClick={() => decide(a.id, true, a.proposed)} className={btnSuccess}><Check className="w-4 h-4" /> אשר ובצע</button>
                        <button disabled={busy === a.id} onClick={() => decide(a.id, false, a.proposed)} className={btnDanger}><X className="w-4 h-4" /> דחה</button>
                      </>
                    ) : (
                      <>
                        <button disabled={busy === a.id} onClick={() => decide(a.id, true, a.proposed)} className={btnSuccess}><Check className="w-4 h-4" /> טופל</button>
                        <button disabled={busy === a.id} onClick={() => decide(a.id, false, a.proposed)} className={btnGhost}>התעלם</button>
                      </>
                    )}
                  </div>
                ) : isFailed ? (
                  <div className="mt-3 flex gap-2">
                    <button disabled={busy === a.id} onClick={() => retry(a.id)} className={btnPrimary}>
                      <RefreshCw className="w-4 h-4" /> נסה שוב
                    </button>
                  </div>
                ) : (
                  a.decided_by && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{a.decided_by} · {fmtDate(a.decided_at)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
};

export default ApprovalsTab;
