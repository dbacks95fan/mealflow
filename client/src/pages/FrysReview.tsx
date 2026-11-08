// ABOUTME: Review the Fry's product match for each grocery-list item — change a
// ABOUTME: brand (which is remembered), adjust the suggested pack count or set a
// ABOUTME: manual-review quantity, see the running total, then add everything to
// ABOUTME: the Fry's cart.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getFrysMatch,
  saveFrysMatch,
  submitFrysCart,
  type FittedProduct,
  type FrysCartResult,
  type FrysMatchLine,
} from "../lib/api";
import { Icon } from "../components/Icon";
import { PackFitNote } from "../components/PackFitNote";
import { QuantityStepper } from "../components/QuantityStepper";
import { StepBar } from "../components/StepBar";
import { formatAmounts } from "../lib/format";

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function startingQuantity(product: FittedProduct): number {
  return product.fit.status === "suggested" ? product.fit.packs : 1;
}

export function FrysReview() {
  const [lines, setLines] = useState<FrysMatchLine[] | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  // Manual-review items whose quantity the household has set.
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<FrysCartResult | null>(null);

  useEffect(() => {
    getFrysMatch()
      .then((match) => {
        setLines(match.lines);
        setQuantities(Object.fromEntries(match.lines.map((l) => [l.normalizedName, l.neededQuantity])));
      })
      .catch((err: Error) => setError(err.message));
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
        <h2>Fry’s products</h2>
        <StepBar current={3} />
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
        <h2>Fry’s products</h2>
        <StepBar current={3} />
        <p>Nothing to match — your grocery list is empty.</p>
      </div>
    );
  }

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
      setResult(await submitFrysCart(items));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add items to the cart");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <h2>Fry’s products</h2>
      <StepBar current={3} />

      {result && (
        <div className={result.allSucceeded ? "notice" : "notice warn"} role="status">
          <p>
            {result.added.length} item{result.added.length === 1 ? "" : "s"} added to your Fry’s cart
            {result.failed.length > 0 ? `, ${result.failed.length} failed.` : "."}
          </p>
          {result.failed.length > 0 && (
            <ul>
              {result.failed.map((f) => (
                <li key={f.name}>
                  {f.name}: {f.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
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
          <li
            key={line.normalizedName}
            className={
              line.chosen?.fit.status === "manual" && !reviewed[line.normalizedName] ? "card needs-review" : "card"
            }
          >
            <div className="toolbar">
              <strong>{line.name}</strong>
              <span className="muted">{formatAmounts(line.quantities)}</span>
            </div>

            {line.unmatched ? (
              <p role="alert">No Fry’s product found — add this one manually.</p>
            ) : (
              <>
                <label className="inline-field">
                  Product
                  <select
                    value={line.chosen?.productId ?? ""}
                    onChange={(e) => void changeProduct(line, e.target.value)}
                  >
                    {line.options.map((option) => (
                      <option key={option.productId} value={option.productId}>
                        {[option.brand, option.description, option.size].filter(Boolean).join(" · ")}
                        {option.price != null ? ` — ${money(option.price)}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {line.chosen && (
                  <PackFitNote
                    fit={line.chosen.fit}
                    quantity={quantities[line.normalizedName] ?? line.neededQuantity}
                    reviewed={Boolean(reviewed[line.normalizedName])}
                    onUseSuggestion={() =>
                      line.chosen?.fit.status === "suggested" && setQuantity(line, line.chosen.fit.packs)
                    }
                  />
                )}
                <div className="inline-field">
                  <span>Quantity</span>
                  <QuantityStepper
                    label={line.name}
                    value={quantities[line.normalizedName] ?? line.neededQuantity}
                    onChange={(next) => setQuantity(line, next)}
                  />
                </div>
                {line.remembered && <p className="muted">Remembered from a previous recipe.</p>}
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="action-bar">
        <p>
          <strong>Estimated total: {money(total)}</strong> (prices from Fry’s where available)
        </p>
        <button type="button" className="button" onClick={addAll} disabled={submitting}>
          {submitting ? "Adding…" : "Add to Fry’s"}
        </button>
      </div>
    </div>
  );
}
