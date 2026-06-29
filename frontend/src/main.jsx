import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes/AppRoutes';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#fff',
              color: '#1B2A4A',
              border: '1px solid #DDE3ED',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 4px 20px rgba(0,30,80,0.12)',
            },
            success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
