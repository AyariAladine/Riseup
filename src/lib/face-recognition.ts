/**
 * Face Recognition API Client
 * Connects to FastAPI face recognition service
 */

const FACE_API_URL = process.env.NEXT_PUBLIC_FACE_API_URL || 'http://localhost:8000';

export interface FaceRegistrationResponse {
  message: string;
  worker_id: string;
  action: 'registered' | 'updated';
  face_quality: {
    detection_confidence: number;
    age?: number;
    gender?: string;
  };
  database_operation: string;
}

export interface FaceRecognitionResponse {
  recognized: boolean;
  worker_id: string | null;
  confidence_score: number;
  threshold_used: number;
  detection_quality: {
    detection_confidence: number;
    age?: number;
    gender?: string;
  };
  comparison_stats: {
    workers_compared: number;
    best_match_score: number;
  };
  worker_details?: {
    registered_age?: number;
    registered_gender?: string;
    registration_confidence?: number;
  };
}

export class FaceRecognitionAPI {
  private baseUrl: string;

  constructor(baseUrl: string = FACE_API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if Face API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data.status === 'healthy' && data.database === 'connected';
    } catch (error) {
      console.error('Face API health check failed:', error);
      return false;
    }
  }

  /**
   * Register a user's face
   * @param userId - User's unique identifier (email or Better Auth user ID)
   * @param imageFile - Image file containing user's face
   */
  async registerFace(userId: string, imageFile: File): Promise<FaceRegistrationResponse> {
    const formData = new FormData();
    formData.append('worker_id', userId);
    formData.append('file', imageFile);

    const response = await fetch(`${this.baseUrl}/register/`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Face registration failed');
    }

    return response.json();
  }

  /**
   * Recognize a user's face
   * @param imageFile - Image file to verify
   * @param threshold - Recognition threshold (0.6 = default, higher = stricter)
   */
  async recognizeFace(
    imageFile: File,
    threshold: number = 0.6
  ): Promise<FaceRecognitionResponse> {
    const formData = new FormData();
    formData.append('file', imageFile);

    const url = new URL(`${this.baseUrl}/recognize/`);
    url.searchParams.append('threshold', threshold.toString());

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Face recognition failed');
    }

    return response.json();
  }

  /**
   * Delete a user's face registration
   * @param userId - User's unique identifier
   */
  async deleteFaceRegistration(userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/workers/${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete face registration');
    }
  }

  /**
   * Get system statistics
   */
  async getStats(): Promise<{
    total_users: number;
    registered_faces: number;
    registration_rate: string;
  }> {
    const response = await fetch(`${this.baseUrl}/stats/`);
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    return response.json();
  }
}

// Singleton instance
export const faceAPI = new FaceRecognitionAPI();
