'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { createClientSupabaseClient } from '@/lib/supabase';
import { useFormValidation } from '@/hooks/use-form-validation';
import { validationRules, ValidationRule } from '@/lib/validation';
import { FormField } from '@/components/form/form-field';

const supabase = createClientSupabaseClient();

type RegisterFormValues = {
  password: string;
  confirmPassword: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  const validationSchema: Record<keyof RegisterFormValues, ValidationRule[]> = {
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
  } = useFormValidation<RegisterFormValues>({
    initialValues: {
      password: '',
      confirmPassword: ''
    },
    validationSchema,
    onSubmit: async (values: RegisterFormValues): Promise<void> => {
      if (!email) {
        toast.error('Email non valida');
        return;
      }

      try {
        // Check current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: values.password
          });
          
          if (signInError) {
            toast.error('Errore durante l\'accesso. Riprova più tardi.');
            return;
          }
        }

        // Update password
        const { error: updateError } = await supabase.auth.updateUser({
          password: values.password
        });

        if (updateError) {
          toast.error(`Errore nell'aggiornamento della password: ${updateError.message}`);
          return;
        }

        // Update profile status to activated
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ status: 'activated' })
          .eq('email', email);

        if (profileError) {
          toast.error(`Errore nell'attivazione del profilo: ${profileError.message}`);
          return;
        }

        toast.success('Password impostata con successo!');
        
        // Get user role to redirect appropriately
        const { data: profile, error: roleError } = await supabase
          .from('profiles')
          .select('role')
          .eq('email', email)
          .single();

        if (roleError) {
          toast.error('Errore nel recupero del ruolo utente');
          return;
        }

        // Redirect based on role
        if (profile?.role === 'admin') {
          router.push('/admin');
        } else if (profile?.role === 'operator') {
          router.push('/operator');
        } else {
          router.push('/referrer');
        }
      } catch (error) {
        toast.error('Si è verificato un errore imprevisto');
      }
    }
  });

  useEffect(() => {
    // Redirect if no email in URL
    if (!email) {
      router.push('/');
      return;
    }

    // --- PATCH: Gestione token da hash URL per reset password ---
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.substring(1); // rimuove il #
      const params = new URLSearchParams(hash.replace(/&/g, '&'));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token })
          .then(({ error }) => {
            if (error) {
              console.error('Errore nel setSession Supabase:', error);
              toast.error('Errore di autenticazione. Riprova dal link email.');
            } else {
              // Opzionale: pulisci l'hash dall'URL
              window.location.hash = '';
            }
          });
      }
    }
    // --- FINE PATCH ---

    // Check if user is already activated
    const checkStatus = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('status')
        .eq('email', email)
        .single();

      if (data?.status === 'activated') {
        toast.error('Account già attivato');
        router.push('/');
      }
    };

    checkStatus();
  }, [email, router]);

  if (!email) return null;

  return (
    <div className="container max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>Imposta Nuova Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <FormField
              id="email"
              name="email"
              label="Email"
              type="email"
              value={email || ''}
              onChange={() => {}}
              disabled
              className="bg-muted"
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