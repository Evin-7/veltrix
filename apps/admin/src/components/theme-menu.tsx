"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useAdminTheme, type AdminTheme } from "./theme-provider";

const options: Array<{ value: AdminTheme; label: string; Icon: typeof Sun }> = [{ value: "system", label: "System", Icon: Monitor }, { value: "light", label: "Light", Icon: Sun }, { value: "dark", label: "Dark", Icon: Moon }];

export function AdminThemeMenu() {
  const { theme, setTheme } = useAdminTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === theme) ?? options[0];
  const Icon = selected.Icon;
  return <div className="relative"><button aria-expanded={open} aria-haspopup="menu" aria-label={`Theme: ${selected.label}`} className="admin-icon-button" onClick={() => setOpen((value) => !value)} type="button"><Icon size={16} /></button>{open ? <div className="admin-theme-menu" role="menu">{options.map(({ value, label, Icon: OptionIcon }) => <button aria-checked={theme === value} className="admin-theme-option" key={value} onClick={() => { setTheme(value); setOpen(false); }} role="menuitemradio" type="button"><OptionIcon size={15} /><span>{label}</span>{theme === value ? <Check className="ml-auto" size={14} /> : null}</button>)}</div> : null}</div>;
}
