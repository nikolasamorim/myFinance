import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useCostCenters } from '../../hooks/useCostCenters';
import { useCreditCards } from '../../hooks/useCreditCards';
import type { DashboardAdvancedFilters } from '../../types/dashboardFilters';
import { DEFAULT_DASHBOARD_ADVANCED_FILTERS, countActiveDashboardFilters } from '../../types/dashboardFilters';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: DashboardAdvancedFilters;
  onApply: (filters: DashboardAdvancedFilters) => void;
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

// ─── Options ─────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'current_month', label: 'Este mês' },
  { value: 'last_month', label: 'Último mês' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'semester', label: 'Semestre' },
  { value: 'year', label: 'Ano' },
  { value: 'custom', label: 'Personalizado' },
];

const TYPE_OPTIONS = [
  { value: 'income', label: 'Receita' },
  { value: 'expense', label: 'Despesa' },
  { value: 'debt', label: 'Dívida' },
  { value: 'investment', label: 'Investimento' },
];

const STATUS_OPTIONS = [
  { value: 'paid', label: 'Pago' },
  { value: 'received', label: 'Recebido' },
  { value: 'pending', label: 'Pendente' },
  { value: 'overdue', label: 'Atrasado' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'canceled', label: 'Cancelado' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function DashboardFilterModal({
  isOpen,
  onClose,
  appliedFilters,
  onApply,
}: DashboardFilterModalProps) {
  const [draft, setDraft] = useState<DashboardAdvancedFilters>({ ...appliedFilters });
  const [dateError, setDateError] = useState('');
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Seed draft from appliedFilters each time modal opens
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      setDraft({ ...appliedFilters });
      setDateError('');
    } else {
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

  // Data hooks
  const { data: accounts } = useAccounts({ type: 'all', search: '' });
  const { data: categories } = useCategories({ type: 'all', search: '' });
  const { data: costCenters } = useCostCenters({ status: 'all', search: '' });
  const { data: creditCards } = useCreditCards({ search: '' });

  if (!isOpen) return null;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const set = <K extends keyof DashboardAdvancedFilters>(
    key: K,
    value: DashboardAdvancedFilters[K]
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (dateError) setDateError('');
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
    setDraft({ ...DEFAULT_DASHBOARD_ADVANCED_FILTERS });
    setDateError('');
  };

  const isDefault =
    JSON.stringify(draft) === JSON.stringify(DEFAULT_DASHBOARD_ADVANCED_FILTERS);

  const draftCount = countActiveDashboardFilters(draft);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-label="Filtros do dashboard"
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
            <h2 className="text-base font-semibold text-text-primary">Filtros</h2>
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
                <div key="date_start">
                  <label className="block text-xs text-text-muted mb-1">Data inicial</label>
                  <input
                    type="date"
                    value={draft.date_start}
                    onChange={(e) => set('date_start', e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 text-sm rounded-lg border bg-bg-surface text-text-primary',
                      'focus:outline-none focus:ring-1 focus:ring-accent',
                      dateError ? 'border-red-400' : 'border-border'
                    )}
                  />
                </div>
                <div key="date_end">
                  <label className="block text-xs text-text-muted mb-1">Data final</label>
                  <input
                    type="date"
                    value={draft.date_end}
                    onChange={(e) => set('date_end', e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 text-sm rounded-lg border bg-bg-surface text-text-primary',
                      'focus:outline-none focus:ring-1 focus:ring-accent',
                      dateError ? 'border-red-400' : 'border-border'
                    )}
                  />
                </div>
                {dateError && (
                  <p key="date_error" className="col-span-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/30 px-2 py-1.5 rounded">
                    {dateError}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ── Buscar ── */}
          <section>
            <SectionLabel>Buscar</SectionLabel>
            <input
              type="text"
              placeholder="Buscar transações..."
              value={draft.search}
              onChange={(e) => set('search', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
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

          {/* ── Status ── */}
          <section>
            <SectionLabel>Status</SectionLabel>
            <MultiChipGroup
              options={STATUS_OPTIONS}
              selected={draft.status}
              onChange={(v) => set('status', v)}
            />
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
              {(costCenters as { id: string; title: string }[] | undefined)?.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.title}
                </option>
              ))}
            </select>
          </section>

          {/* ── Cartão de crédito ── */}
          <section>
            <SectionLabel>Cartão de crédito</SectionLabel>
            <select
              value={draft.credit_card_id}
              onChange={(e) => set('credit_card_id', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Todos os cartões</option>
              {(creditCards as { id: string; title: string }[] | undefined)?.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.title}
                </option>
              ))}
            </select>
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
