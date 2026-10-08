import React, { useState } from 'react';
import { Power, ShieldCheck, AlertTriangle, Inbox, ClipboardCheck } from 'lucide-react';
import api from '../../utils/api';
import ConfirmDialog from '../common/ConfirmDialog';
import { Section, MODE_LABEL, MODE_HINT, fmtUsd, fmtDate, errMsg } from './ui';

const Meter = ({ label, value, max }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary-500';
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-900 dark:text-white tabular-nums" dir="ltr">
          {fmtUsd(value)} / {fmtUsd(max)}
        </span>
      </div>
      <div className="h-2 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, tone = 'gray', onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-right p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors w-full"
  >
    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <Icon className={`w-4 h-4 ${tone === 'red' ? 'text-red-500' : tone === 'blue' ? 'text-blue-500' : 'text-gray-400'}`} />
      {label}
    </div>
    <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{value}</div>
  </button>
);

const OverviewTab = ({ overview, tasks, reload, goTo }) => {
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  if (!overview) return null;
  const s = overview.settings;

  const save = async (patch) => {
    setSaving(true);
    try {
      await api.put('/agent/settings', patch);
      await reload();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  };

  const agreementRows = (overview.agreement || []).filter((a) => a.reviewed > 0);

  return (
    <div className="space-y-6">
      {/* Kill switch + mode */}
      <Section title="מצב הסוכן">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                <Power className={`w-5 h-5 ${s.enabled ? 'text-green-500' : 'text-gray-400'}`} />
                {s.enabled ? 'יואב פעיל' : 'יואב כבוי'}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">כיבוי עוצר מיד את כל המשימות. דבר לא נמחק.</p>
            </div>
            <button
              disabled={saving}
              onClick={() =>
                setConfirm({
                  title: s.enabled ? 'לכבות את יואב?' : 'להפעיל את יואב?',
                  message: s.enabled ? 'כל המשימות ייעצרו עד להפעלה מחדש.' : `יואב יחזור לעבוד במצב "${MODE_LABEL[s.global_mode]}".`,
                  onConfirm: () => save({ enabled: !s.enabled }),
                  danger: s.enabled,
                })
              }
              className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${s.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              aria-label="מתג הפעלה"
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${s.enabled ? 'right-1' : 'right-6'}`} />
            </button>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white mb-2">
              <ShieldCheck className="w-5 h-5 text-primary-500" />
              תקרת אוטונומיה כללית
            </div>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-md bg-gray-100 dark:bg-gray-900">
              {['shadow', 'approve', 'auto'].map((m) => (
                <button
                  key={m}
                  disabled={saving}
                  onClick={() =>
                    m === s.global_mode
                      ? null
                      : setConfirm({
                          title: `לעבור למצב "${MODE_LABEL[m]}"?`,
                          message: `${MODE_HINT[m]}. משימה לא יכולה לעבוד ברמה גבוהה מהתקרה הזו.`,
                          onConfirm: () => save({ global_mode: m }),
                          danger: m === 'auto',
                        })
                  }
                  className={`py-1.5 text-sm rounded ${
                    s.global_mode === m
                      ? 'bg-white dark:bg-gray-700 shadow font-medium text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {MODE_LABEL[m]}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{MODE_HINT[s.global_mode]}</p>
          </div>
        </div>
      </Section>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Stat icon={Inbox} label="ממתינים לאישורך" value={overview.pending_approvals} tone={overview.pending_approvals ? 'blue' : 'gray'} onClick={() => goTo('approvals')} />
        <Stat icon={ClipboardCheck} label="החלטות לבדיקה" value={overview.unreviewed_decisions} onClick={() => goTo('decisions')} />
        <Stat icon={AlertTriangle} label="כשלים ב-24 שעות" value={overview.failed_24h} tone={overview.failed_24h ? 'red' : 'gray'} onClick={() => goTo('log')} />
        <Stat icon={Power} label="פעילות אחרונה" value={<span className="text-base">{fmtDate(overview.last_activity)}</span>} onClick={() => goTo('log')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="עלויות">
          <div className="space-y-4">
            <Meter label="היום" value={overview.spend.today} max={Number(s.daily_budget_usd)} />
            <Meter label="החודש" value={overview.spend.month} max={Number(s.monthly_budget_usd)} />
            <p className="text-xs text-gray-500 dark:text-gray-400">בהגעה לתקרה יואב נעצר ושולח התראה. משנים את התקרות בלשונית הגדרות.</p>
          </div>
        </Section>

        <Section title="התאמה להחלטות שלך (14 יום)">
          {agreementRows.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              עדיין אין החלטות שבדקת. בלשונית "החלטות לבדיקה" מסמנים מה הייתה ההחלטה הנכונה, וכך רואים כאן כמה יואב מדייק לפני שמעלים רמת אוטונומיה.
            </p>
          ) : (
            <div className="space-y-3">
              {agreementRows.map((a) => {
                const pct = Math.round((100 * a.agreed) / a.reviewed);
                const task = tasks.find((t) => t.key === a.task_key);
                return (
                  <div key={a.task_key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{task?.name || a.task_key}</span>
                      <span className="tabular-nums text-gray-900 dark:text-white font-medium">
                        {pct}% <span className="text-gray-500 font-normal">({a.agreed}/{a.reviewed})</span>
                      </span>
                    </div>
                    <div className="h-2 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div className={`h-full ${pct >= 95 ? 'bg-green-500' : pct >= 80 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel="כן"
          onCancel={() => setConfirm(null)}
          onConfirm={confirm.onConfirm}
          confirmClassName={confirm.danger ? undefined : 'px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700'}
        />
      )}
    </div>
  );
};

export default OverviewTab;
