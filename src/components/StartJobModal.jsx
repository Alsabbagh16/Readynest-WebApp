import React, { useState, useEffect, useRef } from 'react';
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
import { Timer, CheckCircle2, AlertCircle, MapPin, User, Pause, Play, Trash2, X } from 'lucide-react';
import { useJobTimer } from '@/hooks/useJobTimer';
import { cn } from '@/lib/utils';
import { uploadJobDocument } from '@/lib/storage/jobStorage';
import { useToast } from '@/components/ui/use-toast';

const checklistItems = [
      { id: 'checklist-photosbefore', label: "Took before Photos" },
  { id: 'checklist-bedsheets', label: "Bed Sheets Changed" },
  { id: 'checklist-floor', label: "Floor Vacuumed" },
    { id: 'checklist-trash', label: "Trash Removed" },
    { id: 'checklist-livingroom', label: "Living Room sofa arranged & tables dusted" },
    { id: 'checklist-kitchen', label: "Kitchen silverware, cabints & dishes" },
    { id: 'checklist-electronics', label: "Electronics Turned Off: AC, TV, Lights" },
          { id: 'checklist-photosafter', label: "Took After Photos" },
        { id: 'checklist-locked', label: "Doors Locked & Key Card Placed" }
  
];

// Estimated max duration for progress bar visualization (e.g., 4 hours)
const MAX_DURATION_SECONDS = 4 * 60 * 60;

function JobFilePicker({ title, inputId, accept, selected, setSelected, uploaded = [], onRemoveUploaded, busy }) {
  return (
    <section className="mb-2 space-y-2 rounded-lg border p-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium">{title}</h4>
        <input
          id={inputId}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          disabled={busy}
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            setSelected((current) => [...current, ...files]);
            event.target.value = '';
          }}
        />
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" disabled={busy}
          onClick={() => document.getElementById(inputId)?.click()} aria-label={`Select ${title.toLowerCase()}`}>
          Select
        </Button>
      </div>
      {selected.map((file, index) => (
        <div key={index} className="flex items-center justify-between gap-2 rounded bg-muted px-2 py-1 text-xs">
          <span className="truncate">{file.name}</span>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" disabled={busy}
            aria-label={`Remove ${file.name}`} onClick={() => setSelected((current) => current.filter((_, i) => i !== index))}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      {uploaded.map((file, index) => (
        <div key={file.path || index} className="flex items-center justify-between gap-2 px-2 text-xs text-muted-foreground">
            <span className="truncate">{file.name} · Uploaded</span>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" disabled={busy}
            aria-label={`Remove ${file.name} from this list`} onClick={() => onRemoveUploaded(index)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </section>
  );
}

const StartJobModal = ({ isOpen, onClose, onComplete, onDocumentsChange, job }) => {
  const [checkedItems, setCheckedItems] = useState({});
  const { time, isRunning, startTimer, pauseTimer, resumeTimer, resetTimer, formatTime, setElapsedTime } = useJobTimer();
  const { toast } = useToast();
  
  // Image upload states
  const [beforePhotos, setBeforePhotos] = useState([]);
  const [afterPhotos, setAfterPhotos] = useState([]);
  const [selectedBeforeFiles, setSelectedBeforeFiles] = useState([]);
  const [selectedAfterFiles, setSelectedAfterFiles] = useState([]);
  const [finishStep, setFinishStep] = useState(null);
  const finishInFlight = useRef(false);
  const uploadedCount = useRef(0);
  
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
                
                // Restore photo states
                if (session.beforePhotos) {
                    setBeforePhotos(session.beforePhotos);
                }
                if (session.afterPhotos) {
                    setAfterPhotos(session.afterPhotos);
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
            setBeforePhotos([]);
            setAfterPhotos([]);
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, storageKey]); 

  const saveSession = () => {
      if (storageKey) {
          const sessionData = {
              pausedTime: time,
              checklistState: checkedItems,
              beforePhotos: beforePhotos,
              afterPhotos: afterPhotos,
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

  // Save session whenever checklist or photos change
  useEffect(() => {
    if (isOpen && isRunning) {
        saveSession();
    }
  }, [checkedItems, beforePhotos, afterPhotos]);

  const allChecked = checklistItems.every(item => checkedItems[item.id]);

  const handleClose = () => {
      if (finishInFlight.current) return;
      if (selectedBeforeFiles.length || selectedAfterFiles.length) {
          if (!window.confirm('Leave this job and discard the photos you selected for upload?')) return;
          setSelectedBeforeFiles([]);
          setSelectedAfterFiles([]);
      }
      pauseTimer();
      if (storageKey) {
          const sessionData = {
              pausedTime: time,
              checklistState: checkedItems,
              beforePhotos: beforePhotos,
              afterPhotos: afterPhotos,
              timestamp: Date.now()
          };
          localStorage.setItem(storageKey, JSON.stringify(sessionData));
      }
      onClose();
  };

  const handleCompleteJob = async () => {
    if (!allChecked || !jobId || finishInFlight.current) return;
    finishInFlight.current = true;
    pauseTimer();
    let uploadedThisAttempt = 0;
    let completed = false;

    const uploadSelected = async (files, folder, setSelected, setUploaded) => {
      for (const file of files) {
        const uploaded = await uploadJobDocument(folder, file);
        setUploaded?.((current) => [...current, { ...uploaded, name: uploaded.fileName, filePath: uploaded.path }]);
        setSelected((current) => current.filter((selectedFile) => selectedFile !== file));
        uploadedThisAttempt++;
        uploadedCount.current++;
      }
    };

    try {
      if (selectedBeforeFiles.length || selectedAfterFiles.length) {
        setFinishStep('Uploading photos...');
        await uploadSelected(selectedBeforeFiles, `${jobId}/before-photos`, setSelectedBeforeFiles, setBeforePhotos);
        await uploadSelected(selectedAfterFiles, `${jobId}/after-photos`, setSelectedAfterFiles, setAfterPhotos);
      }

      setFinishStep('Completing job...');
      completed = await onComplete(formatTime(time), uploadedCount.current);
      if (completed) clearSession();
    } catch (error) {
      toast({
        title: 'File Upload Failed',
        description: `${uploadedThisAttempt ? `${uploadedThisAttempt} file(s) uploaded. ` : ''}${error.message} Click Complete Job to retry the remaining files.`,
        variant: 'destructive',
      });
    } finally {
      if (uploadedThisAttempt && !completed) {
        try {
          await onDocumentsChange?.();
        } catch (error) {
          console.error('Could not refresh job documents after upload:', error);
        }
      }
      finishInFlight.current = false;
      setFinishStep(null);
    }
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
      <DialogContent className="sm:max-w-md max-h-[95vh] w-[95vw] sm:w-full flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Timer className="h-5 w-5 text-primary" />
            Job In Progress
          </DialogTitle>
          <div className="flex flex-col gap-1 mt-1">
            <div className="text-xs text-muted-foreground flex items-center">
                <span className="font-mono font-medium text-foreground mr-2">{job.job_ref_id}</span>
            </div>
            <div className="text-xs flex items-center text-gray-600">
                <User className="w-3 h-3 mr-1" /> {job.user_name || 'Client'}
            </div>
            <div className="text-xs flex items-center text-gray-500">
                <MapPin className="w-3 h-3 mr-1" /> {addressString}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
            {/* Compact Horizontal Timer Bar */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 border border-slate-100 dark:border-slate-800 mb-3 shrink-0">
                <div className="flex justify-between items-end mb-1">
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 rounded-full"
                            onClick={handleToggleTimer}
                            disabled={Boolean(finishStep)}
                            title={isRunning ? "Pause" : "Resume"}
                        >
                            {isRunning ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current ml-0.5" />}
                        </Button>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {isRunning ? "Running" : "Paused"}
                        </span>
                    </div>
                    <span className="text-2xl font-bold font-mono text-primary tabular-nums tracking-tight leading-none">
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

            <JobFilePicker title="Before Photos" inputId="before-photos-upload" accept="image/*"
              selected={selectedBeforeFiles} setSelected={setSelectedBeforeFiles} uploaded={beforePhotos}
              onRemoveUploaded={(index) => setBeforePhotos((current) => current.filter((_, i) => i !== index))} busy={Boolean(finishStep)} />

            {/* Checklist */}
            <div className="mb-2 min-h-[80px] rounded-lg border border-gray-100 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
                 <div className="mb-1 border-b border-gray-50 p-2 dark:border-slate-800">
                    <h4 className="font-medium text-xs text-gray-900 dark:text-gray-100 flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                        Checklist
                    </h4>
                 </div>
                 <div className="space-y-0.5 p-2 pt-0">
                    {checklistItems.map((item) => (
                    <div key={item.id} className="flex items-start space-x-2 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <Checkbox 
                            id={item.id} 
                            checked={!!checkedItems[item.id]}
                            onCheckedChange={() => toggleCheck(item.id)}
                            disabled={Boolean(finishStep)}
                            className="mt-0.5 border-gray-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 h-3 w-3"
                        />
                        <div className="grid gap-0.5 leading-none">
                            <Label 
                                htmlFor={item.id}
                                className={cn(
                                    "text-xs font-medium leading-none cursor-pointer transition-colors",
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

            <JobFilePicker title="After Photos" inputId="after-photos-upload" accept="image/*"
              selected={selectedAfterFiles} setSelected={setSelectedAfterFiles} uploaded={afterPhotos}
              onRemoveUploaded={(index) => setAfterPhotos((current) => current.filter((_, i) => i !== index))} busy={Boolean(finishStep)} />
            <p className="text-xs text-muted-foreground">Selected photos upload when you click Complete Job.</p>
        </div>

        <DialogFooter className="shrink-0 p-4 pt-2 sm:justify-between flex-col sm:flex-row gap-2 bg-white dark:bg-slate-950 z-20">
            {!allChecked && (
                 <div className="flex items-center justify-center text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded w-full sm:w-auto">
                    <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                    Complete checklist
                </div>
            )}
          <Button 
            type="button" 
            onClick={handleCompleteJob}
            disabled={!allChecked || Boolean(finishStep)}
            aria-busy={Boolean(finishStep)}
            className={cn(
                "w-full sm:w-auto sm:ml-auto transition-all duration-300 font-semibold text-sm h-8",
                allChecked ? "bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200" : ""
            )}
          >
            {finishStep || (allChecked ? "Complete Job" : "Finish Checklist")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StartJobModal;
