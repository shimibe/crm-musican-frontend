import React, { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import api from '../../utils/api';
import { Section, Empty, Badge, RUN_STATUS, ACTION_STATUS, MODE_LABEL, fmtDate, fmtUsd } from './ui';
import { DecisionCard } from './DecisionsTab';

export const RunDetail = ({ run, onChanged }) => {
  if (!run) return null;
  return (
    <div className="space-y-3">
      {run.error && <p className="text-sm text-red-600 dark:text-red-400">{run.error}</p>}
      {run.summary && <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{run.summary}</p>}
      {(run.decisions || []).map((d) => (
        <DecisionCard key={d.id} d={{ ...d, trigger: run.trigger, mode: run.mode }} onDone={onChanged} />
      ))}
      {(run.actions || []).length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-right">
                <th className="py-1 pl-3 font-medium">כלי</th>
                <th className="py-1 pl-3 font-medium">סטטוס</th>
                <th className="py-1 font-medium">פרמטרים</th>
              </tr>
            </thead>
            <tbody>
              {run.actions.map((a) => {
                const [label, cls] = ACTION_STATUS[a.status] || [a.status, ''];
                return (
                  <tr key={a.id} className="border-t border-gray-100 dark:border-gray-700 align-top">
                    <td className="py-1.5 pl-3 font-mono text-gray-800 dark:text-gray-200" dir="ltr">{a.tool}</td>
                    <td className={`py-1.5 pl-3 whitespace-nowrap ${cls}`}>{label}</td>
                    <td className="py-1.5 font-mono text-gray-500 dark:text-gray-400 break-all" dir="ltr">
                      {JSON.stringify(a.params).slice(0, 220)}
                      {a.result?.error && <div className="text-red-500">{a.result.error}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const RunRow = ({ r, taskName }) => {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const fetchDetail = useCallback(async () => {
    setDetail((await api.get(`/agent/runs/${r.id}`)).data);
  }, [r.id]);
  const toggle = async () => {
    if (!open && !detail) await fetchDetail();
    setOpen((v) => !v);
  };
  const [label, cls] = RUN_STATUS[r.status] || [r.status, ''];
  return (
    <>
      <tr className="border-t border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40" onClick={toggle}>
        <td className="py-2 pl-2">{open ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}</td>
        <td className="py-2 pl-3 whitespace-nowrap text-gray-500 dark:text-gray-400">{fmtDate(r.started_at)}</td>
        <td className="py-2 pl-3 text-gray-900 dark:text-white">{taskName}</td>
        <td className="py-2 pl-3"><Badge className={cls}>{label}</Badge></td>
        <td className="py-2 pl-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
          {r.trigger === 'dry_run' ? 'בדיקה יבשה' : MODE_LABEL[r.mode]}
        </td>
        <td className="py-2 pl-3 text-gray-700 dark:text-gray-300 max-w-md truncate">{r.error || r.summary}</td>
        <td className="py-2 tabular-nums text-gray-500 dark:text-gray-400" dir="ltr">{fmtUsd(r.cost_usd)}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="p-4 bg-gray-50 dark:bg-gray-900/40">
            {detail ? <RunDetail run={detail} onChanged={fetchDetail} /> : 'טוען…'}
          </td>
        </tr>
      )}
    </>
  );
};

const AuditList = () => {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get('/agent/audit', { params: { limit: 50 } }).then((r) => setRows(r.data)); }, []);
  if (!rows.length) return <Empty>אין שינויים</Empty>;
  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
      {rows.map((a) => (
        <li key={a.id} className="py-2 flex flex-wrap gap-x-3 text-gray-700 dark:text-gray-300">
          <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(a.changed_at)}</span>
          <span className="font-medium">{a.changed_by}</span>
          <span>{{ INSERT: 'הוסיף', UPDATE: 'עדכן', DELETE: 'מחק' }[a.op]}</span>
          <span className="font-mono text-xs" dir="ltr">{a.table_name}/{a.row_key}</span>
        </li>
      ))}
    </ul>
  );
};

const LogTab = ({ tasks }) => {
  const [rows, setRows] = useState([]);
  const [taskKey, setTaskKey] = useState('');
  const [view, setView] = useState('runs');

  const load = useCallback(async () => {
    const { data } = await api.get('/agent/runs', { params: { task_key: taskKey || undefined, limit: 100 } });
    setRows(data);
  }, [taskKey]);
  useEffect(() => { load(); }, [load]);

  const name = (k) => tasks.find((t) => t.key === k)?.name || k;

  return (
    <Section
      title={view === 'runs' ? 'יומן ריצות' : 'היסטוריית שינויים בהגדרות'}
      actions={
        <>
          {view === 'runs' && (
            <select className="text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 px-2 py-1" value={taskKey} onChange={(e) => setTaskKey(e.target.value)}>
              <option value="">כל המשימות</option>
              {tasks.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
          )}
          <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline" onClick={() => setView(view === 'runs' ? 'audit' : 'runs')}>
            {view === 'runs' ? 'מי שינה מה' : 'חזרה לריצות'}
          </button>
        </>
      }
    >
      {view === 'audit' ? (
        <AuditList />
      ) : rows.length === 0 ? (
        <Empty>עוד לא היו ריצות</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400">
                <th />
                <th className="py-2 pl-3 font-medium">זמן</th>
                <th className="py-2 pl-3 font-medium">משימה</th>
                <th className="py-2 pl-3 font-medium">סטטוס</th>
                <th className="py-2 pl-3 font-medium">מצב</th>
                <th className="py-2 pl-3 font-medium">תוצאה</th>
                <th className="py-2 font-medium">עלות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => <RunRow key={r.id} r={r} taskName={name(r.task_key)} />)}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
};

export default LogTab;
