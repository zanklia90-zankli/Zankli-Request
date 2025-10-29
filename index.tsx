
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { RequestProvider } from './context/RequestContext';
import { VendorProvider } from './context/VendorContext';
import { StoreProvider } from './context/StoreContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <RequestProvider>
        <VendorProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </VendorProvider>
      </RequestProvider>
    </AuthProvider>
  </React.StrictMode>
);