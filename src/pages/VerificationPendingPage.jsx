import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, ArrowRight, Loader2, Timer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";

const VerificationPendingPage = () => {
  const location = useLocation();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Email passed from registration form
  const email = location.state?.email;

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (!email) {
       toast({
        title: "Error",
        description: "We don't have your email address on file to resend. Please try logging in.",
        variant: "destructive"
      });
      return;
    }

    setResending(true);
    try {
       // Construct redirect URL again to be safe
       const searchParams = new URLSearchParams(location.search);
       const queryString = searchParams.toString();
       const redirectBase = `${window.location.origin}/verification-success`;
       const emailRedirectTo = queryString ? `${redirectBase}?${queryString}` : redirectBase;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo
        }
      });

      if (error) {
        // Rate limit error usually
        if (error.status === 429) {
           toast({
            title: "Too Many Requests",
            description: "Please wait a minute before requesting another email.",
            variant: "warning"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Email Sent",
          description: "A new verification email has been sent to your inbox.",
        });
        // Start 30s countdown on success
        setCountdown(30);
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend email.",
        variant: "destructive"
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md shadow-xl border-primary/20">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-2">
              <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription className="text-base">
              We've sent a verification link to <span className="font-semibold text-foreground">{email || 'your email address'}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Please click the link in the email to verify your account and continue.
            </p>

            <div className="flex flex-col gap-3">
              {countdown > 0 && (
                <div className="flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                  <Timer className="mr-1 h-3 w-3" />
                  Wait {countdown}s to resend
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleResend}
                disabled={resending || countdown > 0}
              >
                {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Did not receive verification email?
              </Button>
              
              <Button asChild variant="ghost" className="w-full text-primary hover:text-primary/80">
                <Link to="/">
                  Return to Home <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default VerificationPendingPage;