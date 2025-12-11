import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // Handle escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 landscape:md:p-4">
      <div className="fixed inset-0 bg-black/50 touch-manipulation" onClick={onClose} />
      <div className={cn(
        'relative z-50 w-full bg-background rounded-lg shadow-lg max-h-[95vh] md:max-h-[90vh] overflow-y-auto landscape:md:max-h-[85vh]',
        sizeClasses[size]
      )}>
        <div className="flex items-center justify-between p-4 md:p-6 border-b sticky top-0 bg-background z-10">
          <h2 className="text-lg md:text-xl font-semibold pr-2">{title}</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose} 
            aria-label="Cerrar modal"
            className="touch-manipulation flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
};

