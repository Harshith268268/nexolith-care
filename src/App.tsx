import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { FamilyProvider } from './lib/FamilyContext';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { FamilyMembers } from './pages/FamilyMembers';
import { ReportsLibrary } from './pages/ReportsLibrary';
import { UploadFlow } from './pages/UploadFlow';
import { ReportDetail } from './pages/ReportDetail';
import { Trends } from './pages/Trends';
import { AIPredictions } from './pages/AIPredictions';
import { Alerts } from './pages/Alerts';
import { Settings } from './pages/Settings';
import { Assistant } from './pages/Assistant';

export function App() {
  return (
    <BrowserRouter>
      <FamilyProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/auth" element={<Auth />} />

          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/family" element={<FamilyMembers />} />
            <Route path="/reports" element={<ReportsLibrary />} />
            <Route path="/reports/upload" element={<UploadFlow />} />
            <Route path="/reports/:id" element={<ReportDetail />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/predictions" element={<AIPredictions />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </FamilyProvider>
    </BrowserRouter>);

}