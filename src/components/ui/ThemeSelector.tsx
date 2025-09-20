import React, { useState } from 'react';
import { 
import { useTheme, Theme, ColorMode } from '../../contexts/ThemeContext';

  PaintBrushIcon, 
  SunIcon, 
  MoonIcon, 
  ComputerDesktopIcon,
  ChevronDownIcon 
} from '@heroicons/react/24/outline';

interface ThemeSelectorProps {
  className?: string;
  compact?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ 
  className = '', 
  compact = false 
}) => {
  const { config, setTheme, setColorMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes: { value: Theme; label: string; description: string }[] = [
    { value: 'professional', label: 'Professional', description: 'Clean, trustworthy design for legal work' },
    { value: 'modern', label: 'Modern', description: 'Sleek dark interface with vibrant accents' },
    { value: 'simple', label: 'Simple', description: 'Minimalist design for focused work' }
  ];

  const colorModes: { value: ColorMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <SunIcon className="w-4 h-4" /> },
    { value: 'dark', label: 'Dark', icon: <MoonIcon className="w-4 h-4" /> },
    { value: 'system', label: 'System', icon: <ComputerDesktopIcon className="w-4 h-4" /> }
  ];

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Theme Settings"
        >
          <PaintBrushIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)} 
            />
            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-20">
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Theme Style
                  </label>
                  <div className="space-y-1">
                    {themes.map((theme) => (
                      <button
                        key={theme.value}
                        onClick={() => {
                          setTheme(theme.value);
                          setIsOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                          config.theme === theme.value
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <div className="font-medium">{theme.label}</div>
                        <div className="text-xs opacity-75">{theme.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Color Mode
                  </label>
                  <div className="flex space-x-1">
                    {colorModes.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => {
                          setColorMode(mode.value);
                          setIsOpen(false);
                        }}
                        className={`flex-1 flex items-center justify-center p-2 rounded-md text-sm transition-colors ${
                          config.colorMode === mode.value
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                        title={mode.label}
                      >
                        {mode.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Appearance Settings
        </h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Theme Style
            </label>
            <div className="space-y-2">
              {themes.map((theme) => (
                <label key={theme.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value={theme.value}
                    checked={config.theme === theme.value}
                    onChange={() => setTheme(theme.value)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {theme.label}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {theme.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Color Mode
            </label>
            <div className="flex space-x-2">
              {colorModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setColorMode(mode.value)}
                  className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-lg border transition-colors ${
                    config.colorMode === mode.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {mode.icon}
                  <span className="text-sm font-medium">{mode.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-600">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Theme changes are saved automatically and will be applied across all sessions.
        </div>
      </div>
    </div>
  );
};