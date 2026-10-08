import React, { useEffect, useState, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import api from '../../utils/api';
import { Section, Empty, Badge, btnSuccess, btnDanger, btnGhost, fmtDate, errMsg } from './ui';

const STATUS = {
  pending: ['ממתין', 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'],
  approved: ['אושר — בביצוע', 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'],
  executed: ['בוצע', 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'],
  rejected: ['נדחה', 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'],
  expired: ['פג תוקף', 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'],
  failed: ['נכשל', 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'],
};

const ApprovalsTab = ({ onChanged }) => {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('pending');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api.get('/agent/approvals', { params: { status } });
    setRows(data);
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const decide = async (id, approve) => {
    setBusy(id);
    try {
      await api.post(`/agent/approvals/${id}/decide`, { approve });
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
          <option value="pending">ממתינים</option>
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
            return (
              <div key={a.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
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
                {a.proposed && (
                  <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 p-2 rounded overflow-x-auto" dir="ltr">
                    {JSON.stringify(a.proposed, null, 2)}
                  </pre>
                )}
                {a.status === 'pending' ? (
                  <div className="mt-3 flex gap-2">
                    {a.kind === 'action' ? (
                      <>
                        <button disabled={busy === a.id} onClick={() => decide(a.id, true)} className={btnSuccess}><Check className="w-4 h-4" /> אשר ובצע</button>
                        <button disabled={busy === a.id} onClick={() => decide(a.id, false)} className={btnDanger}><X className="w-4 h-4" /> דחה</button>
                      </>
                    ) : (
                      <>
                        <button disabled={busy === a.id} onClick={() => decide(a.id, true)} className={btnSuccess}><Check className="w-4 h-4" /> טופל</button>
                        <button disabled={busy === a.id} onClick={() => decide(a.id, false)} className={btnGhost}>התעלם</button>
                      </>
                    )}
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
