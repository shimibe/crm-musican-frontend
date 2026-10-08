import React, { useEffect, useState, useCallback } from 'react';
import { Bot, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import { MODE_LABEL } from '../components/agent/ui';
import OverviewTab from '../components/agent/OverviewTab';
import DecisionsTab from '../components/agent/DecisionsTab';
import ApprovalsTab from '../components/agent/ApprovalsTab';
import TasksTab from '../components/agent/TasksTab';
import InstructionsTab from '../components/agent/InstructionsTab';
import LogTab from '../components/agent/LogTab';
import SettingsTab from '../components/agent/SettingsTab';
import ServerTab from '../components/agent/ServerTab';

const TABS = [
  ['overview', 'סקירה'],
  ['decisions', 'החלטות לבדיקה'],
  ['approvals', 'אישורים'],
  ['tasks', 'משימות'],
  ['instructions', 'הוראות'],
  ['log', 'יומן'],
  ['server', 'שרת'],
  ['settings', 'הגדרות'],
];

const AgentYoav = () => {
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('agentYoavTab') || 'overview'; } catch { return 'overview'; }
  });
  const [overview, setOverview] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [meta, setMeta] = useState({ tools: [], models: [] });
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      const [o, t, m] = await Promise.all([api.get('/agent/overview'), api.get('/agent/tasks'), api.get('/agent/meta')]);
      setOverview(o.data);
      setTasks(t.data);
      setMeta(m.data);
      setError(null);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { try { localStorage.setItem('agentYoavTab', tab); } catch { /* ignore */ } }, [tab]);

  const s = overview?.settings;
  const counts = { decisions: overview?.unreviewed_decisions, approvals: overview?.pending_approvals };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">הסוכן יואב</h1>
            {s && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className={`inline-block w-2 h-2 rounded-full ml-1.5 ${s.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                {s.enabled ? 'פעיל' : 'כבוי'} · מצב {MODE_LABEL[s.global_mode]}
              </p>
            )}
          </div>
        </div>
        <button onClick={reload} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="רענון">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {s?.global_mode === 'shadow' && (
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-sm text-purple-800 dark:text-purple-300">
          🔎 מצב צל: יואב בודק ומחליט, אבל שום פעולה לא מבוצעת מול אמנים או לקוחות. ההחלטות שלו מחכות לבדיקה שלך.
        </div>
      )}
      {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}

      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <nav className="flex gap-6 -mb-px">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-1.5 ${
                tab === key
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {label}
              {counts[key] > 0 && (
                <span className="min-w-[1.25rem] px-1 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">{counts[key]}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && <OverviewTab overview={overview} tasks={tasks} reload={reload} goTo={setTab} />}
      {tab === 'decisions' && <DecisionsTab onChanged={reload} />}
      {tab === 'approvals' && <ApprovalsTab onChanged={reload} />}
      {tab === 'tasks' && <TasksTab tasks={tasks} meta={meta} reload={reload} />}
      {tab === 'instructions' && <InstructionsTab tasks={tasks} />}
      {tab === 'log' && <LogTab tasks={tasks} />}
      {tab === 'server' && <ServerTab />}
      {tab === 'settings' && <SettingsTab settings={s} reload={reload} />}
    </div>
  );
};

export default AgentYoav;
