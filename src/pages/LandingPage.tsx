/**
 * Landing Page
 * Professional entry point to the application
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { AuthModal } from '@/components/landing/AuthModal';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // If authenticated, redirect to dashboard
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleGetStarted = () => {
    setAuthMode('register');
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
    navigate('/dashboard');
  };

  // Don't render if authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <HeroSection onGetStarted={handleGetStarted} />
        <FeaturesSection />
        
        {/* Footer */}
        <footer className="py-12 px-6 border-t border-border/50">
          <div className="container mx-auto max-w-6xl text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} ALGO TSX. Sistema de uso personal.</p>
          </div>
        </footer>
      </main>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={(mode) => setAuthMode(mode)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

