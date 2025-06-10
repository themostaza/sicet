'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { createClientSupabaseClient } from '@/lib/supabase';

const supabase = createClientSupabaseClient();

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Redirect if no email in URL
    if (!email) {
      router.push('/');
      return;
    }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate passwords
      if (password !== confirmPassword) {
        toast.error('Le password non coincidono');
        return;
      }

      if (password.length < 8) {
        toast.error('La password deve essere di almeno 8 caratteri');
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        toast.error('Errore nell\'aggiornamento della password');
        return;
      }

      // Update profile status to activated
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ status: 'activated' })
        .eq('email', email);

      if (profileError) {
        toast.error('Errore nell\'attivazione del profilo');
        return;
      }

      toast.success('Password impostata con successo!');
      
      // Get user role to redirect appropriately
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', email)
        .single();

      // Redirect based on role
      if (profile?.role === 'admin') {
        router.push('/admin');
      } else if (profile?.role === 'operator') {
        router.push('/operator');
      } else {
        router.push('/referrer');
      }

    } catch (error) {
      toast.error('Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

  return (
    <div className="container max-w-md mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>Imposta Nuova Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Nuova Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci nuova password"
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Conferma Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Conferma nuova password"
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Impostazione password...' : 'Imposta Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}