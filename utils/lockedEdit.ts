import React from 'react';

export const createLockedCaptureHandler = (
  readOnly: boolean,
  onBlockedEdit?: () => void
) => {
  return (e: React.MouseEvent) => {
    if (!readOnly) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-nav-action]')) return;

    const interactive = target.closest(
      'input, select, textarea, label, button, [data-editable]'
    );
    if (!interactive) return;

    e.preventDefault();
    e.stopPropagation();
    onBlockedEdit?.();
  };
};

export const lockedInputClass = (readOnly: boolean, base: string) =>
  readOnly ? `${base} opacity-60 cursor-default` : base;
