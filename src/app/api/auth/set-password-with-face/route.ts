import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  console.log('Set password with face - Request received');
  
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    console.log('Session:', { 
      hasSession: !!session, 
      userId: session?.user?.id,
      userEmail: session?.user?.email 
    });

    if (!session?.user?.id) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newPassword } = await req.json();
    console.log('New password length:', newPassword?.length);

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 });
    }

    try {
      await auth.api.setPassword({
        body: {
          newPassword: newPassword,
        },
        headers: await headers()
      });

      console.log('Password set successfully using Better Auth API');

      return NextResponse.json({ 
        success: true,
        message: 'Password set successfully with face verification' 
      });
    } catch (authError: any) {
      console.error('Better Auth setPassword error:', authError);
      throw authError;
    }
    
  } catch (error: any) {
    console.error('Error setting password with face:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to set password' 
    }, { status: 500 });
  }
}
