import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** When true, hides the cancel button (use for info-only alerts) */
  alertOnly?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  alertOnly = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={open} onClose={onCancel} title={title} size="sm">
      <div className="space-y-5">
        {destructive && (
          <div className="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">Esta ação não pode ser desfeita.</p>
          </div>
        )}
        {description && (
          <p className="text-sm text-text-secondary">{description}</p>
        )}
        <div className={cn('flex gap-3', alertOnly ? 'justify-end' : 'justify-end')}>
          {!alertOnly && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
          )}
          <Button
            type="button"
            loading={loading}
            onClick={onConfirm}
            className={cn(
              destructive && 'bg-red-600 hover:bg-red-700 border-red-600 text-white focus:ring-red-500'
            )}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
