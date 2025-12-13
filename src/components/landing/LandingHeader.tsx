/**
 * Landing Page Header
 * Fixed header with logo and auth buttons
 */

import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { AuthModal } from './AuthModal';
import { Logo } from './Logo';

export const LandingHeader = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleLoginClick = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      setAuthMode('login');
      setAuthModalOpen(true);
    }
  };

  const handleRegisterClick = () => {
    setAuthMode('register');
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
    navigate('/dashboard');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10">
                <Logo />
              </div>
              <span className="text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                ALGO TSX
              </span>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={handleLoginClick}
                className="flex items-center gap-2 hover:bg-accent/50 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Iniciar Sesión
              </Button>
              <Button
                onClick={handleRegisterClick}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Registrarse
              </Button>
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={(mode) => setAuthMode(mode)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};

