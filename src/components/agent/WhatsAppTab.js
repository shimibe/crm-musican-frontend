import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../utils/api';
import { Section, Field, input, btnPrimary, btnGhost, btnDanger, errMsg, fmtDate } from './ui';
import CustomerProfileModal from '../customers/CustomerProfileModal';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtMins = (mins) => {
  if (mins == null) return null;
  const m = Math.round(mins);
  if (m < 60) return `${m} דקות`;
  const h = Math.floor(m / 60), r = m % 60;
  return r > 0 ? `${h}ש' ${r}ד'` : `${h} שעות`;
};

/** Strip @suffix from a JID for display (e.g. "972501234567@s.whatsapp.net" → "972501234567"). */
const fmtJid = (jid) => jid ? jid.split('@')[0] : '';

/** Convert Israeli phone to international digits (e.g. "052-123-4567" → "972521234567"). */
const toIntlPhone = (p) => {
  const d = p.replace(/\D/g, '');
  if (d.startsWith('972')) return d;
  if (d.startsWith('0')) return '972' + d.slice(1);
  return '972' + d;
};

// ─── ConnectionPanel ──────────────────────────────────────────────────────────

const STATUS_LABEL = {
  offline:    { text: 'מנותק (השירות לא פועל)', color: 'text-red-600 dark:text-red-400',    dot: 'bg-red-500' },
  connecting: { text: 'מחבר — ממתין לסריקה',   color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-400 animate-pulse' },
  connected:  { text: 'מחובר',                   color: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' },
};

const ConnectionPanel = ({ onConnected }) => {
  const [waStatus, setWaStatus]   = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [pairingPhone, setPairingPhone] = useState('');
  const [pairingCode,  setPairingCode]  = useState(null);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState(null);
  const pollRef    = useRef(null);
  const prevStatus = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/agent/wa/status');
      setWaStatus(data);
      if (data.status === 'connected') {
        setQrDataUrl(null);
        setPairingCode(null);
        // call onConnected only on transition to connected, not on every poll
        if (prevStatus.current !== 'connected' && onConnected) onConnected();
      } else if (data.hasQr) {
        const qr = await api.get('/agent/wa/qr').catch(() => null);
        if (qr?.data?.qrDataUrl) setQrDataUrl(qr.data.qrDataUrl);
      } else {
        setQrDataUrl(null);
      }
      prevStatus.current = data.status;
    } catch { /* service may be starting */ }
  }, [onConnected]);

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchStatus]);

  const requestPairing = async () => {
    if (!pairingPhone.trim()) return;
    setBusy(true); setErr(null); setPairingCode(null);
    try {
      const { data } = await api.post('/agent/wa/pair', { phone: toIntlPhone(pairingPhone) });
      setPairingCode(data.code);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    if (!window.confirm('לנתק את חיבור הוואטסאפ?')) return;
    setBusy(true); setErr(null);
    try {
      await api.post('/agent/wa/logout');
      setQrDataUrl(null);
      setPairingCode(null);
      await fetchStatus();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const st = waStatus?.status || 'offline';
  const info = STATUS_LABEL[st] || STATUS_LABEL.offline;

  return (
    <Section title="חיבור וואטסאפ">
      {/* Status row */}
      <div className="flex items-center gap-3 mb-5">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${info.dot}`} />
        <span className={`text-sm font-medium ${info.color}`}>{info.text}</span>
        {st === 'connected' && waStatus?.phone && (
          <span className="text-xs text-gray-500 dark:text-gray-400">+{waStatus.phone}</span>
        )}
        <button className={`${btnGhost} text-xs mr-auto`} onClick={fetchStatus}>רענן</button>
      </div>

      {err && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{err}</p>}

      {/* Connected */}
      {st === 'connected' && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">חובר ב-{fmtDate(waStatus?.connectedAt)}</span>
          <button className={btnDanger} disabled={busy} onClick={logout}>נתק</button>
        </div>
      )}

      {/* Offline */}
      {st === 'offline' && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          השירות אינו פועל. הרץ{' '}
          <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">pm2 start wa-monitor</code>{' '}
          בשרת ורענן.
        </p>
      )}

      {/* Connecting — QR + pairing code */}
      {st === 'connecting' && (
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* QR code */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">סרקו עם הוואטסאפ:</p>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-56 h-56 rounded-xl border border-gray-200 dark:border-gray-600" />
            ) : (
              <div className="w-56 h-56 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-center text-sm text-gray-400">
                ממתין ל-QR...
              </div>
            )}
            <p className="text-xs text-gray-400 text-center max-w-[14rem]">
              וואטסאפ ← 3 נקודות ← מכשירים מקושרים ← קשר מכשיר
            </p>
          </div>

          {/* Or divider */}
          <div className="flex md:flex-col items-center gap-2 self-stretch">
            <div className="flex-1 h-px md:h-auto md:w-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400 px-1">או</span>
            <div className="flex-1 h-px md:h-auto md:w-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Pairing code */}
          <div className="flex flex-col gap-3 max-w-xs">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">חיבור עם קוד טלפוני:</p>
            <Field label="מספר הוואטסאפ" hint="מספר ישראלי (לדוגמה: 052-123-4567)">
              <input type="tel" dir="ltr" className={input} placeholder="052-123-4567"
                value={pairingPhone}
                onChange={(e) => { setPairingPhone(e.target.value); setPairingCode(null); }}
                onKeyDown={(e) => e.key === 'Enter' && requestPairing()}
              />
            </Field>
            <button className={btnPrimary} disabled={busy || !pairingPhone.trim()} onClick={requestPairing}>
              בקש קוד חיבור
            </button>

            {pairingCode && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-1">הזינו קוד זה בוואטסאפ:</p>
                <p className="text-3xl font-mono font-bold tracking-widest text-gray-900 dark:text-white select-all">
                  {pairingCode}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  הגדרות ← מכשירים מקושרים ← קשר מכשיר ← קישור עם מספר טלפון
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Section>
  );
};

// ─── WhatsAppTab ──────────────────────────────────────────────────────────────

const WhatsAppTab = ({ reload: reloadParent }) => {
  const [conversations, setConversations] = useState([]);
  const [waSettings, setWaSettings]       = useState(null);
  const [formSettings, setFormSettings]   = useState({});
  const [users, setUsers]   = useState([]);
  const [busy, setBusy]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileCustomer, setProfileCustomer] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [convRes, settingsRes, usersRes] = await Promise.all([
        api.get('/agent/wa/conversations'),
        api.get('/agent/wa/settings'),
        api.get('/agent/wa/users'),
      ]);
      setConversations(convRes.data || []);
      setWaSettings(settingsRes.data);
      setFormSettings(settingsRes.data || {});
      setUsers(usersRes.data || []);
    } catch (e) {
      console.error('WA tab load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async () => {
    setBusy(true);
    try {
      await api.put('/agent/settings', {
        wa_enabled:             formSettings.wa_enabled,
        wa_threshold_minutes:   Number(formSettings.wa_threshold_minutes),
        wa_ack_message:         formSettings.wa_ack_message,
        wa_business_hours_only: formSettings.wa_business_hours_only,
        wa_business_start_hour: Number(formSettings.wa_business_start_hour),
        wa_business_end_hour:   Number(formSettings.wa_business_end_hour),
        wa_ai_ack:              formSettings.wa_ai_ack,
        wa_notify_user_ids:     formSettings.wa_notify_user_ids || [],
        wa_ack_prompt:          formSettings.wa_ack_prompt || null,
        wa_business_days:       formSettings.wa_business_days ?? [0, 1, 2, 3, 4],
        wa_ack_cooldown_hours:  Number(formSettings.wa_ack_cooldown_hours ?? 24),
      });
      await load();
      if (reloadParent) reloadParent();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleNotifyUser = (userId) => {
    setFormSettings((prev) => {
      const ids = prev.wa_notify_user_ids || [];
      return {
        ...prev,
        wa_notify_user_ids: ids.includes(userId)
          ? ids.filter((x) => x !== userId)
          : [...ids, userId],
      };
    });
  };

  const snooze = async (id, hours) => {
    try {
      await api.post(`/agent/wa/conversations/${id}/snooze`, { hours });
      await load();
    } catch (e) { alert(errMsg(e)); }
  };

  const dismiss = async (id) => {
    try {
      await api.post(`/agent/wa/conversations/${id}/dismiss`);
      await load();
    } catch (e) { alert(errMsg(e)); }
  };

  const toggleSafelist = async (id) => {
    try {
      await api.post(`/agent/wa/conversations/${id}/safelist`);
      await load();
    } catch (e) { alert(errMsg(e)); }
  };

  const openCustomerCard = async (customerId) => {
    try {
      const { data } = await api.get(`/customers/${customerId}`);
      setProfileCustomer(data);
    } catch (e) { alert(errMsg(e)); }
  };

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormSettings((prev) => ({ ...prev, [k]: v }));
  };

  const DAY_LABELS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const toggleDay = (d) => {
    setFormSettings((prev) => {
      const days = prev.wa_business_days ?? [0, 1, 2, 3, 4];
      return {
        ...prev,
        wa_business_days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b),
      };
    });
  };

  const unanswered = conversations.filter((c) => c.minutes_unanswered != null);
  const answered   = conversations.filter((c) => c.minutes_unanswered == null);

  return (
    <div className="space-y-6">
      {/* Connection status + pairing UI */}
      <ConnectionPanel onConnected={load} />

      {/* ACK settings */}
      <Section title="הגדרות ACK אוטומטי">
        {loading ? (
          <p className="text-sm text-gray-400 py-4 text-center">טוען...</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 max-w-3xl">
              <Field label="שליחת ACK מופעלת">
                <label className="flex items-center gap-2 mt-1">
                  <input type="checkbox" checked={!!formSettings.wa_enabled} onChange={set('wa_enabled')}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {formSettings.wa_enabled ? 'כן — שולח הודעת אישור' : 'לא — ניטור בלבד'}
                  </span>
                </label>
              </Field>

              <Field label="המתנה לפני ACK (דקות)" hint="כמה דקות ללא מענה לפני שליחה">
                <input type="number" min="5" max="480" dir="ltr" className={input}
                  value={formSettings.wa_threshold_minutes ?? 30} onChange={set('wa_threshold_minutes')} />
              </Field>

              <Field label="מגבלת תדירות ACK (שעות)" hint="פרק זמן מינימלי בין שני ACK לאותו לקוח">
                <input type="number" min="1" max="720" dir="ltr" className={input}
                  value={formSettings.wa_ack_cooldown_hours ?? 24} onChange={set('wa_ack_cooldown_hours')} />
              </Field>

              <Field label="שעות עבודה בלבד">
                <label className="flex items-center gap-2 mt-1">
                  <input type="checkbox" checked={!!formSettings.wa_business_hours_only} onChange={set('wa_business_hours_only')}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">שלח רק בשעות פעילות</span>
                </label>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="פתיחה (שעה)">
                  <input type="number" min="0" max="23" dir="ltr" className={input}
                    value={formSettings.wa_business_start_hour ?? 9} onChange={set('wa_business_start_hour')} />
                </Field>
                <Field label="סגירה (שעה)">
                  <input type="number" min="0" max="23" dir="ltr" className={input}
                    value={formSettings.wa_business_end_hour ?? 18} onChange={set('wa_business_end_hour')} />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="ימי פעילות" hint="ימים בהם ישלח ACK (0=ראשון … 6=שבת)">
                  <div className="mt-1 flex flex-wrap gap-2">
                    {DAY_LABELS.map((label, d) => {
                      const active = (formSettings.wa_business_days ?? [0, 1, 2, 3, 4]).includes(d);
                      return (
                        <button key={d} type="button"
                          onClick={() => toggleDay(d)}
                          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                            active
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-primary-400'
                          }`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>

              <Field label="הודעת ACK חכמה (Claude)">
                <label className="flex items-center gap-2 mt-1">
                  <input type="checkbox" checked={!!formSettings.wa_ai_ack} onChange={set('wa_ai_ack')}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {formSettings.wa_ai_ack
                      ? 'כן — Claude מנסח הודעה אישית לפי קונטקסט'
                      : 'לא — הודעה סטטית'}
                  </span>
                </label>
              </Field>

              <div className="md:col-span-2">
                <Field label="הודעת ACK" hint={formSettings.wa_ai_ack ? 'גיבוי — ישמש אם Claude אינו זמין' : 'הטקסט שנשלח ללקוח שלא קיבל מענה'}>
                  <textarea dir="rtl" className={`${input} h-20 ${formSettings.wa_ai_ack ? 'opacity-50' : ''}`}
                    value={formSettings.wa_ack_message ?? ''} onChange={set('wa_ack_message')} />
                </Field>
              </div>

              {formSettings.wa_ai_ack && (
                <div className="md:col-span-2">
                  <Field label="פרומפט ל-Claude"
                    hint="הוראות ניסוח + קבלת החלטות. שם הלקוח, טקסט ההודעה ודרישת ה-JSON מוזרקים אוטומטית — אין לכלול אותם כאן.">
                    <textarea dir="rtl" rows={8} className={`${input} font-mono text-xs`}
                      placeholder={`אתה נציג שירות של חברת מוזיקן להפצת מוזיקה...\n(ריק = ברירת המחדל)`}
                      value={formSettings.wa_ack_prompt ?? ''} onChange={set('wa_ack_prompt')} />
                  </Field>
                </div>
              )}

              {users.length > 0 && (
                <div className="md:col-span-2">
                  <Field label="התראת מייל לנציגים" hint="נציגים שיקבלו מייל בכל ACK שנשלח">
                    <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
                      {users.map((u) => (
                        <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox"
                            checked={(formSettings.wa_notify_user_ids || []).includes(u.id)}
                            onChange={() => toggleNotifyUser(u.id)}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {u.full_name}
                            <span className="text-xs text-gray-400 mr-1">({u.email})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </Field>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button className={btnPrimary} disabled={busy} onClick={saveSettings}>שמור</button>
              {waSettings?.wa_enabled
                ? <span className="text-xs text-green-600 dark:text-green-400">● ACK פעיל</span>
                : <span className="text-xs text-gray-400">● ניטור בלבד</span>}
            </div>
          </>
        )}
      </Section>

      {/* Unanswered */}
      <Section
        title={`שיחות ללא מענה${unanswered.length > 0 ? ` (${unanswered.length})` : ''}`}
        actions={<button className={btnGhost} onClick={load}>רענן</button>}
      >
        {unanswered.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">אין שיחות ממתינות</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  <th className="pb-2 text-right font-medium">איש קשר</th>
                  <th className="pb-2 text-right font-medium">הודעה</th>
                  <th className="pb-2 text-right font-medium">ממתין</th>
                  <th className="pb-2 text-right font-medium">ACK נשלח</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {unanswered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2 pr-1">
                      {c.customer_id ? (
                        <button className="font-medium text-primary-600 dark:text-primary-400 hover:underline text-right"
                          onClick={() => openCustomerCard(c.customer_id)}>
                          {c.customer_name || c.display_name || c.phone || fmtJid(c.jid)}
                        </button>
                      ) : (
                        <div className="font-medium text-gray-900 dark:text-white">
                          {c.display_name || c.phone || fmtJid(c.jid)}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">{c.phone || fmtJid(c.jid)}</div>
                    </td>
                    <td className="py-2 px-2 max-w-xs">
                      <span className="text-gray-600 dark:text-gray-300 line-clamp-2 text-xs">
                        {c.last_inbound_text || '—'}
                      </span>
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap text-amber-600 dark:text-amber-400 font-medium text-xs">
                      {fmtMins(c.minutes_unanswered)}
                    </td>
                    <td className="py-2 px-2 text-xs text-gray-500">{c.ack_sent_at ? fmtDate(c.ack_sent_at) : '—'}</td>
                    <td className="py-2 pl-1 whitespace-nowrap">
                      <div className="flex gap-1 flex-wrap justify-end">
                        {!c.snoozed_until ? (
                          <button className={`${btnGhost} text-xs`} onClick={() => snooze(c.id, 4)}>דחה 4ש'</button>
                        ) : (
                          <span className="text-xs text-gray-400">נדחה עד {fmtDate(c.snoozed_until)}</span>
                        )}
                        <button className={`${btnGhost} text-xs`} onClick={() => dismiss(c.id)}
                          title="בטל — הוצא מהתור ללא ACK">בטל</button>
                        <button className={`${btnGhost} text-xs ${c.safelist ? 'text-red-500' : ''}`}
                          onClick={() => toggleSafelist(c.id)}
                          title="הוסף לרשימה בטוחה — לא ישלח ACK לעולם">
                          {c.safelist ? '🚫 ללא ACK' : 'ללא ACK'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Answered */}
      {answered.length > 0 && (
        <Section title="שיחות שטופלו">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  <th className="pb-2 text-right font-medium">איש קשר</th>
                  <th className="pb-2 text-right font-medium">הודעה אחרונה</th>
                  <th className="pb-2 text-right font-medium">נכנס</th>
                  <th className="pb-2 text-right font-medium">יצא</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {answered.slice(0, 20).map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 text-xs">
                    <td className="py-2 pr-1 font-medium text-gray-700 dark:text-gray-200">
                      <div className="flex items-center gap-1">
                        {c.customer_id ? (
                          <button className="text-primary-600 dark:text-primary-400 hover:underline text-right"
                            onClick={() => openCustomerCard(c.customer_id)}>
                            {c.customer_name || c.display_name || c.phone || fmtJid(c.jid)}
                          </button>
                        ) : (
                          <span>{c.display_name || c.phone || fmtJid(c.jid)}</span>
                        )}
                        {c.safelist && <span className="text-xs text-red-400" title="ללא ACK">🚫</span>}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-gray-500 max-w-xs">
                      <span className="line-clamp-1">{c.last_inbound_text || '—'}</span>
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap text-gray-500">{fmtDate(c.last_inbound_at)}</td>
                    <td className="py-2 pl-1 whitespace-nowrap text-gray-500">{fmtDate(c.last_outbound_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
      {profileCustomer && (
        <CustomerProfileModal
          show={!!profileCustomer}
          customer={profileCustomer}
          defaultTab="summary"
          onClose={() => setProfileCustomer(null)}
        />
      )}
    </div>
  );
};

export default WhatsAppTab;
