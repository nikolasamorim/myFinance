import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, showPasswordToggle = false, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            className={cn(
              'block w-full px-2 py-1.5 text-sm bg-bg-page text-text-primary border border-border rounded-md shadow-sm placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-transparent',
              error && 'border-red-300 focus:ring-red-500',
              showPasswordToggle && 'pr-10',
              className
            )}
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-2 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-3.5 w-3.5 text-text-muted hover:text-text-secondary" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-text-muted hover:text-text-secondary" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </div>
    );
  }
);
