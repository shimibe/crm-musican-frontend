import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Section, Field, input, btnPrimary, errMsg } from './ui';

const SettingsTab = ({ settings, reload }) => {
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (settings)
      setF({
        daily_budget_usd: settings.daily_budget_usd,
        monthly_budget_usd: settings.monthly_budget_usd,
        manager_email: settings.manager_email || '',
        telegram_chat_id: settings.telegram_chat_id || '',
      });
  }, [settings]);

  const save = async () => {
    setBusy(true);
    try {
      await api.put('/agent/settings', { ...f, daily_budget_usd: Number(f.daily_budget_usd), monthly_budget_usd: Number(f.monthly_budget_usd) });
      await reload();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <Section title="הגדרות">
      <div className="grid gap-4 md:grid-cols-2 max-w-3xl">
        <Field label="תקרה יומית ($)" hint="בהגעה לתקרה יואב נעצר עד מחר ושולח התראה">
          <input type="number" step="0.5" min="0" className={input} dir="ltr" value={f.daily_budget_usd ?? ''} onChange={set('daily_budget_usd')} />
        </Field>
        <Field label="תקרה חודשית ($)">
          <input type="number" step="1" min="0" className={input} dir="ltr" value={f.monthly_budget_usd ?? ''} onChange={set('monthly_budget_usd')} />
        </Field>
        <Field label="מייל מנהל" hint="סיכום יומי ודוחות שיחות">
          <input type="email" className={input} dir="ltr" value={f.manager_email ?? ''} onChange={set('manager_email')} />
        </Field>
        <Field label="Telegram chat ID" hint="בקשות אישור והתערבות, עם כפתורים">
          <input className={input} dir="ltr" value={f.telegram_chat_id ?? ''} onChange={set('telegram_chat_id')} />
        </Field>
      </div>
      <div className="mt-6">
        <button className={btnPrimary} disabled={busy} onClick={save}>שמור</button>
      </div>
    </Section>
  );
};

export default SettingsTab;
