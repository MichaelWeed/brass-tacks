'use client';

import React, { useState, useEffect } from 'react';
import ForgeStatus from '../../../../components/ForgeStatus';
import StepIndicator from '../../../../components/StepIndicator';

type Step = 'sourcing' | 'review' | 'config' | 'forge';

interface ModelItem {
  id: string;
  name: string;
}

interface HistoryItem {
  id: string;
  role?: string;
  company?: string;
  jobDescription?: string;
  type?: 'resume' | 'cover_letter';
  sourceUrl?: string;
  companyContext?: string;
  referenceUrls?: string[];
}

interface ProfileItem {
  id: string;
  is_active?: boolean;
}

export default function NewApplicationPage() {
  const [step, setStep] = useState<Step>('sourcing');
  const [url, setUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [companyContext, setCompanyContext] = useState('');
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [descTab, setDescTab] = useState<'edit' | 'preview'>('edit');

  // API settings (loaded from localStorage on mount)
  const [apiProvider, setApiProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [availableModels, setAvailableModels] = useState<ModelItem[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loadingModels, setLoadingModels] = useState(false);

  const [formData, setFormData] = useState({
    jobTitle: '',
    jobCompany: '',
    jobDescription: '',
    tuningLevel: 'professional' as 'standard' | 'professional' | 'aggressive',
    outputs: ['resume'] as ('resume' | 'cover_letter')[],
  });

  const toggleOutput = (type: 'resume' | 'cover_letter') => {
    setFormData(prev => {
      const exists = prev.outputs.includes(type);
      if (exists && prev.outputs.length === 1) return prev;
      return {
        ...prev,
        outputs: exists ? prev.outputs.filter(o => o !== type) : [...prev.outputs, type]
      };
    });
  };

  const [runId, setRunId] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  // ── Load API credentials ──────────────────────────────────────────────────
  useEffect(() => {
    const savedProvider = localStorage.getItem('tf_api_provider') || 'openai';
    const keysJson = localStorage.getItem('tf_api_keys');
    let resolvedProvider = savedProvider;
    let resolvedKey = '';

    if (keysJson) {
      try {
        const keys = JSON.parse(keysJson) as Record<string, string>;
        const savedKey = keys[savedProvider] || '';
        if (savedKey) {
          resolvedKey = savedKey;
        } else {
          // Saved provider has no key — find first provider that does
          const order = ['openai', 'anthropic', 'google', 'grok'] as const;
          for (const p of order) {
            if (keys[p]) {
              resolvedProvider = p;
              resolvedKey = keys[p];
              break;
            }
          }
        }
      } catch {
        // Legacy single-key fallback
        const legacyKey = localStorage.getItem('tf_api_key');
        if (legacyKey) resolvedKey = legacyKey;
      }
    }

    const prov = resolvedProvider;
    const key = resolvedKey;
    setTimeout(() => {
      setApiProvider(prov);
      setApiKey(key);
    }, 0);
  }, []);

  // ── Load Reuse Hook ────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('reuse');
      if (id) {
        const savedHistory = localStorage.getItem('tf_forge_history');
        if (savedHistory) {
          try {
            const historyList = JSON.parse(savedHistory);
            const found = historyList.find((h: HistoryItem) => h.id === id);
            if (found) {
              setTimeout(() => {
                setFormData({
                  jobTitle: found.role || '',
                  jobCompany: found.company || '',
                  jobDescription: found.jobDescription || '',
                  tuningLevel: 'professional',
                  outputs: [found.type || 'resume'],
                });
                setSourceUrl(found.sourceUrl || '');
                setCompanyContext(found.companyContext || '');
                setReferenceUrls(found.referenceUrls || []);
                setStep('review');
              }, 0);
            }
          } catch (e) {
            console.error('Failed to parse history item for reuse:', e);
          }
        }
      }
    }
  }, []);

  // ── Fetch model list whenever we enter config step ────────────────────────
  useEffect(() => {
    if (step !== 'config' || !apiKey || !apiProvider) return;
    setTimeout(() => setLoadingModels(true), 0);
    const token = localStorage.getItem('tf_token') || '';
    fetch('/api/v1/generation/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ provider: apiProvider, api_key: apiKey }),
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((models: ModelItem[]) => {
        setAvailableModels(models);
        if (models.length > 0 && !selectedModel) {
          setSelectedModel(models[0].id);
        }
      })
      .catch(err => {
        console.warn('Could not fetch models:', err);
        setAvailableModels([]);
      })
      .finally(() => setLoadingModels(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleReset = () => {
    setStep('sourcing');
    setUrl('');
    setSourceUrl('');
    setCompanyContext('');
    setReferenceUrls([]);
    setFormData({
      jobTitle: '',
      jobCompany: '',
      jobDescription: '',
      tuningLevel: 'professional',
      outputs: ['resume'],
    });
    setRunId(null);
    setDemoMode(false);
    setError(null);
  };

  const handleExtract = async () => {
    if (!url.trim()) return;
    setIsExtracting(true);
    setError(null);

    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const token = localStorage.getItem('tf_token') || '';
        const res = await fetch('/api/v1/jobs/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            url: url.trim(),
            api_provider: apiProvider || null,
            api_key: apiKey || null
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(err || 'Extraction failed');
        }

        const data = await res.json();
        setFormData(prev => ({
          ...prev,
          jobTitle: data.title || '',
          jobCompany: data.company || '',
          jobDescription: data.description || '',
        }));
        setSourceUrl(data.source_url || url.trim());
        setCompanyContext(data.company_context || '');
        setReferenceUrls(data.reference_urls || []);
      } else {
        // Raw-text paste: naive parse
        const lines = url.split('\n').filter(l => l.trim().length > 0);
        const title = lines[0]?.replace(/Job Title:|Role:/i, '').trim() || '';
        const company = lines[1]?.replace(/Company:|At:/i, '').trim() || '';
        setFormData(prev => ({
          ...prev,
          jobTitle: title,
          jobCompany: company,
          jobDescription: url,
        }));
        setSourceUrl('');
        setCompanyContext('');
        setReferenceUrls([]);
      }

      setStep('review');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(`Could not extract details automatically: ${errMsg}. You can edit the fields manually.`);
      setStep('review');
    } finally {
      setIsExtracting(false);
    }
  };

  const startForge = async () => {
    if (!apiKey) {
      setError('No API key found. Please go to Settings and enter an API key before forging.');
      return;
    }

    const token = localStorage.getItem('tf_token') || '';
    let profileId = localStorage.getItem('tf_profile_id');

    setStep('forge');
    setError(null);

    try {
      // Auto-heal missing profile ID
      if (!profileId) {
        const profRes = await fetch('/api/v1/profiles', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profRes.ok) {
          const profData = await profRes.json();
          if (Array.isArray(profData) && profData.length > 0) {
            // Backend upserts — there is at most one active profile
            const active = profData.find((p: ProfileItem) => p.is_active) ?? profData[0];
            profileId = active?.id ?? null;
            if (profileId) localStorage.setItem('tf_profile_id', profileId);
          }
        }
      }

      if (!profileId) {
        throw new Error('No Master Profile found. Please go to the Profile page and save your details first.');
      }

      // Save the job posting
      const jobRes = await fetch('/api/v1/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          raw_text: formData.jobDescription,
          company_name: formData.jobCompany,
          role_title: formData.jobTitle,
        }),
      });

      if (!jobRes.ok) throw new Error(`Failed to save job: ${jobRes.statusText}`);
      const jobData = await jobRes.json();
      if (!jobData.id) throw new Error('Job save returned no ID');

      const levelMap: Record<string, string> = {
        standard: 'light',
        professional: 'medium',
        aggressive: 'heavy',
      };

      const genRes = await fetch('/api/v1/generation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          profile_id: profileId,
          job_id: jobData.id,
          output_type: formData.outputs[0] || 'resume',
          weirdness_level: levelMap[formData.tuningLevel] || 'medium',
          api_provider: apiProvider,
          api_key: apiKey,
          model_id: selectedModel || null,
        }),
      });

      if (!genRes.ok) {
        const genErr = await genRes.text();
        throw new Error(`Generation failed to start: ${genErr || genRes.statusText}`);
      }

      const genData = await genRes.json();
      setRunId(genData.id);
      setDemoMode(false);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setError(errMsg || 'Failed to start tailoring pipeline');
      setDemoMode(false);
      setStep('config');
    }
  };

  const providerLabel: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    grok: 'Grok (xAI)',
  };

  return (
    <div className="animate-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>New Application</h1>
        <p style={{ color: 'var(--text-muted)' }}>Forge a precision-tailored document for a specific role.</p>
        <div style={{ marginTop: '2rem', maxWidth: '400px', margin: '2rem auto 0' }}>
          <StepIndicator currentStep={step === 'sourcing' ? 1 : step === 'review' ? 2 : step === 'config' ? 3 : 4} />
        </div>
      </header>

      {/* ── Step 1: Sourcing ──────────────────────────────────────────── */}
      {step === 'sourcing' && (
        <section className="animate-slide">
          <div className="card" style={{ padding: '2.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Step 1: Job Sourcing</h2>
            <p style={{ marginBottom: '2rem' }}>Paste a link to the job posting. We&apos;ll attempt to extract the title, company, and description automatically.</p>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Job Posting URL or Description</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <textarea
                  placeholder="Paste URL or full job description..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  style={{ flex: 1, minHeight: '80px' }}
                />
                <button
                  className="btn-primary"
                  onClick={handleExtract}
                  disabled={isExtracting || !url.trim()}
                  style={{ alignSelf: 'flex-end' }}
                >
                  {isExtracting ? 'Extracting...' : 'Extract'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>— OR —</span>
            </div>

            <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setStep('review')}>
              Paste Details Manually
            </button>
          </div>
        </section>
      )}

      {/* ── Step 2: Review ───────────────────────────────────────────── */}
      {step === 'review' && (
        <section className="animate-slide">
          <div className="card" style={{ padding: '2.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Step 2: Review Details</h2>

            {error && (
              <div style={{ background: 'rgba(255,87,87,0.08)', border: '1px solid rgba(255,87,87,0.25)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--error)' }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Job Title</label>
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Company</label>
                <input
                  type="text"
                  value={formData.jobCompany}
                  onChange={e => setFormData({ ...formData, jobCompany: e.target.value })}
                />
              </div>
            </div>

            {/* Description Mode Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <button 
                type="button" 
                onClick={() => setDescTab('edit')} 
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  color: descTab === 'edit' ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: descTab === 'edit' ? '2px solid var(--primary)' : 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              >
                ✏️ Edit Content
              </button>
              <button 
                type="button" 
                onClick={() => setDescTab('preview')} 
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  color: descTab === 'preview' ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: descTab === 'preview' ? '2px solid var(--primary)' : 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              >
                👁️ Formatted Preview
              </button>
            </div>

            {descTab === 'edit' ? (
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <textarea
                  value={formData.jobDescription}
                  onChange={e => setFormData({ ...formData, jobDescription: e.target.value })}
                  style={{ minHeight: '250px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 1.65 }}
                  placeholder="Paste or edit the job description..."
                />
              </div>
            ) : (
              <div style={{
                minHeight: '250px',
                maxHeight: '400px',
                overflowY: 'auto',
                background: 'var(--bg-deep)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '1.5rem',
                fontSize: '0.9rem',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                color: 'var(--text-main)',
                marginBottom: '1.5rem',
                fontFamily: 'inherit'
              }}>
                {formData.jobDescription || <span style={{ color: 'var(--text-muted)' }}>No job description text pasted yet.</span>}
              </div>
            )}

            {/* Smart Company Context Alert Box */}
            {companyContext && (
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
                  💡 Company Context & Intelligence
                </h4>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.5, margin: 0, color: 'var(--text-main)' }}>{companyContext}</p>
              </div>
            )}

            {/* Reference URLs */}
            {referenceUrls && referenceUrls.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 0 }}>
                  Reference Links
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {referenceUrls.map((url, i) => (
                    <a 
                      key={i} 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.35rem 0.75rem',
                        background: 'var(--bg-deep)',
                        border: '1px solid var(--border)',
                        borderRadius: '9999px',
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        transition: 'background 0.2s'
                      }}
                    >
                      🔗 {url.replace(/^https?:\/\/(www\.)?/, '').substring(0, 45)}{url.length > 45 ? '...' : ''}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Source URL reference box */}
            {sourceUrl && (
              <div style={{
                marginBottom: '2rem',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-deep)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>SOURCE</span>
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--primary)',
                    wordBreak: 'break-all',
                    textDecoration: 'none',
                  }}
                >
                  {sourceUrl}
                </a>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn-ghost" onClick={() => setStep('sourcing')}>← Back</button>
              <button
                className="btn-primary"
                onClick={() => setStep('config')}
                disabled={!formData.jobTitle && !formData.jobDescription}
              >
                Continue →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Step 3: Config ───────────────────────────────────────────── */}
      {step === 'config' && (
        <section className="animate-slide">
          <div className="card" style={{ padding: '2.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Step 3: Forge Configuration</h2>

            {error && (
              <div style={{ background: 'rgba(255,87,87,0.08)', border: '1px solid rgba(255,87,87,0.25)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--error)' }}>
                ⚠ {error}
              </div>
            )}

            {/* Provider + API Key status */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>AI Provider</label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                background: 'var(--bg-deep)',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${apiKey ? 'var(--success, #4caf50)' : 'var(--error)'}`,
              }}>
                <span style={{ fontWeight: 600 }}>{providerLabel[apiProvider] || apiProvider}</span>
                <span style={{ fontSize: '0.75rem', color: apiKey ? 'var(--success, #4caf50)' : 'var(--error)' }}>
                  {apiKey ? '● Key loaded' : '● No key — go to Settings'}
                </span>
                <a href="/settings" style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--primary)' }}>
                  Change ↗
                </a>
              </div>
            </div>

            {/* Model selector */}
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label>Model</label>
              {loadingModels ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Fetching available models…</p>
              ) : availableModels.length > 0 ? (
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-deep)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                  }}
                >
                  {availableModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                  {apiKey ? 'Could not fetch model list — will use provider default.' : 'Enter an API key in Settings to see available models.'}
                </p>
              )}
            </div>

            {/* Outputs */}
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label>Select Required Outputs</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {(['resume', 'cover_letter'] as const).map(t => {
                  const isActive = formData.outputs.includes(t);
                  return (
                    <button
                      key={t}
                      className={isActive ? 'btn-primary' : 'btn-ghost'}
                      style={{ flex: 1, textTransform: 'capitalize' }}
                      onClick={() => toggleOutput(t)}
                    >
                      {isActive && <span style={{ marginRight: '0.5rem' }}>✓</span>}
                      {t.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tuning */}
            <div className="form-group" style={{ marginBottom: '2.5rem' }}>
              <label>Precision Tuning</label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                {(['standard', 'professional', 'aggressive'] as const).map(l => (
                  <button
                    key={l}
                    className={formData.tuningLevel === l ? 'btn-primary' : 'btn-ghost'}
                    style={{ flex: 1, textTransform: 'capitalize' }}
                    onClick={() => setFormData({ ...formData, tuningLevel: l })}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                <strong>Standard:</strong> Faithful to your raw data.{' '}
                <strong>Professional:</strong> Enhances impact and grammar.{' '}
                <strong>Aggressive:</strong> Deep context matching and heavy formatting optimization.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn-ghost" onClick={() => setStep('review')}>← Back</button>
              <button
                className="btn-primary"
                onClick={startForge}
                disabled={!apiKey}
                style={{ minWidth: '160px', opacity: apiKey ? 1 : 0.5 }}
              >
                {apiKey ? '⚡ Start Forge' : '⚠ API Key Required'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Step 4: Forge ────────────────────────────────────────────── */}
      {step === 'forge' && (
        <section className="animate-slide">
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Forge in Progress</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Connecting to the Forge Engine… We are matching your brain dump with the job requirements.
            </p>
            <ForgeStatus
              runId={runId || ''}
              demoMode={demoMode}
              onReset={handleReset}
              jobData={formData}
            />
          </div>
        </section>
      )}
    </div>
  );
}
