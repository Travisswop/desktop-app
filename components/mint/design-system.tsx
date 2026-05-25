'use client';

import { ArrowLeft } from 'lucide-react';
import type {
  CSSProperties,
  ReactNode,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

/**
 * Visual tokens lifted from the design bundle (wire-primitives.jsx).
 * Inline-style-first to preserve fidelity with the design's odd font sizes
 * (10.5, 12.5) and exact spacing values.
 */
export const ink = '#0a0a0c';
export const ink2 = '#1a1a1f';
export const muted = '#6e6e76';
export const muted2 = '#a1a1a8';
export const hair = 'rgba(0,0,0,0.06)';
export const hair2 = 'rgba(0,0,0,0.04)';
export const canvas = '#f4f4f2';
export const surface = '#ffffff';
export const surface2 = '#fafafa';
export const posGreen = '#19a974';
export const posGreenSoft = 'rgba(25,169,116,0.1)';
export const negRed = '#e5484d';
export const negRedSoft = 'rgba(229,72,77,0.08)';
export const cardShadow =
  '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)';

export const mono = 'var(--font-jetbrains-mono), ui-monospace, monospace';
export const sans = 'var(--font-inter), -apple-system, BlinkMacSystemFont, system-ui, sans-serif';

export const T_swatch: Record<string, string> = {
  rewards: '#FBE7C6',
  orders: '#E8DFD0',
  analytics: '#D6E4F2',
  messages: '#EAE2F4',
  products: '#F2E0DC',
  checkout: '#D7EAD9',
  leads: '#F4E1E1',
  blinks: '#DCE7E2',
};

export const primaryBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 999,
  background: ink,
  color: '#fff',
  border: 0,
  cursor: 'pointer',
  fontSize: 12.5,
  fontWeight: 600,
  fontFamily: 'inherit',
};
export const primaryBtnDisabled: CSSProperties = {
  ...primaryBtn,
  background: '#cfcfd2',
  cursor: 'not-allowed',
};
export const ghostBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 999,
  background: surface,
  color: ink,
  border: `1px solid ${hair}`,
  cursor: 'pointer',
  fontSize: 12.5,
  fontWeight: 600,
  fontFamily: 'inherit',
};
export const iconBtnSm: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 7,
  background: 'transparent',
  border: 0,
  cursor: 'pointer',
  color: muted,
  fontSize: 16,
  lineHeight: 1,
  padding: 0,
};
export const colHead: CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  color: muted,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  fontFamily: mono,
};
export const cellMuted: CSSProperties = { fontSize: 12.5, color: muted };
export const fieldLabel: CSSProperties = {
  fontSize: 12,
  color: ink,
  fontWeight: 600,
  letterSpacing: -0.1,
};
export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 9,
  border: `1px solid ${hair}`,
  background: '#fff',
  color: ink,
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

/* ------------------------------ Card ----------------------------------- */
export const Card = ({
  children,
  pad = 20,
  radius = 22,
  style,
  onClick,
}: {
  children: ReactNode;
  pad?: number;
  radius?: number;
  style?: CSSProperties;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    style={{
      background: surface,
      border: `1px solid ${hair}`,
      borderRadius: radius,
      boxShadow: cardShadow,
      padding: pad,
      overflow: 'hidden',
      ...style,
    }}
  >
    {children}
  </div>
);

/* ------------------------------ Chip ----------------------------------- */
export const Chip = ({
  children,
  active = false,
  size = 'md',
  onClick,
  style,
}: {
  children: ReactNode;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  style?: CSSProperties;
}) => {
  const h = size === 'sm' ? 28 : size === 'lg' ? 40 : 34;
  const px = size === 'sm' ? 10 : size === 'lg' ? 18 : 14;
  const fs = size === 'sm' ? 12 : size === 'lg' ? 15 : 13.5;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: h,
        padding: `0 ${px}px`,
        background: active ? ink : surface,
        color: active ? '#fff' : ink,
        border: `1px solid ${active ? ink : hair}`,
        borderRadius: 999,
        fontFamily: 'inherit',
        fontSize: fs,
        fontWeight: 550,
        letterSpacing: -0.1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </button>
  );
};

/* ------------------------------ Mono ----------------------------------- */
export const Mono = ({
  children,
  size = 14,
  weight = 500,
  color,
  style,
}: {
  children: ReactNode;
  size?: number;
  weight?: number;
  color?: string;
  style?: CSSProperties;
}) => (
  <span
    style={{
      fontFamily: mono,
      fontSize: size,
      fontWeight: weight,
      letterSpacing: -0.2,
      color: color || 'inherit',
      ...style,
    }}
  >
    {children}
  </span>
);

/* ----------------------------- Avatar ---------------------------------- */
export const Avatar = ({
  size = 28,
  children,
  bg = '#e8e8e6',
  color = ink,
  style,
}: {
  size?: number;
  children: ReactNode;
  bg?: string;
  color?: string;
  style?: CSSProperties;
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: bg,
      color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.38,
      fontWeight: 600,
      letterSpacing: -0.2,
      flexShrink: 0,
      ...style,
    }}
  >
    {children}
  </div>
);

/* ----------------------- DeliveryPill helper --------------------------- */
const DELIVERY_TONES: Record<string, { bg: string; fg: string }> = {
  Complete: { bg: '#e7f7ec', fg: '#0d8b3e' },
  Settled: { bg: '#e7f7ec', fg: '#0d8b3e' },
  Delivered: { bg: '#e7f7ec', fg: '#0d8b3e' },
  Pending: { bg: '#fef0d4', fg: '#b45309' },
  Processing: { bg: '#fef0d4', fg: '#b45309' },
  'In transit': { bg: '#e0e7ff', fg: '#3730a3' },
  Cancel: { bg: '#fde7e7', fg: '#b91c1c' },
  Refunded: { bg: '#fde7e7', fg: '#b91c1c' },
};

export const DeliveryPill = ({ status }: { status: string }) => {
  const tone = DELIVERY_TONES[status] || { bg: '#f2f2f0', fg: '#525252' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 5,
        background: tone.bg,
        color: tone.fg,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.2,
        fontFamily: mono,
      }}
    >
      {status}
    </span>
  );
};

/* ------------------------------ Tag ----------------------------------- */
export const Tag = ({
  children,
  color,
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}) => (
  <span
    style={{
      fontSize: 10.5,
      letterSpacing: 1.4,
      fontWeight: 700,
      fontFamily: mono,
      color: color || muted,
      textTransform: 'uppercase',
      ...style,
    }}
  >
    {children}
  </span>
);

/* --------------------------- ScreenShell ------------------------------- */
export const ScreenShell = ({
  title,
  eyebrow = 'Dashboard',
  kicker,
  onBack,
  hideBack,
  action,
  children,
}: {
  title: string;
  eyebrow?: string;
  kicker?: ReactNode;
  onBack?: () => void;
  hideBack?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: sans, color: ink }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 32 }}>
      {!hideBack && (
        <>
          <button
            type="button"
            onClick={onBack}
            title="Back"
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: surface,
              border: `1px solid ${hair}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: ink,
              padding: 0,
              boxShadow: cardShadow,
            }}
          >
            <ArrowLeft size={14} />
          </button>
          <div style={{ fontSize: 12, color: muted, letterSpacing: -0.1 }}>
            <span style={{ cursor: 'pointer' }} onClick={onBack}>
              {eyebrow}
            </span>
            <span style={{ margin: '0 6px', color: muted2 }}>/</span>
            <span style={{ color: ink, fontWeight: 500 }}>{title}</span>
          </div>
        </>
      )}
      <div style={{ flex: 1 }} />
      {action}
    </div>
    <div>
      <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6, color: ink }}>
        {title}
      </div>
      {kicker && (
        <div style={{ fontSize: 14, color: muted, marginTop: 4 }}>{kicker}</div>
      )}
    </div>
    {children}
  </div>
);

/* ----------------------------- StatRow --------------------------------- */
export type StatItem = {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  deltaTone?: 'pos' | 'neg';
};

export const StatRow = ({ items }: { items: StatItem[] }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${items.length}, 1fr)`,
      gap: 0,
      background: surface,
      border: `1px solid ${hair}`,
      borderRadius: 18,
      overflow: 'hidden',
      boxShadow: cardShadow,
    }}
  >
    {items.map((it, i) => (
      <div
        key={it.label}
        style={{
          padding: '18px 22px',
          borderRight: i < items.length - 1 ? `1px solid ${hair}` : 'none',
        }}
      >
        <Tag>{it.label}</Tag>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
          <Mono size={26} weight={600} style={{ letterSpacing: -0.8 }}>
            {it.value}
          </Mono>
          {it.delta && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: it.deltaTone === 'neg' ? negRed : posGreen,
                fontFamily: mono,
              }}
            >
              {it.delta}
            </span>
          )}
        </div>
        {it.sub && (
          <div style={{ fontSize: 11.5, color: muted, marginTop: 4 }}>{it.sub}</div>
        )}
      </div>
    ))}
  </div>
);

/* ------------------------- Form primitives ----------------------------- */
export const FormSection = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <div
    style={{
      marginBottom: 14,
      paddingBottom: 14,
      borderBottom: `1px solid ${hair2}`,
    }}
  >
    <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>{title}</div>
    {subtitle && (
      <div style={{ fontSize: 11.5, color: muted, marginTop: 4, lineHeight: 1.4 }}>
        {subtitle}
      </div>
    )}
  </div>
);

export const Field = ({
  label,
  required,
  help,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  help?: ReactNode;
  error?: string;
  children: ReactNode;
}) => (
  <div style={{ marginBottom: 14 }}>
    <div style={fieldLabel}>
      {label}
      {required && <span style={{ color: '#dc2626' }}> *</span>}
    </div>
    <div style={{ marginTop: 6 }}>{children}</div>
    {error ? (
      <div style={{ fontSize: 10.5, color: '#dc2626', marginTop: 6, lineHeight: 1.4 }}>
        {error}
      </div>
    ) : help ? (
      <div style={{ fontSize: 10.5, color: muted, marginTop: 6, lineHeight: 1.4 }}>
        {help}
      </div>
    ) : null}
  </div>
);

export const TextInput = ({
  invalid,
  style,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) => (
  <input
    {...rest}
    style={{
      ...inputStyle,
      ...(invalid ? { borderColor: '#dc2626' } : null),
      ...style,
    }}
  />
);

export const TextArea = ({
  invalid,
  style,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) => (
  <textarea
    {...rest}
    style={{
      ...inputStyle,
      resize: 'vertical',
      fontFamily: 'inherit',
      lineHeight: 1.5,
      ...(invalid ? { borderColor: '#dc2626' } : null),
      ...style,
    }}
  />
);

export const Button = ({
  variant = 'primary',
  style,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
}) => {
  const base = variant === 'primary' ? primaryBtn : ghostBtn;
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        ...base,
        ...(disabled ? primaryBtnDisabled : null),
        ...style,
      }}
    />
  );
};
