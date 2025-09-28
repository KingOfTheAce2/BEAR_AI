import React from 'react';
import { cn } from '../../utils/cn';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AppleNotificationProps {
  type: NotificationType;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  persistent?: boolean;
  className?: string;
}

const typeConfig = {
  success: {
    color: 'var(--apple-system-green)',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    )
  },
  error: {
    color: 'var(--apple-system-red)',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    )
  },
  warning: {
    color: 'var(--apple-system-orange)',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    )
  },
  info: {
    color: 'var(--apple-system-blue)',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    )
  }
};

export const AppleNotification: React.FC<AppleNotificationProps> = ({
  type,
  title,
  message,
  action,
  onDismiss,
  persistent = false,
  className
}) => {
  const config = typeConfig[type];
  const [isVisible, setIsVisible] = React.useState(true);
  const [isLeaving, setIsLeaving] = React.useState(false);

  React.useEffect(() => {
    if (!persistent) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [persistent]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'apple-glass border rounded-xl p-4 shadow-lg max-w-sm w-full transition-all duration-300 transform',
        isLeaving ? 'opacity-0 translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100',
        'animate-slide-up',
        className
      )}
      style={{
        backgroundColor: config.backgroundColor,
        borderColor: config.color + '40'
      }}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div
          className="flex-shrink-0 mt-0.5"
          style={{ color: config.color }}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className="apple-callout font-semibold"
            style={{ color: 'var(--apple-label-primary)' }}
          >
            {title}
          </h4>
          {message && (
            <p
              className="apple-footnote mt-1"
              style={{ color: 'var(--apple-label-secondary)' }}
            >
              {message}
            </p>
          )}

          {/* Action button */}
          {action && (
            <button
              onClick={action.onClick}
              className="mt-3 apple-button-ghost text-sm font-medium px-0"
              style={{ color: config.color }}
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="apple-button-ghost p-1 -mt-1 -mr-1 flex-shrink-0"
          style={{ color: 'var(--apple-label-tertiary)' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Progress bar for auto-dismiss */}
      {!persistent && (
        <div className="mt-3 h-1 bg-black/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-[5000ms] ease-linear"
            style={{
              backgroundColor: config.color,
              width: isLeaving ? '100%' : '0%'
            }}
          />
        </div>
      )}
    </div>
  );
};