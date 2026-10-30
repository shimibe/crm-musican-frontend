import React from 'react';
import { Image, Clock, CheckCircle, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { card, MODE_LABEL, fmtDate, fmtUsd, fmtNum, PostStatusBadge, PLATFORM_EMOJI } from './ui';

const KPI = ({ icon: Icon, label, value, sub, color = 'text-primary-600 dark:text-primary-400' }) => (
  <div className={`${card} p-5 flex items-start gap-4`}>
    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export default function OverviewTab({ overview, tasks, reload, goTo }) {
  if (!overview) return null;
  const s = overview.settings || {};
  const spend = overview.spend || {};
  const metrics = overview.metrics || {};

  return (
    <div className="space-y-6">
      {/* Kill switch + mode */}
      <div className={`${card} p-5 flex flex-wrap items-center justify-between gap-4`}>
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">בקרה כללית</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            מצב: <strong>{MODE_LABEL[s.global_mode] || s.global_mode}</strong>
            &nbsp;·&nbsp;תקציב יומי: <strong>{fmtUsd(s.daily_budget_usd)}</strong>
            &nbsp;·&nbsp;חודשי: <strong>{fmtUsd(s.monthly_budget_usd)}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-300">{s.enabled ? 'פעיל' : 'כבוי'}</span>
          <div className={`relative w-10 h-5 rounded-full overflow-hidden ${s.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'} cursor-not-allowed`}
               title="שנה ב-הגדרות">
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${s.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </div>
      </div>

      {/* Spend this month */}
      {(spend.month > 0 || spend.today > 0) && (
        <div className="text-sm text-gray-500 dark:text-gray-400 flex gap-4">
          <span>עלות היום: <strong className="text-gray-800 dark:text-gray-100">{fmtUsd(spend.today)}</strong></span>
          <span>עלות החודש: <strong className="text-gray-800 dark:text-gray-100">{fmtUsd(spend.month)}</strong></span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={Image}       label="פוסטים החודש"      value={overview.posts_this_month ?? 0} />
        <KPI icon={Clock}       label="ממתינים לאישור"     value={overview.pending_review ?? 0}
             color="text-yellow-600 dark:text-yellow-400"
             sub={overview.pending_review > 0 ? 'לחץ לטאב פוסטים' : undefined} />
        <KPI icon={CheckCircle} label="אישורי ניתאי"       value={overview.pending_approvals ?? 0}
             color="text-blue-600 dark:text-blue-400" />
        <KPI icon={TrendingUp}  label="חשיפות החודש"       value={fmtNum(metrics.total_impressions)}
             sub={metrics.total_reach ? `reach: ${fmtNum(metrics.total_reach)}` : undefined} />
      </div>

      {/* Last activity */}
      {overview.last_activity && (
        <p className="text-xs text-gray-400 dark:text-gray-500">פעילות אחרונה: {fmtDate(overview.last_activity)}</p>
      )}

      {/* Recent posts */}
      {overview.recentPosts?.length > 0 && (
        <div className={card}>
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">פוסטים אחרונים</h2>
            <button onClick={() => goTo?.('posts')} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">כל הפוסטים</button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {overview.recentPosts.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{p.text_content || '—'}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <PostStatusBadge value={p.status} />
                    {(p.platforms || []).map((pl) => (
                      <span key={pl} className="text-xs text-gray-500 dark:text-gray-400">{PLATFORM_EMOJI[pl]} {pl}</span>
                    ))}
                    {p.platform_results?.filter((r) => r.post_url).map((r) => (
                      <a key={r.platform} href={r.post_url} target="_blank" rel="noopener noreferrer"
                         className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                        🔗 {r.platform}
                      </a>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400 dark:text-gray-500">{fmtDate(p.published_at || p.created_at)}</p>
                  {p.actual_cost_usd > 0 && <p className="text-xs text-gray-500 dark:text-gray-400">{fmtUsd(p.actual_cost_usd)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {overview.failed_24h > 0 && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {overview.failed_24h} ריצות נכשלו ב-24 שעות האחרונות — בדוק לוג
        </div>
      )}
    </div>
  );
}
