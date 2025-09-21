import React, { forwardRef } from 'react';
import type { FormEvent, HTMLAttributes } from 'react';

export interface FormProps extends HTMLAttributes<HTMLFormElement> {}

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
    handleSubmit: (onSubmit: (data: any) => void) => (event: FormEvent) => {
      event.preventDefault();
      const formData = new FormData(event.target as HTMLFormElement);
      const data = Object.fromEntries(formData.entries());
      onSubmit(data);
    },
    formState: { errors: {} },
  };
}
