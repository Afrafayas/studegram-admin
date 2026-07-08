import React from 'react';

export default function SalesOrderTourist() {
  const packages = [
    { id: 1, name: 'London Academic Tour', duration: '10 Days', price: '£1,499', locations: 'London - Oxford - Cambridge', desc: 'Summer exploration package for university candidates to visit UK campuses and experience British culture.' },
    { id: 2, name: 'Schengen Educational Exchange', duration: '14 Days', price: '€1,850', locations: 'Paris - Brussels - Amsterdam - Berlin', desc: 'Comprehensive academic tour through major European universities and technological research hubs.' },
    { id: 3, name: 'Swiss Hospitality Experience', duration: '7 Days', price: 'CHF 2,100', locations: 'Zurich - Geneva - Lausanne', desc: 'Targeted insight program covering premium hospitality schools and luxury brand management institutes.' },
  ];

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Tourist Packages</h1>
          <p className="text-xs text-slate-500 font-medium">B2B academic study tours and cultural exploration programs for prospective students.</p>
        </div>
      </div>

      {/* Grid of Tourist Packages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div key={pkg.id} className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all duration-200 group hover:border-indigo-300">
            <div className="p-6 space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold text-[#6366F1] bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 uppercase tracking-wider">{pkg.duration}</span>
                <span className="text-sm font-black text-slate-900">{pkg.price}</span>
              </div>
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight group-hover:text-[#6366F1] transition-colors">{pkg.name}</h3>
              <p className="text-[11px] text-slate-400 font-bold">{pkg.locations}</p>
              <p className="text-[11px] text-slate-600 font-semibold leading-relaxed pt-2">{pkg.desc}</p>
            </div>
            
            <div className="p-6 pt-0">
              <button 
                onClick={() => alert(`Initiating sales request details for ${pkg.name}...`)}
                className="w-full bg-slate-50 hover:bg-indigo-600 text-slate-700 hover:text-white font-extrabold text-xs py-2.5 rounded-xl border border-slate-200 hover:border-indigo-600 transition-all uppercase tracking-wider shadow-2xs"
              >
                Inquire Package
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
