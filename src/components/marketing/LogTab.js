import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../utils/api';
import { card, Empty, RUN_STATUS, fmtDate, fmtUsd, errMsg } from './ui';

function RunRow({ run }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const [statusLabel, statusColor] = RUN_STATUS[run.status] || [run.status, 'text-gray-500'];

  const expand = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (!detail) {
      setLoading(true);
      try {
        const r = await api.get(`/marketing/runs/${run.id}`);
        setDetail(r.data);
      } catch { /* ignore */ }
      setLoading(false);
    }
  };

  return (
    <div className={`${card} overflow-hidden`}>
      <button className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        onClick={expand}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>{statusLabel}</span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{run.task_key}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">{run.trigger} · {run.mode}</span>
          {run.summary && <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{run.summary}</span>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {run.cost_usd > 0 && <span className="text-xs text-gray-500 dark:text-gray-400">{fmtUsd(run.cost_usd)}</span>}
          <span className="text-xs text-gray-400 dark:text-gray-500">{fmtDate(run.started_at)}</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-3">
          {loading && <p className="text-xs text-gray-500 dark:text-gray-400">טוען...</p>}
          {run.error && <p className="text-xs text-red-600 dark:text-red-400">שגיאה: {run.error}</p>}
          {detail?.actions?.map((a) => (
            <div key={a.id} className="text-xs border-r-2 border-gray-200 dark:border-gray-700 pr-3">
              <span className="font-mono text-gray-600 dark:text-gray-400">{a.tool}</span>
              {a.status && <span className={`mr-2 ${a.status === 'ok' ? 'text-green-600 dark:text-green-400' : a.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>{a.status}</span>}
            </div>
          ))}
          {detail?.decisions?.map((d) => (
            <div key={d.id} className="text-xs bg-gray-50 dark:bg-gray-700/50 rounded p-2">
              <span className="font-medium text-gray-700 dark:text-gray-300">{d.decision}</span>
              {d.confidence != null && <span className="mr-2 text-gray-500 dark:text-gray-400">{Math.round(d.confidence * 100)}%</span>}
              {d.summary && <p className="text-gray-500 dark:text-gray-400 mt-0.5">{d.summary}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LogTab({ tick }) {
  const [runs, setRuns] = useState([]);
  const [taskFilter, setTaskFilter] = useState('');
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get('/marketing/runs', { params: { task_key: taskFilter || undefined, limit: 50 } })
      .then((r) => { setRuns(r.data); setErr(null); })
      .catch((e) => setErr(errMsg(e)));
  }, [tick, taskFilter]);

  const taskKeys = [...new Set(runs.map((r) => r.task_key))];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTaskFilter('')}
          className={`px-3 py-1.5 text-sm rounded-md border ${!taskFilter ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>
          הכל
        </button>
        {taskKeys.map((k) => (
          <button key={k} onClick={() => setTaskFilter(k)}
            className={`px-3 py-1.5 text-sm rounded-md border ${taskFilter === k ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>
            {k}
          </button>
        ))}
      </div>
      {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
      {runs.length === 0 && <Empty>אין ריצות</Empty>}
      <div className="space-y-2">
        {runs.map((r) => <RunRow key={r.id} run={r} />)}
      </div>
    </div>
  );
}
