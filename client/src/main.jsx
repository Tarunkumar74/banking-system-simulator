import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ErrorBoundary } from './components/ui.jsx';
import './index.css';
ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary><BrowserRouter><AuthProvider><App /><Toaster position="top-right" /></AuthProvider></BrowserRouter></ErrorBoundary>
);
