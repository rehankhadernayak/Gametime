"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { GTGlassModal } from "@/components/ui/GTGlassModal";
import { GTButton } from "@/components/ui/GTButton";
import { GTInput } from "@/components/ui/GTInput";
import { verifyParentPin, type ParentPinSuccess } from "@/lib/auth/syncWebSession";
import styles from "./ParentPinGate.module.css";

export type ParentPinGateProps = {
  open: boolean;
  onClose: () => void;
  onVerified: (session: ParentPinSuccess) => void | Promise<void>;
  titleId?: string;
};

export function ParentPinGate({ open, onClose, onVerified, titleId: titleIdProp }: ParentPinGateProps) {
  const autoTitleId = useId();
  const titleId = titleIdProp ?? `${autoTitleId}-parent-pin-title`;
  const inputId = `${autoTitleId}-parent-pin`;
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setPin("");
    setError(null);
    setBusy(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open, reset]);

  const handlePinChange = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    setPin(digits);
    setError(null);
  }, []);

  const submit = useCallback(async () => {
    if (pin.length !== 4 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await verifyParentPin(pin);
      await onVerified(session);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPin("");
    } finally {
      setBusy(false);
    }
  }, [busy, onClose, onVerified, pin, reset]);

  return (
    <GTGlassModal open={open} onClose={busy ? () => {} : onClose} titleId={titleId}>
      <div className={styles.body}>
        <h2 id={titleId} className={styles.title}>
          Parent access
        </h2>
        <p className={styles.lead}>Enter the 4-digit parent PIN to return to Mission Control.</p>

        <GTInput
          ref={inputRef}
          id={inputId}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{4}"
          maxLength={4}
          label="Parent PIN"
          value={pin}
          onChange={(e) => handlePinChange(e.target.value)}
          disabled={busy}
          error={error}
          className={styles.field}
          inputClassName={styles.pinInput}
          aria-describedby={`${inputId}-hint`}
        />
        <p id={`${inputId}-hint`} className={styles.hint}>
          Four numbers only. Ask a parent if you do not know this PIN.
        </p>

        <div className={styles.actions}>
          <GTButton type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </GTButton>
          <GTButton type="button" variant="primary" loading={busy} disabled={pin.length !== 4} onClick={() => void submit()}>
            Unlock parent mode
          </GTButton>
        </div>
      </div>
    </GTGlassModal>
  );
}
