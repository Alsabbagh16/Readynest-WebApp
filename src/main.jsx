import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { BookingProvider } from '@/contexts/BookingContext'; // Import BookingProvider
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <BrowserRouter>
      <LoadingProvider>
        <AuthProvider>
          <AdminAuthProvider>
            <BookingProvider> {/* Wrap App with BookingProvider */}
              <App />
            </BookingProvider>
          </AdminAuthProvider>
        </AuthProvider>
      </LoadingProvider>
    </BrowserRouter>
  </>
);