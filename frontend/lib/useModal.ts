'use client';

import { useEffect, useEffectEvent, type RefObject } from 'react';

const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModal(
  containerRef: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
) {
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const container = containerRef.current;
    if (!open || !container) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const background: { element: HTMLElement; inert: boolean }[] = [];

    // Keep the existing DOM in place while making background sections inert.
    let branch: HTMLElement | null = container;
    while (branch?.parentElement && branch !== document.body) {
      for (const sibling of branch.parentElement.children) {
        if (sibling instanceof HTMLElement && sibling !== branch && sibling.getAttribute('role') !== 'presentation') {
          background.push({ element: sibling, inert: sibling.inert });
          sibling.toggleAttribute('inert', true);
        }
      }
      branch = branch.parentElement;
    }
    document.body.style.overflow = 'hidden';

    const controls = () => Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => element.getClientRects().length > 0 && !element.closest('[inert]'));
    const focusFirst = () => (controls()[0] ?? container).focus({ preventScroll: true });
    focusFirst();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) {
        event.preventDefault();
        container.focus();
      } else if (!container.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const handleFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !container.contains(event.target)) focusFirst();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocus);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocus);
      document.body.style.overflow = previousOverflow;
      for (const { element, inert } of background) element.toggleAttribute('inert', inert);
      if (previousFocus?.isConnected && previousFocus.getClientRects().length > 0) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [containerRef, open]);
}
