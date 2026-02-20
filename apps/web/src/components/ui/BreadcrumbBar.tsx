import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface BreadcrumbBarProps {
  segments: string[];
  onBack?: () => void;
  className?: string;
}

export function BreadcrumbBar({ segments, onBack, className }: BreadcrumbBarProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={cn('flex items-center gap-2 px-1 sm:px-0', className)}>
      <button
        onClick={handleBack}
        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
        title="Voltar"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <nav className="flex items-center gap-1 min-w-0">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          return (
            <div key={index} className="flex items-center gap-1 min-w-0">
              {index > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              )}
              <span
                className={cn(
                  'text-sm truncate',
                  isLast
                    ? 'font-semibold text-gray-900'
                    : 'text-gray-500'
                )}
              >
                {segment}
              </span>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
