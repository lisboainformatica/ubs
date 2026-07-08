import * as React from 'react';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const base =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
  
  const variants = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive/15 text-destructive border border-destructive/20',
    outline: 'text-foreground border border-border',
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/10',
    info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/10',
  };

  return <span className={twMerge(base, variants[variant], className)} {...props} />;
}
