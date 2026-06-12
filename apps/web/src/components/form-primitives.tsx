import type { ChangeEventHandler, ReactNode } from "react";

type FieldProps = {
  label: string;
  helper?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, helper, error, children }: FieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-[#12263A]">{label}</span>
      {children}
      {error ? <p className="text-xs leading-6 text-[#D14343]">{error}</p> : null}
      {!error && helper ? <p className="text-xs leading-6 text-[#64748B]">{helper}</p> : null}
    </label>
  );
}

type InputProps = {
  name?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  type?: "text" | "number" | "date" | "email" | "password";
  disabled?: boolean;
};

export function Input({ name, placeholder, defaultValue, value, onChange, type = "text", disabled }: InputProps) {
  return (
    <input
      defaultValue={defaultValue}
      value={value}
      onChange={onChange}
      name={name}
      type={type}
      placeholder={placeholder}
      disabled={disabled}
      className="h-[52px] w-full rounded-[14px] border border-[#D8E2EC] bg-[#FAFBFC] px-4 text-sm text-[#12263A] outline-none focus:border-[#1E4F80] focus:ring-2 focus:ring-[#D7E6F5] disabled:cursor-not-allowed disabled:bg-[#F3F6F9] disabled:text-[#7A8A9A]"
    />
  );
}

type SelectOption = string | { label: string; value: string };

type SelectProps = {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  options: SelectOption[];
  disabled?: boolean;
};

export function Select({ name, defaultValue, value, onChange, options, disabled }: SelectProps) {
  return (
    <select
      defaultValue={defaultValue}
      value={value}
      onChange={onChange}
      name={name}
      disabled={disabled}
      className="h-[52px] w-full rounded-[14px] border border-[#D8E2EC] bg-[#FAFBFC] px-4 text-sm text-[#12263A] outline-none focus:border-[#1E4F80] focus:ring-2 focus:ring-[#D7E6F5] disabled:cursor-not-allowed disabled:bg-[#F3F6F9] disabled:text-[#7A8A9A]"
    >
      {options.map((option) => {
        const normalized = typeof option === "string" ? { label: option, value: option } : option;

        return (
          <option key={normalized.value} value={normalized.value}>
            {normalized.label}
          </option>
        );
      })}
    </select>
  );
}

type TextAreaProps = {
  name?: string;
  placeholder?: string;
  rows?: number;
  defaultValue?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
  disabled?: boolean;
};

export function TextArea({
  name,
  placeholder,
  rows = 5,
  defaultValue,
  value,
  onChange,
  disabled,
}: TextAreaProps) {
  return (
    <textarea
      defaultValue={defaultValue}
      value={value}
      onChange={onChange}
      name={name}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-[14px] border border-[#D8E2EC] bg-[#FAFBFC] px-4 py-3 text-sm leading-7 text-[#12263A] outline-none focus:border-[#1E4F80] focus:ring-2 focus:ring-[#D7E6F5] disabled:cursor-not-allowed disabled:bg-[#F3F6F9] disabled:text-[#7A8A9A]"
    />
  );
}
