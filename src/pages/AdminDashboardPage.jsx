import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ShoppingCart, Briefcase, LogOut, ListChecks, Settings2, UserCircle, Menu, X, ChevronRight, LayoutTemplate, Tag, CalendarDays, ShieldCheck, DollarSign, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateJob } from "@/lib/storage/jobStorage";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import StartJobModal from "@/components/StartJobModal";

import AdminMyAccountTab from '@/components/AdminDashboard/AdminMyAccountTab';
import RegisteredAccountsTab from '@/components/AdminDashboard/RegisteredAccountsTab';
import RecentPurchasesTab from '@/components/AdminDashboard/RecentPurchasesTab';
import EmployeesTab from '@/components/AdminDashboard/EmployeesTab';
import RecentServicesTab from '@/components/AdminDashboard/RecentServicesTab';
import ManageServicesTab from '@/components/AdminDashboard/ManageServicesTab';
import CustomizeWebsiteTab from '@/components/AdminDashboard/CustomizeWebsiteTab';
import CouponsTab from '@/components/AdminDashboard/CouponsTab';
import JobsCalendarTab from '@/components/AdminDashboard/JobsCalendarTab'; 
import ServiceRatesTab from '@/components/AdminDashboard/ServiceRatesTab';
import ReportIssueTab from '@/components/AdminDashboard/ReportIssueTab';
import ManageRolesPage from '@/pages/ManageRolesPage';
import AdminPurchaseDetailPage from '@/pages/AdminPurchaseDetailPage';
import AdminJobDetailPage from '@/pages/AdminJobDetailPage'; 
import AdminCreateJobPage from '@/pages/AdminCreateJobPage'; 
import { Link, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import AdminServiceDetailPage from '@/pages/AdminServiceDetailPage';
import AdminEmployeeProfilePage from '@/pages/AdminEmployeeProfilePage';
import AdminUserProfilePage from '@/pages/AdminUserProfilePage';
import AdminCreateServicePage from "@/pages/AdminCreateServicePage";
import AdminEditServicePage from "@/pages/AdminEditServicePage";
import AdminCreateAddonPage from "@/pages/AdminCreateAddonPage";
import ManageAddonsPage from "@/pages/ManageAddonsPage";
import JobsDayViewPage from '@/pages/JobsDayViewPage'; 

import { PermissionProvider, usePermissionContext } from '@/contexts/PermissionContext';
import PermissionGate from '@/components/PermissionGate';

const PermissionDeniedPage = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 bg-white rounded-lg shadow-sm border border-gray-100 m-4">
    <div className="bg-red-50 p-4 rounded-full mb-4">
      <LogOut className="h-8 w-8 text-red-500" />
    </div>
    <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
    <p className="text-gray-500 mb-6 text-center max-w-md">You do not have the required permissions to view this page. Please contact your administrator if you believe this is an error.</p>
    <Button asChild variant="outline">
      <Link to="/admin-dashboard">Return to Dashboard</Link>
    </Button>
  </div>
);

const AdminDashboardContent = () => {
  const { adminUser, adminProfile, adminLogout } = useAdminAuth();
  const { hasPerm, isSuperadmin, hasUiRoles } = usePermissionContext();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  const [activeJobModal, setActiveJobModal] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const allTabs = [
    { id: 'my-account', label: 'My Account', icon: UserCircle, path: '/admin-dashboard/my-account', component: <AdminMyAccountTab />, permission: null }, 
    { id: 'jobs-calendar', label: 'Jobs Calendar', icon: CalendarDays, path: '/admin-dashboard/jobs-calendar', component: <JobsCalendarTab />, permission: 'tab.jobs_list.view' },
    { id: 'jobs', label: 'Jobs List', icon: ListChecks, path: '/admin-dashboard/jobs', component: <RecentServicesTab />, permission: 'tab.jobs_list.view' },
    { id: 'purchases', label: 'Purchases', icon: ShoppingCart, path: '/admin-dashboard/purchases', component: <RecentPurchasesTab />, permission: 'tab.recent_purchases.view' },
    { id: 'accounts', label: 'Registered Accounts', icon: Users, path: '/admin-dashboard/accounts', component: <RegisteredAccountsTab />, permission: 'tab.registered_accounts.view' },
    { id: 'employees', label: 'Employees', icon: Briefcase, path: '/admin-dashboard/employees', component: <EmployeesTab />, permission: 'tab.employees.view' },
    { id: 'manage-services', label: 'Services & Products', icon: Settings2, path: '/admin-dashboard/manage-services', component: <ManageServicesTab />, permission: 'tab.services_products.view' },
    { id: 'service-rates', label: 'Service Rates', icon: DollarSign, path: '/admin-dashboard/service-rates', component: <ServiceRatesTab />, permission: 'tab.services_products.view' },
    { id: 'coupons', label: 'Coupons', icon: Tag, path: '/admin-dashboard/coupons', component: <CouponsTab />, permission: 'tab.coupons.view' },
    { id: 'report-issue', label: 'Report Issue', icon: Mail, path: '/admin-dashboard/report-issue', component: <ReportIssueTab />, permission: null },
    { id: 'customize-website', label: 'Customize Website', icon: LayoutTemplate, path: '/admin-dashboard/customize-website', component: <CustomizeWebsiteTab />, permission: 'tab.customize_website.view' },
    { id: 'manage-roles', label: 'Manage Roles', icon: ShieldCheck, path: '/admin-dashboard/manage-roles', component: <ManageRolesPage />, permission: 'tab.manage_roles.view' },
  ];

  const [visibleTabs, setVisibleTabs] = useState([]);
  
  useEffect(() => {
    if (adminProfile) {
      const filteredTabs = allTabs.filter(tab => {
        // Always show these tabs for all users
        if (tab.id === 'my-account' || tab.id === 'report-issue') return true;
        
        // Handle manage-roles specifically
        if (tab.id === 'manage-roles') {
             if (isSuperadmin) return true;
             return hasUiRoles && hasPerm('tab.manage_roles.view');
        }
        
        // For superadmins, show all tabs
        if (isSuperadmin) return true;
        
        // For users with UI roles, check permissions
        if (hasUiRoles) return hasPerm(tab.permission);
        
        // Default fallback for other users
        return true; 
      });
      setVisibleTabs(filteredTabs);
    }
  }, [adminProfile, hasPerm, isSuperadmin, hasUiRoles]);

  const getCurrentTabId = () => {
    const pathSegments = location.pathname.split('/');
    const currentTabSlug = pathSegments[2];

    if (currentTabSlug === 'service' && pathSegments[3] && pathSegments[2] !== 'manage-services') return 'jobs'; 
    if (currentTabSlug === 'job' && pathSegments[3] && pathSegments[3] !== 'create') return 'jobs'; 
    if (currentTabSlug === 'job' && pathSegments[3] === 'create') return 'jobs'; 
    if (currentTabSlug === 'employee') return 'employees';
    if (currentTabSlug === 'user') return 'accounts';
    if (currentTabSlug === 'purchase' && pathSegments[3]) return 'purchases';
    if (currentTabSlug === 'jobs-calendar') return 'jobs-calendar';
    if (currentTabSlug === 'service-rates') return 'service-rates';
    if (currentTabSlug === 'manage-roles') return 'manage-roles';
    
    const tabExists = visibleTabs.find(tab => tab.id === currentTabSlug);
    return tabExists ? currentTabSlug : (visibleTabs.length > 0 ? visibleTabs[0].id : '');
  };
  
  const [activeTabId, setActiveTabId] = useState(getCurrentTabId());

  useEffect(() => {
     setActiveTabId(getCurrentTabId());
  }, [location.pathname, visibleTabs]);

  const getPageTitle = () => {
    const pathSegments = location.pathname.split('/');
    if (pathSegments[2] === 'service' && pathSegments[3] && pathSegments[2] !== 'manage-services') return 'Service Details';
    if (pathSegments[2] === 'job' && pathSegments[3] === 'create') return 'Create New Job';
    if (pathSegments[2] === 'job' && pathSegments[3]) return 'Job Details';
    if (pathSegments[2] === 'jobs' && pathSegments[3] === 'day') return 'Daily Schedule'; 
    if (pathSegments[2] === 'employee' && pathSegments[3]) return 'Employee Profile';
    if (pathSegments[2] === 'user' && pathSegments[3]) return 'User Profile';
    if (pathSegments[2] === 'purchase' && pathSegments[3]) return 'Purchase Details';
    if (pathSegments[2] === 'manage-services' && pathSegments[3] === 'create-service') return 'Create New Service';
    if (pathSegments[2] === 'manage-services' && pathSegments[3] === 'edit-service' && pathSegments[4]) return 'Edit Service';
    if (pathSegments[2] === 'manage-services' && pathSegments[3] === 'create-addon') return 'Create Add-on';
    if (pathSegments[2] === 'manage-services' && pathSegments[3] === 'manage-addons') return 'Manage Addons';
    if (pathSegments[2] === 'service-rates') return 'Service Rates';
    if (pathSegments[2] === 'manage-roles') return 'Role Management';
    
    const currentActiveTabInfo = visibleTabs.find(tab => tab.id === activeTabId);
    return currentActiveTabInfo?.label || 'Admin Dashboard';
  };

  const handleStartJob = async (job) => {
    if (!job) return;
    try {
        const timestamp = new Date().toISOString();
        const startNote = `[${adminProfile?.full_name || 'Staff'}] started the job at ${format(new Date(), 'PPpp')}`;
        
        if (job.status !== 'In Progress') {
            await updateJob(job.job_ref_id, {
                status: 'In Progress',
                notes: job.notes ? `${job.notes}\n${startNote}` : startNote
            });
            toast({ title: "Job Started", description: "Job status updated to In Progress." });
        }
        
        setRefreshTrigger(prev => prev + 1);
        setActiveJobModal(job);
    } catch (error) {
        console.error("Error starting job:", error);
        toast({ title: "Error", description: "Failed to start job. Please try again.", variant: "destructive" });
    }
  };

  const handleJobComplete = async (durationString) => {
    if (!activeJobModal) return;
    try {
        const timestamp = new Date().toISOString();
        const completionNote = `Job completed at ${format(new Date(), 'PPpp')}. Total duration: ${durationString}`;
        const previousNotes = activeJobModal.notes || '';

        await updateJob(activeJobModal.job_ref_id, {
            status: 'Completed',
            notes: `${previousNotes}\n${completionNote}`
        });

        toast({ title: "Job Completed!", description: `Duration: ${durationString}`, className: "bg-green-50 border-green-200 text-green-900" });
        setActiveJobModal(null);
        setRefreshTrigger(prev => prev + 1);
    } catch (error) {
        console.error("Error completing job:", error);
        toast({ title: "Error", description: "Failed to complete job.", variant: "destructive" });
    }
  };

  if (visibleTabs.length === 0 && adminProfile) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4 text-center">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-md w-full">
              <h2 className="text-xl font-bold text-gray-900 mb-2">No Access Available</h2>
              <p className="text-gray-500 mb-6">No accessible tabs found for your role: <span className="font-semibold text-gray-900">{adminProfile?.role}</span>.</p>
              <Button onClick={adminLogout} className="w-full">Sign Out</Button>
            </div>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-gray-900/80 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 text-white flex flex-col transition-transform duration-300 ease-in-out shadow-2xl
        md:relative md:translate-x-0 md:w-64 md:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <Link to="/" className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              ReadyNest
            </Link>
            <p className="text-xs text-gray-400 mt-1.5 font-medium ml-1">Admin Panel • {adminProfile?.role}</p>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="md:hidden text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded-md transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {visibleTabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`
                  flex items-center w-full px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                  ${isActive 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }
                `}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <tab.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                <span className="flex-1">{tab.label}</span>
                {isActive && <ChevronRight className="h-4 w-4 text-white/50" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
           <div className="flex items-center gap-3 mb-4 px-2">
              <div className="h-9 w-9 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                <span className="text-sm font-semibold text-gray-300">
                  {adminUser?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-h-[40px] min-w-0">
                <p className="text-sm font-medium text-white truncate">Administrator</p>
                <p className="text-xs text-gray-500 truncate">{adminUser?.email}</p>
              </div>
           </div>
           <Button
              variant='ghost'
              className="w-full justify-start text-red-400 hover:bg-red-500/10 hover:text-red-300 h-10 px-3"
              onClick={adminLogout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign Out
            </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden bg-gray-100">
      
         <header className="bg-white shadow-sm border-b border-gray-200 p-4 md:px-6 md:py-4 flex items-center justify-between flex-shrink-0 z-10 sticky top-0">
            <div className="flex items-center flex-1 min-w-0">
                <button 
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="mr-3 text-gray-500 hover:text-gray-900 focus:outline-none md:hidden p-2 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors -ml-2"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate tracking-tight">
                    {getPageTitle()}
                </h1>
            </div>
         </header>
         
         <main className="flex-1 p-4 md:p-6 relative scroll-smooth">
            <motion.div
             key={location.pathname}
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.3 }}
             className="max-w-7xl mx-auto"
            >
              <Routes>
                  {visibleTabs.map(tab => {
                     const Gate = ({ children }) => (
                        <PermissionGate permission={tab.permission} fallback={<PermissionDeniedPage />} showAccessDenied={false}>
                            {children}
                        </PermissionGate>
                     );

                     const Component = tab.id === 'jobs-calendar' || tab.id === 'jobs' 
                        ? React.cloneElement(tab.component, { onStartJob: handleStartJob, refreshTrigger: refreshTrigger }) 
                        : tab.component;

                     return (
                        <Route key={tab.id} path={tab.id} element={
                           tab.id === 'my-account' ? (
                               <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                   {Component}
                               </div>
                           ) : (
                               <Gate>
                                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                     {Component}
                                 </div>
                               </Gate>
                           )
                        }/>
                     );
                  })}
                  
                  <Route path="service/:id" element={
                     <PermissionGate permission="products.create" fallback={<PermissionDeniedPage />}>
                        <AdminServiceDetailPage />
                     </PermissionGate>
                  }/> 
                  <Route path="employee/:id" element={
                     <PermissionGate permission="employees.create" fallback={<PermissionDeniedPage />}>
                        <AdminEmployeeProfilePage />
                     </PermissionGate>
                  } />
                  
                  <Route path="user/:id" element={
                     <PermissionGate permission="accounts.update_delete" fallback={<PermissionDeniedPage />}>
                        <AdminUserProfilePage />
                     </PermissionGate>
                  } />
                  
                  <Route path="purchase/:purchaseRefId" element={
                     <PermissionGate permission="tab.recent_purchases.view" fallback={<PermissionDeniedPage />}>
                        <AdminPurchaseDetailPage />
                     </PermissionGate>
                  } />
                  
                  <Route path="job/create" element={
                     <PermissionGate permission="jobs.create" fallback={<PermissionDeniedPage />}>
                        <AdminCreateJobPage />
                     </PermissionGate>
                  } />
                  <Route path="job/:jobRefId" element={
                     <PermissionGate permission="jobs.edit" fallback={<PermissionDeniedPage />}>
                        <AdminJobDetailPage />
                     </PermissionGate>
                  } />
                  <Route path="jobs/day/:date" element={<JobsDayViewPage />} /> 

                  <Route path="manage-services/create-service" element={
                     <PermissionGate permission="products.create" fallback={<PermissionDeniedPage />}>
                        <AdminCreateServicePage />
                     </PermissionGate>
                  } />
                  <Route path="manage-services/edit-service/:productId" element={
                     <PermissionGate permission="products.create" fallback={<PermissionDeniedPage />}>
                        <AdminEditServicePage />
                     </PermissionGate>
                  } />
                  <Route path="manage-services/create-addon" element={
                     <PermissionGate permission="addons_templates.create" fallback={<PermissionDeniedPage />}>
                        <AdminCreateAddonPage />
                     </PermissionGate>
                  } />
                  <Route path="manage-services/manage-addons" element={
                     <PermissionGate permission="addons_templates.create" fallback={<PermissionDeniedPage />}>
                        <ManageAddonsPage />
                     </PermissionGate>
                  } />
                  
                   <Route path="manage-roles" element={
                       <PermissionGate permission="tab.manage_roles.view" fallback={<PermissionDeniedPage />}>
                            <ManageRolesPage />
                       </PermissionGate>
                   } />

                   <Route index element={<Navigate to={visibleTabs.length > 0 ? visibleTabs[0].path : '/admin-panel'} replace />} />
                   <Route path="*" element={<Navigate to={visibleTabs.length > 0 ? visibleTabs[0].path : '/admin-panel'} replace />} />
              </Routes>
            </motion.div>
         </main>
      </div>

      {activeJobModal && (
        <StartJobModal 
            isOpen={!!activeJobModal}
            onClose={() => setActiveJobModal(null)}
            onComplete={handleJobComplete}
            job={activeJobModal}
        />
      )}
    </div>
  );
};

const AdminDashboardPage = () => {
  return (
    <PermissionProvider>
      <AdminDashboardContent />
    </PermissionProvider>
  );
};

export default AdminDashboardPage;