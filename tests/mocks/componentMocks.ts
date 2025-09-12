import React from 'react';

// Mock common UI components
export const MockButton = jest.fn(({ children, onClick, ...props }) => (
  React.createElement('button', { onClick, ...props }, children)
));

export const MockInput = jest.fn((props) => 
  React.createElement('input', props)
);

export const MockTextarea = jest.fn((props) => 
  React.createElement('textarea', props)
);

export const MockSelect = jest.fn(({ children, ...props }) => 
  React.createElement('select', props, children)
);

export const MockModal = jest.fn(({ children, isOpen, onClose }) => 
  isOpen ? React.createElement('div', { 
    'data-testid': 'modal',
    onClick: onClose 
  }, children) : null
);

export const MockTooltip = jest.fn(({ children, content }) => 
  React.createElement('div', { title: content }, children)
);

export const MockSpinner = jest.fn(() => 
  React.createElement('div', { 'data-testid': 'spinner' }, 'Loading...')
);

export const MockIcon = jest.fn(({ name, size = 16 }) => 
  React.createElement('span', { 
    'data-testid': `icon-${name}`,
    style: { width: size, height: size }
  })
);

// Mock complex components
export const MockCodeEditor = jest.fn(({ value, onChange, language }) => 
  React.createElement('textarea', {
    'data-testid': 'code-editor',
    value,
    onChange: (e: any) => onChange(e.target.value),
    'data-language': language,
  })
);

export const MockMarkdownRenderer = jest.fn(({ content }) => 
  React.createElement('div', { 
    'data-testid': 'markdown-renderer',
    dangerouslySetInnerHTML: { __html: content }
  })
);

export const MockFileUpload = jest.fn(({ onUpload, accept, multiple }) => 
  React.createElement('input', {
    type: 'file',
    'data-testid': 'file-upload',
    accept,
    multiple,
    onChange: (e: any) => onUpload(e.target.files),
  })
);

export const MockChart = jest.fn(({ data, type }) => 
  React.createElement('div', { 
    'data-testid': `chart-${type}`,
    'data-points': data.length 
  }, `Chart: ${data.length} points`)
);

// Component factory for creating mock components
export const createMockComponent = (name: string, defaultProps: any = {}) => 
  jest.fn((props) => 
    React.createElement('div', {
      'data-testid': `mock-${name.toLowerCase()}`,
      ...defaultProps,
      ...props
    })
  );