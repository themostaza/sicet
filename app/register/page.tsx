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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      console.error("RegisterPage: No email provided");
      toast.error('Email non valida');
      return;
    }
    setLoading(true);
    console.log("RegisterPage: Starting password update process for email:", email);

    try {
      // Validate passwords
      if (password !== confirmPassword) {
        console.log("RegisterPage: Passwords do not match");
        toast.error('Le password non coincidono');
        setLoading(false);
        return;
      }

      if (password.length < 8) {
        console.log("RegisterPage: Password too short");
        toast.error('La password deve essere di almeno 8 caratteri');
        setLoading(false);
        return;
      }

      // Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("RegisterPage: Current session:", session ? "exists" : "none", "Error:", sessionError);

      if (!session) {
        console.log("RegisterPage: No active session, attempting to sign in with email");
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInError) {
          console.error("RegisterPage: Sign in error:", signInError);
          toast.error('Errore durante l\'accesso. Riprova più tardi.');
          setLoading(false);
          return;
        }
      }

      // Update password
      console.log("RegisterPage: Attempting to update password");
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error("RegisterPage: Password update error:", updateError);
        toast.error(`Errore nell'aggiornamento della password: ${updateError.message}`);
        setLoading(false);
        return;
      }

      console.log("RegisterPage: Password updated successfully, updating profile status");
      // Update profile status to activated
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ status: 'activated' })
        .eq('email', email);

      if (profileError) {
        console.error("RegisterPage: Profile update error:", profileError);
        toast.error(`Errore nell'attivazione del profilo: ${profileError.message}`);
        setLoading(false);
        return;
      }

      toast.success('Password impostata con successo!');
      
      // Get user role to redirect appropriately
      console.log("RegisterPage: Getting user role for redirect");
      const { data: profile, error: roleError } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', email)
        .single();

      if (roleError) {
        console.error("RegisterPage: Error getting role:", roleError);
        toast.error('Errore nel recupero del ruolo utente');
        setLoading(false);
        return;
      }

      console.log("RegisterPage: Redirecting to role-specific page:", profile?.role);
      // Redirect based on role
      if (profile?.role === 'admin') {
        router.push('/admin');
      } else if (profile?.role === 'operator') {
        router.push('/operator');
      } else {
        router.push('/referrer');
      }

    } catch (error) {
      console.error("RegisterPage: Unexpected error:", error);
      toast.error('Si è verificato un errore imprevisto');
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