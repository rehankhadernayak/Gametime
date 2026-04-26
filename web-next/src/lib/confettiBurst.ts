import confetti from "canvas-confetti";

/** Gold / yellow burst for rewards and quest-approved moments (child hub). */
export function fireGoldConfettiBurst(opts?: { scalar?: number }) {
  const scalar = opts?.scalar ?? 1;
  const count = Math.floor(120 * scalar);
  const defaults = {
    origin: { y: 0.65, x: 0.5 },
    spread: 72,
    startVelocity: 38,
    ticks: 220,
    gravity: 1.05,
    scalar,
    colors: ["#FFD700", "#FFEC8B", "#FFC107", "#FFF8DC", "#F59E0B", "#FBBF24"],
  };
  void confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.55),
    angle: 55,
  });
  void confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.45),
    angle: 125,
  });
}
