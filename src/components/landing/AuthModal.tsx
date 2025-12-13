/**
 * Authentication Modal
 * Reusable modal for login and register
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { AlertCircle, X, LogIn, UserPlus } from 'lucide-react';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'login' | 'register';
  onSwitchMode: (mode: 'login' | 'register') => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  onClose,
  mode,
  onSwitchMode,
  onSuccess,
}) => {
  const { login, register, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (open) {
      setEmail('');
      setPassword('');
      setError(null);
    }
  }, [open, mode]);

  // Auto close if authenticated
  useEffect(() => {
    if (isAuthenticated && open) {
      onSuccess();
    }
  }, [isAuthenticated, open, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = mode === 'register' 
        ? await register(email, password)
        : await login(email, password);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || `Error al ${mode === 'register' ? 'registrarse' : 'iniciar sesión'}`);
      }
    } catch (err) {
      setError('Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              {mode === 'login' ? (
                <LogIn className="h-6 w-6 text-primary" />
              ) : (
                <UserPlus className="h-6 w-6 text-primary" />
              )}
              <h2 className="text-2xl font-bold">
                {mode === 'register' ? 'Crear Cuenta' : 'Iniciar Sesión'}
              </h2>
            </div>
            <p className="text-muted-foreground">
              {mode === 'register' 
                ? 'Crea tu cuenta para comenzar a registrar tus operaciones'
                : 'Ingresa tus credenciales para acceder'
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth-password">Contraseña</Label>
              <Input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={mode === 'register' ? 6 : undefined}
              />
              {mode === 'register' && (
                <p className="text-xs text-muted-foreground">
                  Mínimo 6 caracteres
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading 
                ? 'Procesando...' 
                : mode === 'register' 
                  ? 'Crear Cuenta' 
                  : 'Iniciar Sesión'
              }
            </Button>

            {/* Switch mode */}
            <div className="text-center pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {mode === 'register' ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    onSwitchMode(mode === 'register' ? 'login' : 'register');
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  {mode === 'register' ? 'Inicia sesión' : 'Regístrate'}
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

