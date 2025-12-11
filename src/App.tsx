import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
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
import { initializeStorage } from '@/lib/storage';
import { useSettingsStore } from '@/store/settingsStore';
import { applyTheme } from '@/lib/themes';
import { PageTransition } from '@/components/ui/PageTransition';

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><DashboardPage /></PageTransition>} />
        <Route path="/trades" element={<PageTransition><TradesPage /></PageTransition>} />
        <Route path="/capital" element={<PageTransition><CapitalManagementPage /></PageTransition>} />
        <Route path="/goals" element={<PageTransition><GoalsPage /></PageTransition>} />
        <Route path="/routines" element={<PageTransition><RoutinesPage /></PageTransition>} />
        <Route path="/analytics" element={<PageTransition><AnalyticsPage /></PageTransition>} />
        <Route path="/grafico" element={<PageTransition><GraficoPage /></PageTransition>} />
        <Route path="/calendar" element={<PageTransition><CalendarPage /></PageTransition>} />
        <Route path="/career" element={<PageTransition><CareerPage /></PageTransition>} />
        <Route path="/insights" element={<PageTransition><InsightsPage /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const { settings, loadSettings } = useSettingsStore();

  useEffect(() => {
    // Initialize storage on app start
    initializeStorage();
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    // Apply theme when settings change
    if (settings.theme) {
      applyTheme(settings.theme, settings.customTheme);
    }
  }, [settings.theme, settings.customTheme]);

  return (
    <BrowserRouter>
      <Layout>
        <AppRoutes />
      </Layout>
    </BrowserRouter>
  );
}

export default App;

