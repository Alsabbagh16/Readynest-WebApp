import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (type === 'recovery' && accessToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: hashParams.get('refresh_token') || '',
      });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters.",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Password Updated",
        description: "Your password has been successfully reset.",
        variant: "default",
        className: "bg-green-50 border-green-200 text-green-900"
      });

      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    } catch (error) {
      console.error('Password update error:', error);
      setError(error.message);
      toast({
        title: "Error",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-150px)] py-12 bg-gray-50 dark:bg-slate-900">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[400px] px-4"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : error ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
              {success ? "Password Reset!" : "Reset Password"}
            </CardTitle>
            <CardDescription>
              {success 
                ? "Your password has been updated. Redirecting to login..."
                : "Enter your new password below."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  You will be redirected to the login page shortly.
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => navigate('/auth')}
                >
                  Go to Login Now
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Updating..." : "Reset Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
