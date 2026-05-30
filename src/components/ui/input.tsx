import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
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
      <input
        id={id}
        className={`w-full px-4 py-2.5 rounded-lg border bg-slate-950/60 border-slate-800 text-slate-100 placeholder-slate-500 transition-all duration-300 outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 focus:shadow-[0_0_15px_rgba(20,184,166,0.15)] [color-scheme:dark] ${
          error ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/20' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs font-medium text-red-400">
          {error}
        </span>
      )}
    </div>
  );
};
