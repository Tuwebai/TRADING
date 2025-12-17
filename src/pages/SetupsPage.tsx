import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useSetupStore } from '@/store/setupStore';
import { useTradeStore } from '@/store/tradeStore';
import { formatCurrency } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';
import type { TradingSetup } from '@/types/Trading';
import { motion } from 'framer-motion';

export const SetupsPage = () => {
  const { setups, loadSetups, addSetup, updateSetup, deleteSetup } = useSetupStore();
  const { trades, loadTrades } = useTradeStore();
  const { settings } = useSettingsStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState<TradingSetup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    imageUrl: '',
    rules: [''],
    entryCriteria: '',
    exitCriteria: '',
    riskManagement: '',
    tags: [] as string[],
  });

  useEffect(() => {
    loadSetups();
    loadTrades();
  }, [loadSetups, loadTrades]);

  // Update stats for all setups when trades change
  useEffect(() => {
    const { updateSetupStats } = useSetupStore.getState();
    setups.forEach(setup => {
      updateSetupStats(setup.id, trades);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades]);

  const handleAdd = () => {
    setEditingSetup(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      imageUrl: '',
      rules: [''],
      entryCriteria: '',
      exitCriteria: '',
      riskManagement: '',
      tags: [],
    });
    setIsModalOpen(true);
  };

  const handleEdit = (setup: TradingSetup) => {
    setEditingSetup(setup);
    setFormData({
      name: setup.name,
      description: setup.description,
      category: setup.category,
      imageUrl: setup.imageUrl || '',
      rules: setup.rules.length > 0 ? setup.rules : [''],
      entryCriteria: setup.entryCriteria,
      exitCriteria: setup.exitCriteria,
      riskManagement: setup.riskManagement,
      tags: setup.tags,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este setup?')) {
      deleteSetup(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSetup) {
      updateSetup(editingSetup.id, {
        ...formData,
        rules: formData.rules.filter(r => r.trim() !== ''),
      });
    } else {
      addSetup({
        ...formData,
        rules: formData.rules.filter(r => r.trim() !== ''),
        tags: formData.tags,
      });
    }
    
    setIsModalOpen(false);
    setEditingSetup(null);
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Setups de Trading</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu catálogo de setups y analiza su rendimiento
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Setup
        </Button>
      </div>

      {setups.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              No hay setups guardados. Crea tu primer setup para comenzar.
            </p>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Setup
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {setups.map((setup) => {
            const stats = setup.stats || {
              totalTrades: 0,
              winRate: 0,
              avgPnl: 0,
              profitFactor: 0,
            };
            
            return (
              <motion.div
                key={setup.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{setup.name}</CardTitle>
                        {setup.category && (
                          <p className="text-sm text-muted-foreground mt-1">{setup.category}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(setup)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(setup.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    {setup.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {setup.description}
                      </p>
                    )}

                    {stats.totalTrades > 0 && (
                      <div className="mt-auto pt-4 border-t space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Operaciones</p>
                            <p className="font-semibold">{stats.totalTrades}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Win Rate</p>
                            <p className="font-semibold">{stats.winRate.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">PnL Promedio</p>
                            <p className={`font-semibold ${stats.avgPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                              {formatCurrency(stats.avgPnl, settings.baseCurrency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Profit Factor</p>
                            <p className="font-semibold">{stats.profitFactor.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {stats.totalTrades === 0 && (
                      <p className="text-xs text-muted-foreground mt-auto pt-4 border-t">
                        Sin operaciones registradas con este setup
                      </p>
                    )}

                    {setup.tags && setup.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {setup.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSetup(null);
        }}
        title={editingSetup ? 'Editar Setup' : 'Nuevo Setup'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre del Setup *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="category">Categoría</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="ej: Breakout, Reversal, Trend Following"
            />
          </div>

          <div>
            <Label htmlFor="entryCriteria">Criterios de Entrada *</Label>
            <Textarea
              id="entryCriteria"
              value={formData.entryCriteria}
              onChange={(e) => setFormData({ ...formData, entryCriteria: e.target.value })}
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="exitCriteria">Criterios de Salida</Label>
            <Textarea
              id="exitCriteria"
              value={formData.exitCriteria}
              onChange={(e) => setFormData({ ...formData, exitCriteria: e.target.value })}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="riskManagement">Gestión de Riesgo</Label>
            <Textarea
              id="riskManagement"
              value={formData.riskManagement}
              onChange={(e) => setFormData({ ...formData, riskManagement: e.target.value })}
              rows={2}
            />
          </div>

          <div>
            <Label>Reglas del Setup</Label>
            <div className="space-y-2">
              {formData.rules.map((rule, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={rule}
                    onChange={(e) => {
                      const newRules = [...formData.rules];
                      newRules[index] = e.target.value;
                      setFormData({ ...formData, rules: newRules });
                    }}
                    placeholder={`Regla ${index + 1}`}
                  />
                  {formData.rules.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newRules = formData.rules.filter((_, i) => i !== index);
                        setFormData({ ...formData, rules: newRules });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, rules: [...formData.rules, ''] })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Regla
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingSetup(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingSetup ? 'Actualizar' : 'Crear'} Setup
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

