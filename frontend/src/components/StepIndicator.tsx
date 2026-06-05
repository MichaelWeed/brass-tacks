'use client';

import React from 'react';

interface Step {
  id: number;
  label: string;
  icon: string;
}

const STEPS: Step[] = [
  { id: 1, label: 'Your Resume', icon: '📄' },
  { id: 2, label: 'Job Posting', icon: '🎯' },
  { id: 3, label: 'Configure',  icon: '⚙️' },
  { id: 4, label: 'Forge',      icon: '⚡' },
];

interface Props {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: Props) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0,
      width: '100%',
      maxWidth: '520px',
      margin: '0 auto 3rem',
    }}>
      {STEPS.map((step, idx) => {
        const done    = currentStep > step.id;
        const active  = currentStep === step.id;

        return (
          <React.Fragment key={step.id}>
            {/* Step node */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', position: 'relative' }}>
              {/* Circle */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: done
                  ? '2px solid var(--primary)'
                  : active
                  ? '2px solid var(--primary)'
                  : '2px solid var(--border)',
                background: done
                  ? 'var(--primary)'
                  : active
                  ? 'var(--primary-subtle)'
                  : 'var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: done ? '0.85rem' : '0.9rem',
                transition: 'all 0.35s ease',
                boxShadow: active ? '0 0 16px 0 var(--primary-glow)' : 'none',
                flexShrink: 0,
              }}>
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7L5.5 10.5L12 3.5" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700,
                    color: active ? 'var(--primary)' : 'var(--text-dim)' }}>
                    {step.id}
                  </span>
                )}
              </div>

              {/* Label */}
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: active ? 'var(--primary)' : done ? 'var(--text-muted)' : 'var(--text-dim)',
                transition: 'color 0.3s ease',
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div style={{
                height: '2px',
                flex: 1,
                background: done ? 'var(--primary)' : 'var(--border)',
                marginBottom: '1.25rem',
                transition: 'background 0.4s ease',
                minWidth: '20px',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
