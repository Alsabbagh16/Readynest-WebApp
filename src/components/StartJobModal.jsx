import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Timer, CheckCircle2, AlertCircle, MapPin, User, Pause, Play } from 'lucide-react';
import { useJobTimer } from '@/hooks/useJobTimer';
import { cn } from '@/lib/utils';

const checklistItems = [
  { id: 'checklist-arrived', label: "Arrived on site" },
  { id: 'checklist-photos', label: "Took before photos" },
    { id: 'checklist-instructions', label: "Reviewed client instructions" },
    { id: 'checklist-toilets', label: "Clean Toilets and Washroom" },
    { id: 'checklist-kitchen', label: "Kitchen silverware, cabints & dishes" },
    { id: 'checklist-beds', label: "Replace Linens" }
  
];

// Estimated max duration for progress bar visualization (e.g., 4 hours)
const MAX_DURATION_SECONDS = 4 * 60 * 60;

const StartJobModal = ({ isOpen, onClose, onComplete, job }) => {
  const [checkedItems, setCheckedItems] = useState({});
  const { time, isRunning, isPaused, startTimer, pauseTimer, resumeTimer, resetTimer, formatTime, setElapsedTime } = useJobTimer();
  
  const jobId = job?.job_ref_id;
  const storageKey = jobId ? `job_session_${jobId}` : null;

  // Load session on mount/open
  useEffect(() => {
    if (isOpen && storageKey) {
        const savedSession = localStorage.getItem(storageKey);
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                
                // Restore timer state
                if (session.pausedTime !== undefined) {
                    setElapsedTime(session.pausedTime);
                }
                
                // Restore checklist state
                if (session.checklistState) {
                    setCheckedItems(session.checklistState);
                }
                
                // Auto-resume logic
                resumeTimer(); 
            } catch (error) {
                console.error("Error loading job session:", error);
                startTimer();
            }
        } else {
            // New session (fresh start)
            resetTimer(); 
            startTimer();
            setCheckedItems({});
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, storageKey]); 

  const saveSession = () => {
      if (storageKey) {
          const sessionData = {
              pausedTime: time,
              checklistState: checkedItems,
              timestamp: Date.now()
          };
          localStorage.setItem(storageKey, JSON.stringify(sessionData));
      }
  };

  const clearSession = () => {
      if (storageKey) {
          localStorage.removeItem(storageKey);
      }
  };

  const toggleCheck = (id) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Save session whenever checklist changes
  useEffect(() => {
    if (isOpen && isRunning) {
        saveSession();
    }
  }, [checkedItems]);

  const allChecked = checklistItems.every(item => checkedItems[item.id]);

  const handleClose = () => {
      pauseTimer();
      if (storageKey) {
          const sessionData = {
              pausedTime: time,
              checklistState: checkedItems,
              timestamp: Date.now()
          };
          localStorage.setItem(storageKey, JSON.stringify(sessionData));
      }
      onClose();
  };

  const handleCompleteJob = () => {
    pauseTimer();
    clearSession();
    onComplete(formatTime(time));
  };

  const handleToggleTimer = () => {
      if (isRunning) {
          pauseTimer();
          saveSession();
      } else {
          resumeTimer();
      }
  };

  if (!job) return null;

  const addressString = typeof job.user_address === 'object' 
    ? `${job.user_address.street || ''} ${job.user_address.city || ''}` 
    : job.user_address || 'No address provided';

  // Calculate progress percentage (capped at 100%)
  const progressPercent = Math.min((time / MAX_DURATION_SECONDS) * 100, 100);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) handleClose();
    }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Timer className="h-6 w-6 text-primary" />
            Job In Progress
          </DialogTitle>
          <div className="flex flex-col gap-1 mt-2">
            <div className="text-sm text-muted-foreground flex items-center">
                <span className="font-mono font-medium text-foreground mr-2">{job.job_ref_id}</span>
            </div>
            <div className="text-sm flex items-center text-gray-600">
                <User className="w-3 h-3 mr-1" /> {job.user_name || 'Client'}
            </div>
            <div className="text-xs flex items-center text-gray-500">
                <MapPin className="w-3 h-3 mr-1" /> {addressString}
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-2 flex-1 overflow-hidden flex flex-col">
            {/* Compact Horizontal Timer Bar */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-100 dark:border-slate-800 mb-4 shrink-0">
                <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-full"
                            onClick={handleToggleTimer}
                            title={isRunning ? "Pause" : "Resume"}
                        >
                            {isRunning ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current ml-0.5" />}
                        </Button>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {isRunning ? "Running" : "Paused"}
                        </span>
                    </div>
                    <span className="text-3xl font-bold font-mono text-primary tabular-nums tracking-tight leading-none">
                        {formatTime(time)}
                    </span>
                </div>
                
                {/* Progress Bar */}
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                        className={cn(
                            "h-full rounded-full", 
                            isRunning ? "bg-primary" : "bg-amber-500"
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-0.5">
                    <span>Start</span>
                    <span>Target: 4h</span>
                </div>
            </div>

            {/* Scrollable Checklist */}
            <div className="flex-1 overflow-y-auto max-h-[350px] min-h-[100px] bg-white dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg p-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700">
                 <div className="p-3 sticky top-0 bg-white dark:bg-slate-950 z-10 border-b border-gray-50 dark:border-slate-800 mb-2">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                        Required Checklist
                    </h4>
                 </div>
                 <div className="space-y-1 p-3 pt-0">
                    {checklistItems.map((item) => (
                    <div key={item.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <Checkbox 
                            id={item.id} 
                            checked={!!checkedItems[item.id]}
                            onCheckedChange={() => toggleCheck(item.id)}
                            className="mt-0.5 border-gray-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label 
                                htmlFor={item.id}
                                className={cn(
                                    "text-sm font-medium leading-none cursor-pointer transition-colors",
                                    checkedItems[item.id] ? "text-gray-500 line-through decoration-gray-400" : "text-gray-700 dark:text-gray-300"
                                )}
                            >
                            {item.label}
                            </Label>
                        </div>
                    </div>
                    ))}
                </div>
            </div>
        </div>

        <DialogFooter className="p-6 pt-2 sm:justify-between flex-col sm:flex-row gap-3 bg-white dark:bg-slate-950 z-20">
            {!allChecked && (
                 <div className="flex items-center justify-center text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-md w-full sm:w-auto">
                    <AlertCircle className="w-3 h-3 mr-1.5 flex-shrink-0" />
                    Complete checklist
                </div>
            )}
          <Button 
            type="button" 
            onClick={handleCompleteJob}
            disabled={!allChecked}
            className={cn(
                "w-full sm:w-auto sm:ml-auto transition-all duration-300 font-semibold",
                allChecked ? "bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200" : ""
            )}
          >
            {allChecked ? "Complete Job" : "Finish Checklist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StartJobModal;