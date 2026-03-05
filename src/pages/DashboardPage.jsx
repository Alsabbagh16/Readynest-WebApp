import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, MapPin, History, LogOut, CalendarCheck } from 'lucide-react';
import AccountInfoTab from '@/components/Dashboard/AccountInfoTab';
import PurchaseHistoryTab from '@/components/Dashboard/PurchaseHistoryTab';
import AddressesTab from '@/components/Dashboard/AddressesTab';
import ScheduledCleaningsTab from '@/components/Dashboard/ScheduledCleaningsTab';
import { Button } from '@/components/ui/button';
import { usePurchaseNotifications } from '@/hooks/usePurchaseNotifications';

const DashboardPage = () => {
  const location = useLocation();
  const { user, profile, logout, loading: authLoading } = useAuth();
  const { hasNewPurchases, markAsViewed } = usePurchaseNotifications();
  const [activeTab, setActiveTab] = useState('account');
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    // Check if state is passed for tab navigation
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    // Automatically mark as viewed when History tab is active
    if (activeTab === 'history' && hasNewPurchases) {
      markAsViewed();
    }
  }, [activeTab, hasNewPurchases, markAsViewed]);

  useEffect(() => {
    if (!authLoading && (user || profile)) {
      setLocalLoading(false);
    } else if (!authLoading && !user && !profile) {
      setLocalLoading(false);
    }
  }, [authLoading, user, profile]);


  const tabs = [
    { id: 'account', label: 'Account Information', icon: User, component: <AccountInfoTab /> },
    { id: 'addresses', label: 'Saved Addresses', icon: MapPin, component: <AddressesTab /> },
    { id: 'scheduled', label: 'Scheduled Cleanings', icon: CalendarCheck, component: <ScheduledCleaningsTab /> },
    { id: 'history', label: 'Purchase History', icon: History, component: <PurchaseHistoryTab /> },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  if (localLoading) {
    return (
      <div className="flex justify-center items-center h-screen w-full">
        <div className="text-xl font-semibold">Loading Your Dashboard Data...</div>
      </div>
    );
  }

  if (!user && !profile) {
    return (
      <div className="flex flex-col justify-center items-center h-screen w-full">
        <p className="text-xl font-semibold mb-4">You are not logged in.</p>
        <Button onClick={() => window.location.href = '/auth'}>Go to Login</Button>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-12 min-h-[calc(100vh-10rem)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row gap-8"
      >
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-gray-100 shadow-sm mb-6">
            <h2 className="text-lg font-semibold mb-1">Welcome, {profile?.first_name || user?.email || 'User'}!</h2>
            <p className="text-sm text-gray-600 mb-3">{user?.email}</p>
          </div>

          <nav className="space-y-1 bg-white/50 backdrop-blur-sm rounded-lg p-3 border border-gray-100 shadow-sm">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                className={`w-full justify-start relative ${activeTab === tab.id ? 'bg-primary/10 text-primary' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                disabled={authLoading}
              >
                <tab.icon className="mr-2 h-4 w-4" />
                {tab.label}
                {tab.id === 'history' && hasNewPurchases && (
                  <span className="absolute right-5 h-4 w-8 bg-red-600 rounded-full border-0 border-white z-10 flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">New</span>
                  </span>)}
              </Button>
            ))}
            <Button
              variant='ghost'
              className="w-full justify-start text-red-600 hover:bg-red-100 hover:text-red-700"
              onClick={logout}
              disabled={authLoading}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </nav>
        </div>

        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden"
          >
            {authLoading ? <div className="p-6 text-center">Loading tab content...</div> : ActiveComponent}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;