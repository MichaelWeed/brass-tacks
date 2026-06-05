'use client';

import React, { useState, useEffect } from 'react';

type Provider = 'openai' | 'anthropic' | 'google' | 'grok';

interface ApiSettings {
  activeProvider: Provider;
  keys: Record<Provider, string>;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ApiSettings>({ 
    activeProvider: 'openai', 
    keys: { openai: '', anthropic: '', google: '', grok: '' } 
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedProvider = localStorage.getItem('tf_api_provider') as Provider || 'openai';
    const savedKeysJson = localStorage.getItem('tf_api_keys');
    
    let keys: Record<Provider, string> = { openai: '', anthropic: '', google: '', grok: '' };
    if (savedKeysJson) {
      try {
        const parsed = JSON.parse(savedKeysJson);
        keys = { ...keys, ...parsed };
      } catch {
        const legacyKey = localStorage.getItem('tf_api_key');
        if (legacyKey) keys[savedProvider] = legacyKey;
      }
    } else {
      const legacyKey = localStorage.getItem('tf_api_key');
      if (legacyKey) keys[savedProvider] = legacyKey;
    }

    // If the saved provider has no key, fall back to the first one that does
    const order: Provider[] = ['openai', 'anthropic', 'google', 'grok'];
    const resolvedProvider: Provider = keys[savedProvider]
      ? savedProvider
      : (order.find(p => !!keys[p]) ?? savedProvider);

    const timer = setTimeout(() => {
      setSettings({ activeProvider: resolvedProvider, keys });
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleSave = () => {
    localStorage.setItem('tf_api_provider', settings.activeProvider);
    localStorage.setItem('tf_api_keys', JSON.stringify(settings.keys));
    // Clean up legacy key if it exists
    localStorage.removeItem('tf_api_key');
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const updateKey = (key: string) => {
    setSettings(prev => ({
      ...prev,
      keys: { ...prev.keys, [prev.activeProvider]: key }
    }));
  };

  return (
    <div className="animate-in" style={{ maxWidth: '600px' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)' }}>Configure your Forge Engine and API connections.</p>
      </header>

      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>AI Model Provider</h3>
        
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label>Selected Provider</label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {(['openai', 'anthropic', 'google', 'grok'] as const).map(p => (
              <button
                key={p}
                onClick={() => setSettings(prev => ({ ...prev, activeProvider: p }))}
                style={{
                  flex: 1,
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${settings.activeProvider === p ? 'var(--primary)' : 'var(--border)'}`,
                  background: settings.activeProvider === p ? 'var(--primary-subtle)' : 'var(--bg-deep)',
                  color: settings.activeProvider === p ? 'var(--primary)' : 'var(--text-main)',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  fontSize: '0.9rem',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '2.5rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between' }}>
            {settings.activeProvider === 'grok' ? 'Grok (xAI)' : settings.activeProvider.charAt(0).toUpperCase() + settings.activeProvider.slice(1)} API Key
            <a
              href={
                settings.activeProvider === 'openai' ? 'https://platform.openai.com/api-keys' :
                settings.activeProvider === 'anthropic' ? 'https://console.anthropic.com/settings/keys' :
                settings.activeProvider === 'google' ? 'https://aistudio.google.com/app/apikey' :
                'https://console.x.ai/'
              }
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--primary)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '0.75rem' }}
            >
              Get your key ↗
            </a>
          </label>
          <input
            type="password"
            placeholder={`Paste your ${settings.activeProvider} API key here`}
            value={settings.keys[settings.activeProvider]}
            onChange={(e) => updateKey(e.target.value)}
            style={{ padding: '1rem' }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
            🔒 This key is only used for {settings.activeProvider}. It is stored locally in your browser.
          </p>
        </div>

        <button 
          className="btn-primary" 
          onClick={handleSave}
          style={{ width: '100%', padding: '1rem' }}
        >
          {isSaved ? '✓ Settings Saved' : 'Save Configuration'}
        </button>
      </div>

      <div className="card" style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255, 87, 87, 0.03)', border: '1px solid rgba(255, 87, 87, 0.1)' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--error)', marginBottom: '0.75rem' }}>Danger Zone</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Clearing local data will delete your Master Profile and all job application history. This action cannot be undone.
        </p>
        <button 
          className="btn-ghost" 
          style={{ color: 'var(--error)', borderColor: 'rgba(255, 87, 87, 0.2)' }}
          onClick={() => {
            if (confirm('Are you absolutely sure? This will delete your Master Profile and all history.')) {
              localStorage.clear();
              window.location.href = '/';
            }
          }}
        >
          Clear All Local Data
        </button>
      </div>
    </div>
  );
}
