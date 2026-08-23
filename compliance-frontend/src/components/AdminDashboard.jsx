import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div>
          <h2 className="section-title">Admin Dashboard</h2>
          <p className="section-subtitle mt-0.5">System-wide compliance overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card border-red-500/30">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">Total Non-Compliant Farms</h3>
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-100 mt-2">2</p>
          <p className="text-xs text-red-400 mt-2 font-medium">Action required</p>
        </div>
      </div>
    </div>
  );
}
