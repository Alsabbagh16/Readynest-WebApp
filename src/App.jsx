import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import Home2Page from "@/pages/Home2Page";
import HourlyBookingPage from "@/pages/HourlyBookingPage";
import ProductBookingPage from "@/pages/ProductBookingPage";
import ContactPage from "@/pages/ContactPage";
import QuotePage from "@/pages/QuotePage";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import AdminCreateServicePage from "@/pages/AdminCreateServicePage"; 
import AdminCreateAddonPage from "@/pages/AdminCreateAddonPage";
import AdminEditServicePage from "@/pages/AdminEditServicePage";
import BookingConfirmationPage from "@/pages/BookingConfirmationPage";
import VerificationPendingPage from "@/pages/VerificationPendingPage";
import VerificationSuccessPage from "@/pages/VerificationSuccessPage";
import LoadingLog from "@/components/LoadingLog";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import TermsOfServicePage from "@/pages/TermsOfServicePage";
import CancellationPolicyPage from "@/pages/CancellationPolicyPage";
import AboutUsPage from "@/pages/AboutUsPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";

const CenteredLoader = ({ text = "Loading..." }) => (
  <div className="flex justify-center items-center h-screen w-full">
    <div className="text-xl font-semibold">{text}</div>
  </div>
);

function ProtectedRoute({ children }) {
  const { user, loading: userAuthContextLoading } = useAuth();

  if (userAuthContextLoading || user === undefined) {
    return <CenteredLoader text="Loading..." />;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function ProtectedAdminRoute({ children }) {
  const { isAdmin, loading: adminOverallLoading, adminUser, adminAuthLoading } = useAdminAuth();

  if (adminOverallLoading || adminUser === undefined || adminAuthLoading) {
     return <CenteredLoader text="Loading Admin Access..."/>;
  }

  if (!isAdmin || !adminUser) {
     return <Navigate to="/admin-panel" replace />;
  }

  return children;
}

const AuthErrorDialog = ({ error, retryAuth }) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!error) return null;

  const handleReturnToLogin = () => {
    navigate('/auth', { replace: true });
    window.location.href = '/auth'; 
  };

  return (
    <AlertDialog open={!!error}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Authentication Issue
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              We encountered a problem signing you in automatically. This often happens on mobile devices if the connection is interrupted.
            </p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Please try reconnecting or return to the login page.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleReturnToLogin} className="w-full sm:w-auto">
            Return to Login
          </Button>
          <Button onClick={retryAuth} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Connection
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


function App() {
  const { user, loading: authLoading, authError, retryAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Clean up OAuth params from URL after successful auth
  useEffect(() => {
    if (user && !authLoading) {
      const searchParams = new URLSearchParams(location.search);
      if (searchParams.has('code') || searchParams.has('access_token') || searchParams.has('error')) {
          navigate(location.pathname, { replace: true });
      }
    }
  }, [user, authLoading, navigate, location.pathname, location.search]);

  return (
    <>
      <AuthErrorDialog error={authError} retryAuth={retryAuth} />
      
      <Routes>
         <Route path="/dashboard" element={<Home2Page />} /> 

         <Route path="/admin-panel" element={<AdminLoginPage />} />
         <Route
            path="/admin-dashboard/*" 
            element={
              <ProtectedAdminRoute>
                <AdminDashboardPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin-dashboard/create-service"
            element={
              <ProtectedAdminRoute>
                <AdminCreateServicePage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin-dashboard/edit-service/:productId"
            element={
              <ProtectedAdminRoute>
                <AdminEditServicePage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin-dashboard/create-addon"
            element={
              <ProtectedAdminRoute>
                <AdminCreateAddonPage />
              </ProtectedAdminRoute>
            }
          />
        
        <Route path="/verify-email" element={<VerificationPendingPage />} />
        <Route path="/verification-success" element={<VerificationSuccessPage />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="hourlybooking" element={<HourlyBookingPage />} />
          <Route path="book-product/:productId" element={<ProductBookingPage />} />
          <Route path="quote" element={<QuotePage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="auth" element={<AuthPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="booking-confirmation" element={<BookingConfirmationPage />} />
          
          <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="terms-of-service" element={<TermsOfServicePage />} />
          <Route path="cancellation-policy" element={<CancellationPolicyPage />} />
          <Route path="about-us" element={<AboutUsPage />} />
          
          <Route
            path="account"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
           <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster />
      <LoadingLog />
    </>
  );
}

export default App;