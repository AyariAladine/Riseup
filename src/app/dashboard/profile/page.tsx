"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useProfile, useReclamations } from '@/lib/useProfile';
import { changePassword, twoFactor, useSession } from '@/lib/auth-client';
import FaceAuthSection from '@/components/FaceAuthSection';
import { useFaceVerification } from '@/hooks/useFaceVerification';
import FaceVerificationModal from '@/components/FaceVerificationModal';

type Theme = 'system' | 'light' | 'dark';

type Reclamation = {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  category: 'bug' | 'feature-request' | 'support' | 'billing' | 'other';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export default function DashboardProfile() {
  // Use cached profile and reclamations data
  const { profile, mutate: mutateProfile } = useProfile();
  const { reclamations: cachedReclamations, mutate: mutateReclamations } = useReclamations();
  const { data: session } = useSession();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [theme, setTheme] = useState<Theme>('system');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  
  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [twoFactorMessage, setTwoFactorMessage] = useState('');
  const [setting2FA, setSetting2FA] = useState(false);
  
  // Reclamation state
  const [reclamations, setReclamations] = useState<Reclamation[]>([]);
  const [showReclamationForm, setShowReclamationForm] = useState(false);
  const [reclamationTitle, setReclamationTitle] = useState('');
  const [reclamationDescription, setReclamationDescription] = useState('');
  const [reclamationCategory, setReclamationCategory] = useState<'bug' | 'feature-request' | 'support' | 'billing' | 'other'>('other');
  const [reclamationPriority, setReclamationPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [reclamationMessage, setReclamationMessage] = useState('');
  const [submittingReclamation, setSubmittingReclamation] = useState(false);
  const [editingReclamationId, setEditingReclamationId] = useState<string | null>(null);

  // Learning profile state
  const [learningProfile, setLearningProfile] = useState<any | null>(null);
  const [learningProfileEdit, setLearningProfileEdit] = useState(false);
  const [lpMessage, setLPMessage] = useState('');
  const [lpSaving, setLPSaving] = useState(false);
  
  // NFT Badges state
  const [nftBadges, setNftBadges] = useState<any[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);

  const PROGRAMMING_LANGUAGES = ["JavaScript", "Python", "Java", "C++", "C#", "Ruby", "Go", "Rust", "Swift", "Kotlin", "TypeScript", "PHP", "Dart", "Scala", "R"];

  // Editable form state mirrors LP fields
  const [lpFields, setLPFields] = useState<any|null>(null);

  // Update local state when cached profile data changes
  useEffect(() => {
    if (profile) {
      console.log('Profile loaded:', profile);
      console.log('Avatar from profile:', profile.avatar);
      setName(profile.name || '');
      setEmail(profile.email || '');
      setAvatar(profile.avatar || '');
      setTheme(profile.preferences?.theme || 'system');
      setIsPremium(!!profile.isPremium);
      setEmailNotifications(Boolean(profile.preferences?.emailNotifications ?? true));
      setIsOnline(Boolean(profile.preferences?.isOnline ?? true));
    }
  }, [profile]);

  // Update local state when cached reclamations change
  useEffect(() => {
    if (cachedReclamations && cachedReclamations.length > 0) {
      setReclamations(cachedReclamations);
    }
  }, [cachedReclamations]);

  // Check 2FA status from session
  useEffect(() => {
    if (session?.user) {
      setTwoFactorEnabled(!!(session.user as any).twoFactorEnabled);
    }
  }, [session]);

  // Fetch learning profile once
  useEffect(() => {
    async function fetchProfile() {
      setLPMessage('');
      try {
        const res = await fetch('/api/onboarding', { method:'GET', credentials:'include' });
        if (!res.ok) throw new Error('Failed to fetch learning profile');
        const data = await res.json();
        setLearningProfile(data.profile || null);
      } catch (e) {
        setLearningProfile(null);
        setLPMessage('Could not load learning profile.');
      }
    }
    fetchProfile();
  }, []);
  
  // Fetch NFT badges/achievements from user achievements
  useEffect(() => {
    async function fetchNFTBadges() {
      try {
        const res = await fetch('/api/achievements/user', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch achievements');
        const data = await res.json();
        // Convert achievements to badge format for display
        const badges = (data.achievements || []).map((achievement: any) => ({
          _id: achievement._id,
          title: achievement.challengeTitle || 'Challenge Completed',
          score: achievement.score,
          nftTokenId: achievement.nftTokenId,
          nftBadgeId: achievement.transactionHash?.split('@')[1] || '1',
          language: achievement.language,
          badge: achievement.badge,
          unlockedAt: achievement.unlockedAt
        }));
        setNftBadges(badges);
      } catch (e) {
        console.error('Could not load achievements:', e);
        setNftBadges([]);
      } finally {
        setLoadingBadges(false);
      }
    }
    fetchNFTBadges();
  }, []);

  // Initialize lpFields when learningProfile changes
  useEffect(() => {
    if (learningProfile) setLPFields({ ...learningProfile });
  }, [learningProfile]);

  // Face verification for sensitive operations
  const { isModalOpen, openVerification, closeVerification, handleVerified, verifyWithFace } = useFaceVerification();

  async function handlePasswordChange() {
    if (!password) {
      setMessage('Please enter a new password');
      return;
    }
    
    // Validate new password
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters');
      return;
    }
    
    // Use face verification instead of old password for premium users
    await verifyWithFace(async () => {
      setSaving(true);
      setMessage('');
      try {
        // Call custom API to set password with face verification (no old password needed)
        const response = await fetch('/api/auth/set-password-with-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ newPassword: password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to set password');
        }
        
        setMessage('✅ Password set successfully!');
        setPassword('');
        setCurrentPassword('');
        
        // Send Firebase push notification for password change
        try {
          await fetch('/api/notifications/password-changed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (notifErr) {
          console.error('Failed to send password changed notification:', notifErr);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setMessage(`❌ ${msg}`);
      } finally {
        setSaving(false);
      }
    });
  }

  async function enable2FA() {
    setSetting2FA(true);
    setTwoFactorMessage('');
    try {
      if (!twoFactor || !twoFactor.enable) {
        throw new Error('2FA functionality is not available');
      }
      
      const result = await twoFactor.enable({
        password: currentPassword,
      });
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to enable 2FA');
      }
      
      // Result contains totpURI which we need to convert to QR code
      if (result.data && result.data.totpURI) {
        // Generate QR code from URI
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.data.totpURI)}`;
        setQrCode(qrCodeUrl);
        
        // Extract secret from URI (format: otpauth://totp/...?secret=XXXXX)
        const secretMatch = result.data.totpURI.match(/secret=([A-Z0-9]+)/);
        if (secretMatch) {
          setTotpSecret(secretMatch[1]);
        }
        
        setShow2FASetup(true);
        setTwoFactorMessage('Scan the QR code with your authenticator app');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTwoFactorMessage(msg);
    } finally {
      setSetting2FA(false);
    }
  }

  async function verify2FA() {
    if (!verifyCode || verifyCode.length !== 6) {
      setTwoFactorMessage('Please enter a valid 6-digit code');
      return;
    }
    
    setSetting2FA(true);
    setTwoFactorMessage('');
    try {
      const result = await twoFactor.verifyTotp({
        code: verifyCode,
      });
      
      if (result.error) {
        throw new Error(result.error.message || 'Invalid code');
      }
      
      setTwoFactorEnabled(true);
      setShow2FASetup(false);
      setVerifyCode('');
      setCurrentPassword('');
      setTwoFactorMessage('Two-factor authentication enabled successfully!');
      
      // Send Firebase notification
      try {
        await fetch('/api/notifications/2fa-enabled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.error('Failed to send 2FA enabled notification:', err);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTwoFactorMessage(msg);
    } finally {
      setSetting2FA(false);
    }
  }

  async function disable2FA() {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }
    
    setSetting2FA(true);
    setTwoFactorMessage('');
    try {
      const result = await twoFactor.disable({
        password: currentPassword,
      });
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to disable 2FA');
      }
      
      setTwoFactorEnabled(false);
      setCurrentPassword('');
      setTwoFactorMessage('Two-factor authentication disabled');
      
      // Send Firebase push notification for 2FA disabled
      try {
        await fetch('/api/notifications/2fa-disabled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (notifErr) {
        console.error('Failed to send 2FA disabled notification:', notifErr);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTwoFactorMessage(msg);
    } finally {
      setSetting2FA(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    
    // If password change requested, handle it separately with face verification
    if (password && isPremium) {
      await handlePasswordChange();
      return;
    }
    
    // Normal profile update (name, avatar, preferences)
    setSaving(true);
    setMessage('');
    try {
      console.log('Saving profile with avatar:', avatar ? 'Yes (length: ' + avatar.length + ')' : 'No');
      
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          avatar: avatar || undefined,
          preferences: { theme, emailNotifications, isOnline },
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        console.error('Profile update failed:', data);
        throw new Error(data.message || data.error || 'Update failed');
      }
      
      console.log('Profile update response:', data);
      console.log('Saved avatar:', data.user?.avatar ? 'Yes (length: ' + data.user.avatar.length + ')' : 'No');
      
      setMessage('✅ Profile updated successfully!');
      setName(data.user?.name || name);
      
      // Update avatar from response
      if (data.user?.avatar) {
        setAvatar(data.user.avatar);
      }
      
      // Update the SWR cache with new data
      mutateProfile();
      
      // Send Firebase notification
      try {
        await fetch('/api/notifications/profile-updated', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.error('Failed to send profile updated notification:', err);
      }
      
      try {
        // notify header about updated name/avatar/preferences
        window.dispatchEvent(new CustomEvent('profile-updated', { detail: { name: data.user?.name, avatar: data.user?.avatar } }));
      } catch {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Profile update error:', err);
      setMessage('❌ ' + msg);
    } finally {
      setSaving(false);
    }
  }

  function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  }



  async function submitReclamation(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingReclamation(true);
    setReclamationMessage('');
    
    try {
      if (editingReclamationId) {
        // Update existing
        const res = await fetch(`/api/reclamations/${editingReclamationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: reclamationTitle,
            description: reclamationDescription,
            category: reclamationCategory,
            priority: reclamationPriority,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Update failed');
        
        // Update in list
        setReclamations(prev => prev.map(r => r._id === editingReclamationId ? data.reclamation : r));
        setReclamationMessage('Reclamation updated successfully');
        
        // Send Firebase notification
        try {
          await fetch('/api/notifications/reclamation-updated', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: reclamationTitle }),
          });
        } catch (err) {
          console.error('Failed to send reclamation updated notification:', err);
        }
        
        // Update the SWR cache
        mutateReclamations();
      } else {
        // Create new
        const res = await fetch('/api/reclamations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: reclamationTitle,
            description: reclamationDescription,
            category: reclamationCategory,
            priority: reclamationPriority,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create reclamation');
        
        setReclamations(prev => [data.reclamation, ...prev]);
        setReclamationMessage('Reclamation submitted successfully');
        
        // Send Firebase notification
        try {
          await fetch('/api/notifications/reclamation-created', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: reclamationTitle }),
          });
        } catch (err) {
          console.error('Failed to send reclamation created notification:', err);
        }
        
        // Update the SWR cache
        mutateReclamations();
      }
      
      // Reset form
      setReclamationTitle('');
      setReclamationDescription('');
      setReclamationCategory('other');
      setReclamationPriority('medium');
      setShowReclamationForm(false);
      setEditingReclamationId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setReclamationMessage(msg);
    } finally {
      setSubmittingReclamation(false);
    }
  }

  async function deleteReclamation(id: string) {
    if (!confirm('Are you sure you want to delete this reclamation?')) return;
    
    try {
      const res = await fetch(`/api/reclamations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      
      setReclamations(prev => prev.filter(r => r._id !== id));
      setReclamationMessage('Reclamation deleted');
      
      // Send Firebase notification
      try {
        await fetch('/api/notifications/reclamation-deleted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.error('Failed to send reclamation deleted notification:', err);
      }
      
      // Update the SWR cache
      mutateReclamations();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setReclamationMessage(msg);
    }
  }

  function startEdit(reclamation: Reclamation) {
    setEditingReclamationId(reclamation._id);
    setReclamationTitle(reclamation.title);
    setReclamationDescription(reclamation.description);
    setReclamationCategory(reclamation.category);
    setReclamationPriority(reclamation.priority);
    setShowReclamationForm(true);
  }

  function cancelEdit() {
    setEditingReclamationId(null);
    setReclamationTitle('');
    setReclamationDescription('');
    setReclamationCategory('other');
    setReclamationPriority('medium');
    setShowReclamationForm(false);
  }

  // Learning profile save function
  async function saveLearningProfile() {
    if (!lpFields) return;
    setLPSaving(true);
    setLPMessage('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(lpFields),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update learning profile');
      }
      const data = await res.json();
      setLearningProfile(data.profile || lpFields);
      setLearningProfileEdit(false);
      setLPMessage('✅ Learning profile updated!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLPMessage(`❌ ${msg}`);
    } finally {
      setLPSaving(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'in-progress': return '#3b82f6';
      case 'resolved': return '#10b981';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div className="github-container" style={isPremium ? {
      background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.03) 0%, rgba(59, 130, 246, 0.03) 100%)'
    } : {}}>
      <div className="github-page-header" style={isPremium ? {
        background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
        border: '2px solid rgba(234, 179, 8, 0.2)',
        borderRadius: '12px',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden'
      } : { padding: '20px' }}>
        {isPremium && (
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            padding: '6px 12px',
            background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
            borderBottomLeftRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)'
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="white">
              <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
            </svg>
            <span style={{ color: 'white', fontSize: '11px', fontWeight: 600 }}>PREMIUM</span>
          </div>
        )}
        <h1 className="github-page-title" style={isPremium ? { 
          background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: '28px',
          marginBottom: '6px'
        } : { fontSize: '28px', marginBottom: '6px' }}>Profile</h1>
        <p className="github-page-description" style={{ fontSize: '14px' }}>Update your personal info and manage reclamations.</p>
      </div>

      {/* Two-column layout: Profile on left, space for achievements/NFTs on right */}
      <div className="profile-layout-grid">
        {/* Left Column - Profile Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
          {/* Profile Section */}
          <div className="github-card" style={isPremium ? {
            border: '2px solid rgba(234, 179, 8, 0.2)',
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
            boxShadow: '0 8px 24px rgba(234, 179, 8, 0.1)',
            padding: '18px'
          } : { padding: '18px' }}>
            <h2 style={{ marginTop: 0, fontSize: '17px', marginBottom: '14px' }}>Personal Information</h2>
            
          {isPremium ? (
            <div className="card" style={{ padding: 10, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="#eab308">
                  <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
                </svg>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#eab308' }}>Premium Member</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Thank you for your support!</div>
                </div>
              </div>
              <a href="/dashboard/premium" className="github-btn" style={{ padding: '4px 12px', fontSize: '13px' }}>Manage</a>
            </div>
          ) : (
            <div className="card" style={{ padding: 10, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'rgba(31, 111, 235, 0.1)', border: '1px solid rgba(31, 111, 235, 0.3)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Go Premium</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Unlock advanced features and support development.</div>
              </div>
              <a href="/dashboard/premium" className="github-btn github-btn-primary" style={{ padding: '4px 12px', fontSize: '13px' }}>Upgrade</a>
            </div>
          )}

          {message && <div style={{ marginTop: 8, marginBottom: 8, padding: '6px 10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', fontSize: '13px' }}>{message}</div>}

          <form onSubmit={save}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ 
                position: 'relative',
                width: 56, 
                height: 56,
              }}>
                {isPremium && (
                  <div style={{
                    position: 'absolute',
                    top: -3,
                    left: -3,
                    right: -3,
                    bottom: -3,
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #eab308, #f59e0b, #eab308)',
                    backgroundSize: '200% 200%',
                    animation: 'premium-glow 3s ease infinite',
                    zIndex: 0
                  }} />
                )}
                <div style={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: '50%', 
                  overflow: 'hidden', 
                  background: 'var(--panel-2)', 
                  position: 'relative', 
                  border: isPremium ? '2px solid #eab308' : '2px solid var(--border)',
                  boxShadow: isPremium ? '0 0 16px rgba(234, 179, 8, 0.4)' : 'none',
                  zIndex: 1
                }}>
                  {avatar ? (
                    <Image 
                      src={avatar} 
                      alt="avatar" 
                      fill 
                      sizes="56px" 
                      style={{ objectFit: 'cover' }}
                      unoptimized={avatar.startsWith('data:')}
                    />
                  ) : (
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '20px', 
                      color: isPremium ? '#eab308' : 'var(--muted)',
                      fontWeight: isPremium ? 700 : 400
                    }}>
                      {name.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
              </div>
              <label className="github-btn" style={{ padding: '6px 12px', fontSize: '13px' }}>
                <input type="file" accept="image/*" onChange={onAvatarFile} style={{ display: 'none' }} />
                Upload Avatar
              </label>
            </div>

            <label style={{ display: 'block', marginBottom: 10 }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                Name
                {isPremium && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="#eab308">
                    <title>Premium Member</title>
                    <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
                  </svg>
                )}
              </div>
              <input value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '8px 10px', fontSize: '14px' }} />
            </label>

            <label style={{ display: 'block', marginBottom: 10 }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: 4 }}>Email</div>
              <input value={email} disabled style={{ width: '100%', opacity: 0.6, padding: '8px 10px', fontSize: '14px' }} />
            </label>

            <label style={{ display: 'block', marginBottom: 10 }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: 4 }}>
                {isPremium ? '🔐 Set/Change Password (verified with face recognition)' : 'New password (optional)'}
              </div>
              <input type="password" value={password} placeholder="Enter new password" onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: '14px' }} />
            </label>

            {password && isPremium && (
              <div style={{ 
                padding: '10px 12px', 
                marginBottom: 10, 
                background: 'rgba(234, 179, 8, 0.1)', 
                border: '1px solid rgba(234, 179, 8, 0.3)', 
                borderRadius: 6, 
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span style={{ color: '#eab308' }}>You&apos;ll verify your identity with face recognition instead of entering your current password</span>
              </div>
            )}

            <button className="github-btn github-btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 
               password ? 'Set Password with Face Verification' :
               'Save changes'}
            </button>
          </form>

          <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
          
          {/* Two-Factor Authentication Section */}
          <div>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Two-Factor Authentication (2FA)
            </h3>
            <p className="muted small" style={{ marginBottom: 16 }}>
              Add an extra layer of security to your account using a TOTP authenticator app like Google Authenticator or Authy.
            </p>

            {twoFactorMessage && (
              <div style={{ 
                padding: '10px 12px', 
                marginBottom: 12, 
                borderRadius: 6, 
                fontSize: '13px',
                background: twoFactorMessage.includes('success') ? 'rgba(126, 231, 135, 0.1)' : 'rgba(255, 107, 107, 0.1)',
                color: twoFactorMessage.includes('success') ? '#7ee787' : '#ff6b6b',
                border: `1px solid ${twoFactorMessage.includes('success') ? 'rgba(126, 231, 135, 0.3)' : 'rgba(255, 107, 107, 0.3)'}`
              }}>
                {twoFactorMessage}
              </div>
            )}

            {!twoFactorEnabled && !show2FASetup && (
              <div>
                <label style={{ display: 'block', marginBottom: 12 }}>
                  <div className="small muted" style={{ marginBottom: 4 }}>Current password (required to enable 2FA)</div>
                  <input 
                    type="password" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    placeholder="Enter your current password"
                    style={{ width: '100%' }} 
                  />
                </label>
                <button 
                  className="github-btn github-btn-primary" 
                  onClick={enable2FA}
                  disabled={!currentPassword || setting2FA}
                  type="button"
                >
                  {setting2FA ? 'Enabling...' : 'Enable 2FA'}
                </button>
              </div>
            )}

            {show2FASetup && (
              <div style={{ padding: 16, background: 'var(--panel-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <h4 style={{ marginTop: 0, fontSize: 14 }}>Step 1: Scan QR Code</h4>
                <p className="small muted" style={{ marginBottom: 12 }}>
                  Open your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.) on your phone and scan this QR code:
                </p>
                {qrCode && (
                  <div style={{ textAlign: 'center', marginBottom: 16, padding: 12, background: 'white', borderRadius: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCode} alt="2FA QR Code" width={200} height={200} style={{ display: 'inline-block' }} />
                  </div>
                )}
                
                <h4 style={{ marginTop: 16, marginBottom: 8, fontSize: 14 }}>Step 2: Enter Verification Code</h4>
                <p className="small muted" style={{ marginBottom: 12 }}>
                  Enter the 6-digit code from your authenticator app:
                </p>
                <label style={{ display: 'block', marginBottom: 12 }}>
                  <input 
                    type="text" 
                    value={verifyCode} 
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                    placeholder="123456"
                    maxLength={6}
                    style={{ width: '100%', fontSize: '18px', letterSpacing: '8px', textAlign: 'center' }} 
                  />
                </label>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    className="github-btn github-btn-primary" 
                    onClick={verify2FA}
                    disabled={verifyCode.length !== 6 || setting2FA}
                    type="button"
                    style={{ flex: 1 }}
                  >
                    {setting2FA ? 'Verifying...' : 'Verify & Enable'}
                  </button>
                  <button 
                    className="github-btn" 
                    onClick={() => {
                      setShow2FASetup(false);
                      setQrCode('');
                      setTotpSecret('');
                      setVerifyCode('');
                      setCurrentPassword('');
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
                
                {totpSecret && (
                  <details open style={{ marginTop: 16, fontSize: '13px', border: '1px solid var(--border)', borderRadius: 6, padding: 12 }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 8 }}>
                      📱 Can&apos;t scan? Enter this key manually
                    </summary>
                    <p className="small muted" style={{ marginTop: 8, marginBottom: 8 }}>
                      Open your authenticator app, select &quot;Enter a setup key&quot; or &quot;Manual entry&quot;, and enter:
                    </p>
                    <div style={{ 
                      marginTop: 8, 
                      padding: 12, 
                      background: 'var(--panel-1)', 
                      borderRadius: 4, 
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      wordBreak: 'break-all',
                      border: '1px solid var(--border)',
                      position: 'relative'
                    }}>
                      <strong style={{ color: '#2563eb' }}>{totpSecret}</strong>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(totpSecret);
                        }}
                        style={{
                          position: 'absolute',
                          right: 8,
                          top: 8,
                          padding: '4px 8px',
                          fontSize: '11px',
                          background: 'var(--panel-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          cursor: 'pointer'
                        }}
                        type="button"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="small muted" style={{ marginTop: 8 }}>
                      <strong>Account name:</strong> {email}<br/>
                      <strong>Type:</strong> Time-based<br/>
                      <strong>Digits:</strong> 6
                    </p>
                  </details>
                )}
              </div>
            )}

            {twoFactorEnabled && (
              <div style={{ 
                padding: 12, 
                background: 'rgba(126, 231, 135, 0.1)', 
                border: '1px solid rgba(126, 231, 135, 0.3)', 
                borderRadius: 6,
                marginBottom: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7ee787" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#7ee787' }}>
                    2FA is currently enabled
                  </span>
                </div>
                <p className="small muted" style={{ marginBottom: 12 }}>
                  Your account is protected with two-factor authentication.
                </p>
                
                <label style={{ display: 'block', marginBottom: 12 }}>
                  <div className="small muted" style={{ marginBottom: 4 }}>Current password (required to disable 2FA)</div>
                  <input 
                    type="password" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    placeholder="Enter your current password"
                    style={{ width: '100%' }} 
                  />
                </label>
                
                <button 
                  className="github-btn"
                  onClick={disable2FA}
                  disabled={!currentPassword || setting2FA}
                  type="button"
                  style={{ background: '#ff6b6b', color: 'white' }}
                >
                  {setting2FA ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            )}
          </div>

          {/* Face Authentication Section */}
          <FaceAuthSection 
            userEmail={email}
            isPremium={isPremium} 
          />
        </div>

        {/* Reclamations Section */}
        <div className="github-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Reclamations</h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0 0' }}>Submit and track your support requests</p>
            </div>
            <button 
              className="github-btn github-btn-primary" 
              onClick={() => setShowReclamationForm(!showReclamationForm)}
              type="button"
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              {showReclamationForm ? 'Cancel' : '+ New'}
            </button>
          </div>

          {reclamationMessage && (
            <div style={{ marginBottom: 12, padding: '6px 10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', fontSize: '13px' }}>
              {reclamationMessage}
            </div>
          )}

          {showReclamationForm && (
            <form onSubmit={submitReclamation} style={{ marginBottom: 24, padding: 16, background: 'var(--panel-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <h3 style={{ marginTop: 0 }}>{editingReclamationId ? 'Edit Reclamation' : 'New Reclamation'}</h3>
              
              <label style={{ display: 'block', marginBottom: 12 }}>
                <div className="small muted" style={{ marginBottom: 4 }}>Title *</div>
                <input 
                  value={reclamationTitle} 
                  onChange={(e) => setReclamationTitle(e.target.value)} 
                  placeholder="Brief description of your issue"
                  required
                  maxLength={200}
                  style={{ width: '100%' }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: 12 }}>
                <div className="small muted" style={{ marginBottom: 4 }}>Description *</div>
                <textarea 
                  value={reclamationDescription} 
                  onChange={(e) => setReclamationDescription(e.target.value)} 
                  placeholder="Provide detailed information about your reclamation"
                  required
                  maxLength={2000}
                  rows={4}
                  style={{ width: '100%', resize: 'vertical' }}
                />
                <div className="small muted" style={{ marginTop: 4 }}>{reclamationDescription.length}/2000 characters</div>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <label>
                  <div className="small muted" style={{ marginBottom: 4 }}>Category</div>
                  <select 
                    value={reclamationCategory} 
                    onChange={(e) => setReclamationCategory(e.target.value as typeof reclamationCategory)}
                    style={{ width: '100%' }}
                  >
                    <option value="bug">Bug Report</option>
                    <option value="feature-request">Feature Request</option>
                    <option value="support">Technical Support</option>
                    <option value="billing">Billing Issue</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label>
                  <div className="small muted" style={{ marginBottom: 4 }}>Priority</div>
                  <select 
                    value={reclamationPriority} 
                    onChange={(e) => setReclamationPriority(e.target.value as typeof reclamationPriority)}
                    style={{ width: '100%' }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="github-btn github-btn-primary" type="submit" disabled={submittingReclamation}>
                  {submittingReclamation ? 'Submitting…' : (editingReclamationId ? 'Update' : 'Submit')}
                </button>
                {editingReclamationId && (
                  <button className="github-btn" type="button" onClick={cancelEdit}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Reclamations List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reclamations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.4, marginBottom: 8 }}>
                  <path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 01-1.484.211c-.04-.282-.163-.547-.37-.847a8.695 8.695 0 00-.542-.68l-.21-.25C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.886 3.539l-.211.25c-.173.203-.354.43-.542.68-.207.3-.33.565-.37.847a.75.75 0 01-1.485-.21c.084-.595.337-1.08.621-1.491.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75zM6 15.25a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75zM5.75 12a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5z"/>
                </svg>
                <p className="small">No reclamations yet. Click &quot;New Reclamation&quot; to submit one.</p>
              </div>
            ) : (
              reclamations.map((rec) => (
                <div 
                  key={rec._id} 
                  style={{ 
                    padding: 16, 
                    background: 'var(--panel-2)', 
                    border: '1px solid var(--border)', 
                    borderRadius: 8 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 4px 0' }}>{rec.title}</h4>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span 
                          className="small" 
                          style={{ 
                            padding: '2px 8px', 
                            background: getStatusColor(rec.status) + '20', 
                            color: getStatusColor(rec.status), 
                            borderRadius: 4,
                            fontWeight: 600
                          }}
                        >
                          {rec.status}
                        </span>
                        <span 
                          className="small" 
                          style={{ 
                            padding: '2px 8px', 
                            background: getPriorityColor(rec.priority) + '20', 
                            color: getPriorityColor(rec.priority), 
                            borderRadius: 4 
                          }}
                        >
                          {rec.priority}
                        </span>
                        <span className="small muted">
                          {rec.category.replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(rec.status === 'pending' || rec.status === 'in-progress') && (
                        <button 
                          className="github-btn"
                          onClick={() => startEdit(rec)}
                          title="Edit"
                          style={{ padding: '4px 8px' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064l6.286-6.286z"/>
                          </svg>
                        </button>
                      )}
                      <button 
                        className="github-btn"
                        onClick={() => deleteReclamation(rec._id)}
                        title="Delete"
                        style={{ padding: '4px 8px', color: '#ef4444' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19c.9 0 1.652-.681 1.741-1.576l.66-6.6a.75.75 0 00-1.492-.149l-.66 6.6a.25.25 0 01-.249.225h-5.19a.25.25 0 01-.249-.225l-.66-6.6z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <p className="small" style={{ margin: '8px 0', color: 'var(--fg)' }}>
                    {rec.description}
                  </p>
                  
                  {rec.adminNotes && (
                    <div style={{ marginTop: 8, padding: 8, background: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid #3b82f6', borderRadius: 4 }}>
                      <div className="small" style={{ fontWeight: 600, marginBottom: 4, color: '#3b82f6' }}>Admin Note:</div>
                      <div className="small">{rec.adminNotes}</div>
                    </div>
                  )}
                  
                  <div className="small muted" style={{ marginTop: 8 }}>
                    Created: {new Date(rec.createdAt).toLocaleDateString()} • Updated: {new Date(rec.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>

        {/* Right Column - Learning Profile & Achievements */}
        <div>
          {/* Learning Profile Card */}
          {learningProfile && (
            <div className="github-card" style={{ padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Learning Profile</h3>
                <button 
                  className="github-btn" 
                  onClick={() => setLearningProfileEdit(!learningProfileEdit)}
                  disabled={lpSaving}
                >
                  {learningProfileEdit ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {lpMessage && (
                <div className={lpMessage.startsWith('✅') ? 'github-alert-success' : 'github-alert-error'} style={{ marginBottom: '12px' }}>
                  {lpMessage}
                </div>
              )}

              {!learningProfileEdit ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <div className="small muted">Experience Level (Read-only)</div>
                    <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{learningProfile.codingExperience}</div>
                  </div>
                  <div>
                    <div className="small muted">Skill Level (Read-only)</div>
                    <div style={{ fontWeight: 500 }}>{learningProfile.skillLevel}/10</div>
                  </div>
                  {learningProfile.preferredLanguages && learningProfile.preferredLanguages.length > 0 && (
                    <div>
                      <div className="small muted">Preferred Languages</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {learningProfile.preferredLanguages.map((lang: string) => (
                          <span key={lang} style={{ 
                            padding: '2px 8px', 
                            background: 'rgba(59, 130, 246, 0.1)', 
                            color: '#3b82f6', 
                            borderRadius: '4px', 
                            fontSize: '12px' 
                          }}>
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {learningProfile.hoursPerWeek && (
                    <div>
                      <div className="small muted">Hours Per Week</div>
                      <div style={{ fontWeight: 500 }}>{learningProfile.hoursPerWeek} hours</div>
                    </div>
                  )}
                  {learningProfile.age && (
                    <div>
                      <div className="small muted">Age</div>
                      <div style={{ fontWeight: 500 }}>{learningProfile.age}</div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); saveLearningProfile(); }} style={{ display: 'grid', gap: '12px' }}>
                  {/* Experience Level - Read Only */}
                  <div>
                    <label className="github-label">Experience Level (Read-only)</label>
                    <input 
                      type="text" 
                      className="github-input" 
                      value={lpFields?.codingExperience || ''} 
                      disabled
                      style={{ opacity: 0.6, cursor: 'not-allowed' }}
                    />
                  </div>

                  {/* Skill Level - Read Only */}
                  <div>
                    <label className="github-label">Skill Level (Read-only)</label>
                    <input 
                      type="number" 
                      className="github-input" 
                      value={lpFields?.skillLevel || 5} 
                      disabled
                      style={{ opacity: 0.6, cursor: 'not-allowed' }}
                    />
                  </div>

                  {/* Preferred Languages - Editable */}
                  <div>
                    <label className="github-label">Preferred Languages</label>
                    <select 
                      className="github-input" 
                      multiple
                      value={lpFields?.preferredLanguages || []}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setLPFields({ ...lpFields, preferredLanguages: selected });
                      }}
                      style={{ minHeight: '100px' }}
                    >
                      {PROGRAMMING_LANGUAGES.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                    <div className="small muted" style={{ marginTop: '4px' }}>Hold Ctrl/Cmd to select multiple</div>
                  </div>

                  {/* Hours Per Week - Editable */}
                  <div>
                    <label className="github-label">Hours Per Week</label>
                    <input 
                      type="number" 
                      className="github-input" 
                      min="1" 
                      max="168"
                      value={lpFields?.hoursPerWeek || 5}
                      onChange={(e) => setLPFields({ ...lpFields, hoursPerWeek: Number(e.target.value) })}
                    />
                  </div>

                  {/* Age - Editable */}
                  <div>
                    <label className="github-label">Age</label>
                    <input 
                      type="number" 
                      className="github-input" 
                      min="5" 
                      max="120"
                      value={lpFields?.age || ''}
                      onChange={(e) => setLPFields({ ...lpFields, age: Number(e.target.value) })}
                    />
                  </div>

                  <button type="submit" className="github-btn github-btn-primary" disabled={lpSaving}>
                    {lpSaving ? 'Saving...' : 'Save Learning Profile'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Achievements & NFTs Section */}
          <div className="github-card" style={{ padding: '20px', minHeight: '400px' }}>
            <div style={{ marginBottom: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}>
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
              </svg>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>NFT Badges</span>
              {!loadingBadges && (
                <span style={{ marginLeft: '8px', fontSize: '14px', color: 'var(--muted)' }}>
                  ({nftBadges.length})
                </span>
              )}
            </div>
            
            {loadingBadges ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>
                <div style={{ fontSize: '14px' }}>Loading badges...</div>
              </div>
            ) : nftBadges.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 12px', opacity: 0.3 }}>
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                </svg>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>No badges yet</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Complete tasks with a score ≥70% to earn NFT badges!</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {nftBadges.map((achievement: any) => {
                  // Use badge tier from achievement, or fallback to score calculation
                  const badgeTier = achievement.badge || (() => {
                    const score = achievement.score || 0;
                    if (score >= 90) return 'Diamond';
                    if (score >= 75) return 'Gold';
                    if (score >= 70) return 'Silver';
                    return 'Bronze';
                  })();
                  
                  // Determine badge color based on tier
                  const getBadgeColor = (tier: string) => {
                    if (tier === 'Diamond') return '#9333ea'; // Purple
                    if (tier === 'Gold') return '#f59e0b'; // Amber
                    if (tier === 'Silver') return '#6b7280'; // Gray
                    return '#cd7f32'; // Bronze
                  };
                  
                  const badgeColor = getBadgeColor(badgeTier);
                  
                  return (
                    <div
                      key={achievement._id}
                      style={{
                        border: `2px solid ${badgeColor}`,
                        borderRadius: '8px',
                        padding: '16px',
                        background: `linear-gradient(135deg, ${badgeColor}15, transparent)`,
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Badge icon */}
                      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                        <svg 
                          width="48" 
                          height="48" 
                          viewBox="0 0 24 24" 
                          fill={badgeColor} 
                          stroke={badgeColor} 
                          strokeWidth="1"
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                        >
                          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                        </svg>
                      </div>
                      
                      {/* Badge tier */}
                      <div 
                        style={{ 
                          textAlign: 'center', 
                          fontSize: '12px', 
                          fontWeight: 600, 
                          color: badgeColor,
                          marginBottom: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                      >
                        {badgeTier}
                      </div>
                      
                      {/* Challenge/Task title */}
                      <div 
                        style={{ 
                          fontSize: '14px', 
                          fontWeight: 500, 
                          textAlign: 'center',
                          marginBottom: '8px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {achievement.title}
                      </div>
                      
                      {/* Score */}
                      <div 
                        style={{ 
                          textAlign: 'center', 
                          fontSize: '18px', 
                          fontWeight: 700,
                          color: badgeColor,
                          marginBottom: '8px'
                        }}
                      >
                        {achievement.score}%
                      </div>
                      
                      {/* View on Hedera button */}
                      {achievement.nftTokenId && achievement.nftBadgeId && (
                        <a
                          href={`https://hashscan.io/testnet/token/${achievement.nftTokenId}/${achievement.nftBadgeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'block',
                            textAlign: 'center',
                            fontSize: '11px',
                            color: badgeColor,
                            textDecoration: 'none',
                            marginTop: '8px',
                            padding: '4px 8px',
                            border: `1px solid ${badgeColor}40`,
                            borderRadius: '4px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = `${badgeColor}20`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          View on Hedera ↗
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Face Verification Modal */}
      <FaceVerificationModal
        isOpen={isModalOpen}
        onClose={closeVerification}
        onVerified={handleVerified}
        title="Verify Your Identity"
        message="For security, please verify your face before disabling 2FA"
      />
    </div>
  );
}



























