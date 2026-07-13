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
          <div key={pkg.id} className={`bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all duration-200 group border-t-4 ${pkg.id % 2 === 1 ? 'border-t-[#D99A1C]' : 'border-t-[#2563EB]'}`}>
            <div className="h-24 bg-slate-950 p-4 flex flex-col justify-between border-b border-slate-900 text-white">
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                  pkg.id % 2 === 1 
                    ? 'text-[#F5B025] bg-[#F5B025]/10 border-[#F5B025]/20' 
                    : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                }`}>{pkg.duration}</span>
                <div className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xs font-extrabold text-white select-none shrink-0">
                  {pkg.name.split(' ').map(n=>n[0]).join('')}
                </div>
              </div>
              <div className="flex justify-between items-end gap-2">
                <h3 className="text-xs font-black uppercase tracking-tight text-white truncate max-w-[150px]">{pkg.name}</h3>
                <span className={`text-xs font-black ${pkg.id % 2 === 1 ? 'text-[#F5B025]' : 'text-blue-400'}`}>{pkg.price}</span>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{pkg.locations}</p>
                <p className="text-[11px] text-slate-600 font-semibold leading-relaxed pt-1.5">{pkg.desc}</p>
              </div>
              
              <div className="pt-2">
                <button 
                  onClick={() => alert(`Initiating sales request details for ${pkg.name}...`)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-all uppercase tracking-wider"
                >
                  Inquire Package
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
