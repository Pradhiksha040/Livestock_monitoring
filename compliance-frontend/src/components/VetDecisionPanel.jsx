/**
 * VetDecisionPanel.jsx — Veterinarian Review Interface
 * ======================================================
 * This component is shown to the veterinarian after the AI has generated
 * a withdrawal period prediction. It allows them to:
 *   1. Read the AI's prediction and all prescription details.
 *   2. Add clinical notes explaining their reasoning.
 *   3. Choose a formal decision (Approve / Modify / Reject).
 *   4. Override the market date if choosing 'Modified'.
 *   5. PATCH the decision to the backend and see confirmation.
 *
 * Props:
 *   treatment   {Object}   A full treatment object from GET /api/treatments/
 *   onReviewed  {Function} Callback fired after a successful PATCH, receives updated treatment
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  BotMessageSquare,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardPen,
  Loader2,
  Send,
  Stethoscope,
  XCircle,
} from 'lucide-react';
import { submitVetReview } from '../api';

// ─── Decision option configuration ────────────────────────────────────────────
// Defined outside the component to avoid re-creation on every render.
const DECISION_OPTIONS = [
  {
    value:       'Approved',
    label:       'Approve AI Prediction',
    description: "Endorse the AI's withdrawal period without changes.",
    icon:        CheckCircle2,
    color:       'text-emerald-400',
    ring:        'ring-emerald-500/40 bg-emerald-500/10 border-emerald-500/40',
    badge:       'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  {
    value:       'Modified',
    label:       'Modify Safe Date',
    description: 'Override the AI date with your clinical judgement.',
    icon:        CalendarClock,
    color:       'text-amber-400',
    ring:        'ring-amber-500/40 bg-amber-500/10 border-amber-500/40',
    badge:       'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  {
    value:       'Rejected',
    label:       'Reject Treatment',
    description: 'Flag this treatment as clinically inadvisable.',
    icon:        XCircle,
    color:       'text-red-400',
    ring:        'ring-red-500/40 bg-red-500/10 border-red-500/40',
    badge:       'bg-red-500/15 text-red-400 border-red-500/30',
  },
];

// ─── Helper: format a YYYY-MM-DD string to a human-readable date ───────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day:     '2-digit',
    month:   'long',
    year:    'numeric',
  });
};

// ─── Sub-component: AI Prediction Summary Banner ───────────────────────────────
function AIPredictionBanner({ treatment }) {
  return (
    <div className="rounded-xl bg-violet-500/10 border border-violet-500/25 p-4">
      <div className="flex items-center gap-2 text-violet-400 font-semibold text-sm mb-3">
        <BotMessageSquare size={16} />
        AI Model Prediction
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Clearance days — the primary AI output */}
        <div className="bg-slate-900/60 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-0.5">Predicted Clearance</p>
          <p className="text-3xl font-bold text-violet-400 leading-none">
            {treatment.predicted_clearance_days ?? '—'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">days</p>
        </div>

        {/* AI's calculated safe date */}
        <div className="bg-slate-900/60 rounded-lg p-3 text-center col-span-1 sm:col-span-2">
          <p className="text-xs text-slate-500 mb-0.5">AI Safe Market Date</p>
          <p className="text-sm font-semibold text-slate-200 leading-snug mt-1">
            {formatDate(treatment.safe_market_date)}
          </p>
        </div>
      </div>

      {/* Prescription summary */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
          {treatment.livestock_tag}
        </span>
        <span className="text-slate-500">{treatment.livestock_species}</span>
        <span className="text-slate-600">•</span>
        <span className="text-slate-400">{treatment.drug_name}</span>
        <span className="text-slate-600">@</span>
        <span className="text-slate-400">{treatment.dosage_mg_kg} mg/kg</span>
        <span className="text-slate-600">•</span>
        <span className="text-slate-400">{treatment.route}</span>
      </div>
    </div>
  );
}

// ─── Sub-component: Decision Radio Cards ──────────────────────────────────────
function DecisionSelector({ value, onChange }) {
  return (
    <div className="space-y-2">
      {DECISION_OPTIONS.map(({ value: optValue, label, description, icon: Icon, color, ring }) => {
        const isSelected = value === optValue;
        return (
          <button
            key={optValue}
            type="button"
            onClick={() => onChange(optValue)}
            className={`
              w-full text-left flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200
              ${isSelected
                ? `${ring} ring-1`
                : 'border-slate-700/60 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/60'
              }
            `}
          >
            {/* Radio circle */}
            <span className={`
              flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors
              ${isSelected ? `border-current ${color}` : 'border-slate-600'}
            `}>
              {isSelected && <span className="w-2 h-2 rounded-full bg-current" />}
            </span>

            <Icon size={18} className={isSelected ? color : 'text-slate-500'} />

            <div>
              <p className={`text-sm font-medium ${isSelected ? color : 'text-slate-300'}`}>
                {label}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function VetDecisionPanel({ treatment, onReviewed }) {
  // ── Form state ─────────────────────────────────────────────────────────────
  const [decision,       setDecision]       = useState(treatment.vet_decision_status || 'Approved');
  const [clinicalNotes,  setClinicalNotes]  = useState(treatment.vet_clinical_notes  || '');
  const [finalDate,      setFinalDate]      = useState(treatment.final_safe_market_date || '');

  // ── UI state ───────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [apiError,   setApiError]   = useState(null);
  const [success,    setSuccess]    = useState(null);  // Stores the confirmation message

  // Determines whether the date picker is shown (only for 'Modified')
  const showDatePicker = decision === 'Modified';

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    setSuccess(null);

    // Client-side guard: if 'Modified', a date is required
    if (decision === 'Modified' && !finalDate) {
      setApiError('Please choose an overriding safe market date before submitting.');
      return;
    }

    // Build the PATCH payload — only include final_safe_market_date when relevant
    const payload = {
      vet_decision_status: decision,
      vet_clinical_notes:  clinicalNotes.trim() || null, // Send null if blank (clears the field)
      ...(decision === 'Modified' ? { final_safe_market_date: finalDate } : {}),
    };

    setSubmitting(true);
    try {
      // submitVetReview uses the JWT-aware apiFetch from api.js
      const response = await submitVetReview(treatment.id, payload);
      setSuccess(response.message);
      // Notify the parent component (e.g., to refresh the treatments list or update state)
      if (onReviewed) onReviewed(response.data);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="glass-card animate-slide-up">

      {/* ── Panel Header ──────────────────────────────────────────────────── */}
      <div className="p-5 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 rounded-xl">
            <Stethoscope size={20} className="text-sky-400" />
          </div>
          <div>
            <h2 className="section-title">Veterinarian Review</h2>
            <p className="section-subtitle mt-0.5">
              Review the AI prediction and share your clinical decision with the farmer.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">

        {/* ── AI Prediction Context ────────────────────────────────────────── */}
        <AIPredictionBanner treatment={treatment} />

        {/* ── Clinical Notes Textarea ──────────────────────────────────────── */}
        <div>
          <label className="form-label flex items-center gap-1.5" htmlFor="vet-notes">
            <ClipboardPen size={13} />
            Clinical Notes &amp; Details
            <span className="text-slate-600 font-normal">(shared with farmer)</span>
          </label>
          <textarea
            id="vet-notes"
            rows={4}
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            placeholder="e.g. Animal showed strong immune response. AI prediction is conservative — actual clearance may be faster. Monitor for secondary infection…"
            className="form-input resize-none leading-relaxed"
          />
        </div>

        {/* ── Decision Selector ────────────────────────────────────────────── */}
        <div>
          <label className="form-label flex items-center gap-1.5">
            <Stethoscope size={13} />
            Clinical Decision
          </label>
          <DecisionSelector value={decision} onChange={setDecision} />
        </div>

        {/* ── Conditional Date Picker (only for 'Modified') ────────────────── */}
        {showDatePicker && (
          <div className="animate-fade-in">
            <label className="form-label flex items-center gap-1.5" htmlFor="final-date">
              <CalendarClock size={13} />
              Overriding Safe Market Date
              <span className="text-red-400 ml-0.5">*</span>
            </label>
            <input
              id="final-date"
              type="date"
              value={finalDate}
              onChange={(e) => setFinalDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]} // Cannot set date in the past
              className="form-input"
              required
            />
            <p className="text-xs text-amber-400/80 mt-1.5 flex items-center gap-1">
              <AlertTriangle size={11} />
              This date will replace the AI's recommendation. The farmer will see this as the authoritative date.
            </p>
          </div>
        )}

        {/* ── Error / Success Banners ──────────────────────────────────────── */}
        {apiError && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-fade-in">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm animate-fade-in">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* ── Submit Button ─────────────────────────────────────────────────── */}
        <button
          type="submit"
          id="vet-submit-btn"
          disabled={submitting}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving Decision…
            </>
          ) : (
            <>
              <Send size={16} />
              Share Decision with Farmer
            </>
          )}
        </button>
      </form>
    </div>
  );
}
