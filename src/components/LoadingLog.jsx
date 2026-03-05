import React from 'react';
import { useLoading } from '@/contexts/LoadingContext';
import { motion, AnimatePresence } from 'framer-motion';

const LoadingLog = () => {
  const { loadingMessages } = useLoading();

  if (loadingMessages.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col items-end space-y-2 pointer-events-none">
      <AnimatePresence>
        {loadingMessages.map((msg) => (
          <motion.div
            key={msg.id}
            layout // Added layout for smoother reordering if messages change order (though unlikely here)
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 30, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.2 }}
            className="bg-slate-800/90 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-md shadow-lg border border-slate-700"
          >
            {msg.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LoadingLog;