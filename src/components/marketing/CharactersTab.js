import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { input, btnPrimary, btnGhost, btnDanger, errMsg } from './ui';

const EMPTY = {
  name: '', description: '', provider: 'd-id',
  did_source_url: '', did_presenter_id: '',
  did_background_url: '', did_background_color: '',
  heygen_avatar_id: '', heygen_voice_id: '',
  elevenlabs_voice_id: '', elevenlabs_model: 'eleven_multilingual_v2',
  provider_voice_id: 'he-IL-AvriNeural',
  thumbnail_url: '', is_active: true,
  is_default_ugc: false, is_default_chen: false,
};

function CharacterModal({ character, onClose, onSaved }) {
  const isEdit = !!character?.id;
  const [form, setForm] = useState(character ? { ...EMPTY, ...character } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name?.trim()) { setErr('חסר שם דמות'); return; }
    setSaving(true); setErr(null);
    try {
      if (isEdit) {
        await api.put(`/marketing/characters/${character.id}`, form);
      } else {
        await api.post('/marketing/characters', form);
      }
      onSaved();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'עריכת דמות' : 'דמות חדשה'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">שם</label>
            <input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="למשל: ניצן" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">תיאור</label>
            <input className={input} value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="תיאור קצר (אופציונלי)" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ספק</label>
            <select className={input} value={form.provider} onChange={(e) => set('provider', e.target.value)}>
              <option value="d-id">D-ID (תמונה + קול)</option>
              <option value="heygen">HeyGen</option>
            </select>
          </div>

          {form.provider === 'd-id' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Presenter ID <span className="text-gray-400 font-normal">(D-ID Studio)</span>
                </label>
                <input className={input} value={form.did_presenter_id || ''} onChange={(e) => set('did_presenter_id', e.target.value)} placeholder="rian-pbMoTzs7an" dir="ltr" />
                <p className="text-xs text-gray-500 mt-1">
                  מ-D-ID Studio → Presenters → העתק את ה-ID. כשמוגדר — גובר על תמונת מקור.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL תמונת מקור <span className="text-gray-400 font-normal">(ללא Presenter ID)</span>
                </label>
                <input className={input} value={form.did_source_url || ''} onChange={(e) => set('did_source_url', e.target.value)} placeholder="https://cdn.example.com/character.jpg" dir="ltr" />
                <p className="text-xs text-gray-500 mt-1">URL ציבורי וקבוע של תמונת הדמות (JPG/PNG, פנים ברורות, ≥512px)</p>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">רקע (אופציונלי — עוקף רקע ב-Presenter)</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">צבע רקע (hex)</label>
                  <div className="flex gap-2 items-center">
                    <input className={input} value={form.did_background_color || ''} onChange={(e) => set('did_background_color', e.target.value)} placeholder="#FFFFFF" dir="ltr" />
                    {form.did_background_color && (
                      <div className="w-8 h-8 rounded border border-gray-300 flex-shrink-0" style={{ background: form.did_background_color }} />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">גובר על תמונת רקע אם שניהם מוגדרים</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL תמונת רקע</label>
                  <input className={input} value={form.did_background_url || ''} onChange={(e) => set('did_background_url', e.target.value)} placeholder="https://..." dir="ltr" />
                </div>
              </div>
            </>
          )}

          {form.provider === 'heygen' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HeyGen Avatar ID</label>
                <input className={input} value={form.heygen_avatar_id || ''} onChange={(e) => set('heygen_avatar_id', e.target.value)} placeholder="52630790137846feac999f937483b68a" dir="ltr" />
                <p className="text-xs text-gray-500 mt-1">HeyGen → Avatars → לחץ על האווטאר → העתק את ה-ID</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HeyGen Voice ID</label>
                <input className={input} value={form.heygen_voice_id || ''} onChange={(e) => set('heygen_voice_id', e.target.value)} placeholder="2ea7a177de574c55a26ec893a2532d96" dir="ltr" />
                <p className="text-xs text-gray-500 mt-1">HeyGen → Voice Cloning → לחץ על הקול שלך → העתק את ה-ID</p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ElevenLabs Voice ID</label>
            <input className={input} value={form.elevenlabs_voice_id || ''} onChange={(e) => set('elevenlabs_voice_id', e.target.value)} placeholder="21m00Tcm4TlvDq8ikWAM" dir="ltr" />
            <p className="text-xs text-gray-500 mt-1">מ-ElevenLabs Voice Library → Hebrew → העתק voice_id. ריק = קול Microsoft (he-IL-AvriNeural)</p>
          </div>

          {form.elevenlabs_voice_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ElevenLabs Model</label>
              <select className={input} value={form.elevenlabs_model || 'eleven_multilingual_v2'} onChange={(e) => set('elevenlabs_model', e.target.value)}>
                <option value="eleven_multilingual_v2">eleven_multilingual_v2 (מומלץ)</option>
                <option value="eleven_turbo_v2_5">eleven_turbo_v2_5 (מהיר)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL תמונת תצוגה (thumbnail)</label>
            <input className={input} value={form.thumbnail_url || ''} onChange={(e) => set('thumbnail_url', e.target.value)} placeholder="https://..." dir="ltr" />
          </div>

          <div className="space-y-2">
            {[
              ['is_active', 'דמות פעילה'],
              ['is_default_ugc', 'ברירת מחדל לסרטוני UGC'],
              ['is_default_chen', 'ברירת מחדל לסרטוני חן'],
            ].map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form[k]} onChange={(e) => set(k, e.target.checked)} className="rounded border-gray-300" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>

          {err && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-2">{err}</p>}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-2">
          <button className={btnGhost} onClick={onClose}>ביטול</button>
          <button className={btnPrimary} onClick={save} disabled={saving}>
            {saving ? 'שומר...' : isEdit ? 'שמור שינויים' : 'צור דמות'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewPlayer({ character, onClose }) {
  const [status, setStatus] = useState('generating'); // generating | done | error
  const [videoUrl, setVideoUrl] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.post(`/marketing/characters/${character.id}/preview`, {})
      .then(({ data }) => { setVideoUrl(data.video_url); setStatus('done'); })
      .catch((e) => { setErr(errMsg(e)); setStatus('error'); });
  }, [character.id]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">תצוגה מקדימה — {character.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-5">
          {status === 'generating' && (
            <div className="text-center py-10">
              <div className="text-3xl animate-pulse mb-3">🎬</div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">יוצר סרטון דמו… זה לוקח 30-90 שניות</p>
            </div>
          )}
          {status === 'done' && videoUrl && (
            <video src={videoUrl} autoPlay controls className="w-full rounded-lg" />
          )}
          {status === 'error' && (
            <p className="text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-3 text-sm">{err}</p>
          )}
        </div>
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button className={btnGhost} onClick={onClose}>סגור</button>
        </div>
      </div>
    </div>
  );
}

export default function CharactersTab({ reload: reloadParent }) {
  const [characters, setCharacters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [modal, setModal] = useState(null); // null | 'create' | character-object (edit)
  const [preview, setPreview] = useState(null); // character for preview
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/marketing/characters?all=true');
      setCharacters(data);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onSaved = () => { setModal(null); load(); reloadParent?.(); };

  const handleDelete = async (ch) => {
    if (!window.confirm(`למחוק (השבית) את הדמות "${ch.name}"?`)) return;
    setDeleting(ch.id);
    try {
      await api.delete(`/marketing/characters/${ch.id}`);
      load();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setDeleting(null);
    }
  };

  if (loading && !characters) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <div className="text-center">
        <div className="text-3xl animate-pulse mb-2">🎭</div>
        <p className="text-sm">טוען דמויות…</p>
      </div>
    </div>
  );

  if (err) return (
    <div className="p-6">
      <p className="text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-3 text-sm">{err}</p>
    </div>
  );

  const active = (characters || []).filter((c) => c.is_active);
  const inactive = (characters || []).filter((c) => !c.is_active);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ספריית דמויות</h2>
          <p className="text-sm text-gray-500 mt-0.5">דמויות לסרטוני וידאו עם AI (D-ID + ElevenLabs)</p>
        </div>
        <button className={btnPrimary} onClick={() => setModal('create')}>+ דמות חדשה</button>
      </div>

      {active.length === 0 && (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/40 rounded-xl">
          <div className="text-4xl mb-3">🎭</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">אין דמויות עדיין</p>
          <p className="text-sm text-gray-500 mt-1">צור דמות ראשונה עם תמונה + קול ElevenLabs</p>
          <button className={`${btnPrimary} mt-4`} onClick={() => setModal('create')}>+ צור דמות</button>
        </div>
      )}

      {active.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {active.map((ch) => (
            <CharacterCard
              key={ch.id}
              character={ch}
              onEdit={() => setModal(ch)}
              onPreview={() => setPreview(ch)}
              onDelete={() => handleDelete(ch)}
              deleting={deleting === ch.id}
            />
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-gray-500 cursor-pointer select-none hover:text-gray-700">
            דמויות מושבתות ({inactive.length})
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-3 opacity-60">
            {inactive.map((ch) => (
              <CharacterCard
                key={ch.id}
                character={ch}
                onEdit={() => setModal(ch)}
                onDelete={() => handleDelete(ch)}
                deleting={deleting === ch.id}
              />
            ))}
          </div>
        </details>
      )}

      {modal && (
        <CharacterModal
          character={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      {preview && (
        <PreviewPlayer character={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

function CharacterCard({ character: ch, onEdit, onPreview, onDelete, deleting }) {
  const providerColor = ch.provider === 'd-id'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
        {ch.thumbnail_url ? (
          <img src={ch.thumbnail_url} alt={ch.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0 border-2 border-gray-200 dark:border-gray-600" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl flex-shrink-0">
            🎭
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{ch.name}</h3>
          {ch.description && <p className="text-xs text-gray-500 truncate mt-0.5">{ch.description}</p>}
          <div className="flex flex-wrap gap-1 mt-1.5">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${providerColor}`}>
              {ch.provider === 'd-id' ? 'D-ID' : 'HeyGen'}
            </span>
            {ch.is_default_ugc && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                UGC default
              </span>
            )}
            {ch.is_default_chen && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                חן default
              </span>
            )}
            {ch.elevenlabs_voice_id && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                ElevenLabs
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 flex items-center gap-2 flex-wrap">
        {onPreview && ch.provider === 'd-id' && (ch.did_source_url || ch.did_presenter_id) && (
          <button
            className={btnGhost + ' text-xs py-1 px-2'}
            onClick={onPreview}
            title="יצור סרטון דמו של 5 שניות"
          >
            🎬 בדוק
          </button>
        )}
        <button className={btnGhost + ' text-xs py-1 px-2'} onClick={onEdit}>עריכה</button>
        <button
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
          onClick={onDelete}
          disabled={deleting}
        >
          {deleting ? '...' : 'השבת'}
        </button>
      </div>
    </div>
  );
}
