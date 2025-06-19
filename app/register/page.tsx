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
  email: string;
  password: string;
  confirmPassword: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');
  const source = searchParams.get('source');
  const reset = searchParams.get('reset');

  const validationSchema: Record<keyof RegisterFormValues, ValidationRule[]> = {
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
  } = useFormValidation<RegisterFormValues>({
    initialValues: {
      email: emailParam || '',
      password: '',
      confirmPassword: ''
    },
    validationSchema,
    onSubmit: async (values: RegisterFormValues): Promise<void> => {
      try {
        // Verifica se l'email esiste in profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', values.email)
          .single();

        if (profileError || !profile) {
          toast.error('Email non autorizzata per la registrazione. Contatta l\'amministratore.');
          return;
        }

        // Se reset=true, gestisci l'impostazione della nuova password
        if (reset === 'true') {
          // Check current user
          const { data: { user }, error: userError } = await supabase.auth.getUser();

          if (userError) {
            toast.error('Errore durante la verifica dell\'utente. Riprova più tardi.');
            return;
          }

          if (!user) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: values.email,
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

          toast.success('Password aggiornata con successo!');
          router.push('/auth/login');
          return;
        }

        // Se source === 'user', gestisci reset password per utenti già attivati
        if (source === 'user') {
          if (profile.status !== 'activated') {
            toast.error('Account non ancora attivato. Completa prima la registrazione.');
            return;
          }

          // Invia email di reset password
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/register?email=${encodeURIComponent(values.email)}&source=user&reset=true`
          });

          if (resetError) {
            toast.error(`Errore nell'invio della mail di reset: ${resetError.message}`);
            return;
          }

          toast.success('Email di reset password inviata! Controlla la tua casella email.');
          return;
        }

        // Per la registrazione normale, verifica che l'account non sia già attivato
        if (profile.status === 'activated') {
          toast.error('Account già attivato. Usa la funzione "Reset Password" se hai dimenticato la password.');
          return;
        }

        // Crea l'account Supabase tramite API
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            role: profile.role
          })
        });

        const result = await response.json();

        if (!response.ok) {
          toast.error(result.error || 'Errore durante la registrazione');
          return;
        }

        toast.success('Registrazione completata con successo! Ora puoi accedere.');
        
        // Redirect al login
        router.push('/auth/login');
      } catch (error) {
        toast.error('Si è verificato un errore imprevisto');
      }
    }
  });

  // Se c'è un email nei parametri, impostalo nel form
  useEffect(() => {
    if (emailParam) {
      setFieldValue('email', emailParam);
    }

    // Gestione token da hash URL per reset password
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
  }, [emailParam, setFieldValue]);

  // Se reset=true, mostra il form per impostare la nuova password
  if (reset === 'true') {
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
                value={values.email}
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

  // Se source === 'user', mostra solo il form di reset password
  if (source === 'user') {
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
                {isSubmitting ? 'Reset password...' : 'Reset Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>Registrazione Account</CardTitle>
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
              label="Password"
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
              placeholder="Inserisci password"
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
              placeholder="Conferma password"
              required
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Registrazione in corso...' : 'Registrati'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}