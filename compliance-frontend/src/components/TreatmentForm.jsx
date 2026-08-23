import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FlaskConical,
  Loader2,
  Send,
  Syringe,
  X,
} from 'lucide-react';
import { fetchLivestock, createTreatment } from '../api';

// ─────────────────────────────────────────────────────────────────────────────
// Constants — must match the values the AI model was trained on exactly
// ─────────────────────────────────────────────────────────────────────────────
const DRUG_OPTIONS = [
  'Oxytetracycline',
  'Amoxicillin',
  'Penicillin',
  'Tylosin',
];

const ROUTE_OPTIONS = ['Injectable', 'Oral', 'Topical'];

const HEALTH_OPTIONS = [
  { value: 'Healthy', label: '😊 Healthy' },
  { value: 'Mild Infection', label: '😷 Mild Infection' },
  { value: 'Severe Infection', label: '🤒 Severe Infection' },
];

// Dosage hint ranges per drug (informational only)
const DOSAGE_HINTS = {
  Oxytetracycline: '10 – 30 mg/kg',
  Amoxicillin:     '5 – 15 mg/kg',
  Penicillin:      '10 – 25 mg/kg',
  Tylosin:         '5 – 20 mg/kg',
};

const INITIAL_FORM = {
  livestock: '',
  drug_name: '',
  dosage_mg_kg: '',
  route: '',
  health_status: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// AIResultCard — shown after a successful prediction
// ─────────────────────────────────────────────────────────────────────────────
function AIResultCard({ result, onDismiss }) {
  const { data } = result;
  const isCompliant = data.compliance_status === 'Compliant';

  const formatDate = (dateStr) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  return (
    <div className="animate-slide-up rounded-2xl overflow-hidden border border-brand-500/40 bg-gradient-to-br from-brand-900/30 to-slate-900/60 shadow-xl shadow-brand-900/20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-brand-500/10 border-b border-brand-500/20">
        <div className="flex items-center gap-2 text-brand-400 font-semibold">
          <CheckCircle2 size={18} />
          AI Prediction Complete
        </div>
        <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Primary metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-slate-800/60 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Withdrawal Period</p>
            <p className="text-3xl font-bold text-violet-400">
              {data.predicted_clearance_days}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">days</p>
          </div>
          <div className="text-center p-4 bg-slate-800/60 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">Safe Market Date</p>
            <p className="text-sm font-bold text-brand-400 leading-tight mt-1">
              {formatDate(data.safe_market_date)}
            </p>
          </div>
        </div>

        {/* Compliance status */}
        <div className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium
          ${isCompliant
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
          }`}
        >
          {isCompliant
            ? <CheckCircle2 size={16} />
            : <AlertTriangle size={16} />
          }
          Current Status: <strong>{data.compliance_status}</strong>
          {data.days_remaining != null && (
            <span className="ml-auto text-xs opacity-75">
              {data.days_remaining} days to go
            </span>
          )}
        </div>

        {/* Animal info */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">
            {data.livestock_tag}
          </span>
          <span>{data.livestock_species}</span>
          <span>•</span>
          <span>{data.drug_name} @ {data.dosage_mg_kg} mg/kg</span>
          <span>•</span>
          <span>{data.route}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TreatmentForm (main export)
// ─────────────────────────────────────────────────────────────────────────────
export default function TreatmentForm({ onSuccess }) {
  const [livestock, setLivestock] = useState([]);
  const [form, setForm]           = useState(INITIAL_FORM);
  const [errors, setErrors]       = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError]   = useState(null);
  const [result, setResult]       = useState(null);

  // Load livestock for the dropdown on mount
  useEffect(() => {
    fetchLivestock()
      .then(setLivestock)
      .catch(() => {}); // Silently fail — dashboard also shows errors
  }, []);

  // ── Field change handler ─────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field-level error on change
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
    setApiError(null);
  };

  // ── Client-side validation ───────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};
    if (!form.livestock)    newErrors.livestock    = 'Please select an animal.';
    if (!form.drug_name)    newErrors.drug_name    = 'Please select a drug.';
    if (!form.dosage_mg_kg) newErrors.dosage_mg_kg = 'Dosage is required.';
    else if (isNaN(parseFloat(form.dosage_mg_kg)) || parseFloat(form.dosage_mg_kg) <= 0)
      newErrors.dosage_mg_kg = 'Enter a valid positive number.';
    if (!form.route)        newErrors.route        = 'Please select a route.';
    if (!form.health_status) newErrors.health_status = 'Please select a health status.';
    return newErrors;
  };

  // ── Form submission ──────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setApiError(null);

    try {
      const payload = {
        livestock:    parseInt(form.livestock, 10),
        drug_name:    form.drug_name,
        dosage_mg_kg: parseFloat(form.dosage_mg_kg),
        route:        form.route,
        health_status: form.health_status,
      };

      const data = await createTreatment(payload);
      setResult(data);
      setForm(INITIAL_FORM); // Reset form on success
      if (onSuccess) onSuccess(); // Trigger parent refresh (e.g., reload treatments table)
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  const selectedAnimal = livestock.find(l => String(l.id) === String(form.livestock));

  return (
    <div className="glass-card animate-slide-up">
      {/* Card Header */}
      <div className="p-6 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-500/10 rounded-xl">
            <Syringe size={20} className="text-violet-400" />
          </div>
          <div>
            <h2 className="section-title">Log New Treatment</h2>
            <p className="section-subtitle mt-0.5">
              AI will calculate the withdrawal period automatically
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">

        {/* ── Row 1: Animal select ─────────────────────────────────────── */}
        <div>
          <label className="form-label" htmlFor="livestock">
            Animal (Livestock Tag)
          </label>
          <div className="relative">
            <select
              id="livestock"
              name="livestock"
              value={form.livestock}
              onChange={handleChange}
              className={`form-input pr-10 appearance-none ${errors.livestock ? 'border-red-500/80' : ''}`}
            >
              <option value="">— Select an animal —</option>
              {livestock.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.tag_id} — {l.species} ({l.weight_kg} kg, {l.age_months} mo)
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
          {selectedAnimal && (
            <p className="text-xs text-brand-400 mt-1.5 flex items-center gap-1">
              <CheckCircle2 size={11} />
              {selectedAnimal.species} · {selectedAnimal.weight_kg.toFixed(1)} kg · {selectedAnimal.age_months.toFixed(0)} months old
            </p>
          )}
          {errors.livestock && <p className="text-xs text-red-400 mt-1">{errors.livestock}</p>}
        </div>

        {/* ── Row 2: Drug + Dosage ────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label" htmlFor="drug_name">
              Drug Name
            </label>
            <div className="relative">
              <select
                id="drug_name"
                name="drug_name"
                value={form.drug_name}
                onChange={handleChange}
                className={`form-input pr-10 appearance-none ${errors.drug_name ? 'border-red-500/80' : ''}`}
              >
                <option value="">— Select a drug —</option>
                {DRUG_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            {errors.drug_name && <p className="text-xs text-red-400 mt-1">{errors.drug_name}</p>}
          </div>

          <div>
            <label className="form-label" htmlFor="dosage_mg_kg">
              Dosage (mg/kg)
              {form.drug_name && (
                <span className="ml-2 text-slate-600 font-normal">
                  Typical: {DOSAGE_HINTS[form.drug_name]}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                id="dosage_mg_kg"
                name="dosage_mg_kg"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="e.g. 15.5"
                value={form.dosage_mg_kg}
                onChange={handleChange}
                className={`form-input pr-16 ${errors.dosage_mg_kg ? 'border-red-500/80' : ''}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
                mg/kg
              </span>
            </div>
            {errors.dosage_mg_kg && <p className="text-xs text-red-400 mt-1">{errors.dosage_mg_kg}</p>}
          </div>
        </div>

        {/* ── Row 3: Route + Health Status ───────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label" htmlFor="route">
              Administration Route
            </label>
            <div className="relative">
              <select
                id="route"
                name="route"
                value={form.route}
                onChange={handleChange}
                className={`form-input pr-10 appearance-none ${errors.route ? 'border-red-500/80' : ''}`}
              >
                <option value="">— Select route —</option>
                {ROUTE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            {errors.route && <p className="text-xs text-red-400 mt-1">{errors.route}</p>}
          </div>

          <div>
            <label className="form-label" htmlFor="health_status">
              Animal Health Status
            </label>
            <div className="relative">
              <select
                id="health_status"
                name="health_status"
                value={form.health_status}
                onChange={handleChange}
                className={`form-input pr-10 appearance-none ${errors.health_status ? 'border-red-500/80' : ''}`}
              >
                <option value="">— Select health —</option>
                {HEALTH_OPTIONS.map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            {errors.health_status && <p className="text-xs text-red-400 mt-1">{errors.health_status}</p>}
          </div>
        </div>

        {/* ── API Error Banner ────────────────────────────────────────── */}
        {apiError && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-fade-in">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        {/* ── AI Note ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <FlaskConical size={14} className="text-violet-400 shrink-0" />
          <p className="text-xs text-slate-500">
            The AI model will analyse species, weight, age, drug, dosage, route, and health to predict the personalised withdrawal period.
          </p>
        </div>

        {/* ── Submit Button ───────────────────────────────────────────── */}
        <button
          type="submit"
          id="submit-treatment-btn"
          disabled={submitting}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Running AI Prediction…
            </>
          ) : (
            <>
              <Send size={16} />
              Log Treatment &amp; Predict Withdrawal
            </>
          )}
        </button>
      </form>

      {/* ── AI Result Card ─────────────────────────────────────────────── */}
      {result && (
        <div className="px-6 pb-6">
          <AIResultCard result={result} onDismiss={() => setResult(null)} />
        </div>
      )}
    </div>
  );
}
