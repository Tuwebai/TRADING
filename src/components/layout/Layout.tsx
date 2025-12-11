import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { RiskPanel } from '@/components/risk-panel/RiskPanel';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      <main className="flex-1 overflow-y-auto md:ml-0 landscape:md:overflow-y-auto pr-[60px] transition-all duration-300">
        <div className="container mx-auto p-4 md:p-6 lg:p-8 pt-16 md:pt-6 landscape:md:pt-6 landscape:md:p-4">
          <div className="landscape-optimize">
            {children}
          </div>
        </div>
      </main>
      <RiskPanel />
    </div>
  );
};

