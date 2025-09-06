import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@test/utils/test-utils'
import { Input } from './Input'
import { Search, Eye, EyeOff } from 'lucide-react'

describe('Input Component', () => {
  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveClass('h-10', 'px-3', 'text-sm')
    })

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text..." />)
      
      const input = screen.getByPlaceholderText('Enter text...')
      expect(input).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      render(<Input className="custom-class" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('custom-class')
    })

    it('forwards ref correctly', () => {
      const ref = vi.fn()
      render(<Input ref={ref} />)
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement))
    })

    it('handles value changes', async () => {
      const handleChange = vi.fn()
      const { user } = render(<Input onChange={handleChange} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test input')
      
      expect(handleChange).toHaveBeenCalledTimes('test input'.length)
    })
  })

  describe('Sizes', () => {
    it('renders small size correctly', () => {
      render(<Input size="sm" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('h-8', 'px-2', 'text-xs')
    })

    it('renders medium size correctly', () => {
      render(<Input size="md" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('h-10', 'px-3', 'text-sm')
    })

    it('renders large size correctly', () => {
      render(<Input size="lg" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('h-12', 'px-4', 'text-base')
    })
  })

  describe('Variants', () => {
    it('renders default variant correctly', () => {
      render(<Input variant="default" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-secondary-300', 'focus:border-primary-500', 'focus:ring-primary-500')
    })

    it('renders filled variant correctly', () => {
      render(<Input variant="filled" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('bg-secondary-50', 'border-transparent', 'focus:bg-white')
    })
  })

  describe('States', () => {
    it('shows error state correctly', () => {
      render(<Input error="This field is required" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-danger-500', 'focus:border-danger-500', 'focus:ring-danger-500')
      
      const errorMessage = screen.getByText('This field is required')
      expect(errorMessage).toBeInTheDocument()
      expect(errorMessage).toHaveClass('text-danger-600')
    })

    it('shows success state correctly', () => {
      render(<Input success />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-success-500', 'focus:border-success-500', 'focus:ring-success-500')
    })

    it('shows disabled state correctly', () => {
      render(<Input disabled />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
      expect(input).toHaveClass('disabled:bg-secondary-50', 'disabled:text-secondary-500')
    })

    it('does not accept input when disabled', async () => {
      const handleChange = vi.fn()
      const { user } = render(<Input disabled onChange={handleChange} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      
      expect(handleChange).not.toHaveBeenCalled()
      expect(input).toHaveValue('')
    })
  })

  describe('Icons', () => {
    it('renders left icon correctly', () => {
      render(<Input leftIcon={<Search data-testid="search-icon" />} />)
      
      const container = screen.getByTestId('search-icon').closest('.relative')
      expect(container).toBeInTheDocument()
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('pl-10') // Adjusted for icon
    })

    it('renders right icon correctly', () => {
      render(<Input rightIcon={<Search data-testid="search-icon" />} />)
      
      const container = screen.getByTestId('search-icon').closest('.relative')
      expect(container).toBeInTheDocument()
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('pr-10') // Adjusted for icon
    })

    it('renders both icons correctly', () => {
      render(
        <Input 
          leftIcon={<Search data-testid="left-icon" />}
          rightIcon={<Eye data-testid="right-icon" />}
        />
      )
      
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('pl-10', 'pr-10')
    })

    it('handles clickable right icon', async () => {
      const handleIconClick = vi.fn()
      const { user } = render(
        <Input 
          rightIcon={
            <button type="button" onClick={handleIconClick} data-testid="clickable-icon">
              <Eye />
            </button>
          }
        />
      )
      
      const icon = screen.getByTestId('clickable-icon')
      await user.click(icon)
      
      expect(handleIconClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Label and Help Text', () => {
    it('renders with label', () => {
      render(<Input label="Email Address" />)
      
      const label = screen.getByText('Email Address')
      expect(label).toBeInTheDocument()
      expect(label).toHaveClass('text-sm', 'font-medium', 'text-secondary-700')
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('id')
      expect(label).toHaveAttribute('for', input.getAttribute('id'))
    })

    it('renders with required indicator', () => {
      render(<Input label="Required Field" required />)
      
      const label = screen.getByText('Required Field')
      const asterisk = label.querySelector('.text-danger-500')
      expect(asterisk).toHaveTextContent('*')
    })

    it('renders with help text', () => {
      render(<Input helpText="Enter a valid email address" />)
      
      const helpText = screen.getByText('Enter a valid email address')
      expect(helpText).toBeInTheDocument()
      expect(helpText).toHaveClass('text-xs', 'text-secondary-600')
    })

    it('prioritizes error message over help text', () => {
      render(
        <Input 
          helpText="This is help text"
          error="This is an error message"
        />
      )
      
      expect(screen.getByText('This is an error message')).toBeInTheDocument()
      expect(screen.queryByText('This is help text')).not.toBeInTheDocument()
    })
  })

  describe('Input Types', () => {
    it('renders password input correctly', () => {
      render(<Input type="password" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'password')
    })

    it('renders email input correctly', () => {
      render(<Input type="email" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('renders number input correctly', () => {
      render(<Input type="number" />)
      
      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('type', 'number')
    })

    it('renders search input correctly', () => {
      render(<Input type="search" />)
      
      const input = screen.getByRole('searchbox')
      expect(input).toHaveAttribute('type', 'search')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes when labeled', () => {
      render(<Input label="Username" />)
      
      const input = screen.getByRole('textbox', { name: 'Username' })
      expect(input).toHaveAccessibleName('Username')
    })

    it('has proper ARIA attributes with error', () => {
      render(<Input label="Email" error="Invalid email format" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby')
    })

    it('has proper ARIA attributes with help text', () => {
      render(<Input label="Password" helpText="Must be at least 8 characters" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby')
    })

    it('supports custom ARIA attributes', () => {
      render(<Input aria-label="Custom label" aria-describedby="custom-description" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-label', 'Custom label')
      expect(input).toHaveAttribute('aria-describedby', 'custom-description')
    })

    it('has proper focus management', async () => {
      const { user } = render(<Input />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      expect(input).toHaveFocus()
      expect(input).toHaveClass('focus:outline-none', 'focus:ring-2')
    })
  })

  describe('Form Integration', () => {
    it('works with form submission', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())
      const { user } = render(
        <form onSubmit={handleSubmit}>
          <Input name="test-input" defaultValue="test value" />
          <button type="submit">Submit</button>
        </form>
      )
      
      const submitButton = screen.getByRole('button', { name: 'Submit' })
      await user.click(submitButton)
      
      expect(handleSubmit).toHaveBeenCalled()
    })

    it('supports controlled input', async () => {
      const TestComponent = () => {
        const [value, setValue] = React.useState('')
        return (
          <Input 
            value={value} 
            onChange={(e) => setValue(e.target.value)}
            data-testid="controlled-input"
          />
        )
      }
      
      const { user } = render(<TestComponent />)
      
      const input = screen.getByTestId('controlled-input')
      await user.type(input, 'controlled')
      
      expect(input).toHaveValue('controlled')
    })

    it('supports uncontrolled input', async () => {
      const { user } = render(<Input defaultValue="initial" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('initial')
      
      await user.clear(input)
      await user.type(input, 'changed')
      
      expect(input).toHaveValue('changed')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty string values', () => {
      render(<Input value="" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('')
    })

    it('handles null/undefined values gracefully', () => {
      render(<Input value={undefined} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('')
    })

    it('handles very long values', async () => {
      const longValue = 'a'.repeat(1000)
      const { user } = render(<Input />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, longValue)
      
      expect(input).toHaveValue(longValue)
    })

    it('handles special characters', async () => {
      const specialChars = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./'
      const { user } = render(<Input />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, specialChars)
      
      expect(input).toHaveValue(specialChars)
    })
  })

  describe('Performance', () => {
    it('renders quickly', async () => {
      const renderTime = await import('@test/utils/test-utils').then(utils => 
        utils.measureRenderTime(() => render(<Input />))
      )
      
      // Should render in under 50ms
      expect(renderTime).toBeLessThan(50)
    })

    it('handles rapid typing efficiently', async () => {
      const handleChange = vi.fn()
      const { user } = render(<Input onChange={handleChange} />)
      
      const input = screen.getByRole('textbox')
      const rapidText = 'quicktyping'
      
      const startTime = performance.now()
      await user.type(input, rapidText, { delay: 0 })
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
      expect(handleChange).toHaveBeenCalledTimes(rapidText.length)
    })
  })
})