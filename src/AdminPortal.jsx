import React, { useState } from 'react';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';

// Pages
import DailyReport from './pages/DailyReport';
import AdminReport from './pages/AdminReport';
import Partners from './pages/Partners';
import Students from './pages/Students';
import Staff from './pages/Staff';
import SalesOrderStudy from './pages/SalesOrderStudy';
import SalesOrderTourist from './pages/SalesOrderTourist';
import SettingsPortal from './pages/SettingsPortal';
import TodoList from './pages/TodoList';
import CommissionManagement from './pages/CommissionManagement';
import RoleHierarchy from './pages/RoleHierarchy';

// Auth
import { useAuth } from './context/AuthContext';

export default function AdminPortal({ onLogout }) {
  const { currentUser, checkScope } = useAuth();
  
  const [activeTab, setActiveTab] = useState('daily-report');
  const [activeSubTab, setActiveSubTab] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // States with mock databases (enriched with scoping details for RBAC evaluation)
  const [applications, setApplications] = useState([
    {
      camsId: 'CAMS10204',
      studentName: 'Shanto Shaju',
      passportNo: 'T1029482',
      universityName: 'University of Surrey',
      courseName: 'MSc International Hotel Management',
      intake: 'September 2026',
      secondaryStatus: 'Offer Issued',
      dateAdded: '10 Jun 2026',
      country: 'India',
      assignedBdm: 'Amit Patel',
      assignedExecutive: 'Rahul Krishnan'
    },
    {
      camsId: 'CAMS10492',
      studentName: 'Aneesha Anil',
      passportNo: 'T9381048',
      universityName: 'University of Surrey',
      courseName: 'MSc Human Resources Management',
      intake: 'January 2027',
      secondaryStatus: 'Pending',
      dateAdded: '15 Jun 2026',
      country: 'India',
      assignedBdm: 'Amit Patel',
      assignedExecutive: 'Rahul Krishnan'
    },
    {
      camsId: 'CAMS10599',
      studentName: 'David Miller',
      passportNo: 'U9998822',
      universityName: 'Anglia Ruskin University',
      courseName: 'BSc Computer Science',
      intake: 'September 2026',
      secondaryStatus: 'Visa Pending',
      dateAdded: '01 Jun 2026',
      country: 'United Kingdom',
      assignedBdm: 'Marcus Vance',
      assignedExecutive: 'Sarah Jenkins'
    }
  ]);

  const [courseDocuments, setCourseDocuments] = useState([
    { siNo: 1, name: 'SSLC', format: '.pdf', minSize: 0.001, maxSize: 12 },
    { siNo: 2, name: 'HSC', format: '.pdf', minSize: 0.001, maxSize: 12 },
    { siNo: 3, name: 'Degree Certificate', format: '.pdf', minSize: 0.01, maxSize: 20 }
  ]);

  const [referralAgents, setReferralAgents] = useState([
    { siNo: 1, agentName: 'Salman', email: 'info@luzidcraft.com', country: 'India' },
    { siNo: 2, agentName: 'Aisha', email: 'aisha@agents.com', country: 'India' },
    { siNo: 3, agentName: 'Global Study Group', email: 'uk@globalstudy.com', country: 'United Kingdom' }
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

  const [staffList, setStaffList] = useState([
    { id: 101, name: 'Elena Rostova', role: 'Director', email: 'director@studegram.com', phone: '+44 7911 123456', status: 'Active', dateAdded: '01 Jan 2026', accessLevel: 'Director (Level 1)' },
    { id: 102, name: 'Marcus Vance', role: 'COO', email: 'coo@studegram.com', phone: '+44 7911 654321', status: 'Active', dateAdded: '15 Mar 2026', accessLevel: 'COO (Level 2)' },
    { id: 103, name: 'Sarah Jenkins', role: 'Finance', email: 'finance@studegram.com', phone: '+44 7911 987654', status: 'Active', dateAdded: '10 May 2026', accessLevel: 'Finance (Level 3)' },
    { id: 104, name: 'Rajesh Kumar', role: 'Country Head', email: 'countryhead.in@studegram.com', phone: '+91 98765 43210', status: 'Active', dateAdded: '01 Apr 2026', accessLevel: 'Country Head (Level 4 - India)' },
    { id: 105, name: 'Amit Patel', role: 'BDM', email: 'bdm.india@studegram.com', phone: '+91 99988 77766', status: 'Active', dateAdded: '20 Apr 2026', accessLevel: 'BDM (Level 5 - North India)' },
    { id: 106, name: 'Rahul Krishnan', role: 'Executive', email: 'rahul@studegram.com', phone: '+91 99988 87772', status: 'Active', dateAdded: '01 May 2026', accessLevel: 'Executive (Level 6)' }
  ]);

  const [clients, setClients] = useState([
    { id: 1, name: 'Shanto Shaju', type: 'Student', email: 'shanto@gmail.com', phone: '+91 9876543210', activeApps: 1, status: 'Active', passportNo: 'T1029482', dob: '1999-05-14', dateAdded: '10 Jun 2026', referredBy: 'Salman', country: 'India' },
    { id: 2, name: 'Salman', type: 'Agent', email: 'info@luzidcraft.com', phone: '+91 9998887776', activeApps: 2, status: 'Active', partnerCode: 'PRT-101', dateAdded: '01 Jun 2026', country: 'India' },
    { id: 3, name: 'Aneesha Anil', type: 'Student', email: 'aneesha@gmail.com', phone: '+91 8887776665', activeApps: 1, status: 'Active', passportNo: 'T9381048', dob: '2001-08-22', dateAdded: '15 Jun 2026', referredBy: 'Aisha', country: 'India' },
    { id: 4, name: 'Aisha', type: 'Agent', email: 'aisha@agents.com', phone: '+44 7946 0958', activeApps: 1, status: 'Active', partnerCode: 'PRT-102', dateAdded: '05 Jun 2026', country: 'India' },
    { id: 5, name: 'David Miller', type: 'Student', email: 'david@gmail.com', phone: '+44 7999 112233', activeApps: 1, status: 'Active', passportNo: 'U9998822', dob: '2000-03-12', dateAdded: '01 Jun 2026', referredBy: 'Global Study Group', country: 'United Kingdom' }
  ]);

  const handleAddApplication = (newApp) => {
    const randomId = `CAMS${Math.floor(10000 + Math.random() * 90000)}`;
    const freshApp = { 
      ...newApp, 
      camsId: randomId,
      country: newApp.country || currentUser.country || 'India',
      assignedBdm: newApp.assignedBdm || (currentUser.role === 'BDM' ? currentUser.name : 'Amit Patel'),
      assignedExecutive: newApp.assignedExecutive || 'Rahul Krishnan'
    };
    
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
            passportNo: newApp.passportNo || 'Pending',
            dob: newApp.dob || '',
            dateAdded: newApp.dateAdded || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            referredBy: newApp.referredBy || 'Direct',
            country: newApp.country || currentUser.country || 'India'
          },
          ...prev
        ];
      }
    });
  };

  // Scoped lists depending on the current user's role scoping rules
  const scopedApplications = applications.filter(app => 
    checkScope(app.country, app.assignedBdm, app.assignedExecutive)
  );

  const scopedClients = clients.filter(client => {
    if (['Director', 'COO', 'Finance'].includes(currentUser.role)) return true;
    if (currentUser.role === 'Country Head') return client.country === currentUser.country;
    if (currentUser.role === 'BDM') return client.country === currentUser.country;
    if (currentUser.role === 'Executive') return client.country === currentUser.country && client.type === 'Student';
    return false;
  });

  const renderActiveTabContent = () => {
    if (activeTab === 'daily-report') {
      return <DailyReport applications={scopedApplications} />;
    }
    
    if (activeTab === 'admin-report') {
      return <AdminReport applications={scopedApplications} />;
    }
    
    if (activeTab === 'partners') {
      return <Partners clients={scopedClients} setClients={setClients} applications={scopedApplications} />;
    }
    
    if (activeTab === 'students') {
      return <Students clients={scopedClients} setClients={setClients} applications={scopedApplications} />;
    }
    
    if (activeTab === 'staff') {
      return <Staff staffList={staffList} setStaffList={setStaffList} applications={applications} />;
    }

    if (activeTab === 'commissions') {
      return <CommissionManagement />;
    }

    if (activeTab === 'role-hierarchy') {
      return <RoleHierarchy />;
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
            staffList={staffList}
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
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col font-sans text-slate-900 select-text">
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

          <main key={`${activeTab}-${activeSubTab}`} className="flex-1 flex flex-col pb-16 animate-fade-in-up">
            {renderActiveTabContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
