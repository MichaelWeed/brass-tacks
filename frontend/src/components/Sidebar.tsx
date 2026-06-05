'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '📊', href: '/dashboard' },
  { label: 'Master Profile', icon: '👤', href: '/profile' },
  { label: 'New Application', icon: '⚡', href: '/applications/new' },
  { label: 'History', icon: '📜', href: '/history' },
  { label: 'Architecture', icon: '🏗️', href: '/architecture' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [engineStatus, setEngineStatus] = React.useState<'checking' | 'online' | 'offline'>('checking');

  React.useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/health');
        if (res.ok) {
          setEngineStatus('online');
        } else {
          setEngineStatus('offline');
        }
      } catch {
        setEngineStatus('offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside style={{
      width: '260px',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
      {/* Logo Section */}
      <div style={{
        padding: '2rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        marginBottom: '1rem',
      }}>
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          textDecoration: 'none',
        }}>
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
          <span style={{
            fontWeight: 800,
            fontSize: '1.25rem',
            color: 'var(--text-main)',
            letterSpacing: '-0.03em',
          }}>
            Brass Tacks
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav style={{
        flex: 1,
        padding: '0 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                background: isActive ? 'var(--primary-subtle)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.9rem',
                transition: 'all var(--transition-fast)',
              }}
              className="nav-link"
            >
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              {item.label}
              {isActive && (
                <div style={{
                  marginLeft: 'auto',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div style={{
        padding: '1.5rem',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <Link
          href="/settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: pathname === '/settings' ? 'var(--text-main)' : 'var(--text-muted)',
            fontSize: '0.85rem',
            textDecoration: 'none',
          }}
        >
          <span>⚙️</span> Settings
        </Link>

        <Link
          href="/troubleshoot"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: pathname === '/troubleshoot' ? 'var(--text-main)' : 'var(--text-muted)',
            fontSize: '0.85rem',
            textDecoration: 'none',
          }}
        >
          <span>🔧</span> Troubleshoot
        </Link>

        <div style={{
          padding: '0.75rem',
          background: 'var(--bg-deep)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.25rem',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: engineStatus === 'online' ? 'var(--success)' : engineStatus === 'offline' ? 'var(--error)' : 'var(--warning)',
              animation: engineStatus === 'online' ? 'pulse 1.4s infinite' : 'none',
            }} />
            Engine Status
          </div>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: engineStatus === 'online' ? 'var(--text-main)' : 'var(--text-muted)',
          }}>
            {engineStatus === 'online' ? 'Engine Online' : engineStatus === 'offline' ? 'Engine Offline' : 'Connecting...'}
          </div>
        </div>
      </div>

      <style jsx>{`
        .nav-link:hover {
          color: var(--text-main) !important;
          background: rgba(255, 255, 255, 0.03) !important;
        }
      `}</style>
    </aside>
  );
}
