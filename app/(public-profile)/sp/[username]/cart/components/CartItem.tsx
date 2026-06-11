import React from 'react';
import Image from 'next/image';
import { CartItem as CartItemType, LoadingOperations } from './types';
import {
  AlertCircle,
  Box,
  FileText,
  Loader,
  Minus,
  Plus,
  Truck,
  X,
} from 'lucide-react';

interface CartItemProps {
  item: CartItemType;
  loadingOperations: LoadingOperations;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
}

const ink = '#0a0a0c';
const muted = '#6e6e76';
const muted2 = '#a1a1a8';
const hair = 'rgba(0,0,0,0.06)';
const hair2 = 'rgba(0,0,0,0.04)';
const cardShadow =
  '0 1px 2px rgba(10,10,12,0.04), 0 8px 28px -12px rgba(10,10,12,0.10)';
const mono = 'var(--font-jetbrains-mono), monospace';

const isPhygital = (nftType?: string) => nftType === 'phygital';

const formatPerks = (raw: unknown[] | undefined): string[] => {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object') {
        const obj = entry as Record<string, unknown>;
        if (typeof obj.name === 'string') return obj.name;
        if (typeof obj.title === 'string') return obj.title;
        if (typeof obj.label === 'string') return obj.label;
      }
      return null;
    })
    .filter((s): s is string => Boolean(s));
};

export const CartItem: React.FC<CartItemProps> = ({
  item,
  loadingOperations,
  onUpdateQuantity,
  onRemoveItem,
}) => {
  const { quantity } = item;
  const tpl = item.nftTemplate;

  const availableQuantity = Number(tpl?.mintLimit || 0);
  const isAtAvailabilityLimit =
    availableQuantity > 0 && quantity >= availableQuantity;
  const isLowStock =
    availableQuantity > 0 &&
    availableQuantity - quantity > 0 &&
    availableQuantity - quantity <= 3;

  const selectedOptions = Object.entries(item.selectedOptions || {});
  const { updating, deleting } = loadingOperations[item._id] || {
    updating: false,
    deleting: false,
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return;
    onUpdateQuantity(item._id, newQuantity);
  };

  const unitPrice = Number(tpl.price) || 0;
  const lineTotal = Number((unitPrice * quantity).toFixed(6));
  const physical = isPhygital(tpl.nftType);
  const shippingPerUnit = Number(tpl.shippingCost || 0);
  const showShipping = physical && tpl.shippingRequired;
  const benefits = formatPerks(tpl.benefits);
  const addons = formatPerks(tpl.addons);
  const requirements = formatPerks(tpl.requirements);

  return (
    <div
      style={{
        position: 'relative',
        background: '#fff',
        border: `1px solid ${hair}`,
        borderRadius: 18,
        boxShadow: cardShadow,
        padding: 14,
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: 12,
          background: '#f4f4f2',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Image
          src={tpl.image || '/images/placeholder-photo.png'}
          alt={tpl.name}
          width={84}
          height={84}
          style={{
            width: 84,
            height: 84,
            objectFit: 'cover',
            display: 'block',
          }}
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: 22 }}>
        {/* Type pill */}

        <div
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            letterSpacing: -0.2,
            color: ink,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {tpl.name}
        </div>

        {tpl.description && (
          <div
            style={{
              fontSize: 11.5,
              color: muted,
              lineHeight: 1.45,
              marginTop: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {tpl.description}
          </div>
        )}

        {selectedOptions.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 5,
              marginTop: 8,
            }}
          >
            {selectedOptions.map(([name, option]) => (
              <span
                key={name}
                style={{
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: '#f4f4f2',
                  border: `1px solid ${hair}`,
                  fontSize: 10.5,
                  fontWeight: 500,
                  color: muted,
                  letterSpacing: -0.1,
                }}
              >
                <span style={{ color: muted2 }}>{name}:</span>{' '}
                <span style={{ color: ink, fontWeight: 600 }}>
                  {option}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Meta strip: includes / shipping / stock */}
        {(benefits.length > 0 ||
          addons.length > 0 ||
          requirements.length > 0 ||
          showShipping ||
          isLowStock) && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: `1px solid ${hair2}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            {benefits.length > 0 && (
              <MetaRow label="Includes" items={benefits} />
            )}
            {addons.length > 0 && (
              <MetaRow label="Add-ons" items={addons} />
            )}
            {requirements.length > 0 && (
              <MetaRow label="Requires" items={requirements} />
            )}
            {/* {showShipping && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: muted,
                }}
              >
                <Truck size={12} />
                {shippingPerUnit > 0 ? (
                  <>
                    Shipping{' '}
                    <span
                      style={{
                        fontFamily: mono,
                        color: ink,
                        fontWeight: 600,
                      }}
                    >
                      ${shippingPerUnit.toFixed(2)}
                    </span>{' '}
                    flat — added once per order
                  </>
                ) : (
                  'Free shipping'
                )}
              </div>
            )} */}
            {/* {isLowStock && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: '#b45309',
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={12} />
                Only {availableQuantity - quantity} more left
              </div>
            )} */}
          </div>
        )}

        {/* Stepper + price */}
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              border: `1px solid ${hair}`,
              borderRadius: 999,
              background: '#fff',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={updating || quantity <= 1}
              aria-label="Decrease quantity"
              style={{
                width: 30,
                height: 30,
                background: 'transparent',
                border: 0,
                cursor:
                  updating || quantity <= 1
                    ? 'not-allowed'
                    : 'pointer',
                color: ink,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: updating || quantity <= 1 ? 0.4 : 1,
              }}
            >
              <Minus size={14} />
            </button>
            <span
              style={{
                minWidth: 28,
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: mono,
                color: ink,
              }}
            >
              {updating ? (
                <Loader className="animate-spin" size={14} />
              ) : (
                quantity
              )}
            </span>
            <button
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={updating || isAtAvailabilityLimit}
              aria-label={
                isAtAvailabilityLimit
                  ? 'Maximum available quantity reached'
                  : 'Increase quantity'
              }
              style={{
                width: 30,
                height: 30,
                background: 'transparent',
                border: 0,
                cursor:
                  updating || isAtAvailabilityLimit
                    ? 'not-allowed'
                    : 'pointer',
                color: ink,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: updating || isAtAvailabilityLimit ? 0.4 : 1,
              }}
            >
              <Plus size={14} />
            </button>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                fontFamily: mono,
                color: ink,
                letterSpacing: -0.2,
              }}
            >
              ${lineTotal.toFixed(2)}
            </div>
            {quantity > 1 && (
              <div
                style={{
                  fontSize: 10.5,
                  color: muted,
                  fontFamily: mono,
                  marginTop: 2,
                }}
              >
                ${unitPrice.toFixed(2)} each
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemoveItem(item._id)}
        disabled={deleting}
        aria-label="Remove item"
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 26,
          height: 26,
          borderRadius: 999,
          background: 'transparent',
          border: 0,
          cursor: deleting ? 'not-allowed' : 'pointer',
          color: muted,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {deleting ? (
          <Loader className="animate-spin" size={14} />
        ) : (
          <X size={14} />
        )}
      </button>
    </div>
  );
};

const MetaRow = ({
  label,
  items,
}: {
  label: string;
  items: string[];
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 6,
      flexWrap: 'wrap',
      fontSize: 11,
      color: muted,
      lineHeight: 1.5,
    }}
  >
    <span
      style={{
        fontFamily: mono,
        fontSize: 9.5,
        fontWeight: 700,
        color: muted2,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        paddingTop: 1,
      }}
    >
      {label}
    </span>
    <span style={{ color: ink, fontWeight: 500 }}>
      {items.join(' · ')}
    </span>
  </div>
);
