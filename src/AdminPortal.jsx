import { getDisplayId } from './utils/displayId';
import { getAssignedExecutiveName } from './utils/applicationAssignment';
import React, { useState, useEffect, useRef } from 'react';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import LogoutConfirmModal from './components/LogoutConfirmModal';

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
import BecomePartner from './pages/BecomePartner';
import StaffActivityLogs from './pages/StaffActivityLogs';


// Auth & API
import { useAuth } from './context/AuthContext';
import API from './api/axios';
import { useToast } from './context/ToastContext';

export default function AdminPortal({ onLogout }) {
  const toast = useToast();
  const { currentUser, checkScope } = useAuth();

  const adminToken = localStorage.getItem('admin_token');
  const [isDataSyncing, setIsDataSyncing] = useState(false);
  const [dataLoadError, setDataLoadError] = useState('');
  const [selectedAppIdForSingleView, setSelectedAppIdForSingleView] = useState(null);
  const [selectedPartnerForSingleView, setSelectedPartnerForSingleView] = useState(null);
  const [selectedStudentForSingleView, setSelectedStudentForSingleView] = useState(null);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);

  const fetchInitialData = async () => {
    if (!adminToken) return;
    setIsDataSyncing(true);
    setDataLoadError('');
    try {
      // Execute all API requests concurrently in parallel
      const [intakeRes, univRes, courseRes, partnerRes, studentRes, appRes, userRes] = await Promise.all([
        API.get('/intakes').catch(err => ({ error: err })),
        API.get('/universities').catch(err => ({ error: err })),
        API.get('/courses').catch(err => ({ error: err })),
        API.get('/partners').catch(err => ({ error: err })),
        API.get('/students').catch(err => ({ error: err })),
        API.get('/applications').catch(err => ({ error: err })),
        API.get('/users').catch(err => ({ error: err }))
      ]);

      const failed = [intakeRes, univRes, courseRes, partnerRes, studentRes, appRes, userRes]
        .some(result => result.error && result.error.response?.status !== 403);
      if (failed) setDataLoadError('Some records could not be loaded. Please refresh to retry.');

      if (userRes.data?.success && Array.isArray(userRes.data.data)) {
        const mappedUsers = userRes.data.data.map(u => ({
          id: u._id,
          displayId: u.displayId,
          _id: u._id,
          displayId: u.displayId,
          name: u.name,
          email: u.email,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          phone: u.phone || '',
          role: u.role || 'Executive',
          status: u.status || 'Active',
          country: u.country || (u.countries && u.countries[0]) || '',
          countries: (Array.isArray(u.countries) && u.countries.length > 0) ? u.countries : [u.country || ''],
          accessLevel: `${u.role} (${['SuperAdmin', 'Super Admin', 'Director', 'Admin'].includes(u.role) ? 'Full Access' : 'Read & Write'})`,
          dateAdded: new Date(u.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          passwordType: 'Configured & Active'
        }));
        setStaffList(mappedUsers);
      }

      if (intakeRes.data?.success && Array.isArray(intakeRes.data.data)) {
        setIntakes(intakeRes.data.data);
      }

      if (univRes.data?.success && Array.isArray(univRes.data.data)) {
        setUniversities(univRes.data.data);
      }

      if (courseRes.data?.success && Array.isArray(courseRes.data.data)) {
        setCourses(courseRes.data.data);
      }

      let mappedAgents = [];
      if (partnerRes.data?.success && Array.isArray(partnerRes.data.data)) {
        setReferralAgents(partnerRes.data.data);
        mappedAgents = partnerRes.data.data.map((agent) => ({
          id: agent._id,
          displayId: agent.displayId,
          name: agent.name,
          type: 'Agent',
          email: agent.email,
          phone: agent.phone || '',
          companyName: agent.companyName || agent.name,
          partnerType: (agent.partnerType && agent.partnerType.toString().toLowerCase() === 'individual') ? 'Individual' : 'Company',
          taxId: agent.taxId || '',
          documents: Array.isArray(agent.documents) ? agent.documents : (agent.documents ? [agent.documents] : []),
          activeApps: (appRes.data?.data || []).filter(app => String(app.partner?._id || app.partner || '') === String(agent._id)).length,
          partnerCode: getDisplayId(agent),
          dateAdded: new Date(agent.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          country: agent.country || '',
          status: agent.status || 'Active'
        }));
      }

      let mappedStudents = [];
      if (studentRes.data?.success && Array.isArray(studentRes.data.data)) {
        mappedStudents = studentRes.data.data.map((student) => ({
          ...student,
          id: student._id,
          name: student.name,
          type: 'Student',
          email: student.email,
          phone: student.phone || '',
          activeApps: (appRes.data?.data || []).filter(app => String(app.student?._id || app.student || '') === String(student._id)).length,
          studentCode: getDisplayId(student),
          passportNo: student.passportNo || 'Pending',
          documents: Array.isArray(student.documents) ? student.documents : [],
          dob: student.dob || '',
          dateAdded: new Date(student.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          referredBy: student.referredBy || 'Direct',
          partner: student.partner || null,
          partnerId: student.partner?._id || student.partner?.id || student.partner || null,
          country: student.country || '',
          status: student.status || 'Active'
        }));
      }

      if (partnerRes.data?.success || studentRes.data?.success) {
        setClients(previous => [
          ...(partnerRes.data?.success ? mappedAgents : previous.filter(client => client.type === 'Agent')),
          ...(studentRes.data?.success ? mappedStudents : previous.filter(client => client.type === 'Student'))
        ]);
      }

      if (appRes.data?.success && Array.isArray(appRes.data.data)) {
        const mapped = appRes.data.data.map((app) => ({
          ...app,
          id: app._id,
          _id: app._id,
          camsId: getDisplayId(app),
          studentName: app.student?.name || 'N/A',
          student: app.student || null,
          studentId: app.student?._id || app.student?.id || (typeof app.student === 'string' ? app.student : null),
          passportNo: app.student?.passportNo || 'N/A',
          universityName: app.university?.name || 'N/A',
          courseName: app.course?.title || 'N/A',
          level: app.level || 'Undergraduate (UG)',
          intake: app.intake || '',
          status: app.status || 'Submitted',
          secondaryStatus: (app.status === 'Paid Students' || app.paymentStatus === 'Paid') ? 'Paid Students' : (app.status || 'Pending'),
          paymentStatus: app.paymentStatus || 'Pending',
          dateAdded: new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          country: app.university?.country || '',
          partner: app.partner || null,
          partnerName: app.partner?.name || (typeof app.partner === 'string' ? app.partner : 'Direct'),
          partnerCompanyName: app.partner?.companyName || app.partner?.name || 'Direct',
          assignedBdm: app.partner?.companyName || app.partner?.name || 'Direct',
          assignedExecutive: getAssignedExecutiveName(app),
          statusHistory: app.statusHistory || [],
          dob: app.student?.dob ? new Date(app.student.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null,
          studentEmail: app.student?.email || null,
          phone: app.student?.phone || null,
          documents: app.documents || [],
          notes: app.notes || '',
          applicationComments: app.applicationComments || [],
          pickedBy: (app.pickedBy && (app.pickedBy.id || app.pickedBy._id || (app.pickedBy.name && app.pickedBy.name.trim()))) ? app.pickedBy : null,
          submittedByStaff: app.submittedByStaff || null,
          commissionClaimed: app.commissionClaimed || false,
          commissionStatus: app.commissionStatus || 'Unclaimed',
          hasUnrepliedMessage: app.hasUnrepliedMessage || false,
          lastRepliedBy: app.lastRepliedBy || null
        }));
        setApplications(mapped);
        localStorage.setItem('studegram_applications', JSON.stringify(mapped));
      }

    } catch (err) {
      console.warn('Unable to refresh portal data:', err.message);
      setDataLoadError('Records could not be loaded. Please refresh to retry.');
    } finally {
      setIsDataSyncing(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [adminToken]);
  
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('studegram_admin_active_tab') || 'daily-report';
  });
  const [activeSubTab, setActiveSubTab] = useState(() => {
    return localStorage.getItem('studegram_admin_active_subtab') || null;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const prevActiveTabRef = useRef(localStorage.getItem('studegram_admin_active_tab') || 'daily-report');
  const prevActiveSubTabRef = useRef(localStorage.getItem('studegram_admin_active_subtab') || null);
  const isBackNavRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('studegram_admin_active_tab', activeTab);
    if (activeSubTab) {
      localStorage.setItem('studegram_admin_active_subtab', activeSubTab);
    } else {
      localStorage.removeItem('studegram_admin_active_subtab');
    }
  }, [activeTab, activeSubTab]);

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

  // Business records come from the API, including empty collections.
  const [applications, setApplications] = useState([]);
  const [courseDocuments, setCourseDocuments] = useState([]);
  const [referralAgents, setReferralAgents] = useState([]);
  const [stages, setStages] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [courses, setCourses] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [fileFormats, setFileFormats] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [verificationDocuments, setVerificationDocuments] = useState([]);
  const [stagedActions, setStagedActions] = useState([]);
  const [todoList, setTodoList] = useState([]);
  const [staffList, setStaffList] = useState([]);

  const [clients, setClients] = useState([]);

  const handleAddApplication = async (newApp) => {
    const token = localStorage.getItem('admin_token');
    try {
      if (!token) throw new Error('Please sign in before creating an application.');
      {
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
          level: newApp.level || 'Undergraduate (UG)',
          intake: newApp.intake || '',
          status: 'Pending',
          documents: newApp.documents || [],
          notes: newApp.notes
        };
        if (newApp.partnerId) {
          appPayload.partner = newApp.partnerId;
        }

        if (newApp.pickedBy) {
          appPayload.pickedBy = newApp.pickedBy;
        } else if (newApp.assignedTo) {
          const matchedStaff = staffList.find(s => s.name === newApp.assignedTo || (s.id && String(s.id) === String(newApp.assignedTo)) || (s._id && String(s._id) === String(newApp.assignedTo)));
          if (matchedStaff) {
            appPayload.pickedBy = {
              id: matchedStaff.id || matchedStaff._id,
              name: matchedStaff.name,
              email: matchedStaff.email || '',
              role: matchedStaff.role || 'Staff',
              pickedAt: new Date()
            };
          }
        }
        if (newApp.assignedTo) {
          appPayload.assignedTo = newApp.assignedTo;
        }

        const appRes = await API.post('/applications', appPayload);
        if (!appRes.data?.success) {
          throw new Error(appRes.data?.message || 'Failed to create student application');
        }

        toast.success('Application successfully created in database!');
        await fetchInitialData(); // Refresh list before showing applications
      }
      handleSelectTab('applications');
      setActiveSubTab(null);
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  // Scoped lists depending on the current user's role scoping rules
  const scopedApplications = applications.filter(app => 
    checkScope(app.country, app.assignedBdm, getAssignedExecutiveName(app))
  );

  const scopedClients = clients.filter(client => {
    const role = (currentUser?.role || '').trim();
    if (!role || ['SuperAdmin', 'Super Admin', 'Director', 'Admin', 'COO', 'Finance', 'OperationsHead'].includes(role)) return true;
    if (['CRE', 'Country Head', 'BDM'].includes(role)) {
      if (!currentUser.country || currentUser.country === 'All' || currentUser.country === 'Global') return true;
      return (client.country || '').toLowerCase() === (currentUser.country || '').toLowerCase();
    }
    if (role === 'Executive') {
      if (!currentUser.country || currentUser.country === 'All' || currentUser.country === 'Global') return true;
      return (client.country || '').toLowerCase() === (currentUser.country || '').toLowerCase() && client.type === 'Student';
    }
    return false;
  });

  const renderActiveTabContent = () => {
    if (activeTab === 'daily-report') {
      return (
        <DailyReport 
          applications={scopedApplications} 
          onNavigateToBecomePartner={() => {
            setSelectedPartnerForSingleView(null);
            localStorage.removeItem('studegram_admin_single_view_partner_id');
            localStorage.removeItem('studegram_admin_single_view_partner');
            window.dispatchEvent(new CustomEvent('clear_single_view_partner'));
            setActiveTab('become-partner');
          }}
          onNavigateToCreateApplication={() => {
            setActiveTab('sales-order');
            setActiveSubTab('study');
          }}
          onNavigateToApplications={() => {
            setSelectedAppIdForSingleView(null);
            localStorage.removeItem('studegram_admin_single_view_app_id');
            localStorage.removeItem('studegram_admin_single_view_app');
            window.dispatchEvent(new CustomEvent('clear_single_view_app'));
            setActiveTab('applications');
          }}
        />
      );
    }

    if (activeTab === 'become-partner' || activeTab === 'partners') {
      return <BecomePartner clients={scopedClients} setClients={setClients} applications={scopedApplications} onPartnerOnboarded={fetchInitialData} onBack={() => setActiveTab('daily-report')} initialSelectedPartnerId={selectedPartnerForSingleView} />;
    }

    if (activeTab === 'applications') {
      return (
        <Applications 
          applications={scopedApplications} 
          referralAgents={referralAgents}
          intakes={intakes}
          staffList={staffList}
          universities={universities}
          courses={courses}
          initialSelectedAppId={selectedAppIdForSingleView}
          onAddClick={() => {
            setActiveTab('sales-order');
            setActiveSubTab('study');
          }}
          onRefresh={fetchInitialData}
          onApplicationUpdated={(appId, changes) => setApplications(prev => prev.map(app =>
            String(app.id || app._id) === String(appId) ? { ...app, ...changes } : app
          ))}
        />
      );
    }
    
    if (activeTab === 'admin-report') {
      return (
        <AdminReport 
          applications={scopedApplications} 
          activeSubTab={activeSubTab}
          referralAgents={referralAgents}
          universities={universities}
        />
      );
    }
    
    if (activeTab === 'partners') {
      return <Partners clients={scopedClients} setClients={setClients} applications={scopedApplications} />;
    }
    
    if (activeTab === 'students') {
      return (
        <Students 
          clients={scopedClients} 
          setClients={setClients} 
          applications={scopedApplications} 
          intakes={intakes} 
          initialSelectedStudentId={selectedStudentForSingleView}
          onNavigateToApplication={(appId) => {
            setSelectedAppIdForSingleView(appId);
            localStorage.setItem('studegram_admin_single_view_app_id', String(appId));
            setActiveTab('applications');
          }}
        />
      );
    }
    
    if (activeTab === 'staff') {
      return <Staff staffList={staffList} setStaffList={setStaffList} applications={applications} />;
    }

    if (activeTab === 'staff-activity-logs' || activeTab === 'activity-logs') {
      return <StaffActivityLogs />;
    }


    if (activeTab === 'commissions') {
      return <CommissionManagement clients={scopedClients} referralAgents={referralAgents} applications={scopedApplications} />;
    }

    if (activeTab === 'roles' || activeTab === 'role-hierarchy' || activeTab === 'roles-permissions') {
      return <RoleHierarchy />;
    }
    
    if (activeTab === 'sales-order' || activeTab === 'new-application') {
      if (activeSubTab === 'tourist-package') {
        return <SalesOrderTourist />;
      }
      if (activeSubTab === 'study' || !activeSubTab) {
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
        <p className="text-[10px] text-slate-500 font-semibold mt-1">This section is being synchronized under the new Unigather data framework.</p>
      </div>
    );
  };

  useEffect(() => {
    const mainEl = document.getElementById('admin-main-content');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  }, [activeTab, activeSubTab, selectedAppIdForSingleView, selectedPartnerForSingleView, selectedStudentForSingleView]);

  useEffect(() => {
    const handleClearApp = () => setSelectedAppIdForSingleView(null);
    const handleClearPartner = () => setSelectedPartnerForSingleView(null);
    const handleClearStudent = () => setSelectedStudentForSingleView(null);
    const handleNavigateApp = (e) => {
      const appId = e.detail?.appId;
      if (appId) {
        setSelectedAppIdForSingleView(appId);
        setActiveTab('applications');
      }
    };

    window.addEventListener('clear_single_view_app', handleClearApp);
    window.addEventListener('clear_single_view_partner', handleClearPartner);
    window.addEventListener('clear_student_expanded', handleClearStudent);
    window.addEventListener('navigate_to_application', handleNavigateApp);

    return () => {
      window.removeEventListener('clear_single_view_app', handleClearApp);
      window.removeEventListener('clear_single_view_partner', handleClearPartner);
      window.removeEventListener('clear_student_expanded', handleClearStudent);
      window.removeEventListener('navigate_to_application', handleNavigateApp);
    };
  }, []);

  const handleSelectTab = (tabId) => {
    if (tabId === 'applications') {
      setSelectedAppIdForSingleView(null);
      localStorage.removeItem('studegram_admin_single_view_app_id');
      localStorage.removeItem('studegram_admin_single_view_app');
      // Clear the URL before Applications mounts and restores a saved detail view.
      const url = new URL(window.location.href);
      url.searchParams.delete('appId');
      url.searchParams.delete('applicationId');
      window.history.replaceState(window.history.state, '', url.toString());
      window.dispatchEvent(new CustomEvent('clear_single_view_app'));
    }
    if (tabId === 'become-partner' || tabId === 'partners') {
      fetchInitialData();
      setSelectedPartnerForSingleView(null);
      localStorage.removeItem('studegram_admin_single_view_partner_id');
      localStorage.removeItem('studegram_admin_single_view_partner');
      localStorage.setItem('studegram_admin_partner_subview', 'directory');
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('agentId');
        url.searchParams.delete('partnerId');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('clear_single_view_partner'));
    }
    if (tabId === 'staff-activity-logs' || tabId === 'activity-logs') {
      localStorage.removeItem('studegram_admin_selected_staff_id');
      const url = new URL(window.location.href);
      url.searchParams.delete('staffId');
      window.history.replaceState(window.history.state, '', url.toString());
      window.dispatchEvent(new CustomEvent('clear_single_view_staff'));
    }
    if (tabId === 'students') {
      setSelectedStudentForSingleView(null);
      localStorage.removeItem('studegram_admin_expanded_student_id');
      localStorage.removeItem('studegram_admin_single_view_student_id');
      localStorage.removeItem('studegram_admin_single_view_student');
      const url = new URL(window.location.href);
      url.searchParams.delete('studentId');
      window.history.replaceState(window.history.state, '', url.toString());
      window.dispatchEvent(new CustomEvent('clear_student_expanded'));
    }
    if (tabId === 'staff') {
      const url = new URL(window.location.href);
      url.searchParams.delete('adminStaffId');
      window.history.replaceState(window.history.state, '', url.toString());
      window.dispatchEvent(new CustomEvent('clear_single_view_admin_staff'));
    }
    setActiveTab(tabId);
  };

  return (
    <div className="h-screen w-full bg-[#F0F2F5] flex font-sans text-slate-900 select-text overflow-hidden">
      <AdminSidebar 
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        onLogout={() => setShowLogoutConfirmModal(true)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <AdminHeader 
          activeTab={activeTab}
          activeSubTab={activeSubTab}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onLogout={() => setShowLogoutConfirmModal(true)}
          onBack={handleBack}
          isSyncing={isDataSyncing}
          onRefreshData={fetchInitialData}
          onNavigate={(tab, subTab, targetId, notification) => {
            setActiveTab(tab);
            setActiveSubTab(subTab || null);
            const payload = { targetId, notification, timestamp: Date.now() };
            if (tab === 'become-partner' || tab === 'partners') {
              fetchInitialData();
              setSelectedPartnerForSingleView(payload);
            } else if (tab === 'applications') {
              setSelectedAppIdForSingleView(payload);
            } else if (tab === 'students') {
              setSelectedStudentForSingleView(payload);
            }
          }}
        />

        <main id="admin-main-content" key={`${activeTab}-${activeSubTab}`} className="flex-1 overflow-y-auto overflow-x-hidden pb-16 animate-fade-in scroll-smooth">
          {dataLoadError && <p role="alert" className="mx-6 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">{dataLoadError}</p>}
          {renderActiveTabContent()}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirmModal}
        onClose={() => setShowLogoutConfirmModal(false)}
        onConfirm={onLogout}
      />
    </div>
  );
}
