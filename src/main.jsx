import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { DialogHost } from './components/dialogs.jsx';

// Fiche d'urgence ouverte par le QR : page publique, hors de l'application connectée.
const EmergencyPublic=React.lazy(()=>import('./public/EmergencyPublic.jsx'));
const router=createBrowserRouter([
  {path:'/urgence/:token',element:<React.Suspense fallback={null}><EmergencyPublic/></React.Suspense>},
  {path:'*',element:<App/>},
]);
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary fullPage>
      <RouterProvider router={router}/>
      <DialogHost/>
    </ErrorBoundary>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => console.error('Service worker registration failed:', error));
  });
}
