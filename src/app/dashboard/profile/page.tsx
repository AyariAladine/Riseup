"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { showNotification } from '@/components/NotificationProvider';
import { useProfile, useReclamations } from '@/lib/useProfile';

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
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [avatar, setAvatar] = useState('');
  const [theme, setTheme] = useState<Theme>('system');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  
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

  const PROGRAMMING_LANGUAGES = ["JavaScript", "Python", "Java", "C++", "C#", "Ruby", "Go", "Rust", "Swift", "Kotlin", "TypeScript", "PHP", "Dart", "Scala", "R"];

  // Update local state when cached profile data changes
  useEffect(() => {
    if (profile) {
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

  useEffect(() => {
    // fetch learning profile once
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

  // Editable form state mirrors LP fields
  const [lpFields, setLPFields] = useState<any|null>(null);
  useEffect(() => {
    if (learningProfile) setLPFields({ ...learningProfile });
  }, [learningProfile]);

  function lpField(name:string, val:any) {
    setLPFields((prev:any) => ({ ...(prev||{}), [name]: val }));
  }

  async function saveLearningProfile(e:React.FormEvent) {
    e.preventDefault(); setLPSaving(true); setLPMessage('');
    try {
      const res = await fetch('/api/onboarding', {
        method:'PATCH', headers:{'Content-Type':'application/json'}, credentials:'include', body:JSON.stringify(lpFields)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Update failed');
      setLearningProfile(data.profile);
      showNotification('Learning profile updated successfully!','success');
      setLPMessage('Learning profile updated!');
      setLearningProfileEdit(false);
    } catch (e:any) {
      setLPMessage(e.message||'Could not update profile');
    } finally { setLPSaving(false); }
  }

  async function requestPasswordChange() {
    if (!password) {
      setMessage('Please enter a new password');
      return;
    }
    if (!currentPassword) {
      setMessage('Please enter your current password');
      return;
    }
    
    setSendingCode(true);
    setMessage('');
    try {
      const res = await fetch('/api/profile/password/start', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      setCodeSent(true);
      setMessage('Verification code sent to your email!');
      showNotification('Verification code sent to your email!', 'info');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(msg);
      showNotification(msg, 'error');
    } finally {
      setSendingCode(false);
    }
  }

  async function confirmPasswordChange() {
    if (!verificationCode) {
      setMessage('Please enter the verification code');
      return;
    }
    
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/profile/password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: verificationCode,
          currentPassword,
          newPassword: password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password change failed');
      setMessage('Password changed successfully!');
      setPassword('');
      setCurrentPassword('');
      setVerificationCode('');
      setCodeSent(false);
      showNotification('Password changed successfully!', 'success', 'Achievement Unlocked');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    
    // If password change requested, handle it separately
    if (password && currentPassword) {
      if (!codeSent) {
        await requestPasswordChange();
        return;
      } else {
        await confirmPasswordChange();
        return;
      }
    }
    
    // Normal profile update (name, avatar, preferences)
    setSaving(true);
    setMessage('');
    try {
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
      if (!res.ok) throw new Error(data.message || 'Update failed');
      setMessage('Profile updated');
      setName(data.user?.name || name);
      showNotification('Profile updated successfully!', 'info');
      
      // Update the SWR cache with new data
      mutateProfile();
      
      try {
        // notify header about updated name/avatar/preferences
        window.dispatchEvent(new CustomEvent('profile-updated', { detail: { name: data.user?.name, avatar: data.user?.avatar } }));
      } catch {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  // Optimistic toggle for online/offline status so users don't need to save the whole form
  async function toggleOnline(online: boolean) {
    // update UI immediately
    setIsOnline(online);
    showNotification(online ? 'You are now online' : 'You are now offline', 'info');
    
    // Notify header and other components about status change
    try {
      window.dispatchEvent(new CustomEvent('status-updated', { detail: { isOnline: online } }));
    } catch {}
    
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ preferences: { isOnline: online } }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update status');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showNotification(msg, 'error');
      // revert UI
      setIsOnline(prev => !prev);
      // revert header status
      try {
        window.dispatchEvent(new CustomEvent('status-updated', { detail: { isOnline: !online } }));
      } catch {}
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

  async function startEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    if (!newEmail) return;
    try {
      const res = await fetch('/api/profile/email/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start email change');
      setMessage(data.verifyUrl ? `Dev link: ${data.verifyUrl}` : 'Verification email sent');
      setNewEmail('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(msg);
    }
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
        showNotification('Reclamation updated successfully!', 'success');
        
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
        showNotification('Reclamation sent successfully!', 'success');
        
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
      showNotification('Reclamation deleted successfully!', 'success');
      
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
            paddingTop: 18, paddingRight: 18, paddingBottom: 18, paddingLeft: 18
          } : {
            paddingTop: 18, paddingRight: 18, paddingBottom: 18, paddingLeft: 18
          }}>
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
                    <Image src={avatar} alt="avatar" fill sizes="56px" style={{ objectFit: 'cover' }} />
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
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: 4 }}>New password (optional)</div>
              <input type="password" value={password} placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: '14px' }} />
            </label>

            {password && (
              <label style={{ display: 'block', marginBottom: 10 }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: 4 }}>Current password (required to change)</div>
                <input type="password" value={currentPassword} placeholder="Current password" onChange={(e) => setCurrentPassword(e.target.value)} required={!!password} style={{ width: '100%', padding: '8px 10px', fontSize: '14px' }} />
              </label>
            )}

            {codeSent && password && currentPassword && (
              <div style={{ marginBottom: 12, padding: 12, background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: 6 }}>
                <div className="small" style={{ marginBottom: 8, fontWeight: 600 }}>📧 Verification code sent to your email!</div>
                <label style={{ display: 'block' }}>
                  <div className="small muted" style={{ marginBottom: 4 }}>Enter 6-digit code</div>
                  <input 
                    type="text" 
                    value={verificationCode} 
                    placeholder="123456" 
                    maxLength={6}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))} 
                    style={{ width: '100%', fontSize: '18px', letterSpacing: '4px', textAlign: 'center' }} 
                  />
                </label>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <label>
                <div className="small muted" style={{ marginBottom: 4 }}>Theme</div>
                <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)} style={{ width: '100%' }}>
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                <input type="checkbox" checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} />
                <span className="small">Email notifications</span>
              </label>
            </div>

            <div style={{ marginBottom: 16, padding: '12px', background: 'var(--panel-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div className="small" style={{ fontWeight: 600, marginBottom: 2 }}>
                    {isOnline ? '🟢 Online' : '⚫ Offline'}
                  </div>
                  <div className="small muted">
                    {isOnline ? 'You are visible to others' : 'You are invisible to others'}
                  </div>
                </div>
                <label style={{ 
                  position: 'relative', 
                  display: 'inline-block', 
                  width: '48px', 
                  height: '24px',
                  cursor: 'pointer'
                }}>
                  <input 
                    type="checkbox" 
                    checked={isOnline} 
                    onChange={(e) => toggleOnline(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: isOnline ? '#10b981' : '#6b7280',
                    borderRadius: '24px',
                    transition: 'background-color 0.2s',
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: isOnline ? '27px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: 'left 0.2s',
                    }} />
                  </span>
                </label>
              </div>
            </div>

            <button className="github-btn github-btn-primary" type="submit" disabled={saving || sendingCode}>
              {sendingCode ? 'Sending code...' : 
               saving ? 'Saving…' : 
               codeSent && password && currentPassword ? 'Verify & Change Password' :
               password && currentPassword ? 'Send Verification Code' :
               'Save changes'}
            </button>
          </form>

          <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
          
          <form onSubmit={startEmailChange}>
            <h3 style={{ marginTop: 0 }}>Change email</h3>
            <p className="muted small">We&apos;ll email a confirmation link to the new address.</p>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div className="small muted" style={{ marginBottom: 4 }}>New email</div>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="name@example.com" style={{ width: '100%' }} />
            </label>
            <button className="github-btn" type="submit" disabled={!newEmail}>Send confirmation</button>
          </form>

          {/* Learning Profile Edit Section: wrapper must be static and padding style must be longhand to match SSR/CSR */}
          <div className="github-card" style={{paddingTop: 18, paddingRight: 18, paddingBottom: 18, paddingLeft: 18, minHeight: 200}}>
            {/* Inner header row (edit/cancel/add buttons) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent:'space-between', marginBottom:8 }}>
              <h2 style={{margin:0,fontSize:'17px'}}>Learning Profile</h2>
              {learningProfile && !learningProfileEdit && (
                <button className="github-btn" onClick={()=>{ setLearningProfileEdit(true); setLPMessage(''); setLPFields({...learningProfile}) }}>Edit</button>
              )}
              {learningProfileEdit && (
                <button className="github-btn" onClick={()=>{ setLearningProfileEdit(false); setLPMessage(''); setLPFields(learningProfile ? {...learningProfile} : null)}}>Cancel</button>
              )}
            </div>
            {lpMessage && <div style={{marginBottom:10, background:'#e6fcf5', color:'#14853b', padding:'5px 12px', borderRadius:7, fontSize:13}}>{lpMessage}</div>}
            {lpSaving ? (<div style={{textAlign:'center',color:'#2563eb',fontWeight:600,margin:'42px 0'}}>Saving…</div>) : (
              (!learningProfile && !learningProfileEdit)
                ? (
                  <div style={{textAlign:'center',padding:'32px 0'}}>
                    <div className="small muted" style={{marginBottom:10}}>You have not set up your learning profile yet.</div>
                    <button onClick={() => { setLearningProfileEdit(true); setLPFields({}); }} className="github-btn github-btn-primary">Add Learning Profile</button>
                  </div>
                ) : (
                  learningProfileEdit
                  ? (<form onSubmit={saveLearningProfile} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                      <label><div className="small muted">Experience</div>
                        <select value={lpFields?.codingExperience||''} disabled style={{background:'#eef1f5'}}>
                          <option value="new">New</option><option value="intermediate">Intermediate</option><option value="expert">Expert</option>
                        </select>
                      </label>
                      <label><div className="small muted">Skill Level</div>
                        <input required type="number" min={1} max={10} value={lpFields?.skillLevel||1} disabled style={{background:'#eef1f5'}} />
                      </label>
                      <label><div className="small muted">Hours/week</div><input required type="number" min={1} max={99} value={lpFields?.hoursPerWeek||''} onChange={e=>lpField('hoursPerWeek',e.target.value)} /></label>
                      <label><div className="small muted">Motivation</div><select value={lpFields?.motivation||'medium'} onChange={e=>lpField('motivation',e.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
                      <label><div className="small muted">Activity Level</div><select value={lpFields?.activityLevel||''} onChange={e=>lpField('activityLevel',e.target.value)}><option value="">Select</option><option value="very_active">Very Active</option><option value="active">Active</option><option value="somewhat_active">Somewhat Active</option><option value="inactive">Inactive</option></select></label>
                      <label><div className="small muted">Age</div><input type="number" min={10} max={100} value={lpFields?.age||''} onChange={e=>lpField('age',e.target.value)} required/></label>
                      <label><div className="small muted">Years Coding</div><input type="number" min={0} max={80} value={lpFields?.yearsOfCoding||''} onChange={e=>lpField('yearsOfCoding',e.target.value)} required/></label>
                      <label><div className="small muted">Projects Completed</div><input type="number" min={0} max={500} value={lpFields?.projectsCompleted||''} onChange={e=>lpField('projectsCompleted',e.target.value)} required/></label>
                      <label><div className="small muted">Willingness</div><select value={lpFields?.willingToLearn||''} onChange={e=>lpField('willingToLearn',e.target.value)}><option value="very_willing">Very Willing</option><option value="somewhat_willing">Somewhat Willing</option><option value="not_willing">Not Willing</option></select></label>
                      <label><div className="small muted">Commitment</div><select value={lpFields?.commitmentLevel||''} onChange={e=>lpField('commitmentLevel',e.target.value)}><option value="very_committed">Very Committed</option><option value="committed">Committed</option><option value="somewhat_committed">Somewhat Committed</option><option value="exploring">Exploring</option></select></label>
                      <div style={{gridColumn:'1/3'}}>
                        <div className="small muted" style={{marginBottom:4}}>Languages to Learn <span style={{fontWeight:400,fontSize:12}}>(select one or more)</span></div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:4}}>
                          {PROGRAMMING_LANGUAGES.map((lang: string) => (
                            <label key={lang} style={{fontWeight:500,fontSize:13,background:lpFields?.languagesToLearn?.includes(lang)?'#dbeafe':'#f3f4f6',padding:'5px 10px',borderRadius:6,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                              <input
                                type="checkbox"
                                checked={Array.isArray(lpFields?.languagesToLearn) && lpFields.languagesToLearn.includes(lang)}
                                onChange={e=>{
                                  let arr = Array.isArray(lpFields?.languagesToLearn)?[...lpFields.languagesToLearn]:[];
                                  if(e.target.checked && !arr.includes(lang)) arr.push(lang);
                                  if(!e.target.checked) arr = arr.filter(l=>l!==lang);
                                  lpField('languagesToLearn', arr);
                                  if(!e.target.checked && lpFields?.primaryLanguageInterest===lang) lpField('primaryLanguageInterest','');
                                }}
                                style={{marginRight:2}}
                              /> {lang}
                            </label>
                          ))}
                          {Array.isArray(lpFields?.languagesToLearn) && lpFields.languagesToLearn.filter((l: string) => !PROGRAMMING_LANGUAGES.includes(l)).map((lang: string) => (
                            <label key={lang} style={{fontWeight:500,fontSize:13,background:'#fffbe7',padding:'5px 10px',borderRadius:6,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                              <input type="checkbox" checked={true} onChange={e=>{
                                let arr = Array.isArray(lpFields?.languagesToLearn)?[...lpFields.languagesToLearn]:[];
                                arr = arr.filter((l: string) => l!==lang);
                                lpField('languagesToLearn', arr);
                                if(lpFields?.primaryLanguageInterest===lang) lpField('primaryLanguageInterest','');
                              }} style={{marginRight:2}}/> {lang} <span style={{fontSize:11,marginLeft:3,opacity:.7}}>(custom)</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <label style={{gridColumn:'1/3'}}>
                        <div className="small muted">Primary Language Interest</div>
                        <select required value={lpFields?.primaryLanguageInterest||''} onChange={e=>lpField('primaryLanguageInterest',e.target.value)}>
                          <option value="">Select...</option>
                          {(Array.isArray(lpFields?.languagesToLearn) && lpFields.languagesToLearn.length>0
                            ? lpFields.languagesToLearn
                            : PROGRAMMING_LANGUAGES).map((lang: string) => (
                            <option key={lang} value={lang}>{lang}</option>
                          ))}
                        </select>
                      </label>
                      <button className="github-btn github-btn-primary" type="submit" disabled={lpSaving} style={{gridColumn:'1/-1',marginTop:8}}>{lpSaving?'Saving…':(!learningProfile?'Add Profile':'Save changes')}</button>
                    </form>)
                  : (
                    <ul style={{margin:0, padding:0, listStyle:'none', color:'#334155', fontSize:'15px'}}>
                      <li><b>Experience:</b> {learningProfile.codingExperience}</li>
                      <li><b>Skill Level:</b> {learningProfile.skillLevel}</li>
                      <li><b>Hours/week:</b> {learningProfile.hoursPerWeek}</li>
                      <li><b>Motivation:</b> {learningProfile.motivation}</li>
                      <li><b>Activity Level:</b> {learningProfile.activityLevel}</li>
                      <li><b>Age:</b> {learningProfile.age}</li>
                      <li><b>Years Coding:</b> {learningProfile.yearsOfCoding}</li>
                      <li><b>Projects Completed:</b> {learningProfile.projectsCompleted}</li>
                      <li><b>Willingness:</b> {learningProfile.willingToLearn}</li>
                      <li><b>Commitment:</b> {learningProfile.commitmentLevel}</li>
                      <li><b>Languages to Learn:</b> {Array.isArray(learningProfile.languagesToLearn)? learningProfile.languagesToLearn.join(', ') : ''}</li>
                      <li><b>Primary Language Interest:</b> {learningProfile.primaryLanguageInterest||''}</li>
                    </ul>
                  )
                )
            )}
          </div>
        </div>

        {/* Reclamations Section */}
        <div className="github-card" style={{paddingTop: 20, paddingRight: 20, paddingBottom: 20, paddingLeft: 20}}>
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

        {/* Right Column - Achievements & NFTs Placeholder */}
        <div>
          <div className="github-card" style={{ paddingTop: 20, paddingRight: 20, paddingBottom: 20, paddingLeft: 20, minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 12px', opacity: 0.3 }}>
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
              </svg>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>Achievements & NFTs</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Coming soon...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



























