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

type Role       = 'operator' | 'admin' | 'referrer';
type Status     = 'registered' | 'activated';
type ProfileRow = { id: string; email: string; role: Role; status: Status; created_at: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PreRegisterPage() {
  const [email, setEmail]         = useState('');
  const [role, setRole]           = useState<Role>('operator');
  const [profiles, setProfiles]   = useState<ProfileRow[]>([]);
  const [loading, setLoading]     = useState(false);

  /* carica elenco profili */
  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) toast.error('Errore nel recupero utenti');
    else       setProfiles(data ?? []);
  };

  /* submit nuova preregistrazione */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      /* già esiste? */
      const { data: already } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (already) { toast.error('Email già registrata'); return; }

      /* 1. inserisci riga profilo */
      const { error: insErr } = await supabase
        .from('profiles')
        .insert([{ email, role, status: 'registered' }]);

      if (insErr) { toast.error('Insert profilo fallito'); return; }

      /* 2. chiama endpoint admin per creare user auth */
      const res = await fetch('/api/admin/create-user', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ email, role })
      });

      if (!res.ok) {
        await supabase.from('profiles').delete().eq('email', email);
        const { error } = await res.json();
        toast.error(error || 'Errore createUser');
        return;
      }

      /* 3. invia mail reset-password con redirect + email */
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/register?email=${encodeURIComponent(email)}`
      });

      if (resetErr) { toast.error('Invio mail fallito'); return; }

      toast.success('Mail inviata!');
      setEmail('');
      setRole('operator');
      fetchProfiles();
    } finally {
      setLoading(false);
    }
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Inserisci indirizzo email"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="role" className="text-sm font-medium">
                  Ruolo
                </label>
                <Select
                  value={role}
                  onValueChange={(value: 'operator' | 'admin' | 'referrer') =>
                    setRole(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operator">Operatore</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="referrer">Referente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Registrazione in corso...' : 'Registra Utente'}
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