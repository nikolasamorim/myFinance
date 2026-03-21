import React, { useState } from 'react';
import { Upload, Wallet, type LucideIcon } from 'lucide-react';
import * as Lucide from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ImportacaoSection } from '../workspace/ImportacaoSection';
import { useAccounts } from '../../hooks/useAccounts';
import { useReconciliationSummary } from '../../hooks/useReconciliation';
import type { Account } from '@myfinance/shared';

interface ReconciliationAccountGridProps {
  onSelectAccount: (accountId: string) => void;
}

export function ReconciliationAccountGrid({ onSelectAccount }: ReconciliationAccountGridProps) {
  const { data: accounts } = useAccounts({ type: 'bank', search: '' });
  const { data: summary } = useReconciliationSummary();
  const [ofxModalAccountId, setOfxModalAccountId] = useState<string | null>(null);

  const bankAccounts = (accounts ?? []).filter((a: Account) => !a.parent_id);
  const summaryMap = new Map((summary ?? []).map((s) => [s.account_id, s.pending_count]));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Conciliação Bancária</h1>
        <p className="text-sm text-text-muted mt-1">
          Selecione uma conta para visualizar e gerenciar as conciliações
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {bankAccounts.map((account: Account) => {
          const pending = summaryMap.get(account.id) ?? 0;
          const iconName = account.icon;
          const lucideIcons = Lucide as Record<string, LucideIcon>;
          const IconComp: LucideIcon =
            iconName && lucideIcons[iconName] ? lucideIcons[iconName] : Wallet;

          return (
            <div
              key={account.id}
              className="bg-bg-page border border-border rounded-xl p-4 flex flex-col gap-3"
            >
              {/* Account info */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: account.color || '#6366f1' }}
                >
                  <IconComp className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text-primary truncate text-sm">{account.title}</p>
                  <p className="text-xs text-text-muted">Agência / Conta</p>
                </div>
              </div>

              {/* Action button */}
              {pending > 0 ? (
                <button
                  onClick={() => onSelectAccount(account.id)}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {pending} Conciliações Pendentes
                </button>
              ) : (
                <button
                  onClick={() => setOfxModalAccountId(account.id)}
                  className="w-full py-2 px-3 bg-accent hover:opacity-90 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Importar OFX
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* OFX Import Modal */}
      <Modal
        isOpen={!!ofxModalAccountId}
        onClose={() => setOfxModalAccountId(null)}
        title="Importar Extrato OFX"
        size="xl"
      >
        <ImportacaoSection initialAccountId={ofxModalAccountId ?? undefined} />
      </Modal>
    </div>
  );
}
