'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ResumeTemplate, { ResumeData } from './ResumeTemplate';

interface IdentityData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
}

interface EducationItem {
  degree: string;
  school: string;
  period: string;
}

// Strip inline markdown formatting artifacts: **bold**, *italic*, __underline__, ~~strike~~
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/__/g, '')
    .replace(/~~/g, '')
    .trim();
}

function parseMarkdownToResumeData(
  markdown: string,
  defaultIdentity?: IdentityData,
  defaultEducation?: EducationItem[]
): ResumeData {
  const lines = markdown.split('\n');
  const data: ResumeData = {
    name: defaultIdentity?.name || '',
    contact: {
      email: defaultIdentity?.email || '',
      phone: defaultIdentity?.phone || '',
      location: defaultIdentity?.location || '',
      links: []
    },
    summary: '',
    experience: [],
    education: defaultEducation && defaultEducation.length > 0 ? defaultEducation : [],
    skills: []
  };

  if (defaultIdentity?.linkedin) {
    data.contact.links.push({ label: 'LinkedIn', url: defaultIdentity.linkedin });
  }
  if (defaultIdentity?.website) {
    data.contact.links.push({ label: 'Website', url: defaultIdentity.website });
  }

  let currentSection = '';
  let currentJob: { title: string; company: string; period: string; bullets: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Skip markdown horizontal rules (---, ***, ___)
    if (/^[-*_]{3,}$/.test(line)) continue;

    // Detect Name
    if (line.startsWith('# ') && !line.startsWith('##')) {
      const nameVal = stripInlineMarkdown(line.replace(/^#+\s*/, ''));
      if (nameVal && !data.name) {
        data.name = nameVal;
      }
      continue;
    }

    // Detect Section Headings
    if (line.startsWith('## ')) {
      const secName = line.replace('##', '').trim().toLowerCase();
      if (secName.includes('summary')) {
        currentSection = 'summary';
      } else if (secName.includes('experience')) {
        currentSection = 'experience';
      } else if (secName.includes('skill') || secName.includes('competenc') || secName.includes('expertis') || secName.includes('capabilities')) {
        currentSection = 'skills';
      } else if (secName.includes('education')) {
        currentSection = 'education';
      } else {
        currentSection = '';
      }
      continue;
    }

    if (currentSection === 'summary') {
      if (!line.startsWith('#')) {
        data.summary = (data.summary ? data.summary + '\n' : '') + stripInlineMarkdown(line);
      }
    } else if (currentSection === 'experience') {
      if (line.startsWith('### ')) {
        if (currentJob) {
          data.experience.push(currentJob);
        }
        const jobHeader = stripInlineMarkdown(line.replace(/^###\s*/, ''));
        let title = jobHeader;
        let company = '';
        let period = '';

        const periodMatch = jobHeader.match(/\(([^)]+)\)$/);
        if (periodMatch) {
          period = periodMatch[1];
          title = jobHeader.replace(/\s*\([^)]+\)$/, '').trim();
        }

        if (title.includes('|')) {
          const parts = title.split('|');
          title = parts[0].trim();
          company = parts[1].trim();
        } else if (title.includes(' at ')) {
          const parts = title.split(' at ');
          title = parts[0].trim();
          company = parts[1].trim();
        } else if (title.includes(',')) {
          const parts = title.split(',');
          title = parts[0].trim();
          company = parts[1].trim();
        }

        currentJob = {
          title: stripInlineMarkdown(title),
          company: stripInlineMarkdown(company),
          period,
          bullets: []
        };
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        const bullet = stripInlineMarkdown(line.substring(2).trim());
        if (currentJob) {
          currentJob.bullets.push(bullet);
        }
      } else if (line.startsWith('1. ')) {
        const bullet = stripInlineMarkdown(line.substring(3).trim());
        if (currentJob) {
          currentJob.bullets.push(bullet);
        }
      }
    } else if (currentSection === 'skills') {
      const cleanLine = line.replace(/^([-\*\s•]+)/, '').trim();
      if (cleanLine) {
        const parts = cleanLine.split(/[,;•\n]/);
        parts.forEach(p => {
          const skill = stripInlineMarkdown(p.trim());
          if (skill) data.skills.push(skill);
        });
      }
    } else if (currentSection === 'education') {
      if (line.startsWith('### ') || line.startsWith('- ') || line.startsWith('* ')) {
        const eduText = line.replace(/^(###\s*|[-\*]\s+)/, '').trim();
        if (eduText && data.education === defaultEducation) {
          data.education = [];
        }
        if (eduText) {
          let degree = eduText;
          let school = '';
          let period = '';
          const pMatch = eduText.match(/\(([^)]+)\)$/);
          if (pMatch) {
            period = pMatch[1];
            degree = eduText.replace(/\s*\([^)]+\)$/, '').trim();
          }
          if (degree.includes('|')) {
            const parts = degree.split('|');
            degree = parts[0].trim();
            school = parts[1].trim();
          } else if (degree.includes(' at ')) {
            const parts = degree.split(' at ');
            degree = parts[0].trim();
            school = parts[1].trim();
          } else if (degree.includes(',')) {
            const parts = degree.split(',');
            degree = parts[0].trim();
            school = parts[1].trim();
          }
          
          degree = stripInlineMarkdown(degree);
          school = stripInlineMarkdown(school);
          data.education.push({ degree, school, period });
        }
      }
    }
  }

  if (currentJob) {
    data.experience.push(currentJob);
  }

  if (!data.summary) {
    data.summary = `Tailored resume.`;
  }

  return data;
}

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
  onRetry?: () => void;
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

interface CoverLetterData {
  name: string;
  contact: {
    email: string;
    phone: string;
    location: string;
    links: { label: string; url: string }[];
  };
  company: string;
  role: string;
  date: string;
  text: string;
}

function CoverLetterTemplate({ data }: { data: CoverLetterData }) {
  const paragraphs = data.text.split('\n').map(p => p.trim()).filter(Boolean);

  return (
    <div style={{
      width: '850px',
      minHeight: '1100px',
      padding: '80px 70px',
      background: '#ffffff',
      color: '#1a1a1b',
      fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif',
      lineHeight: '1.7',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <header style={{ marginBottom: '40px', textAlign: 'left' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 800,
          margin: '0 0 10px 0', 
          color: '#0f172a',
          letterSpacing: '-0.02em'
        }}>
          {data.name}
        </h1>
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '15px', 
          fontSize: '0.85rem', 
          color: '#64748b',
          fontWeight: 500 
        }}>
          <span>{data.contact.email}</span>
          {data.contact.phone && (
            <>
              <span>•</span>
              <span>{data.contact.phone}</span>
            </>
          )}
          {data.contact.location && (
            <>
              <span>•</span>
              <span>{data.contact.location}</span>
            </>
          )}
          {data.contact.links.map((link, i) => (
            <React.Fragment key={i}>
              <span>•</span>
              <span style={{ color: '#3b82f6' }}>{link.label}</span>
            </React.Fragment>
          ))}
        </div>
      </header>

      {/* Date & Recipient */}
      <div style={{ marginBottom: '30px', fontSize: '0.95rem', color: '#334155' }}>
        <div style={{ marginBottom: '15px', fontWeight: 500 }}>{data.date}</div>
        <div style={{ fontWeight: 600, color: '#0f172a' }}>Hiring Team</div>
        <div>{data.company || 'Target Company'}</div>
      </div>

      {/* Body Paragraphs */}
      <main style={{ fontSize: '0.98rem', color: '#334155', textAlign: 'justify' }}>
        {paragraphs.map((p, idx) => (
          <p key={idx} style={{ marginBottom: '20px' }}>{p}</p>
        ))}
      </main>
    </div>
  );
}

export default function ForgeStatus({ runId, demoMode = false, onReset, onRetry, jobData }: Props) {
  const [stage, setStage]         = useState<Stage>('initializing');
  const [error, setError]         = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [logs, setLogs]           = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);
  const coverLetterRef = useRef<HTMLDivElement>(null);
  const [coverLetterText, setCoverLetterText] = useState<string | null>(null);

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
      const authToken = localStorage.getItem('tf_token') || '';
      const url = `/api/v1/generation/events/${runId}?token=${encodeURIComponent(authToken)}`;
      es = new EventSource(url);

      es.onmessage = (event) => {
        try {
          const data: StatusData = JSON.parse(event.data);
          setStage((data.status || 'initializing') as Stage);
          setError(data.error);
          setCompleted(data.completed);
          addLog(`${data.status.toUpperCase()}${data.error ? `: ${data.error}` : ''}`);
          if (data.completed) es.close();
        } catch {
          addLog('PARSE_ERROR: Malformed event received.');
        }
      };

      es.onerror = () => {
        es.close();
        if (retries < MAX_RETRIES) {
          retries++;
          const msg = `Connection interrupted. Retrying ${retries}/${MAX_RETRIES}...`;
          setError(msg);
          addLog(`RECONNECT: ${msg}`);
          setTimeout(connect, 2000);
        } else {
          setStage('failed');
          setError('Communication link severed. Check your connection or service status.');
          addLog('ERROR: Max retries exceeded. Manual intervention required.');
        }
      };
    };

    connect();
    return () => { if (es) es.close(); };
  }, [runId, demoMode]);

  const handleDownload = async (docType: 'resume' | 'cover_letter' = 'resume') => {
    const element = docType === 'cover_letter' ? coverLetterRef.current : resumeRef.current;
    if (!element) return;
    setIsExporting(true);
    const docLabel = docType === 'cover_letter' ? 'Cover Letter' : 'Resume';
    addLog(`EXPORT — Generating high-precision ${docLabel} PDF document…`);

    try {
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

      const name = profileData?.name || 'Document';
      const cleanName = name.replace(/[^a-z0-9\s-]/gi, '').trim().substring(0, 60);

      // Guard against URL values leaking into the filename (e.g. LinkedIn URL pasted as company)
      const rawCompany = jobData?.jobCompany || '';
      const looksLikeUrl = /https?:\/\/|www\.|linkedin\.com|\.com\/|\//i.test(rawCompany);
      const companyFallback = looksLikeUrl ? 'Company' : rawCompany;
      const cleanCompany = companyFallback
        .replace(/[^a-z0-9\s-]/gi, '')
        .trim()
        .substring(0, 60) || 'Company';

      const fileName = `${cleanName} - ${cleanCompany} ${docLabel}.pdf`;

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
  const [identityData, setIdentityData] = useState<IdentityData | null>(null);

  useEffect(() => {
    if (!completed) return;

    const identity = JSON.parse(localStorage.getItem('tf_identity') || '{}');
    setIdentityData(identity);
    const education = JSON.parse(localStorage.getItem('tf_education') || '[]');

    const saveToHistory = (data: ResumeData) => {
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
    };

    if (demoMode || !runId) {
      // Mock / fallback logic
      const data: ResumeData = {
        name: identity.name || 'Demo User',
        contact: {
          email: identity.email || 'demo@example.com',
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
      setTimeout(() => {
        setProfileData(data);
        saveToHistory(data);
      }, 0);
      return;
    }

    const fetchAndParse = async () => {
      try {
        const token = localStorage.getItem('tf_token') || '';
        const res = await fetch(`/api/v1/generation/${runId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch generation run: ${res.statusText}`);
        }
        const runDetails = await res.json();
        const rawText = runDetails.final_output || runDetails.draft_output || '';

        if (rawText) {
          let resumeText = '';
          let coverLetterVal = '';
          let isJson = false;

          if (rawText.trim().startsWith('{')) {
            try {
              const parsedJson = JSON.parse(rawText);
              if (parsedJson && (parsedJson.resume || parsedJson.cover_letter)) {
                resumeText = parsedJson.resume || '';
                coverLetterVal = parsedJson.cover_letter || '';
                isJson = true;
              }
            } catch (e) {
              // fallback
            }
          }

          if (!isJson) {
            if (runDetails.output_type === 'cover_letter') {
              coverLetterVal = rawText;
            } else {
              resumeText = rawText;
            }
          }

          if (resumeText) {
            const parsed = parseMarkdownToResumeData(resumeText, identity, education);
            setProfileData(parsed);
            saveToHistory(parsed);
          } else {
            const emptyResumeData: ResumeData = {
              name: identity.name || '',
              contact: {
                email: identity.email || '',
                phone: identity.phone || '',
                location: identity.location || '',
                links: [
                  ...(identity.linkedin ? [{ label: 'LinkedIn', url: identity.linkedin }] : []),
                  ...(identity.website ? [{ label: 'Website', url: identity.website }] : [])
                ]
              },
              summary: 'Tailored resume.',
              experience: [],
              education: education,
              skills: []
            };
            setProfileData(emptyResumeData);
            saveToHistory(emptyResumeData);
          }

          if (coverLetterVal) {
            setCoverLetterText(coverLetterVal);
          }
        } else {
          addLog('WARN - Output text was empty, using profile fallback.');
          const data: ResumeData = {
            name: identity.name || '',
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
          saveToHistory(data);
        }
      } catch (err) {
        console.error('Error fetching tailored resume:', err);
        addLog('ERROR - Failed to fetch tailored output from server.');
      }
    };

    fetchAndParse();
  }, [completed, jobData, runId, demoMode]);

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
                  onClick={() => handleDownload(type)}
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
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                The forge pipeline encountered an error. Your job details and profile are safe -- click <strong>Try Again</strong> to go back and retry.
              </p>
              {error && (
                <pre style={{
                  margin: 0,
                  padding: '0.6rem 0.75rem',
                  background: 'rgba(255, 87, 87, 0.08)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--error)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.5,
                }}>
                  {error}
                </pre>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <button
              onClick={onRetry || onReset}
              className="btn-primary"
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
              }}
            >
              ↩ Try Again
            </button>
            <Link
              href="/troubleshoot"
              className="btn-ghost"
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
              💡 Troubleshoot
            </Link>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        <div ref={resumeRef} style={{ width: '850px', background: 'white' }}>
          {profileData && <ResumeTemplate data={profileData} />}
        </div>
        <div ref={coverLetterRef} style={{ width: '850px', background: 'white' }}>
          {coverLetterText && (
            <CoverLetterTemplate
              data={{
                name: identityData?.name || 'Applicant',
                contact: {
                  email: identityData?.email || '',
                  phone: identityData?.phone || '',
                  location: identityData?.location || '',
                  links: [
                    ...(identityData?.linkedin ? [{ label: 'LinkedIn', url: identityData.linkedin }] : []),
                    ...(identityData?.website ? [{ label: 'Website', url: identityData.website }] : [])
                  ]
                },
                company: jobData?.jobCompany || '',
                role: jobData?.jobTitle || '',
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                text: coverLetterText
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
