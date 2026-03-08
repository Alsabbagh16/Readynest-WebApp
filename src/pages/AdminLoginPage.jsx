import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { useToast } from "@/components/ui/use-toast";

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { adminLogin, isAdmin, loading: adminContextOverallLoading, adminAuthLoading } = useAdminAuth(); 
  const { user, loading: authContextOverallLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Only process redirects when all loading is finished
    if (!authContextOverallLoading && !adminContextOverallLoading) {
      if (isAdmin) {
        // User is confirmed as Admin -> Go to Dashboard
        navigate('/admin-dashboard');
      } else if (user) {
        // User is logged in but NOT an Admin -> Access Denied, go to regular Dashboard
        toast({ title: "Access Denied", description: "This login is for administrators. Redirecting to your dashboard.", variant: "warning" });
        navigate('/dashboard');
      }
    }
  }, [user, isAdmin, authContextOverallLoading, adminContextOverallLoading, navigate, toast]);


  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await adminLogin(email, password);
      // Redirection is handled by useEffect
    } catch (error) {
      console.error("Admin login failed:", error);
      // Toast is handled within adminLogin function
    }
  };

  // Page is loading if authentication checks are still running
  const pageLoading = authContextOverallLoading || adminContextOverallLoading;

  if (pageLoading) {
     return <div className="flex justify-center items-center min-h-screen">Checking permissions...</div>;
  }
  
  // If we are logged in (as anyone), the useEffect above handles the redirect. 
  // We can show a processing state to avoid flashing the form.
  if (user || isAdmin) {
      return <div className="flex justify-center items-center min-h-screen">Redirecting...</div>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-[350px] shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Admin Panel</CardTitle>
            <CardDescription>Login to manage the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={pageLoading}>
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;