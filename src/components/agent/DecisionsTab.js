import React, { useEffect, useState, useCallback } from 'react';
import { Check, X, BookmarkPlus, ChevronDown, ChevronLeft, Trash2, RotateCcw } from 'lucide-react';
import api from '../../utils/api';
import { Section, Empty, DecisionBadge, DECISION_LABEL, TASK_DECISIONS, input, btnPrimary, btnGhost, fmtDate, errMsg, Badge } from './ui';

const ReviewBox = ({ d, onDone, initialVerdict, taskKey }) => {
  const [verdict, setVerdict] = useState(initialVerdict ?? d.decision);
  const [note, setNote] = useState('');
  const [saveExample, setSaveExample] = useState(false);
  const [busy, setBusy] = useState(false);
  const [askReReview, setAskReReview] = useState(false);

  const changed = verdict !== d.decision;
  const hasNote = note.trim().length > 0;

  useEffect(() => { if (changed) setSaveExample(true); }, [changed]);

  const submit = async (v = verdict) => {
    setBusy(true);
    try {
      await api.put(`/agent/decisions/${d.id}/review`, { human_decision: v, human_note: note, save_example: saveExample });
      if (saveExample) setAskReReview(true);
      else onDone?.();
    } catch (e) {
      alert(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const triggerReReview = async () => {
    try {
      await api.post('/agent/tasks/release_review/run', { dry_run: false, params: { release_id: d.subject_id } });
    } catch (e) {
      alert(errMsg(e));
    }
    onDone?.();
  };

  if (askReReview) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
        <p className="text-sm text-gray-700 dark:text-gray-300">האם לבדוק את הריליס פעם נוספת?</p>
        <div className="flex gap-2">
          <button onClick={triggerReReview} className={`${btnPrimary} bg-blue-600 hover:bg-blue-700`}>כן, בדוק שוב</button>
          <button onClick={() => onDone?.()} className={btnGhost}>לא</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={busy} onClick={() => submit(d.decision)} className={`${btnPrimary} bg-green-600 hover:bg-green-700`}>
          <Check className="w-4 h-4" /> יואב צדק
        </button>
        <span className="text-sm text-gray-500 dark:text-gray-400">או, ההחלטה הנכונה:</span>
        {(TASK_DECISIONS[taskKey] || Object.keys(DECISION_LABEL)).map((k) => (
          <button
            key={k}
            onClick={() => setVerdict(k)}
            className={`px-2.5 py-1 text-xs rounded-md border ${
              verdict === k
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
            }`}
          >
            {DECISION_LABEL[k]}
          </button>
        ))}
      </div>
      <textarea
        className={input}
        rows={2}
        placeholder={changed ? 'למה? (נכנס לדוגמה שיואב ילמד ממנה)' : 'הערת לימוד ליואב (אופציונלי)'}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {(changed || hasNote) && (
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={saveExample} onChange={(e) => setSaveExample(e.target.checked)} />
            <BookmarkPlus className="w-4 h-4" /> שמור כדוגמה ליואב
          </label>
          <button disabled={busy} onClick={() => submit()} className={btnPrimary}>
            {changed ? 'שמור תיקון' : 'שמור הערה'}
          </button>
        </div>
      )}
    </div>
  );
};

function parseReasons(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
  return [];
}

const FOLLOWUP_CASE = {
  1: 'לא נרשם בפי"ל',
  2: 'Delivered → לא Published',
  3: 'Presave לא הומר',
  4: 'חסרים קישורי Spotify',
  5: 'מק"טים חסרים ברצועות',
};

const DecisionCard = ({ d, onDone }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rereviewing, setRereviewing] = useState(false);
  const [sourceData, setSourceData] = useState(null);
  const [sourceOpen, setSourceOpen] = useState(false);

  const toggleSource = async () => {
    if (!sourceData) {
      try {
        const { data } = await api.get(`/agent/decisions/${d.id}/source`);
        setSourceData(data);
      } catch { setSourceData({ error: 'לא נמצא' }); }
    }
    setSourceOpen((v) => !v);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('למחוק את ההחלטה הזו?')) return;
    setDeleting(true);
    try {
      await api.delete(`/agent/decisions/${d.id}`);
      onDone?.();
    } catch (err) {
      alert(errMsg(err));
      setDeleting(false);
    }
  };

  const handleReReview = async (e) => {
    e.stopPropagation();
    if (!window.confirm('למחוק את ההחלטה הנוכחית ולבקש מיואב לבדוק מחדש?')) return;
    setRereviewing(true);
    try {
      await api.delete(`/agent/decisions/${d.id}`);
      await api.post('/agent/tasks/release_review/run', { dry_run: false, params: { release_id: d.subject_id } });
      // 2 refreshes × 6s
      setTimeout(() => { onDone?.(); }, 6000);
      setTimeout(() => { onDone?.(); setRereviewing(false); }, 12000);
    } catch (err) {
      alert(errMsg(err));
      setRereviewing(false);
    }
  };
  const r = d.reasons || {};
  const findings = r.findings || [];
  const reasons = parseReasons(r.reasons);
  const needsReview = !d.human_decision && d.trigger !== 'dry_run';
  const isFollowup = d.task_key === 'crm_followup';

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        className="w-full p-4 flex flex-wrap items-center gap-2 justify-between text-right hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {open ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronLeft className="w-4 h-4 text-gray-400 shrink-0" />}
          {isFollowup
            ? <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">מעקב</Badge>
            : <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">בדיקת ריליס</Badge>
          }
          <span className="font-medium text-gray-900 dark:text-white" dir="ltr">{d.subject_id}</span>
          {(r.subject_title || r.title) && <span className="text-gray-600 dark:text-gray-300">{r.subject_title || r.title}</span>}
          {isFollowup && r.artist && <span className="text-gray-500 dark:text-gray-400 text-sm">· {r.artist}</span>}
          <DecisionBadge value={d.decision} />
          {d.confidence != null && (
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">ביטחון {Math.round(d.confidence * 100)}%</span>
          )}
          {d.trigger === 'dry_run' && <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">בדיקה יבשה</Badge>}
          {needsReview && <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">ממתין לבדיקה</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">{r.model} · {fmtDate(d.created_at)}</span>
          {!isFollowup && (
            <button
              disabled={rereviewing || deleting}
              onClick={handleReReview}
              className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded"
              title="בדוק שוב (מחק ובצע בדיקה מחדש)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            disabled={deleting}
            onClick={handleDelete}
            className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded"
            title="מחק החלטה"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-0">
          {isFollowup ? (
            <div className="mt-1 text-sm text-gray-700 dark:text-gray-300 space-y-1">
              {r.case && <p className="font-medium">{FOLLOWUP_CASE[r.case] || `מקרה ${r.case}`}</p>}
              {r.hours_elapsed != null && <p className="text-xs text-gray-500 dark:text-gray-400">עבר זמן: {r.hours_elapsed} שעות</p>}
              {r.days_elapsed != null && <p className="text-xs text-gray-500 dark:text-gray-400">עבר זמן: {r.days_elapsed} ימים</p>}
              {r.missing_count != null && <p className="text-xs text-gray-500 dark:text-gray-400">{r.missing_count} מתוך {r.track_count} רצועות ללא מק"ט</p>}
            </div>
          ) : (
            reasons.length > 0 && (
              <ul className="mt-1 text-sm text-gray-700 dark:text-gray-300 list-disc pr-5 space-y-0.5">
                {reasons.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            )
          )}
          {!isFollowup && r.cover_content_issue && <p className="mt-2 text-sm text-red-600 dark:text-red-400">עטיפה: {r.cover_content_issue}</p>}
          {!isFollowup && findings.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {findings.map((f, i) => (
                <Badge key={i} className={f.severity === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}>
                  {f.message}
                </Badge>
              ))}
            </div>
          )}
          {d.proposed_note && (
            <div className="mt-3 p-3 rounded bg-amber-50 dark:bg-amber-900/20 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">הערה שיואב ניסח לאמן</div>
              {d.proposed_note}
            </div>
          )}
          <div className="mt-3">
            <button onClick={toggleSource} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              {sourceOpen ? '▲ הסתר נתון מקורי' : '▼ נתון מקורי'}
            </button>
            {sourceOpen && sourceData && (
              <pre className="mt-2 p-3 rounded bg-gray-50 dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap break-all max-h-96 overflow-y-auto" dir="ltr">
                {JSON.stringify(sourceData, null, 2)}
              </pre>
            )}
          </div>

          {d.human_decision && !editing ? (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 flex-wrap">
              {d.human_decision === d.decision ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" />}
              נבדק ע"י {d.reviewed_by}: <DecisionBadge value={d.human_decision} /> {d.human_note && `— ${d.human_note}`}
              <button onClick={() => setEditing(true)} className="text-xs text-primary-600 dark:text-primary-400 hover:underline mr-1">ערוך</button>
            </div>
          ) : editing ? (
            <ReviewBox d={d} initialVerdict={d.human_decision} taskKey={d.task_key} onDone={() => { setEditing(false); onDone?.(); }} />
          ) : (
            needsReview && <ReviewBox d={d} taskKey={d.task_key} onDone={onDone} />
          )}
        </div>
      )}
    </div>
  );
};

const DecisionsTab = ({ onChanged, tick }) => {
  const [rows, setRows] = useState([]);
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/agent/decisions', { params: { unreviewed: onlyOpen, limit: 50 } });
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [onlyOpen, tick]);

  useEffect(() => { load(); }, [load]);

  return (
    <Section
      title="החלטות של יואב"
      actions={
        <button className={btnGhost} onClick={() => setOnlyOpen((v) => !v)}>
          {onlyOpen ? 'הצג גם שנבדקו' : 'רק לבדיקה'}
        </button>
      }
    >
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        במצב צל יואב רק מחליט. סמן כאן מה הייתה ההחלטה הנכונה — זה מה שמודד את הדיוק שלו, ותיקונים נשמרים כדוגמאות שהוא לומד מהן.
      </p>
      {loading ? (
        <Empty>טוען…</Empty>
      ) : rows.length === 0 ? (
        <Empty>אין החלטות לבדיקה 🎉</Empty>
      ) : (
        <div className="space-y-4">
          {rows.map((d) => (
            <DecisionCard key={d.id} d={d} onDone={() => { load(); onChanged?.(); }} />
          ))}
        </div>
      )}
    </Section>
  );
};

export default DecisionsTab;
export { DecisionCard };
