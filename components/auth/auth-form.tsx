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
import { Eye, EyeOff } from 'lucide-react';

const supabase = createClientSupabaseClient();

type AuthFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

type AuthFormProps = {
  mode: 'register' | 'reset';
  title?: string;
  submitText?: string;
  loadingText?: string;
};

export default function AuthForm({ 
  mode, 
  title, 
  submitText, 
  loadingText 
}: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');

  const validationSchema: Record<keyof AuthFormValues, ValidationRule[]> = {
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
  } = useFormValidation<AuthFormValues>({
    initialValues: {
      email: emailParam || '',
      password: '',
      confirmPassword: ''
    },
    validationSchema,
    onSubmit: async (values: AuthFormValues): Promise<void> => {
      try {
        if (mode === 'register') {
          // Logica per registrazione
          await handleRegister(values);
        } else {
          // Logica per reset password
          await handleResetPassword(values);
        }
      } catch (error) {
        toast.error('Si è verificato un errore imprevisto');
      }
    }
  });

  const handleRegister = async (values: AuthFormValues) => {
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
    router.push('/auth/login');
  };

  const handleResetPassword = async (values: AuthFormValues) => {
    // Verifica se l'email esiste in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', values.email)
      .single();

    if (profileError || !profile) {
      toast.error('Email non trovata nel sistema. Contatta l\'amministratore per essere registrato.');
      return;
    }

    // Verifica che lo stato sia 'reset-password'
    if (profile.status !== 'reset-password') {
      if (profile.status === 'activated') {
        toast.error('Account già attivato. Usa la funzione "Password dimenticata" se hai dimenticato la password.');
      } else {
        toast.error('Account non ancora autorizzato. Contatta l\'amministratore.');
      }
      return;
    }

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
    router.push('/auth/login');
  };

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

  const defaultTitle = mode === 'register' ? 'Registrazione Account' : 'Completa Registrazione';
  const defaultSubmitText = mode === 'register' ? 'Registrati' : 'Completa Registrazione';
  const defaultLoadingText = mode === 'register' ? 'Registrazione in corso...' : 'Completamento registrazione...';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="container max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>{title || defaultTitle}</CardTitle>
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
              type={showPassword ? "text" : "password"}
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
              placeholder={mode === 'register' ? 'Inserisci password' : 'Imposta la tua password'}
              required
              endAdornment={
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            <FormField
              id="confirmPassword"
              name="confirmPassword"
              label="Conferma Password"
              type={showConfirmPassword ? "text" : "password"}
              value={values.confirmPassword}
              onChange={(value) => handleChange('confirmPassword', value)}
              onBlur={() => handleBlur('confirmPassword')}
              error={touched.confirmPassword ? errors.confirmPassword : null}
              placeholder={mode === 'register' ? 'Conferma password' : 'Conferma la tua password'}
              required
              endAdornment={
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Nascondi password' : 'Mostra password'}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (loadingText || defaultLoadingText) : (submitText || defaultSubmitText)}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 