import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Testing Supabase credentials...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Test 1: List users
    console.log('Testing listUsers...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json({ 
        error: 'Failed to list users', 
        details: listError.message 
      }, { status: 500 });
    }

    console.log('Successfully listed users:', users?.length || 0);

    // Test 2: Try to create a test user
    console.log('Testing createUser...');
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true
    });

    if (createError) {
      console.error('Error creating test user:', createError);
      return NextResponse.json({ 
        error: 'Failed to create test user', 
        details: createError.message 
      }, { status: 500 });
    }

    console.log('Successfully created test user:', user?.id);

    // Test 3: Delete the test user
    console.log('Testing deleteUser...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user!.id);

    if (deleteError) {
      console.error('Error deleting test user:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete test user', 
        details: deleteError.message 
      }, { status: 500 });
    }

    console.log('Successfully deleted test user');

    return NextResponse.json({ 
      success: true, 
      message: 'All auth tests passed',
      usersCount: users?.length || 0
    });

  } catch (error) {
    console.error('Error in auth test:', error);
    return NextResponse.json({ 
      error: 'Auth test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 