'use client';

import React from 'react';
import Link from 'next/link';

interface HistoryItem {
  id: string;
  company: string;
  role: string;
  date: string;
  status: string;
  extractedText?: string;
  tailoredResume?: string;
  originalResume?: string;
  jobDescription?: string;
  masterProfileApplied?: string;
  modelUsed?: string;
}

export default function DashboardPage() {
  const [profile, setProfile] = React.useState<string>('');
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  
  React.useEffect(() => {
    const savedProfile = localStorage.getItem('tf_master_profile');
    const savedHistory = localStorage.getItem('tf_forge_history');

    const timer = setTimeout(() => {
      if (savedProfile) {
        setProfile(savedProfile);
      }
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error('Failed to parse history', e);
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const profileStrength = profile.length > 500 ? 95 : profile.length > 100 ? 65 : 25;

  return (
    <div className="animate-in">
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Forge Dashboard</h1>
        <p style={{ color: 'var(--text-muted)' }}>Welcome back. Your career precision tools are ready.</p>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '3rem',
      }}>
        {/* Profile Strength Card */}
        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>PROFILE STRENGTH</h3>
            <span className={`badge ${profileStrength > 80 ? 'badge-green' : 'badge-amber'}`}>
              {profileStrength > 80 ? 'Robust' : 'Needs Work'}
            </span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>
              {profileStrength}%
            </div>
            <div style={{ marginTop: '1rem' }}>
              <div style={{ height: '8px', background: 'var(--bg-deep)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${profileStrength}%`, height: '100%', background: 'var(--primary)', transition: 'width 1s ease' }} />
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
            {profileStrength > 80 
              ? 'Your brain dump is comprehensive. High tailoring precision expected.' 
              : 'Add more details to your Master Profile to improve resume precision.'}
          </p>
        </div>

        {/* Quick Action Card */}
        <div className="card-elevated" style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          border: '1px solid var(--primary-subtle)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Forge a New Resume</h2>
          <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '240px' }}>
            Ready for a new role? Tailor your master profile to a specific job posting.
          </p>
          <Link href="/applications/new" className="btn-primary" style={{ width: '100%' }}>
            Start New Application
          </Link>
        </div>

        {/* Profile Status Card */}
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>MASTER PROFILE</h3>
            <span className="badge badge-green">Live</span>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Brain Dump</div>
            <p style={{ fontSize: '0.85rem' }}>Source of truth for all forges.</p>
          </div>
          <div style={{
            padding: '1rem',
            background: 'var(--bg-deep)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
            marginBottom: '1.5rem',
            maxHeight: '100px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
          }}>
            {profile || 'No profile data found. Please complete your brain dump to begin.'}
          </div>
          <Link href="/profile" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 600 }}>
            {profile ? 'Edit Profile →' : 'Create Profile →'}
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <section>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Recent Applications</h2>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {history.length > 0 ? (
            <>
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
                  {history.slice(0, 5).map((item: HistoryItem) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>{item.company}</td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem' }}>{item.role}</td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.date}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span className={`badge ${item.status === 'Forged' ? 'badge-green' : 'badge-error'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <button className="btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '1rem', textAlign: 'center', background: 'var(--bg-deep)' }}>
                <Link href="/history" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  View application history
                </Link>
              </div>
            </>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No recent applications. Start your first forge to see them here.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
