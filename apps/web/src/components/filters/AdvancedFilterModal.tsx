import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, RotateCcw, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useCostCenters } from '../../hooks/useCostCenters';
import { useCreditCards } from '../../hooks/useCreditCards';
import type { AdvancedFilters } from '../../types/filters';
import { DEFAULT_ADVANCED_FILTERS, countActiveFilters } from '../../types/filters';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdvancedFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'income' | 'expense';
  appliedFilters: AdvancedFilters;
  onApply: (filters: AdvancedFilters) => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
      {children}
    </p>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150',
        active
          ? 'bg-accent text-white border-accent'
          : 'bg-bg-surface text-text-secondary border-border hover:border-accent/50 hover:text-text-primary'
      )}
    >
      {label}
    </button>
  );
}

interface MultiChipGroupProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}

function MultiChipGroup({ options, selected, onChange }: MultiChipGroupProps) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          active={selected.includes(opt.value)}
          onClick={() => toggle(opt.value)}
        />
      ))}
    </div>
  );
}

interface SingleChipGroupProps {
  options: { value: string; label: string }[];
  selected: string;
  onChange: (value: string) => void;
}

function SingleChipGroup({ options, selected, onChange }: SingleChipGroupProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          active={selected === opt.value}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer group py-1">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-text-primary group-hover:text-text-primary">{label}</span>
        {description && (
          <p className="text-xs text-text-muted mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative flex-shrink-0 w-10 h-5.5 h-[22px] rounded-full transition-colors duration-200',
          checked ? 'bg-accent' : 'bg-border'
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-[22px]' : 'translate-x-[3px]'
          )}
        />
      </button>
    </label>
  );
}

// ─── Period options ───────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'semester', label: 'Semestre' },
  { value: 'year', label: 'Ano' },
  { value: 'custom', label: 'Personalizado' },
];

const STATUS_OPTIONS_INCOME = [
  { value: 'received', label: 'Recebida' },
  { value: 'pending', label: 'Pendente' },
  { value: 'overdue', label: 'Atrasada' },
  { value: 'scheduled', label: 'Agendada' },
  { value: 'canceled', label: 'Cancelada' },
];

const STATUS_OPTIONS_EXPENSE = [
  { value: 'paid', label: 'Paga' },
  { value: 'pending', label: 'Pendente' },
  { value: 'overdue', label: 'Atrasada' },
  { value: 'scheduled', label: 'Agendada' },
  { value: 'canceled', label: 'Cancelada' },
];

const TYPE_OPTIONS = [
  { value: 'fixa', label: 'Fixa' },
  { value: 'parcelada', label: 'Parcelada' },
  { value: 'avulsa', label: 'Avulsa' },
];

const VALUE_RANGE_CHIPS = [
  { label: 'Até R$500', min: '', max: '500' },
  { label: 'R$500–2k', min: '500', max: '2000' },
  { label: 'R$2k–5k', min: '2000', max: '5000' },
  { label: 'Acima R$5k', min: '5000', max: '' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdvancedFilterModal({
  isOpen,
  onClose,
  mode,
  appliedFilters,
  onApply,
}: AdvancedFilterModalProps) {
  const [draft, setDraft] = useState<AdvancedFilters>({ ...appliedFilters });
  const [dateError, setDateError] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Seed draft from appliedFilters each time modal opens
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      setDraft({ ...appliedFilters });
      setDateError('');
      setAdvancedOpen(false);
    } else {
      // Restore focus to the filter button when modal closes
      if (triggerRef.current && 'focus' in triggerRef.current) {
        (triggerRef.current as HTMLElement).focus();
      }
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus first element on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ESC key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Data hooks — enabled only when modal is open
  const { data: accounts } = useAccounts({ type: 'all', search: '' });
  const { data: categories } = useCategories({
    type: mode === 'income' ? 'income' : 'expense',
    search: '',
  });
  const { data: costCenters } = useCostCenters({ status: 'all', search: '' });
  const { data: creditCards } = useCreditCards({ search: '' });

  if (!isOpen) return null;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const set = <K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (dateError) setDateError('');
  };

  const isValueRangeChipActive = (min: string, max: string) =>
    draft.amount_min === min && draft.amount_max === max;

  const handleValueRangeChip = (min: string, max: string) => {
    if (isValueRangeChipActive(min, max)) {
      set('amount_min', '');
      set('amount_max', '');
    } else {
      setDraft((prev) => ({ ...prev, amount_min: min, amount_max: max }));
    }
  };

  const validate = (): boolean => {
    if (draft.period === 'custom') {
      if (!draft.date_start || !draft.date_end) {
        setDateError('Ambas as datas são obrigatórias');
        return false;
      }
      if (new Date(draft.date_start) > new Date(draft.date_end)) {
        setDateError('Data inicial deve ser anterior à data final');
        return false;
      }
    }
    return true;
  };

  const handleApply = () => {
    if (!validate()) return;
    onApply(draft);
  };

  const handleClear = () => {
    setDraft({ ...DEFAULT_ADVANCED_FILTERS });
    setDateError('');
  };

  const isDefault =
    JSON.stringify(draft) === JSON.stringify(DEFAULT_ADVANCED_FILTERS);

  const draftCount = countActiveFilters(draft);

  const statusOptions = mode === 'income' ? STATUS_OPTIONS_INCOME : STATUS_OPTIONS_EXPENSE;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-label="Filtros avançados"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full sm:max-w-lg flex flex-col',
          'bg-bg-page border border-border shadow-2xl',
          'rounded-t-2xl sm:rounded-xl rounded-b-none sm:rounded-b-xl',
          'max-h-[90vh] sm:max-h-[85vh]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border bg-bg-page rounded-t-2xl sm:rounded-t-xl">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-text-primary">Filtros avançados</h2>
            {draftCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent text-white">
                {draftCount}
              </span>
            )}
          </div>
          <button
            ref={firstFocusableRef}
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* ── Período ── */}
          <section>
            <SectionLabel>Período</SectionLabel>
            <SingleChipGroup
              options={PERIOD_OPTIONS}
              selected={draft.period}
              onChange={(v) => set('period', v)}
            />
            {draft.period === 'custom' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Data inicial</label>
                  <input
                    type="date"
                    value={draft.date_start || ''}
                    onChange={(e) => set('date_start', e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 text-sm rounded-lg border bg-bg-surface text-text-primary',
                      'focus:outline-none focus:ring-1 focus:ring-accent',
                      dateError ? 'border-red-400' : 'border-border'
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Data final</label>
                  <input
                    type="date"
                    value={draft.date_end || ''}
                    onChange={(e) => set('date_end', e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 text-sm rounded-lg border bg-bg-surface text-text-primary',
                      'focus:outline-none focus:ring-1 focus:ring-accent',
                      dateError ? 'border-red-400' : 'border-border'
                    )}
                  />
                </div>
                {dateError && (
                  <p className="col-span-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/30 px-2 py-1.5 rounded">
                    {dateError}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ── Status ── */}
          <section>
            <SectionLabel>Status</SectionLabel>
            <MultiChipGroup
              options={statusOptions}
              selected={draft.status}
              onChange={(v) => set('status', v)}
            />
          </section>

          {/* ── Tipo de lançamento ── */}
          <section>
            <SectionLabel>Tipo de lançamento</SectionLabel>
            <MultiChipGroup
              options={TYPE_OPTIONS}
              selected={draft.type}
              onChange={(v) => set('type', v)}
            />
          </section>

          {/* ── Faixa de valor ── */}
          <section>
            <SectionLabel>Faixa de valor</SectionLabel>
            <div className="flex flex-wrap gap-2 mb-3">
              {VALUE_RANGE_CHIPS.map((chip) => (
                <Chip
                  key={chip.label}
                  label={chip.label}
                  active={isValueRangeChipActive(chip.min, chip.max)}
                  onClick={() => handleValueRangeChip(chip.min, chip.max)}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Valor mínimo</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={draft.amount_min || ''}
                  onChange={(e) => set('amount_min', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Valor máximo</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={draft.amount_max || ''}
                  onChange={(e) => set('amount_max', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          </section>

          {/* ── Conta bancária ── */}
          <section>
            <SectionLabel>Conta bancária</SectionLabel>
            <select
              value={draft.account_id}
              onChange={(e) => set('account_id', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Todas as contas</option>
              {(accounts as { id: string; title: string }[] | undefined)?.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.title}
                </option>
              ))}
            </select>
          </section>

          {/* ── Categoria ── */}
          <section>
            <SectionLabel>Categoria</SectionLabel>
            <select
              value={draft.category_id}
              onChange={(e) => set('category_id', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Todas as categorias</option>
              {(categories as { category_id: string; category_name: string }[] | undefined)?.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </section>

          {/* ── Centro de custo ── */}
          <section>
            <SectionLabel>Centro de custo</SectionLabel>
            <select
              value={draft.cost_center_id}
              onChange={(e) => set('cost_center_id', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Todos os centros de custo</option>
              {(costCenters as { cost_center_id: string; cost_center_name: string }[] | undefined)?.map((cc) => (
                <option key={cc.cost_center_id} value={cc.cost_center_id}>
                  {cc.cost_center_name}
                </option>
              ))}
            </select>
          </section>

          {/* ── Cartão de crédito — Despesas only ── */}
          {mode === 'expense' && (
            <section>
              <SectionLabel>Cartão de crédito</SectionLabel>
              <select
                value={draft.credit_card_id}
                onChange={(e) => set('credit_card_id', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Todos os cartões</option>
                {(creditCards as { credit_card_id: string; credit_card_name: string }[] | undefined)?.map((cc) => (
                  <option key={cc.credit_card_id} value={cc.credit_card_id}>
                    {cc.credit_card_name}
                  </option>
                ))}
              </select>
            </section>
          )}

          {/* ── Opções avançadas ── */}
          <section>
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="flex items-center justify-between w-full group"
            >
              <SectionLabel>Opções avançadas</SectionLabel>
              {advancedOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-text-muted mb-2" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-text-muted mb-2" />
              )}
            </button>
            {advancedOpen && (
              <div className="space-y-1 mt-1 divide-y divide-border">
                <ToggleRow
                  key="only_due_today"
                  label="Somente vencidas hoje"
                  checked={draft.only_due_today}
                  onChange={(v) => set('only_due_today', v)}
                />
                <ToggleRow
                  key="no_category"
                  label="Sem categoria vinculada"
                  checked={draft.no_category}
                  onChange={(v) => set('no_category', v)}
                />
                <ToggleRow
                  key="no_account"
                  label="Sem conta bancária"
                  checked={draft.no_account}
                  onChange={(v) => set('no_account', v)}
                />
                <ToggleRow
                  key="only_last_installment"
                  label="Apenas parcelas finais"
                  checked={draft.only_last_installment}
                  onChange={(v) => set('only_last_installment', v)}
                />
              </div>
            )}
          </section>

        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-3 px-5 py-4 border-t border-border bg-bg-page rounded-b-none sm:rounded-b-xl">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={isDefault}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Limpar
          </Button>
          <Button type="button" size="sm" onClick={handleApply}>
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Aplicar filtros
            {draftCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/20">
                {draftCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
