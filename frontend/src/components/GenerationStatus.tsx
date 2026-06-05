'use client';

import React, { useEffect, useState } from 'react';

interface StatusData {
  status: string;
  error: string | null;
  completed: boolean;
}

export default function GenerationStatus({ runId }: { runId: string }) {
  const [status, setStatus] = useState<string>('initializing');
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!runId) return;

    let eventSource: EventSource;
    let retryCount = 0;
    const maxRetries = 3;

    const connect = () => {
      // Retrieve token from localStorage or session
      const token = localStorage.getItem('tf_token');
      if (!token) {
        localStorage.removeItem('tf_token');
        localStorage.removeItem('tf_profile_id');
        localStorage.removeItem('tf_master_profile');
        setError('Authentication token is missing. Access denied.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        throw new Error('Authentication token is missing. Access denied.');
      }
      
      const url = `/api/v1/generation/events/${runId}${token ? `?token=${token}` : ''}`;
      eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data: StatusData = JSON.parse(event.data);
          setStatus(data.status);
          setError(data.error);
          setCompleted(data.completed);
          
          setLogs((prev) => {
            const newLog = `[${new Date().toLocaleTimeString()}] ${data.status.toUpperCase()}`;
            if (prev[prev.length - 1] === newLog) return prev;
            return [...prev, newLog];
          });

          if (data.completed) {
            eventSource.close();
          }
        } catch (err) {
          console.error('Failed to parse SSE message:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE Error:', err);
        eventSource.close();
        
        if (retryCount < maxRetries) {
          retryCount++;
          setError(`Connection interrupted. Retrying (${retryCount}/${maxRetries})...`);
          setTimeout(connect, 2000);
        } else {
          setError('Communication link severed. Please refresh or check system status.');
        }
      };
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [runId]);

  const getProgress = (status: string) => {
    switch (status) {
      case 'queued': return 10;
      case 'canonizing': return 30;
      case 'drafting': return 60;
      case 'critiquing': return 80;
      case 'complete': return 100;
      case 'failed': return 100;
      default: return 0;
    }
  };

  return (
    <div className="card w-full max-w-2xl mx-auto mt-10 p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex justify-between items-center mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 className="text-xl font-semibold" style={{ color: 'var(--primary)', margin: 0 }}>Tailoring Engine</h3>
        <span 
          className="font-mono" 
          style={{ 
            padding: '0.25rem 0.75rem', 
            borderRadius: '999px', 
            fontSize: '0.75rem', 
            background: completed ? (error ? 'rgba(255, 77, 77, 0.2)' : 'rgba(0, 230, 118, 0.2)') : 'var(--primary-glow)',
            color: completed ? (error ? 'var(--error)' : 'var(--success)') : 'var(--primary)',
            animation: completed ? 'none' : 'pulse 1.5s infinite'
          }}
        >
          {status.toUpperCase()}
        </span>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '999px', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div 
          style={{ 
            height: '100%', 
            background: error ? 'var(--error)' : 'var(--primary)', 
            width: `${getProgress(status)}%`,
            transition: 'width 0.5s ease-out'
          }}
        />
      </div>

      {/* Logs Window */}
      <div 
        style={{ 
          background: 'rgba(0, 0, 0, 0.4)', 
          borderRadius: 'var(--radius-sm)', 
          border: '1px solid var(--border)', 
          padding: '1rem', 
          fontFamily: 'var(--font-mono)', 
          fontSize: '0.75rem', 
          height: '160px', 
          overflowY: 'auto' 
        }}
      >
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: '0.25rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--primary)', marginRight: '0.5rem' }}>&gt;</span> {log}
          </div>
        ))}
        {error && (
          <div style={{ color: 'var(--error)', marginTop: '0.5rem' }}>
            <span style={{ fontWeight: 'bold' }}>ERROR:</span> {error}
          </div>
        )}
        {!completed && <div style={{ animation: 'pulse 1s infinite', marginTop: '0.25rem' }}>_</div>}
      </div>

      {completed && !error && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button className="btn-primary" style={{ width: '100%' }}>
            Download Optimized Resume
          </button>
        </div>
      )}
    </div>
  );
}
