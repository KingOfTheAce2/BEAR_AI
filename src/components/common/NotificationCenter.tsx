import React from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useApp } from '../../contexts/AppContext';

type NotificationType = 'info' | 'success' | 'warning' | 'error';
type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface NotificationColors {
  border: string;
  icon: string;
}

const typeToColors: Record<NotificationType, NotificationColors> = {
  success: {
    border: 'border-green-500',
    icon: 'text-green-500'
  },
  warning: {
    border: 'border-yellow-500',
    icon: 'text-yellow-500'
  },
  error: {
    border: 'border-red-500',
    icon: 'text-red-500'
  },
  info: {
    border: 'border-blue-500',
    icon: 'text-blue-500'
  }
};

const typeToIcon: Record<NotificationType, IconComponent> = {
  success: CheckCircleIcon,
  warning: ExclamationCircleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon
};

export const NotificationCenter: React.FC = () => {
  const { state, removeNotification } = useApp();

  if (state.notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {state.notifications.map(notification => {
        const Icon = typeToIcon[notification.type];
        const colorClasses = typeToColors[notification.type];

        return (
          <div
            key={notification.id}
            className={`bg-white dark:bg-gray-800 border-l-4 rounded-lg shadow-lg p-4 ${colorClasses.border} animate-in slide-in-from-right duration-300`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Icon className={`w-5 h-5 ${colorClasses.icon}`} />
              </div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {notification.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {formatTimestamp(notification.timestamp)}
                </p>
              </div>
              <div className="flex-shrink-0 ml-3">
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  aria-label="Dismiss notification"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

function formatTimestamp(timestamp: Date | string): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) {
    return 'just now';
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return date.toLocaleDateString();
}
