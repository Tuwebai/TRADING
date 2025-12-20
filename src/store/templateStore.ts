/**
 * Trade template store using Zustand
 * Manages trade templates for quick creation
 */

import { create } from 'zustand';
import type { TradeTemplate, TradeFormData } from '@/types/Trading';
// templateStorage not used - using storageAdapter instead
import { storageAdapter } from '@/lib/storageAdapter';
import { generateId } from '@/lib/utils';

interface TemplateStore {
  templates: TradeTemplate[];
  isLoading: boolean;
  
  // Actions
  loadTemplates: () => Promise<void>;
  addTemplate: (name: string, description: string | undefined, formData: TradeFormData) => Promise<void>;
  updateTemplate: (id: string, name: string, description: string | undefined, formData: TradeFormData) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  getTemplate: (id: string) => TradeTemplate | null;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  isLoading: false,

  loadTemplates: async () => {
    set({ isLoading: true });
    try {
      const templates = await storageAdapter.getAllTemplates();
      set({ templates, isLoading: false });
    } catch (error) {
      // Solo loggear errores reales, no errores de autenticación
      if (error instanceof Error && !error.message.includes('no autenticado')) {
        console.error('Error loading templates:', error);
      }
      set({ templates: [], isLoading: false });
    }
  },

  addTemplate: async (name: string, description: string | undefined, formData: TradeFormData) => {
    const now = new Date().toISOString();
    const newTemplate: TradeTemplate = {
      id: generateId(),
      name,
      description,
      formData,
      createdAt: now,
      updatedAt: now,
    };

    const templates = [...get().templates, newTemplate];
    set({ templates });
    await storageAdapter.saveTemplate(newTemplate);
  },

  updateTemplate: async (id: string, name: string, description: string | undefined, formData: TradeFormData) => {
    const templates = get().templates;
    const templateIndex = templates.findIndex(t => t.id === id);
    
    if (templateIndex === -1) return;

    const updatedTemplate: TradeTemplate = {
      ...templates[templateIndex],
      name,
      description,
      formData,
      updatedAt: new Date().toISOString(),
    };

    const newTemplates = [...templates];
    newTemplates[templateIndex] = updatedTemplate;
    
    set({ templates: newTemplates });
    await storageAdapter.saveTemplate(updatedTemplate);
  },

  deleteTemplate: async (id: string) => {
    const templates = get().templates.filter(t => t.id !== id);
    set({ templates });
    await storageAdapter.deleteTemplate(id);
  },

  getTemplate: (id: string) => {
    return get().templates.find(t => t.id === id) || null;
  },
}));

