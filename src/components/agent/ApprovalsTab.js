import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Check, X, RefreshCw, AlertCircle, ChevronDown, ChevronLeft } from 'lucide-react';
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

const EDITABLE_TOOLS = {
  'musican.save_fix_note':       [{ key: 'note',    type: 'text' }],
  'musican.update_release_data': [{ key: 'changes', type: 'json' }],
};

// Parse "ריליס 174 · Artist – Title" → { artist, title }
function parseReleaseDetails(details) {
  if (!details) return {};
  const m = details.match(/^ריליס \S+ · (.+?) – (.+)$/);
  if (m) return { artist: m[1].trim(), title: m[2].trim() };
  return {};
}

// ── Single approval card ────────────────────────────────────────────────────
const ApprovalCard = ({ a, hideDetails, onDecide, onRetry, onDismiss, busy, edits, setEdit }) => {
  const [open, setOpen] = useState(false);
  const [label, cls] = STATUS[a.status] || [a.status, ''];
  const isFailed  = a.status === 'failed';
  const isPending = a.status === 'pending';
  const editableFields = isPending && a.proposed?.tool ? (EDITABLE_TOOLS[a.proposed.tool] || null) : null;
  const hasBody = editableFields || a.proposed || (!hideDetails && a.details);

  return (
    <div className={`rounded-lg border ${isFailed ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
      {/* ── Header row — always visible ── */}
      <button
        className="w-full p-3 flex items-center gap-2 text-right hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg"
        onClick={() => hasBody && setOpen((v) => !v)}
        style={{ cursor: hasBody ? 'pointer' : 'default' }}
      >
        {hasBody
          ? (open ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronLeft className="w-4 h-4 text-gray-400 shrink-0" />)
          : <span className="w-4 h-4 shrink-0" />
        }
        <Badge className={a.kind === 'intervention' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300'}>
          {a.kind === 'intervention' ? 'התערבות' : 'פעולה'}
        </Badge>
        <span className="font-medium text-gray-900 dark:text-white flex-1 text-right">{a.title}</span>
        <Badge className={cls}>{label}</Badge>
        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{fmtDate(a.created_at)}</span>
      </button>

      {/* ── Expandable body ── */}
      {open && hasBody && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700/50">
          {!hideDetails && a.details && (
            <p className="mb-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{a.details}</p>
          )}
          {editableFields ? (
            <div className="space-y-2">
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
            <pre className="text-xs bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 p-2 rounded overflow-x-auto" dir="ltr">
              {JSON.stringify(a.proposed, null, 2)}
            </pre>
          ) : null}
        </div>
      )}

      {/* ── Action buttons — always visible ── */}
      <div className="px-4 pb-3">
        {isFailed && (
          <div className="flex items-center gap-1.5 text-sm text-red-700 dark:text-red-400 mb-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>הפעולה נכשלה — ייתכן שהתיקון ב-Wix טרם פורסם</span>
          </div>
        )}
        {isPending ? (
          <div className="flex gap-2">
            {a.kind === 'action' ? (
              <>
                <button disabled={busy === a.id} onClick={() => onDecide(a.id, true, a.proposed)} className={btnSuccess}><Check className="w-4 h-4" /> אשר ובצע</button>
                <button disabled={busy === a.id} onClick={() => onDecide(a.id, false, a.proposed)} className={btnDanger}><X className="w-4 h-4" /> דחה</button>
              </>
            ) : (
              <>
                <button disabled={busy === a.id} onClick={() => onDecide(a.id, true, a.proposed)} className={btnSuccess}><Check className="w-4 h-4" /> טופל</button>
                <button disabled={busy === a.id} onClick={() => onDecide(a.id, false, a.proposed)} className={btnGhost}>התעלם</button>
              </>
            )}
          </div>
        ) : isFailed ? (
          <div className="flex gap-2">
            <button disabled={busy === a.id} onClick={() => onRetry(a.id)} className={btnPrimary}><RefreshCw className="w-4 h-4" /> נסה שוב</button>
            <button disabled={busy === a.id} onClick={() => onDismiss(a.id)} className={btnGhost}><X className="w-4 h-4" /> בטל</button>
          </div>
        ) : (
          a.decided_by && <p className="text-xs text-gray-500 dark:text-gray-400">{a.decided_by} · {fmtDate(a.decided_at)}</p>
        )}
      </div>
    </div>
  );
};

// ── Main tab ────────────────────────────────────────────────────────────────
const ApprovalsTab = ({ onChanged, tick }) => {
  const [rows, setRows]     = useState([]);
  const [status, setStatus] = useState('active');
  const [busy, setBusy]     = useState(null);
  const [edits, setEdits]   = useState({});

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
      let override_params;
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
      await load(); onChanged?.();
    } catch (e) { alert(errMsg(e)); } finally { setBusy(null); }
  };

  const retry = async (id) => {
    setBusy(id);
    try { await api.post(`/agent/approvals/${id}/retry`); await load(); onChanged?.(); }
    catch (e) { alert(errMsg(e)); } finally { setBusy(null); }
  };

  const dismiss = async (id) => {
    setBusy(id);
    try { await api.post(`/agent/approvals/${id}/dismiss`); await load(); onChanged?.(); }
    catch (e) { alert(errMsg(e)); } finally { setBusy(null); }
  };

  // Group by release_id; __other for approvals without one
  const groups = useMemo(() => {
    const map = new Map();
    for (const a of rows) {
      const key = a.proposed?.params?.release_id || a.subject_id || '__other';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    }
    return [...map.entries()];
  }, [rows]);

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
        <div className="space-y-6">
          {groups.map(([key, items]) => {
            const isRelease = key !== '__other';
            // Extract artist + title from the first approval details in this group
            const { artist, title } = isRelease
              ? parseReleaseDetails(items.find((a) => a.details)?.details)
              : {};

            return (
              <div key={key}>
                {isRelease && (
                  <div className="flex items-baseline gap-2 mb-2 px-1">
                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 tabular-nums">#{key}</span>
                    {title && <span className="font-semibold text-gray-800 dark:text-gray-100">{title}</span>}
                    {artist && <span className="text-sm text-gray-500 dark:text-gray-400">{artist}</span>}
                  </div>
                )}
                <div className="space-y-2">
                  {items.map((a) => (
                    <ApprovalCard
                      key={a.id}
                      a={a}
                      hideDetails={isRelease}
                      onDecide={decide}
                      onRetry={retry}
                      onDismiss={dismiss}
                      busy={busy}
                      edits={edits}
                      setEdit={setEdit}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
};

export default ApprovalsTab;
