import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { Button } from './Button';

describe('Button', () => {
  it('renders label and applies variant styling', () => {
    render(<Button variant="primary">Submit</Button>);

    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-blue-600');
    expect(button).toHaveClass('hover:bg-blue-700');
  });

  it('shows loading state and prevents clicks', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Saving
      </Button>,
    );

    const button = screen.getByRole('button', { name: /saving/i });
    expect(button).toBeDisabled();
    expect(button.querySelector('span')).toHaveClass('animate-spin');

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('supports rendering child elements when using asChild', () => {
    render(
      <Button asChild>
        <a href="#settings" className="custom-class">
          Settings
        </a>
      </Button>,
    );

    const link = screen.getByRole('link', { name: /settings/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#settings');
    expect(link).toHaveClass('custom-class');
    expect(link).toHaveClass('inline-flex');
  });
});
