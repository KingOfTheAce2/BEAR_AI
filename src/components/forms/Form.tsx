import React from 'react'
import { cn } from '@/utils/cn'
import { ComponentProps, FormField, ValidationRule } from '@/types'

export interface FormProps extends ComponentProps {
  onSubmit: (data: Record<string, any>) => void | Promise<void>
  fields: FormField[]
  initialData?: Record<string, any>
  loading?: boolean
  resetOnSubmit?: boolean
  validateOnChange?: boolean
  validateOnSubmit?: boolean
}

interface FormContextValue {
  data: Record<string, any>
  errors: Record<string, string>
  setFieldValue: (name: string, value: any) => void
  setFieldError: (name: string, error: string) => void
  clearFieldError: (name: string) => void
}

const FormContext = React.createContext<FormContextValue | undefined>(undefined)

const useForm = () => {
  const context = React.useContext(FormContext)
  if (!context) {
    throw new Error('useForm must be used within a Form component')
  }
  return context
}

const validateField = (value: any, rules: ValidationRule[] = []): string | null => {
  for (const rule of rules) {
    switch (rule.type) {
      case 'required':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return rule.message
        }
        break
      case 'email':
        if (value && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) {
          return rule.message
        }
        break
      case 'min':
        if (value && value.length < rule.value) {
          return rule.message
        }
        break
      case 'max':
        if (value && value.length > rule.value) {
          return rule.message
        }
        break
      case 'pattern':
        if (value && !new RegExp(rule.value).test(value)) {
          return rule.message
        }
        break
      case 'custom':
        if (rule.validator && !rule.validator(value)) {
          return rule.message
        }
        break
    }
  }
  return null
}

const Form: React.FC<FormProps> = ({
  onSubmit,
  fields,
  initialData = {},
  loading = false,
  resetOnSubmit = false,
  validateOnChange = true,
  validateOnSubmit = true,
  children,
  className,
}) => {
  const [data, setData] = React.useState<Record<string, any>>(initialData)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const setFieldValue = (name: string, value: any) => {
    setData(prev => ({ ...prev, [name]: value }))
    
    if (validateOnChange) {
      const field = fields.find(f => f.name === name)
      if (field && field.validation) {
        const error = validateField(value, field.validation)
        if (error) {
          setErrors(prev => ({ ...prev, [name]: error }))
        } else {
          setErrors(prev => {
            const { [name]: _, ...rest } = prev
            return rest
          })
        }
      }
    }
  }

  const setFieldError = (name: string, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  const clearFieldError = (name: string) => {
    setErrors(prev => {
      const { [name]: _, ...rest } = prev
      return rest
    })
  }

  const validateForm = (): boolean => {
    if (!validateOnSubmit) return true

    const newErrors: Record<string, string> = {}
    
    fields.forEach(field => {
      const value = data[field.name]
      const error = validateField(value, field.validation)
      if (error) {
        newErrors[field.name] = error
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSubmitting || loading) return

    if (!validateForm()) return

    setIsSubmitting(true)
    
    try {
      await onSubmit(data)
      
      if (resetOnSubmit) {
        setData(initialData)
        setErrors({})
      }
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const contextValue: FormContextValue = {
    data,
    errors,
    setFieldValue,
    setFieldError,
    clearFieldError,
  }

  return (
    <FormContext.Provider value={contextValue}>
      <form
        onSubmit={handleSubmit}
        className={cn('space-y-4', className)}
        noValidate
      >
        {children}
      </form>
    </FormContext.Provider>
  )
}

export { Form, useForm }