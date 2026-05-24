import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  className = '',
  id,
  ...props
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className={`w-full px-4 py-2.5 pr-10 rounded-lg border bg-slate-950/60 border-slate-800 text-slate-100 placeholder-slate-500 transition-all duration-300 outline-none appearance-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 focus:shadow-[0_0_15px_rgba(20,184,166,0.15)] ${
            error ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/20' : ''
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-950 text-slate-100">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
      {error && (
        <span className="text-xs font-medium text-red-400">
          {error}
        </span>
      )}
    </div>
  );
};
