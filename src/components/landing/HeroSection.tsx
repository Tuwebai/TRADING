/**
 * Hero Section
 * Main headline with CTA and visual element
 */

import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeroSectionProps {
  onGetStarted?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else if (onGetStarted) {
      onGetStarted();
    } else {
      // Fallback: scroll to top where header buttons are
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-20 px-6 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary)/0.1),transparent_50%)]" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
              <TrendingUp className="h-4 w-4" />
              <span>Registro Profesional de Trading</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                Toma el Control de
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Tu Trading
              </span>
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
              Registra tu rendimiento, gestiona el riesgo y acelera tu carrera en trading con 
              análisis poderosos e insights automáticos—todo en un solo lugar.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="group flex items-center gap-2 text-lg px-8 py-6 h-auto"
              >
                Comenzar Ahora
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  const featuresSection = document.getElementById('features');
                  featuresSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-lg px-8 py-6 h-auto"
              >
                Conocer Más
              </Button>
            </div>

            {/* Stats preview */}
            <div className="flex gap-8 pt-8 border-t border-border/50">
              <div>
                <div className="text-2xl font-bold">100%</div>
                <div className="text-sm text-muted-foreground">Privacidad</div>
              </div>
              <div>
                <div className="text-2xl font-bold">Local</div>
                <div className="text-sm text-muted-foreground">Almacenamiento</div>
              </div>
              <div>
                <div className="text-2xl font-bold">Cero</div>
                <div className="text-sm text-muted-foreground">Configuración</div>
              </div>
            </div>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-card/30 backdrop-blur-sm">
              <img 
                src="/images/hero-image.png" 
                alt="Análisis de trading y visualización de datos profesional"
                className="w-full h-auto object-contain"
                loading="eager"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
