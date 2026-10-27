// The answer quartet. Color is never the only signal: every answer carries its shape and its letter.

export const ANSWER_STYLES = [
  {
    name: "Triangle",
    tile: "bg-lava text-white",
    ring: "ring-lava",
    bar: "bg-lava",
  },
  {
    name: "Diamond",
    tile: "bg-blue text-white",
    ring: "ring-blue",
    bar: "bg-blue",
  },
  {
    name: "Circle",
    tile: "bg-gold text-navy",
    ring: "ring-gold",
    bar: "bg-gold",
  },
  {
    name: "Square",
    tile: "bg-green-600 text-white",
    ring: "ring-green-600",
    bar: "bg-green-600",
  },
] as const;

const PATHS = [
  <path key="t" d="M12 3.5 21.5 20h-19z" />,
  <path key="d" d="M12 2.5 21.5 12 12 21.5 2.5 12z" />,
  <circle key="c" cx="12" cy="12" r="9.5" />,
  <rect key="s" x="3.5" y="3.5" width="17" height="17" rx="1.5" />,
];

export function Shape({
  index,
  className = "size-6",
}: {
  index: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      {PATHS[index % 4]}
    </svg>
  );
}

/** The brand mark: the four shapes in a 2×2, as a tiny answer grid. */
export function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 32 32">
      <path d="M8 2.5 14 13H2z" fill="var(--color-lava)" />
      <path d="M24 1.5 30 7.5 24 13.5 18 7.5z" fill="var(--color-blue)" />
      <circle cx="8" cy="24" r="6" fill="var(--color-gold)" />
      <rect
        x="18.5"
        y="18.5"
        width="11"
        height="11"
        rx="1.5"
        fill="var(--color-green-600)"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-lg font-bold tracking-[-0.03em] text-navy">
      <Mark className="size-6" />
      PopQuiz
    </span>
  );
}
