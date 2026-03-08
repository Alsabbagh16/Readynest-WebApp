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
import { Timer, CheckCircle2, AlertCircle, MapPin, User, Pause, Play, UploadCloud, Image, Trash2, X } from 'lucide-react';
import { useJobTimer } from '@/hooks/useJobTimer';
import { cn } from '@/lib/utils';
import { uploadJobDocument } from '@/lib/storage/jobStorage';
import { useToast } from '@/hooks/use-toast';

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

const StartJobModal = ({ isOpen, onClose, onComplete, job }) => {
  const [checkedItems, setCheckedItems] = useState({});
  const { time, isRunning, isPaused, startTimer, pauseTimer, resumeTimer, resetTimer, formatTime, setElapsedTime } = useJobTimer();
  const { toast } = useToast();
  
  // Image upload states
  const [beforePhotos, setBeforePhotos] = useState([]);
  const [afterPhotos, setAfterPhotos] = useState([]);
  const [selectedBeforeFiles, setSelectedBeforeFiles] = useState([]);
  const [selectedAfterFiles, setSelectedAfterFiles] = useState([]);
  const [isUploadingBefore, setIsUploadingBefore] = useState(false);
  const [isUploadingAfter, setIsUploadingAfter] = useState(false);
  
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

  // Image upload handlers
  const handleBeforeFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    setSelectedBeforeFiles(files);
  };

  const handleAfterFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    setSelectedAfterFiles(files);
  };

  const removeSelectedBeforeFile = (index) => {
    setSelectedBeforeFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeSelectedAfterFile = (index) => {
    setSelectedAfterFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadBeforePhotos = async () => {
    if (selectedBeforeFiles.length === 0) return;
    
    setIsUploadingBefore(true);
    try {
      const uploadedPhotos = [];
      for (const file of selectedBeforeFiles) {
        const uploadedFile = await uploadJobDocument(`${jobId}/before-photos`, file);
        uploadedPhotos.push({
          name: file.name,
          path: uploadedFile.path,
          publicURL: uploadedFile.publicURL,
          filePath: uploadedFile.path
        });
      }
      setBeforePhotos(prev => [...prev, ...uploadedPhotos]);
      setSelectedBeforeFiles([]);
      toast({ title: "Before Photos Uploaded", description: `${uploadedPhotos.length} photo(s) uploaded successfully.` });
    } catch (error) {
      console.error("Error uploading before photos:", error);
      toast({ title: "Upload Error", description: `Could not upload before photos: ${error.message}`, variant: "destructive" });
    } finally {
      setIsUploadingBefore(false);
    }
  };

  const uploadAfterPhotos = async () => {
    if (selectedAfterFiles.length === 0) return;
    
    setIsUploadingAfter(true);
    try {
      const uploadedPhotos = [];
      for (const file of selectedAfterFiles) {
        const uploadedFile = await uploadJobDocument(`${jobId}/after-photos`, file);
        uploadedPhotos.push({
          name: file.name,
          path: uploadedFile.path,
          publicURL: uploadedFile.publicURL,
          filePath: uploadedFile.path
        });
      }
      setAfterPhotos(prev => [...prev, ...uploadedPhotos]);
      setSelectedAfterFiles([]);
      toast({ title: "After Photos Uploaded", description: `${uploadedPhotos.length} photo(s) uploaded successfully.` });
    } catch (error) {
      console.error("Error uploading after photos:", error);
      toast({ title: "Upload Error", description: `Could not upload after photos: ${error.message}`, variant: "destructive" });
    } finally {
      setIsUploadingAfter(false);
    }
  };

  const removeBeforePhoto = (index) => {
    setBeforePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeAfterPhoto = (index) => {
    setAfterPhotos(prev => prev.filter((_, i) => i !== index));
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

        <div className="px-4 py-2 flex-1 overflow-hidden flex flex-col">
            {/* Compact Horizontal Timer Bar */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 border border-slate-100 dark:border-slate-800 mb-3 shrink-0">
                <div className="flex justify-between items-end mb-1">
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 rounded-full"
                            onClick={handleToggleTimer}
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

            {/* Upload Before Photos Section */}
            <div className="bg-white dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg p-2 mb-2">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-xs text-gray-900 dark:text-gray-100 flex items-center">
                        <Image className="w-3 h-3 mr-1 text-blue-600" />
                        Before Photos
                    </h4>
                    {beforePhotos.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{beforePhotos.length}</span>
                    )}
                </div>
                
                <div className="space-y-2">
                    <div className="flex gap-1">
                        <input
                            id="before-photos-upload"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleBeforeFileSelect}
                            className="hidden"
                            disabled={isUploadingBefore}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('before-photos-upload')?.click()}
                            disabled={isUploadingBefore}
                            className="h-6 text-xs px-2"
                        >
                            <UploadCloud className="mr-1 h-3 w-3" /> Select
                        </Button>
                        {selectedBeforeFiles.length > 0 && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={uploadBeforePhotos}
                                disabled={isUploadingBefore || selectedBeforeFiles.length === 0}
                                className="h-6 text-xs px-2"
                            >
                                {isUploadingBefore ? '...' : `Upload ${selectedBeforeFiles.length}`}
                            </Button>
                        )}
                    </div>

                    {selectedBeforeFiles.length > 0 && (
                        <div className="p-1 border rounded bg-slate-50 dark:bg-slate-800/30">
                            <div className="space-y-0.5">
                                {selectedBeforeFiles.map((file, index) => (
                                    <div key={index} className="flex justify-between items-center text-[10px] dark:text-slate-400">
                                        <span className="truncate max-w-[120px]">{file.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeSelectedBeforeFile(index)}
                                            disabled={isUploadingBefore}
                                            className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                                        >
                                            <X className="h-2 w-2" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {beforePhotos.length > 0 && (
                        <div className="p-1 border rounded bg-blue-50 dark:bg-blue-900/20">
                            <div className="space-y-0.5">
                                {beforePhotos.map((photo, index) => (
                                    <div key={index} className="flex justify-between items-center text-[10px] dark:text-blue-400">
                                        <span className="truncate max-w-[120px]">{photo.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeBeforePhoto(index)}
                                            className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="h-2 w-2" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable Checklist */}
            <div className="flex-1 overflow-y-auto max-h-[280px] min-h-[80px] bg-white dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg p-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700">
                 <div className="p-2 sticky top-0 bg-white dark:bg-slate-950 z-10 border-b border-gray-50 dark:border-slate-800 mb-1">
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

            {/* Upload After Photos Section */}
            <div className="bg-white dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg p-2 mb-2">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-xs text-gray-900 dark:text-gray-100 flex items-center">
                        <Image className="w-3 h-3 mr-1 text-green-600" />
                        After Photos
                    </h4>
                    {afterPhotos.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{afterPhotos.length}</span>
                    )}
                </div>
                
                <div className="space-y-2">
                    <div className="flex gap-1">
                        <input
                            id="after-photos-upload"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleAfterFileSelect}
                            className="hidden"
                            disabled={isUploadingAfter}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('after-photos-upload')?.click()}
                            disabled={isUploadingAfter}
                            className="h-6 text-xs px-2"
                        >
                            <UploadCloud className="mr-1 h-3 w-3" /> Select
                        </Button>
                        {selectedAfterFiles.length > 0 && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={uploadAfterPhotos}
                                disabled={isUploadingAfter || selectedAfterFiles.length === 0}
                                className="h-6 text-xs px-2"
                            >
                                {isUploadingAfter ? '...' : `Upload ${selectedAfterFiles.length}`}
                            </Button>
                        )}
                    </div>

                    {selectedAfterFiles.length > 0 && (
                        <div className="p-1 border rounded bg-slate-50 dark:bg-slate-800/30">
                            <div className="space-y-0.5">
                                {selectedAfterFiles.map((file, index) => (
                                    <div key={index} className="flex justify-between items-center text-[10px] dark:text-slate-400">
                                        <span className="truncate max-w-[120px]">{file.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeSelectedAfterFile(index)}
                                            disabled={isUploadingAfter}
                                            className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                                        >
                                            <X className="h-2 w-2" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {afterPhotos.length > 0 && (
                        <div className="p-1 border rounded bg-green-50 dark:bg-green-900/20">
                            <div className="space-y-0.5">
                                {afterPhotos.map((photo, index) => (
                                    <div key={index} className="flex justify-between items-center text-[10px] dark:text-green-400">
                                        <span className="truncate max-w-[120px]">{photo.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeAfterPhoto(index)}
                                            className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="h-2 w-2" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <DialogFooter className="p-4 pt-2 sm:justify-between flex-col sm:flex-row gap-2 bg-white dark:bg-slate-950 z-20">
            {!allChecked && (
                 <div className="flex items-center justify-center text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded w-full sm:w-auto">
                    <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                    Complete checklist
                </div>
            )}
          <Button 
            type="button" 
            onClick={handleCompleteJob}
            disabled={!allChecked}
            className={cn(
                "w-full sm:w-auto sm:ml-auto transition-all duration-300 font-semibold text-sm h-8",
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