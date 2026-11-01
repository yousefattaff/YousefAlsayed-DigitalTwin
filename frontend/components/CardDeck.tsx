'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/useReducedMotion';

export interface CardDeckItem {
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  badgeCode: string;
  gradeLabel?: string;
  chips?: string[];
  renderMedia: (isActive: boolean) => React.ReactNode;
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

const STACK_OFFSETS = [
  { scale: 1, y: 0, x: 0, rotate: 0 },
  { scale: 0.96, y: 12, x: -10, rotate: -2.6 },
  { scale: 0.92, y: 24, x: 12, rotate: 2.8 },
  { scale: 0.88, y: 34, x: -6, rotate: -1.4 },
];

export default function CardDeck({
  items,
  ariaLabel,
}: {
  items: CardDeckItem[];
  ariaLabel: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [flinging, setFlinging] = useState<'left' | 'right' | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const flingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();

  const total = items.length;

  useEffect(() => {
    return () => {
      if (flingTimerRef.current) clearTimeout(flingTimerRef.current);
    };
  }, []);

  const step = useCallback(
    (direction: 'next' | 'prev', flingDir?: 'left' | 'right') => {
      if (total <= 1 || flinging) return;

      if (reducedMotion) {
        setActiveIndex((current) =>
          direction === 'next' ? (current + 1) % total : (current - 1 + total) % total
        );
        setDragOffset({ x: 0, y: 0 });
        return;
      }

      const exitSide = flingDir ?? (direction === 'next' ? 'right' : 'left');
      setFlinging(exitSide);
      setDragOffset({ x: 0, y: 0 });

      if (flingTimerRef.current) clearTimeout(flingTimerRef.current);
      flingTimerRef.current = setTimeout(() => {
        setActiveIndex((current) =>
          direction === 'next' ? (current + 1) % total : (current - 1 + total) % total
        );
        setFlinging(null);
      }, 250);
    },
    [flinging, reducedMotion, total]
  );

  if (total === 0) return null;

  const safeIndex = activeIndex % total;
  const activeItem = items[safeIndex];

  const visibleDepth = Math.min(total, 4);
  const stackIndices: number[] = [];
  for (let d = visibleDepth - 1; d >= 0; d -= 1) {
    stackIndices.push((safeIndex + d) % total);
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (flinging || total <= 1) return;
    if ((event.target as HTMLElement).closest('a, button')) return;
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !pointerStartRef.current) return;
    const dx = event.clientX - pointerStartRef.current.x;
    const dy = (event.clientY - pointerStartRef.current.y) * 0.25;
    setDragOffset({ x: dx, y: dy });
  };

  const handlePointerEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    pointerStartRef.current = null;

    const threshold = 78;
    if (dragOffset.x > threshold) {
      step('next', 'right');
    } else if (dragOffset.x < -threshold) {
      step('prev', 'left');
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const formattedCurrent = String(safeIndex + 1).padStart(2, '0');
  const formattedTotal = String(total).padStart(2, '0');

  return (
    <div
      className="collectible-deck-shell"
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          step('next', 'right');
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          step('prev', 'left');
        }
      }}
    >
      <div className="collectible-deck-stage">
        {stackIndices.map((itemIndex) => {
          const depth = (itemIndex - safeIndex + total) % total;
          const item = items[itemIndex];
          const isTop = depth === 0;
          const preset = STACK_OFFSETS[Math.min(depth, STACK_OFFSETS.length - 1)];

          let transform = `translate3d(${preset.x}px, ${preset.y}px, 0) scale(${preset.scale}) rotate(${preset.rotate}deg)`;
          let opacity = 1;

          if (isTop) {
            if (flinging === 'right') {
              transform = 'translate3d(440px, -28px, 0) scale(0.96) rotate(15deg)';
              opacity = 0;
            } else if (flinging === 'left') {
              transform = 'translate3d(-440px, -28px, 0) scale(0.96) rotate(-15deg)';
              opacity = 0;
            } else if (isDragging || dragOffset.x !== 0) {
              const tilt = Math.max(-14, Math.min(14, dragOffset.x * 0.045));
              transform = `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${tilt}deg)`;
            }
          } else if (flinging) {
            const promoted = STACK_OFFSETS[Math.max(0, depth - 1)];
            transform = `translate3d(${promoted.x}px, ${promoted.y}px, 0) scale(${promoted.scale}) rotate(${promoted.rotate}deg)`;
          }

          return (
            <article
              key={item.id}
              className={`collectible-slab-card${isTop ? ' is-active' : ' is-stacked'}${
                isTop && isDragging ? ' is-dragging' : ''
              }`}
              style={{
                zIndex: 20 - depth,
                transform,
                opacity,
              }}
              aria-hidden={!isTop}
              onPointerDown={isTop ? handlePointerDown : undefined}
              onPointerMove={isTop ? handlePointerMove : undefined}
              onPointerUp={isTop ? handlePointerEnd : undefined}
              onPointerCancel={isTop ? handlePointerEnd : undefined}
            >
              {/* Graded Slab Header Label (inspired by PSA slab header in reference video) */}
              <header className="collectible-slab-header">
                <div className="collectible-slab-header-left">
                  <span className="collectible-slab-eyebrow">{item.eyebrow}</span>
                  <strong className="collectible-slab-issuer">{item.subtitle}</strong>
                </div>
                <div className="collectible-slab-header-right">
                  <span className="collectible-slab-grade">{item.gradeLabel ?? 'VERIFIED'}</span>
                  <span className="collectible-slab-serial">{item.badgeCode}</span>
                </div>
              </header>

              {/* Visual Media Window */}
              <div className="collectible-slab-media">
                {item.renderMedia(isTop)}
                <div className="collectible-slab-holo" aria-hidden="true" />
              </div>

              {/* Card Footer Chips & Quick Hint */}
              <footer className="collectible-slab-footer">
                {item.chips && item.chips.length > 0 ? (
                  <div className="collectible-slab-chips">
                    {item.chips.slice(0, 5).map((chip) => (
                      <span key={chip} className="collectible-slab-chip">
                        {chip}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="collectible-slab-drag-hint">
                    Drag card or use arrows to flip deck
                  </span>
                )}
              </footer>
            </article>
          );
        })}
      </div>

      {/* Bottom Control Stage (matching reference video: [ < ]  TITLE / SUBTITLE / 01 / 12  [ > ]) */}
      <div className="collectible-deck-controls">
        <button
          type="button"
          className="collectible-deck-arrow"
          onClick={() => step('prev', 'left')}
          aria-label="Previous card"
        >
          <span aria-hidden="true">&lt;</span>
        </button>

        <div className="collectible-deck-meta" aria-live="polite">
          <h3 className="collectible-deck-title">{activeItem.title}</h3>
          <p className="collectible-deck-subtitle">{activeItem.subtitle}</p>
          <div className="collectible-deck-counter">
            <span>{formattedCurrent}</span>
            <span className="collectible-deck-counter-sep">/</span>
            <span>{formattedTotal}</span>
          </div>
          {(activeItem.primaryAction || activeItem.secondaryAction) && (
            <div className="collectible-deck-actions">
              {activeItem.primaryAction &&
                (activeItem.primaryAction.href ? (
                  <a
                    href={activeItem.primaryAction.href}
                    target={activeItem.primaryAction.href.startsWith('#') ? undefined : '_blank'}
                    rel="noreferrer"
                    className="collectible-deck-action-btn is-primary"
                  >
                    {activeItem.primaryAction.label}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={activeItem.primaryAction.onClick}
                    className="collectible-deck-action-btn is-primary"
                  >
                    {activeItem.primaryAction.label}
                  </button>
                ))}
              {activeItem.secondaryAction &&
                (activeItem.secondaryAction.href ? (
                  <a
                    href={activeItem.secondaryAction.href}
                    target={activeItem.secondaryAction.href.startsWith('#') ? undefined : '_blank'}
                    rel="noreferrer"
                    className="collectible-deck-action-btn is-secondary"
                  >
                    {activeItem.secondaryAction.label}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={activeItem.secondaryAction.onClick}
                    className="collectible-deck-action-btn is-secondary"
                  >
                    {activeItem.secondaryAction.label}
                  </button>
                ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="collectible-deck-arrow"
          onClick={() => step('next', 'right')}
          aria-label="Next card"
        >
          <span aria-hidden="true">&gt;</span>
        </button>
      </div>
    </div>
  );
}
