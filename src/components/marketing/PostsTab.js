import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Eye, Check, X, RotateCcw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../utils/api';
import {
  card, input, btnPrimary, btnGhost, btnDanger, btnSuccess,
  Section, Empty, PostStatusBadge, PLATFORM_EMOJI, PLATFORM_LABEL,
  POST_STATUS_LABEL, fmtDate, fmtUsd, errMsg,
} from './ui';

const STATUSES = [
  ['', 'הכל'],
  ['pending_review', 'ממתינים לאישור'],
  ['approved', 'אושרו'],
  ['scheduled', 'מתוזמנים'],
  ['published', 'פורסמו'],
  ['rejected', 'נדחו'],
];

const ALL_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'youtube'];

// ── Post preview modal ─────────────────────────────────────────────────────
function PreviewModal({ postId, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get(`/marketing/posts/${postId}/preview`)
      .then((r) => setData(r.data))
      .catch((e) => setErr(errMsg(e)));
  }, [postId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">תצוגה מקדימה</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
          {data && <>
            {data.image_url && (
              <img src={data.image_url} alt="post" className="w-full rounded-lg object-cover max-h-72" />
            )}
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{data.text_content || '—'}</p>
            <div className="flex flex-wrap gap-2">
              <PostStatusBadge value={data.status} />
              {(data.platforms || []).map((pl) => (
                <span key={pl} className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {PLATFORM_EMOJI[pl]} {PLATFORM_LABEL[pl] || pl}
                </span>
              ))}
            </div>
            {data.platform_results?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">סטטוס פרסום</p>
                <div className="space-y-1">
                  {data.platform_results.map((r) => (
                    <div key={r.platform} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{PLATFORM_EMOJI[r.platform]} {PLATFORM_LABEL[r.platform]}</span>
                      <div className="flex items-center gap-2">
                        {r.status === 'published' ? (
                          <span className="text-green-600 dark:text-green-400 text-xs">✅ פורסם</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 text-xs" title={r.error_message}>❌ נכשל</span>
                        )}
                        {r.post_url && (
                          <a href={r.post_url} target="_blank" rel="noopener noreferrer"
                             className="text-xs text-primary-600 dark:text-primary-400 hover:underline">פתח ↗</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.metrics?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">נתוני חשיפה</p>
                <div className="grid grid-cols-2 gap-2">
                  {data.metrics.map((m) => (
                    <div key={m.platform} className="text-xs bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                      <p className="font-medium text-gray-700 dark:text-gray-300">{PLATFORM_EMOJI[m.platform]} {PLATFORM_LABEL[m.platform]}</p>
                      <p className="text-gray-500 dark:text-gray-400">חשיפות: {m.impressions?.toLocaleString?.() || '—'}</p>
                      <p className="text-gray-500 dark:text-gray-400">לייקים: {m.likes?.toLocaleString?.() || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="text-xs text-gray-400 dark:text-gray-500 space-y-0.5">
              {data.estimated_cost_usd > 0 && <p>אומדן עלות יצירה: {fmtUsd(data.estimated_cost_usd)}</p>}
              {data.actual_cost_usd > 0 && <p>עלות בפועל: {fmtUsd(data.actual_cost_usd)}</p>}
              {data.campaign_name && <p>קמפיין: {data.campaign_name}</p>}
              <p>נוצר: {fmtDate(data.created_at)}</p>
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}

// ── Revise modal ──────────────────────────────────────────────────────────
function ReviseModal({ postId, onClose, onDone }) {
  const [prompt, setPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    if (!prompt.trim()) return;
    setSaving(true);
    try {
      await api.post(`/marketing/posts/${postId}/revise`, { correction_prompt: prompt });
      onDone();
    } catch (e) {
      setErr(errMsg(e));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">שלח תיקון לניתאי</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">תאר מה לשפר. ניתאי ייצור גרסה חדשה ויגיש לאישורך.</p>
          <textarea
            rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="לדוגמה: הטקסט ארוך מדי, קצר ל-3 שורות. הוסף hashtag #DiscoverIsrael."
            className={input}
          />
          {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className={btnGhost}>ביטול</button>
            <button onClick={submit} disabled={saving || !prompt.trim()} className={btnPrimary}>
              {saving ? 'שולח...' : 'שלח תיקון'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create post modal ─────────────────────────────────────────────────────
function CreatePostModal({ onClose, onDone, onCreated, addVideoJob }) {
  const [form, setForm] = useState({ text_content: '', image_url: '', platforms: [], scheduled_at: '', content_type: 'image_post', character_id: '', script_text: '', release_id: '' });
  const [characters, setCharacters] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const isVideo = form.content_type === 'ugc_video' || form.content_type === 'chen_video';

  useEffect(() => {
    if (isVideo && characters.length === 0) {
      api.get('/marketing/characters').then(({ data }) => setCharacters(data)).catch(() => {});
    }
  }, [isVideo]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlatform = (pl) =>
    setForm((f) => ({ ...f, platforms: f.platforms.includes(pl) ? f.platforms.filter((p) => p !== pl) : [...f.platforms, pl] }));

  const submit = async () => {
    setSaving(true);
    setErr(null);
    try {
      const { data: saved } = await api.post('/marketing/posts', {
        ...form,
        scheduled_at: form.scheduled_at || undefined,
        image_url: form.image_url || undefined,
        character_id: form.character_id ? Number(form.character_id) : undefined,
        script_text: form.script_text || undefined,
        release_id: form.release_id || undefined,
      });
      const typeLabel = form.content_type === 'ugc_video' ? 'סרטון UGC' : form.content_type === 'chen_video' ? 'סרטון חן' : 'תמונה';
      if (isVideo && form.script_text?.trim() && addVideoJob && saved?.id) {
        addVideoJob(saved.id, `${typeLabel} #${saved.id}`, { script_text: form.script_text.trim() });
      } else {
        onCreated && onCreated(`📝 פוסט חדש: ${typeLabel}`);
      }
      onDone();
    } catch (e) {
      setErr(errMsg(e));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">יצירת פוסט ידני</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">סוג תוכן</label>
            <select value={form.content_type} onChange={(e) => setForm((f) => ({ ...f, content_type: e.target.value }))} className={input}>
              <option value="image_post">🖼️ תמונה</option>
              <option value="release_announcement">🎵 הכרזת ריליס</option>
              <option value="weekly_releases">📅 פוסט שבועי</option>
              <option value="ugc_video">🎬 סרטון UGC (דמות AI)</option>
              <option value="chen_video">🎬 סרטון חן</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">טקסט הפוסט *</label>
            <textarea rows={4} value={form.text_content} onChange={(e) => setForm((f) => ({ ...f, text_content: e.target.value }))}
              placeholder="כתוב את הטקסט שיפורסם..." className={input} />
          </div>
          {isVideo && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">דמות לסרטון</label>
                <select value={form.character_id} onChange={(e) => setForm((f) => ({ ...f, character_id: e.target.value }))} className={input}>
                  <option value="">ברירת מחדל</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.provider})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">טקסט לאמירה (script)</label>
                <textarea rows={3} value={form.script_text} onChange={(e) => setForm((f) => ({ ...f, script_text: e.target.value }))}
                  placeholder="הטקסט שהדמות תאמר בסרטון... (עד 500 תווים)" maxLength={500} className={input} />
                <p className="text-xs text-gray-500 mt-1">{form.script_text.length}/500 תווים</p>
              </div>
            </>
          )}
          {form.content_type === 'release_announcement' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">מזהה הפצה (release_id)</label>
              <input type="text" value={form.release_id} onChange={(e) => setForm((f) => ({ ...f, release_id: e.target.value }))}
                placeholder="12345" className={input} />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">תמונת העטיפה תישלף אוטומטית ממוזיקן</p>
            </div>
          )}
          {!isVideo && form.content_type !== 'release_announcement' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">כתובת תמונה (URL)</label>
              <input type="url" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://..." className={input} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">פלטפורמות לפרסום *</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map((pl) => (
                <button key={pl} type="button" onClick={() => togglePlatform(pl)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    form.platforms.includes(pl)
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}>
                  {PLATFORM_EMOJI[pl]} {PLATFORM_LABEL[pl]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">תאריך + שעת פרסום (אופציונלי)</label>
            <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))} className={input} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ריק = ניתאי יפרסם מיד כשיגיע תורו</p>
          </div>
          {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className={btnGhost}>ביטול</button>
            <button onClick={submit} disabled={saving || !form.text_content.trim() || !form.platforms.length} className={btnPrimary}>
              {saving ? 'שומר...' : 'צור פוסט'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Generate media modal (image + video) ─────────────────────────────────
function GenerateMediaModal({ post, onClose, onDone, addVideoJob, addImageJob }) {
  const isVideoPost = VIDEO_TYPES.includes(post.content_type);
  const [mediaType, setMediaType] = useState(isVideoPost ? 'video' : 'image');

  // Image state
  const platforms = post.platforms || [];
  const defaultSize = platforms.includes('instagram') ? 'square'
    : platforms.includes('tiktok') ? 'portrait'
    : platforms.includes('youtube') ? 'wide'
    : 'landscape';
  const [mode, setMode] = useState('auto');
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState(defaultSize);

  // Video state
  const [characters, setCharacters] = useState([]);
  const [charId, setCharId] = useState(post.character_id ? String(post.character_id) : '');
  const [script, setScript] = useState(post.script_text || '');

  const [err, setErr] = useState(null);

  useEffect(() => {
    if (mediaType === 'video' && characters.length === 0) {
      api.get('/marketing/characters').then(({ data }) => setCharacters(data)).catch(() => {});
    }
  }, [mediaType]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitImage = () => {
    if (mode === 'manual' && !prompt.trim()) return;
    const body = mode === 'auto' ? { auto: true, size } : { prompt, size };
    addImageJob && addImageJob(post.id, `תמונה — פוסט #${post.id}`, body);
    onClose();
  };

  const submitVideo = () => {
    if (!script.trim()) { setErr('יש להזין טקסט לאמירה'); return; }
    if (addVideoJob) {
      const label = `סרטון — ${post.content_type === 'chen_video' ? 'חן' : 'UGC'} #${post.id}`;
      addVideoJob(post.id, label, { script_text: script.trim() });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">יצירת מדיה לפוסט</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          {/* Type toggle — show video option only for video post types */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-sm">
            <button onClick={() => setMediaType('image')}
              className={`flex-1 py-1.5 transition-colors ${mediaType === 'image'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
              🖼️ תמונה
            </button>
            {isVideoPost && (
              <button onClick={() => setMediaType('video')}
                className={`flex-1 py-1.5 transition-colors ${mediaType === 'video'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                🎬 סרטון
              </button>
            )}
          </div>

          {/* ── Image section ── */}
          {mediaType === 'image' && <>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-sm">
              {[['auto', '✨ אוטומטי'], ['manual', '✏️ ידני']].map(([val, label]) => (
                <button key={val} onClick={() => setMode(val)}
                  className={`flex-1 py-1.5 transition-colors ${mode === val
                    ? 'bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white font-medium'
                    : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                  {label}
                </button>
              ))}
            </div>
            {mode === 'auto'
              ? <p className="text-sm text-gray-500 dark:text-gray-400">ניתאי יבנה את תיאור התמונה בעצמו לפי תוכן הפוסט.</p>
              : <textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g.: A musician performing on stage in Jerusalem at night, concert lights, vibrant colors"
                  className={input} />
            }
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">גודל</label>
              <select value={size} onChange={(e) => setSize(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="square">Square (Instagram feed)</option>
                <option value="landscape">Landscape (Facebook)</option>
                <option value="portrait">Portrait (Stories / TikTok)</option>
                <option value="wide">Wide (YouTube thumbnail)</option>
              </select>
            </div>
          </>}

          {/* ── Video section ── */}
          {mediaType === 'video' && <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">דמות</label>
              <select value={charId} onChange={(e) => setCharId(e.target.value)} className={input}>
                <option value="">ברירת מחדל</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.provider})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">טקסט לאמירה (script) *</label>
              <textarea rows={4} value={script} onChange={(e) => setScript(e.target.value)}
                placeholder="הטקסט שהדמות תאמר בסרטון... (עד 500 תווים)"
                maxLength={500} className={input} />
              <p className="text-xs text-gray-500 mt-1">{script.length}/500 · היצירה תתחיל ברקע (~2-3 דק׳)</p>
            </div>
          </>}

          {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className={btnGhost}>ביטול</button>
            {mediaType === 'image' && (
              <button onClick={submitImage} disabled={mode === 'manual' && !prompt.trim()} className={btnPrimary}>
                {post.image_url ? '🔄 החלף תמונה' : '🖼️ צור תמונה'}
              </button>
            )}
            {mediaType === 'video' && (
              <button onClick={submitVideo} disabled={!script.trim()} className={btnPrimary}>
                🎬 צור סרטון
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const VIDEO_TYPES = ['ugc_video', 'chen_video'];

const CONTENT_TYPE_META = {
  release_announcement: { icon: '🎵', label: 'ריליס' },
  weekly_releases:      { icon: '📅', label: 'שבועי' },
  image_post:           { icon: '🖼️', label: 'תמונה' },
  ugc_video:            { icon: '🎬', label: 'UGC' },
  chen_video:           { icon: '🎬', label: 'חן' },
};

// ── Manual release trigger modal ──────────────────────────────────────────
function ManualReleaseModal({ onClose, onDone }) {
  const [releaseIds, setReleaseIds] = useState('');
  const [instruction, setInstruction] = useState('');
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    const ids = releaseIds.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    if (!ids.length) { setErr('יש להזין לפחות מזהה הפצה אחד'); return; }
    setRunning(true); setErr(null);
    try {
      await api.post('/marketing/tasks/content_creation/run', {
        params: { release_ids: ids, ...(instruction.trim() ? { instruction: instruction.trim() } : {}) },
      });
      onDone('🎵 ניתאי מייצר פוסטי ריליסים...');
      onClose();
    } catch (e) {
      setErr(errMsg(e));
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">🎵 פרסום הפצות ידנית</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">מזהי הפצות <span className="text-gray-400 font-normal">(שורה לכל אחד)</span></label>
            <textarea rows={4} value={releaseIds} onChange={(e) => setReleaseIds(e.target.value)}
              placeholder={"12345\n12346"} className={input} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">הוראות לניתאי <span className="text-gray-400 font-normal">(אופציונלי)</span></label>
            <textarea rows={3} value={instruction} onChange={(e) => setInstruction(e.target.value)}
              placeholder="למשל: התמקד ביזמות של האמן, הדגש שיצאה גרסת רמיקס..." className={input} />
          </div>
          {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className={btnGhost}>ביטול</button>
            <button onClick={submit} disabled={running || !releaseIds.trim()} className={btnPrimary}>
              {running ? 'מריץ...' : '▶ הפעל ניתאי'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────
function PostCard({ post, onChanged, addVideoJob, addImageJob }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.text_content || '');
  const [preview, setPreview] = useState(false);
  const [revise, setRevise] = useState(false);
  const [generateImage, setGenerateImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const act = async (fn) => {
    setBusy(true); setErr(null);
    try { await fn(); onChanged(); }
    catch (e) { setErr(errMsg(e)); setBusy(false); }
  };

  const approve  = () => act(() => api.post(`/marketing/posts/${post.id}/approve`));
  const reject   = () => act(() => api.post(`/marketing/posts/${post.id}/reject`));
  const unpublish = () => {
    if (!window.confirm('מחיקת פוסט מהפלטפורמות — פעולה בלתי הפיכה. להמשיך?')) return;
    act(() => api.delete(`/marketing/posts/${post.id}/unpublish`));
  };
  const saveEdit = () => act(async () => {
    await api.put(`/marketing/posts/${post.id}`, { text_content: editText });
    setEditing(false);
  });

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <PostStatusBadge value={post.status} />
            {CONTENT_TYPE_META[post.content_type] && (
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                {CONTENT_TYPE_META[post.content_type].icon} {CONTENT_TYPE_META[post.content_type].label}
              </span>
            )}
            {post.release_id && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono">#{post.release_id}</span>
            )}
            {(post.platforms || []).map((pl) => (
              <span key={pl} className="text-xs text-gray-500 dark:text-gray-400">{PLATFORM_EMOJI[pl]} {PLATFORM_LABEL[pl]}</span>
            ))}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setPreview(true)} title="תצוגה מקדימה" className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
              <Eye className="w-4 h-4" />
            </button>
            <button onClick={() => setExpanded((v) => !v)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Video */}
        {post.video_url && (
          <video src={post.video_url} controls className="w-full max-h-56 rounded-lg mb-3 bg-black" />
        )}
        {/* Image */}
        {!post.video_url && post.image_url && (
          <img src={post.image_url} alt="" className="w-full max-h-48 object-cover rounded-lg mb-3" />
        )}

        {/* Text */}
        {editing ? (
          <div className="space-y-2">
            <textarea rows={4} value={editText} onChange={(e) => setEditText(e.target.value)} className={input} />
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={busy} className={btnSuccess}>שמור</button>
              <button onClick={() => { setEditing(false); setEditText(post.text_content || ''); }} className={btnGhost}>ביטול</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap line-clamp-3 cursor-pointer"
             onClick={() => setExpanded((v) => !v)}>
            {post.text_content || '—'}
          </p>
        )}

        {/* Platform results */}
        {post.platform_results?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {post.platform_results.map((r) => (
              <span key={r.platform} className="text-xs flex items-center gap-1">
                {r.status === 'published' ? '✅' : '❌'}
                {r.post_url
                  ? <a href={r.post_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">{PLATFORM_LABEL[r.platform]}</a>
                  : <span className="text-gray-500 dark:text-gray-400">{PLATFORM_LABEL[r.platform]}</span>
                }
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700 pt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>נוצר: {fmtDate(post.created_at)}</p>
          {post.scheduled_at && <p>מתוזמן ל: {fmtDate(post.scheduled_at)}</p>}
          {post.published_at && <p>פורסם: {fmtDate(post.published_at)}</p>}
          {post.estimated_cost_usd > 0 && <p>אומדן: {fmtUsd(post.estimated_cost_usd)}</p>}
          {post.actual_cost_usd > 0 && <p>עלות: {fmtUsd(post.actual_cost_usd)}</p>}
        </div>
      )}

      {/* Actions */}
      {err && <p className="px-4 pb-2 text-xs text-red-600 dark:text-red-400">{err}</p>}
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        {post.status === 'pending_review' && <>
          <button onClick={approve} disabled={busy} className={btnSuccess}><Check className="w-3.5 h-3.5" />אשר</button>
          <button onClick={reject} disabled={busy} className={btnDanger}><X className="w-3.5 h-3.5" />דחה</button>
          <button onClick={() => setRevise(true)} disabled={busy} className={btnGhost}><RotateCcw className="w-3.5 h-3.5" />תיקון</button>
          {!editing && <button onClick={() => setEditing(true)} className={btnGhost}>✏️ ערוך</button>}
        </>}
        {post.status === 'rejected' && (
          <button onClick={() => setRevise(true)} disabled={busy} className={btnGhost}><RotateCcw className="w-3.5 h-3.5" />שלח תיקון</button>
        )}
        {post.status === 'published' && (
          <button onClick={unpublish} disabled={busy} className={btnDanger}><Trash2 className="w-3.5 h-3.5" />מחק מפלטפורמות</button>
        )}
        {['draft', 'pending_review', 'approved', 'rejected', 'scheduled'].includes(post.status) && post.content_type !== 'release_announcement' && (
          <button onClick={() => setGenerateImage(true)} disabled={busy} className={btnGhost}
            title={VIDEO_TYPES.includes(post.content_type) ? 'יצירת מדיה' : (post.image_url ? 'החלף תמונה' : 'צור תמונה')}>
            {VIDEO_TYPES.includes(post.content_type) ? '🎬' : (post.image_url ? '🔄' : '🖼️')}
          </button>
        )}
      </div>

      {preview && <PreviewModal postId={post.id} onClose={() => setPreview(false)} />}
      {revise && <ReviseModal postId={post.id} onClose={() => setRevise(false)} onDone={() => { setRevise(false); onChanged(); }} />}
      {generateImage && <GenerateMediaModal post={post} onClose={() => setGenerateImage(false)} onDone={() => { setGenerateImage(false); onChanged(); }} addVideoJob={addVideoJob} addImageJob={addImageJob} />}
    </div>
  );
}

// ── Main tab ───────────────────────────────────────────────────────────────
export default function PostsTab({ addVideoJob, addImageJob, onPostCreated, tick }) {
  const [posts, setPosts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [creating, setCreating] = useState(false);
  const [manualRelease, setManualRelease] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/marketing/posts', { params: { status: statusFilter || undefined, limit: 50 } });
      setPosts(r.data);
      setErr(null);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load, tick]);

  return (
    <div className="space-y-4">
      {/* Filter + create */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                statusFilter === val
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}>{label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setManualRelease(true)} className={btnGhost}>🎵 הפצה ידנית</button>
          <button onClick={() => setCreating(true)} className={btnPrimary}>
            <Plus className="w-4 h-4" />פוסט ידני
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">טוען...</p>}
      {!loading && posts.length === 0 && <Empty>אין פוסטים בסטטוס זה</Empty>}

      <div className="grid gap-4 md:grid-cols-2">
        {posts.map((p) => <PostCard key={p.id} post={p} onChanged={load} addVideoJob={addVideoJob} addImageJob={addImageJob} />)}
      </div>

      {creating && <CreatePostModal onClose={() => setCreating(false)} onDone={() => { setCreating(false); load(); }} onCreated={onPostCreated} addVideoJob={addVideoJob} />}
      {manualRelease && <ManualReleaseModal onClose={() => setManualRelease(false)} onDone={(msg) => { setManualRelease(false); onPostCreated?.(msg); }} />}
    </div>
  );
}

