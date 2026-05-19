import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Unified Button component.
 * Variants: primary | secondary | dark | link
 * Sizes: sm | md | lg
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  icon,
  iconPosition = 'left',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  const variants = {
    primary:
      'bg-brand-primary text-black hover:bg-brand-primary-hover focus-visible:ring-brand-primary',
    secondary:
      'bg-brand-darker text-brand-gray border border-brand-border hover:bg-opacity-80 focus-visible:ring-brand-border',
    dark:
      'bg-[#1a223d] text-white hover:bg-[#232946] focus-visible:ring-[#1a223d]',
    link: 'text-brand-primary hover:text-brand-primary-hover hover:underline px-0 py-0',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const sizeClass = variant === 'link' ? sizes.sm : (sizes[size] ?? sizes.md);

  return (
    <button
      className={cn(base, variants[variant] ?? variants.primary, sizeClass, className)}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
    </button>
  );
}
