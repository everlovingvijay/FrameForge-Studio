import React from 'react';
import { RotateCcw } from 'lucide-react';

export interface StudioSliderControlProps {
  label: string;
  value: number;
  defaultValue?: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  signed?: boolean;
  disabled?: boolean;
  helperText?: string;
  onChange: (value: number) => void;
  onReset?: () => void;
}

export const StudioSliderControl: React.FC<StudioSliderControlProps> = ({
  label,
  value,
  defaultValue,
  min,
  max,
  step = 1,
  unit = '',
  signed = false,
  disabled = false,
  helperText,
  onChange,
  onReset,
}) => {
  const showReset =
    Boolean(onReset) &&
    defaultValue !== undefined &&
    Math.abs(value - defaultValue) > 0.001;

  const formattedValue =
    step < 1
      ? `${value.toFixed(2)}${unit}`
      : `${signed && value > 0 ? `+${value}` : value}${unit}`;

  return (
    <div className={`space-y-1 ${disabled ? 'opacity-45' : ''}`}>
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <div className="min-w-0">
          <span className="text-[#D2D6E0] truncate">{label}</span>
          {helperText && (
            <span className="ml-1.5 text-[10px] text-[#7A8190]">{helperText}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-[11px] text-[#B3BAC8] tabular-nums">
            {formattedValue}
          </span>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              disabled={!showReset || disabled}
              title={`Reset ${label}`}
              className={`p-0.5 rounded transition-colors ${
                showReset && !disabled
                  ? 'text-[#9BA2B0] hover:text-white hover:bg-[#232732]'
                  : 'text-transparent pointer-events-none'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="studio-slider w-full"
      />
    </div>
  );
};
