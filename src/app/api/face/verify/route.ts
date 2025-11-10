import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

/**
 * Verify user's face for authentication
 * Can be used for logged-in users or during face login (with email param)
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const threshold = parseFloat(formData.get('threshold') as string) || 0.6;
    const emailParam = formData.get('email') as string | null;

    if (!imageFile) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    let userEmail: string;
    
    // If email is provided (face login flow), use that
    if (emailParam) {
      userEmail = emailParam;
    } else {
      // Otherwise require authenticated user
      const { user } = await getUserFromRequest(req);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userEmail = user.email;
    }

    // Forward request to Face Recognition API
    const faceApiUrl = process.env.FACE_API_URL || 'http://localhost:8000';
    const faceFormData = new FormData();
    faceFormData.append('file', imageFile);

    const url = new URL(`${faceApiUrl}/recognize/`);
    url.searchParams.append('threshold', threshold.toString());

    const faceApiResponse = await fetch(url.toString(), {
      method: 'POST',
      body: faceFormData,
    });

    if (!faceApiResponse.ok) {
      const error = await faceApiResponse.json();
      return NextResponse.json(
        { error: error.detail || 'Face recognition failed' },
        { status: faceApiResponse.status }
      );
    }

    const recognitionData = await faceApiResponse.json();

    console.log('🔍 Face Recognition Result:', {
      recognized: recognitionData.recognized,
      user_id: recognitionData.user_id,
      user_email: recognitionData.user_email,
      worker_id: recognitionData.worker_id,
      confidence: recognitionData.confidence_score,
      threshold: recognitionData.threshold_used,
      targetEmail: userEmail
    });

    // Check if recognized face matches the target user email
    // The Face API returns worker_id, user_id, and user_email (all same value: email)
    const detectedEmail = recognitionData.worker_id || recognitionData.user_id || recognitionData.user_email;
    const isMatch = recognitionData.recognized && detectedEmail === userEmail;

    console.log('✅ Match Result:', {
      isMatch,
      detectedEmail,
      targetEmail: userEmail
    });

    return NextResponse.json({
      success: isMatch,
      matched: isMatch,
      confidence: recognitionData.confidence_score,
      threshold: recognitionData.threshold_used,
      message: isMatch 
        ? 'Face verified successfully' 
        : recognitionData.recognized 
          ? `Face recognized but belongs to different user (${detectedEmail})`
          : 'Face not recognized',
      details: {
        recognized: recognitionData.recognized,
        detectedUser: detectedEmail,
        currentUser: userEmail,
        detectionQuality: recognitionData.detection_quality,
        comparisonStats: recognitionData.comparison_stats,
        userDetails: recognitionData.worker_details || recognitionData.user_details,
      },
    });
  } catch (error: any) {
    console.error('Face verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
