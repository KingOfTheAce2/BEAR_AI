import React, { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  label?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  disabled = false,
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempColor, setTempColor] = useState(color);
  const pickerRef = useRef<HTMLDivElement>(null);

  const presetColors = [
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
    '#FF0000', '#FF6600', '#FFCC00', '#66CC00', '#0066CC', '#6600CC',
    '#FF3366', '#FF9933', '#FFFF33', '#99FF33', '#33CCFF', '#9933FF',
    '#FF6699', '#FFAA66', '#FFFF99', '#CCFF99', '#99DDFF', '#CC99FF',
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleColorChange = (newColor: string) => {
    setTempColor(newColor);
    onChange(newColor);
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const isValidHex = (hex: string) => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
  };

  const handleHexInput = (value: string) => {
    if (isValidHex(value)) {
      handleColorChange(value);
    }
    setTempColor(value);
  };

  const rgb = hexToRgb(color);

  return (
    <div className="color-picker" ref={pickerRef}>
      {label && <label className="color-picker-label">{label}</label>}
      
      <div className="color-picker-trigger">
        <div
          className={`color-swatch ${disabled ? 'disabled' : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        />
        <input
          type="text"
          value={tempColor}
          onChange={(e) => handleHexInput(e.target.value)}
          onBlur={() => {
            if (isValidHex(tempColor)) {
              onChange(tempColor);
            } else {
              setTempColor(color);
            }
          }}
          disabled={disabled}
          className="color-hex-input"
          placeholder="#000000"
        />
      </div>

      {isOpen && !disabled && (
        <div className="color-picker-dropdown">
          <div className="color-picker-section">
            <h5>Preset Colors</h5>
            <div className="preset-colors">
              {presetColors.map((presetColor) => (
                <div
                  key={presetColor}
                  className={`preset-color ${color === presetColor ? 'selected' : ''}`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => {
                    handleColorChange(presetColor);
                    setIsOpen(false);
                  }}
                />
              ))}
            </div>
          </div>

          <div className="color-picker-section">
            <h5>Custom Color</h5>
            <div className="color-inputs">
              <div className="color-input-row">
                <label>Hex:</label>
                <input
                  type="text"
                  value={tempColor}
                  onChange={(e) => handleHexInput(e.target.value)}
                  className="hex-input"
                />
              </div>
              
              {rgb && (
                <>
                  <div className="color-input-row">
                    <label>R:</label>
                    <input
                      type="number"
                      value={rgb.r}
                      onChange={(e) => {
                        const newR = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                        const newHex = rgbToHex(newR, rgb.g, rgb.b);
                        handleColorChange(newHex);
                      }}
                      min="0"
                      max="255"
                      className="rgb-input"
                    />
                  </div>
                  <div className="color-input-row">
                    <label>G:</label>
                    <input
                      type="number"
                      value={rgb.g}
                      onChange={(e) => {
                        const newG = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                        const newHex = rgbToHex(rgb.r, newG, rgb.b);
                        handleColorChange(newHex);
                      }}
                      min="0"
                      max="255"
                      className="rgb-input"
                    />
                  </div>
                  <div className="color-input-row">
                    <label>B:</label>
                    <input
                      type="number"
                      value={rgb.b}
                      onChange={(e) => {
                        const newB = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                        const newHex = rgbToHex(rgb.r, rgb.g, newB);
                        handleColorChange(newHex);
                      }}
                      min="0"
                      max="255"
                      className="rgb-input"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="color-picker-section">
            <input
              type="color"
              value={color}
              onChange={(e) => handleColorChange(e.target.value)}
              className="native-color-picker"
            />
          </div>
        </div>
      )}

      <style>{`
        .color-picker {
          position: relative;
          display: inline-block;
        }

        .color-picker-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .color-picker-trigger {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .color-swatch {
          width: 40px;
          height: 32px;
          border: 2px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .color-swatch:hover:not(.disabled) {
          border-color: #007bff;
          transform: scale(1.05);
        }

        .color-swatch.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .color-hex-input {
          padding: 0.375rem 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.85rem;
          font-family: monospace;
          width: 100px;
        }

        .color-picker-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 1rem;
          z-index: 1000;
          min-width: 250px;
        }

        .color-picker-section {
          margin-bottom: 1rem;
        }

        .color-picker-section:last-child {
          margin-bottom: 0;
        }

        .color-picker-section h5 {
          margin: 0 0 0.5rem 0;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .preset-colors {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 4px;
        }

        .preset-color {
          width: 32px;
          height: 32px;
          border: 2px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .preset-color:hover {
          border-color: #007bff;
          transform: scale(1.1);
        }

        .preset-color.selected {
          border-color: #007bff;
          border-width: 3px;
        }

        .color-inputs {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .color-input-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .color-input-row label {
          width: 30px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .hex-input {
          flex: 1;
          padding: 0.25rem 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.85rem;
          font-family: monospace;
        }

        .rgb-input {
          width: 60px;
          padding: 0.25rem 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.85rem;
        }

        .native-color-picker {
          width: 100%;
          height: 40px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default ColorPicker;