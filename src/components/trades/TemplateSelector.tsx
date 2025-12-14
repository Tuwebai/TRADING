import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Modal } from '@/components/ui/Modal';
import { Save, FileText, Trash2, X } from 'lucide-react';
import { useTemplateStore } from '@/store/templateStore';
import type { TradeFormData } from '@/types/Trading';

interface TemplateSelectorProps {
  onSelectTemplate: (formData: TradeFormData) => void;
  currentFormData?: TradeFormData;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ 
  onSelectTemplate,
  currentFormData 
}) => {
  const { templates, loadTemplates, addTemplate, deleteTemplate, getTemplate } = useTemplateStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !currentFormData) return;
    
    addTemplate(templateName, templateDescription || undefined, currentFormData);
    setTemplateName('');
    setTemplateDescription('');
    setIsSaveModalOpen(false);
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = getTemplate(templateId);
    if (template) {
      onSelectTemplate(template.formData);
      setIsModalOpen(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          title="Cargar plantilla"
        >
          <FileText className="h-4 w-4 mr-2" />
          Plantillas
        </Button>
        {currentFormData && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSaveModalOpen(true)}
            title="Guardar como plantilla"
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar Plantilla
          </Button>
        )}
      </div>

      {/* Modal para seleccionar plantilla */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Seleccionar Plantilla"
        size="md"
      >
        <div className="space-y-4">
          {templates.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay plantillas guardadas. Guarda una plantilla desde el formulario de operación.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border rounded-lg hover:bg-accent cursor-pointer flex items-start justify-between"
                  onClick={() => handleSelectTemplate(template.id)}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    )}
                    <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{template.formData.asset}</span>
                      <span>•</span>
                      <span>{template.formData.positionType === 'long' ? 'Largo' : 'Corto'}</span>
                      {template.formData.positionSize > 0 && (
                        <>
                          <span>•</span>
                          <span>Tamaño: {template.formData.positionSize}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('¿Eliminar esta plantilla?')) {
                        deleteTemplate(template.id);
                      }
                    }}
                    className="ml-2"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal para guardar plantilla */}
      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => {
          setIsSaveModalOpen(false);
          setTemplateName('');
          setTemplateDescription('');
        }}
        title="Guardar Plantilla"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="templateName">Nombre de la Plantilla *</Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Ej: Setup EURUSD Breakout"
              required
            />
          </div>
          <div>
            <Label htmlFor="templateDescription">Descripción (opcional)</Label>
            <Input
              id="templateDescription"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Describe cuándo usar esta plantilla"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsSaveModalOpen(false);
                setTemplateName('');
                setTemplateDescription('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!templateName.trim()}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

