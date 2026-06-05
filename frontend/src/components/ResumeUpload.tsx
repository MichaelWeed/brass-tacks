'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';


interface Props {
  onFileAccepted: (filename: string, content: string) => void;
  uploadedName?: string;
  initialContent?: string;
}

export default function ResumeUpload({ onFileAccepted, uploadedName, initialContent }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialContent && uploadedName === 'Pasted Resume.txt') {
      const timer = setTimeout(() => {
        setMode('paste');
        setPastedText(initialContent);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialContent, uploadedName]);

  const processFile = (file: File) => {
    setError(null);
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const allowedExt = ['.pdf', '.docx', '.txt'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowed.includes(file.type) && !allowedExt.includes(ext)) {
      setError('Please upload a PDF, DOCX, or plain text file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10 MB.');
      return;
    }

    onFileAccepted(file.name, "[EXTRACTING...]");

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('tf_token');
    if (!token) {
      localStorage.removeItem('tf_token');
      localStorage.removeItem('tf_profile_id');
      localStorage.removeItem('tf_master_profile');
      setError('Authentication token is missing. Access denied.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      throw new Error('Authentication token is missing. Access denied.');
    }

    fetch('/api/v1/profiles/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
      }
      return res.json();
    })
    .then((data) => {
      if (data.id) {
        localStorage.setItem('tf_profile_id', data.id);
      }
      onFileAccepted(file.name, data.raw_text);
    })
    .catch((err) => {
      console.error("Document parsing failed:", err);
      setError(`Parsing failed: ${err.message || 'The parsing service is temporarily unavailable.'}`);
      onFileAccepted(file.name, "");
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (mode === 'paste') return;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleTextSubmit = () => {
    if (pastedText.trim().length < 50) {
      setError('Please paste more content for better results.');
      return;
    }
    setError(null);
    onFileAccepted('Pasted Resume.txt', pastedText);
  };

  const uploaded = !!uploadedName;

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setMode('upload')}
          className="btn-ghost"
          style={{
            flex: 1,
            border: mode === 'upload' ? '1px solid var(--primary)' : '1px solid var(--border)',
            background: mode === 'upload' ? 'var(--primary-subtle)' : 'transparent',
            color: mode === 'upload' ? 'var(--primary)' : 'var(--text-muted)',
          }}
        >
          📂 Upload File
        </button>
        <button
          onClick={() => setMode('paste')}
          className="btn-ghost"
          style={{
            flex: 1,
            border: mode === 'paste' ? '1px solid var(--primary)' : '1px solid var(--border)',
            background: mode === 'paste' ? 'var(--primary-subtle)' : 'transparent',
            color: mode === 'paste' ? 'var(--primary)' : 'var(--text-muted)',
          }}
        >
          ✍️ Paste Text
        </button>
      </div>

      {mode === 'paste' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <textarea
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            placeholder="Paste your plain text resume or work history here..."
            style={{
              width: '100%',
              minHeight: '200px',
              padding: '1rem',
              background: 'var(--bg-deep)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
            }}
          />
          <button
            className="btn-primary"
            onClick={handleTextSubmit}
            disabled={!pastedText.trim()}
          >
            Use Pasted Text
          </button>
        </div>
      ) : (
        <div
          className={`drop-zone ${isDragging ? 'active' : ''} ${uploaded ? 'uploaded' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => !uploaded && inputRef.current?.click()}
          style={{ cursor: uploaded ? 'default' : 'pointer' }}
          role="button"
          aria-label="Upload your resume"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={onInputChange}
            style={{ display: 'none' }}
            id="resume-upload"
          />

          {uploaded ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(34, 211, 160, 0.12)',
                border: '2px solid var(--success)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem',
              }}>
                ✓
              </div>
              <p style={{ color: 'var(--success)', fontWeight: 600, margin: 0 }}>File ready</p>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                margin: 0,
                padding: '0.3rem 0.75rem',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 'var(--radius-xs)',
              }}>
                {uploadedName}
              </p>
              <button
                className="btn-ghost"
                style={{ fontSize: '0.75rem', padding: '0.4rem 1rem', marginTop: '0.25rem' }}
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              >
                Replace file
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                fontSize: '2.5rem',
                lineHeight: 1,
                animation: isDragging ? 'float 0.8s ease-in-out infinite' : 'none',
              }}>
                📄
              </div>
              <div>
                <p style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {isDragging ? 'Drop it here' : 'Drag & drop your resume'}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>
                  or <span style={{ color: 'var(--primary)', fontWeight: 600 }}>browse to upload</span>
                </p>
              </div>
              <div style={{
                display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center',
              }}>
                {['PDF', 'DOCX', 'TXT'].map(fmt => (
                  <span key={fmt} className="badge badge-amber">{fmt}</span>
                ))}
                <span className="badge" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
                  Max 10 MB
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="animate-in" style={{
          marginTop: '1rem',
          padding: '1.25rem',
          background: 'rgba(255, 87, 87, 0.04)',
          border: '1px solid rgba(255, 87, 87, 0.15)',
          borderRadius: 'var(--radius-sm)',
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.1rem', color: 'var(--error)', flexShrink: 0 }}>⚠️</span>
            <div>
              <p style={{ color: 'var(--error)', fontWeight: 600, fontSize: '0.85rem', margin: '0 0 0.25rem' }}>
                Document Parser Issue
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
                {error}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setError(null); setMode('paste'); }}
              className="btn-ghost"
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.75rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'var(--border)',
              }}
            >
              ✍️ Paste Text Instead
            </button>
            <Link
              href="/troubleshoot"
              className="btn-accent"
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.75rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              🔧 Troubleshoot Connection Guide
            </Link>
          </div>
        </div>
      )}


      <div style={{
        marginTop: '1.25rem',
        padding: '0.875rem 1rem',
        background: 'rgba(91, 141, 239, 0.06)',
        border: '1px solid rgba(91, 141, 239, 0.15)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>💡</span>
        <div>
          <p style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem', margin: '0 0 0.25rem' }}>
            Tip for best results
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}>
            Ensure your uploaded resume or text includes all your potential work history, even if you wouldn&apos;t normally include it in a 1-page resume. Brass Tacks will pick the most relevant parts.
          </p>
        </div>
      </div>
    </div>
  );
}

