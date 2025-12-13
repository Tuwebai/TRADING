/**
 * Features Section
 * Key benefits in a clean grid layout
 */

import { 
  BarChart3, 
  Shield, 
  User, 
  Lightbulb,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: BarChart3,
    title: 'Registra tu Rendimiento',
    description: 'Monitorea tus operaciones con análisis detallados, curvas de equity y métricas de rendimiento para entender qué funciona.',
  },
  {
    icon: Shield,
    title: 'Gestión de Riesgo',
    description: 'Panel de riesgo en tiempo real con seguimiento de drawdown, límites de exposición y alertas automáticas para proteger tu capital.',
  },
  {
    icon: User,
    title: 'Vista de Carrera',
    description: 'Perfil estilo videogame mostrando tu progresión a largo plazo, rachas, logros y línea de tiempo de trading.',
  },
  {
    icon: Lightbulb,
    title: 'Insights Automáticos',
    description: 'Análisis inteligente que detecta patrones, advierte sobre sobreoperación y sugiere horarios óptimos de trading.',
  },
  {
    icon: TrendingUp,
    title: 'Análisis Avanzado',
    description: 'Heatmaps, análisis temporal, distribución de PnL y análisis profundos de tu comportamiento de trading.',
  },
  {
    icon: Calendar,
    title: 'Calendario de Trading',
    description: 'Calendario visual mostrando rendimiento diario, mejores/peores días y patrones de distribución semanal.',
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 px-6 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Todo Lo Que Necesitas para
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {' '}Destacar
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Funcionalidades poderosas diseñadas para traders serios que quieren mejorar su rendimiento de forma sistemática.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="p-8 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

