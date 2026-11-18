import React, { Children, useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export default function NovaSelect({ children, value, onChange, disabled, id, className = '', darkMode, 'aria-label': label }) {
  const listId = useId();
  const root = useRef(null);
  const activeOption = useRef(null);
  const typed = useRef({ text: '', time: 0 });
  const [open, setOpen] = useState(false);
  const touchingMenu = useRef(false);
  const [above, setAbove] = useState(false);
  const [maxHeight, setMaxHeight] = useState(undefined);
  const menu = useRef(null);
  const [active, setActive] = useState(-1);
  const [localValue, setLocalValue] = useState(undefined);
  const options = Children.toArray(children).map(({ props }) => ({
    label: props.children, value: String(props.value ?? props.children), disabled: props.disabled,
  }));
  const selected = options.findIndex(option => option.value === String(value ?? localValue ?? options[0]?.value));
  const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);

  useEffect(() => {
    if (!open) return;
    const closeOutside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  // Si la liste dépasse malgré tout d'un conteneur défilant, celui-ci défile pour la montrer entière.
  useEffect(() => {
    if (open) menu.current?.scrollIntoView?.({ block: 'nearest' });
  }, [open]);

  useEffect(() => {
    if (!open || !activeOption.current) return;
    const item = activeOption.current;
    const list = item.parentElement;
    if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
    }
  }, [open, active]);

  function show(index = enabled.includes(selected) ? selected : enabled[0]) {
    const rect = root.current.getBoundingClientRect();
    // Zone réellement visible : l'écran, réduit par les conteneurs qui coupent leur contenu
    // (fenêtre modale défilante, carte…). Sinon la liste s'ouvre dans une partie masquée.
    let top = 0, bottom = window.innerHeight;
    for (let el = root.current.parentElement; el && el !== document.body; el = el.parentElement) {
      const style = getComputedStyle(el);
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY + style.overflow)) {
        const box = el.getBoundingClientRect();
        top = Math.max(top, box.top);
        bottom = Math.min(bottom, box.bottom);
      }
    }
    const menuHeight = Math.min(224, options.length * 46 + 10) + 8;
    const spaceBelow = bottom - rect.bottom, spaceAbove = rect.top - top;
    const up = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    setAbove(up);
    // Liste bornée à la place disponible (au moins 3 lignes visibles).
    setMaxHeight(Math.max(140, Math.min(224, (up ? spaceAbove : spaceBelow) - 12)));
    setActive(index ?? -1);
    setOpen(true);
  }

  function choose(index) {
    if (!enabled.includes(index)) return;
    if (value === undefined) setLocalValue(options[index].value);
    onChange?.({ target: { value: options[index].value } });
    root.current.querySelector('button')?.focus();
    setOpen(false);
  }

  function handleKey(event) {
    const { key } = event;
    if (key === 'Tab') { setOpen(false); return; }
    if (key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (open) choose(active);
      else show();
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault();
      if (!open) { show(key === 'End' ? enabled.at(-1) : key === 'Home' ? enabled[0] : undefined); return; }
      const position = enabled.indexOf(active);
      if (key === 'Home') setActive(enabled[0] ?? -1);
      else if (key === 'End') setActive(enabled.at(-1) ?? -1);
      else setActive(enabled[Math.max(0, Math.min(enabled.length - 1, position + (key === 'ArrowDown' ? 1 : -1)))] ?? -1);
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      const normalize = text => text.toLocaleLowerCase('fr').normalize('NFD').replace(/\p{M}/gu, '');
      const query = (now - typed.current.time < 650 ? typed.current.text : '') + normalize(key);
      typed.current = { text: query, time: now };
      const match = enabled.find(index => normalize(Children.toArray(options[index].label).join('')).startsWith(query));
      if (match !== undefined) { event.preventDefault(); if (open) setActive(match); else show(match); }
    }
  }

  return (
    <span ref={root} className="nova-select" data-dark={darkMode || undefined}>
      <button id={id} type="button" role="combobox" aria-expanded={open && !disabled} aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? listId + '-' + active : undefined}
        aria-label={label || (id ? undefined : 'Choisir une option')} disabled={disabled}
        onClick={() => open ? setOpen(false) : show()} onKeyDown={handleKey}
        onBlur={() => { if (!touchingMenu.current) setOpen(false); }}
        className={className + ' nova-select-trigger'}>
        <span className="nova-select-value">{options[selected]?.label ?? 'Choisir…'}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && !disabled && <span id={listId} role="listbox" aria-label={label || 'Options'} ref={menu} style={maxHeight ? { maxHeight } : undefined} className="nova-select-menu" data-above={above}
        onPointerDown={event => { touchingMenu.current = true; if (event.pointerType === 'mouse') event.preventDefault(); }}
        onPointerUp={() => { touchingMenu.current = false; }}
        onPointerCancel={() => { touchingMenu.current = false; }}>
        {options.length ? options.map((option, index) => (
          <span key={index} id={listId + '-' + index} role="option" aria-selected={index === selected} aria-disabled={option.disabled || undefined}
            ref={index === active ? activeOption : null} data-active={index === active}
            onMouseEnter={() => { if (!option.disabled) setActive(index); }} onClick={() => choose(index)}>
            <span>{option.label}</span>{index === selected && <Check size={16} aria-hidden="true" />}
          </span>
        )) : <span className="nova-select-empty">Aucune option disponible.</span>}
      </span>}
    </span>
  );
}
