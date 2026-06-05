'use client';

import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
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
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
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
          </Link>
          <Link href="/dashboard" className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>Enter Platform</Link>
        </div>
      </nav>

      <main className="container-narrow" style={{ padding: '6rem 0' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '2rem', textAlign: 'center' }}>Our Philosophy</h1>
        
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontSize: '1.1rem', lineHeight: 1.75 }}>
          <p>
            Brass Tacks was built out of a simple realization: <strong>The modern job application process is broken.</strong>
          </p>
          
          <p>
            Applicants are caught between two bad options: spending hours manually tailoring every resume, or using generic AI tools that hallucinate skills and strip away the candidate&apos;s unique voice.
          </p>

          <div className="card-elevated" style={{ padding: '2rem', margin: '1rem 0' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>Our Philosophy</h2>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li><strong>Local-First:</strong> Your resume is your most personal data. We never store your history on our servers. It stays on your machine.</li>
              <li><strong>Brain Dump &gt; Resume:</strong> A resume is a snapshot. A Brain Dump is a legacy. We prioritize the preservation of your entire career narrative.</li>
              <li><strong>Zero Hallucination:</strong> Our engine is designed to only use the facts you provide. If it&apos;s not in the dump, it&apos;s not in the resume.</li>
            </ul>
          </div>

          <p>
            We built Brass Tacks to be a precision tool. It&apos;s not a &quot;magic button.&quot; It takes your real, messy, professional history and produces a surgical document for every role you target.
          </p>

          <p>
            The goal is simple: Help talented people spend less time fighting with PDFs and more time doing the work they love.
          </p>
          
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link href="/dashboard" className="btn-primary" style={{ padding: '1rem 3rem' }}>
              Start Forging
            </Link>
          </div>
        </section>
      </main>

      <footer style={{ padding: '4rem 0', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <div className="container">
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            Created with focus in 2026. Built to impress.
          </p>
        </div>
      </footer>
    </div>
  );
}
