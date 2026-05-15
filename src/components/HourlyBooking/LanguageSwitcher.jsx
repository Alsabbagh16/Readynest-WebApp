import React from 'react';
import { cn } from '@/lib/utils';

const LanguageSwitcher = ({ language, onChange, t }) => {
  const options = [
    { value: 'en', label: t('switcher.english') },
    { value: 'ar', label: t('switcher.arabic') },
  ];

  return (
    <div className="inline-flex items-center rounded-full border border-border bg-background p-1 shadow-sm">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
            language === option.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-pressed={language === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
