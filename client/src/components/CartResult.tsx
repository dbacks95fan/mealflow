// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: What happened after adding items to the Fry's cart (INT-MF-0006):
// ABOUTME: how many of the submitted items were added, each failure with Fry's
// ABOUTME: reason, the items that had no match and were never sent, and the
// ABOUTME: added items. It never reads as complete success on a partial result.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { FrysCartResult } from "../lib/api";
import { Icon } from "./Icon";

interface Props {
  result: FrysCartResult;
  /** What was sent, so the added list can show each quantity. */
  submitted: { name: string; quantity: number }[];
  /** Grocery items that had no Fry's product and so were not sent. */
  unmatched: string[];
  onBack: () => void;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function CartResult({ result, submitted, unmatched, onBack }: Props) {
  const [showAdded, setShowAdded] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const complete = result.failed.length === 0 && unmatched.length === 0;
  const quantityOf = new Map(submitted.map((item) => [item.name, item.quantity]));

  // Move focus to the outcome so keyboard and screen reader users land on it.
  useEffect(() => heading.current?.focus(), []);

  return (
    <div className="stack cart-result">
      <div className="cart-result-head" role="status">
        <span className="cart-result-icon">
          <Icon name="cart" size={34} />
        </span>
        <h2 ref={heading} tabIndex={-1}>
          {result.added.length} of {plural(submitted.length, "item")} added to your Fry’s cart
        </h2>
        {!complete && <p>Not everything made it. Here is exactly what happened, so nothing is missed.</p>}
      </div>

      {result.failed.length > 0 && (
        <section className="notice warn" aria-label="Failed items">
          <p className="notice-title">
            <Icon name="alert" size={18} />
            {plural(result.failed.length, "item")} failed
          </p>
          <ul>
            {result.failed.map((f) => (
              <li key={f.name}>
                <strong>{f.name}:</strong> {f.reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      {unmatched.length > 0 && (
        <section className="card" aria-label="Items not sent">
          <p className="notice-title">
            {plural(unmatched.length, "item")} had no Fry’s match
          </p>
          <ul className="plain-list">
            {unmatched.map((name) => (
              <li key={name}>{name}. Add it yourself in the Fry’s app.</li>
            ))}
          </ul>
        </section>
      )}

      {result.added.length > 0 && (
        <section className="card added-items" aria-label="Added items">
          <button
            type="button"
            className="disclosure"
            aria-expanded={showAdded}
            onClick={() => setShowAdded((open) => !open)}
          >
            <span className="fit-suggested">
              <Icon name="check" size={18} strokeWidth={2.6} />
              {plural(result.added.length, "item")} added
            </span>
            <span className="muted">{showAdded ? "Hide" : "Show"}</span>
          </button>
          {showAdded && (
            <ul className="plain-list">
              {result.added.map((name) => (
                <li key={name} className="added-item">
                  <span>{name}</span>
                  {quantityOf.has(name) && <span className="muted">× {quantityOf.get(name)}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="muted">Checkout happens in the Fry’s app or website. MealFlow only fills the cart.</p>

      <div className="button-row">
        <button type="button" onClick={onBack}>
          Back to products
        </button>
        <Link className="button" to="/">
          Done
        </Link>
      </div>
    </div>
  );
}
