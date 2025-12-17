/**
 * Goal Export to PDF
 * Generates professional PDF reports for goals
 */

import jsPDF from 'jspdf';
import type { TradingGoal, Trade, Settings } from '@/types/Trading';
import { calculateAnalytics } from './calculations';
import { goalPostMortemsStorage } from './storage';

const periodLabels: Record<TradingGoal['period'], string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
};

const typeLabels: Record<TradingGoal['type'], string> = {
  pnl: 'PnL',
  winRate: 'Tasa de Éxito',
  numTrades: 'Número de Operaciones',
};

/**
 * Export goals report to PDF
 */
export function exportGoalsToPDF(
  goals: TradingGoal[],
  trades: Trade[],
  _settings: Settings
): void {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = 30;

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Reporte de Objetivos y Disciplina', margin, yPosition);
  yPosition += 10;

  // Date
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, margin, yPosition);
  pdf.setTextColor(0, 0, 0);
  yPosition += 15;

  // Active Goals Section
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Objetivos Activos', margin, yPosition);
  yPosition += 10;

  const activeGoals = goals.filter(g => {
    const now = new Date();
    return now >= new Date(g.startDate) && now <= new Date(g.endDate) && !g.completed;
  });

  if (activeGoals.length === 0) {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text('No hay objetivos activos.', margin, yPosition);
    yPosition += 10;
  } else {
    activeGoals.forEach((goal, index) => {
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. ${typeLabels[goal.type]} - ${periodLabels[goal.period]}`, margin, yPosition);
      yPosition += 7;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
      pdf.text(`   Objetivo: ${goal.target} | Actual: ${goal.current.toFixed(2)} | Progreso: ${progress.toFixed(1)}%`, margin, yPosition);
      yPosition += 6;

      if (goal.isPrimary) {
        pdf.setTextColor(0, 128, 0);
        pdf.text('   [OBJETIVO PRIMARIO - Foco del Día]', margin, yPosition);
        pdf.setTextColor(0, 0, 0);
        yPosition += 6;
      }

      if (goal.isBinding) {
        pdf.setTextColor(200, 0, 0);
        pdf.text('   [OBJETIVO VINCULANTE - Con consecuencias]', margin, yPosition);
        pdf.setTextColor(0, 0, 0);
        yPosition += 6;
      }

      yPosition += 5;
    });
  }

  yPosition += 5;

  // Completed Goals Section
  if (yPosition > pageHeight - 60) {
    pdf.addPage();
    yPosition = margin;
  }

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Objetivos Completados', margin, yPosition);
  yPosition += 10;

  const completedGoals = goals.filter(g => g.completed);
  if (completedGoals.length === 0) {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text('No hay objetivos completados.', margin, yPosition);
    yPosition += 10;
  } else {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    completedGoals.forEach((goal, index) => {
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.text(`${index + 1}. ${typeLabels[goal.type]} - ${periodLabels[goal.period]}: ${goal.target} (Alcanzado: ${goal.current.toFixed(2)})`, margin, yPosition);
      yPosition += 6;
    });
  }

  yPosition += 10;

  // Discipline Level Section
  if (yPosition > pageHeight - 80) {
    pdf.addPage();
    yPosition = margin;
  }

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Nivel de Disciplina', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  const totalGoals = goals.length;
  const completedCount = completedGoals.length;
  const completionRate = totalGoals > 0 ? (completedCount / totalGoals) * 100 : 0;

  // Calculate failure rate
  const failedGoals = goals.filter(g => {
    const isMaxGoal = g.type === 'numTrades';
    const hasFailed = isMaxGoal ? g.current > g.target : g.current < g.target;
    return hasFailed && !g.completed;
  }).length;
  const failureRate = totalGoals > 0 ? (failedGoals / totalGoals) * 100 : 0;

  pdf.text(`   Tasa de cumplimiento: ${completionRate.toFixed(1)}%`, margin, yPosition);
  yPosition += 6;
  pdf.text(`   Tasa de fallo: ${failureRate.toFixed(1)}%`, margin, yPosition);
  yPosition += 6;
  pdf.text(`   Objetivos vinculantes activos: ${goals.filter(g => g.isBinding && !g.completed).length}`, margin, yPosition);
  yPosition += 10;

  // Critical Failures Section
  const criticalFailures = goals.filter(g => g.failureCount && g.failureCount > 2);
  if (criticalFailures.length > 0) {
    if (yPosition > pageHeight - 80) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(200, 0, 0);
    pdf.text('Fallos Críticos', margin, yPosition);
    pdf.setTextColor(0, 0, 0);
    yPosition += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    criticalFailures.forEach((goal, index) => {
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.text(`${index + 1}. ${typeLabels[goal.type]} - ${periodLabels[goal.period]}: ${goal.failureCount} fallos`, margin, yPosition);
      yPosition += 6;
    });
    yPosition += 5;
  }

  // Relationship with Rules Section
  if (yPosition > pageHeight - 80) {
    pdf.addPage();
    yPosition = margin;
  }

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Relación con Reglas', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  const bindingGoalsWithConstraints = goals.filter(g => g.isBinding && g.constraintType && g.constraintType !== 'none');
  pdf.text(`   Objetivos que afectan reglas: ${bindingGoalsWithConstraints.length}`, margin, yPosition);
  yPosition += 6;

  const analytics = calculateAnalytics(trades.filter(t => t.status === 'closed'));
  pdf.text(`   Win rate histórico: ${analytics.winRate.toFixed(1)}%`, margin, yPosition);
  yPosition += 6;
  pdf.text(`   Total de operaciones: ${trades.length}`, margin, yPosition);
  yPosition += 10;

  // Post-Mortems Section
  const postMortems = goalPostMortemsStorage.getAll();
  if (postMortems.length > 0) {
    if (yPosition > pageHeight - 100) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Análisis Post-Mortem', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    // Show last 5 post-mortems
    const recentPostMortems = postMortems
      .sort((a, b) => new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime())
      .slice(0, 5);

    recentPostMortems.forEach((pm, index) => {
      if (yPosition > pageHeight - 70) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. ${pm.goalTitle}`, margin, yPosition);
      yPosition += 6;

      pdf.setFont('helvetica', 'normal');
      pdf.text(`   Fecha: ${new Date(pm.failedAt).toLocaleDateString('es-ES')}`, margin, yPosition);
      yPosition += 5;

      const causeLines = pdf.splitTextToSize(`   Causa: ${pm.cause}`, contentWidth - 10);
      causeLines.forEach((line: string) => {
        pdf.text(line, margin + 5, yPosition);
        yPosition += 5;
      });

      if (pm.relatedRuleViolations.length > 0) {
        pdf.text(`   Reglas violadas: ${pm.relatedRuleViolations.join(', ')}`, margin + 5, yPosition);
        yPosition += 5;
      }

      yPosition += 5;
    });
  }

  // Process Section (not just PnL)
  if (yPosition > pageHeight - 80) {
    pdf.addPage();
    yPosition = margin;
  }

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Proceso y Métricas', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Este reporte prioriza el proceso sobre los resultados.', margin, yPosition);
  yPosition += 6;
  pdf.text('Las métricas de disciplina y cumplimiento de objetivos son indicadores', margin, yPosition);
  yPosition += 6;
  pdf.text('más relevantes que el PnL a corto plazo para el desarrollo profesional.', margin, yPosition);

  // Save PDF
  pdf.save(`reporte_objetivos_${new Date().toISOString().split('T')[0]}.pdf`);
}

