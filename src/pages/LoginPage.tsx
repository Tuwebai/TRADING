/**
 * Login Page
 * Simple login form for personal use
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login, register } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Check if this is first-time setup (no users exist)
  useEffect(() => {
    const storedUsers = localStorage.getItem('auth_users');
    if (!storedUsers || JSON.parse(storedUsers).length === 0) {
      setIsRegisterMode(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = isRegisterMode 
        ? await register(email, password)
        : await login(email, password);

      if (result.success) {
        // Navigation will happen automatically via useEffect
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isRegisterMode ? 'Configuración Inicial' : 'Iniciar Sesión'}
          </CardTitle>
          <CardDescription className="text-center">
            {isRegisterMode 
              ? 'Crea tu cuenta para comenzar'
              : 'Ingresa tus credenciales para acceder'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
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
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={isRegisterMode ? 6 : undefined}
              />
              {isRegisterMode && (
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
                : isRegisterMode 
                  ? 'Crear Cuenta' 
                  : 'Iniciar Sesión'
              }
            </Button>

            {!isRegisterMode && (
              <p className="text-xs text-center text-muted-foreground">
                Sistema de uso personal
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

