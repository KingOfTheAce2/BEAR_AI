import React, { useState } from 'react';

interface Option {
  value: string | number;
  label: string;
}

interface FormFieldProps {
  label: string;
  type: 'text' | 'number' | 'select' | 'switch' | 'slider' | 'textarea';
  value: any;
  onChange: (value: any) => void;
  options?: Option[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  searchable?: boolean;
  rows?: number;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  type,
  value,
  onChange,
  options = [],
  min,
  max,
  step = 1,
  placeholder,
  description,
  disabled = false,
  searchable = false,
  rows = 3,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = searchable
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const renderInput = () => {
    switch (type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="form-input"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(Number(e.target.value))}
            min={min}
            max={max}
            step={step}
            placeholder={placeholder}
            disabled={disabled}
            className="form-input"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className="form-textarea"
          />
        );

      case 'select':
        if (searchable) {
          return (
            <div className="searchable-select">
              <input
                type="text"
                value={searchTerm || (options.find(opt => opt.value === value)?.label || '')}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder || 'Search...'}
                disabled={disabled}
                className="form-input"
              />
              {isOpen && (
                <div className="select-dropdown">
                  {filteredOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`select-option ${value === option.value ? 'selected' : ''}`}
                      onClick={() => {
                        onChange(option.value);
                        setSearchTerm('');
                        setIsOpen(false);
                      }}
                    >
                      {option.label}
                    </div>
                  ))}
                  {filteredOptions.length === 0 && (
                    <div className="select-option disabled">No matches found</div>
                  )}
                </div>
              )}
            </div>
          );
        }

        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="form-select"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'switch':
        return (
          <label className="switch">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
            />
            <span className="switch-slider"></span>
          </label>
        );

      case 'slider':
        return (
          <div className="slider-container">
            <input
              type="range"
              value={value || min || 0}
              onChange={(e) => onChange(Number(e.target.value))}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              className="form-slider"
            />
            <span className="slider-value">{value}</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="form-field">
      <div className="field-header">
        <label className="field-label">{label}</label>
        {type === 'slider' && (
          <input
            type="number"
            value={value || min || 0}
            onChange={(e) => onChange(Number(e.target.value))}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className="slider-number-input"
          />
        )}
      </div>
      
      <div className="field-input">
        {renderInput()}
      </div>
      
      {description && (
        <div className="field-description">
          {description}
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {searchable && isOpen && (
        <div
          className="dropdown-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default FormField;