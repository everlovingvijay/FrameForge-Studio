import React from 'react';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actions,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#23262E]">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight text-[#F3F4F6]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] text-[#8E95A5] mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
