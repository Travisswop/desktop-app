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

  const unitPrice = Number(item.nftTemplate.price) || 0;
  const lineTotal = Number((unitPrice * quantity).toFixed(6));

  const handleRemove = () => {
    onRemoveItem(item._id);
  };

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
          src={item.nftTemplate.image || '/images/placeholder-photo.png'}
          alt={item.nftTemplate.name}
          width={320}
          height={320}
          className="w-32 h-auto rounded"
          loading="lazy"
        />
        <div>
          <p className="text-lg font-semibold mb-1">
            {item.nftTemplate.name}
          </p>
          <p>
            ${lineTotal}
            {quantity > 1 && (
              <span className="text-xs text-gray-500 ml-1">
                (${unitPrice} each)
              </span>
            )}
          </p>
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
