import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@test/utils/test-utils'
import { Button } from './Button'
import { Loader2, Plus, ArrowRight } from 'lucide-react'

describe('Button Component', () => {
  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>)
      
      const button = screen.getByRole('button', { name: 'Click me' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-primary-600', 'text-white')
      expect(button).toHaveClass('h-10', 'px-4', 'text-sm')
    })

    it('renders with custom className', () => {
      render(<Button className="custom-class">Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('forwards ref correctly', () => {
      const ref = vi.fn()
      render(<Button ref={ref}>Button</Button>)
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement))
    })

    it('handles click events', async () => {
      const handleClick = vi.fn()
      const { user } = render(<Button onClick={handleClick}>Click me</Button>)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Variants', () => {
    it('renders primary variant correctly', () => {
      render(<Button variant="primary">Primary</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary-600', 'text-white', 'hover:bg-primary-700')
    })

    it('renders secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-secondary-100', 'text-secondary-900', 'hover:bg-secondary-200')
    })

    it('renders outline variant correctly', () => {
      render(<Button variant="outline">Outline</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border', 'border-secondary-300', 'bg-white', 'text-secondary-900')
    })

    it('renders ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-secondary-700', 'hover:bg-secondary-100')
    })

    it('renders danger variant correctly', () => {
      render(<Button variant="danger">Danger</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-danger-600', 'text-white', 'hover:bg-danger-700')
    })
  })

  describe('Sizes', () => {
    it('renders small size correctly', () => {
      render(<Button size="sm">Small</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-8', 'px-3', 'text-sm', 'rounded-md')
    })

    it('renders medium size correctly', () => {
      render(<Button size="md">Medium</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10', 'px-4', 'text-sm', 'rounded-md')
    })

    it('renders large size correctly', () => {
      render(<Button size="lg">Large</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-12', 'px-6', 'text-base', 'rounded-lg')
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      
      // Check for Loader2 component (spinning icon)
      const loader = button.querySelector('svg')
      expect(loader).toHaveClass('animate-spin')
    })

    it('hides left icon when loading', () => {
      render(
        <Button isLoading leftIcon={<Plus data-testid="plus-icon" />}>
          Loading
        </Button>
      )
      
      expect(screen.queryByTestId('plus-icon')).not.toBeInTheDocument()
    })

    it('hides right icon when loading', () => {
      render(
        <Button isLoading rightIcon={<ArrowRight data-testid="arrow-icon" />}>
          Loading
        </Button>
      )
      
      expect(screen.queryByTestId('arrow-icon')).not.toBeInTheDocument()
    })

    it('is disabled when loading', async () => {
      const handleClick = vi.fn()
      const { user } = render(
        <Button isLoading onClick={handleClick}>
          Loading
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      
      await user.click(button)
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('uses correct spinner size for different button sizes', () => {
      const { rerender } = render(<Button isLoading size="sm">Small Loading</Button>)
      let loader = screen.getByRole('button').querySelector('svg')
      expect(loader).toHaveClass('h-3.5', 'w-3.5')

      rerender(<Button isLoading size="md">Medium Loading</Button>)
      loader = screen.getByRole('button').querySelector('svg')
      expect(loader).toHaveClass('h-4', 'w-4')

      rerender(<Button isLoading size="lg">Large Loading</Button>)
      loader = screen.getByRole('button').querySelector('svg')
      expect(loader).toHaveClass('h-5', 'w-5')
    })
  })

  describe('Icons', () => {
    it('renders left icon correctly', () => {
      render(<Button leftIcon={<Plus data-testid="plus-icon" />}>With Icon</Button>)
      
      const icon = screen.getByTestId('plus-icon')
      expect(icon).toBeInTheDocument()
      expect(icon.parentElement).toHaveClass('mr-2')
    })

    it('renders right icon correctly', () => {
      render(<Button rightIcon={<ArrowRight data-testid="arrow-icon" />}>With Icon</Button>)
      
      const icon = screen.getByTestId('arrow-icon')
      expect(icon).toBeInTheDocument()
      expect(icon.parentElement).toHaveClass('ml-2')
    })

    it('renders both icons correctly', () => {
      render(
        <Button 
          leftIcon={<Plus data-testid="plus-icon" />}
          rightIcon={<ArrowRight data-testid="arrow-icon" />}
        >
          Both Icons
        </Button>
      )
      
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument()
      expect(screen.getByTestId('arrow-icon')).toBeInTheDocument()
    })

    it('uses correct icon spacing for different sizes', () => {
      const { rerender } = render(
        <Button size="sm" leftIcon={<Plus data-testid="plus-icon" />}>
          Small
        </Button>
      )
      expect(screen.getByTestId('plus-icon').parentElement).toHaveClass('mr-1.5')

      rerender(
        <Button size="md" leftIcon={<Plus data-testid="plus-icon" />}>
          Medium
        </Button>
      )
      expect(screen.getByTestId('plus-icon').parentElement).toHaveClass('mr-2')

      rerender(
        <Button size="lg" leftIcon={<Plus data-testid="plus-icon" />}>
          Large
        </Button>
      )
      expect(screen.getByTestId('plus-icon').parentElement).toHaveClass('mr-2')
    })
  })

  describe('Disabled State', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50')
    })

    it('does not trigger click when disabled', async () => {
      const handleClick = vi.fn()
      const { user } = render(<Button disabled onClick={handleClick}>Disabled</Button>)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('is disabled when both disabled and isLoading are true', () => {
      render(<Button disabled isLoading>Disabled Loading</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<Button disabled>Disabled Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('disabled')
    })

    it('supports custom ARIA attributes', () => {
      render(
        <Button aria-label="Custom label" aria-describedby="description">
          Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Custom label')
      expect(button).toHaveAttribute('aria-describedby', 'description')
    })

    it('has proper focus styles', () => {
      render(<Button>Focusable</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-offset-2')
    })
  })

  describe('HTML Attributes', () => {
    it('passes through HTML button attributes', () => {
      render(
        <Button type="submit" form="test-form" name="submit-btn" value="submit">
          Submit
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
      expect(button).toHaveAttribute('form', 'test-form')
      expect(button).toHaveAttribute('name', 'submit-btn')
      expect(button).toHaveAttribute('value', 'submit')
    })

    it('supports data attributes', () => {
      render(<Button data-testid="custom-button" data-custom="value">Test</Button>)
      
      const button = screen.getByTestId('custom-button')
      expect(button).toHaveAttribute('data-custom', 'value')
    })
  })

  describe('Performance', () => {
    it('renders quickly', async () => {
      const renderTime = await import('@test/utils/test-utils').then(utils => 
        utils.measureRenderTime(() => render(<Button>Performance Test</Button>))
      )
      
      // Should render in under 50ms
      expect(renderTime).toBeLessThan(50)
    })

    it('handles multiple rapid clicks', async () => {
      const handleClick = vi.fn()
      const { user } = render(<Button onClick={handleClick}>Rapid Click</Button>)
      
      const button = screen.getByRole('button')
      
      // Simulate rapid clicks
      await Promise.all([
        user.click(button),
        user.click(button),
        user.click(button),
        user.click(button),
        user.click(button),
      ])
      
      expect(handleClick).toHaveBeenCalledTimes(5)
    })
  })
})