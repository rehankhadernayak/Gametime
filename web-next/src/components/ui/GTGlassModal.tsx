"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import styles from "./GTGlassModal.module.css";

export type GTGlassModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Element id for `aria-labelledby` on the dialog surface */
  titleId?: string;
  className?: string;
};

const easeOut = [0, 0, 0.2, 1] as const;

export function GTGlassModal({ open, onClose, children, titleId, className }: GTGlassModalProps) {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onBackdropMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const backdropTransition = { duration: 0.25, ease: easeOut };
  const panelTransition = { duration: 0.3, ease: easeOut };

  const backdropAnim = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: backdropTransition }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: backdropTransition };

  const panelMobile = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: panelTransition,
      }
    : {
        initial: { opacity: 0, y: 48 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 36 },
        transition: panelTransition,
      };

  const panelDesktop = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: panelTransition,
      }
    : {
        initial: { opacity: 0, scale: 0.94 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
        transition: panelTransition,
      };

  const panelAnim = isDesktop ? panelDesktop : panelMobile;

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="gt-glass-modal"
          className={styles.backdrop}
          role="presentation"
          onMouseDown={onBackdropMouseDown}
          {...backdropAnim}
        >
          <motion.div
            className={[styles.panel, className].filter(Boolean).join(" ")}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onMouseDown={(e) => e.stopPropagation()}
            {...panelAnim}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
