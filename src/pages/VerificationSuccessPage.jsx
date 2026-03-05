import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

const VerificationSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Trigger confetti on mount
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Auto-redirect logic
    const timer = setTimeout(() => {
      const searchParams = new URLSearchParams(location.search);
      const redirectPath = searchParams.get('redirect');
      const step = searchParams.get('step');
      
      if (redirectPath) {
        const targetPath = step ? `${redirectPath}?step=${step}` : redirectPath;
        navigate(targetPath, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }, 3000); // 3 seconds delay to see the animation

    return () => clearTimeout(timer);
  }, [navigate, location.search]);

  return (
    <div className="min-h-screen bg-green-50/50 dark:bg-green-900/10 flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Card className="w-full max-w-md shadow-2xl border-green-200 dark:border-green-800">
          <CardHeader className="space-y-4">
             <motion.div 
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ delay: 0.2 }}
               className="mx-auto"
             >
               <CheckCircle className="h-24 w-24 text-green-500" />
             </motion.div>
            <CardTitle className="text-3xl font-bold text-green-700 dark:text-green-400">Verified!</CardTitle>
            <CardDescription className="text-lg">
              Your email has been successfully verified.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
               <Loader2 className="h-4 w-4 animate-spin" />
               <p>Redirecting you to your destination...</p>
            </div>
            
            {/* Fallback button if auto-redirect fails or user is impatient */}
            <Button 
               className="w-full bg-green-600 hover:bg-green-700 text-white"
               onClick={() => {
                  const searchParams = new URLSearchParams(location.search);
                  const redirectPath = searchParams.get('redirect');
                  if (redirectPath) {
                     navigate(redirectPath);
                  } else {
                     navigate('/dashboard');
                  }
               }}
            >
               Continue Now
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default VerificationSuccessPage;