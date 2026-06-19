'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Loader2,
  Wallet,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckoutCardProps } from './types';

const ink = '#0a0a0c';
const muted = '#6e6e76';
const muted2 = '#a1a1a8';
const hair = 'rgba(0,0,0,0.06)';
const hair2 = 'rgba(0,0,0,0.04)';
const cardShadow =
  '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)';
const mono = 'var(--font-jetbrains-mono), monospace';

// Field configurations for DRY approach
const CONTACT_FIELDS = [
  {
    id: 'email',
    label: 'Email',
    type: 'text',
    placeholder: 'you@email.com',
    required: true,
  },
  {
    id: 'name',
    label: 'Full Name',
    type: 'text',
    placeholder: 'John Doe',
    required: true,
  },
  {
    id: 'phone',
    label: 'Phone',
    type: 'tel',
    placeholder: '+1 (555) 123-4567',
    required: true,
  },
];

const ADDRESS_FIELDS = [
  {
    id: 'address.line1',
    label: 'Address Line 1',
    type: 'text',
    placeholder: '123 Main St',
    required: true,
  },
  {
    id: 'address.line2',
    label: 'Address Line 2 (Optional)',
    type: 'text',
    placeholder: 'Apt 4B',
    required: false,
  },
];

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'BD', label: 'Bangladesh' },
];

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: muted,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  fontFamily: mono,
};

const fieldLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: ink,
  letterSpacing: -0.1,
  marginBottom: 6,
  display: 'block',
};

const Section = ({
  title,
  action,
  children,
  divider = true,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  divider?: boolean;
}) => (
  <section
    style={{
      padding: '18px 20px',
      borderBottom: divider ? `1px solid ${hair2}` : 'none',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
      }}
    >
      <span style={sectionTitle}>{title}</span>
      {action}
    </div>
    {children}
  </section>
);

const CheckoutCard: React.FC<CheckoutCardProps> = ({
  user,
  customerInfo,
  toggleUseSwopId,
  handleInputChange,
  handleCountryChange,
  handleOpenWalletPayment,
  handleOpenPhantomPayment,
  errorMessage,
  cartItems,
  subtotal,
  shippingCost,
  totalCost,
  hasPhygitalProducts,
}) => {
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [isPhantomLoading, setIsPhantomLoading] = useState(false);

  const handleWalletPayment = async () => {
    setIsWalletLoading(true);
    try {
      await handleOpenWalletPayment();
    } finally {
      setIsWalletLoading(false);
    }
  };

  const handlePhantomPayment = async () => {
    setIsPhantomLoading(true);
    try {
      await handleOpenPhantomPayment();
    } finally {
      setIsPhantomLoading(false);
    }
  };

  const getNestedValue = (obj: any, path: string) => {
    return (
      path.split('.').reduce((acc, part) => acc?.[part], obj) || ''
    );
  };

  const itemCount = cartItems.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0
  );

  const fmt = (n: number) => `$${Number(n).toFixed(2)}`;

  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${hair}`,
        borderRadius: 22,
        boxShadow: cardShadow,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '18px 20px',
          borderBottom: `1px solid ${hair}`,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: -0.3,
            color: ink,
          }}
        >
          Checkout
        </div>
      </div>

      {/* Contact */}
      <Section
        title="Contact information"
        action={
          user && (
            <button
              type="button"
              onClick={toggleUseSwopId}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 999,
                border: `1px solid ${
                  customerInfo.useSwopId ? ink : hair
                }`,
                background: customerInfo.useSwopId ? ink : '#fff',
                color: customerInfo.useSwopId ? '#fff' : ink,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {customerInfo.useSwopId && <Check size={11} />}
              Use Swop.ID
            </button>
          )
        }
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {CONTACT_FIELDS.map((field) => (
            <div key={field.id}>
              <Label htmlFor={field.id} style={fieldLabel}>
                {field.label}
                {field.required && (
                  <span style={{ color: '#dc2626', marginLeft: 2 }}>
                    *
                  </span>
                )}
              </Label>
              <Input
                id={field.id}
                name={field.id}
                type={field.type}
                value={String(
                  customerInfo[
                    field.id as keyof typeof customerInfo
                  ] || '',
                )}
                onChange={handleInputChange}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Shipping (phygital only) */}
      {hasPhygitalProducts && (
        <>
          <Section title="Shipping address">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {ADDRESS_FIELDS.map((field) => (
                <div key={field.id}>
                  <Label htmlFor={field.id} style={fieldLabel}>
                    {field.label}
                    {field.required && (
                      <span
                        style={{ color: '#dc2626', marginLeft: 2 }}
                      >
                        *
                      </span>
                    )}
                  </Label>
                  <Input
                    id={field.id}
                    name={field.id}
                    type={field.type}
                    value={getNestedValue(customerInfo, field.id)}
                    onChange={handleInputChange}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full"
                  />
                </div>
              ))}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                {(['city', 'state'] as const).map((field) => (
                  <div key={field}>
                    <Label
                      htmlFor={`address.${field}`}
                      style={fieldLabel}
                    >
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                      <span
                        style={{ color: '#dc2626', marginLeft: 2 }}
                      >
                        *
                      </span>
                    </Label>
                    <Input
                      id={`address.${field}`}
                      name={`address.${field}`}
                      type="text"
                      value={
                        customerInfo.address?.[
                          field as keyof typeof customerInfo.address
                        ] || ''
                      }
                      onChange={handleInputChange}
                      placeholder={
                        field === 'city' ? 'New York' : 'NY'
                      }
                      required
                      className="w-full"
                      aria-required="true"
                    />
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <div>
                  <Label
                    htmlFor="address.postalCode"
                    style={fieldLabel}
                  >
                    Postal Code
                    <span style={{ color: '#dc2626', marginLeft: 2 }}>
                      *
                    </span>
                  </Label>
                  <Input
                    id="address.postalCode"
                    name="address.postalCode"
                    type="text"
                    value={customerInfo.address?.postalCode || ''}
                    onChange={handleInputChange}
                    placeholder="10001"
                    required
                    className="w-full"
                    aria-required="true"
                  />
                </div>
                <div>
                  <Label htmlFor="address.country" style={fieldLabel}>
                    Country
                    <span style={{ color: '#dc2626', marginLeft: 2 }}>
                      *
                    </span>
                  </Label>
                  <Select
                    value={customerInfo.address?.country || ''}
                    onValueChange={handleCountryChange}
                  >
                    <SelectTrigger id="address.country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem
                          key={country.value}
                          value={country.value}
                        >
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Shipping method">
            <div
              style={{
                padding: '12px 14px',
                background: '#fafafa',
                border: `1px solid ${hair}`,
                borderRadius: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: ink,
                    letterSpacing: -0.2,
                  }}
                >
                  {shippingCost > 0
                    ? 'Standard shipping'
                    : 'Free shipping'}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: muted,
                    marginTop: 2,
                  }}
                >
                  5–7 business days
                </div>
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: mono,
                  color: ink,
                }}
              >
                {shippingCost > 0
                  ? `${fmt(shippingCost)} USDC`
                  : 'Free'}
              </span>
            </div>
          </Section>
        </>
      )}

      {/* Order summary */}
      <Section title="Order summary" divider={false}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <SummaryRow
            label={`Subtotal (${itemCount} ${
              itemCount === 1 ? 'item' : 'items'
            })`}
            value={`${fmt(subtotal)} USDC`}
          />
          <SummaryRow
            label="Shipping"
            value={
              shippingCost > 0 ? `${fmt(shippingCost)} USDC` : 'Free'
            }
            muted={shippingCost === 0}
          />
          <SummaryRow label="Discount" value="0.00 USDC" muted />

          <div
            style={{
              height: 1,
              background: hair2,
              margin: '6px 0',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: ink,
                letterSpacing: -0.2,
              }}
            >
              Total
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 600,
                fontFamily: mono,
                color: ink,
                letterSpacing: -0.6,
              }}
            >
              {fmt(totalCost)}{' '}
              <span
                style={{
                  fontSize: 11,
                  color: muted2,
                  fontWeight: 500,
                }}
              >
                USDC
              </span>
            </span>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <div
        style={{
          padding: 16,
          borderTop: `1px solid ${hair}`,
          background: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {errorMessage && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(220,38,38,0.16)',
              background: 'rgba(220,38,38,0.06)',
              color: '#b91c1c',
              fontSize: 12.5,
              lineHeight: 1.4,
            }}
          >
            <AlertCircle
              size={14}
              style={{ marginTop: 1, flexShrink: 0 }}
            />
            {errorMessage}
          </div>
        )}

        {user && (
          <>
            <button
              type="button"
              onClick={handleWalletPayment}
              disabled={
                !customerInfo.email || isWalletLoading || isPhantomLoading
              }
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: 12,
                background: ink,
                color: '#fff',
                border: 0,
                cursor:
                  !customerInfo.email || isWalletLoading || isPhantomLoading
                    ? 'not-allowed'
                    : 'pointer',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: -0.2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity:
                  !customerInfo.email || isWalletLoading || isPhantomLoading
                    ? 0.55
                    : 1,
                transition: 'opacity .15s',
              }}
            >
              {isWalletLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Sending request…
                </>
              ) : (
                <>
                  <Wallet size={14} /> Pay with Swop wallet
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePhantomPayment}
              disabled={
                !customerInfo.email || isPhantomLoading || isWalletLoading
              }
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: 12,
                background: '#5f4acb',
                color: '#fff',
                border: 0,
                cursor:
                  !customerInfo.email || isPhantomLoading || isWalletLoading
                    ? 'not-allowed'
                    : 'pointer',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: -0.2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity:
                  !customerInfo.email || isPhantomLoading || isWalletLoading
                    ? 0.55
                    : 1,
                transition: 'opacity .15s',
              }}
            >
              {isPhantomLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Opening…
                </>
              ) : (
                <>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: '#fff',
                      color: '#5f4acb',
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    P
                  </span>
                  Pay with Phantom
                </>
              )}
            </button>
          </>
        )}

        {!user && (
          <button
            type="button"
            disabled
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: 12,
              background: ink,
              color: '#fff',
              border: 0,
              cursor: 'not-allowed',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: -0.2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: 0.55,
            }}
          >
            <Wallet size={14} /> Sign in to pay with wallet
          </button>
        )}

        <p
          style={{
            fontSize: 10.5,
            color: muted,
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          Crypto payments settled securely on Solana.
        </p>
      </div>
    </div>
  );
};

const SummaryRow = ({
  label,
  value,
  muted: isMuted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    }}
  >
    <span style={{ fontSize: 12.5, color: muted, fontWeight: 500 }}>
      {label}
    </span>
    <span
      style={{
        fontSize: 13,
        fontWeight: 600,
        fontFamily: mono,
        color: isMuted ? muted : ink,
      }}
    >
      {value}
    </span>
  </div>
);

export default CheckoutCard;
