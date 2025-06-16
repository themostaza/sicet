'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useFormValidation } from '@/hooks/use-form-validation';
import { validationRules } from '@/lib/validation';
import { FormField } from '@/components/form/form-field';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const validationSchema = {
    email: [
      validationRules.required('Email obbligatoria'),
      validationRules.email('Inserisci un indirizzo email valido')
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
      email: ''
    },
    validationSchema,
    onSubmit: async (values) => {
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
        router.push('/auth/login');
      } catch (error) {
        toast.error('Si è verificato un errore imprevisto');
      } finally {
        setIsResettingPassword(false);
      }
    }
  });

  return (
    <div className="container max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            Inserisci la tua email per ricevere il link di reset password
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

            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={isResettingPassword}>
                {isResettingPassword ? 'Invio in corso...' : 'Invia Email di Reset'}
              </Button>
              
              <Link href="/auth/login" className="text-center text-sm text-gray-500 hover:text-gray-700">
                Torna al login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 