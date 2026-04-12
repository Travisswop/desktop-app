'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Custom404() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        padding: '24px',
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 48 }}>
        <Image
          src="/swopLogo.png"
          alt="Swop"
          width={90}
          height={28}
          style={{ objectFit: 'contain' }}
        />
      </div>

      {/* 404 */}
      <h1
        style={{
          fontSize: 'clamp(100px, 20vw, 160px)',
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: '-6px',
          color: '#000000',
          margin: 0,
          userSelect: 'none',
        }}
      >
        404
      </h1>

      {/* Thin divider */}
      <div
        style={{
          width: 48,
          height: 2,
          background: '#000000',
          margin: '28px 0',
          borderRadius: 99,
        }}
      />

      {/* Heading */}
      <h2
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: '#000000',
          margin: 0,
          marginBottom: 10,
          textAlign: 'center',
        }}
      >
        Profile Not Found
      </h2>

      {/* Sub-text */}
      <p
        style={{
          fontSize: 14,
          color: '#6b7280',
          margin: 0,
          marginBottom: 40,
          textAlign: 'center',
          lineHeight: 1.7,
          maxWidth: 320,
        }}
      >
        This SmartSite doesn&apos;t exist or may have been removed.
        Double-check the link and try again.
      </p>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="https://swopme.app"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '11px 26px',
            borderRadius: 8,
            background: '#000000',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.opacity = '0.75')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.opacity = '1')
          }
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Go Home
        </Link>

        <button
          onClick={() => window.history.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '11px 26px',
            borderRadius: 8,
            background: '#ffffff',
            border: '1.5px solid #e5e7eb',
            color: '#374151',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.borderColor = '#000000')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb')
          }
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Go Back
        </button>
      </div>
    </div>
  );
}
