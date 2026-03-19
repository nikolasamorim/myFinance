import React from 'react';
import { AlertTriangle, Calendar, CalendarDays } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface EditScopeDialogProps {
  open: boolean;
  /** Data da transação que o usuário está editando no momento */
  transactionDate?: string;
  loading?: boolean;
  onConfirm: (fromDate: string) => void;
  onCancel: () => void;
}

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function EditScopeDialog({
  open,
  transactionDate,
  loading = false,
  onConfirm,
  onCancel,
}: EditScopeDialogProps) {
  const today = new Date().toISOString().split('T')[0];
  const showFromHere = transactionDate && transactionDate !== today;

  return (
    <Modal isOpen={open} onClose={onCancel} title="Salvar configuração da regra" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            Salvar irá regenerar lançamentos futuros não pagos. Escolha a partir de quando.
          </p>
        </div>

        <div className="space-y-2">
          {showFromHere && (
            <button
              type="button"
              onClick={() => onConfirm(transactionDate!)}
              disabled={loading}
              className="w-full text-left p-3.5 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-accent flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-text-primary">A partir desta ocorrência</div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    De {formatDateBR(transactionDate!)} em diante
                  </div>
                </div>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={() => onConfirm(today)}
            disabled={loading}
            className="w-full text-left p-3.5 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2.5">
              <CalendarDays className="w-4 h-4 text-accent flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-text-primary">Todas as futuras não pagas</div>
                <div className="text-xs text-text-secondary mt-0.5">
                  A partir de hoje ({formatDateBR(today)})
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="flex justify-end pt-1">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
