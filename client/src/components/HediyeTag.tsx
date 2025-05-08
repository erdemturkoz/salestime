import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { Hediye } from '@/types';

interface HediyeTagProps {
  hediye: Hediye;
  onRemove: () => void;
}

const HediyeTag: React.FC<HediyeTagProps> = ({ hediye, onRemove }) => {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
      <span>{hediye.isim}</span>
      <span className="mx-1 text-xs text-neutral-500">|</span>
      <span className="text-xs font-bold text-emerald-600">{formatCurrency(hediye.fiyat)}</span>
      <button 
        type="button" 
        onClick={onRemove}
        className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-neutral-200 text-neutral-500 hover:bg-neutral-300 hover:text-neutral-700"
      >
        <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
          <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
        </svg>
      </button>
    </span>
  );
};

export default HediyeTag;
