import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TradingModeSelector } from './TradingModeSelector';
import { RiskPanel } from '@/components/risk-panel/RiskPanel';
import { useTradingMode } from '@/store/tradingModeStore';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { mode } = useTradingMode();

  // Apply global styles based on trading mode
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove previous mode classes
    root.classList.remove('mode-simulation', 'mode-demo', 'mode-live');
    
    // Add current mode class
    root.classList.add(`mode-${mode}`);
    
    // Apply border color to body based on mode
    if (mode === 'live') {
      document.body.style.borderTop = '3px solid rgb(239 68 68)'; // red-500
    } else if (mode === 'demo') {
      document.body.style.borderTop = '3px solid rgb(234 179 8)'; // yellow-500
    } else {
      document.body.style.borderTop = '3px solid rgb(59 130 246)'; // blue-500
    }
    
    return () => {
      root.classList.remove('mode-simulation', 'mode-demo', 'mode-live');
      document.body.style.borderTop = '';
    };
  }, [mode]);

  // Cerrar menú móvil al redimensionar a desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevenir scroll del body cuando el menú móvil está abierto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Trading Mode Selector */}
        <header className={`h-14 border-b bg-background flex items-center justify-between px-4 shrink-0 ${
          mode === 'live' ? 'border-t-4 border-t-red-500' :
          mode === 'demo' ? 'border-t-4 border-t-yellow-500' :
          'border-t-4 border-t-blue-500'
        }`}>
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Trading Journal</h1>
          </div>
          <TradingModeSelector />
        </header>
        <main className="flex-1 overflow-y-auto md:ml-0 landscape:md:overflow-y-auto pr-[60px] transition-all duration-300">
          <div className="container mx-auto p-4 md:p-6 lg:p-8 pt-4 md:pt-6 landscape:md:pt-6 landscape:md:p-4">
            <div className="landscape-optimize">
              {children}
            </div>
          </div>
        </main>
      </div>
      <RiskPanel />
    </div>
  );
};

