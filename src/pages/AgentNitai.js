import React, { useEffect, useState, useCallback } from 'react';
import { Megaphone, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import { MODE_LABEL } from '../components/marketing/ui';
import OverviewTab   from '../components/marketing/OverviewTab';
import PostsTab      from '../components/marketing/PostsTab';
import ApprovalsTab  from '../components/marketing/ApprovalsTab';
import TasksTab      from '../components/marketing/TasksTab';
import SettingsTab    from '../components/marketing/SettingsTab';
import LogTab         from '../components/marketing/LogTab';
import PlaceholderTab  from '../components/marketing/PlaceholderTab';
import CharactersTab   from '../components/marketing/CharactersTab';

const TABS = [
  ['overview',   'סקירה'],
  ['posts',      'פוסטים'],
  ['approvals',  'אישורים'],
  ['campaigns',  'קמפיינים'],
  ['analytics',  'אנליטיקס'],
  ['sales',      'מכירות'],
  ['ads',        'מודעות'],
  ['costs',      'עלויות'],
  ['tasks',      'משימות'],
  ['characters', 'דמויות'],
  ['settings',   'הגדרות'],
  ['log',        'לוג'],
];

const AgentNitai = () => {
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('agentNitaiTab') || 'overview'; } catch { return 'overview'; }
  });
  const [overview, setOverview] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(async () => {
    setTick((t) => t + 1);
    try {
      const [o, t] = await Promise.all([api.get('/marketing/overview'), api.get('/marketing/tasks')]);
      setOverview(o.data);
      setTasks(t.data);
      setError(null);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { try { localStorage.setItem('agentNitaiTab', tab); } catch { /* ignore */ } }, [tab]);

  const s = overview?.settings;
  const counts = {
    posts:     overview?.pending_review,
    approvals: overview?.pending_approvals,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">הסוכן ניתאי</h1>
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

      {/* Shadow mode banner */}
      {s?.global_mode === 'shadow' && (
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-sm text-purple-800 dark:text-purple-300">
          🔎 מצב צל: ניתאי יוצר תוכן ומחליט, אבל שום פרסום לא מתבצע בפועל. ההחלטות שלו מחכות לבדיקה שלך.
        </div>
      )}

      {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">{error}</div>}

      {/* Tabs */}
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
                <span className="min-w-[1.25rem] px-1 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'overview'  && <OverviewTab  overview={overview} tasks={tasks} reload={reload} goTo={setTab} />}
      {tab === 'posts'     && <PostsTab />}
      {tab === 'approvals' && <ApprovalsTab onChanged={reload} tick={tick} />}
      {tab === 'tasks'      && <TasksTab tasks={tasks} reload={reload} />}
      {tab === 'characters' && <CharactersTab reload={reload} />}
      {tab === 'settings'   && <SettingsTab settings={s} reload={reload} />}
      {tab === 'log'       && <LogTab tick={tick} />}

      {/* Placeholder tabs — future phases */}
      {tab === 'campaigns' && (
        <PlaceholderTab title="ניהול קמפיינים" phase="Phase 1 — זמין" description="יצירת קמפיינים, שיוך פוסטים, מעקב תוצאות. ניתן לנהל דרך API. ממשק גרפי — בקרוב." />
      )}
      {tab === 'analytics' && (
        <PlaceholderTab title="אנליטיקס" phase="Phase 2" description="גרפים: reach, engagement, השוואת פלטפורמות, top posts. יהיה זמין לאחר חיבור Meta Graph API." />
      )}
      {tab === 'sales' && (
        <PlaceholderTab title="מתאם מכירות" phase="Phase 4" description="קורלציה בין פרסום פוסטים למכירות ב-CRM, שיעורי המרה, ROI." />
      )}
      {tab === 'ads' && (
        <PlaceholderTab title="מודעות ממומנות" phase="Phase 4" description="הצעות boost עם עלות משוערת ו-conversion rate, ניהול קמפיינים פעילים, כפתור עצירה." />
      )}
      {tab === 'costs' && (
        <PlaceholderTab title="מעקב עלויות" phase="Phase 2" description="עלות חודשית (LLM + Canva + video + ads), טבלת עלות לפי פוסט, אומדנים לפני יצירה ולפני קמפיין." />
      )}
    </div>
  );
};

export default AgentNitai;
