import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Datasets } from './pages/Datasets';
import { DatasetDetails } from './pages/DatasetDetails';
import { UploadData } from './pages/UploadData';
import { Reconciliation } from './pages/Reconciliation';
import { Findings } from './pages/Findings';
import { ReviewCenter } from './pages/ReviewCenter';
import { Reports } from './pages/Reports';
import { AuditHistory } from './pages/AuditHistory';
import { Settings } from './pages/Settings';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Application Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/datasets" element={<Datasets />} />
          <Route path="/datasets/:id" element={<DatasetDetails />} />
          <Route path="/upload" element={<UploadData />} />
          <Route path="/reconciliation" element={<Reconciliation />} />
          <Route path="/findings" element={<Findings />} />
          <Route path="/reviews" element={<ReviewCenter />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/audit-history" element={<AuditHistory />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;