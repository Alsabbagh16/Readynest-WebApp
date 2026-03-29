import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { Chrome } from 'lucide-react';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Clear any stale OAuth redirect data to prevent conflicts
      localStorage.removeItem('postLoginRedirect');
      
      await login(email, password);
      const searchParams = new URLSearchParams(location.search);
      const redirectPath = searchParams.get('redirect');
      const step = searchParams.get('step');
      if (redirectPath) {
        const targetPath = step ? `${redirectPath}?step=${step}` : redirectPath;
        navigate(targetPath, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      console.error("Login failed in LoginForm:", error);
      
      if (error.message && (error.message.toLowerCase().includes("email not confirmed") || error.message.toLowerCase().includes("email not verified"))) {
          toast({
            title: "Verification Required",
            description: "Please check your email to verify your account.",
            variant: "default", 
          });
          navigate(`/verify-email${location.search}`, { 
            state: { email } 
          });
          return;
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // 1. Determine the Base URL for Redirect
      // Using the origin ensures we match the exact domain allowed in Supabase Authentication -> URL Configuration.
      // This is crucial for mobile reliability where mismatches can cause failures.
      const isDevelopment = 
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1';
      
      const PRODUCTION_DOMAIN = 'https://readynest.co';
      const origin = isDevelopment ? window.location.origin : PRODUCTION_DOMAIN;

      // 2. Determine Intended Destination
      // We store the intended destination in localStorage to survive the OAuth redirect flow.
      const searchParams = new URLSearchParams(location.search);
      const redirectQueryParam = searchParams.get('redirect');
      const stepQueryParam = searchParams.get('step');
      
      let finalDestination = '/dashboard'; 
      if (redirectQueryParam) {
        finalDestination = redirectQueryParam;
        if (stepQueryParam) {
          finalDestination += `?step=${stepQueryParam}`;
        }
      }
      
      // Ensure destination path starts with /
      if (!finalDestination.startsWith('/')) {
        finalDestination = '/' + finalDestination;
      }
      
      // Check if we're coming from hourly booking and need to save booking data
      const urlParams = new URLSearchParams(window.location.search);
      const isFromHourlyBooking = urlParams.get('redirect') === '/hourlybooking';
      
      if (isFromHourlyBooking) {
        // Check if there's booking data in the current page's context
        // This will be handled by the hourlybooking page before redirect
        console.log('Google login from hourly booking detected');
      }
      
      // Store for retrieval in App.jsx after successful callback
      localStorage.setItem('postLoginRedirect', finalDestination);

      // 3. Initiate OAuth Redirect
      // We redirect to 'origin' (homepage) to guarantee the URL is whitelisted.
      // The App component will handle the final navigation based on localStorage.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: origin,
          queryParams: {
            // Force consent to ensure we get a Refresh Token for reliable mobile sessions
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error("[Google Auth] Supabase Error:", error);
        toast({
          title: "Google Sign-In Error",
          description: error.message,
          variant: "destructive"
        });
        localStorage.removeItem('postLoginRedirect'); // Clean up on error
      }
    } catch (error) {
      toast({
        title: "Google Sign-In Failed",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
      console.error("[Google Auth] Unexpected error:", error);
      localStorage.removeItem('postLoginRedirect');
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
        />
      </div>
      <div className="text-right">
        <Link 
          to="/forgot-password" 
          className="text-sm text-primary hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="w-full">Login</Button>
      <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        Or continue with
      </div>
      <Button variant="outline" className="w-full mt-2 dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700" onClick={handleGoogleLogin} type="button">
        <Chrome className="mr-2 h-4 w-4" /> Sign in with Google
      </Button>
    </form>
  );
};

export default LoginForm;