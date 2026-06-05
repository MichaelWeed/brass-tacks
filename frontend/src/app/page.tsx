'use client';

import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      {/* Navbar */}
      <nav style={{
        padding: '1.5rem 0',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(2,2,4,0.8)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 900,
              color: '#000',
            }}>B</div>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#fff', letterSpacing: '-0.03em' }}>Brass Tacks</span>
          </div>
          
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <Link href="#features" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Features</Link>
            <Link href="/about" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>About Us</Link>
            <Link href="/dashboard" className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>Enter Platform</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="animate-in" style={{ padding: '8rem 0 6rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(240,165,0,0.08) 0%, transparent 70%)',
          zIndex: -1,
        }} />

        <div className="container">
          <div className="badge badge-amber" style={{ marginBottom: '2rem', padding: '0.4rem 1rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block', animation: 'pulse 1.4s infinite', marginRight: '0.5rem' }} />
            The Future of Applications is Personal
          </div>
          
          <h1 style={{
            fontSize: 'clamp(3rem, 8vw, 5.5rem)',
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            marginBottom: '1.5rem',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #A0A0B0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Custom Resume<br />Every Time
          </h1>
          
          <p style={{
            maxWidth: '44rem',
            margin: '0 auto 3rem',
            fontSize: '1.25rem',
            lineHeight: 1.6,
            color: 'var(--text-muted)',
          }}>
            Create a professional resume and cover letter for every job application.
          </p>
          
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
            <Link href="/dashboard" className="btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1rem' }}>
              Launch Dashboard
            </Link>
            <Link href="/profile" className="btn-ghost" style={{ padding: '1rem 2.5rem', fontSize: '1rem', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
              Sign Up / Import Profile
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" style={{ padding: '6rem 0', background: 'var(--bg-deep)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Built for Professionals</h2>
            <p style={{ color: 'var(--text-muted)' }}>Everything you need to beat the ATS and impress hiring managers.</p>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2rem',
          }}>
            {[
              {
                title: 'Freewriting',
                icon: '🧠',
                desc: 'Save your entire professional history securely, use only what is relevant.'
              },
              {
                title: 'Job Extraction',
                icon: '🎯',
                desc: 'Paste a job description or URL. Our engine extracts roles, companies, and requirements instantly, even if scrapers are blocked.'
              },
              {
                title: 'Precise Resume',
                icon: '🛡️',
                desc: 'No AI-speak, just your real impact. Uses only whats relevant to a specific job posting'
              }
            ].map(f => (
              <div key={f.title} className="card" style={{ padding: '2.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>{f.icon}</div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.95rem' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Brief */}
      <section style={{ padding: '8rem 0' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>Why Brass Tacks?</h2>
            <p style={{ marginBottom: '1.5rem' }}>
              Generic resumes are dead. Today&apos;s job market requires surgical precision. Brass Tacks was built to solve the &quot;AI Homogenization&quot; problem — where every applicant sounds identical.
            </p>
            <p style={{ marginBottom: '2rem' }}>
              By combining your deep personal work history (the freewriting Brain Dump) with advanced entity matching, we create documents that are uniquely yours and perfectly aligned with the role.
            </p>
            <Link href="/about" style={{ color: 'var(--primary)', fontWeight: 700 }}>Read our full story →</Link>
          </div>
          <div className="card-elevated" style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface)' }}>
             <div style={{ textAlign: 'center' }}>
               <div style={{ fontSize: '4rem' }}>📄</div>
               <div style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>Your resume. Your words. Every time.</div>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '4rem 0', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <div className="container">
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
            © 2026 Brass Tacks. Local-first. Your data stays on your machine.
          </p>
        </div>
      </footer>
    </div>
  );
}
