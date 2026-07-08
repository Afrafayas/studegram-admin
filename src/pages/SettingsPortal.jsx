import React, { useState } from 'react';

export default function SettingsPortal({ 
  activeSubTab,
  universities, setUniversities,
  courses, setCourses,
  intakes, setIntakes,
  fileFormats, setFileFormats,
  courseDocuments, setCourseDocuments,
  referralAgents, setReferralAgents,
  stages, setStages,
  qualifications, setQualifications
}) {
  const [modalType, setModalType] = useState(null);
  
  const [docName, setDocName] = useState('');
  const [docFormat, setDocFormat] = useState('.pdf');
  const [docMinSize, setDocMinSize] = useState('0.001');
  const [docMaxSize, setDocMaxSize] = useState('10');

  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');

  const [newItemText, setNewItemText] = useState('');

  const openAddModal = (type) => {
    setModalType(type);
    setNewItemText('');
    setDocName('');
    setDocFormat('.pdf');
    setDocMinSize('0.001');
    setDocMaxSize('10');
    setAgentName('');
    setAgentEmail('');
  };

  const handleAddDocumentRule = (e) => {
    e.preventDefault();
    if (!docName || !docMinSize || !docMaxSize) return;

    const newRule = {
      siNo: courseDocuments.length + 1,
      name: docName,
      format: docFormat,
      minSize: parseFloat(docMinSize),
      maxSize: parseFloat(docMaxSize)
    };
    setCourseDocuments(prev => [...prev, newRule]);
    setModalType(null);
  };

  const handleAddReferralAgent = (e) => {
    e.preventDefault();
    if (!agentName || !agentEmail) return;

    const newAgent = {
      siNo: referralAgents.length + 1,
      agentName,
      email: agentEmail
    };
    setReferralAgents(prev => [...prev, newAgent]);
    setModalType(null);
  };

  const handleAddSimpleItem = (e, listStateSetter, list) => {
    e.preventDefault();
    if (!newItemText) return;
    if (list.includes(newItemText)) {
      alert("This item already exists.");
      return;
    }
    listStateSetter(prev => [...prev, newItemText]);
    setModalType(null);
  };

  const handleDeleteItem = (itemToDelete, listStateSetter) => {
    listStateSetter(prev => prev.filter(item => item !== itemToDelete));
  };

  const handleDeleteDoc = (siNo) => {
    setCourseDocuments(prev => prev.filter(doc => doc.siNo !== siNo).map((doc, idx) => ({ ...doc, siNo: idx + 1 })));
  };

  const handleDeleteAgent = (siNo) => {
    setReferralAgents(prev => prev.filter(agent => agent.siNo !== siNo).map((agent, idx) => ({ ...agent, siNo: idx + 1 })));
  };

  const moveStage = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;

    const newStages = [...stages];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newStages[index];
    newStages[index] = newStages[swapIdx];
    newStages[swapIdx] = temp;
    setStages(newStages);
  };

  const renderSettingsView = () => {
    switch (activeSubTab) {
      case 'settings-course-docs':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Course Documents Configuration</h2>
              <button
                onClick={() => openAddModal('doc')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider"
              >
                Add New Document Rule
              </button>
            </div>
            
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider w-[80px]">SI.NO.</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Document Name</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Supported Format</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Min Size (MB)</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Max Size (MB)</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {courseDocuments.map((doc) => (
                    <tr key={doc.siNo} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-400">{doc.siNo}</td>
                      <td className="px-6 py-4 text-slate-950 font-black">{doc.name}</td>
                      <td className="px-6 py-4"><span className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold rounded-md px-2 py-0.5 text-[9px]">{doc.format}</span></td>
                      <td className="px-6 py-4 text-slate-500">{doc.minSize} MB</td>
                      <td className="px-6 py-4 text-slate-500">{doc.maxSize} MB</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteDoc(doc.siNo)}
                          className="text-rose-600 hover:text-rose-900 font-bold"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'settings-agent':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">B2B Referral Agents</h2>
              <button
                onClick={() => openAddModal('agent')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider"
              >
                Invite/Add Agent
              </button>
            </div>
            
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider w-[80px]">SI.NO.</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Agent Name</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Email Address</th>
                    <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {referralAgents.map((agent) => (
                    <tr key={agent.siNo} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-400">{agent.siNo}</td>
                      <td className="px-6 py-4 text-slate-950 font-black">{agent.agentName}</td>
                      <td className="px-6 py-4 text-indigo-600 font-bold">{agent.email}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteAgent(agent.siNo)}
                          className="text-rose-600 hover:text-rose-900 font-bold"
                        >
                          Revoke Access
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'settings-stages':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Application Stages Pipeline</h2>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Reorder stages or add customized milestones in the application workflow.</p>
              </div>
              <button
                onClick={() => openAddModal('stage')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider"
              >
                Add Stage
              </button>
            </div>

            <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs space-y-4">
              {stages.map((stage, idx) => (
                <div 
                  key={stage}
                  className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-white transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-black text-slate-900">{stage}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => moveStage(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 bg-white text-slate-400 hover:text-slate-950 border border-slate-200 rounded-lg hover:shadow-2xs disabled:opacity-30 disabled:pointer-events-none"
                    >
                      ▲
                    </button>
                    <button 
                      onClick={() => moveStage(idx, 'down')}
                      disabled={idx === stages.length - 1}
                      className="p-1.5 bg-white text-slate-400 hover:text-slate-950 border border-slate-200 rounded-lg hover:shadow-2xs disabled:opacity-30 disabled:pointer-events-none"
                    >
                      ▼
                    </button>
                    <button 
                      onClick={() => handleDeleteItem(stage, setStages)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        let list = [];
        let listSetter = null;
        let title = '';
        let addLabel = '';
        let inputPlaceholder = '';

        if (activeSubTab === 'settings-university') {
          list = universities;
          listSetter = setUniversities;
          title = 'Universities Config';
          addLabel = 'Add University';
          inputPlaceholder = 'e.g. University of Exeter';
        } else if (activeSubTab === 'settings-course') {
          list = courses;
          listSetter = setCourses;
          title = 'Courses Config';
          addLabel = 'Add Academic Course';
          inputPlaceholder = 'e.g. MBA General Management';
        } else if (activeSubTab === 'settings-intake') {
          list = intakes;
          listSetter = setIntakes;
          title = 'Intake Seasons';
          addLabel = 'Add Intake Option';
          inputPlaceholder = 'e.g. May/June 2027';
        } else if (activeSubTab === 'settings-formats') {
          list = fileFormats;
          listSetter = setFileFormats;
          title = 'Supported File Formats';
          addLabel = 'Add File Format Extension';
          inputPlaceholder = 'e.g. .png';
        } else if (activeSubTab === 'settings-qualifications') {
          list = qualifications;
          listSetter = setQualifications;
          title = 'Qualifications Level';
          addLabel = 'Add Qualification Tier';
          inputPlaceholder = 'e.g. Diploma';
        } else if (activeSubTab === 'settings-documents' || activeSubTab === 'settings-actions') {
          list = ['Basic Passport Copy', 'English Proficiency Result'];
          title = 'Verification Requirements';
          addLabel = 'Add Custom Item';
          inputPlaceholder = 'Enter label';
        }

        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">{title}</h2>
              {listSetter && (
                <button
                  onClick={() => openAddModal(activeSubTab)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md uppercase tracking-wider"
                >
                  {addLabel}
                </button>
              )}
            </div>

            <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs space-y-3">
              {list.map((item, idx) => (
                <div key={item} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-800">{item}</span>
                  {listSetter && (
                    <button
                      onClick={() => handleDeleteItem(item, listSetter)}
                      className="text-rose-500 hover:text-rose-700 font-extrabold text-xs"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 p-6 bg-[#F8FAFC]">
      {renderSettingsView()}

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">
                {modalType === 'doc' && 'Add New Course Document Rule'}
                {modalType === 'agent' && 'Invite Referral Agent Channel'}
                {modalType === 'stage' && 'Add Application Pipeline Stage'}
                {modalType !== 'doc' && modalType !== 'agent' && modalType !== 'stage' && 'Add Configuration Lookup Item'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {modalType === 'doc' && (
              <form onSubmit={handleAddDocumentRule} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Document Name</label>
                  <input
                    type="text"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 text-slate-950"
                    placeholder="e.g. Post Graduate Degree Marksheet"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Format</label>
                  <select
                    value={docFormat}
                    onChange={(e) => setDocFormat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value=".pdf">.pdf (Acrobat Reader)</option>
                    <option value=".docx">.docx (MS Word)</option>
                    <option value=".jpg">.jpg (JPEG Image)</option>
                    <option value=".png">.png (PNG Image)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Min Size (MB)</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={docMinSize}
                      onChange={(e) => setDocMinSize(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Max Size (MB)</label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={docMaxSize}
                      onChange={(e) => setDocMaxSize(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md">Add Rule</button>
                </div>
              </form>
            )}

            {modalType === 'agent' && (
              <form onSubmit={handleAddReferralAgent} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Agent Name</label>
                  <input
                    type="text"
                    required
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 text-slate-950"
                    placeholder="e.g. John Doe Consultancies"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Agent Contact Email</label>
                  <input
                    type="email"
                    required
                    value={agentEmail}
                    onChange={(e) => setAgentEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 text-slate-950"
                    placeholder="e.g. onboarding@agency.com"
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md">Add Agent</button>
                </div>
              </form>
            )}

            {modalType === 'stage' && (
              <form onSubmit={(e) => handleAddSimpleItem(e, setStages, stages)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Stage Label</label>
                  <input
                    type="text"
                    required
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 text-slate-950"
                    placeholder="e.g. CAS Clearance Pending"
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md">Add Stage</button>
                </div>
              </form>
            )}

            {modalType !== 'doc' && modalType !== 'agent' && modalType !== 'stage' && (
              <form 
                onSubmit={(e) => {
                  let setter = null;
                  let lst = [];
                  if (modalType === 'settings-university') { setter = setUniversities; lst = universities; }
                  if (modalType === 'settings-course') { setter = setCourses; lst = courses; }
                  if (modalType === 'settings-intake') { setter = setIntakes; lst = intakes; }
                  if (modalType === 'settings-formats') { setter = setFileFormats; lst = fileFormats; }
                  if (modalType === 'settings-qualifications') { setter = setQualifications; lst = qualifications; }
                  handleAddSimpleItem(e, setter, lst);
                }} 
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Item Label</label>
                  <input
                    type="text"
                    required
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 text-slate-950"
                    placeholder="Enter configuration label..."
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md">Add Item</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
