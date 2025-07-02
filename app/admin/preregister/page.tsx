'use client';

import { useState, useEffect } from 'react';
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
import { useFormValidation } from '@/hooks/use-form-validation';
import { validationRules, ValidationRule } from '@/lib/validation';
import { FormField } from '@/components/form/form-field';
import { UserDeleteDialog } from '@/app/admin/user-delete-dialog';
import { useToast } from '@/components/ui/use-toast';
import { preregisterUser, getPreregisteredUsers } from '@/app/actions/actions-user';

type Role       = 'operator' | 'admin' | 'referrer';
type Status     = 'registered' | 'activated' | 'reset-password' | 'deleted';
type ProfileRow = { id: string; email: string; role: Role; status: Status; created_at: string };

type PreRegisterFormValues = {
  email: string;
  role: 'operator' | 'admin' | 'referrer';
};

export default function PreRegisterPage() {
  const [isClient, setIsClient] = useState(false);
  const { toast: shadcnToast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

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
        await preregisterUser(values.email, values.role);
        toast.success('Utente pre-registrato con successo! L\'utente può ora andare su /reset per impostare la password.');
        resetForm();
        fetchProfiles();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Errore durante la pre-registrazione');
      }
    }
  });

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  /* carica elenco profili */
  const fetchProfiles = async () => {
    try {
      const result = await getPreregisteredUsers();
      setProfiles((result.profiles || []).map(profile => ({
        ...profile,
        role: profile.role as Role,
        status: profile.status as Status
      })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore nel recupero utenti');
    }
  };

  useEffect(() => { 
    if (isClient) {
      fetchProfiles(); 
    }
  }, [isClient]);

  // Mostra toast informativo se ci sono utenti in stato reset-password
  useEffect(() => {
    if (isClient && profiles.length > 0) {
      const resetPasswordUsers = profiles.filter(p => p.status === 'reset-password');
      if (resetPasswordUsers.length > 0) {
        shadcnToast({
          title: "Utenti in attesa di impostare password",
          description: `${resetPasswordUsers.length} utente${resetPasswordUsers.length > 1 ? 'i' : ''} ${resetPasswordUsers.length > 1 ? 'sono' : 'è'} in attesa di impostare la password. Possono andare su /reset per completare la registrazione.`,
          duration: 5000,
        });
      }
    }
  }, [profiles, isClient, shadcnToast]);

  // Non renderizzare nulla finché non siamo lato client
  if (!isClient) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
            <div className="lg:col-span-3">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Pre-registra Utenti</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Form Card - now takes 1/4 of the space */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Pre-registra Nuovo Utente</CardTitle>
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

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Pre-registrazione in corso...' : 'Pre-registra Utente'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Table Card - now takes 3/4 of the space */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Utenti Pre-registrati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Email</TableHead>
                    <TableHead className="w-[20%]">Ruolo</TableHead>
                    <TableHead className="w-[20%]">Stato</TableHead>
                    <TableHead className="w-[20%]">Data Pre-registrazione</TableHead>
                    <TableHead className="w-[10%] text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.email}</TableCell>
                      <TableCell className="capitalize">
                        {profile.role === 'operator' ? 'Operatore' :
                         profile.role === 'admin' ? 'Admin' : 'Referente'}
                      </TableCell>
                      <TableCell className="capitalize">
                        {profile.status === 'registered' ? 'Pre-registrato' :
                         profile.status === 'activated' ? 'Attivato' : 
                         profile.status === 'reset-password' ? 'Reset Password' :
                         profile.status === 'deleted' ? 'Cancellato' : profile.status}
                      </TableCell>
                      <TableCell>
                        {new Date(profile.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/admin/reset-password', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ email: profile.email })
                                });

                                const result = await response.json();

                                if (!response.ok) {
                                  toast.error(result.error || 'Errore durante il reset password');
                                  return;
                                }

                                toast.success('Reset password attivato per ' + profile.email);
                                fetchProfiles();
                              } catch (error) {
                                toast.error('Si è verificato un errore imprevisto');
                              }
                            }}
                            disabled={profile.status === 'reset-password'}
                            title={profile.status === 'reset-password' ? 'Utente già in attesa di impostare password' : 'Attiva reset password per questo utente'}
                          >
                            Reset Password
                          </Button>
                          <UserDeleteDialog 
                            userId={profile.id} 
                            userEmail={profile.email} 
                            onDelete={() => {
                              // Refresh the profiles list from the server
                              fetchProfiles();
                            }} 
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 