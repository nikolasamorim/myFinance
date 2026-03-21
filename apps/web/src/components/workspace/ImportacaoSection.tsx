import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, ChevronRight, ArrowLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../lib/utils';
import { parseOFX } from '../../lib/ofxParser';
import type { OFXParseResult } from '../../lib/ofxParser';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { transactionService } from '../../services/transaction.service';

// ─── Tipos internos ──────────────────────────────────────────────────────────

interface ImportRow {
  fitid: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string | null;
  skip: boolean;
}

type WizardStep = 1 | 2 | 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CREDIT_TYPES = new Set(['CREDIT', 'INT', 'DIV', 'DEP', 'DIRECTDEP']);

function inferType(trntype: string, amount: number): 'income' | 'expense' {
  if (CREDIT_TYPES.has(trntype)) return 'income';
  if (amount > 0) return 'income';
  return 'expense';
}

function ofxResultToRows(result: OFXParseResult): ImportRow[] {
  return result.transactions.map((t) => ({
    fitid: t.fitid,
    date: t.dtposted,
    description: t.memo,
    amount: Math.abs(t.trnamt),
    type: inferType(t.trntype, t.trnamt),
    categoryId: null,
    skip: false,
  }));
}

// ─── Indicador de etapas ──────────────────────────────────────────────────────

function StepIndicator({ current }: { current: WizardStep }) {
  const steps = [
    { n: 1, label: 'Arquivo' },
    { n: 2, label: 'Revisar' },
    { n: 3, label: 'Confirmar' },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                current === s.n
                  ? 'bg-accent text-white'
                  : current > s.n
                  ? 'bg-accent/20 text-accent'
                  : 'bg-bg-elevated text-text-muted'
              )}
            >
              {current > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
            </div>
            <span
              className={cn(
                'text-[10px] font-medium',
                current === s.n ? 'text-text-primary' : 'text-text-muted'
              )}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'w-12 h-px mb-4 mx-1 transition-colors',
                current > s.n ? 'bg-accent/40' : 'bg-border'
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Etapa 1: Upload ──────────────────────────────────────────────────────────

interface StepUploadProps {
  onParsed: (rows: ImportRow[], fileName: string) => void;
}

function StepUpload({ onParsed }: StepUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.ofx')) {
      setError('Selecione um arquivo com extensão .ofx');
      return;
    }
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseOFX(text);
        if (result.transactions.length === 0) {
          setError('Nenhuma transação encontrada no arquivo. Verifique se o arquivo OFX é válido.');
          setLoading(false);
          return;
        }
        onParsed(ofxResultToRows(result), file.name);
      } catch {
        setError('Erro ao processar o arquivo. Certifique-se de que é um arquivo OFX válido.');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Erro ao ler o arquivo.');
      setLoading(false);
    };
    // Bancos brasileiros usam windows-1252
    reader.readAsText(file, 'windows-1252');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
          dragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50 hover:bg-bg-elevated/50'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {loading ? (
          <Loader2 className="w-10 h-10 text-accent mx-auto animate-spin" />
        ) : (
          <Upload className="w-10 h-10 text-text-muted mx-auto mb-3" />
        )}
        <p className="text-sm font-medium text-text-primary mt-2">
          {loading ? 'Processando arquivo...' : 'Arraste seu arquivo OFX aqui'}
        </p>
        <p className="text-xs text-text-muted mt-1">ou clique para selecionar</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".ofx,.OFX"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      <p className="text-xs text-text-muted text-center">
        Suporta arquivos OFX exportados pelos principais bancos brasileiros.
      </p>
    </div>
  );
}

// ─── Etapa 2: Revisar ─────────────────────────────────────────────────────────

interface StepReviewProps {
  rows: ImportRow[];
  fileName: string;
  onRowsChange: (rows: ImportRow[]) => void;
  selectedAccountId: string;
  onAccountChange: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

function StepReview({
  rows,
  fileName,
  onRowsChange,
  selectedAccountId,
  onAccountChange,
  onBack,
  onNext,
}: StepReviewProps) {
  const { data: accounts } = useAccounts({ type: 'all', search: '' });
  const { data: categories } = useCategories({ type: 'all', search: '' });

  const bankAccounts = (accounts ?? []).filter((a) => a.type === 'bank');

  const updateRow = (index: number, patch: Partial<ImportRow>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onRowsChange(next);
  };

  const activeCount = rows.filter((r) => !r.skip).length;

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <FileText className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{fileName}</span>
        <span className="flex-shrink-0 px-2 py-0.5 bg-bg-elevated rounded-full text-xs font-medium text-text-secondary">
          {rows.length} transações
        </span>
      </div>

      {/* Seletor de conta */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Conta bancária <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedAccountId}
          onChange={(e) => onAccountChange(e.target.value)}
          className="w-full bg-bg-page text-text-primary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Selecione uma conta...</option>
          {bankAccounts.map((a) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
      </div>

      {/* Aviso de duplicatas */}
      <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          Verifique se as transações listadas já foram cadastradas para evitar duplicatas.
        </p>
      </div>

      {/* Tabela */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="sticky top-0 bg-bg-surface border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-text-muted w-20">Data</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-text-muted">Descrição</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-text-muted w-28">Valor</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-text-muted w-28">Tipo</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-text-muted w-36">Categoria</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-text-muted w-16">Ignorar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, i) => (
                  <tr
                    key={row.fitid}
                    className={cn(
                      'transition-colors',
                      row.skip ? 'opacity-40' : 'hover:bg-bg-elevated/40'
                    )}
                  >
                    <td className="px-3 py-1.5">
                      <input
                        type="date"
                        value={row.date}
                        disabled={row.skip}
                        onChange={(e) => updateRow(i, { date: e.target.value })}
                        className="w-full bg-transparent text-text-primary text-xs border border-transparent focus:border-border focus:bg-bg-page rounded px-1 py-0.5 focus:outline-none disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={row.description}
                        disabled={row.skip}
                        onChange={(e) => updateRow(i, { description: e.target.value })}
                        className="w-full bg-transparent text-text-primary text-xs border border-transparent focus:border-border focus:bg-bg-page rounded px-1 py-0.5 focus:outline-none disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.amount}
                        disabled={row.skip}
                        onChange={(e) => updateRow(i, { amount: Math.abs(parseFloat(e.target.value) || 0) })}
                        className={cn(
                          'w-full bg-transparent text-xs font-medium tabular-nums text-right border border-transparent focus:border-border focus:bg-bg-page rounded px-1 py-0.5 focus:outline-none disabled:cursor-not-allowed',
                          row.type === 'income' ? 'text-green-500' : 'text-red-500'
                        )}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={row.type}
                        disabled={row.skip}
                        onChange={(e) => updateRow(i, { type: e.target.value as 'income' | 'expense', categoryId: null })}
                        className="w-full bg-bg-page text-text-primary text-xs border border-border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="income">Receita</option>
                        <option value="expense">Despesa</option>
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={row.categoryId ?? ''}
                        disabled={row.skip}
                        onChange={(e) => updateRow(i, { categoryId: e.target.value || null })}
                        className="w-full bg-bg-page text-text-primary text-xs border border-border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">Sem categoria</option>
                        {(categories ?? [])
                          .filter((c) => c.category_type === row.type || c.category_type === 'income' || c.category_type === 'expense')
                          .map((c) => (
                            <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                          ))}
                      </select>
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={row.skip}
                        onChange={(e) => updateRow(i, { skip: e.target.checked })}
                        className="accent-accent w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">{activeCount} selecionadas</span>
          <button
            onClick={onNext}
            disabled={!selectedAccountId || activeCount === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            Continuar
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Etapa 3: Confirmar ───────────────────────────────────────────────────────

interface StepConfirmProps {
  rows: ImportRow[];
  selectedAccountId: string;
  onBack: () => void;
  onReset: () => void;
}

function StepConfirm({ rows, selectedAccountId, onBack, onReset }: StepConfirmProps) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: accounts } = useAccounts({ type: 'all', search: '' });

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toImport = rows.filter((r) => !r.skip);
  const skipped = rows.length - toImport.length;
  const totalIncome = toImport.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const totalExpense = toImport.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const accountName = accounts?.find((a) => a.id === selectedAccountId)?.title ?? selectedAccountId;

  const handleImport = async () => {
    if (!currentWorkspace || !user) return;
    setImporting(true);
    setError(null);
    setProgress(0);

    let count = 0;
    try {
      for (const row of toImport) {
        await transactionService.createTransaction({
          transaction_workspace_id: currentWorkspace.workspace_id,
          transaction_type: row.type,
          transaction_description: row.description,
          transaction_amount: row.amount,
          transaction_date: row.date,
          transaction_status: row.type === 'income' ? 'received' : 'paid',
          transaction_bank_id: selectedAccountId,
          transaction_category_id: row.categoryId,
          transaction_origin: 'import',
          transaction_created_by_user_id: user.id,
          transaction_payment_method: null,
          transaction_cost_center_id: null,
          transaction_card_id: null,
          transaction_person_id: null,
          transaction_recurrence: null,
          recurring: false,
          recurrence_id: null,
          recurrence_rule_id: null,
          recurrence_sequence: null,
          recurrence_instance_date: null,
          parent_recurrence_rule_id: null,
          is_recurrence_generated: false,
          generated_at: null,
          version: null,
          installment_group_id: null,
          installment_number: null,
          installment_total: null,
        });
        count++;
        setProgress(count);
      }

      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setImportedCount(count);
    } catch (e) {
      console.error(e);
      setError(`Erro ao importar: ${(e as Error).message}. ${count} transações foram importadas antes do erro.`);
    } finally {
      setImporting(false);
    }
  };

  // Estado de sucesso
  if (importedCount !== null) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <div>
          <p className="text-lg font-semibold text-text-primary">{importedCount} transações importadas</p>
          <p className="text-sm text-text-muted mt-1">
            As transações já estão disponíveis no Dashboard.
          </p>
        </div>
        <button
          onClick={onReset}
          className="mt-2 px-4 py-2 text-sm font-medium text-accent border border-accent rounded-lg hover:bg-accent/5 transition-colors"
        >
          Importar outro arquivo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="bg-bg-surface rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">Resumo da importação</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-text-muted text-xs">Conta</p>
            <p className="font-medium text-text-primary">{accountName}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Transações a importar</p>
            <p className="font-medium text-text-primary">{toImport.length}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Total receitas</p>
            <p className="font-medium text-green-500">{formatCurrency(totalIncome)}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Total despesas</p>
            <p className="font-medium text-red-500">{formatCurrency(totalExpense)}</p>
          </div>
          {skipped > 0 && (
            <div>
              <p className="text-text-muted text-xs">Ignoradas</p>
              <p className="font-medium text-text-muted">{skipped}</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {importing && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-text-muted">
            <span>Importando...</span>
            <span>{progress} / {toImport.length}</span>
          </div>
          <div className="w-full bg-bg-elevated rounded-full h-1.5">
            <div
              className="bg-accent h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(progress / toImport.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          disabled={importing}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <button
          onClick={handleImport}
          disabled={importing || toImport.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {importing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Importando...
            </>
          ) : (
            `Importar ${toImport.length} transações`
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ImportacaoSection() {
  const [step, setStep] = useState<WizardStep>(1);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const handleParsed = (parsedRows: ImportRow[], name: string) => {
    setRows(parsedRows);
    setFileName(name);
    setStep(2);
  };

  const handleReset = () => {
    setStep(1);
    setRows([]);
    setFileName('');
    setSelectedAccountId('');
  };

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Importação</h2>
        <p className="text-sm text-text-muted mt-1">Importe transações a partir de um extrato bancário em formato OFX.</p>
      </div>

      <div className="pt-2">
        <StepIndicator current={step} />

        {step === 1 && <StepUpload onParsed={handleParsed} />}
        {step === 2 && (
          <StepReview
            rows={rows}
            fileName={fileName}
            onRowsChange={setRows}
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
            onBack={handleReset}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepConfirm
            rows={rows}
            selectedAccountId={selectedAccountId}
            onBack={() => setStep(2)}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}
