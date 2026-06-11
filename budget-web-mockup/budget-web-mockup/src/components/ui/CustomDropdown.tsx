'use client';

import { useState, useRef, useEffect } from 'react';

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function CustomDropdown({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Select...',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center justify-between gap-2 px-4 py-2.5 min-w-[140px]
          bg-white border border-gray-200 rounded-xl
          text-sm font-medium text-gray-900
          transition-all duration-200 ease-out
          ${disabled
            ? 'opacity-50 cursor-not-allowed bg-gray-50'
            : 'hover:border-indigo-300 hover:shadow-sm cursor-pointer'
          }
          ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : ''}
        `}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
          {selectedOption?.label || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="
            absolute right-0 mt-2 min-w-full w-max
            bg-white border border-gray-100 rounded-xl shadow-lg
            py-1.5 z-50 origin-top-right
          "
          style={{
            animation: 'dropdownIn 0.15s ease-out forwards',
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`
                w-full flex items-center justify-between gap-3 px-4 py-2.5
                text-sm text-left transition-colors duration-150
                ${option.value === value
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
