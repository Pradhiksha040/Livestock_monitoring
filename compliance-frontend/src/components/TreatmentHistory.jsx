/**
 * TreatmentHistory.jsx — Farmer's Treatment History View
 * ========================================================
 * Displays a list of treatment cards from the farmer's perspective.
 * The key design principle: the Vet's final decision is always the most
 * visually prominent element — farmers must not act on the AI prediction alone.
 *
 * Each card shows:
 *  ┌─────────────────────────────────────────────────────┐
 *  │ 🏷 COW-001  Cattle  •  Oxytetracycline              │
 *  │ ┌───────────────┐  ┌────────────────────────────┐   │
 *  │ │ 🤖 AI Says    │  │ ✅ VET'S FINAL DECISION    │   │
 *  │ │ 14 days       │  │ Approved / Modified / etc. │   │
 *  │ │ Aug 26, 2026  │  │ Final Date: Sept 01, 2026  │   │
 *  │ └───────────────┘  └────────────────────────────┘   │
 *  │ 📋 Vet Notes: "Monitor for secondary infection…"    │
 *  └─────────────────────────────────────────────────────┘
 *
 * Props:
 *   treatments {Array}  Array of treatment objects from GET /api/treatments/
 *   loading    {boolean} Shows skeleton loaders while fetching
 */

import React from 'react';
import {
  Activity,
  AlertTriangle,
  BotMessageSquare,
  CalendarClock,
  CheckCircle2,
  Clock,
  ClipboardPen,
  Stethoscope,
  XCircle,
} from 'lucide-react';

// ─── Helper: format a YYYY-MM-DD string to a human-readable date ───────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day:   '2-digit',
    month: 'long',
    year:  'numeric',
  });
};

// ─── Decision display configuration ───────────────────────────────────────────
// Maps the backend's vet_decision_status value to display properties.
const DECISION_CONFIG = {
  Pending: {
    label:     'Awaiting Vet Review',
    icon:      Clock,
    cardStyle: 'bg-slate-700/20 border-slate-600/40',
    badgeStyle:'bg-slate-500/15 text-slate-400 border-slate-500/30',
    iconColor: 'text-slate-400',
    note:      'The veterinarian has not yet reviewed this AI prediction.',
  },
  Approved: {
    label:     'Vet Approved',
    icon:      CheckCircle2,
    cardStyle: 'bg-emerald-500/10 border-emerald-500/30',
    badgeStyle:'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    note:      null, // No extra note needed — vet notes are shown separately
  },
  Modified: {
    label:     'Vet Modified Date',
    icon:      CalendarClock,
    cardStyle: 'bg-amber-500/10 border-amber-500/30',
    badgeStyle:'bg-amber-500/15 text-amber-400 border-amber-500/30',
    iconColor: 'text-amber-400',
    note:      'The vet has overridden the AI date. Use the vet\'s date shown below.',
  },
  Rejected: {
    label:     'Treatment Rejected',
    icon:      XCircle,
    cardStyle: 'bg-red-500/10 border-red-500/30',
    badgeStyle:'bg-red-500/15 text-red-400 border-red-500/30',
    iconColor: 'text-red-400',
    note:      'This treatment has been rejected by the veterinarian. Do not market this animal.',
  },
};

// ─── Sub-component: Skeleton Loader ───────────────────────────────────────────
function TreatmentCardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3 animate-pulse">
      <div className="flex gap-3">
        <div className="h-5 w-24 bg-slate-700/60 rounded-md" />
        <div className="h-5 w-16 bg-slate-700/40 rounded-md" />
        <div className="h-5 w-32 bg-slate-700/40 rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 bg-slate-800/60 rounded-xl" />
        <div className="h-20 bg-slate-800/60 rounded-xl" />
      </div>
      <div className="h-10 bg-slate-800/40 rounded-lg" />
    </div>
  );
}

// ─── Sub-component: Individual Treatment Card ──────────────────────────────────
function TreatmentCard({ treatment, onSelectForReview }) {
  const decisionStatus = treatment.vet_decision_status || 'Pending';
  const config         = DECISION_CONFIG[decisionStatus] || DECISION_CONFIG.Pending;
  const DecisionIcon   = config.icon;

  // The authoritative date for the farmer:
  // - If vet modified, use final_safe_market_date
  // - Otherwise use the AI's safe_market_date
  const authoritativeDate = decisionStatus === 'Modified' && treatment.final_safe_market_date
    ? treatment.final_safe_market_date
    : treatment.safe_market_date;

  return (
    <article className="glass-card overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-900/10">

      {/* ── Card Header: Animal & Drug Info ──────────────────────────────── */}
      <div className="px-5 py-4 border-b border-slate-800/60 flex flex-wrap items-center gap-2">
        {/* Animal tag */}
        <span className="font-mono text-xs bg-slate-800 px-2.5 py-1 rounded-md text-slate-200 border border-slate-700">
          {treatment.livestock_tag || `#${treatment.livestock}`}
        </span>
        <span className="text-sm text-slate-400">{treatment.livestock_species}</span>
        <span className="text-slate-700">•</span>
        <span className="text-sm font-medium text-slate-200">{treatment.drug_name}</span>
        <span className="text-xs text-slate-500">@ {treatment.dosage_mg_kg} mg/kg</span>
        <span className="text-slate-700">•</span>
        <span className="text-xs text-slate-500">{treatment.route}</span>

        {/* Compliance badge (right-aligned) */}
        <div className="ml-auto">
          {treatment.compliance_status === 'Compliant' ? (
            <span className="badge-compliant">
              <CheckCircle2 size={11} /> Compliant
            </span>
          ) : treatment.compliance_status === 'Under Withdrawal' ? (
            <span className="badge-withdrawal">
              <Clock size={11} />
              {treatment.days_remaining != null
                ? `${treatment.days_remaining}d remaining`
                : 'Under Withdrawal'}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Card Body ────────────────────────────────────────────────────── */}
      <div className="p-5 space-y-4">

        {/* ── Two-column: AI Prediction vs Vet Decision ─────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* AI Prediction Panel */}
          <div className="rounded-xl bg-violet-500/10 border border-violet-500/25 p-4">
            <div className="flex items-center gap-1.5 text-violet-400 text-xs font-semibold mb-2">
              <BotMessageSquare size={13} />
              AI Prediction
            </div>
            <p className="text-slate-500 text-xs mb-1">Predicted clearance</p>
            <p className="text-2xl font-bold text-violet-300 leading-none">
              {treatment.predicted_clearance_days ?? '—'}
              <span className="text-sm font-normal text-slate-400 ml-1">days</span>
            </p>
            <p className="text-xs text-slate-500 mt-2">Market date</p>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              {formatDate(treatment.safe_market_date)}
            </p>
          </div>

          {/* Vet Decision Panel — deliberately larger / more prominent */}
          <div className={`rounded-xl border p-4 ${config.cardStyle}`}>
            <div className={`flex items-center gap-1.5 text-xs font-semibold mb-2 ${config.iconColor}`}>
              <Stethoscope size={13} />
              Vet's Final Decision
            </div>

            {/* Decision badge */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.badgeStyle}`}>
              <DecisionIcon size={11} />
              {config.label}
            </span>

            {/* Authoritative date (only when not Pending/Rejected) */}
            {(decisionStatus === 'Approved' || decisionStatus === 'Modified') && (
              <div className="mt-3">
                <p className="text-xs text-slate-500">
                  {decisionStatus === 'Modified' ? 'Vet Override Date ⚠' : 'Confirmed Date'}
                </p>
                <p className={`text-sm font-bold mt-0.5 ${config.iconColor}`}>
                  {formatDate(authoritativeDate)}
                </p>
              </div>
            )}

            {/* Override alert for Modified status */}
            {config.note && (
              <p className={`text-xs mt-2 opacity-80 ${config.iconColor}`}>
                {config.note}
              </p>
            )}
          </div>
        </div>

        {/* ── Vet Clinical Notes (shown only if notes exist) ─────────────── */}
        {treatment.vet_clinical_notes && (
          <div className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-4">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-2">
              <ClipboardPen size={13} />
              Vet's Clinical Notes
            </div>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {treatment.vet_clinical_notes}
            </p>
          </div>
        )}

        {/* ── Rejection Warning Banner ──────────────────────────────────── */}
        {decisionStatus === 'Rejected' && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>
              <strong>Do not market this animal.</strong>{' '}
              {treatment.vet_clinical_notes
                ? 'See vet notes above for details.'
                : 'Contact your veterinarian immediately for guidance.'}
            </span>
          </div>
        )}

        {/* ── Pending Review Note ───────────────────────────────────────── */}
        {decisionStatus === 'Pending' && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-700/20 border border-slate-600/30 text-slate-400 text-sm">
            <Clock size={16} className="shrink-0 mt-0.5" />
            <span>
              The veterinarian has not yet reviewed this prescription. The AI date shown above is provisional — wait for vet approval before making marketing decisions.
            </span>
          </div>
        )}

        {/* ── Footer: Logged date + Vet Review button ─────────────────── */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-slate-600">
            Logged {new Date(treatment.created_at).toLocaleString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
          {/* Only shown when the parent passes an onSelectForReview handler */}
          {onSelectForReview && (
            <button
              onClick={() => onSelectForReview(treatment)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                         border border-sky-500/40 text-sky-400 bg-sky-500/10
                         hover:bg-sky-500/20 hover:border-sky-500/60 transition-all duration-200"
            >
              <Stethoscope size={12} />
              Vet Review
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export default function TreatmentHistory({ treatments = [], loading = false, onSelectForReview }) {
  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="section-title">Treatment History</h2>
        </div>
        {[...Array(3)].map((_, i) => <TreatmentCardSkeleton key={i} />)}
      </section>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (treatments.length === 0) {
    return (
      <section className="glass-card p-12 text-center">
        <Activity size={40} className="mx-auto text-slate-600 mb-3" />
        <p className="text-slate-400 font-medium">No treatments recorded yet</p>
        <p className="text-slate-600 text-sm mt-1">
          Treatments will appear here once a veterinarian logs a prescription.
        </p>
      </section>
    );
  }

  // ── Render list of cards ──────────────────────────────────────────────────
  return (
    <section className="space-y-4">
      {/* Section header with record count */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Treatment History</h2>
          <p className="section-subtitle mt-0.5">
            Farmer view — vet decisions are shown alongside AI predictions
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-slate-800 rounded-full text-slate-400 border border-slate-700">
          {treatments.length} records
        </span>
      </div>

      {/* Cards list — pass onSelectForReview so each card can trigger vet panel */}
      {treatments.map((treatment) => (
        <TreatmentCard
          key={treatment.id}
          treatment={treatment}
          onSelectForReview={onSelectForReview}
        />
      ))}
    </section>
  );
}
