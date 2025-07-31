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
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
    isSubmitting
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

      // Redirect: prima verifica redirectTo, poi fallback su ruolo
      if (redirectTo) {
        router.push(redirectTo);
      } else if (profile?.role === 'admin') {
        router.push('/dashboard');
      } else if (profile?.role === 'operator') {
        router.push('/todolist');
      } else {
        router.push('/summary');
      }
    }
  });



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
              type={showPassword ? "text" : "password"}
              value={values.password}
              onChange={(value) => handleChange('password', value)}
              onBlur={() => handleBlur('password')}
              error={touched.password ? errors.password : null}
              placeholder="Inserisci la tua password"
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

            {loginError && (
              <div className="text-red-500 text-sm">{loginError}</div>
            )}

            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Accesso in corso...' : 'Accedi'}
              </Button>
              
              <div className="flex flex-col gap-2 pt-2 border-t">
                <Link href="/reset" className="text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Registrati
                </Link>
                
                <Link href="/reset" className="text-center text-sm text-gray-500 hover:text-gray-700">
                  Password dimenticata?
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 