'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ResumeUpload from '../../components/ResumeUpload';

type Step = 'identity' | 'upload' | 'dump' | 'keys';

export default function OnboardingWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('identity');
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [brainDumpText, setBrainDumpText] = useState('');
  
  const [apiProvider, setApiProvider] = useState<'openai' | 'anthropic' | 'google' | 'grok'>('google');
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: '',
    grok: ''
  });

  // Verify user presence on mount
  useEffect(() => {
    fetch('/api/v1/auth/check')
      .then(res => res.json())
      .then(data => {
        setHasUsers(data.has_users);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to check user presence, assume first run:', err);
        setHasUsers(false);
        setIsLoading(false);
      });
  }, []);

  const handleQuickLogin = (existingEmail: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    const formData = new URLSearchParams();
    formData.append('username', existingEmail);
    formData.append('password', 'local');

    fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    })
      .then(res => {
        if (!res.ok) throw new Error('Authentication failed');
        return res.json();
      })
      .then(data => {
        localStorage.setItem('tf_token', data.access_token);
        
        // Retrieve profile details to populate LocalStorage
        return fetch('/api/v1/profiles', {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        });
      })
      .then(res => res.json())
      .then(profiles => {
        if (Array.isArray(profiles) && profiles.length > 0) {
          const active = profiles.find(p => p.is_active) || profiles[0];
          localStorage.setItem('tf_profile_id', active.id);
          localStorage.setItem('tf_master_profile', active.raw_text || '');
        }
        router.push('/dashboard');
      })
      .catch(() => {
        setIsLoading(false);
        setErrorMsg('Authentication failed. Please verify the email address is correct.');
      });
  };

  const registerUserAndLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // 1. Register
      const registerRes = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: name, password: 'local' })
      });
      if (!registerRes.ok) {
        throw new Error('Registration failed. Please enter a valid email.');
      }
      
      // 2. Login to get token
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', 'local');
      const loginRes = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });
      if (!loginRes.ok) {
        throw new Error('Local login failed.');
      }
      
      const authData = await loginRes.json();
      localStorage.setItem('tf_token', authData.access_token);
      
      // Advance to next step
      setIsLoading(false);
      setCurrentStep('upload');
    } catch (err: unknown) {
      setIsLoading(false);
      setErrorMsg(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    }
  };

  const handleFileAccepted = (filename: string, content: string) => {
    setUploadedFileName(filename);
    if (content && content !== '[EXTRACTING...]') {
      setBrainDumpText(content);
    }
  };

  const handleFinishSetup = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const token = localStorage.getItem('tf_token');
    if (!token) {
      setErrorMsg('Session expired. Please restart the setup.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Save Profile
      const profileRes = await fetch('/api/v1/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          raw_text: brainDumpText,
          is_active: true
        })
      });
      if (!profileRes.ok) {
        throw new Error('Failed to save master profile to the local database.');
      }
      const profileData = await profileRes.json();
      localStorage.setItem('tf_profile_id', profileData.id);
      localStorage.setItem('tf_master_profile', brainDumpText);

      // 2. Save identity locally
      const identityObj = { name, email, phone, location, website, linkedin };
      localStorage.setItem('tf_identity', JSON.stringify(identityObj));
      
      // 3. Save API Keys locally
      localStorage.setItem('tf_api_provider', apiProvider);
      localStorage.setItem('tf_api_keys', JSON.stringify(apiKeys));

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: unknown) {
      setIsLoading(false);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to complete configuration.');
    }
  };

  if (isLoading && currentStep === 'identity') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-void)', color: 'var(--text-main)' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(240, 165, 0, 0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', marginBottom: '1.5rem' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', letterSpacing: '0.05em' }}>VERIFYING BRASS TACKS ENVIRONMENT...</p>
      </div>
    );
  }

  // Welcome back screen if users exist
  if (hasUsers && currentStep === 'identity') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-void)', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '3rem 2.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, color: '#000', marginBottom: '1.5rem' }}>B</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Welcome Back</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Enter your email to resume your local resume forging.</p>
          </header>

          {errorMsg && (
            <div style={{ padding: '1rem', background: 'rgba(255, 87, 87, 0.05)', border: '1px solid rgba(255, 87, 87, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--error)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleQuickLogin(email); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label>Registered Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ padding: '1rem' }}
              />
            </div>
            
            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem' }} disabled={isLoading}>
              {isLoading ? 'Authenticating...' : 'Enter Platform'}
            </button>
          </form>

          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              First time running Brass Tacks on this machine?
            </p>
            <button className="btn-ghost" style={{ marginTop: '0.75rem', width: '100%', fontSize: '0.8rem' }} onClick={() => setHasUsers(false)}>
              Start Fresh Onboarding
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Onboarding steps
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-void)' }}>
      {/* Navbar */}
      <nav style={{ padding: '1.5rem 0', borderBottom: '1px solid var(--border)', background: 'rgba(2,2,4,0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 900, color: '#000' }}>B</div>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#fff', letterSpacing: '-0.03em' }}>Brass Tacks Setup</span>
          </div>
          <div className="badge badge-amber" style={{ letterSpacing: '0.05em' }}>LOCAL GATEWAY</div>
        </div>
      </nav>

      {/* Main setup container */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '4rem 0' }}>
        <div className="container-narrow animate-in">
          {/* Stepper indicators */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3.5rem', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '18px', left: '10%', right: '10%', height: '2px', background: 'var(--border)', zIndex: 0 }} />
            <div style={{ position: 'absolute', top: '18px', left: '10%', width: currentStep === 'identity' ? '0%' : currentStep === 'upload' ? '33%' : currentStep === 'dump' ? '66%' : '80%', height: '2px', background: 'var(--primary)', zIndex: 0, transition: 'width 0.4s ease' }} />
            
            {[
              { id: 'identity', num: 1, label: 'Identity' },
              { id: 'upload', num: 2, label: 'Resume' },
              { id: 'dump', num: 3, label: 'Brain Dump' },
              { id: 'keys', num: 4, label: 'API Keys' }
            ].map(step => {
              const active = currentStep === step.id;
              const stepsOrder = ['identity', 'upload', 'dump', 'keys'];
              const completed = stepsOrder.indexOf(currentStep) > stepsOrder.indexOf(step.id);
              
              return (
                <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1, cursor: 'default' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    border: `2px solid ${active || completed ? 'var(--primary)' : 'var(--border)'}`,
                    background: completed ? 'var(--primary)' : active ? 'var(--primary-subtle)' : 'var(--bg-surface)',
                    color: completed ? '#000' : active ? 'var(--primary)' : 'var(--text-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                    boxShadow: active ? '0 0 16px var(--primary-glow)' : 'none',
                    transition: 'all 0.3s ease'
                  }}>
                    {completed ? '✓' : step.num}
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: active ? 'var(--primary)' : completed ? 'var(--text-main)' : 'var(--text-dim)' }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Form Card */}
          <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '3rem 2.5rem' }}>
            {errorMsg && (
              <div style={{ padding: '1rem', background: 'rgba(255, 87, 87, 0.05)', border: '1px solid rgba(255, 87, 87, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--error)', fontSize: '0.85rem', marginBottom: '2.5rem' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {/* STEP 1: IDENTITY */}
            {currentStep === 'identity' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>1. Identity & Contact</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
                  Establish your basic personal information. These fields will populate the header of your forged resumes.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" required />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. john.doe@gmail.com" required />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +1 (555) 019-2834" />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. San Francisco, CA" />
                  </div>
                  <div className="form-group">
                    <label>LinkedIn URL</label>
                    <input type="text" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/username" />
                  </div>
                  <div className="form-group">
                    <label>Personal Website</label>
                    <input type="text" value={website} onChange={e => setWebsite(e.target.value)} placeholder="e.g. johndoe.dev" />
                  </div>
                </div>
                <button
                  className="btn-primary"
                  style={{ width: '100%', padding: '1rem' }}
                  onClick={registerUserAndLogin}
                  disabled={!name || !email}
                >
                  Verify & Continue
                </button>
              </div>
            )}

            {/* STEP 2: RESUME IMPORT */}
            {currentStep === 'upload' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>2. Import Existing Resume</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
                  Optional. If you have an existing resume, upload it. We will parse it locally using Docling and use the content to populate your Brain Dump.
                </p>
                <div style={{ marginBottom: '2.5rem' }}>
                  <ResumeUpload onFileAccepted={handleFileAccepted} uploadedName={uploadedFileName} />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn-ghost" style={{ flex: 1, padding: '1rem' }} onClick={() => setCurrentStep('dump')}>
                    Skip Import
                  </button>
                  <button className="btn-primary" style={{ flex: 1, padding: '1rem' }} onClick={() => setCurrentStep('dump')} disabled={!!(uploadedFileName && brainDumpText.length === 0)}>
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: BRAIN DUMP */}
            {currentStep === 'dump' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>3. The Brain Dump</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                  This is the single source of truth for your professional history. Every project, metric, and skill should go here. Brass Tacks will select only the relevant parts for each application.
                </p>
                <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Plain Text Career History
                    <span style={{ fontSize: '0.75rem', textTransform: 'lowercase', color: 'var(--text-dim)' }}>
                      {brainDumpText.length.toLocaleString()} characters
                    </span>
                  </label>
                  <textarea
                    value={brainDumpText}
                    onChange={e => setBrainDumpText(e.target.value)}
                    placeholder="Write or paste your entire career timeline here. Include bullets, technical details, raw notes, or certifications. The more content, the better the engine performs."
                    style={{ minHeight: '300px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: '1.6', padding: '1.25rem' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn-ghost" style={{ flex: 1, padding: '1rem' }} onClick={() => setCurrentStep('upload')}>
                    Back
                  </button>
                  <button className="btn-primary" style={{ flex: 1, padding: '1rem' }} onClick={() => setCurrentStep('keys')} disabled={!brainDumpText.trim()}>
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: API KEYS CONFIGURATION */}
            {currentStep === 'keys' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>4. AI Model API Keys</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
                  Configure your LLM key. By default, Brass Tacks utilizes Google Gemini Flash. The keys are saved locally in your browser.
                </p>

                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label>Default LLM Provider</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {(['google', 'openai', 'anthropic', 'grok'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setApiProvider(p)}
                        type="button"
                        style={{
                          padding: '0.875rem',
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${apiProvider === p ? 'var(--primary)' : 'var(--border)'}`,
                          background: apiProvider === p ? 'var(--primary-subtle)' : 'var(--bg-deep)',
                          color: apiProvider === p ? 'var(--primary)' : 'var(--text-main)',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          fontSize: '0.85rem'
                        }}
                      >
                        {p === 'google' ? 'Gemini (Default)' : p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {apiProvider.charAt(0).toUpperCase() + apiProvider.slice(1)} API Key
                    <a
                      href={
                        apiProvider === 'openai' ? 'https://platform.openai.com/api-keys' :
                        apiProvider === 'anthropic' ? 'https://console.anthropic.com/settings/keys' :
                        apiProvider === 'google' ? 'https://aistudio.google.com/app/apikey' :
                        'https://console.x.ai/'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary)', fontSize: '0.75rem' }}
                    >
                      Get key ↗
                    </a>
                  </label>
                  <input
                    type="password"
                    placeholder={`Enter your ${apiProvider} API key`}
                    value={apiKeys[apiProvider]}
                    onChange={(e) => setApiKeys({ ...apiKeys, [apiProvider]: e.target.value })}
                    style={{ padding: '1rem' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                    🔒 This key is saved in local browser storage and used directly from your machine.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn-ghost" style={{ flex: 1, padding: '1rem' }} onClick={() => setCurrentStep('dump')}>
                    Back
                  </button>
                  <button className="btn-primary" style={{ flex: 1, padding: '1rem' }} onClick={handleFinishSetup} disabled={!apiKeys[apiProvider]}>
                    Complete Setup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
