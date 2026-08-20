import React from 'react';
import { cn } from '../../utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  ...props
}) => {
  const variantStyles = {
    rectangular: 'rounded-xl',
    circular: 'rounded-full',
    text: 'rounded-lg h-4 w-full',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-white/[0.04] border border-white/[0.04] backdrop-blur-md',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
};
