'use client';

import React from 'react';

export interface ResumeData {
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

export default function ResumeTemplate({ data }: { data: ResumeData }) {
  return (
    <div id="resume-to-pdf" style={{
      width: '850px', // Standard US Letter width ratio
      minHeight: '1100px',
      padding: '60px 50px',
      background: '#ffffff',
      color: '#1a1a1b',
      fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif',
      lineHeight: '1.6',
    }}>
      {/* Header */}
      <header style={{ marginBottom: '35px', textAlign: 'left' }}>
        <h1 style={{ 
          fontSize: '2.75rem', 
          fontWeight: 800,
          margin: '0 0 10px 0', 
          color: '#0f172a',
          letterSpacing: '-0.02em'
        }}>
          {data?.name || ''}
        </h1>
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '15px', 
          fontSize: '0.85rem', 
          color: '#64748b',
          fontWeight: 500 
        }}>
          <span>{data?.contact?.email || ''}</span>
          <span>•</span>
          <span>{data?.contact?.phone || ''}</span>
          <span>•</span>
          <span>{data?.contact?.location || ''}</span>
          {(data?.contact?.links || []).map((link, i) => (
            <React.Fragment key={i}>
              <span>•</span>
              <span style={{ color: '#3b82f6' }}>{link?.label || ''}</span>
            </React.Fragment>
          ))}
        </div>
      </header>

      {/* Summary */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ 
          fontSize: '1rem', 
          fontWeight: 700, 
          color: '#334155', 
          textTransform: 'uppercase', 
          letterSpacing: '0.1em',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '6px',
          marginBottom: '12px'
        }}>
          Professional Summary
        </h2>
        <p style={{ fontSize: '0.95rem', color: '#334155', textAlign: 'justify' }}>
          {data?.summary || ''}
        </p>
      </section>

      {/* Experience */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ 
          fontSize: '1rem', 
          fontWeight: 700, 
          color: '#334155', 
          textTransform: 'uppercase', 
          letterSpacing: '0.1em',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '6px',
          marginBottom: '15px'
        }}>
          Professional Experience
        </h2>
        {(data?.experience || []).map((exp, idx) => (
          <div key={idx} style={{ marginBottom: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                {exp?.title || ''} <span style={{ fontWeight: 400, color: '#64748b' }}>at</span> {exp?.company || ''}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>{exp?.period || ''}</span>
            </div>
            <ul style={{ margin: '0', paddingLeft: '18px' }}>
              {(exp?.bullets || []).map((bullet, bidx) => (
                <li key={bidx} style={{ fontSize: '0.92rem', color: '#334155', marginBottom: '4px' }}>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Education */}
      {data?.education && data?.education?.length > 0 && (
        <section style={{ marginBottom: '30px' }}>
          <h2 style={{ 
            fontSize: '1rem', 
            fontWeight: 700, 
            color: '#334155', 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '6px',
            marginBottom: '15px'
          }}>
            Education
          </h2>
          {(data?.education || []).map((edu, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                {edu?.degree || ''}{edu?.school ? <> <span style={{ fontWeight: 400, color: '#64748b' }}>from</span> {edu?.school}</> : null}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>{edu?.period || ''}</span>
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {data?.skills && data.skills.length > 0 && (
        <section>
          <h2 style={{ 
            fontSize: '1rem', 
            fontWeight: 700, 
            color: '#334155', 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '6px',
            marginBottom: '12px'
          }}>
            Technical Skills & Expertise
          </h2>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '8px',
            fontSize: '0.85rem'
          }}>
            {(data?.skills || []).map((skill, idx) => (
              <span key={idx} style={{ 
                border: '1px solid #e2e8f0', 
                padding: '2px 10px', 
                borderRadius: '4px', 
                background: '#f8fafc',
                color: '#475569',
                fontWeight: 500
              }}>
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
