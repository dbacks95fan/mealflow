// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: The three-step shopping flow (Plan, List, Fry's cart) shown on This
// ABOUTME: Week, Groceries, and Fry's review. The current step is filled, earlier
// ABOUTME: steps show a check, and every step links back to its screen.
import { Link } from "react-router-dom";
import { Icon } from "./Icon";

export type Step = 1 | 2 | 3;

const steps: { n: Step; label: string; to: string }[] = [
  { n: 1, label: "Plan", to: "/this-week" },
  { n: 2, label: "List", to: "/groceries" },
  { n: 3, label: "Fry’s cart", to: "/frys" },
];

export function StepBar({ current }: { current: Step }) {
  return (
    <nav aria-label="Shopping steps">
      <ol className="step-bar">
        {steps.map((step) => {
          const isCurrent = step.n === current;
          const done = step.n < current;
          return (
            <li key={step.n}>
              <Link
                to={step.to}
                className={isCurrent ? "step current" : done ? "step done" : "step"}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Step ${step.n}: ${step.label}${done ? " (done)" : ""}`}
              >
                {done ? (
                  <Icon name="check" size={18} strokeWidth={2.6} />
                ) : (
                  <span className="step-num">{step.n}</span>
                )}
                {step.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
