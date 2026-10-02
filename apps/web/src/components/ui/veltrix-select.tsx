"use client";

import { Check, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

export type VeltrixSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type VeltrixSelectProps = {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  onValueChange: (value: string) => void;
  options: readonly VeltrixSelectOption[];
  size?: "sm" | "md";
  value: string;
};

type MenuPosition = {
  bottom?: number;
  left: number;
  maxHeight: number;
  placement: "bottom" | "top";
  top?: number;
  width: number;
};

const VIEWPORT_MARGIN = 12;
const MENU_GAP = 8;
const MENU_MAX_HEIGHT = 320;
const MENU_MIN_WIDTH = 208;

function nextEnabledIndex(options: readonly VeltrixSelectOption[], start: number, direction: 1 | -1) {
  if (options.length === 0) return -1;
  let index = start;
  for (let step = 0; step < options.length; step += 1) {
    index = (index + direction + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

function firstEnabledIndex(options: readonly VeltrixSelectOption[]) {
  return options.findIndex((option) => !option.disabled);
}

export function VeltrixSelect({ ariaLabel, className = "", disabled = false, error = false, onValueChange, options, size = "md", value }: VeltrixSelectProps) {
  const selectId = useId().replace(/:/g, "");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const selectedIndex = useMemo(() => options.findIndex((option) => option.value === value && !option.disabled), [options, value]);
  const selectedOption = options.find((option) => option.value === value);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const estimatedHeight = Math.min(MENU_MAX_HEIGHT, Math.max(64, options.length * 44 + 8));
    const availableBelow = window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN;
    const availableAbove = rect.top - MENU_GAP - VIEWPORT_MARGIN;
    const placement = availableBelow < estimatedHeight && availableAbove > availableBelow ? "top" : "bottom";
    const availableSpace = placement === "top" ? availableAbove : availableBelow;
    const width = Math.min(Math.max(rect.width, MENU_MIN_WIDTH), window.innerWidth - VIEWPORT_MARGIN * 2);
    const left = Math.min(Math.max(VIEWPORT_MARGIN, rect.left), window.innerWidth - width - VIEWPORT_MARGIN);
    const nextPosition: MenuPosition = {
      left,
      maxHeight: Math.max(64, Math.min(MENU_MAX_HEIGHT, availableSpace)),
      placement,
      width,
    };
    if (placement === "top") nextPosition.bottom = window.innerHeight - rect.top + MENU_GAP;
    else nextPosition.top = rect.bottom + MENU_GAP;
    setPosition(nextPosition);
  }, [options.length]);

  useEffect(() => {
    if (!open) return;

    const animationFrame = window.requestAnimationFrame(updatePosition);
    const handleViewportChange = () => window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    function handleOutsidePointer(event: globalThis.PointerEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    }

    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [open]);

  function openMenu() {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex(options));
    setOpen(true);
  }

  function closeMenu(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function chooseOption(option: VeltrixSelectOption) {
    if (disabled || option.disabled) return;
    onValueChange(option.value);
    closeMenu(true);
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "Tab") {
      closeMenu();
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        closeMenu(true);
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      setActiveIndex((current) => nextEnabledIndex(options, current >= 0 ? current : firstEnabledIndex(options), event.key === "ArrowDown" ? 1 : -1));
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (!open) openMenu();
      else setActiveIndex(event.key === "Home" ? firstEnabledIndex(options) : [...options].map((option, index) => ({ option, index })).reverse().find(({ option }) => !option.disabled)?.index ?? -1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      const activeOption = activeIndex >= 0 ? options[activeIndex] : undefined;
      if (activeOption) chooseOption(activeOption);
    }
  }

  const menuStyle: CSSProperties | undefined = position ? {
    left: position.left,
    maxHeight: position.maxHeight,
    top: position.top,
    bottom: position.bottom,
    width: position.width,
  } : undefined;
  const activeOptionId = activeIndex >= 0 ? `${selectId}-option-${activeIndex}` : undefined;
  const menu = open && position ? (
    <div aria-label={ariaLabel} className="veltrix-select-menu" data-open="true" data-placement={position.placement} id={`${selectId}-menu`} ref={menuRef} role="listbox" style={menuStyle}>
      {options.length > 0 ? options.map((option, index) => {
        const selected = option.value === value;
        const active = index === activeIndex;
        return <div aria-disabled={option.disabled || undefined} aria-selected={selected} className={`veltrix-select-option${selected ? " is-selected" : ""}${active ? " is-active" : ""}${option.disabled ? " is-disabled" : ""}`} id={`${selectId}-option-${index}`} key={option.value} onClick={() => chooseOption(option)} onMouseDown={(event) => event.preventDefault()} onPointerEnter={() => !option.disabled && setActiveIndex(index)} role="option">
          <span>{option.label}</span>
          {selected ? <Check aria-hidden="true" size={15} strokeWidth={2.2} /> : null}
        </div>;
      }) : <p className="veltrix-select-empty">No options available</p>}
    </div>
  ) : null;

  return <div className={`veltrix-select veltrix-select--${size} ${className}`} data-disabled={disabled || undefined} data-error={error || undefined} data-open={open || undefined}>
    <button aria-activedescendant={open ? activeOptionId : undefined} aria-controls={`${selectId}-menu`} aria-expanded={open} aria-haspopup="listbox" aria-label={ariaLabel} className="veltrix-select-trigger focus-ring" disabled={disabled} onClick={() => open ? closeMenu() : openMenu()} onKeyDown={handleTriggerKeyDown} ref={triggerRef} role="combobox" type="button">
      <span className="veltrix-select-trigger-label">{selectedOption?.label ?? ""}</span>
      <ChevronDown aria-hidden="true" className="veltrix-select-chevron" size={size === "sm" ? 14 : 16} strokeWidth={1.8} />
    </button>
    {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
  </div>;
}
