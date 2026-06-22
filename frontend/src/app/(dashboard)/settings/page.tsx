'use client';

import React, { useState, useEffect } from 'react';

type Provider = 'openai' | 'anthropic' | 'google' | 'grok';

interface ApiSettings {
  activeProvider: Provider;
  keys: Record<Provider, string>;
  fastModels: Record<Provider, string>;
  smartModels: Record<Provider, string>;
}

interface ModelItem {
  id: string;
  name: string;
}

const DEFAULT_MODELS: Record<Provider, { fast: string; smart: string }> = {
  google: { fast: 'gemini-3.1-flash-lite', smart: 'gemini-3.1-pro-preview' },
  anthropic: { fast: 'claude-sonnet-4-6', smart: 'claude-opus-4-8' },
  openai: { fast: 'gpt-5.4-mini', smart: 'gpt-5.4' },
  grok: { fast: 'grok-4.3', smart: 'grok-4.20-reasoning' }
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<ApiSettings>({ 
    activeProvider: 'google', 
    keys: { openai: '', anthropic: '', google: '', grok: '' },
    fastModels: { openai: 'gpt-5.4-mini', anthropic: 'claude-sonnet-4-6', google: 'gemini-3.1-flash-lite', grok: 'grok-4.3' },
    smartModels: { openai: 'gpt-5.4', anthropic: 'claude-opus-4-8', google: 'gemini-3.1-pro-preview', grok: 'grok-4.20-reasoning' }
  });
  const [isSaved, setIsSaved] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelItem[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    const savedProvider = localStorage.getItem('tf_api_provider') as Provider || 'google';
    const savedKeysJson = localStorage.getItem('tf_api_keys');
    const savedFastJson = localStorage.getItem('tf_fast_models');
    const savedSmartJson = localStorage.getItem('tf_smart_models');
    
    let keys: Record<Provider, string> = { openai: '', anthropic: '', google: '', grok: '' };
    if (savedKeysJson) {
      try {
        keys = { ...keys, ...JSON.parse(savedKeysJson) };
      } catch {
        const legacyKey = localStorage.getItem('tf_api_key');
        if (legacyKey) keys[savedProvider] = legacyKey;
      }
    }

    const defaultFast = {
      openai: DEFAULT_MODELS.openai.fast,
      anthropic: DEFAULT_MODELS.anthropic.fast,
      google: DEFAULT_MODELS.google.fast,
      grok: DEFAULT_MODELS.grok.fast
    };
    const defaultSmart = {
      openai: DEFAULT_MODELS.openai.smart,
      anthropic: DEFAULT_MODELS.anthropic.smart,
      google: DEFAULT_MODELS.google.smart,
      grok: DEFAULT_MODELS.grok.smart
    };

    let fastModels = defaultFast;
    let smartModels = defaultSmart;

    if (savedFastJson) {
      try {
        fastModels = { ...defaultFast, ...JSON.parse(savedFastJson) };
      } catch {}
    }

    if (savedSmartJson) {
      try {
        smartModels = { ...defaultSmart, ...JSON.parse(savedSmartJson) };
      } catch {}
    }

    setTimeout(() => {
      setSettings({ activeProvider: savedProvider, keys, fastModels, smartModels });
    }, 0);
  }, []);

  useEffect(() => {
    const activeKey = settings.keys[settings.activeProvider];
    if (!activeKey) {
      setTimeout(() => {
        setAvailableModels([]);
      }, 0);
      return;
    }

    setTimeout(() => {
      setLoadingModels(true);
      const token = localStorage.getItem('tf_token') || '';
      fetch('/api/v1/generation/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider: settings.activeProvider, api_key: activeKey }),
      })
        .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
        .then((models: ModelItem[]) => {
          setAvailableModels(models);
        })
        .catch(err => {
          console.warn('Could not fetch models:', err);
          setAvailableModels([]);
        })
        .finally(() => setLoadingModels(false));
    }, 0);
  }, [settings.activeProvider, settings.keys]);

  const handleSave = () => {
    localStorage.setItem('tf_api_provider', settings.activeProvider);
    localStorage.setItem('tf_api_keys', JSON.stringify(settings.keys));
    localStorage.setItem('tf_fast_models', JSON.stringify(settings.fastModels));
    localStorage.setItem('tf_smart_models', JSON.stringify(settings.smartModels));
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

  const updateFastModel = (modelId: string) => {
    setSettings(prev => ({
      ...prev,
      fastModels: { ...prev.fastModels, [prev.activeProvider]: modelId }
    }));
  };

  const updateSmartModel = (modelId: string) => {
    setSettings(prev => ({
      ...prev,
      smartModels: { ...prev.smartModels, [prev.activeProvider]: modelId }
    }));
  };

  const getDropdownOptions = (slot: 'fast' | 'smart') => {
    const selected = slot === 'fast' ? settings.fastModels[settings.activeProvider] : settings.smartModels[settings.activeProvider];
    const defaultVal = slot === 'fast' ? DEFAULT_MODELS[settings.activeProvider].fast : DEFAULT_MODELS[settings.activeProvider].smart;
    
    const options = [...availableModels];
    if (selected && !options.some(o => o.id === selected)) {
      options.push({ id: selected, name: `${selected} (Custom)` });
    }
    if (defaultVal && !options.some(o => o.id === defaultVal)) {
      options.push({ id: defaultVal, name: `${defaultVal} (Default Suggestion)` });
    }
    return options;
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

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
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
            value={settings.keys[settings.activeProvider] || ''}
            onChange={(e) => updateKey(e.target.value)}
            style={{ padding: '1rem' }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
            🔒 This key is only used for {settings.activeProvider}. It is stored locally in your browser.
          </p>
        </div>

        {/* Model Picker */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
          <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)' }}>
            Model Configuration
            {loadingModels && <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400, marginLeft: '0.5rem' }}>(fetching...)</span>}
          </h4>
          
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Fast Model (Drafts & Revisions)</label>
            <select
              value={settings.fastModels[settings.activeProvider] || ''}
              onChange={(e) => updateFastModel(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-deep)',
                color: 'var(--text-main)'
              }}
            >
              {getDropdownOptions('fast').map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              Used for high-volume tasks: initial resume drafting and applying revision corrections.
            </p>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Smart Model (Quality Critique & Grading)</label>
            <select
              value={settings.smartModels[settings.activeProvider] || ''}
              onChange={(e) => updateSmartModel(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-deep)',
                color: 'var(--text-main)'
              }}
            >
              {getDropdownOptions('smart').map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              Used for high-fidelity evaluation: resume critique, scoring, and grading revisions.
            </p>
          </div>
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
