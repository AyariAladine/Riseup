import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

/**
 * Verify user's face for authentication
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const threshold = parseFloat(formData.get('threshold') as string) || 0.6;

    if (!imageFile) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
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

    // Check if recognized face matches current user (changed from worker_id to user_email)
    const isMatch = recognitionData.recognized && recognitionData.user_email === user.email;

    return NextResponse.json({
      success: isMatch,
      matched: isMatch,
      confidence: recognitionData.confidence_score,
      threshold: recognitionData.threshold_used,
      message: isMatch 
        ? 'Face verified successfully' 
        : 'Face does not match registered user',
      details: {
        recognized: recognitionData.recognized,
        detectedUser: recognitionData.user_email, // Changed from worker_id
        currentUser: user.email,
        detectionQuality: recognitionData.detection_quality,
        comparisonStats: recognitionData.comparison_stats,
        userDetails: recognitionData.user_details,
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
