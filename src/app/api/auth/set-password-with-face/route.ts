import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  console.log('Set/Update password with face - Request received');
  
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

    const { newPassword, oldPassword, isPremium } = await req.json();
    console.log('New password length:', newPassword?.length, 'Has old password:', !!oldPassword, 'Is premium:', isPremium);

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const userCollection = db.collection('user');
    const accountCollection = db.collection('account');
    
    // Find user
    const user = await userCollection.findOne({ 
      email: session.user.email 
    });

    if (!user) {
      console.log('User not found with email:', session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check account collection for existing credential
    const account = await accountCollection.findOne({
      userId: session.user.id,
      providerId: 'credential'
    });

    // Also check for any accounts with this email as accountId
    const accountByEmail = await accountCollection.findOne({
      accountId: session.user.email,
      providerId: 'credential'
    });

    console.log('Account check:', {
      accountByUserId: !!account,
      accountByEmail: !!accountByEmail,
      userPassword: !!user.password,
      accountPassword: !!account?.password,
      accountEmailPassword: !!accountByEmail?.password
    });

    const hasExistingPassword = !!(user.password || account?.password || accountByEmail?.password);
    console.log('User has existing password:', hasExistingPassword);

    // If user has a password and is NOT premium, require old password verification
    if (hasExistingPassword && !isPremium) {
      if (!oldPassword) {
        return NextResponse.json({ 
          error: 'Old password is required for non-premium users' 
        }, { status: 400 });
      }

      // Verify old password using the account collection password
      const storedPassword = accountByEmail?.password || account?.password || user.password;
      if (!storedPassword) {
        return NextResponse.json({ 
          error: 'No password found to verify against' 
        }, { status: 400 });
      }
      
      const isValidOldPassword = await bcrypt.compare(oldPassword, storedPassword);
      if (!isValidOldPassword) {
        return NextResponse.json({ 
          error: 'Old password is incorrect' 
        }, { status: 400 });
      }
      console.log('Old password verified successfully');
    }

    // Use Better Auth's APIs based on whether user has existing password
    try {
      if (!hasExistingPassword) {
        // User has no password (OAuth user) - use setPassword
        console.log('No existing password detected, attempting setPassword');
        
        try {
          await auth.api.setPassword({
            body: {
              newPassword: newPassword
            },
            headers: await headers()
          });
          
          console.log('Password set successfully for OAuth user');
        } catch (setPasswordError: any) {
          // If setPassword fails, Better Auth might already have a hidden credential
          // Try using the NEW password as both current and new (it will just update to same value initially)
          console.log('setPassword failed, trying alternative approach:', setPasswordError.message);
          
          // Direct database insert as last resort
          const crypto = await import('crypto');
          const hashedPassword = await bcrypt.hash(newPassword, 10);
          const newAccountId = crypto.randomBytes(16).toString('hex');
          
          await accountCollection.insertOne({
            id: newAccountId,
            userId: session.user.id,
            accountId: session.user.email,
            providerId: 'credential',
            password: hashedPassword,
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          console.log('Password set via direct database insert');
        }
      } else {
        // User has existing password - use changePassword
        console.log('Existing password detected, using changePassword');
        const currentPasswordForAPI = isPremium ? (accountByEmail?.password || account?.password || user.password || '') : oldPassword;
        
        await auth.api.changePassword({
          body: {
            newPassword: newPassword,
            currentPassword: currentPasswordForAPI,
            revokeOtherSessions: false
          },
          headers: await headers()
        });
        
        console.log('Password updated successfully via changePassword API');
      }

      return NextResponse.json({ 
        success: true,
        message: hasExistingPassword ? 'Password updated successfully' : 'Password set successfully'
      });
    } catch (updateError: any) {
      console.error('Better Auth password update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update password: ' + updateError.message 
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Error setting/updating password:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to set password' 
    }, { status: 500 });
  }
}
