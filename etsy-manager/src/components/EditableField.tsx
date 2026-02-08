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
