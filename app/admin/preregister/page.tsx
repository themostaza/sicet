'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';
import { useFormValidation } from '@/hooks/use-form-validation';
import { validationRules, ValidationRule } from '@/lib/validation';
import { FormField } from '@/components/form/form-field';

type Role       = 'operator' | 'admin' | 'referrer';
type Status     = 'registered' | 'activated';
type ProfileRow = { id: string; email: string; role: Role; status: Status; created_at: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type PreRegisterFormValues = {
  email: string;
  role: 'operator' | 'admin' | 'referrer';
};

export default function PreRegisterPage() {
  const validationSchema: Record<keyof PreRegisterFormValues, ValidationRule[]> = {
    email: [
      validationRules.required('Email obbligatoria'),
      validationRules.email('Inserisci un indirizzo email valido')
    ],
    role: [
      validationRules.required('Ruolo obbligatorio'),
      validationRules.custom(
        (value: string) => ['operator', 'admin', 'referrer'].includes(value),
        'Ruolo non valido'
      )
    ]
  };

  const {
    formState: { values, errors, touched },
    handleChange,
    handleBlur,
    handleSubmit: handleFormSubmit,
    isSubmitting,
    resetForm
  } = useFormValidation<PreRegisterFormValues>({
    initialValues: {
      email: '',
      role: 'operator'
    },
    validationSchema,
    onSubmit: async (values: PreRegisterFormValues): Promise<void> => {
      try {
        /* già esiste? */
        const { data: already } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', values.email)
          .single();

        if (already) { 
          toast.error('Email già registrata'); 
          return; 
        }

        /* 1. inserisci riga profilo */
        const { error: insErr } = await supabase
          .from('profiles')
          .insert([{ email: values.email, role: values.role, status: 'registered' }]);

        if (insErr) { 
          toast.error('Insert profilo fallito'); 
          return; 
        }

        /* 2. chiama endpoint admin per creare user auth */
        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: values.email, role: values.role })
        });

        if (!res.ok) {
          await supabase.from('profiles').delete().eq('email', values.email);
          const { error } = await res.json();
          toast.error(error || 'Errore createUser');
          return;
        }

        /* 3. invia mail reset-password con redirect + email */
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(values.email, {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/register?email=${encodeURIComponent(values.email)}`
        });

        if (resetErr) { 
          toast.error('Invio mail fallito'); 
          return; 
        }

        toast.success('Mail inviata!');
        resetForm();
        fetchProfiles();
      } catch (error) {
        toast.error('Si è verificato un errore imprevisto');
      }
    }
  });

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  /* carica elenco profili */
  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) toast.error('Errore nel recupero utenti');
    else       setProfiles(data ?? []);
  };

  useEffect(() => { fetchProfiles(); }, []);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Pre-registra Utenti</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Registra Nuovo Utente</CardTitle>
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
                placeholder="Inserisci indirizzo email"
              />

              <FormField
                id="role"
                name="role"
                label="Ruolo"
                type="select"
                value={values.role}
                onChange={(value) => handleChange('role', value)}
                onBlur={() => handleBlur('role')}
                error={touched.role ? errors.role : null}
                options={[
                  { value: 'operator', label: 'Operatore' },
                  { value: 'admin', label: 'Admin' },
                  { value: 'referrer', label: 'Referente' }
                ]}
                required
              />

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Registrazione in corso...' : 'Registra Utente'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Table Card */}
        <Card>
          <CardHeader>
            <CardTitle>Utenti Registrati</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Ruolo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Data Registrazione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>{profile.email}</TableCell>
                    <TableCell className="capitalize">
                      {profile.role === 'operator' ? 'Operatore' :
                       profile.role === 'admin' ? 'Admin' : 'Referente'}
                    </TableCell>
                    <TableCell className="capitalize">
                      {profile.status === 'registered' ? 'Registrato' : 'Attivato'}
                    </TableCell>
                    <TableCell>
                      {new Date(profile.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 