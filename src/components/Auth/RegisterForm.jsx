import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';

const RegisterForm = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dob, setDob] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const turnstileRef = useRef(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!turnstileToken) {
      toast({
        title: "CAPTCHA Required",
        description: "Please complete the CAPTCHA verification.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Verify Turnstile token with our custom function
      console.log('Verifying Turnstile token...');
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-turnstile', {
        body: { token: turnstileToken }
      });

      console.log('Verify response:', { verifyData, verifyError });

      if (verifyError) {
        console.error('Turnstile verification error:', verifyError);
        toast({
          title: "CAPTCHA Verification Failed",
          description: `Server error: ${verifyError.message}`,
          variant: "destructive"
        });
        // Reset the Turnstile widget
        if (turnstileRef.current) {
          turnstileRef.current.reset();
        }
        setTurnstileToken(null);
        return;
      }

      if (!verifyData?.success) {
        console.error('Turnstile verification failed:', verifyData);
        toast({
          title: "CAPTCHA Verification Failed",
          description: verifyData?.error || "Invalid CAPTCHA. Please try again.",
          variant: "destructive"
        });
        // Reset the Turnstile widget
        if (turnstileRef.current) {
          turnstileRef.current.reset();
        }
        setTurnstileToken(null);
        return;
      }
      // Build redirect URL for verification success
      const searchParams = new URLSearchParams(location.search);
      // We want to preserve existing query params (like redirect=/book) so the success page knows where to send them
      const queryString = searchParams.toString();
      const redirectBase = `${window.location.origin}/verification-success`;
      const emailRedirectTo = queryString ? `${redirectBase}?${queryString}` : redirectBase;

      const { data: { session }, error: sessionError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
                    data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            dob: dob,
            user_type: 'home_owner',
            credits: 0,
          }
        }
      });

      if (sessionError) throw sessionError;

      toast({
        title: "Account Created!",
        description: "Welcome to ReadyNest!",
        variant: "default",
        className: "bg-green-50 border-green-200 text-green-900"
      });

      // Navigate to dashboard after successful registration
      const urlParams = new URLSearchParams(location.search);
      const redirectPath = urlParams.get('redirect');
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }

    } catch (error) {
      console.error("Registration failed:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="first-name">First Name</Label>
        <Input
          id="first-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="last-name">Last Name</Label>
        <Input
          id="last-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-phone">Phone Number</Label>
        <Input
          id="register-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g., +1234567890"
          className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="dob">Date of Birth</Label>
        <Input
          id="dob"
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          required
          className="dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:[color-scheme:dark]"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="register-password">Password</Label>
        <Input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
        />
      </div>
      
      <div className="flex justify-center">
        <Turnstile
          ref={turnstileRef}
          siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
          onSuccess={(token) => setTurnstileToken(token)}
          onError={() => setTurnstileToken(null)}
          onExpire={() => setTurnstileToken(null)}
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Create Account
      </Button>
    </form>
  );
};

export default RegisterForm;