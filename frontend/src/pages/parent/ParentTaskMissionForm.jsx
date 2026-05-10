import { useState } from 'react';
import { BrutalistButton, BrutalistCard, BrutalistInput, BrutalistTextarea } from '../../components/ui/index.js';

const labelClass =
  'mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black';

/**
 * Stark create/edit task form (1-bit kit). Wire via onDeploy / onAbort from parent routes or modals.
 *
 * @param {object} props
 * @param {{ title?: string, description?: string, rewardAmount?: number }} [props.initialValues]
 * @param {(payload: { title: string, description: string, rewardAmount: number }) => void | Promise<void>} props.onDeploy
 * @param {() => void} [props.onAbort]
 * @param {boolean} [props.submitting]
 * @param {string} [props.error]
 * @param {string} [props.missionLabel] — heading inside the card
 */
export default function ParentTaskMissionForm({
  initialValues = {},
  onDeploy,
  onAbort,
  submitting = false,
  error = '',
  missionLabel = 'New mission',
}) {
  const [title, setTitle] = useState(initialValues.title ?? '');
  const [description, setDescription] = useState(initialValues.description ?? '');
  const [rewardAmount, setRewardAmount] = useState(
    initialValues.rewardAmount != null ? String(initialValues.rewardAmount) : '10'
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const pts = Number(rewardAmount);
    await onDeploy?.({
      title: trimmedTitle,
      description: trimmedDesc,
      rewardAmount: pts,
    });
  }

  return (
    <BrutalistCard className="max-w-lg font-mono shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <header className="mb-8 border-b-4 border-black pb-4">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.35em] text-black">Parent · Ops</p>
        <h2 className="text-xl font-bold uppercase tracking-tight text-black">{missionLabel}</h2>
      </header>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <div>
          <label className={labelClass} htmlFor="parent-mission-title">
            Task name
          </label>
          <BrutalistInput
            id="parent-mission-title"
            name="title"
            autoComplete="off"
            placeholder="e.g. ROOM SWEEP PROTOCOL"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            required
            maxLength={120}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="parent-mission-desc">
            Description
          </label>
          <BrutalistTextarea
            id="parent-mission-desc"
            name="description"
            placeholder="Objective parameters for the child operator."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            required
            maxLength={2000}
            rows={5}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="parent-mission-reward">
            Reward amount <span className="tracking-normal">(+MINS)</span>
          </label>
          <BrutalistInput
            id="parent-mission-reward"
            name="rewardAmount"
            type="number"
            inputMode="numeric"
            min={5}
            max={50}
            step={1}
            value={rewardAmount}
            onChange={(e) => setRewardAmount(e.target.value)}
            disabled={submitting}
            required
          />
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-black/70">
            Reward points (RP). Converts to gaming time per your family rules.
          </p>
        </div>

        {error ? (
          <p className="border-2 border-black bg-black px-3 py-2 text-xs font-bold uppercase tracking-wide text-white" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t-4 border-black pt-6 sm:flex-row sm:items-center sm:justify-between">
          <BrutalistButton type="submit" variant="inverse" className="w-full sm:w-auto sm:min-w-[14rem]" disabled={submitting}>
            {submitting ? 'DEPLOYING…' : 'DEPLOY MISSION'}
          </BrutalistButton>
          {onAbort ? (
            <BrutalistButton type="button" variant="danger" className="w-full sm:w-auto" disabled={submitting} onClick={onAbort}>
              ABORT
            </BrutalistButton>
          ) : null}
        </div>
      </form>
    </BrutalistCard>
  );
}
