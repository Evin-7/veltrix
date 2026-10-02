"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Check, LoaderCircle, Search } from "lucide-react";
import { dispatchAdminToast } from "@/lib/admin-toast";

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

type AdminFieldProps = {
  children: ReactNode;
  className?: string;
  error?: string;
  hint?: string;
  label: string;
  name?: string;
};

export function AdminField({
  children,
  className = "",
  error,
  hint,
  label,
  name,
}: AdminFieldProps) {
  const fieldId = useId().replace(/:/g, "");
  const hintId = `${fieldId}-hint`;
  const child = Children.only(children);
  const childDescribedBy = isValidElement<FieldControlProps>(child)
    ? child.props["aria-describedby"]
    : undefined;
  const describedBy =
    [childDescribedBy, hint ? hintId : ""].filter(Boolean).join(" ") ||
    undefined;
  const controlId = isValidElement<FieldControlProps>(child)
    ? (child.props.id ?? fieldId)
    : fieldId;
  const control = isValidElement<FieldControlProps>(child)
    ? cloneElement(child as ReactElement<FieldControlProps>, {
        id: child.props.id ?? fieldId,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })
    : child;

  return (
    <div
      className={`admin-field ${className}`}
      data-admin-field={name}
      data-invalid={Boolean(error) || undefined}
    >
      <label className="admin-field-label" htmlFor={controlId}>
        {label}
      </label>
      {control}
      {hint ? (
        <p className="admin-field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AdminInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`admin-input ${className}`} />;
}

export function AdminTextarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`admin-input admin-textarea ${className}`}
    />
  );
}

export function AdminSearchInput({
  label,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const fieldId = useId().replace(/:/g, "");
  return (
    <label className={`admin-search ${className}`} htmlFor={fieldId}>
      <Search aria-hidden="true" className="admin-search-icon" size={16} />
      <span className="sr-only">{label}</span>
      <input
        {...props}
        aria-label={label}
        className="admin-input admin-search-input"
        id={fieldId}
        type="search"
      />
    </label>
  );
}

export type AdminButtonVariant =
  "primary" | "secondary" | "danger" | "ghost" | "icon";

type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  size?: "sm" | "md";
  variant?: AdminButtonVariant;
};

export function AdminButton({
  children,
  className = "",
  disabled,
  loading = false,
  loadingText = "Loading…",
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: AdminButtonProps) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      aria-label={loading ? loadingText : props["aria-label"]}
      className={`admin-button admin-button--${variant} admin-button--${size} ${className}`}
      data-loading={loading || undefined}
      disabled={disabled || loading}
      type={type}
    >
      <span aria-hidden={loading || undefined} className="admin-button-label">
        {children}
      </span>
      <span aria-hidden={!loading} className="admin-button-progress">
        <LoaderCircle
          aria-hidden="true"
          className="admin-button-spinner"
          size={15}
        />
        {loadingText}
      </span>
    </button>
  );
}

export function AdminDialogFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`admin-dialog-footer ${className}`}>{children}</div>;
}

export function AdminCheckbox({
  checked,
  className = "",
  disabled,
  label,
  onChange,
  ...props
}: Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "defaultChecked" | "onChange"
> & {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`admin-checkbox ${className}`}
      data-checked={checked || undefined}
      data-disabled={disabled || undefined}
    >
      <input
        {...props}
        checked={checked}
        className="admin-checkbox-input"
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
        type="checkbox"
      />
      <span aria-hidden="true" className="admin-checkbox-mark">
        {checked ? <Check size={13} strokeWidth={2.5} /> : null}
      </span>
      <span className="admin-checkbox-label">{label}</span>
    </label>
  );
}

export type AdminValidationErrors = Record<string, string>;

function validationMessage(
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
) {
  const validity = control.validity;
  if (validity.customError) return control.validationMessage;
  if (validity.valueMissing) return "This field is required.";
  if (validity.typeMismatch)
    return control instanceof HTMLInputElement && control.type === "email"
      ? "Enter a valid email address."
      : "Enter a valid value.";
  if (validity.patternMismatch) return "Use the required format.";
  if (
    validity.tooShort &&
    (control instanceof HTMLInputElement ||
      control instanceof HTMLTextAreaElement)
  )
    return `Enter at least ${control.minLength} characters.`;
  if (
    validity.tooLong &&
    (control instanceof HTMLInputElement ||
      control instanceof HTMLTextAreaElement)
  )
    return `Use no more than ${control.maxLength} characters.`;
  if (validity.rangeUnderflow && control instanceof HTMLInputElement)
    return `Enter a value of at least ${control.min}.`;
  if (validity.rangeOverflow && control instanceof HTMLInputElement)
    return `Enter a value no greater than ${control.max}.`;
  if (validity.stepMismatch || validity.badInput) return "Enter a valid value.";
  return "Check this value and try again.";
}

function findAdminField(form: HTMLFormElement, name: string) {
  return Array.from(
    form.querySelectorAll<HTMLElement>("[data-admin-field]"),
  ).find((field) => field.dataset.adminField === name);
}

function focusFirstInvalidField(
  form: HTMLFormElement,
  errors: AdminValidationErrors,
) {
  const firstInvalidName = Object.keys(errors)[0];
  if (!firstInvalidName) return;
  const field = findAdminField(form, firstInvalidName);
  if (!field) return;

  window.requestAnimationFrame(() => {
    const target =
      field.querySelector<HTMLElement>("[data-admin-focus-target]") ??
      field.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([tabindex="-1"]), textarea, select, button:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? "auto"
      : "smooth";
    field.scrollIntoView({ behavior, block: "center" });
    target?.focus({ preventScroll: true });
  });
}

function announceValidationErrors(
  form: HTMLFormElement,
  errors: AdminValidationErrors,
) {
  const entries = Object.entries(errors);
  if (entries.length !== 1) {
    dispatchAdminToast({
      type: "error",
      title: "Please check the form",
      message: "Please check the highlighted fields.",
    });
    return;
  }

  const [name, message] = entries[0];
  const field = findAdminField(form, name);
  const label = field
    ?.querySelector<HTMLElement>(".admin-field-label")
    ?.textContent?.trim();
  const hint = field
    ?.querySelector<HTMLElement>(".admin-field-hint")
    ?.textContent?.trim();
  const isRequired = message === "This field is required.";
  const titleLabel = label === "Demo RTP" ? "RTP" : label?.toLowerCase();
  const title = label
    ? isRequired
      ? `${label} is required`
      : `Invalid ${titleLabel}`
    : "Please check the form";
  const description =
    message === "Use the required format." && hint ? hint : message;

  dispatchAdminToast({
    type: "error",
    title,
    message: isRequired ? "Enter a value to continue." : description,
  });
}

export function validateAdminForm(
  form: HTMLFormElement,
): AdminValidationErrors {
  const errors: AdminValidationErrors = {};
  for (const control of Array.from(form.elements)) {
    if (!(
      control instanceof HTMLInputElement ||
      control instanceof HTMLTextAreaElement ||
      control instanceof HTMLSelectElement
    ))
      continue;
    if (control.disabled || control.type === "hidden" || control.validity.valid)
      continue;
    const field = control.closest<HTMLElement>("[data-admin-field]");
    const name = field?.dataset.adminField || control.name || control.id;
    if (name && !errors[name]) errors[name] = validationMessage(control);
  }
  return errors;
}

export function useAdminFormValidation() {
  const [errors, setErrors] = useState<AdminValidationErrors>({});
  const formRef = useRef<HTMLFormElement | null>(null);
  const changeHandlerRef = useRef<((event: Event) => void) | null>(null);

  function removeFieldChangeListeners() {
    const form = formRef.current;
    const handler = changeHandlerRef.current;
    if (form && handler) {
      form.removeEventListener("input", handler);
      form.removeEventListener("change", handler);
    }
    formRef.current = null;
    changeHandlerRef.current = null;
  }

  useEffect(
    () => () => {
      const form = formRef.current;
      const handler = changeHandlerRef.current;
      if (!form || !handler) return;
      form.removeEventListener("input", handler);
      form.removeEventListener("change", handler);
    },
    [],
  );

  function validate(
    form: HTMLFormElement,
    extraErrors: AdminValidationErrors = {},
  ) {
    const nativeErrors = validateAdminForm(form);
    const next = { ...nativeErrors, ...extraErrors };
    setErrors(next);
    if (Object.keys(next).length > 0) {
      announceValidationErrors(form, next);
      focusFirstInvalidField(form, next);

      removeFieldChangeListeners();
      const handleFieldChange = (event: Event) => {
        const target = event.target;
        if (!(
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement
        ))
          return;
        const name =
          target.closest<HTMLElement>("[data-admin-field]")?.dataset
            .adminField || target.name;
        if (!name) return;

        queueMicrotask(() => {
          setErrors((current) => {
            if (!current[name]) return current;
            if (!target.validity.valid) return current;
            return { ...current, [name]: "" };
          });
        });
      };
      formRef.current = form;
      changeHandlerRef.current = handleFieldChange;
      form.addEventListener("input", handleFieldChange);
      form.addEventListener("change", handleFieldChange);
    } else {
      removeFieldChangeListeners();
    }
    return Object.keys(next).length === 0;
  }
  function clear() {
    removeFieldChangeListeners();
    setErrors({});
  }
  return { errors, validate, clear, setErrors };
}
