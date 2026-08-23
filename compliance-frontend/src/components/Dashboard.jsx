import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { fetchTreatments, fetchLivestock } from '../api';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: format a date string (YYYY-MM-DD) to a human-readable form
// ─────────────────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// StatCard — animated summary metric tile
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subtext, colorClass, bgClass }) {
  return (
    <div className="stat-card animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className={`text-4xl font-bold mt-1 ${colorClass}`}>{value}</p>
          {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl ${bgClass}`}>
          <Icon size={22} className={colorClass} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ComplianceBadge — pill badge for table rows
// ─────────────────────────────────────────────────────────────────────────────
function ComplianceBadge({ status, daysRemaining }) {
  if (status === 'Compliant') {
    return (
      <span className="badge-compliant">
        <CheckCircle2 size={11} />
        Compliant
      </span>
    );
  }
  if (status === 'Under Withdrawal') {
    return (
      <span className="badge-withdrawal">
        <Clock size={11} />
        {daysRemaining != null ? `${daysRemaining}d remaining` : 'Under Withdrawal'}
      </span>
    );
  }
  return <span className="badge-unknown">Unknown</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard (main export)
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [treatments, setTreatments] = useState([]);
  const [livestock, setLivestock]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [treatmentsData, livestockData] = await Promise.all([
        fetchTreatments(),
        fetchLivestock(),
      ]);
      setTreatments(treatmentsData);
      setLivestock(livestockData);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalAnimals      = livestock.length;
  const activeTreatments  = treatments.length;
  const compliantCount    = treatments.filter(t => t.compliance_status === 'Compliant').length;
  const withdrawalCount   = treatments.filter(t => t.compliance_status === 'Under Withdrawal').length;

  return (
    <div className="min-h-screen bg-slate-950">

      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/15 rounded-xl">
              <ShieldCheck size={24} className="text-brand-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 leading-none">LiveStock Comply</h1>
              <p className="text-xs text-slate-500 mt-0.5">AI Withdrawal Compliance Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="hidden sm:block text-xs text-slate-500">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 animate-fade-in">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="text-sm">
              <strong>Connection Error:</strong> {error}. Make sure the Django server is running on port 8000.
            </span>
          </div>
        )}

        {/* ── Summary Stat Cards ─────────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="Total Livestock"
              value={loading ? '—' : totalAnimals}
              subtext="Registered animals"
              colorClass="text-sky-400"
              bgClass="bg-sky-500/10"
            />
            <StatCard
              icon={Activity}
              label="Active Treatments"
              value={loading ? '—' : activeTreatments}
              subtext="All prescriptions on record"
              colorClass="text-violet-400"
              bgClass="bg-violet-500/10"
            />
            <StatCard
              icon={CheckCircle2}
              label="Compliant"
              value={loading ? '—' : compliantCount}
              subtext="Safe to market"
              colorClass="text-brand-400"
              bgClass="bg-brand-500/10"
            />
            <StatCard
              icon={AlertTriangle}
              label="MRL Alerts"
              value={loading ? '—' : withdrawalCount}
              subtext="Active withdrawal periods"
              colorClass="text-amber-400"
              bgClass="bg-amber-500/10"
            />
          </div>
        </section>

        {/* ── Compliance Rate Indicator ──────────────────────────────────── */}
        {!loading && activeTreatments > 0 && (
          <section className="glass-card p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-brand-400" />
                <span className="section-title">Herd Compliance Rate</span>
              </div>
              <span className="text-2xl font-bold text-brand-400">
                {Math.round((compliantCount / activeTreatments) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-1000"
                style={{ width: `${(compliantCount / activeTreatments) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {compliantCount} of {activeTreatments} treated animals are currently market-ready
            </p>
          </section>
        )}

        {/* ── Recent Treatments Table ────────────────────────────────────── */}
        <section className="glass-card animate-slide-up">
          <div className="p-6 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <h2 className="section-title">Recent Treatments &amp; Compliance</h2>
              <p className="section-subtitle mt-0.5">
                AI-predicted withdrawal periods vs. today's date
              </p>
            </div>
            {!loading && (
              <span className="text-xs px-2.5 py-1 bg-slate-800 rounded-full text-slate-400 border border-slate-700">
                {activeTreatments} records
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              /* Skeleton rows */
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-800/60 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : treatments.length === 0 ? (
              <div className="p-12 text-center">
                <Activity size={36} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400 font-medium">No treatments recorded yet</p>
                <p className="text-slate-600 text-sm mt-1">
                  Use the "Log Treatment" form to record the first prescription.
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Animal Tag</th>
                    <th>Species</th>
                    <th>Drug</th>
                    <th>Dosage (mg/kg)</th>
                    <th>Route</th>
                    <th>Predicted Days</th>
                    <th>Safe Market Date</th>
                    <th>Status</th>
                    <th>Logged On</th>
                  </tr>
                </thead>
                <tbody>
                  {treatments.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                          {t.livestock_tag}
                        </span>
                      </td>
                      <td className="text-slate-400">{t.livestock_species}</td>
                      <td className="font-medium text-slate-200">{t.drug_name}</td>
                      <td className="text-slate-400">{t.dosage_mg_kg}</td>
                      <td className="text-slate-400">{t.route}</td>
                      <td>
                        <span className="font-semibold text-violet-400">
                          {t.predicted_clearance_days != null
                            ? `${t.predicted_clearance_days}d`
                            : '—'}
                        </span>
                      </td>
                      <td className="text-slate-300">{formatDate(t.safe_market_date)}</td>
                      <td>
                        <ComplianceBadge
                          status={t.compliance_status}
                          daysRemaining={t.days_remaining}
                        />
                      </td>
                      <td className="text-slate-500 text-xs">
                        {new Date(t.created_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
