import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  CheckSquare, 
  BarChart3, 
  Settings,
  Calculator,
  Target,
  Menu,
  X,
  LineChart,
  Calendar,
  User,
  Lightbulb,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipe } from '@/hooks/useSwipe';
import { useAuthStore } from '@/store/authStore';
import { Logo } from '@/components/landing/Logo';

const navigation = [
  { name: 'Panel', href: '/', icon: LayoutDashboard },
  { name: 'Operaciones', href: '/trades', icon: TrendingUp },
  { name: 'Gestión de Capital', href: '/capital', icon: Calculator },
  { name: 'Objetivos', href: '/goals', icon: Target },
  { name: 'Rutinas', href: '/routines', icon: CheckSquare },
  { name: 'Análisis', href: '/analytics', icon: BarChart3 },
  { name: 'Gráfico', href: '/grafico', icon: LineChart },
  { name: 'Calendario', href: '/calendar', icon: Calendar },
  { name: 'Carrera', href: '/career', icon: User },
  { name: 'Insights', href: '/insights', icon: Lightbulb },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onMobileToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
    // Cerrar menú móvil si está abierto
    if (isMobileOpen) {
      onMobileToggle();
    }
  };

  // Gestos táctiles para cerrar el menú
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (isMobileOpen) {
        onMobileToggle();
      }
    },
  });

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    if (isMobileOpen) {
      onMobileToggle();
    }
  }, [location.pathname]);

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8">
            <Logo />
          </div>
          <h1 className="text-xl font-bold">ALGO TSX</h1>
        </div>
        <button
          onClick={onMobileToggle}
          className="md:hidden p-2 rounded-md hover:bg-accent transition-colors"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => {
                // Cerrar menú móvil al hacer clic en un enlace
                if (window.innerWidth < 768) {
                  onMobileToggle();
                }
              }}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors touch-manipulation',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* User info and logout */}
      <div className="border-t p-4 space-y-2">
        {user && (
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">
            {user}
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors touch-manipulation',
            'text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20'
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Botón hamburger para móviles */}
      <button
        onClick={onMobileToggle}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-card border shadow-lg hover:bg-accent transition-colors touch-manipulation"
        aria-label="Abrir menú"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Overlay para móviles */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={onMobileToggle}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed left-0 top-0 h-screen w-64 flex-col border-r bg-card z-50 md:relative md:z-auto md:flex"
              {...swipeHandlers}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar desktop (siempre visible) */}
      <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-card">
        {sidebarContent}
      </aside>
    </>
  );
};

