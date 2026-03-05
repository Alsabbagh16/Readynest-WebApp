import React, { createContext, useState, useContext, useCallback } from 'react';

let messageIdCounter = 0;

const LoadingContext = createContext({
  loadingMessages: [],
  addLoadingMessage: () => { return ''; },
  removeLoadingMessage: () => {},
  clearLoadingMessages: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }) => {
  const [loadingMessages, setLoadingMessages] = useState([]);

  const addLoadingMessage = useCallback((message) => {
    const id = `loading-msg-${messageIdCounter++}`;
    // console.log(`[LoadingContext] Adding message: ID=${id}, Text=${message}`);
    setLoadingMessages((prevMessages) => {
      const newMessages = [...prevMessages, { id, text: message }];
      // console.log('[LoadingContext] Current messages after add:', newMessages.map(m => m.text));
      return newMessages;
    });
    return id;
  }, []);

  const removeLoadingMessage = useCallback((id) => {
    // console.log(`[LoadingContext] Removing message: ID=${id}`);
    setLoadingMessages((prevMessages) => {
      const newMessages = prevMessages.filter((msg) => msg.id !== id);
      // console.log('[LoadingContext] Current messages after remove:', newMessages.map(m => m.text));
      return newMessages;
    });
  }, []);

  const clearLoadingMessages = useCallback(() => {
    // console.log('[LoadingContext] Clearing all messages.');
    setLoadingMessages([]);
  }, []);

  return (
    <LoadingContext.Provider value={{ loadingMessages, addLoadingMessage, removeLoadingMessage, clearLoadingMessages }}>
      {children}
    </LoadingContext.Provider>
  );
};