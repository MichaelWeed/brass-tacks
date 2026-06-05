'use client';

import React, { useState, useEffect } from 'react';
import ResumeUpload from '../../../components/ResumeUpload';

interface ProfileResponse {
  id: string;
  is_active: boolean;
  raw_text?: string;
}

export default function ProfilePage() {
  const [brainDump, setBrainDump] = useState('');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingImports, setPendingImports] = useState<{name: string, content: string, id: string}[]>([]);
  const [previewingImport, setPreviewingImport] = useState<{name: string, content: string} | null>(null);
  
  // Identity state
  const [identity, setIdentity] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: ''
  });

  // Education state
  const [education, setEducation] = useState<{degree: string, school: string, period: string, id: string}[]>([]);

  // Load existing data
  useEffect(() => {
    const token = localStorage.getItem('tf_token');
    if (!token) {
      localStorage.removeItem('tf_token');
      localStorage.removeItem('tf_profile_id');
      localStorage.removeItem('tf_master_profile');
      const timer = setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      return () => clearTimeout(timer);
    }

    fetch('/api/v1/profiles', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch profiles');
      return res.json();
    })
    .then(data => {
      setTimeout(() => {
        if (Array.isArray(data) && data.length > 0) {
          // Use the active profile; backend upserts so there is only one
          const activeProfile = data.find((p: ProfileResponse) => p.is_active) ?? data[0];
          if (activeProfile) {
            localStorage.setItem('tf_profile_id', activeProfile.id);
            localStorage.setItem('tf_master_profile', activeProfile.raw_text ?? '');
            setBrainDump(activeProfile.raw_text ?? '');
          }
        } else {
          const saved = localStorage.getItem('tf_master_profile');
          if (saved) setBrainDump(saved);
        }
      }, 0);
    })
    .catch(err => {
      console.warn("Failed to fetch remote profiles, falling back to localStorage:", err);
      const saved = localStorage.getItem('tf_master_profile');
      if (saved) {
        setTimeout(() => setBrainDump(saved), 0);
      }
    });
    
    const savedId = localStorage.getItem('tf_identity');
    const savedEdu = localStorage.getItem('tf_education');
    const savedTime = localStorage.getItem('tf_profile_last_saved');

    const timer = setTimeout(() => {
      if (savedId) {
        try {
          setIdentity(JSON.parse(savedId));
        } catch (e) {
          console.error(e);
        }
      }
      if (savedEdu) {
        try {
          setEducation(JSON.parse(savedEdu));
        } catch (e) {
          console.error(e);
        }
      }
      if (savedTime) setLastSaved(savedTime);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    const token = localStorage.getItem('tf_token');
    if (!token) {
      localStorage.removeItem('tf_token');
      localStorage.removeItem('tf_profile_id');
      localStorage.removeItem('tf_master_profile');
      setIsSaving(false);
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      throw new Error('Authentication token is missing. Access denied.');
    }

    fetch('/api/v1/profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        raw_text: brainDump,
        is_active: true
      })
    })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Profile save failed: ${res.statusText}`);
      }
      return res.json();
    })
    .then((data) => {
      if (data.id) {
        localStorage.setItem('tf_profile_id', data.id);
      }
      localStorage.setItem('tf_master_profile', brainDump);
      localStorage.setItem('tf_identity', JSON.stringify(identity));
      localStorage.setItem('tf_education', JSON.stringify(education));
      
      const now = new Date().toLocaleString();
      localStorage.setItem('tf_profile_last_saved', now);
      setLastSaved(now);
      setIsSaving(false);
    })
    .catch((err) => {
      console.warn("Failed to save remote profile, falling back to localStorage only:", err);
      localStorage.setItem('tf_master_profile', brainDump);
      localStorage.setItem('tf_identity', JSON.stringify(identity));
      localStorage.setItem('tf_education', JSON.stringify(education));
      
      const now = new Date().toLocaleString();
      localStorage.setItem('tf_profile_last_saved', now);
      setLastSaved(now);
      setIsSaving(false);
    });
  };


  const handleImport = (name: string, content: string) => {
    if (content === "[EXTRACTING...]") {
      setIsSaving(true);
      return;
    }
    
    setIsSaving(false);
    
    // Instead of auto-appending, add to pending list
    const newImport = {
      name,
      content,
      id: Math.random().toString(36).substr(2, 9)
    };
    
    setPendingImports(prev => [...prev, newImport]);
  };

  const appendToDump = (id: string) => {
    const item = pendingImports.find(p => p.id === id);
    if (item) {
      const timestamp = new Date().toLocaleDateString();
      const formattedContent = `\n\n--- IMPORTED: ${item.name} (${timestamp}) ---\n${item.content}\n--- END IMPORT ---`;
      setBrainDump(prev => prev + formattedContent);
      setPendingImports(prev => prev.filter(p => p.id !== id));
    }
  };

  const discardImport = (id: string) => {
    setPendingImports(prev => prev.filter(p => p.id !== id));
  };

  const addEducation = () => {
    setEducation([...education, { degree: '', school: '', period: '', id: Math.random().toString(36).substr(2, 9) }]);
  };

  const removeEducation = (id: string) => {
    setEducation(education.filter(e => e.id !== id));
  };

  const updateEducation = (id: string, field: string, value: string) => {
    setEducation(education.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  return (
    <div className="animate-in" style={{ maxWidth: '900px' }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Master Profile</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            This is your source of truth. Manage your identity, education, and raw career dump.
          </p>
        </div>
        {lastSaved && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
            Last saved: {lastSaved}
          </div>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Identity Section */}
          <section className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              👤 Identity & Contact
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={identity.name} 
                  onChange={e => setIdentity({...identity, name: e.target.value})}
                  placeholder="Michael Weed"
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  value={identity.email} 
                  onChange={e => setIdentity({...identity, email: e.target.value})}
                  placeholder="michael@example.com"
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input 
                  type="text" 
                  value={identity.phone} 
                  onChange={e => setIdentity({...identity, phone: e.target.value})}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input 
                  type="text" 
                  value={identity.location} 
                  onChange={e => setIdentity({...identity, location: e.target.value})}
                  placeholder="San Francisco, CA"
                />
              </div>
              <div className="form-group">
                <label>LinkedIn URL</label>
                <input 
                  type="text" 
                  value={identity.linkedin} 
                  onChange={e => setIdentity({...identity, linkedin: e.target.value})}
                  placeholder="linkedin.com/in/mweed"
                />
              </div>
              <div className="form-group">
                <label>Personal Website</label>
                <input 
                  type="text" 
                  value={identity.website} 
                  onChange={e => setIdentity({...identity, website: e.target.value})}
                  placeholder="michaelweed.xyz"
                />
              </div>
            </div>
          </section>

          {/* Brain Dump Section */}
          <section className="card" style={{ padding: '2rem', border: '1px solid var(--border-active)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>The Brain Dump</h2>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', border: '1px solid var(--border)', padding: '0.1rem 0.4rem', borderRadius: '4px', letterSpacing: '0.05em' }}>PLAIN TEXT RECORD</span>
            </div>
            <div className="badge badge-amber">{brainDump.length.toLocaleString()} CHARS</div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            This is your raw, unformatted professional history. Every word here is stored as plain text and used to forge your applications. 
            <strong> No hashing or encryption is applied to your content.</strong>
          </p>
          
          <div style={{ position: 'relative' }}>
            <textarea
              value={brainDump}
              onChange={(e) => setBrainDump(e.target.value)}
              placeholder="Start typing your career story... Mention specific projects, outcomes, and technologies."
              style={{
                width: '100%',
                minHeight: '500px',
                background: 'var(--bg-deep)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '2rem',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                lineHeight: '1.7',
                fontFamily: 'var(--font-mono)',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', alignItems: 'center', gap: '1rem' }}>
            {lastSaved && !isSaving && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Autosave active. Last manually saved: {lastSaved.split(',')[1]}
              </span>
            )}
            <button 
              className="btn-primary" 
              onClick={handleSave}
              disabled={isSaving}
              style={{ minWidth: '160px' }}
            >
              {isSaving ? 'Saving to Local...' : 'Save Master Record'}
            </button>
          </div>
        </section>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Education Section */}
          <section className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>🎓 Education</h2>
              <button className="btn-ghost" style={{ fontSize: '0.8rem' }} onClick={addEducation}>+ Add Degree</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {education.map(edu => (
                <div key={edu.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 150px auto', gap: '1rem', alignItems: 'end' }}>
                  <div className="form-group">
                    <label>Degree / Field</label>
                    <input 
                      type="text" 
                      value={edu.degree} 
                      onChange={e => updateEducation(edu.id, 'degree', e.target.value)}
                      placeholder="B.S. Computer Science"
                    />
                  </div>
                  <div className="form-group">
                    <label>School / University</label>
                    <input 
                      type="text" 
                      value={edu.school} 
                      onChange={e => updateEducation(edu.id, 'school', e.target.value)}
                      placeholder="Stanford University"
                    />
                  </div>
                  <div className="form-group">
                    <label>Period</label>
                    <input 
                      type="text" 
                      value={edu.period} 
                      onChange={e => updateEducation(edu.id, 'period', e.target.value)}
                      placeholder="2014 - 2018"
                    />
                  </div>
                  <button className="btn-ghost" style={{ color: 'var(--error)' }} onClick={() => removeEducation(edu.id)}>✕</button>
                </div>
              ))}
              {education.length === 0 && (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                  No education records added yet.
                </p>
              )}
            </div>
          </section>

          {/* Import Section */}
          <section className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Import Reference Documents</h3>
            <ResumeUpload 
              onFileAccepted={handleImport} 
              uploadedName="" 
              initialContent=""
            />
            
            {pendingImports.length > 0 && (
              <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pending Imports ({pendingImports.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {pendingImports.map(imp => (
                    <div key={imp.id} style={{ 
                      background: 'var(--bg-deep)', 
                      padding: '1rem', 
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>📄</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{imp.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Ready for your Brain Dump</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, marginLeft: '1rem' }}>
                        <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }} onClick={() => discardImport(imp.id)}>Discard</button>
                        <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', border: '1px solid var(--border)' }} onClick={() => setPreviewingImport(imp)}>Preview</button>
                        <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.4rem 1rem' }} onClick={() => appendToDump(imp.id)}>Append</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Preview Modal */}
          {previewingImport && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '2rem',
              backdropFilter: 'blur(4px)'
            }}>
              <div className="card" style={{ maxWidth: '800px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem' }}>Verify Extraction: {previewingImport.name}</h3>
                  <button className="btn-ghost" onClick={() => setPreviewingImport(null)}>✕ Close</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-deep)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: 'var(--text-main)' }}>
                  {previewingImport.content}
                </div>
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                   <button className="btn-primary" onClick={() => {
                     const item = pendingImports.find(p => p.name === previewingImport.name);
                     if (item) appendToDump(item.id);
                     setPreviewingImport(null);
                   }}>Looks Good, Append</button>
                </div>
              </div>
            </div>
          )}
          </div>
      </div>
    </div>
  );
}
