'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('tf_token');
    const timer = setTimeout(() => {
      if (!token) {
        // Clear local auth states
        localStorage.removeItem('tf_token');
        localStorage.removeItem('tf_profile_id');
        localStorage.removeItem('tf_master_profile');
        setIsAuthenticated(false);
        
        setTimeout(() => {
          // Redirection fallback as requested: /login with / fallback
          router.push('/login');
          // Let's also do a hard redirect check in case client router push fails or doesn't route
          setTimeout(() => {
            if (window.location.pathname === '/login') {
              window.location.href = '/';
            }
          }, 1000);
        }, 2500);
      } else {
        setIsAuthenticated(true);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-void)',
        color: 'var(--text-main)',
        fontFamily: 'var(--font-sans)',
      }}>
        <div className="spin" style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(240, 165, 0, 0.1)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          marginBottom: '1.5rem',
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
          VERIFYING SECURITY CREDENTIALS...
        </p>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-void)',
        color: 'var(--text-main)',
        fontFamily: 'var(--font-sans)',
        padding: '2rem',
      }}>
        <div className="card" style={{
          maxWidth: '460px',
          width: '100%',
          padding: '3rem 2.5rem',
          textAlign: 'center',
          border: '1px solid rgba(255, 87, 87, 0.3)',
          boxShadow: '0 0 30px rgba(255, 87, 87, 0.05)',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🔒</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--error)', letterSpacing: '-0.02em' }}>
            ACCESS DENIED
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.7', marginBottom: '2rem' }}>
            No active authentication session was detected. Access to the dashboard requires a secure credentials token to ensure data isolation.
          </p>
          <div className="loading" style={{ color: 'var(--text-dim)', fontSize: '0.82rem', letterSpacing: '0.04em' }}>
            REDIRECTING TO AUTHENTICATION GATEWAY...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: '260px',
        padding: '2rem 3rem',
        background: 'var(--bg-void)',
      }}>
        {children}
      </main>
    </div>
  );
}
