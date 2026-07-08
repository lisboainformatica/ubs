import * as React from 'react';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          ref={ref}
          className={twMerge(
            'flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-destructive mt-1 block font-medium">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
