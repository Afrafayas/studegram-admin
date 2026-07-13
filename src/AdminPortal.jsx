import React, { useState } from 'react';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';

// Pages
import DailyReport from './pages/DailyReport';
import AdminReport from './pages/AdminReport';
import Clients from './pages/Clients';
import SalesOrderStudy from './pages/SalesOrderStudy';
import SalesOrderTourist from './pages/SalesOrderTourist';
import SettingsPortal from './pages/SettingsPortal';
import TodoList from './pages/TodoList';

export default function AdminPortal({ onLogout }) {
  const [activeTab, setActiveTab] = useState('daily-report');
  const [activeSubTab, setActiveSubTab] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // States with mock databases
  const [applications, setApplications] = useState([
    {
      camsId: 'CAMS10204',
      studentName: 'Shanto Shaju',
      passportNo: 'T1029482',
      universityName: 'University of Surrey',
      courseName: 'MSc International Hotel Management',
      intake: 'September 2026',
      secondaryStatus: 'Offer Issued',
      dateAdded: '10 Jun 2026'
    },
    {
      camsId: 'CAMS10492',
      studentName: 'Aneesha Anil',
      passportNo: 'T9381048',
      universityName: 'University of Surrey',
      courseName: 'MSc Human Resources Management',
      intake: 'January 2027',
      secondaryStatus: 'Pending',
      dateAdded: '15 Jun 2026'
    }
  ]);

  const [courseDocuments, setCourseDocuments] = useState([
    { siNo: 1, name: 'SSLC', format: '.pdf', minSize: 0.001, maxSize: 12 },
    { siNo: 2, name: 'HSC', format: '.pdf', minSize: 0.001, maxSize: 12 },
    { siNo: 3, name: 'Degree Certificate', format: '.pdf', minSize: 0.01, maxSize: 20 }
  ]);

  const [referralAgents, setReferralAgents] = useState([
    { siNo: 1, agentName: 'Salman', email: 'info@luzidcraft.com' },
    { siNo: 2, agentName: 'Aisha', email: 'aisha@agents.com' }
  ]);

  const [stages, setStages] = useState([
    'Document Verification',
    'Offer Pending',
    'Processed',
    'Offer Issued',
    'Visa Pending'
  ]);

  const [universities, setUniversities] = useState([
    'Calicut University',
    'University of Surrey',
    'Anglia Ruskin University',
    'Coventry University',
    'University of Exeter'
  ]);

  const [courses, setCourses] = useState([
    'BCOM',
    'MSc Computer Science',
    'MSc International Hotel Management',
    'MSc Human Resources Management'
  ]);

  const [intakes, setIntakes] = useState([
    'September/October 2026',
    'January/February 2027',
    'September 2027'
  ]);

  const [fileFormats, setFileFormats] = useState([
    '.pdf',
    '.docx',
    '.jpg',
    '.png'
  ]);

  const [qualifications, setQualifications] = useState([
    'High School',
    'Higher Secondary',
    'Bachelor Degree',
    'Master Degree'
  ]);

  const [todoList, setTodoList] = useState([
    { id: 1, task: 'Verify Shanto Shaju passport document', completed: false },
    { id: 2, task: 'Send email invitation to referral agent Salman', completed: true }
  ]);

  const [clients, setClients] = useState([
    { id: 1, name: 'Shanto Shaju', type: 'Student', email: 'shanto@gmail.com', phone: '+91 9876543210', activeApps: 1, status: 'Active' },
    { id: 2, name: 'Salman', type: 'Agent', email: 'info@luzidcraft.com', phone: '+91 9998887776', activeApps: 2, status: 'Active' },
    { id: 3, name: 'Aneesha Anil', type: 'Student', email: 'aneesha@gmail.com', phone: '+91 8887776665', activeApps: 1, status: 'Active' },
    { id: 4, name: 'Aisha', type: 'Agent', email: 'aisha@agents.com', phone: '+44 7946 0958', activeApps: 1, status: 'Active' }
  ]);

  const handleAddApplication = (newApp) => {
    const randomId = `CAMS${Math.floor(10000 + Math.random() * 90000)}`;
    const freshApp = { ...newApp, camsId: randomId };
    
    setApplications(prev => [freshApp, ...prev]);

    setClients(prev => {
      const exists = prev.find(c => c.name.toLowerCase() === newApp.studentName.toLowerCase());
      if (exists) {
        return prev.map(c => c.id === exists.id ? { ...c, activeApps: c.activeApps + 1 } : c);
      } else {
        return [
          {
            id: Date.now(),
            name: newApp.studentName,
            type: 'Student',
            email: `${newApp.studentName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
            phone: newApp.phone || '+91 9999999999',
            activeApps: 1,
            status: 'Active'
          },
          ...prev
        ];
      }
    });
  };

  const renderActiveTabContent = () => {
    if (activeTab === 'daily-report') {
      return <DailyReport applications={applications} />;
    }
    
    if (activeTab === 'admin-report') {
      return <AdminReport applications={applications} />;
    }
    
    if (activeTab === 'clients') {
      return <Clients clients={clients} setClients={setClients} />;
    }
    
    if (activeTab === 'sales-order') {
      if (activeSubTab === 'tourist-package') {
        return <SalesOrderTourist />;
      }
      if (activeSubTab === 'study') {
        return (
          <SalesOrderStudy 
            universities={universities}
            courses={courses}
            intakes={intakes}
            onAddApplication={handleAddApplication}
            onBack={() => {
              setActiveTab('daily-report');
              setActiveSubTab(null);
            }}
          />
        );
      }
    }
    
    if (activeTab === 'settings') {
      return (
        <SettingsPortal 
          activeSubTab={activeSubTab}
          universities={universities} setUniversities={setUniversities}
          courses={courses} setCourses={setCourses}
          intakes={intakes} setIntakes={setIntakes}
          fileFormats={fileFormats} setFileFormats={setFileFormats}
          courseDocuments={courseDocuments} setCourseDocuments={setCourseDocuments}
          referralAgents={referralAgents} setReferralAgents={setReferralAgents}
          stages={stages} setStages={setStages}
          qualifications={qualifications} setQualifications={setQualifications}
        />
      );
    }
    
    if (activeTab === 'todo-list') {
      return <TodoList todoList={todoList} setTodoList={setTodoList} />;
    }

    return (
      <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-2xl max-w-sm mx-auto my-8">
        <h2 className="text-xs font-black text-slate-900 uppercase">Under Construction</h2>
        <p className="text-[10px] text-slate-500 font-semibold mt-1">This section is being synchronized under the new Studegram data framework.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 select-text">
      <div className="flex flex-1">
        <AdminSidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeSubTab={activeSubTab}
          setActiveSubTab={setActiveSubTab}
          onLogout={onLogout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <AdminHeader 
            activeTab={activeTab}
            activeSubTab={activeSubTab}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onLogout={onLogout}
          />

          <main className="flex-1 flex flex-col pb-16">
            {renderActiveTabContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
