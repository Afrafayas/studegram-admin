import React, { useState, useEffect, useRef } from 'react';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';

// Pages
import DailyReport from './pages/DailyReport';
import AdminReport from './pages/AdminReport';
import Partners from './pages/Partners';
import Students from './pages/Students';
import Staff from './pages/Staff';
import Applications from './pages/Applications';
import SalesOrderStudy from './pages/SalesOrderStudy';
import SalesOrderTourist from './pages/SalesOrderTourist';
import SettingsPortal from './pages/SettingsPortal';
import TodoList from './pages/TodoList';
import CommissionManagement from './pages/CommissionManagement';
import RoleHierarchy from './pages/RoleHierarchy';

// Auth & API
import { useAuth } from './context/AuthContext';
import API from './api/axios';
import { useToast } from './context/ToastContext';

export default function AdminPortal({ onLogout }) {
  const toast = useToast();
  const { currentUser, checkScope } = useAuth();

  const adminToken = localStorage.getItem('admin_token');
  const [isDataSyncing, setIsDataSyncing] = useState(false);

  const fetchInitialData = async () => {
    if (!adminToken) return;
    setIsDataSyncing(true);
    try {
      // Execute all API requests concurrently in parallel
      const [intakeRes, univRes, courseRes, partnerRes, studentRes, appRes] = await Promise.all([
        API.get('/intakes').catch(err => ({ error: err })),
        API.get('/universities').catch(err => ({ error: err })),
        API.get('/courses').catch(err => ({ error: err })),
        API.get('/partners').catch(err => ({ error: err })),
        API.get('/students').catch(err => ({ error: err })),
        API.get('/applications').catch(err => ({ error: err }))
      ]);

      if (intakeRes.data?.success && Array.isArray(intakeRes.data.data) && intakeRes.data.data.length > 0) {
        setIntakes(intakeRes.data.data);
      }

      if (univRes.data?.success && Array.isArray(univRes.data.data) && univRes.data.data.length > 0) {
        setUniversities(univRes.data.data);
      }

      if (courseRes.data?.success && Array.isArray(courseRes.data.data) && courseRes.data.data.length > 0) {
        setCourses(courseRes.data.data);
      }

      let mappedAgents = [];
      if (partnerRes.data?.success && Array.isArray(partnerRes.data.data)) {
        setReferralAgents(partnerRes.data.data);
        mappedAgents = partnerRes.data.data.map((agent, idx) => ({
          id: agent._id,
          name: agent.name,
          type: 'Agent',
          email: agent.email,
          phone: agent.phone || '',
          activeApps: 0,
          partnerCode: `PRTNR-${10001 + idx}`,
          dateAdded: new Date(agent.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          country: agent.country || 'India',
          status: agent.status || 'Active'
        }));
      }

      let mappedStudents = [];
      if (studentRes.data?.success && Array.isArray(studentRes.data.data)) {
        mappedStudents = studentRes.data.data.map((student, idx) => ({
          id: student._id,
          name: student.name,
          type: 'Student',
          email: student.email,
          phone: student.phone || '',
          activeApps: 0,
          studentCode: `STD-${10001 + idx}`,
          passportNo: student.passportNo || 'Pending',
          dob: student.dob || '',
          dateAdded: new Date(student.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          referredBy: student.referredBy || 'Direct',
          country: student.country || 'India',
          status: student.status || 'Active'
        }));
      }

      if (mappedAgents.length > 0 || mappedStudents.length > 0) {
        setClients([...mappedAgents, ...mappedStudents]);
      }

      if (appRes.data?.success && Array.isArray(appRes.data.data)) {
        const mapped = appRes.data.data.map((app, idx) => ({
          id: app._id,
          camsId: `CAMS-${10001 + idx}`,
          studentName: app.student?.name || 'N/A',
          passportNo: app.student?.passportNo || 'N/A',
          universityName: app.university?.name || 'N/A',
          courseName: app.course?.title || 'N/A',
          intake: app.course?.intakes?.[0]?.title || 'September 2026',
          secondaryStatus: (app.status === 'Paid Students' || app.paymentStatus === 'Paid') ? 'Paid Students' : (app.status || 'Pending'),
          paymentStatus: app.paymentStatus || 'Pending',
          dateAdded: new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          country: app.university?.country || 'India',
          assignedBdm: app.partner?.name || 'Direct',
          assignedExecutive: 'Rahul Krishnan',
          statusHistory: app.statusHistory || [],
          dob: app.student?.dob ? new Date(app.student.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
          studentEmail: app.student?.email || null,
          phone: app.student?.phone || null,
          documents: app.documents || [],
          notes: app.notes || ''
        }));
        setApplications(mapped);
      }
    } catch (err) {
      console.warn('Backend API connection failed, using local master data store:', err.message);
    } finally {
      setIsDataSyncing(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [adminToken]);
  
  const [activeTab, setActiveTab] = useState('daily-report');
  const [activeSubTab, setActiveSubTab] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const prevActiveTabRef = useRef('daily-report');
  const prevActiveSubTabRef = useRef(null);
  const isBackNavRef = useRef(false);

  useEffect(() => {
    if (isBackNavRef.current) {
      isBackNavRef.current = false;
      prevActiveTabRef.current = activeTab;
      prevActiveSubTabRef.current = activeSubTab;
      return;
    }

    const prevTab = prevActiveTabRef.current;
    const prevSubTab = prevActiveSubTabRef.current;

    if (prevTab !== activeTab || prevSubTab !== activeSubTab) {
      setNavigationHistory(prev => {
        const last = prev[prev.length - 1];
        if (last && last.tab === prevTab && last.subTab === prevSubTab) {
          return prev;
        }
        return [...prev, { tab: prevTab, subTab: prevSubTab }];
      });
    }

    prevActiveTabRef.current = activeTab;
    prevActiveSubTabRef.current = activeSubTab;
  }, [activeTab, activeSubTab]);

  const handleBack = navigationHistory.length > 0 ? () => {
    const prevPosition = navigationHistory[navigationHistory.length - 1];
    if (prevPosition) {
      isBackNavRef.current = true;
      setActiveTab(prevPosition.tab);
      setActiveSubTab(prevPosition.subTab);
      prevActiveTabRef.current = prevPosition.tab;
      prevActiveSubTabRef.current = prevPosition.subTab;
      setNavigationHistory(prev => prev.slice(0, -1));
    }
  } : null;

  // States initialized cleanly for production / live DB data
  const [applications, setApplications] = useState([]);

  const [courseDocuments, setCourseDocuments] = useState([
    { siNo: 1, name: 'SSLC', format: '.pdf', minSize: 0.001, maxSize: 12 },
    { siNo: 2, name: 'HSC', format: '.pdf', minSize: 0.001, maxSize: 12 },
    { siNo: 3, name: 'Degree Certificate', format: '.pdf', minSize: 0.01, maxSize: 20 }
  ]);

  const [referralAgents, setReferralAgents] = useState([]);

  const [stages, setStages] = useState([
    'Document Verification',
    'Offer Pending',
    'Processed',
    'Offer Issued',
    'Visa Pending'
  ]);

  const [universities, setUniversities] = useState([
    {
      _id: 'univ-1',
      id: 'univ-1',
      name: 'University of Hertfordshire',
      country: 'United Kingdom',
      city: 'Hatfield',
      ranking: 'Top 50 UK',
      logoUrl: '',
      description: 'Public university in Hertfordshire, United Kingdom.',
      requirements: ['IELTS 6.0', 'High School Diploma'],
      status: 'Active',
      courses: ['course-1', 'course-2']
    },
    {
      _id: 'univ-2',
      id: 'univ-2',
      name: 'University of Toronto',
      country: 'Canada',
      city: 'Toronto',
      ranking: '#21 Global',
      logoUrl: '',
      description: 'Leading public research university in Toronto, Ontario, Canada.',
      requirements: ['IELTS 6.5', 'High School Diploma'],
      status: 'Active',
      courses: ['course-3']
    },
    {
      _id: 'univ-3',
      id: 'univ-3',
      name: 'University of Oxford',
      country: 'United Kingdom',
      city: 'Oxford',
      ranking: '#1 Global',
      logoUrl: '',
      description: 'World-renowned collegiate research university in Oxford, England.',
      requirements: ['IELTS 7.5', 'GPA 3.8+'],
      status: 'Active',
      courses: ['course-4']
    },
    {
      _id: 'univ-4',
      id: 'univ-4',
      name: 'University of Melbourne',
      country: 'Australia',
      city: 'Melbourne',
      ranking: '#14 Global',
      logoUrl: '',
      description: 'Top ranked public research university in Melbourne, Australia.',
      requirements: ['IELTS 6.5', 'Bachelor Degree'],
      status: 'Active',
      courses: []
    },
    {
      _id: 'univ-5',
      id: 'univ-5',
      name: 'Harvard University',
      country: 'United States',
      city: 'Cambridge, MA',
      ranking: '#4 Global',
      logoUrl: '',
      description: 'Private Ivy League research university in Cambridge, Massachusetts.',
      requirements: ['SAT/GRE', 'TOEFL 100+'],
      status: 'Active',
      courses: []
    }
  ]);

  const [courses, setCourses] = useState([
    {
      _id: 'course-1',
      id: 'course-1',
      title: 'MSc Data Science & Artificial Intelligence',
      university: { name: 'University of Hertfordshire' },
      degreeLevel: 'Master',
      duration: '1 Year',
      tuitionFee: '£15,400 / year',
      category: 'Technology',
      description: 'Advanced postgraduate program in data analytics, machine learning, and AI application.',
      intakes: ['September/October 2026', 'January/February 2027']
    },
    {
      _id: 'course-2',
      id: 'course-2',
      title: 'MBA International Business Management',
      university: { name: 'University of Hertfordshire' },
      degreeLevel: 'Master',
      duration: '1 Year',
      tuitionFee: '£16,500 / year',
      category: 'Business',
      description: 'Comprehensive business leadership and global trade management degree.',
      intakes: ['September/October 2026']
    },
    {
      _id: 'course-3',
      id: 'course-3',
      title: 'BSc Computer Science & Software Engineering',
      university: { name: 'University of Toronto' },
      degreeLevel: 'Bachelor',
      duration: '4 Years',
      tuitionFee: 'CAD $45,000 / year',
      category: 'Engineering',
      description: 'Undergraduate computer science program covering algorithms, system design, and software.',
      intakes: ['September/October 2026']
    },
    {
      _id: 'course-4',
      id: 'course-4',
      title: 'MSc Precision Health & Biomedical Sciences',
      university: { name: 'University of Oxford' },
      degreeLevel: 'Master',
      duration: '1 Year',
      tuitionFee: '£28,900 / year',
      category: 'Healthcare',
      description: 'Advanced medical science research degree focused on genomic and precision therapies.',
      intakes: ['September/October 2026']
    }
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

  const [verificationDocuments, setVerificationDocuments] = useState([
    'Basic Passport Copy',
    'English Proficiency Result',
    'Academic Reference Letter',
    'Statement of Purpose (SOP)'
  ]);

  const [stagedActions, setStagedActions] = useState([
    'Send Automated Verification Email',
    'Assign Visa Coordinator',
    'Generate Admission Invoice'
  ]);

  const [todoList, setTodoList] = useState([]);

  const [staffList, setStaffList] = useState([
    { id: 100, name: 'Super Admin', role: 'Director', email: 'superadminluzid@gmail.com', phone: '+1 800 555 0199', status: 'Active', dateAdded: '01 Jan 2026', accessLevel: 'SuperAdmin (Full Access)', country: 'India' },
    { id: 101, name: 'Elena Rostova', role: 'Director', email: 'director@studegram.com', phone: '+44 7911 123456', status: 'Active', dateAdded: '01 Jan 2026', accessLevel: 'Director (Level 1)', country: 'United Kingdom' },
    { id: 102, name: 'Marcus Vance', role: 'COO', email: 'coo@studegram.com', phone: '+44 7911 654321', status: 'Active', dateAdded: '15 Mar 2026', accessLevel: 'COO (Level 2)', country: 'United Kingdom' },
    { id: 103, name: 'Sarah Jenkins', role: 'Finance', email: 'finance@studegram.com', phone: '+44 7911 987654', status: 'Active', dateAdded: '10 May 2026', accessLevel: 'Finance (Level 3)', country: 'United Kingdom' },
    { id: 104, name: 'Rajesh Kumar', role: 'Country Head', email: 'countryhead.in@studegram.com', phone: '+91 98765 43210', status: 'Active', dateAdded: '01 Apr 2026', accessLevel: 'Country Head (Level 4 - India)', country: 'India' },
    { id: 105, name: 'Amit Patel', role: 'BDM', email: 'bdm.india@studegram.com', phone: '+91 99988 77766', status: 'Active', dateAdded: '20 Apr 2026', accessLevel: 'BDM (Level 5 - North India)', country: 'India' },
    { id: 106, name: 'Rahul Krishnan', role: 'Executive', email: 'rahul@studegram.com', phone: '+91 99988 87772', status: 'Active', dateAdded: '01 May 2026', accessLevel: 'Executive (Level 6)', country: 'India' }
  ]);

  const [clients, setClients] = useState([]);

  const handleAddApplication = async (newApp) => {
    const token = localStorage.getItem('admin_token');
    try {
      if (token && token !== 'mock-admin-token-12345') {
        let studentId = newApp.studentId;

        // Only create a new student profile if a pre-existing student ID was not passed
        if (!studentId) {
          // 1. Create student
          const studentRes = await API.post('/students', {
            name: newApp.studentName,
            email: newApp.studentEmail,
            phone: newApp.phone,
            passportNo: newApp.passportNo,
            dob: newApp.dob,
            referredBy: newApp.partnerId ? 'Agent' : 'Direct'
          });
          if (!studentRes.data?.success) {
            throw new Error(studentRes.data?.message || 'Failed to create student profile');
          }
          studentId = studentRes.data.data._id;
        }

        const appPayload = {
          student: studentId,
          university: newApp.universityId,
          course: newApp.courseId,
          status: 'Pending',
          documents: newApp.documents || [],
          notes: newApp.notes
        };
        if (newApp.partnerId) {
          appPayload.partner = newApp.partnerId;
        }

        const appRes = await API.post('/applications', appPayload);
        if (!appRes.data?.success) {
          throw new Error(appRes.data?.message || 'Failed to create student application');
        }

        toast.success('Application successfully created in database!');
        fetchInitialData(); // Refresh list
      } else {
        // Mock fallback
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
          const exists = prev.find(c => 
            (newApp.studentId && c.id === newApp.studentId) || 
            c.name.toLowerCase() === newApp.studentName.toLowerCase()
          );
          if (exists) {
            return prev.map(c => c.id === exists.id ? { ...c, activeApps: c.activeApps + 1 } : c);
          } else {
            return [
              {
                id: Date.now(),
                name: newApp.studentName,
                type: 'Student',
                email: newApp.studentEmail,
                phone: newApp.phone || '+91 9999999999',
                activeApps: 1,
                passportNo: newApp.passportNo || 'Pending',
                dob: newApp.dob || '',
                dateAdded: newApp.dateAdded || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                referredBy: newApp.partnerId ? 'Agent' : 'Direct',
                country: newApp.country || currentUser.country || 'India'
              },
              ...prev
            ];
          }
        });
      }
    } catch (err) {
      toast.error(err.message);
    }
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

    if (activeTab === 'applications') {
      return (
        <Applications 
          applications={scopedApplications} 
          referralAgents={referralAgents}
          intakes={intakes}
          onAddClick={() => {
            setActiveTab('sales-order');
            setActiveSubTab('study');
          }}
          onRefresh={fetchInitialData}
        />
      );
    }
    
    if (activeTab === 'admin-report') {
      return <AdminReport applications={scopedApplications} />;
    }
    
    if (activeTab === 'partners') {
      return <Partners clients={scopedClients} setClients={setClients} applications={scopedApplications} />;
    }
    
    if (activeTab === 'students') {
      return <Students clients={scopedClients} setClients={setClients} applications={scopedApplications} intakes={intakes} />;
    }
    
    if (activeTab === 'staff') {
      return <Staff staffList={staffList} setStaffList={setStaffList} applications={applications} />;
    }

    if (activeTab === 'commissions') {
      return <CommissionManagement clients={scopedClients} referralAgents={referralAgents} applications={scopedApplications} />;
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
            partners={referralAgents}
            staffList={staffList}
            students={clients.filter(c => c.type === 'Student')}
            onAddApplication={handleAddApplication}
            onBack={handleBack || (() => {
              setActiveTab('daily-report');
              setActiveSubTab(null);
            })}
          />
        );
      }
    }
    
    if (activeTab === 'settings') {
      return (
        <SettingsPortal 
          activeSubTab={activeSubTab}
          setActiveSubTab={setActiveSubTab}
          universities={universities} setUniversities={setUniversities}
          courses={courses} setCourses={setCourses}
          intakes={intakes} setIntakes={setIntakes}
          fileFormats={fileFormats} setFileFormats={setFileFormats}
          courseDocuments={courseDocuments} setCourseDocuments={setCourseDocuments}
          referralAgents={referralAgents} setReferralAgents={setReferralAgents}
          stages={stages} setStages={setStages}
          qualifications={qualifications} setQualifications={setQualifications}
          verificationDocuments={verificationDocuments} setVerificationDocuments={setVerificationDocuments}
          stagedActions={stagedActions} setStagedActions={setStagedActions}
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
            onBack={handleBack}
            isSyncing={isDataSyncing}
            onRefreshData={fetchInitialData}
          />

          <main key={`${activeTab}-${activeSubTab}`} className="flex-1 flex flex-col pb-16 animate-fade-in-up">
            {renderActiveTabContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
