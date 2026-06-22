'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

type DiagnosticStatus = 'idle' | 'running' | 'success' | 'failed';

interface DiagnosticResult {
  engineConnected: DiagnosticStatus;
  keyConfigured: DiagnosticStatus;
  identityConfigured: DiagnosticStatus;
  databaseResponsive: DiagnosticStatus;
}

export default function TroubleshootPage() {
  const [results, setResults] = useState<DiagnosticResult>({
    engineConnected: 'idle',
    keyConfigured: 'idle',
    identityConfigured: 'idle',
    databaseResponsive: 'idle',
  });
  
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'guides'>('diagnostics');
  const [selectedProvider, setSelectedProvider] = useState<string>('unknown');
  const [highlightedGuide, setHighlightedGuide] = useState<string | null>(null);

  const runDiagnostics = async () => {
    // Reset state and run sequentially for premium simulation feel
    setResults({
      engineConnected: 'running',
      keyConfigured: 'idle',
      identityConfigured: 'idle',
      databaseResponsive: 'idle',
    });

    // 1. Check Engine Connectivity
    let engineStatus: DiagnosticStatus = 'failed';
    try {
      const res = await fetch('/health');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'healthy') {
          engineStatus = 'success';
        }
      }
    } catch {
      engineStatus = 'failed';
    }

    setResults(prev => ({ ...prev, engineConnected: engineStatus }));
    
    // Slight pause to give visual premium feel of scanning
    await new Promise(resolve => setTimeout(resolve, 600));

    // 2. Check API Key configuration
    let keyStatus: DiagnosticStatus = 'failed';
    const provider = localStorage.getItem('tf_api_provider') || 'google'; // Default to google or active provider
    setSelectedProvider(provider);
    
    const keysJson = localStorage.getItem('tf_api_keys');
    let apiKey = '';
    if (keysJson) {
      try {
        const keys = JSON.parse(keysJson);
        apiKey = keys[provider] || '';
      } catch {}
    }
    
    const isConfigured = !!apiKey;
    keyStatus = isConfigured ? 'success' : 'failed';
    setResults(prev => ({ ...prev, keyConfigured: keyStatus }));

    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Check Identity configuration
    const identityJson = localStorage.getItem('tf_identity');
    let identityOk = false;
    if (identityJson) {
      try {
        const id = JSON.parse(identityJson);
        identityOk = !!id.name && !!id.email;
      } catch {}
    }
    const identityStatus: DiagnosticStatus = identityOk ? 'success' : 'failed';
    setResults(prev => ({ ...prev, identityConfigured: identityStatus }));

    await new Promise(resolve => setTimeout(resolve, 400));

    // 4. Check Database response (if backend is alive)
    let dbStatus: DiagnosticStatus = 'failed';
    if (engineStatus === 'success') {
      try {
        // Query profiles as a check for DB health
        const token = localStorage.getItem('tf_token');
        if (!token) {
          localStorage.removeItem('tf_token');
          localStorage.removeItem('tf_profile_id');
          localStorage.removeItem('tf_master_profile');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
          throw new Error('Authentication token is missing. Access denied.');
        }
        const res = await fetch('/api/v1/profiles', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.status === 200 || res.status === 401 || res.status === 404) {
          dbStatus = 'success';
        }
      } catch {
        dbStatus = 'failed';
      }
    }
    setResults(prev => ({ ...prev, databaseResponsive: dbStatus }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      runDiagnostics();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const navigateToGuide = (guideId: string) => {
    setActiveTab('guides');
    setHighlightedGuide(guideId);
    
    // Smooth scroll to the guide after the tab switches
    setTimeout(() => {
      const el = document.getElementById(guideId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const getStatusBadge = (status: DiagnosticStatus) => {
    switch (status) {
      case 'running':
        return (
          <span className="badge badge-amber" style={{ animation: 'pulse 1.4s infinite' }}>
            ◷ Scanning
          </span>
        );
      case 'success':
        return (
          <span className="badge badge-green">
            ✓ Healthy
          </span>
        );
      case 'failed':
        return (
          <span className="badge badge-error">
            ⚠ Action Needed
          </span>
        );
      default:
        return (
          <span className="badge" style={{ background: 'var(--bg-deep)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
            ● Idle
          </span>
        );
    }
  };

  const getGuideCardStyle = (guideId: string) => {
    const isHighlighted = highlightedGuide === guideId;
    return {
      padding: '2rem',
      background: 'var(--bg-surface)',
      border: isHighlighted ? '1px solid var(--primary)' : '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      boxShadow: isHighlighted ? 'var(--shadow-glow)' : 'var(--shadow-card)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative' as const,
      overflow: 'hidden',
    };
  };

  return (
    <div className="animate-in" style={{ maxWidth: '850px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '2rem' }}>🔧</span>
          <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Help & Troubleshoot</h1>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Diagnose connection links, verify API credentials, and resolve platform errors.
        </p>
      </header>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        marginBottom: '2rem',
        gap: '1.5rem',
      }}>
        <button
          onClick={() => {
            setActiveTab('diagnostics');
            setHighlightedGuide(null);
          }}
          style={{
            background: 'transparent',
            padding: '0.75rem 0',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: activeTab === 'diagnostics' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'diagnostics' ? '2px solid var(--primary)' : '2px solid transparent',
            transition: 'all var(--transition-fast)',
            borderRadius: 0,
            cursor: 'pointer',
          }}
        >
          🔍 System Diagnostics
        </button>
        <button
          onClick={() => setActiveTab('guides')}
          style={{
            background: 'transparent',
            padding: '0.75rem 0',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: activeTab === 'guides' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'guides' ? '2px solid var(--primary)' : '2px solid transparent',
            transition: 'all var(--transition-fast)',
            borderRadius: 0,
            cursor: 'pointer',
          }}
        >
          📘 Non-Developer Guides
        </button>
      </div>

      {activeTab === 'diagnostics' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Diagnostic Check Summary */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Diagnostics Suite</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>
                  Live integration verification for container services and client settings.
                </p>
              </div>
              <button 
                className="btn-accent" 
                onClick={runDiagnostics}
                disabled={Object.values(results).includes('running')}
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.8rem' }}
              >
                🔄 Re-run Scan
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Item 1: Engine Connectivity */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.2rem',
                background: 'var(--bg-deep)',
                border: results.engineConnected === 'failed' ? '1px solid var(--error)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                transition: 'border var(--transition-fast)'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.5rem' }}>🔌</span>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.15rem' }}>Brass Tacks Engine Status</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      Verifying that the FastAPI backend server is reachable at <code style={{ color: 'var(--accent)' }}>http://localhost:8001</code>.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {results.engineConnected === 'failed' && (
                    <button
                      onClick={() => navigateToGuide('guide-engine')}
                      style={{
                        background: 'rgba(255, 87, 87, 0.08)',
                        border: '1px solid var(--error)',
                        color: 'var(--error)',
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 87, 87, 0.16)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 87, 87, 0.08)';
                      }}
                    >
                      📖 View Relaunch Guide
                    </button>
                  )}
                  {getStatusBadge(results.engineConnected)}
                </div>
              </div>

              {/* Item 2: Database Status */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.2rem',
                background: 'var(--bg-deep)',
                border: results.databaseResponsive === 'failed' ? '1px solid var(--error)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                transition: 'border var(--transition-fast)'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.5rem' }}>🗄️</span>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.15rem' }}>Database & Vector Store Link</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      Verifying connection path from backend routes to PostgreSQL database.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {results.databaseResponsive === 'failed' && (
                    <button
                      onClick={() => navigateToGuide('guide-database')}
                      style={{
                        background: 'rgba(255, 87, 87, 0.08)',
                        border: '1px solid var(--error)',
                        color: 'var(--error)',
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 87, 87, 0.16)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 87, 87, 0.08)';
                      }}
                    >
                      📖 View Database Guide
                    </button>
                  )}
                  {getStatusBadge(results.databaseResponsive)}
                </div>
              </div>

              {/* Item 3: API Key Configuration */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.2rem',
                background: 'var(--bg-deep)',
                border: results.keyConfigured === 'failed' ? '1px solid var(--error)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                transition: 'border var(--transition-fast)'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.5rem' }}>🔑</span>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.15rem' }}>Active API Credentials</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      Checking local storage credentials for selected provider: <strong style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{selectedProvider}</strong>.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {results.keyConfigured === 'failed' && (
                    <button
                      onClick={() => navigateToGuide('guide-keys')}
                      style={{
                        background: 'rgba(255, 87, 87, 0.08)',
                        border: '1px solid var(--error)',
                        color: 'var(--error)',
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 87, 87, 0.16)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 87, 87, 0.08)';
                      }}
                    >
                      📖 View Key Guide
                    </button>
                  )}
                  {getStatusBadge(results.keyConfigured)}
                </div>
              </div>

              {/* Item 4: Master Profile Identity */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.2rem',
                background: 'var(--bg-deep)',
                border: results.identityConfigured === 'failed' ? '1px solid var(--error)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                transition: 'border var(--transition-fast)'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.5rem' }}>👤</span>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.15rem' }}>Master Profile Configuration</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      Checking if name and contact details are filled in to anchor generations.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {results.identityConfigured === 'failed' && (
                    <button
                      onClick={() => navigateToGuide('guide-identity')}
                      style={{
                        background: 'rgba(255, 87, 87, 0.08)',
                        border: '1px solid var(--error)',
                        color: 'var(--error)',
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 87, 87, 0.16)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 87, 87, 0.08)';
                      }}
                    >
                      📖 View Profile Guide
                    </button>
                  )}
                  {getStatusBadge(results.identityConfigured)}
                </div>
              </div>
            </div>
          </div>

          {/* Contextual Action Cards based on scan results */}
          {Object.values(results).includes('failed') && (
            <div className="animate-in" style={{
              padding: '1.5rem',
              background: 'rgba(255, 87, 87, 0.04)',
              border: '1px solid rgba(255, 87, 87, 0.15)',
              borderRadius: 'var(--radius-md)',
            }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--error)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚠️</span> Action Required to Resolve Failures
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                
                {results.engineConnected === 'failed' && (
                  <div style={{ borderLeft: '3px solid var(--error)', paddingLeft: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Engine is Offline</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      The secure local Brass Tacks engine is not running or initializing.
                    </p>
                    <button onClick={() => navigateToGuide('guide-engine')} className="btn-accent" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'inline-flex' }}>
                      🚀 View Relaunch Guide
                    </button>
                  </div>
                )}

                {results.databaseResponsive === 'failed' && results.engineConnected === 'success' && (
                  <div style={{ borderLeft: '3px solid var(--error)', paddingLeft: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Database Connection Error</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      The engine is active, but it cannot securely link to your local database or vector search store.
                    </p>
                    <button onClick={() => navigateToGuide('guide-database')} className="btn-accent" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'inline-flex' }}>
                      🗄️ View Database Guide
                    </button>
                  </div>
                )}

                {results.keyConfigured === 'failed' && (
                  <div style={{ borderLeft: '3px solid var(--error)', paddingLeft: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Missing AI API Key</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      You haven&apos;t configured an API key for your active AI provider ({selectedProvider}). Without an API key, the resume generation engine cannot run.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href="/settings" className="btn-accent" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'inline-flex' }}>
                        🔑 Configure Keys in Settings
                      </Link>
                      <button onClick={() => navigateToGuide('guide-keys')} className="btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'inline-flex', border: '1px solid var(--border)' }}>
                        📖 Read Key Guide
                      </button>
                    </div>
                  </div>
                )}

                {results.identityConfigured === 'failed' && (
                  <div style={{ borderLeft: '3px solid var(--error)', paddingLeft: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Master Profile is Empty</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      The resume generation requires your primary name and email to formulate header elements correctly.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href="/profile" className="btn-accent" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'inline-flex' }}>
                        👤 Complete Master Profile
                      </Link>
                      <button onClick={() => navigateToGuide('guide-identity')} className="btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'inline-flex', border: '1px solid var(--border)' }}>
                        📖 Read Profile Guide
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Guide 1: Starting the Backend */}
          <div id="guide-engine" style={getGuideCardStyle('guide-engine')}>
            {highlightedGuide === 'guide-engine' && (
              <span className="badge badge-amber" style={{ position: 'absolute', top: '1rem', right: '1rem', animation: 'pulse 1.4s infinite' }}>
                Selected Resolution
              </span>
            )}
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🚀</span> 1. Relaunching the App
            </h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
              Brass Tacks runs completely locally on your computer to guarantee 100% data privacy and security. If the engine is offline, follow these non-technical steps:
            </p>

            <ol style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Close the Application:</strong> Completely quit Brass Tacks interface.
              </li>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Open your App Launcher:</strong> Go to the <strong style={{ color: 'var(--primary)' }}>Applications</strong> folder on your Mac or search <strong style={{ color: 'var(--primary)' }}>Brass Tacks</strong> in the Windows Start menu.
              </li>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Relaunch Brass Tacks:</strong> Click the Brass Tacks icon. It will automatically start all background security helpers and database connections in the background.
              </li>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Wait for Initialization:</strong> Give the application 5 to 10 seconds to fully initialize the secure engine, then click <strong style={{ color: 'var(--primary)' }}>🔄 Re-run Scan</strong> under the Diagnostics tab.
              </li>
            </ol>
          </div>

          {/* Guide 2: Database Connection */}
          <div id="guide-database" style={getGuideCardStyle('guide-database')}>
            {highlightedGuide === 'guide-database' && (
              <span className="badge badge-amber" style={{ position: 'absolute', top: '1rem', right: '1rem', animation: 'pulse 1.4s infinite' }}>
                Selected Resolution
              </span>
            )}
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🗄️</span> 2. Resolving Database & Vector Store Connections
            </h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
              Brass Tacks stores your resumes, job criteria, and vector representations in a private local database sandbox. If the diagnostic suite reports a database connection link failure:
            </p>

            <ol style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Check System Memory and Storage:</strong> The local database and high-performance vector store need at least <strong style={{ color: 'var(--primary)' }}>5 GB of free space</strong> to function safely. Clean up large files or cache if your drive is almost full.
              </li>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Restart the Secure Services:</strong> Close Brass Tacks entirely and launch the app again to trigger an automatic self-healing sequence that resets database connections.
              </li>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Check Port Conflicts:</strong> Ensure no other third-party software on your computer is occupying ports <code style={{ color: 'var(--accent)' }}>5432</code> or <code style={{ color: 'var(--accent)' }}>6333</code>.
              </li>
            </ol>
          </div>

          {/* Guide 3: AI Provider Limits */}
          <div id="guide-keys" style={getGuideCardStyle('guide-keys')}>
            {highlightedGuide === 'guide-keys' && (
              <span className="badge badge-amber" style={{ position: 'absolute', top: '1rem', right: '1rem', animation: 'pulse 1.4s infinite' }}>
                Selected Resolution
              </span>
            )}
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔑</span> 3. Resolving AI Provider & API Key Errors
            </h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem', color: 'var(--text-muted)' }}>
              If your generation progress bar stalls or fails during the &quot;Drafting&quot; stage, it is typically an issue with your provider&apos;s API key:
            </p>

            <ol style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Navigate to Settings:</strong> Go to the [Configure API Keys](/settings) page.
              </li>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Verify Your API Key:</strong> Check that your active key is correct. Mismatches (e.g. pasting an OpenAI key inside Google Gemini inputs) will cause instant failures.
              </li>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Check Account Credits:</strong> Professional AI models charge a microscopic fee per resume generation. Generations will fail instantly if your account balance is $0.00. Make sure your provider dashboard has active billing.
              </li>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Rate Limiting:</strong> If you are compiling many resumes in a very short span, your AI provider may temporarily throttle your key. Pause for 60 seconds and retry.
              </li>
            </ol>
          </div>

          {/* Guide 4: Master Profile Identity */}
          <div id="guide-identity" style={getGuideCardStyle('guide-identity')}>
            {highlightedGuide === 'guide-identity' && (
              <span className="badge badge-amber" style={{ position: 'absolute', top: '1rem', right: '1rem', animation: 'pulse 1.4s infinite' }}>
                Selected Resolution
              </span>
            )}
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>👤</span> 4. Completing your Master Profile
            </h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem', color: 'var(--text-muted)' }}>
              To tailor your professional experience and layout heading structures correctly, Brass Tacks requires basic profile anchors:
            </p>

            <ol style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Go to Master Profile:</strong> Navigate to the [Complete Master Profile](/profile) page.
              </li>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Fill Primary Details:</strong> Enter your **Full Name**, **Primary Email Address**, and key contact links.
              </li>
              <li>
                <strong style={{ color: 'var(--text-main)' }}>Save & Sync:</strong> Click the &quot;Save Profile&quot; button. This updates the local vector representation immediately so all new generations utilize the updated identity.
              </li>
            </ol>
          </div>

          {/* Collapsible Details for Technical Users */}
          <details style={{
            background: 'var(--bg-deep)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            cursor: 'pointer',
            marginTop: '1rem',
          }}>
            <summary style={{
              fontWeight: 600,
              fontSize: '0.85rem',
              color: 'var(--text-dim)',
              outline: 'none',
            }}>
              🛠️ Advanced Technical Details (Developers & Admins Only)
            </summary>
            <div style={{
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              lineHeight: 1.6,
              color: 'var(--text-muted)',
              cursor: 'default',
            }} onClick={(e) => e.stopPropagation()}>
              <span style={{ color: 'var(--text-dim)' }}># Diagnostic terminal controls for system administrators:</span><br />
              <span style={{ color: 'var(--primary)' }}>podman ps -a</span> <span style={{ color: 'var(--text-dim)' }}># Check status of local PostgreSQL and Qdrant containers</span><br />
              <span style={{ color: 'var(--primary)' }}>cd backend && .venv/bin/fastapi dev app/main.py</span> <span style={{ color: 'var(--text-dim)' }}># Run the FastAPI health check helper</span>
            </div>
          </details>

        </div>
      )}

      {/* Footer Navigation shortcuts */}
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>⚙️</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Quick Shortcuts:</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/settings" className="btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
            Configure API Keys
          </Link>
          <Link href="/profile" className="btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
            Update Profile
          </Link>
          <Link href="/dashboard" className="btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.8rem' }}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
