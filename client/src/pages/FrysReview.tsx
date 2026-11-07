// ABOUTME: Review the Fry's product match for each grocery-list item — compare
// ABOUTME: products by photo, size, and price and change one (which is
// ABOUTME: remembered), adjust the suggested pack count or set a manual-review
// ABOUTME: quantity, see the running total, then add everything to the Fry's cart.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getFrysMatch,
  getFrysStatus,
  saveFrysMatch,
  submitFrysCart,
  type FittedProduct,
  type FrysCartResult,
  type FrysMatchLine,
} from "../lib/api";
import { CartResult } from "../components/CartResult";
import { FrysItemCard } from "../components/FrysItemCard";
import { Icon } from "../components/Icon";
import { StepBar } from "../components/StepBar";
import { money } from "../lib/format";

function startingQuantity(product: FittedProduct): number {
  return product.fit.status === "suggested" ? product.fit.packs : 1;
}

function PageHeader() {
  return (
    <>
      <div className="page-title">
        <Link to="/groceries" className="back-link" aria-label="Back to grocery list">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h2>Fry’s products</h2>
      </div>
      <StepBar current={3} />
    </>
  );
}

export function FrysReview() {
  const [lines, setLines] = useState<FrysMatchLine[] | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  // Manual-review items whose quantity the household has set.
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  // Items whose product the household changed on this visit.
  const [changed, setChanged] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<FrysCartResult | null>(null);
  const [submitted, setSubmitted] = useState<{ name: string; quantity: number }[]>([]);

  useEffect(() => {
    getFrysMatch()
      .then((match) => {
        setLines(match.lines);
        setQuantities(Object.fromEntries(match.lines.map((l) => [l.normalizedName, l.neededQuantity])));
      })
      .catch((err: Error) => setError(err.message));
    // The store line is a convenience; the match above already failed loudly
    // if no store is set, so a failed status load just hides the line.
    getFrysStatus()
      .then((status) => setStoreName(status.locationName))
      .catch(() => setStoreName(null));
  }, []);

  const total = useMemo(() => {
    if (!lines) return 0;
    return lines.reduce((sum, line) => {
      const price = line.chosen?.price ?? 0;
      return sum + price * (quantities[line.normalizedName] ?? line.neededQuantity);
    }, 0);
  }, [lines, quantities]);

  const needsReview = useMemo(
    () =>
      (lines ?? []).filter(
        (line) => line.chosen?.fit.status === "manual" && !reviewed[line.normalizedName],
      ).length,
    [lines, reviewed],
  );

  if (error) {
    return (
      <div className="stack">
        <PageHeader />
        <p role="alert">{error}</p>
        <p className="muted">
          Check your <Link to="/settings">Fry’s connection and store</Link>, and that you have{" "}
          <Link to="/this-week">recipes selected</Link>.
        </p>
      </div>
    );
  }
  if (!lines) return <p>Matching your grocery list to Fry’s products…</p>;
  if (lines.length === 0) {
    return (
      <div className="stack">
        <PageHeader />
        <p>Nothing to match — your grocery list is empty.</p>
      </div>
    );
  }

  const addable = lines.filter((line) => line.chosen).length;

  async function changeProduct(line: FrysMatchLine, productId: string) {
    const product = line.options.find((o) => o.productId === productId);
    if (!product) return;
    setLines((current) =>
      current!.map((l) => (l.normalizedName === line.normalizedName ? { ...l, chosen: product } : l)),
    );
    // A new product has its own pack size, so the quantity starts over at its
    // suggestion, and a product that can't convert goes back to manual review.
    setQuantities((q) => ({ ...q, [line.normalizedName]: startingQuantity(product) }));
    setReviewed((r) => ({ ...r, [line.normalizedName]: false }));
    setChanged((c) => ({ ...c, [line.normalizedName]: true }));
    try {
      await saveFrysMatch(line.normalizedName, {
        productId: product.productId,
        upc: product.upc,
        brand: product.brand,
        size: product.size,
        description: product.description,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the choice");
    }
  }

  function setQuantity(line: FrysMatchLine, next: number) {
    setQuantities((q) => ({ ...q, [line.normalizedName]: next }));
    if (line.chosen?.fit.status === "manual") {
      setReviewed((r) => ({ ...r, [line.normalizedName]: true }));
    }
  }

  async function addAll() {
    setSubmitting(true);
    setError(null);
    const items = lines!
      .filter((line) => line.chosen)
      .map((line) => ({
        upc: line.chosen!.upc,
        quantity: quantities[line.normalizedName] ?? line.neededQuantity,
        name: line.chosen!.description,
      }));
    try {
      const outcome = await submitFrysCart(items);
      setSubmitted(items.map(({ name, quantity }) => ({ name, quantity })));
      setResult(outcome);
      window.scrollTo?.(0, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add items to the cart");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <CartResult
        result={result}
        submitted={submitted}
        unmatched={lines.filter((line) => !line.chosen).map((line) => line.name)}
        onBack={() => setResult(null)}
      />
    );
  }

  return (
    <div className="stack">
      <PageHeader />

      {storeName && (
        <p className="store-line muted">
          <span className="store-name">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            {storeName}
          </span>
          <Link to="/settings">Change store</Link>
        </p>
      )}

      {needsReview > 0 && (
        <p className="notice review banner">
          <Icon name="alert" size={18} />
          {needsReview} item{needsReview === 1 ? " needs" : "s need"} manual review before you add{" "}
          {needsReview === 1 ? "it" : "them"}.
        </p>
      )}

      <ul className="card-list">
        {lines.map((line) => (
          <FrysItemCard
            key={line.normalizedName}
            line={line}
            quantity={quantities[line.normalizedName] ?? line.neededQuantity}
            reviewed={Boolean(reviewed[line.normalizedName])}
            productChanged={Boolean(changed[line.normalizedName])}
            onQuantity={(next) => setQuantity(line, next)}
            onProduct={(productId) => void changeProduct(line, productId)}
          />
        ))}
      </ul>

      <div className="action-bar">
        <p className="action-total">
          <span>Estimated total</span> <strong>{money(total)}</strong>
        </p>
        <p className="muted">
          Pack counts are rounded up from your recipes. Items marked Manual review start at 1 and change to Reviewed
          once you set the quantity.
        </p>
        <button type="button" className="button" onClick={addAll} disabled={submitting || addable === 0}>
          <Icon name="cart" size={20} />
          {submitting ? "Adding…" : `Add ${addable} item${addable === 1 ? "" : "s"} to Fry’s cart`}
        </button>
      </div>
    </div>
  );
}
