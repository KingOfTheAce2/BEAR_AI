import React from 'react';
import { cn } from '../../utils/cn';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
type AvatarStatus = 'online' | 'offline' | 'busy' | 'away' | 'idle' | 'unknown';

export interface AvatarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Image source */
  src?: string | null;
  /** Accessible alt text for the image */
  alt?: string;
  /** Fallback text when no image is available */
  fallback?: string;
  /** Avatar size or explicit pixel value */
  size?: AvatarSize;
  /** Show presence indicator */
  showStatus?: boolean;
  /** Presence status used for indicator styling */
  status?: AvatarStatus;
  /** Additional class applied to the inner image element */
  imageClassName?: string;
  /** Additional class applied to the status indicator */
  statusClassName?: string;
  /** Optional custom render function for fallback */
  renderFallback?: () => React.ReactNode;
  /** Content rendered inside the avatar (used for advanced cases) */
  children?: React.ReactNode;
}

const sizeToClass: Record<Exclude<AvatarSize, number>, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-14 w-14 text-lg',
};

const statusToClass: Record<AvatarStatus, string> = {
  online: 'bg-emerald-500',
  busy: 'bg-amber-500',
  away: 'bg-yellow-400',
  offline: 'bg-gray-400',
  idle: 'bg-blue-400',
  unknown: 'bg-gray-300',
};

const statusPositionClass =
  'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background';

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt,
      fallback,
      size = 'md',
      showStatus = false,
      status = 'offline',
      imageClassName,
      statusClassName,
      renderFallback,
      children,
      ...props
    },
    ref
  ) => {
    const [hasError, setHasError] = React.useState(false);

    const resolvedSizeClass =
      typeof size === 'number' ? undefined : sizeToClass[size] ?? sizeToClass.md;
    const dimensionStyle =
      typeof size === 'number' ? { width: size, height: size } : undefined;

    const renderImage = () => {
      if (!src || hasError) {
        return null;
      }

      return (
        <img
          src={src}
          alt={alt ?? ''}
          className={cn('h-full w-full object-cover rounded-full', imageClassName)}
          onError={() => setHasError(true)}
        />
      );
    };

    const renderFallbackContent = () => {
      if (children) {
        return children;
      }

      if (renderFallback) {
        return renderFallback();
      }

      const textFallback = fallback ?? alt?.charAt(0)?.toUpperCase() ?? '?';
      return (
        <span className="font-medium uppercase" aria-hidden={textFallback.length === 0}>
          {textFallback}
        </span>
      );
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground',
          resolvedSizeClass,
          className
        )}
        style={dimensionStyle}
        {...props}
      >
        {renderImage() ?? renderFallbackContent()}
        {showStatus && (
          <span
            className={cn(
              statusPositionClass,
              statusToClass[status] ?? statusToClass.unknown,
              statusClassName
            )}
            aria-hidden
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';
