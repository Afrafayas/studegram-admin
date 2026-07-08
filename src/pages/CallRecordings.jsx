import React, { useState } from 'react';

export default function CallRecordings({ recordings, setRecordings }) {
  const [playingId, setPlayingId] = useState(null);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [editingNotes, setEditingNotes] = useState('');

  const togglePlay = (id) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
    }
  };

  const openNotesModal = (rec) => {
    setSelectedRecording(rec);
    setEditingNotes(rec.notes);
  };

  const saveNotes = () => {
    setRecordings(prev => prev.map(rec => {
      if (rec.id === selectedRecording.id) {
        return { ...rec, notes: editingNotes };
      }
      return rec;
    }));
    setSelectedRecording(null);
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Call Recordings Library</h1>
          <p className="text-xs text-slate-500 font-medium">B2B client and student consultation logs. Listen, review call duration, and annotate transcripts.</p>
        </div>
      </div>

      {/* Call Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Archived Consultation Tracks</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider w-[80px]">Status</th>
                <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Student Client</th>
                <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Assigned Agent</th>
                <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Call Timestamp</th>
                <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Mock Waveform</th>
                <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Annotations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {recordings.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => togglePlay(rec.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        playingId === rec.id 
                          ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {playingId === rec.id ? (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 pl-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-950 font-black">{rec.studentName}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Passport Attached</p>
                  </td>
                  <td className="px-6 py-4">{rec.agentName}</td>
                  <td className="px-6 py-4">{rec.date}</td>
                  <td className="px-6 py-4 text-slate-500 font-bold">{rec.duration}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-0.5 h-5 min-w-[100px]">
                      {[4, 10, 14, 8, 12, 18, 6, 15, 9, 13, 17, 7, 11, 4, 9].map((height, i) => (
                        <div 
                          key={i}
                          className={`w-[3px] rounded-full transition-all duration-300 ${
                            playingId === rec.id 
                              ? 'bg-indigo-500 animate-pulse' 
                              : 'bg-slate-200'
                          }`}
                          style={{ 
                            height: `${height}px`,
                            animationDelay: `${i * 80}ms`
                          }}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openNotesModal(rec)}
                      className="text-indigo-600 hover:text-indigo-900 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1 rounded-lg shadow-2xs font-bold"
                    >
                      {rec.notes ? 'View Notes' : 'Add Notes'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {playingId && (
        <div className="fixed bottom-0 right-0 left-[260px] bg-slate-900 text-white p-4 border-t border-slate-800 z-30 shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center font-bold text-white text-xs">
              ♫
            </div>
            <div>
              <p className="text-xs font-bold">Consultation - {recordings.find(r => r.id === playingId)?.studentName}</p>
              <p className="text-[10px] text-slate-400 font-medium">Agent Channel: {recordings.find(r => r.id === playingId)?.agentName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-1 max-w-md mx-6">
            <span className="text-[9px] font-bold text-slate-400">0:14</span>
            <div className="flex-1 bg-slate-800 h-1 rounded-full overflow-hidden relative cursor-pointer">
              <div className="bg-cyan-400 h-full w-[35%] rounded-full" />
            </div>
            <span className="text-[9px] font-bold text-slate-400">{recordings.find(r => r.id === playingId)?.duration}</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPlayingId(null)}
              className="text-xs font-bold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
            >
              Close Player
            </button>
          </div>
        </div>
      )}

      {selectedRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Call Annotation</h3>
                <p className="text-[10px] text-slate-400 font-semibold">{selectedRecording.studentName} — {selectedRecording.agentName}</p>
              </div>
              <button 
                onClick={() => setSelectedRecording(null)} 
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Call Summary & Notes</label>
              <textarea
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 min-h-[100px] leading-relaxed"
                placeholder="Enter client discussion summary, university queries, or general task notes..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedRecording(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveNotes}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md"
              >
                Save Annotations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
