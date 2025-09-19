import { forwardRef, FormHTMLAttributes } from 'react';

export interface FormProps extends FormHTMLAttributes<HTMLFormElement> {}

export const Form = forwardRef<HTMLFormElement, FormProps>(
  ({ className, ...props }, ref) => (
    <form ref={ref} className={className} {...props} />
  )
);
Form.displayName = "Form";

export function useForm() {
  return {
    // Simple form hook implementation
    register: (name: string) => ({ name }),
    handleSubmit: (onSubmit: (data: any) => void) => (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      const data = Object.fromEntries(formData.entries());
      onSubmit(data);
    },
    formState: { errors: {} },
  };
}
