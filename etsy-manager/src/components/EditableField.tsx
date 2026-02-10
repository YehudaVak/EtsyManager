'use client';

import { useState, useEffect, useRef } from 'react';

interface EditableFieldProps {
  value: string | number | undefined | null;
  onChange: (value: string | number) => void;
  type?: 'text' | 'number' | 'date' | 'textarea';
  placeholder?: string;
  className?: string;
  rows?: number;
  step?: string;
  disabled?: boolean;
}

// Format date from YYYY-MM-DD to dd/mm/yyyy
const formatDateDisplay = (date: string): string => {
  if (!date) return '';
  const parts = date.split('-');
  if (parts.length !== 3) return date;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// Parse date from dd/mm/yyyy to YYYY-MM-DD
const parseDateInput = (display: string): string => {
  const parts = display.replace(/[^0-9/]/g, '').split('/');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return display;
  const dd = parts[0].padStart(2, '0');
  const mm = parts[1].padStart(2, '0');
  const yyyy = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * EditableField component that uses local state to prevent
 * text deletion during typing. Only syncs to parent on blur.
 */
export default function EditableField({
  value,
  onChange,
  type = 'text',
  placeholder = '',
  className = '',
  rows = 3,
  step = '0.01',
  disabled = false,
}: EditableFieldProps) {
  // Local state for the input value
  const [localValue, setLocalValue] = useState<string>(value?.toString() || '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Update local value when prop changes (but not while focused)
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value?.toString() || '');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Only update if value changed
    const newValue = type === 'number' ? (parseFloat(localValue) || 0) : localValue;
    if (newValue !== value) {
      onChange(newValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save on Enter for single-line inputs
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  };

  const baseClass = `w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg
    focus:border-[#d96f36] focus:ring-2 focus:ring-[#d96f36]/20 focus:outline-none transition-all`;

  if (type === 'textarea') {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`${baseClass} resize-y min-h-[80px] ${className}`}
      />
    );
  }

  // Date type: show dd/mm/yyyy text with hidden native date picker
  if (type === 'date') {
    return (
      <div className="relative">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={isFocused ? localValue : formatDateDisplay(localValue)}
          onChange={(e) => {
            setLocalValue(e.target.value);
          }}
          onBlur={() => {
            setIsFocused(false);
            // Try to parse dd/mm/yyyy input
            const parsed = parseDateInput(localValue);
            if (parsed !== value) {
              onChange(parsed);
            }
          }}
          onFocus={() => {
            setIsFocused(true);
            setLocalValue(value?.toString() || '');
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'dd/mm/yyyy'}
          disabled={disabled}
          className={`${baseClass} pr-8 ${className}`}
        />
        <input
          ref={dateInputRef}
          type="date"
          value={localValue}
          onChange={(e) => {
            const v = e.target.value;
            setLocalValue(v);
            onChange(v);
          }}
          className="absolute inset-0 opacity-0 cursor-pointer"
          tabIndex={-1}
        />
      </div>
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={type}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      step={type === 'number' ? step : undefined}
      disabled={disabled}
      className={`${baseClass} ${className}`}
    />
  );
}
