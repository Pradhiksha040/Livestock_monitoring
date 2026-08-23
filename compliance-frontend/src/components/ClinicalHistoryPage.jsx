import React, { useState } from 'react';
import TreatmentHistory from './TreatmentHistory';
import VetDecisionPanel from './VetDecisionPanel';
import { getUserRole } from '../api';

export default function ClinicalHistoryPage({ treatments, loading, onRefresh }) {
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const isVet = getUserRole() === 'VET';

  const handleTreatmentReviewed = (updatedTreatment) => {
    // We update the local state if needed, or just let the app reload it.
    // For now, let's call onRefresh so the app refetches the whole list.
    if (onRefresh) onRefresh();
    setSelectedTreatment(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className={`grid grid-cols-1 ${selectedTreatment ? 'lg:grid-cols-[1fr_400px]' : ''} gap-6`}>
        {/* The main history list */}
        <div className="transition-all duration-300">
          <TreatmentHistory
            treatments={treatments}
            loading={loading}
            onSelectForReview={isVet ? setSelectedTreatment : undefined}
          />
        </div>

        {/* The slide-out vet review panel */}
        {selectedTreatment && (
          <div className="animate-slide-left sticky top-24 self-start">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-100">Clinical Review</h3>
              <button 
                onClick={() => setSelectedTreatment(null)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
            <VetDecisionPanel
              treatment={selectedTreatment}
              onReviewed={handleTreatmentReviewed}
            />
          </div>
        )}
      </div>
    </div>
  );
}
