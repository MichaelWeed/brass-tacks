'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ResumeTemplate, { ResumeData } from './ResumeTemplate';

interface StatusData {
  status: string;
  error: string | null;
  completed: boolean;
}

type Stage = 'queued' | 'canonizing' | 'drafting' | 'critiquing' | 'complete' | 'failed' | 'initializing';

interface StageInfo {
  label: string;
  description: string;
  progress: number;
}

const STAGE_INFO: Record<Stage, StageInfo> = {
  initializing: { label: 'Initializing',     description: 'Establishing secure connection to Forge engine…',     progress: 5  },
  queued:       { label: 'Queued',            description: 'Your job is in the queue and will start momentarily…', progress: 12 },
  canonizing:   { label: 'Canonizing',        description: 'Parsing your career record and extracting achievements…', progress: 35 },
  drafting:     { label: 'Drafting',          description: 'Generating your tailored, anti-boilerplate resume…',   progress: 62 },
  critiquing:   { label: 'Quality Checking',  description: 'Running impact scoring and coherence validation…',     progress: 83 },
  complete:     { label: 'Complete',          description: 'Your resume has been forged successfully.',             progress: 100 },
  failed:       { label: 'Failed',            description: 'An error occurred during generation.',                  progress: 100 },
};

const DEMO_SEQUENCE: Stage[] = ['queued', 'canonizing', 'drafting', 'critiquing', 'complete'];

interface Props {
  runId: string;
  demoMode?: boolean;
  onReset?: () => void;
  jobData?: {
    jobTitle: string;
    jobCompany: string;
    outputs: ('resume' | 'cover_letter')[];
    jobDescription?: string;
    sourceUrl?: string;
    companyContext?: string;
    referenceUrls?: string[];
  };
}

export default function ForgeStatus({ runId, demoMode = false, onReset, jobData }: Props) {
  const [stage, setStage]         = useState<Stage>('initializing');
  const [error, setError]         = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [logs, setLogs]           = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => {
      const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
      return [...prev.slice(-40), entry];
    });
  };

  // Demo mode: simulate pipeline stages
  useEffect(() => {
    if (!demoMode) return;

    const delays = [800, 2200, 3500, 2000, 1800];
    const messages = [
      'QUEUED — Job accepted. Waiting for engine slot…',
      'CANONIZING — Parsing Master Career Record. Extracting achievements…',
      'DRAFTING — Generating tailored bullet points using contextual alignment…',
      'CRITIQUING — Impact score: 92/100. Coherence: PASS. ATS scan: PASS…',
      'COMPLETE — Resume forged. Precision-tailored for ' + (jobData?.jobCompany || 'target company') + '.',
    ];

    let timer: ReturnType<typeof setTimeout>;
    DEMO_SEQUENCE.forEach((s, i) => {
      timer = setTimeout(() => {
        setStage(s);
        addLog(messages[i]);
        if (s === 'complete') {
          setCompleted(true);
        }
      }, delays.slice(0, i + 1).reduce((a, b) => a + b, 0));
    });

    return () => clearTimeout(timer);
  }, [demoMode, jobData, runId]);

  // Real SSE mode
  useEffect(() => {
    if (demoMode || !runId) return;

    let es: EventSource;
    let retries = 0;
    const MAX_RETRIES = 3;

    const connect = () => {
      // Get API Key from new structure
      const provider = localStorage.getItem('tf_api_provider') || 'openai';
      const keysJson = localStorage.getItem('tf_api_keys');
      let apiKey = '';
      if (keysJson) {
        try {
          const keys = JSON.parse(keysJson);
          apiKey = keys[provider] || '';
        } catch {}
      }

      const url = `/api/v1/generation/events/${runId}${apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : ''}`;
      es = new EventSource(url);

      es.onmessage = (event) => {
        try {
          const data: StatusData = JSON.parse(event.data);
          setStage((data.status || 'initializing') as Stage);
          setError(data.error);
          setCompleted(data.completed);
          addLog(`${data.status.toUpperCase()}${data.error ? ` — ${data.error}` : ''}`);
          if (data.completed) es.close();
        } catch {
          addLog('PARSE_ERROR — Malformed event received.');
        }
      };

      es.onerror = () => {
        es.close();
        if (retries < MAX_RETRIES) {
          retries++;
          const msg = `Connection interrupted. Retrying ${retries}/${MAX_RETRIES}…`;
          setError(msg);
          addLog(`RECONNECT — ${msg}`);
          setTimeout(connect, 2000);
        } else {
          setError('Communication link severed. Check your connection or service status.');
          addLog('ERROR — Max retries exceeded. Manual intervention required.');
        }
      };
    };

    connect();
    return () => { if (es) es.close(); };
  }, [runId, demoMode]);

  const handleDownload = async () => {
    if (!resumeRef.current) return;
    setIsExporting(true);
    addLog('EXPORT — Generating high-precision PDF document…');
    
    try {
      const element = resumeRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      
      const name = profileData?.name || 'Resume';
      const cleanName = name.replace(/[^a-z0-9\s-]/gi, '').trim();
      
      const cleanCompany = (jobData?.jobCompany || 'company')
        .replace(/[^a-z0-9\s-]/gi, '')
        .trim();
        
      const fileName = `${cleanName} - ${cleanCompany} Resume.pdf`;
        
      pdf.save(fileName);
      addLog(`EXPORT — ${fileName} generated successfully.`);
    } catch (err) {
      addLog('ERROR — PDF generation failed.');
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  // Get profile data for the template
  const [profileData, setProfileData] = useState<ResumeData | null>(null);

  useEffect(() => {
    if (completed) {
      const timer = setTimeout(() => {
        const identity = JSON.parse(localStorage.getItem('tf_identity') || '{}');
        const education = JSON.parse(localStorage.getItem('tf_education') || '[]');

        // Only build profileData if the user has filled in at least their name
        if (!identity.name) {
          addLog('WARN — Profile incomplete. Visit your profile page to add your information before downloading.');
          return;
        }

        const data: ResumeData = {
          name: identity.name,
          contact: {
            email: identity.email || '',
            phone: identity.phone || '',
            location: identity.location || '',
            links: [
              ...(identity.linkedin ? [{ label: 'LinkedIn', url: identity.linkedin }] : []),
              ...(identity.website ? [{ label: 'Website', url: identity.website }] : [])
            ]
          },
          summary: jobData?.jobTitle && jobData?.jobCompany
            ? `Tailored for ${jobData.jobTitle} at ${jobData.jobCompany}.`
            : 'Tailored resume.',
          experience: [],
          education: education,
          skills: []
        };
        setProfileData(data);

        // Save to local history
        interface ForgeHistoryItem {
          id: string;
          company: string;
          role: string;
          date: string;
          status: string;
          type: string;
          profileData: ResumeData;
          jobDescription: string;
          sourceUrl: string;
          companyContext: string;
          referenceUrls: string[];
        }

        const existing: ForgeHistoryItem[] = JSON.parse(localStorage.getItem('tf_forge_history') || '[]');
        const currentRunId = runId || `run-${Date.now()}`;
        const alreadySaved = existing.some((item) => item.id === currentRunId);
        if (!alreadySaved) {
          const historyItem: ForgeHistoryItem = {
            id: currentRunId,
            company: jobData?.jobCompany || '',
            role: jobData?.jobTitle || '',
            date: new Date().toLocaleDateString(),
            status: 'Forged',
            type: jobData?.outputs[0] || 'resume',
            profileData: data,
            jobDescription: jobData?.jobDescription || '',
            sourceUrl: jobData?.sourceUrl || '',
            companyContext: jobData?.companyContext || '',
            referenceUrls: jobData?.referenceUrls || []
          };
          localStorage.setItem('tf_forge_history', JSON.stringify([historyItem, ...existing].slice(0, 50)));
        }
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [completed, jobData, runId]);

  const info = STAGE_INFO[stage] ?? STAGE_INFO.initializing;
  const isError = stage === 'failed' || (!!error && completed);

  return (
    <div className="animate-in" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
      }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Forge Engine</h3>
          <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            {demoMode ? 'DEMO_MODE' : `run:${runId.slice(0, 8)}…`}
          </p>
        </div>
        <span className={`badge ${isError ? 'badge-error' : completed ? 'badge-green' : 'badge-amber'}`}
          style={{ animation: (!completed && !isError) ? 'pulse 1.4s infinite' : 'none' }}>
          <span style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: isError ? 'var(--error)' : completed ? 'var(--success)' : 'var(--primary)',
            display: 'inline-block',
            marginRight: '0.4rem'
          }} />
          {info.label}
        </span>
      </div>

      <div className="progress-bar-track" style={{ marginBottom: '0.5rem' }}>
        <div
          className="progress-bar-fill"
          style={{
            width: `${info.progress}%`,
            background: isError
              ? 'var(--error)'
              : `linear-gradient(90deg, var(--primary-dim), var(--primary))`,
          }}
        />
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '1.5rem', fontFamily: 'var(--font-mono)' }}>
        {info.progress}% — {info.description}
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {DEMO_SEQUENCE.map(s => {
          const stageIdx   = DEMO_SEQUENCE.indexOf(s);
          const currentIdx = DEMO_SEQUENCE.indexOf(stage);
          const isDone   = currentIdx > stageIdx;
          const isActive = s === stage;
          return (
            <span key={s} style={{
              fontSize: '0.65rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-xs)',
              border: `1px solid ${isActive ? 'var(--border-focus)' : isDone ? 'rgba(34,211,160,0.2)' : 'var(--border)'}`,
              background: isActive ? 'var(--primary-subtle)' : isDone ? 'rgba(34,211,160,0.06)' : 'transparent',
              color: isActive ? 'var(--primary)' : isDone ? 'var(--success)' : 'var(--text-dim)',
              transition: 'all 0.4s ease',
            }}>
              {isDone ? '✓ ' : isActive ? '▸ ' : ''}{s}
            </span>
          );
        })}
      </div>

      <div className="log-window" id="forge-logs">
        {logs.length === 0 && (
          <span style={{ color: 'var(--text-dim)' }}>Waiting for engine signal…</span>
        )}
        {logs.map((log, i) => (
          <div key={i}>
            <span style={{ color: 'var(--primary)', marginRight: '0.5rem' }}>›</span>
            <span style={{ color: 'var(--text-muted)' }}>{log}</span>
          </div>
        ))}
        {!completed && <div className="loading" style={{ color: 'var(--primary)' }}>_</div>}
      </div>

  {completed && !isError && (
        <div className="animate-in" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{
            padding: '1rem',
            background: 'rgba(34, 211, 160, 0.06)',
            border: '1px solid rgba(34, 211, 160, 0.2)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <span style={{ fontSize: '1.25rem' }}>🎉</span>
            <div>
              <p style={{ color: 'var(--success)', fontWeight: 600, margin: '0 0 0.15rem', fontSize: '0.9rem' }}>
                Successfully Forged {jobData?.outputs.length === 2 ? 'Documents' : jobData?.outputs[0] === 'cover_letter' ? 'Cover Letter' : 'Resume'}
              </p>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem', margin: 0, fontFamily: 'var(--font-mono)' }}>
                Your documents are ready for high-fidelity export.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {(jobData?.outputs || ['resume']).map(type => (
                <button 
                  key={type}
                  className="btn-primary" 
                  style={{ flex: 1 }} 
                  onClick={handleDownload}
                  disabled={isExporting}
                >
                  {isExporting ? 'Generating...' : `Download ${type === 'resume' ? 'Resume' : 'Cover Letter'}`}
                </button>
              ))}
            </div>
            {onReset && (
              <button className="btn-ghost" onClick={onReset} id="forge-another-btn" style={{ width: '100%' }}>
                Forge Another Application
              </button>
            )}
          </div>
        </div>
      )}

      {isError && (
        <div className="animate-in" style={{
          marginTop: '1.25rem',
          padding: '1.25rem',
          background: 'rgba(255, 87, 87, 0.04)',
          border: '1px solid rgba(255, 87, 87, 0.15)',
          borderRadius: 'var(--radius-sm)',
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.1rem', color: 'var(--error)', flexShrink: 0 }}>❌</span>
            <div>
              <p style={{ color: 'var(--error)', fontWeight: 600, fontSize: '0.85rem', margin: '0 0 0.25rem' }}>
                Generation Failure Detected
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
                {error || 'An unexpected error occurred during tailorgene / profile tailoring.'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <button
              onClick={onReset}
              className="btn-ghost"
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                fontSize: '0.75rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'var(--border)',
              }}
            >
              ↩ Try Again
            </button>
            <Link
              href="/troubleshoot"
              className="btn-accent"
              style={{
                flex: 1.2,
                padding: '0.5rem 1rem',
                fontSize: '0.75rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
              }}
            >
              💡 Troubleshoot Generation
            </Link>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        <div ref={resumeRef} style={{ width: '850px', background: 'white' }}>
          {profileData && <ResumeTemplate data={profileData} />}
        </div>
      </div>
    </div>
  );
}
