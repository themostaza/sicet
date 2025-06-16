'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useFormValidation } from '@/hooks/use-form-validation';
import { validationRules } from '@/lib/validation';
import { FormField } from '@/components/form/form-field';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loginError, setLoginError] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const validationSchema = {
    email: [
      validationRules.required('Email obbligatoria'),
      validationRules.email('Inserisci un indirizzo email valido')
    ],
    password: [
      validationRules.required('Password obbligatoria'),
      validationRules.minLength(8, 'La password deve essere di almeno 8 caratteri')
    ]
  };

  const {
    formState: { values, errors, touched },
    handleChange,
    handleBlur,
    handleSubmit: handleFormSubmit,
    isSubmitting,
    validateFields
  } = useFormValidation({
    initialValues: {
      email: '',
      password: ''
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoginError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setLoginError('Email o password non corretti');
        return;
      }

      // Get user role to redirect appropriately
      const { data: profile, error: roleError } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', values.email)
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
    }
  });

  const handleResetPassword = async () => {
    // Validate email field
    const emailValidation = validateFields();
    if (!emailValidation || !values.email) {
      toast.error('Inserisci un indirizzo email valido');
      return;
    }

    setIsResettingPassword(true);
    try {
      // Check if user exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', values.email)
        .single();

      if (!profile) {
        toast.error('Email non registrata');
        return;
      }

      // Send reset password email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/register?email=${encodeURIComponent(values.email)}&source=user`
      });

      if (resetError) {
        toast.error('Errore nell\'invio della mail di reset');
        return;
      }

      toast.success('Email di reset password inviata!');
    } catch (error) {
      toast.error('Si è verificato un errore imprevisto');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Accedi al sistema di gestione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
            <FormField
              id="email"
              name="email"
              label="Email"
              value={values.email}
              onChange={(value) => handleChange('email', value)}
              onBlur={() => handleBlur('email')}
              error={touched.email ? errors.email : null}
              placeholder="Inserisci la tua email"
            />

            <FormField
              id="password"
              name="password"
              label="Password"
              type="password"
              value={values.password}
              onChange={(value) => handleChange('password', value)}
              onBlur={() => handleBlur('password')}
              error={touched.password ? errors.password : null}
              placeholder="Inserisci la tua password"
            />

            {loginError && (
              <div className="text-red-500 text-sm">{loginError}</div>
            )}

            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Accesso in corso...' : 'Accedi'}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleResetPassword}
                disabled={isResettingPassword || !values.email}
              >
                {isResettingPassword ? 'Invio in corso...' : 'Reset Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 