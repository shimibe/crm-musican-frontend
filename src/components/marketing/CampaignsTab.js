import React, { useEffect, useState, useCallback } from 'react';
import { Plus, X, ChevronLeft } from 'lucide-react';
import api from '../../utils/api';
import {
  card, input, btnPrimary, btnGhost, btnDanger,
  Section, PostStatusBadge, PLATFORM_EMOJI, PLATFORM_LABEL,
  fmtDate, errMsg,
} from './ui';

const CAMPAIGN_STATUS_LABEL = {
  planning: '📋 תכנון',
  active: '🟢 פעיל',
  paused: '⏸ מושהה',
  ended: '✅ הסתיים',
};

const GOAL_OPTIONS = [
  { value: 'conversion',  label: 'המרה (רכישה / הרשמה)' },
  { value: 'awareness',   label: 'מודעות / חשיפה' },
  { value: 'engagement',  label: 'מעורבות / עניין' },
  { value: 'retention',   label: 'שימור לקוחות' },
];

const ALL_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'youtube'];

function ConversionBadge({ score }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const color = score >= 0.7
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : score >= 0.4
      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      ● {pct}%
    </span>
  );
}

// ── Create campaign modal ──────────────────────────────────────────────────
function CreateCampaignModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', goal: 'awareness', start_date: '', end_date: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    if (!form.name.trim()) { setErr('חסר שם קמפיין'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/marketing/campaigns', form);
      onCreated(data);
    } catch (e) {
      setErr(errMsg(e));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">קמפיין חדש</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">שם הקמפיין *</label>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="למשל: השקת מוזיקן פרו" className={input} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">מטרה</label>
            <select value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))} className={input}>
              {GOAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">מ-תאריך</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className={input} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">עד תאריך</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} className={input} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">הערות (אופציונלי)</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="תיאור קצר של הקמפיין" className={input} />
          </div>
          {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className={btnGhost}>ביטול</button>
            <button onClick={submit} disabled={saving} className={btnPrimary}>{saving ? 'שומר...' : 'צור קמפיין'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Campaign detail ─────────────────────────────────────────────────────────
function CampaignDetail({ campaign, onBack, onUpdated }) {
  const [activeTab, setActiveTab] = useState('brief');
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [brief, setBrief] = useState({
    topic: '', message: '', call_to_action: '', post_count: 5,
    platforms: ['instagram', 'facebook'], start_date: campaign.start_date?.slice(0, 10) || '',
    end_date: campaign.end_date?.slice(0, 10) || '', special_instructions: '',
  });
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState(null);
  const [briefErr, setBriefErr] = useState(null);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const { data } = await api.get(`/marketing/campaigns/${campaign.id}/posts`);
      setPosts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setPostsLoading(false);
    }
  }, [campaign.id]);

  useEffect(() => {
    if (activeTab === 'posts') loadPosts();
  }, [activeTab, loadPosts]);

  const togglePlatform = (pl) =>
    setBrief((b) => ({ ...b, platforms: b.platforms.includes(pl) ? b.platforms.filter((p) => p !== pl) : [...b.platforms, pl] }));

  const sendBrief = async () => {
    if (!brief.topic.trim()) { setBriefErr('חסר נושא'); return; }
    setSending(true);
    setBriefErr(null);
    try {
      await api.post(`/marketing/campaigns/${campaign.id}/brief`, brief);
      setSentMsg(`✅ הבריף נשלח לניתאי! הוא יתחיל לעבוד תוך מספר דקות. הפוסטים יופיעו בטאב "פוסטים".`);
    } catch (e) {
      setBriefErr(errMsg(e));
    } finally {
      setSending(false);
    }
  };

  const approveAll = async () => {
    const pending = posts.filter((p) => p.status === 'pending_review');
    if (!pending.length) return;
    if (!window.confirm(`לאשר ${pending.length} פוסטים?`)) return;
    await Promise.all(pending.map((p) => api.post(`/marketing/posts/${p.id}/approve`).catch(() => {})));
    loadPosts();
  };

  return (
    <div>
      <button onClick={onBack} className={`${btnGhost} mb-4 flex items-center gap-1`}>
        <ChevronLeft className="w-4 h-4" />חזרה לקמפיינים
      </button>

      <div className={`${card} p-5 mb-4`}>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {CAMPAIGN_STATUS_LABEL[campaign.status] || campaign.status}
              {campaign.start_date && ` · ${fmtDate(campaign.start_date)}`}
              {campaign.end_date && ` — ${fmtDate(campaign.end_date)}`}
              {campaign.goal && ` · ${GOAL_OPTIONS.find((o) => o.value === campaign.goal)?.label || campaign.goal}`}
            </p>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{campaign.post_count ?? 0} פוסטים</span>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {[['brief', '📋 בריף לניתאי'], ['posts', `📄 פוסטים (${campaign.post_count ?? 0})`]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>{label}</button>
        ))}
      </div>

      {activeTab === 'brief' && (
        <div className={`${card} p-5 space-y-4`}>
          {sentMsg ? (
            <p className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">{sentMsg}</p>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                מלא את הבריף ולחץ "שלח לניתאי" — הוא יתכנן שרשרת פוסטים ויפצל לפלטפורמות לפי צורך.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">נושא הקמפיין *</label>
                <input type="text" value={brief.topic} onChange={(e) => setBrief((b) => ({ ...b, topic: e.target.value }))}
                  placeholder="למשל: השקת מוזיקן פרו, בלאק פריידי, טיפים להפצה" className={input} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">מסר מרכזי</label>
                <textarea rows={2} value={brief.message} onChange={(e) => setBrief((b) => ({ ...b, message: e.target.value }))}
                  placeholder="מה אתה רוצה שהקהל ישמע ויזכור?" className={input} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">קריאה לפעולה (CTA)</label>
                <input type="text" value={brief.call_to_action} onChange={(e) => setBrief((b) => ({ ...b, call_to_action: e.target.value }))}
                  placeholder="לרכוש מנוי / לשמוע / להירשם / לפנות" className={input} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">מספר פוסטים</label>
                  <input type="number" min={2} max={10} value={brief.post_count}
                    onChange={(e) => setBrief((b) => ({ ...b, post_count: Number(e.target.value) }))} className={input} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">פלטפורמות</label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ALL_PLATFORMS.map((pl) => (
                      <button key={pl} type="button" onClick={() => togglePlatform(pl)}
                        className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                          brief.platforms.includes(pl)
                            ? 'bg-primary-600 border-primary-600 text-white'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                        }`}>
                        {PLATFORM_EMOJI[pl]} {PLATFORM_LABEL[pl]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">מ-תאריך</label>
                  <input type="date" value={brief.start_date} onChange={(e) => setBrief((b) => ({ ...b, start_date: e.target.value }))} className={input} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">עד תאריך</label>
                  <input type="date" value={brief.end_date} onChange={(e) => setBrief((b) => ({ ...b, end_date: e.target.value }))} className={input} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">הוראות מיוחדות (אופציונלי)</label>
                <textarea rows={3} value={brief.special_instructions}
                  onChange={(e) => setBrief((b) => ({ ...b, special_instructions: e.target.value }))}
                  placeholder="מידע ייחודי לקמפיין זה: מחירים, תאריכים מיוחדים, קהל ספציפי, קישורים..." className={input} />
              </div>
              {briefErr && <p className="text-sm text-red-600 dark:text-red-400">{briefErr}</p>}
              <div className="flex justify-end">
                <button onClick={sendBrief} disabled={sending} className={btnPrimary}>
                  {sending ? 'שולח...' : '🤖 שלח לניתאי ▶'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'posts' && (
        <div className="space-y-3">
          {postsLoading && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">טוען פוסטים...</p>}
          {!postsLoading && posts.length === 0 && (
            <div className={`${card} p-6 text-center`}>
              <p className="text-gray-500 dark:text-gray-400 text-sm">אין פוסטים עדיין — שלח בריף לניתאי מהטאב "בריף לניתאי"</p>
            </div>
          )}
          {posts.length > 0 && (
            <>
              {posts.filter((p) => p.status === 'pending_review').length > 0 && (
                <div className="flex justify-end">
                  <button onClick={approveAll} className={btnPrimary}>
                    ✓ אשר הכל ({posts.filter((p) => p.status === 'pending_review').length})
                  </button>
                </div>
              )}
              {posts.map((post) => (
                <div key={post.id} className={`${card} p-4`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <PostStatusBadge value={post.status} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{post.content_type}</span>
                      {(post.platforms || []).map((pl) => (
                        <span key={pl} className="text-xs">{PLATFORM_EMOJI[pl]}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      {post.conversion_score != null && (
                        <ConversionBadge score={post.conversion_score} />
                      )}
                      {post.scheduled_at && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">📅 {fmtDate(post.scheduled_at)}</span>
                      )}
                    </div>
                  </div>
                  {post.text_content && (
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-3 whitespace-pre-wrap">{post.text_content}</p>
                  )}
                  {post.conversion_reasoning && (
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 italic">{post.conversion_reasoning}</p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main CampaignsTab ───────────────────────────────────────────────────────
export default function CampaignsTab() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/marketing/campaigns${filterStatus ? `?status=${filterStatus}` : ''}`);
      setCampaigns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  if (selected) {
    return (
      <CampaignDetail
        campaign={selected}
        onBack={() => { setSelected(null); load(); }}
        onUpdated={load}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-1">
          {[['', 'הכל'], ['planning', '📋'], ['active', '🟢'], ['paused', '⏸'], ['ended', '✅']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatus(val)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                filterStatus === val
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}>{label}</button>
          ))}
        </div>
        <button onClick={() => setCreating(true)} className={`${btnPrimary} flex items-center gap-1`}>
          <Plus className="w-4 h-4" />קמפיין חדש
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">טוען...</p>}
      {!loading && campaigns.length === 0 && (
        <div className={`${card} p-8 text-center`}>
          <p className="text-gray-500 dark:text-gray-400">אין קמפיינים עדיין</p>
          <button onClick={() => setCreating(true)} className={`${btnPrimary} mt-3`}>יצירת קמפיין ראשון</button>
        </div>
      )}

      <div className="space-y-2">
        {campaigns.map((c) => (
          <button key={c.id} onClick={() => setSelected(c)}
            className={`${card} w-full text-right p-4 hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {CAMPAIGN_STATUS_LABEL[c.status] || c.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                {c.start_date && <span>{fmtDate(c.start_date)}{c.end_date ? ` — ${fmtDate(c.end_date)}` : ''}</span>}
                <span>{c.post_count ?? 0} פוסטים</span>
              </div>
            </div>
            {c.goal && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
                {GOAL_OPTIONS.find((o) => o.value === c.goal)?.label || c.goal}
              </p>
            )}
          </button>
        ))}
      </div>

      {creating && (
        <CreateCampaignModal
          onClose={() => setCreating(false)}
          onCreated={(newC) => { setCreating(false); setCampaigns((prev) => [newC, ...prev]); setSelected(newC); }}
        />
      )}
    </div>
  );
}
