import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { CitizenReportPage } from './pages/CitizenReportPage';
import { PublicTrackPage } from './pages/PublicTrackPage';
import { OfficerQueuePage } from './pages/OfficerQueuePage';
import { OfficerDetailPage } from './pages/OfficerDetailPage';
import { AdminOverviewPage } from './pages/AdminOverviewPage';
import { AdminAllComplaintsPage } from './pages/AdminAllComplaintsPage';
import { AdminRoutingRulesPage } from './pages/AdminRoutingRulesPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Citizen Portal */}
        <Route path="/" element={<CitizenReportPage />} />
        <Route path="/report" element={<CitizenReportPage />} />
        <Route path="/track" element={<PublicTrackPage />} />
        <Route path="/track/:id" element={<PublicTrackPage />} />

        {/* Officer / Admin Auth */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Officer Dashboard Views */}
        <Route
          path="/officer/queue"
          element={
            <DashboardLayout>
              <OfficerQueuePage />
            </DashboardLayout>
          }
        />
        <Route
          path="/officer/complaints/:id"
          element={
            <DashboardLayout>
              <OfficerDetailPage />
            </DashboardLayout>
          }
        />

        {/* Protected Admin Dashboard Views */}
        <Route
          path="/admin/overview"
          element={
            <DashboardLayout>
              <AdminOverviewPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/admin/complaints"
          element={
            <DashboardLayout>
              <AdminAllComplaintsPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/admin/routing-rules"
          element={
            <DashboardLayout>
              <AdminRoutingRulesPage />
            </DashboardLayout>
          }
        />

        {/* Default fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
