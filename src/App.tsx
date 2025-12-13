import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { LandingPage } from '@/pages/LandingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TradesPage } from '@/pages/TradesPage';
import { CapitalManagementPage } from '@/pages/CapitalManagementPage';
import { GoalsPage } from '@/pages/GoalsPage';
import { RoutinesPage } from '@/pages/RoutinesPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { GraficoPage } from '@/pages/GraficoPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { CareerPage } from '@/pages/CareerPage';
import { InsightsPage } from '@/pages/InsightsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { initializeStorage } from '@/lib/storage';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { applyTheme } from '@/lib/themes';
import { PageTransition } from '@/components/ui/PageTransition';

function AppRoutes() {
  const location = useLocation();

  return (
    <Routes location={location} key={location.pathname}>
      {/* Landing Page - only accessible when NOT authenticated */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Legacy login route - redirect to landing */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      
      {/* Protected routes - wrapped in Layout */}
      <Route path="/dashboard" element={
        <PrivateRoute>
          <Layout>
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}><DashboardPage /></PageTransition>
            </AnimatePresence>
          </Layout>
        </PrivateRoute>
      } />
        <Route path="/trades" element={
          <PrivateRoute>
            <Layout>
              <AnimatePresence mode="wait">
                <PageTransition key={location.pathname}><TradesPage /></PageTransition>
              </AnimatePresence>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/capital" element={
          <PrivateRoute>
            <Layout>
              <AnimatePresence mode="wait">
                <PageTransition key={location.pathname}><CapitalManagementPage /></PageTransition>
              </AnimatePresence>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/goals" element={
          <PrivateRoute>
            <Layout>
              <AnimatePresence mode="wait">
                <PageTransition key={location.pathname}><GoalsPage /></PageTransition>
              </AnimatePresence>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/routines" element={
          <PrivateRoute>
            <Layout>
              <AnimatePresence mode="wait">
                <PageTransition key={location.pathname}><RoutinesPage /></PageTransition>
              </AnimatePresence>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/analytics" element={
          <PrivateRoute>
            <Layout>
              <AnimatePresence mode="wait">
                <PageTransition key={location.pathname}><AnalyticsPage /></PageTransition>
              </AnimatePresence>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/grafico" element={
          <PrivateRoute>
            <Layout>
              <AnimatePresence mode="wait">
                <PageTransition key={location.pathname}><GraficoPage /></PageTransition>
              </AnimatePresence>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/calendar" element={
          <PrivateRoute>
            <Layout>
              <AnimatePresence mode="wait">
                <PageTransition key={location.pathname}><CalendarPage /></PageTransition>
              </AnimatePresence>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/career" element={
          <PrivateRoute>
            <Layout>
              <AnimatePresence mode="wait">
                <PageTransition key={location.pathname}><CareerPage /></PageTransition>
              </AnimatePresence>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/insights" element={
          <PrivateRoute>
            <Layout>
              <AnimatePresence mode="wait">
                <PageTransition key={location.pathname}><InsightsPage /></PageTransition>
              </AnimatePresence>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/settings" element={
          <PrivateRoute>
            <Layout>
              <AnimatePresence mode="wait">
                <PageTransition key={location.pathname}><SettingsPage /></PageTransition>
              </AnimatePresence>
            </Layout>
          </PrivateRoute>
        } />
        
        {/* Catch all - redirect to landing if not authenticated, otherwise to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}

function App() {
  const { settings, loadSettings } = useSettingsStore();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Initialize storage on app start
    initializeStorage();
    loadSettings();
    // Check authentication state
    checkAuth();
  }, [loadSettings, checkAuth]);

  useEffect(() => {
    // Apply theme when settings change
    if (settings.theme) {
      applyTheme(settings.theme, settings.customTheme);
    }
  }, [settings.theme, settings.customTheme]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;

