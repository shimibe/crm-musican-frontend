import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Section, Field, input, btnPrimary, btnGhost, MODE_LABEL, MODE_HINT, PLATFORM_LABEL, PLATFORM_EMOJI, fmtUsd, errMsg } from './ui';

const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'youtube'];
const TOKEN_FIELD = { instagram: 'instagram_access_token', facebook: 'facebook_access_token', tiktok: 'tiktok_access_token', youtube: null };
const PAGE_FIELD  = { instagram: 'instagram_page_id',      facebook: 'facebook_page_id',      tiktok: null,                  youtube: 'youtube_channel_id' };

export default function SettingsTab({ settings: initSettings, reload }) {
  const [s, setS] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (initSettings) {
      setS(initSettings);
      setForm({
        enabled: initSettings.enabled ?? true,
        global_mode: initSettings.global_mode ?? 'shadow',
        daily_budget_usd: initSettings.daily_budget_usd ?? 5,
        monthly_budget_usd: initSettings.monthly_budget_usd ?? 50,
        manager_email: initSettings.manager_email ?? '',
        telegram_chat_id: initSettings.telegram_chat_id ?? '',
        timezone: initSettings.timezone ?? 'Asia/Jerusalem',
        content_creation_days_per_week: initSettings.content_creation_days_per_week ?? 3,
        content_creation_time: initSettings.content_creation_time ?? '07:00',
        daily_summary_time: initSettings.daily_summary_time ?? '09:00',
        weekly_review_day: initSettings.weekly_review_day ?? 0,
        metrics_interval_minutes: initSettings.metrics_interval_minutes ?? 240,
        instagram_page_id: initSettings.instagram_page_id ?? '',
        facebook_page_id: initSettings.facebook_page_id ?? '',
        youtube_channel_id: initSettings.youtube_channel_id ?? '',
        // Release settings
        release_prerelease_days: initSettings.release_prerelease_days ?? 7,
        release_weekly_max_items: initSettings.release_weekly_max_items ?? 4,
        release_daily_prompt: initSettings.release_daily_prompt ?? '',
        release_weekly_prompt: initSettings.release_weekly_prompt ?? '',
        // Token/key fields — shown as blank if masked "***set***"
        instagram_access_token: '',
        facebook_access_token: '',
        tiktok_access_token: '',
        heygen_api_key: '',
        did_api_key: '',
        // Brand guidelines
        brand_guidelines: initSettings.brand_guidelines ?? {
          logo_url: '', primary_color: '', tone_voice: '', brand_tagline: '', target_audience: '',
        },
        // CTA per platform
        platform_cta: initSettings.platform_cta ?? {
          instagram: { cta_text: 'כל הפרטים בביו 🔗', include_link: false },
          facebook:  { cta_text: '🎵 האזנה:', include_link: true },
          tiktok:    { cta_text: 'קישור בביו 👆', include_link: false },
          youtube:   { cta_text: '', include_link: true },
        },
      });
    }
  }, [initSettings]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCta = (platform, field, value) =>
    setForm((f) => ({
      ...f,
      platform_cta: {
        ...f.platform_cta,
        [platform]: { ...(f.platform_cta?.[platform] || {}), [field]: value },
      },
    }));

  const save = async () => {
    setSaving(true); setErr(null); setSaved(false);
    try {
      // Only send token/key fields if user typed something (empty = don't overwrite)
      const payload = { ...form };
      for (const k of ['instagram_access_token','facebook_access_token','tiktok_access_token','heygen_api_key','did_api_key']) {
        if (!payload[k]) delete payload[k];
      }
      await api.put('/marketing/settings', payload);
      setSaved(true);
      reload?.();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  if (!s) return null;

  const DAY_NAMES = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

  return (
    <div className="space-y-6">

      {/* ── Section 1: Kill switch + mode ── */}
      <Section title="בקרה כללית">
        <div className="space-y-4">
          <Field label="סטטוס">
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={() => set('enabled', !form.enabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">{form.enabled ? 'ניתאי פעיל' : 'ניתאי כבוי'}</span>
            </div>
          </Field>
          <Field label="מצב פעולה">
            <div className="flex gap-2 mt-1 flex-wrap">
              {['shadow','approve','auto'].map((m) => (
                <button key={m} type="button" onClick={() => set('global_mode', m)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    form.global_mode === m
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}>
                  <span className="font-medium">{MODE_LABEL[m]}</span>
                  <span className="block text-xs opacity-70">{MODE_HINT[m]}</span>
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Section>

      {/* ── Section 2: Social connections ── */}
      <Section title="חיבור חשבונות חברתיים"
        actions={<span className="text-xs text-gray-400 dark:text-gray-500">Phase 1: הדבק token ידנית · Phase 2: כפתור Connect</span>}>
        <div className="space-y-6">
          {PLATFORMS.map((pl) => {
            const tokenField = TOKEN_FIELD[pl];
            const pageField  = PAGE_FIELD[pl];
            const isConnected = s[tokenField] === '***set***';
            return (
              <div key={pl} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{PLATFORM_EMOJI[pl]}</span>
                    <span className="font-medium text-gray-900 dark:text-white text-sm">{PLATFORM_LABEL[pl]}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    isConnected ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}>{isConnected ? '✅ מחובר' : '❌ לא מחובר'}</span>
                </div>
                {tokenField && (
                  <Field label={`Access Token${isConnected ? ' (מוגדר — השאר ריק כדי לא לשנות)' : ''}`}>
                    <input type="password" value={form[tokenField]} onChange={(e) => set(tokenField, e.target.value)}
                      placeholder={isConnected ? '••••••••••••' : 'הדבק כאן...'} className={input} />
                  </Field>
                )}
                {pageField && (
                  <Field label={pl === 'youtube' ? 'Channel ID' : pl === 'facebook' ? 'Page ID' : 'Page / Profile ID'}>
                    <input type="text" value={form[pageField]} onChange={(e) => set(pageField, e.target.value)}
                      placeholder="e.g. 17841400..." className={input} />
                  </Field>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Section 3: API keys ── */}
      <Section title="מפתחות API">
        <div className="space-y-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <span className="font-medium text-gray-700 dark:text-gray-300">fal.ai Flux Pro</span> — יצירת תמונות. מוגדר ב-.env (<code className="font-mono">FAL_KEY</code>).
          </div>
          <Field label={`HeyGen API Key${s.heygen_api_key === '***set***' ? ' (מוגדר — השאר ריק כדי לא לשנות)' : ''}`}>
            <input type="password" value={form.heygen_api_key} onChange={(e) => set('heygen_api_key', e.target.value)}
              placeholder={s.heygen_api_key === '***set***' ? '••••••••••••' : 'sk_...'} className={input} />
          </Field>
          <Field label={`D-ID API Key${s.did_api_key === '***set***' ? ' (מוגדר — השאר ריק כדי לא לשנות)' : ''}`}>
            <input type="password" value={form.did_api_key} onChange={(e) => set('did_api_key', e.target.value)}
              placeholder={s.did_api_key === '***set***' ? '••••••••••••' : 'Basic ...'} className={input} />
          </Field>
        </div>
      </Section>

      {/* ── Section 4: Release content ── */}
      <Section title="תוכן ריליסים">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="פוסטים שבועיים — מקסימום ריליסים">
              <input type="number" min={1} max={10} value={form.release_weekly_max_items}
                onChange={(e) => set('release_weekly_max_items', Number(e.target.value))} className={input} />
            </Field>
            <Field label="ימי קידום לפני שחרור">
              <input type="number" min={0} max={30} value={form.release_prerelease_days}
                onChange={(e) => set('release_prerelease_days', Number(e.target.value))} className={input} />
            </Field>
          </div>
          <Field label="הוראות לניתאי — בחירת ריליס לפוסט יומי" hint="ריק = ניתאי בוחר לבד">
            <textarea rows={3} value={form.release_daily_prompt}
              onChange={(e) => set('release_daily_prompt', e.target.value)}
              placeholder="למשל: העדף שירים בעברית, שים דגש על ריליסים של אמנים חדשים..."
              className={input} />
          </Field>
          <Field label="הוראות לניתאי — בחירת ריליסים לפוסט שבועי" hint="ריק = ניתאי בוחר לבד">
            <textarea rows={3} value={form.release_weekly_prompt}
              onChange={(e) => set('release_weekly_prompt', e.target.value)}
              placeholder="למשל: כלול לפחות ריליס אחד מכל ז'אנר, העדף שמות ידועים..."
              className={input} />
          </Field>
        </div>
      </Section>

      {/* ── Section 5: Frequency ── */}
      <Section title="תדירות פעילות">
        <div className="grid grid-cols-2 gap-4">
          <Field label="פוסטים בשבוע">
            <input type="number" min={1} max={7} value={form.content_creation_days_per_week}
              onChange={(e) => set('content_creation_days_per_week', Number(e.target.value))} className={input} />
          </Field>
          <Field label="שעת יצירת פוסט">
            <input type="time" value={form.content_creation_time}
              onChange={(e) => set('content_creation_time', e.target.value)} className={input} />
          </Field>
          <Field label="שעת סיכום יומי">
            <input type="time" value={form.daily_summary_time}
              onChange={(e) => set('daily_summary_time', e.target.value)} className={input} />
          </Field>
          <Field label="יום סיכום שבועי">
            <select value={form.weekly_review_day} onChange={(e) => set('weekly_review_day', Number(e.target.value))} className={input}>
              {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </Field>
          <Field label="מרווח בין מדידות (דקות)">
            <input type="number" min={30} max={1440} step={30} value={form.metrics_interval_minutes}
              onChange={(e) => set('metrics_interval_minutes', Number(e.target.value))} className={input} />
          </Field>
        </div>
      </Section>

      {/* ── Section 6: Budget + contact ── */}
      <Section title="תקציב ואיש קשר">
        <div className="grid grid-cols-2 gap-4">
          <Field label="תקציב יומי (USD)" hint={`כיום: ${fmtUsd(s.daily_budget_usd)}`}>
            <input type="number" min={0} step={0.5} value={form.daily_budget_usd}
              onChange={(e) => set('daily_budget_usd', e.target.value)} className={input} />
          </Field>
          <Field label="תקציב חודשי (USD)" hint={`כיום: ${fmtUsd(s.monthly_budget_usd)}`}>
            <input type="number" min={0} step={1} value={form.monthly_budget_usd}
              onChange={(e) => set('monthly_budget_usd', e.target.value)} className={input} />
          </Field>
          <Field label="Telegram Chat ID">
            <input type="text" value={form.telegram_chat_id}
              onChange={(e) => set('telegram_chat_id', e.target.value)} className={input} />
          </Field>
          <Field label="מייל מנהל">
            <input type="email" value={form.manager_email}
              onChange={(e) => set('manager_email', e.target.value)} className={input} />
          </Field>
        </div>
      </Section>

      {/* ── Section 7: Brand guidelines ── */}
      <Section title="🎨 זהות מותג">
        <div className="space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">ניתאי ישתמש בפרטים אלה בכל פוסט שייצור — לשמירת עקביות מותגית.</p>
          {[
            { key: 'logo_url',        label: 'URL לוגו',       placeholder: 'https://...' },
            { key: 'brand_tagline',   label: 'סלוגן',          placeholder: 'מפיצים את המוזיקה שלך' },
            { key: 'tone_voice',      label: 'טון דיבור',      placeholder: 'מקצועי, חם, מעודד — כמו חבר שמבין מוזיקה' },
            { key: 'target_audience', label: 'קהל יעד',        placeholder: 'אמנים ישראלים 18-45, עצמאים' },
            { key: 'primary_color',   label: 'צבע מותג ראשי', placeholder: '#1a1a2e' },
          ].map(({ key, label, placeholder }) => (
            <Field key={key} label={label}>
              <input type="text" value={form.brand_guidelines?.[key] ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, brand_guidelines: { ...f.brand_guidelines, [key]: e.target.value } }))}
                placeholder={placeholder} className={input} />
            </Field>
          ))}
        </div>
      </Section>

      {/* ── Section 8: CTA per platform ── */}
      <Section title="קריאה לפעולה לפי פלטפורמה">
        <div className="space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ניתאי יוסיף את הטקסט לסוף כל פוסט בפלטפורמה המתאימה. אם "כולל קישור" מסומן, הקישור יצורף לטקסט.
          </p>
          {PLATFORMS.map((pl) => {
            const cfg = form.platform_cta?.[pl] || {};
            return (
              <div key={pl} className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                  <span className="text-base">{PLATFORM_EMOJI[pl]}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{PLATFORM_LABEL[pl]}</span>
                </div>
                <input
                  type="text"
                  value={cfg.cta_text || ''}
                  onChange={(e) => setCta(pl, 'cta_text', e.target.value)}
                  placeholder="טקסט CTA (ריק = ללא)"
                  className={`${input} flex-1 min-w-0 text-sm`}
                />
                <label className="flex items-center gap-1.5 flex-shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!cfg.include_link}
                    onChange={(e) => setCta(pl, 'include_link', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">כולל קישור</span>
                </label>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? 'שומר...' : 'שמור הגדרות'}</button>
        {saved && <span className="text-sm text-green-600 dark:text-green-400">✅ נשמר</span>}
        {err && <span className="text-sm text-red-600 dark:text-red-400">{err}</span>}
      </div>
    </div>
  );
}
