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
    const masterProfile = localStorage.getItem('tf_master_profile');
    
    if (!token || !masterProfile) {
      // Clear local auth states only if token is completely missing
      if (!token) {
        localStorage.removeItem('tf_token');
        localStorage.removeItem('tf_profile_id');
        localStorage.removeItem('tf_master_profile');
      }
      
      setTimeout(() => {
        setIsAuthenticated(false);
        router.replace('/login');
      }, 0);
      
      const fallbackTimer = setTimeout(() => {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }, 500);
      return () => clearTimeout(fallbackTimer);
    } else {
      setTimeout(() => {
        setIsAuthenticated(true);
      }, 0);
    }
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
      }}>
        <div className="spin" style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(240, 165, 0, 0.1)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          marginBottom: '1.5rem',
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          REDIRECTING TO ONBOARDING SETUP...
        </p>
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
