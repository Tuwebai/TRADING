/**
 * Post-Mortems Page
 * Página dedicada para visualizar y gestionar análisis post-mortem de objetivos fallidos
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useGoalsStore } from '@/store/goalsStore';
import { goalPostMortemsStorage, type GoalPostMortem } from '@/lib/storage';
import { formatDate, formatCurrency } from '@/lib/utils';
import { FileText, Search, Filter, Download, AlertTriangle, Calendar, Target, TrendingDown, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { exportPostMortemsToPDF } from '@/lib/goalExport';

export const PostMortemsPage = () => {
  const { goals, loadGoals } = useGoalsStore();
  const [postMortems, setPostMortems] = useState<GoalPostMortem[]>([]);
  const [filteredPostMortems, setFilteredPostMortems] = useState<GoalPostMortem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGoalId, setFilterGoalId] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'week' | 'month' | '3months'>('all');
  const [selectedPostMortem, setSelectedPostMortem] = useState<GoalPostMortem | null>(null);

  useEffect(() => {
    loadGoals();
    loadPostMortems();
  }, [loadGoals]);

  const loadPostMortems = () => {
    const all = goalPostMortemsStorage.getAll();
    // Remove duplicates (same goalId and same date)
    const unique = new Map<string, GoalPostMortem>();
    all.forEach(pm => {
      const key = `${pm.goalId}_${new Date(pm.failedAt).toISOString().split('T')[0]}`;
      if (!unique.has(key)) {
        unique.set(key, pm);
      }
    });
    setPostMortems(Array.from(unique.values()));
  };

  // Filter and search post-mortems
  useEffect(() => {
    let filtered = [...postMortems];

    // Filter by goal
    if (filterGoalId !== 'all') {
      filtered = filtered.filter(pm => pm.goalId === filterGoalId);
    }

    // Filter by date range
    if (filterDateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      switch (filterDateRange) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
      }
      filtered = filtered.filter(pm => new Date(pm.failedAt) >= cutoffDate);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(pm => 
        pm.goalTitle.toLowerCase().includes(query) ||
        pm.cause.toLowerCase().includes(query) ||
        pm.notes?.toLowerCase().includes(query) ||
        pm.historicalPatterns.some(p => p.toLowerCase().includes(query))
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime());

    setFilteredPostMortems(filtered);
  }, [postMortems, filterGoalId, filterDateRange, searchQuery]);

  const handleExport = () => {
    exportPostMortemsToPDF(filteredPostMortems, goals);
  };

  const getGoalById = (goalId: string) => {
    return goals.find(g => g.id === goalId);
  };

  const getSeverityColor = (postMortem: GoalPostMortem) => {
    const goal = getGoalById(postMortem.goalId);
    if (!goal) return 'bg-gray-500';
    
    if (goal.isBinding) return 'bg-red-500';
    if ((goal.failureCount || 0) > 2) return 'bg-orange-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Análisis Post-Mortem
          </h1>
          <p className="text-muted-foreground mt-2">
            Análisis detallado de objetivos fallidos para identificar patrones y mejorar
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar en post-mortems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Goal Filter */}
            <Select
              value={filterGoalId}
              onValueChange={setFilterGoalId}
            >
              <option value="all">Todos los Objetivos</option>
              {goals.map(goal => (
                <option key={goal.id} value={goal.id}>
                  {goal.type} - {goal.period}
                </option>
              ))}
            </Select>

            {/* Date Range Filter */}
            <Select
              value={filterDateRange}
              onValueChange={(value) => setFilterDateRange(value as any)}
            >
              <option value="all">Todo el Tiempo</option>
              <option value="week">Última Semana</option>
              <option value="month">Último Mes</option>
              <option value="3months">Últimos 3 Meses</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Post-Mortems</p>
                <p className="text-2xl font-bold">{postMortems.length}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Filtrados</p>
                <p className="text-2xl font-bold">{filteredPostMortems.length}</p>
              </div>
              <Filter className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Objetivos Únicos</p>
                <p className="text-2xl font-bold">
                  {new Set(postMortems.map(pm => pm.goalId)).size}
                </p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Este Mes</p>
                <p className="text-2xl font-bold">
                  {postMortems.filter(pm => {
                    const pmDate = new Date(pm.failedAt);
                    const now = new Date();
                    return pmDate.getMonth() === now.getMonth() && 
                           pmDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Post-Mortems List */}
      {filteredPostMortems.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {postMortems.length === 0 
                ? 'No hay análisis post-mortem aún. Se generarán automáticamente cuando los objetivos fallen.'
                : 'No se encontraron post-mortems con los filtros seleccionados.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPostMortems.map((postMortem) => {
            const goal = getGoalById(postMortem.goalId);
            return (
              <motion.div
                key={postMortem.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedPostMortem(postMortem)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={getSeverityColor(postMortem)}>
                            {goal?.isBinding ? 'Vinculante' : 'Crítico'}
                          </Badge>
                          <h3 className="text-lg font-semibold">{postMortem.goalTitle}</h3>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(postMortem.failedAt)}
                          </span>
                          {goal && (
                            <span className="flex items-center gap-1">
                              <TrendingDown className="w-4 h-4" />
                              Fallos: {goal.failureCount || 0}
                            </span>
                          )}
                        </div>

                        <p className="text-sm mb-3 line-clamp-2">{postMortem.cause}</p>

                        {postMortem.relatedRuleViolations.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="text-xs text-muted-foreground">Violaciones:</span>
                            {postMortem.relatedRuleViolations.slice(0, 3).map((violation, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {violation}
                              </Badge>
                            ))}
                            {postMortem.relatedRuleViolations.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{postMortem.relatedRuleViolations.length - 3} más
                              </Badge>
                            )}
                          </div>
                        )}

                        {postMortem.historicalPatterns.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1">Patrones históricos:</p>
                            <ul className="text-xs space-y-1">
                              {postMortem.historicalPatterns.slice(0, 2).map((pattern, idx) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <span className="text-muted-foreground">•</span>
                                  <span>{pattern}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPostMortem(postMortem);
                        }}
                      >
                        Ver Detalles
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPostMortem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Detalles del Post-Mortem</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPostMortem(null)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Objetivo</h3>
                  <p className="text-muted-foreground">{selectedPostMortem.goalTitle}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Fecha de Falla</h3>
                  <p className="text-muted-foreground">{formatDate(selectedPostMortem.failedAt)}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Causa Identificada</h3>
                  <p className="text-muted-foreground">{selectedPostMortem.cause}</p>
                </div>

                {selectedPostMortem.relatedRuleViolations.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Reglas Violadas</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPostMortem.relatedRuleViolations.map((violation, idx) => (
                        <Badge key={idx} variant="outline">
                          {violation}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPostMortem.historicalPatterns.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Patrones Históricos</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {selectedPostMortem.historicalPatterns.map((pattern, idx) => (
                        <li key={idx}>{pattern}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedPostMortem.notes && (
                  <div>
                    <h3 className="font-semibold mb-2">Notas Adicionales</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedPostMortem.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Creado: {formatDate(selectedPostMortem.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

