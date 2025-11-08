import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import UserLearningProfile from '@/models/UserLearningProfile';

export const dynamic = 'force-dynamic';

// Check if user has completed onboarding
export async function GET(request) {
  try {
    const { user } = await getUserFromRequest(request);
    await connectToDatabase();

    console.log('Checking onboarding for user:', user._id.toString());
    
    // Try both formats - ObjectId and string
    const profile = await UserLearningProfile.findOne({
      $or: [
        { userId: user._id },
        { userId: user._id.toString() }
      ]
    });
    
    console.log('Profile found:', !!profile, profile ? `userId: ${profile.userId}` : 'none');

    return NextResponse.json({
      hasCompletedOnboarding: !!profile,
      profile: profile || null
    });
  } catch (error) {
    console.error('Onboarding check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Save onboarding data
export async function POST(request) {
  try {
    let user;
    try {
      const result = await getUserFromRequest(request);
      user = result.user;
    } catch (authErr) {
      console.error('Auth error in onboarding:', authErr.message);
      return NextResponse.json(
        { error: `Authentication failed: ${authErr.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const data = await request.json();
    console.log('Onboarding POST - Raw data received:', data);

    const normalize = (raw) => {
      const out = { ...raw };

      // willingToLearn mapping
      const willingMap = {
        yes: 'very_willing',
        'very': 'very_willing',
        'very_willing': 'very_willing',
        some: 'somewhat_willing',
        'somewhat': 'somewhat_willing',
        'somewhat_willing': 'somewhat_willing',
        no: 'not_willing',
        'not': 'not_willing',
        'not_willing': 'not_willing'
      };

      if (typeof out.willingToLearn === 'string') {
        const key = out.willingToLearn.trim().toLowerCase();
        out.willingToLearn = willingMap[key] || out.willingToLearn;
      }

      // activityLevel mapping
      const activityMap = {
        very: 'very_active',
        'very_active': 'very_active',
        active: 'active',
        casual: 'somewhat_active',
        somewhat: 'somewhat_active',
        'somewhat_active': 'somewhat_active',
        intense: 'very_active',
        regular: 'active',
        inactive: 'inactive'
      };

      if (typeof out.activityLevel === 'string') {
        const key = out.activityLevel.trim().toLowerCase();
        out.activityLevel = activityMap[key] || out.activityLevel;
      }

      // commitmentLevel mapping
      const commitMap = {
        very: 'very_committed',
        'very_committed': 'very_committed',
        committed: 'committed',
        some: 'somewhat_committed',
        'somewhat': 'somewhat_committed',
        'somewhat_committed': 'somewhat_committed',
        flexible: 'exploring',
        exploring: 'exploring',
        dedicated: 'very_committed'
      };

      if (typeof out.commitmentLevel === 'string') {
        const key = out.commitmentLevel.trim().toLowerCase();
        out.commitmentLevel = commitMap[key] || out.commitmentLevel;
      }

      // Ensure languagesToLearn is an array
      if (out.languagesToLearn && !Array.isArray(out.languagesToLearn)) {
        out.languagesToLearn = typeof out.languagesToLearn === 'string' ? out.languagesToLearn.split(',').map(s => s.trim()).filter(Boolean) : [out.languagesToLearn];
      }

      // Ensure numeric fields are numbers
      if (out.age !== undefined) out.age = out.age === '' ? undefined : Number(out.age);
      if (out.yearsOfCoding !== undefined) out.yearsOfCoding = out.yearsOfCoding === '' ? undefined : Number(out.yearsOfCoding);
      if (out.hoursPerWeek !== undefined) out.hoursPerWeek = out.hoursPerWeek === '' ? undefined : Number(out.hoursPerWeek);
      if (out.projectsCompleted !== undefined) out.projectsCompleted = out.projectsCompleted === '' ? undefined : Number(out.projectsCompleted);

      return out;
    };

    const normalized = normalize(data || {});
    console.log('Onboarding payload normalized:', normalized);

    // Check if profile already exists
    let profile = await UserLearningProfile.findOne({ userId: user._id });

    if (profile) {
      // Update existing profile
      console.log('Updating existing profile for user:', user._id.toString());
      Object.assign(profile, normalized);
      await profile.save();
    } else {
      // Create new profile
      console.log('Creating new profile for user:', user._id.toString());
      profile = await UserLearningProfile.create({
        userId: user._id,
        ...normalized
      });
    }

    console.log('Onboarding saved successfully for user:', user._id.toString());

    return NextResponse.json({
      success: true,
      profile: profile.toObject(),
      message: 'Learning profile saved successfully'
    });
  } catch (error) {
    console.error('Onboarding save error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to save onboarding data',
        details: error.stack 
      },
      { status: 500 }
    );
  }
}

// Update specific fields
export async function PATCH(request) {
  try {
    const { user } = await getUserFromRequest(request);
    await connectToDatabase();

    const updates = await request.json();

    const profile = await UserLearningProfile.findOneAndUpdate(
      { userId: user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: profile.toObject()
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
