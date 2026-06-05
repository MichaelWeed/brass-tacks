'use client';

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

export default function ArchitecturePage() {
  const c1Ref = useRef<HTMLDivElement>(null);
  const c2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
    });

    const renderDiagram = async (ref: React.RefObject<HTMLDivElement | null>, graphDef: string, id: string) => {
      if (ref.current) {
        try {
          const { svg } = await mermaid.render(id, graphDef);
          ref.current.innerHTML = svg;
        } catch (err) {
          console.error("Mermaid rendering failed:", err);
        }
      }
    };

    const c1Graph = `
      graph TD
        User([Professional/User])
        
        subgraph Local Environment [Secure Local Machine]
            BT[Brass Tacks System<br/>Local-First Application]
        end
        
        JobBoards([External Job Boards<br/>LinkedIn, Indeed, etc.])

        User -- "Inputs background & brain dump" --> BT
        User -- "Pastes job URLs/Descriptions" --> BT
        User -- "Downloads tailored PDFs" --> BT
        
        BT -- "Reads job posting data" --> JobBoards
        
        classDef secure fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff;
        class BT secure;
    `;

    const c2Graph = `
      graph TD
        User([Professional/User])
        JobBoards([External Job Boards])

        subgraph Local Environment [Secure Local Machine]
            subgraph Frontend [Next.js Desktop App]
                UI[Web UI / Dashboard]
                PDFGen[PDF Generation Engine<br/>html2canvas / jsPDF]
                LS[(Browser LocalStorage<br/>Ephemeral State)]
            end

            subgraph Backend [Python FastAPI Engine]
                API[FastAPI Router<br/>Orchestration]
                Scraper[Job Extraction Pipeline]
                Forge[Forge Generation Logic<br/>Anti-Homogenization]
                Docling[Docling Parser<br/>Document Ingestion]
            end

            subgraph Storage [Persistent Datastores]
                Qdrant[(Qdrant<br/>Local Vector Store)]
                SQLite[(PostgreSQL / SQLite<br/>Local Relational DB)]
            end
        end

        User -- "Interacts with UI" --> UI
        UI -- "REST/SSE" --> API
        UI -- "Renders Document" --> PDFGen
        UI -. "Caches Session" .-> LS
        
        API -- "Initiates Scrape" --> Scraper
        Scraper -- "Fetches Data" --> JobBoards
        
        API -- "Parses Documents" --> Docling
        API -- "Generates Resumes" --> Forge
        
        Forge -- "Semantic Search" --> Qdrant
        Forge -- "CRUD operations" --> SQLite
        
        classDef default fill:#1e293b,stroke:#475569,stroke-width:1px,color:#e2e8f0;
        classDef frontend fill:#0c4a6e,stroke:#0284c7,stroke-width:2px,color:#fff;
        classDef backend fill:#14532d,stroke:#16a34a,stroke-width:2px,color:#fff;
        classDef database fill:#4c1d95,stroke:#7c3aed,stroke-width:2px,color:#fff;
        
        class UI,PDFGen,LS frontend;
        class API,Scraper,Forge,Docling backend;
        class Qdrant,SQLite database;
    `;

    renderDiagram(c1Ref, c1Graph, 'c1-diagram');
    renderDiagram(c2Ref, c2Graph, 'c2-diagram');
  }, []);

  return (
    <div className="container" style={{ padding: '3rem 0' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Platform Architecture</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Understanding the deterministic, local-first Brass Tacks engine.
        </p>
      </header>

      <section className="card" style={{ padding: '2rem', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>C1: System Context</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Brass Tacks operates securely on your local machine, reading job board data externally while keeping all personal data completely sandboxed.
        </p>
        <div 
          ref={c1Ref} 
          style={{ 
            background: 'rgba(0,0,0,0.2)', 
            padding: '2rem', 
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'center',
            overflowX: 'auto'
          }} 
        />
      </section>

      <section className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>C2: Container Overview</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          The internal boundaries break down into the Next.js presentation layer, the FastAPI generation orchestration engine, and the persistent local datastores.
        </p>
        <div 
          ref={c2Ref} 
          style={{ 
            background: 'rgba(0,0,0,0.2)', 
            padding: '2rem', 
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'center',
            overflowX: 'auto'
          }} 
        />
      </section>
    </div>
  );
}
