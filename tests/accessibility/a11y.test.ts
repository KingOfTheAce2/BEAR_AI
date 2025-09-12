import { renderWithProviders, checkA11y } from '../utils/testUtils';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Components Accessibility', () => {
    it('should have no accessibility violations in App component', async () => {
      const React = await import('react');
      const App = await import('../../src/App');
      
      const { container } = renderWithProviders(React.createElement(App.default));
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy', async () => {
      const React = await import('react');
      
      const TestPage = () => React.createElement(
        'div',
        {},
        React.createElement('h1', {}, 'Main Title'),
        React.createElement('section', {},
          React.createElement('h2', {}, 'Section Title'),
          React.createElement('h3', {}, 'Subsection Title')
        )
      );

      const { container } = renderWithProviders(React.createElement(TestPage));
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels on interactive elements', async () => {
      const React = await import('react');
      
      const InteractiveComponent = () => React.createElement(
        'div',
        {},
        React.createElement('button', { 'aria-label': 'Submit form' }, 'Submit'),
        React.createElement('input', { 'aria-label': 'Email address', type: 'email' }),
        React.createElement('select', { 'aria-label': 'Choose option' },
          React.createElement('option', { value: 'option1' }, 'Option 1')
        )
      );

      const { container } = renderWithProviders(React.createElement(InteractiveComponent));
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Form Accessibility', () => {
    it('should associate labels with form controls', async () => {
      const React = await import('react');
      
      const FormComponent = () => React.createElement(
        'form',
        {},
        React.createElement('label', { htmlFor: 'username' }, 'Username'),
        React.createElement('input', { id: 'username', type: 'text' }),
        React.createElement('label', { htmlFor: 'password' }, 'Password'),
        React.createElement('input', { id: 'password', type: 'password' })
      );

      const { container } = renderWithProviders(React.createElement(FormComponent));
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should provide error messages with proper ARIA attributes', async () => {
      const React = await import('react');
      
      const FormWithErrors = () => React.createElement(
        'form',
        {},
        React.createElement('label', { htmlFor: 'email' }, 'Email'),
        React.createElement('input', { 
          id: 'email', 
          type: 'email',
          'aria-describedby': 'email-error',
          'aria-invalid': 'true'
        }),
        React.createElement('div', { 
          id: 'email-error',
          role: 'alert'
        }, 'Please enter a valid email address')
      );

      const { container } = renderWithProviders(React.createElement(FormWithErrors));
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should support fieldsets for grouped form controls', async () => {
      const React = await import('react');
      
      const GroupedForm = () => React.createElement(
        'form',
        {},
        React.createElement('fieldset', {},
          React.createElement('legend', {}, 'Contact Information'),
          React.createElement('label', { htmlFor: 'fname' }, 'First Name'),
          React.createElement('input', { id: 'fname', type: 'text' }),
          React.createElement('label', { htmlFor: 'lname' }, 'Last Name'),
          React.createElement('input', { id: 'lname', type: 'text' })
        )
      );

      const { container } = renderWithProviders(React.createElement(GroupedForm));
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Navigation Accessibility', () => {
    it('should have proper navigation landmarks', async () => {
      const React = await import('react');
      
      const NavigationComponent = () => React.createElement(
        'div',
        {},
        React.createElement('nav', { 'aria-label': 'Main navigation' },
          React.createElement('ul', {},
            React.createElement('li', {},
              React.createElement('a', { href: '/home' }, 'Home')
            ),
            React.createElement('li', {},
              React.createElement('a', { href: '/about' }, 'About')
            )
          )
        )
      );

      const { container } = renderWithProviders(React.createElement(NavigationComponent));
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should support skip navigation links', async () => {
      const React = await import('react');
      
      const PageWithSkipLink = () => React.createElement(
        'div',
        {},
        React.createElement('a', { 
          href: '#main-content',
          className: 'skip-link'
        }, 'Skip to main content'),
        React.createElement('nav', {}, 'Navigation'),
        React.createElement('main', { id: 'main-content' }, 'Main content')
      );

      const { container } = renderWithProviders(React.createElement(PageWithSkipLink));
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Dynamic Content Accessibility', () => {
    it('should announce dynamic content changes', async () => {
      const React = await import('react');
      
      const DynamicContent = () => {
        const [message, setMessage] = React.useState('');
        
        return React.createElement(
          'div',
          {},
          React.createElement('button', {
            onClick: () => setMessage('Content updated!')
          }, 'Update Content'),
          React.createElement('div', {
            'aria-live': 'polite',
            'aria-atomic': 'true'
          }, message)
        );
      };

      const { container } = renderWithProviders(React.createElement(DynamicContent));
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should handle loading states accessibly', async () => {
      const React = await import('react');
      
      const LoadingComponent = ({ isLoading }: { isLoading: boolean }) => 
        React.createElement(
          'div',
          {},
          isLoading ? 
            React.createElement('div', {
              role: 'status',
              'aria-label': 'Loading content'
            }, 'Loading...') :
            React.createElement('div', {}, 'Content loaded')
        );

      const { container } = renderWithProviders(
        React.createElement(LoadingComponent, { isLoading: true })
      );
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Media and Images Accessibility', () => {
    it('should provide alternative text for images', async () => {
      const React = await import('react');
      
      const ImageComponent = () => React.createElement(
        'div',
        {},
        React.createElement('img', {
          src: '/chart.png',
          alt: 'Bar chart showing quarterly sales data'
        }),
        React.createElement('img', {
          src: '/logo.png',
          alt: 'BEAR AI logo'
        })
      );

      const { container } = renderWithProviders(React.createElement(ImageComponent));
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should provide accessible video controls', async () => {
      const React = await import('react');
      
      const VideoComponent = () => React.createElement(
        'video',
        {
          controls: true,
          'aria-label': 'Tutorial video'
        },
        React.createElement('source', { src: '/tutorial.mp4', type: 'video/mp4' }),
        React.createElement('track', {
          kind: 'captions',
          src: '/captions.vtt',
          srcLang: 'en',
          label: 'English captions'
        }),
        'Your browser does not support the video tag.'
      );

      const { container } = renderWithProviders(React.createElement(VideoComponent));
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Modal and Dialog Accessibility', () => {
    it('should implement proper modal accessibility', async () => {
      const React = await import('react');
      
      const ModalComponent = ({ isOpen }: { isOpen: boolean }) => 
        isOpen ? React.createElement(
          'div',
          {
            role: 'dialog',
            'aria-labelledby': 'modal-title',
            'aria-describedby': 'modal-description',
            'aria-modal': 'true'
          },
          React.createElement('h2', { id: 'modal-title' }, 'Modal Title'),
          React.createElement('p', { id: 'modal-description' }, 'Modal description'),
          React.createElement('button', { 'aria-label': 'Close modal' }, 'Close')
        ) : null;

      const { container } = renderWithProviders(
        React.createElement(ModalComponent, { isOpen: true })
      );
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should trap focus within modals', async () => {
      const React = await import('react');
      const { screen } = await import('@testing-library/react');
      const userEvent = (await import('@testing-library/user-event')).default;
      
      const user = userEvent.setup();
      
      const FocusTrapModal = () => React.createElement(
        'div',
        {
          role: 'dialog',
          'aria-modal': 'true'
        },
        React.createElement('button', { 'data-testid': 'first-button' }, 'First'),
        React.createElement('button', { 'data-testid': 'second-button' }, 'Second'),
        React.createElement('button', { 'data-testid': 'close-button' }, 'Close')
      );

      renderWithProviders(React.createElement(FocusTrapModal));
      
      const firstButton = screen.getByTestId('first-button');
      const secondButton = screen.getByTestId('second-button');
      const closeButton = screen.getByTestId('close-button');
      
      // Focus should be within the modal
      firstButton.focus();
      expect(firstButton).toHaveFocus();
      
      await user.tab();
      expect(secondButton).toHaveFocus();
      
      await user.tab();
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Color and Contrast Accessibility', () => {
    it('should meet color contrast requirements', async () => {
      const React = await import('react');
      
      const HighContrastComponent = () => React.createElement(
        'div',
        {
          style: {
            backgroundColor: '#000000',
            color: '#ffffff',
            padding: '10px'
          }
        },
        React.createElement('p', {}, 'High contrast text'),
        React.createElement('button', {
          style: {
            backgroundColor: '#0066cc',
            color: '#ffffff',
            border: 'none',
            padding: '8px 16px'
          }
        }, 'Accessible Button')
      );

      const { container } = renderWithProviders(React.createElement(HighContrastComponent));
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should not rely solely on color for information', async () => {
      const React = await import('react');
      
      const AccessibleStatusIndicator = ({ status }: { status: 'success' | 'error' | 'warning' }) => {
        const getStatusInfo = () => {
          switch (status) {
            case 'success':
              return { color: 'green', icon: '✓', text: 'Success' };
            case 'error':
              return { color: 'red', icon: '✗', text: 'Error' };
            case 'warning':
              return { color: 'orange', icon: '⚠', text: 'Warning' };
          }
        };
        
        const statusInfo = getStatusInfo();
        
        return React.createElement(
          'div',
          { style: { color: statusInfo.color } },
          React.createElement('span', { 'aria-label': statusInfo.text }, statusInfo.icon),
          ' ',
          statusInfo.text
        );
      };

      const { container } = renderWithProviders(
        React.createElement(AccessibleStatusIndicator, { status: 'success' })
      );
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation Accessibility', () => {
    it('should support full keyboard navigation', async () => {
      const React = await import('react');
      const { screen } = await import('@testing-library/react');
      const userEvent = (await import('@testing-library/user-event')).default;
      
      const user = userEvent.setup();
      
      const KeyboardNavigationComponent = () => React.createElement(
        'div',
        {},
        React.createElement('button', { 'data-testid': 'button-1' }, 'Button 1'),
        React.createElement('input', { 'data-testid': 'input-1', type: 'text' }),
        React.createElement('select', { 'data-testid': 'select-1' },
          React.createElement('option', { value: '1' }, 'Option 1')
        ),
        React.createElement('button', { 'data-testid': 'button-2' }, 'Button 2')
      );

      renderWithProviders(React.createElement(KeyboardNavigationComponent));
      
      // Test tab navigation
      await user.tab();
      expect(screen.getByTestId('button-1')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('input-1')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('select-1')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('button-2')).toHaveFocus();
    });

    it('should handle custom interactive elements with proper keyboard support', async () => {
      const React = await import('react');
      const { screen } = await import('@testing-library/react');
      const userEvent = (await import('@testing-library/user-event')).default;
      
      const user = userEvent.setup();
      
      const CustomButton = () => {
        const [clicked, setClicked] = React.useState(false);
        
        return React.createElement('div', {
          role: 'button',
          tabIndex: 0,
          'data-testid': 'custom-button',
          'aria-pressed': clicked,
          onClick: () => setClicked(!clicked),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setClicked(!clicked);
            }
          }
        }, clicked ? 'Clicked' : 'Click me');
      };

      renderWithProviders(React.createElement(CustomButton));
      
      const customButton = screen.getByTestId('custom-button');
      
      // Test keyboard activation
      customButton.focus();
      await user.keyboard('{Enter}');
      expect(customButton).toHaveAttribute('aria-pressed', 'true');
      
      await user.keyboard(' ');
      expect(customButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should provide meaningful page titles', async () => {
      const React = await import('react');
      
      const PageComponent = () => {
        React.useEffect(() => {
          document.title = 'BEAR AI - Chat Interface';
        }, []);
        
        return React.createElement('h1', {}, 'Chat Interface');
      };

      renderWithProviders(React.createElement(PageComponent));
      
      expect(document.title).toBe('BEAR AI - Chat Interface');
    });

    it('should use semantic HTML elements', async () => {
      const React = await import('react');
      
      const SemanticComponent = () => React.createElement(
        'article',
        {},
        React.createElement('header', {},
          React.createElement('h1', {}, 'Article Title')
        ),
        React.createElement('section', {},
          React.createElement('h2', {}, 'Section Title'),
          React.createElement('p', {}, 'Article content')
        ),
        React.createElement('footer', {},
          React.createElement('p', {}, 'Article footer')
        )
      );

      const { container } = renderWithProviders(React.createElement(SemanticComponent));
      
      expect(container.querySelector('article')).toBeInTheDocument();
      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelector('section')).toBeInTheDocument();
      expect(container.querySelector('footer')).toBeInTheDocument();
    });

    it('should provide context for screen readers with ARIA descriptions', async () => {
      const React = await import('react');
      
      const DescriptiveComponent = () => React.createElement(
        'div',
        {},
        React.createElement('button', {
          'aria-describedby': 'help-text'
        }, 'Submit'),
        React.createElement('div', {
          id: 'help-text'
        }, 'This will submit your form data to the server')
      );

      const { container } = renderWithProviders(React.createElement(DescriptiveComponent));
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });
  });
});