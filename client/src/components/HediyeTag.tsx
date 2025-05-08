import React from 'react';

interface HediyeTagProps {
  text: string;
  onRemove: () => void;
}

const HediyeTag: React.FC<HediyeTagProps> = ({ text, onRemove }) => {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
      {text}
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
