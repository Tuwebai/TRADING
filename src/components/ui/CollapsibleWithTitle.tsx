import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './Collapsible';
import { cn } from '@/lib/utils';

interface CollapsibleWithTitleProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component for Collapsible that includes title and description
 * This maintains compatibility with existing code that uses title/description props
 */
export const CollapsibleWithTitle: React.FC<CollapsibleWithTitleProps> = ({
  title,
  description,
  defaultOpen = false,
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn('border rounded-lg overflow-hidden', className)}>
      <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
        <div className="text-left">
          <h3 className="font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="p-4 border-t bg-card">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

