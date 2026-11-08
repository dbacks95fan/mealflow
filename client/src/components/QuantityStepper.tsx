// ABOUTME: Shared minus/value/plus quantity control (INT-MF-0002). Buttons meet
// ABOUTME: the 44px touch target; the value is announced through an <output>.

type Props = {
  /** What is being counted, used in the button labels ("Chicken breast"). */
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
};

export function QuantityStepper({ label, value, onChange, min = 1, max = 99, disabled = false }: Props) {
  const atMin = value <= min;
  const atMax = value >= max;
  return (
    <span className="stepper" role="group" aria-label={`${label} quantity`}>
      <button
        type="button"
        aria-label={`Decrease ${label} quantity`}
        disabled={disabled || atMin}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
      </button>
      <output aria-live="polite">{value}</output>
      <button
        type="button"
        aria-label={`Increase ${label} quantity`}
        disabled={disabled || atMax}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </span>
  );
}
