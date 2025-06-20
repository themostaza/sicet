'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { createClientSupabaseClient } from '@/lib/supabase';
import { useFormValidation } from '@/hooks/use-form-validation';
import { validationRules, ValidationRule } from '@/lib/validation';
import { FormField } from '@/components/form/form-field';

const supabase = createClientSupabaseClient();

type ResetFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

export default function ResetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const validationSchema: Record<keyof ResetFormValues, ValidationRule[]> = {
    email: [
      validationRules.required('Email obbligatoria'),
      validationRules.email('Inserisci un indirizzo email valido')
    ],
    password: [
      validationRules.required('Password obbligatoria'),
      validationRules.minLength(8, 'La password deve essere di almeno 8 caratteri'),
      validationRules.pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/,
        'La password deve contenere almeno una lettera maiuscola, una minuscola, un numero e un carattere speciale'
      )
    ],
    confirmPassword: [
      validationRules.required('Conferma password obbligatoria'),
      validationRules.custom(
        (value: string) => value === values.password,
        'Le password non coincidono'
      )
    ]
  };

  const {
    formState: { values, errors, touched },
    handleChange,
    handleBlur,
    handleSubmit: handleFormSubmit,
    isSubmitting,
    setFieldValue
  } = useFormValidation<ResetFormValues>({
    initialValues: {
      email: emailParam || '',
      password: '',
      confirmPassword: ''
    },
    validationSchema,
    onSubmit: async (values: ResetFormValues): Promise<void> => {
      try {
        // Chiama l'endpoint API per il reset password
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: values.email,
            password: values.password
          })
        });

        const result = await response.json();

        if (!response.ok) {
          toast.error(result.error || 'Errore durante il reset password');
          return;
        }

        toast.success('Password impostata con successo! Ora puoi accedere.');
        
        // Redirect al login
        router.push('/auth/login');
      } catch (error) {
        toast.error('Si è verificato un errore imprevisto');
      }
    }
  });

  // Se c'è un email nei parametri, impostalo nel form
  useEffect(() => {
    if (emailParam && isClient) {
      setFieldValue('email', emailParam);
    }
  }, [emailParam, setFieldValue, isClient]);

  // Non renderizzare nulla finché non siamo lato client
  if (!isClient) {
    return (
      <div className="container max-w-md mx-auto py-12">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <FormField
              id="email"
              name="email"
              label="Email"
              type="email"
              value={values.email}
              onChange={(value) => handleChange('email', value)}
              onBlur={() => handleBlur('email')}
              error={touched.email ? errors.email : null}
              placeholder="Inserisci la tua email"
              required
            />

            <FormField
              id="password"
              name="password"
              label="Nuova Password"
              type="password"
              value={values.password}
              onChange={(value) => {
                handleChange('password', value);
                // Revalidate confirm password when password changes
                if (touched.confirmPassword) {
                  handleBlur('confirmPassword');
                }
              }}
              onBlur={() => handleBlur('password')}
              error={touched.password ? errors.password : null}
              placeholder="Inserisci nuova password"
              required
            />

            <FormField
              id="confirmPassword"
              name="confirmPassword"
              label="Conferma Password"
              type="password"
              value={values.confirmPassword}
              onChange={(value) => handleChange('confirmPassword', value)}
              onBlur={() => handleBlur('confirmPassword')}
              error={touched.confirmPassword ? errors.confirmPassword : null}
              placeholder="Conferma nuova password"
              required
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Impostazione password...' : 'Imposta Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 