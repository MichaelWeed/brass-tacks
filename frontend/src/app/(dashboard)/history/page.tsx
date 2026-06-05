'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ResumeTemplate from '../../../components/ResumeTemplate';

interface ResumeData {
  name: string;
  contact: {
    email: string;
    phone: string;
    location: string;
    links: { label: string; url: string }[];
  };
  summary: string;
  experience: {
    title: string;
    company: string;
    period: string;
    bullets: string[];
  }[];
  education: {
    degree: string;
    school: string;
    period: string;
  }[];
  skills: string[];
}

interface ForgeHistoryItem {
  id: string;
  company: string;
  role: string;
  date: string;
  status: 'Forged' | 'Failed';
  type: string;
  profileData?: ResumeData;
  jobDescription?: string;
  sourceUrl?: string;
  companyContext?: string;
  referenceUrls?: string[];
}

export default function HistoryPage() {
  const [history, setHistory] = useState<ForgeHistoryItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedProfileData, setSelectedProfileData] = useState<ResumeData | null>(null);
  const [selectedFilename, setSelectedFilename] = useState<{ title: string; company: string } | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const resumeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('tf_forge_history');
    if (savedHistory) {
      const timer = setTimeout(() => {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error('Failed to parse history', e);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!selectedProfileData || !selectedFilename || !resumeRef.current) return;
    
    const generatePDF = async () => {
      try {
        const element = resumeRef.current!;
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
        
        const name = selectedProfileData.name || 'Resume';
        const cleanName = name.replace(/[^a-z0-9\s-]/gi, '').trim();
        
        const cleanCompany = selectedFilename.company
          .replace(/[^a-z0-9\s-]/gi, '')
          .trim();
           
        const fileName = `${cleanName} - ${cleanCompany} Resume.pdf`;
        pdf.save(fileName);
      } catch (err) {
        console.error("PDF export failed:", err);
      } finally {
        setSelectedProfileData(null);
        setSelectedFilename(null);
        setIsExporting(false);
      }
    };
    
    const timer = requestAnimationFrame(() => {
      generatePDF();
    });

    return () => cancelAnimationFrame(timer);
  }, [selectedProfileData, selectedFilename]);

  const handleViewPDF = (item: ForgeHistoryItem) => {
    if (isExporting) return;

    if (!item.profileData) {
      alert('No resume data found for this entry. Complete a forge with your profile filled in to enable PDF download.');
      return;
    }

    setIsExporting(true);
    setSelectedProfileData(item.profileData);
    setSelectedFilename({
      title: item.role,
      company: item.company
    });
  };

  return (
    <div className="animate-in">
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Forge History</h1>
        <p style={{ color: 'var(--text-muted)' }}>Review and download your previously tailored career documents.</p>
      </header>

      {history.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Company</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Role</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <React.Fragment key={item.id}>
                  <tr 
                    style={{ 
                      borderBottom: expandedId === item.id ? 'none' : '1px solid var(--border)',
                      background: expandedId === item.id ? 'var(--bg-deep)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                          {expandedId === item.id ? '▼' : '▶'}
                        </span>
                        <span>{item.company}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem' }}>{item.role}</td>
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.date}</td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span className={`badge ${item.status === 'Forged' ? 'badge-green' : 'badge-error'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Link 
                          href={`/applications/new?reuse=${item.id}`}
                          className="btn-ghost"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                        >
                          ♻️ Reuse
                        </Link>
                        <button 
                          className="btn-primary" 
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                          onClick={() => handleViewPDF(item)}
                          disabled={isExporting}
                        >
                          {isExporting && selectedFilename?.company === item.company && selectedFilename?.title === item.role ? 'Generating...' : 'View PDF'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === item.id && (
                    <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border)' }}>
                      <td colSpan={5} style={{ padding: '1.5rem 2.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          
                          {/* Company Intelligence / Acquisition Warning */}
                          {item.companyContext && (
                            <div style={{
                              padding: '1rem 1.25rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(99, 102, 241, 0.08)',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                            }}>
                              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                                💡 Company Context & Intelligence
                              </h4>
                              <p style={{ fontSize: '0.85rem', lineHeight: 1.5, margin: 0, color: 'var(--text-main)' }}>{item.companyContext}</p>
                            </div>
                          )}

                          {/* Reference URLs */}
                          {item.referenceUrls && item.referenceUrls.length > 0 && (
                            <div>
                              <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                Reference Links
                              </h4>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                {item.referenceUrls.map((url, i) => (
                                  <a 
                                    key={i} 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{
                                      fontSize: '0.75rem',
                                      padding: '0.35rem 0.75rem',
                                      background: 'var(--bg-card)',
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

                          {/* Job Description Summary */}
                          {item.jobDescription && (
                            <div>
                              <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                Captured Job Description
                              </h4>
                              <div style={{
                                maxHeight: '150px',
                                overflowY: 'auto',
                                padding: '1rem',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.8rem',
                                lineHeight: 1.6,
                                whiteSpace: 'pre-wrap',
                                color: 'var(--text-muted)',
                                marginTop: '0.5rem'
                              }}>
                                {item.jobDescription}
                              </div>
                            </div>
                          )}

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ 
          padding: '4rem 2rem', 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          border: '1px dashed var(--border)',
          background: 'transparent'
        }}>
          <div style={{ fontSize: '4rem', opacity: 0.3 }}>📜</div>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Forges Yet</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '300px', margin: '0 auto' }}>
              Your application history is empty. Start a new forge to see your tailored resumes here.
            </p>
          </div>
          <Link href="/applications/new" className="btn-primary">
            Forge Your First Resume
          </Link>
        </div>
      )}

      {/* Hidden container for canvas rendering */}
      <div style={{ 
        position: 'absolute', 
        left: '-9999px', 
        top: 0, 
        pointerEvents: 'none' 
      }}>
        <div ref={resumeRef} style={{ width: '850px', background: 'white' }}>
          {selectedProfileData && <ResumeTemplate data={selectedProfileData} />}
        </div>
      </div>
    </div>
  );
}
