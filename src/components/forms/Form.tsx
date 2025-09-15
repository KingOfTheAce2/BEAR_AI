import React from 'react';

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {}

export const Form = React.forwardRef<HTMLFormElement, FormProps>(
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
