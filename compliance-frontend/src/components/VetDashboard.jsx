import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, Activity, ShieldCheck, ArrowRight } from 'lucide-react';

export default function VetDashboard({ treatments = [], loading }) {
  const navigate = useNavigate();

  // Filter treatments by vet status
  const pendingTreatments = treatments.filter(
    (t) => !t.vet_decision_status || t.vet_decision_status === 'Pending'
  );
  
  const reviewedTreatments = treatments.filter(
    (t) => t.vet_decision_status && t.vet_decision_status !== 'Pending'
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-2">
        <div>
          <h2 className="section-title">Veterinarian Dashboard</h2>
          <p className="section-subtitle mt-0.5">Overview of AI predictions awaiting your clinical review</p>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Card */}
        <div className="stat-card border-amber-500/30">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">Action Required</h3>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Clock size={18} className="text-amber-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-100 mt-2">
            {loading ? '—' : pendingTreatments.length}
          </p>
          <p className="text-xs text-amber-400 mt-2 font-medium">Pending Vet Review</p>
        </div>

        {/* Reviewed Card */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">Total Reviewed</h3>
            <div className="p-2 bg-brand-500/10 rounded-lg">
              <CheckCircle2 size={18} className="text-brand-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-100 mt-2">
            {loading ? '—' : reviewedTreatments.length}
          </p>
          <p className="text-xs text-slate-500 mt-2 font-medium">Historically resolved</p>
        </div>
      </div>

      {/* ── Pending Queue Table ───────────────────────────────────────────── */}
      <section className="glass-card">
        <div className="p-6 border-b border-slate-800/60 flex items-center justify-between">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <ShieldCheck size={18} className="text-brand-400" />
              Priority Review Queue
            </h2>
            <p className="section-subtitle mt-0.5">
              These prescriptions have AI-generated withdrawal periods and require a vet's final sign-off.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-800/60 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : pendingTreatments.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-3" />
              <p className="text-slate-200 font-medium text-lg">You're all caught up!</p>
              <p className="text-slate-400 text-sm mt-1">
                There are no pending treatments awaiting your review.
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date Logged</th>
                  <th>Animal</th>
                  <th>Drug</th>
                  <th>AI Predicted Days</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingTreatments.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="text-slate-400 text-sm">
                      {new Date(t.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                          {t.livestock_tag}
                        </span>
                        <span className="text-xs text-slate-500">{t.livestock_species}</span>
                      </div>
                    </td>
                    <td className="font-medium text-slate-200">{t.drug_name}</td>
                    <td>
                      <span className="font-semibold text-violet-400 px-2 py-1 bg-violet-500/10 rounded-md">
                        {t.predicted_clearance_days != null
                          ? `${t.predicted_clearance_days} days`
                          : '—'}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => navigate('/clinical-history')}
                        className="flex items-center gap-1.5 text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
                      >
                        Review Case <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
