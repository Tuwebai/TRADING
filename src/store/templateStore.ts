/**
 * Trade template store using Zustand
 * Manages trade templates for quick creation
 */

import { create } from 'zustand';
import type { TradeTemplate, TradeFormData } from '@/types/Trading';
import { templateStorage } from '@/lib/storage';
import { generateId } from '@/lib/utils';

interface TemplateStore {
  templates: TradeTemplate[];
  isLoading: boolean;
  
  // Actions
  loadTemplates: () => void;
  addTemplate: (name: string, description: string | undefined, formData: TradeFormData) => void;
  updateTemplate: (id: string, name: string, description: string | undefined, formData: TradeFormData) => void;
  deleteTemplate: (id: string) => void;
  getTemplate: (id: string) => TradeTemplate | null;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  isLoading: false,

  loadTemplates: () => {
    set({ isLoading: true });
    try {
      const templates = templateStorage.getAll();
      set({ templates, isLoading: false });
    } catch (error) {
      console.error('Error loading templates:', error);
      set({ isLoading: false });
    }
  },

  addTemplate: (name: string, description: string | undefined, formData: TradeFormData) => {
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
    templateStorage.add(newTemplate);
  },

  updateTemplate: (id: string, name: string, description: string | undefined, formData: TradeFormData) => {
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
    templateStorage.update(id, updatedTemplate);
  },

  deleteTemplate: (id: string) => {
    const templates = get().templates.filter(t => t.id !== id);
    set({ templates });
    templateStorage.delete(id);
  },

  getTemplate: (id: string) => {
    return get().templates.find(t => t.id === id) || null;
  },
}));

