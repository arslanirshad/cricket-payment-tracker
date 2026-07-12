"use client";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  inputClassName?: string;
};

export function TextFilter({
  id,
  value,
  onChange,
  placeholder = "Type a name…",
  label,
  className = "",
  inputClassName = "",
}: Props) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {label && (
        <label className="text-sm text-[var(--muted)]" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="relative min-w-[12rem] max-w-xs">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-[var(--border)] py-1.5 pl-3 pr-8 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] ${inputClassName || "bg-[var(--surface)]"}`}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear filter"
            className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--row-hover)] hover:text-[var(--ink)]"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
