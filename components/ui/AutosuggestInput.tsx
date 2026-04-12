'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface AutosuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

export function AutosuggestInput({
  value,
  onChange,
  suggestions,
  onFocus,
  onBlur,
  placeholder,
  className,
}: AutosuggestInputProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = value
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value)
    : suggestions;

  const handleFocus = () => {
    setOpen(true);
    onFocus?.();
  };

  const handleBlur = () => {
    // Delay closing so a click on an item can fire first
    blurTimeout.current = setTimeout(() => {
      setOpen(false);
      setActiveIndex(-1);
      onBlur?.();
    }, 150);
  };

  const select = useCallback(
    (item: string) => {
      onChange(item);
      setOpen(false);
      setActiveIndex(-1);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      select(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  // Scroll the active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeout.current) clearTimeout(blurTimeout.current);
    };
  }, []);

  const showDropdown = open && filtered.length > 0;

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {showDropdown && (
        <ul
          ref={listRef}
          className="absolute left-0 right-0 top-full z-10 mt-0.5 max-h-40 overflow-y-auto rounded border border-gray-200 bg-white shadow-md"
        >
          {filtered.map((item, i) => (
            <li
              key={item}
              onMouseDown={() => select(item)}
              className={`cursor-pointer px-2 py-1 text-sm font-mono ${
                i === activeIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
