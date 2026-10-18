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
        canva_brand_template_id: initSettings.canva_brand_template_id ?? '',
        instagram_page_id: initSettings.instagram_page_id ?? '',
        facebook_page_id: initSettings.facebook_page_id ?? '',
        youtube_channel_id: initSettings.youtube_channel_id ?? '',
        // Token fields — shown as blank if masked "***set***"
        instagram_access_token: '',
        facebook_access_token: '',
        tiktok_access_token: '',
      });
    }
  }, [initSettings]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true); setErr(null); setSaved(false);
    try {
      // Only send token fields if user typed something (empty = don't overwrite)
      const payload = { ...form };
      for (const k of ['instagram_access_token','facebook_access_token','tiktok_access_token']) {
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
          <Field label="Canva Brand Template ID" hint="מזהה התבנית מ-Canva PRO שניתאי ישתמש בה ליצירת עיצובים">
            <input type="text" value={form.canva_brand_template_id} onChange={(e) => set('canva_brand_template_id', e.target.value)}
              placeholder="DAFxxxxxxx" className={input} />
          </Field>
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            מפתח Canva Connect API מוגדר ב-.env (CANVA_ACCESS_TOKEN). HeyGen ו-RunwayML יתווספו ב-Phase 5–6.
          </div>
        </div>
      </Section>

      {/* ── Section 4: Frequency ── */}
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

      {/* ── Section 5: Budget + contact ── */}
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

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? 'שומר...' : 'שמור הגדרות'}</button>
        {saved && <span className="text-sm text-green-600 dark:text-green-400">✅ נשמר</span>}
        {err && <span className="text-sm text-red-600 dark:text-red-400">{err}</span>}
      </div>
    </div>
  );
}
