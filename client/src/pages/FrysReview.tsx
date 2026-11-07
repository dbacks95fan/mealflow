// ABOUTME: Review the Fry's product match for each grocery-list item — change a
// ABOUTME: brand (which is remembered), adjust quantity, see the running total,
// ABOUTME: then add everything to the Fry's cart.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getFrysMatch,
  saveFrysMatch,
  submitFrysCart,
  type FrysCartResult,
  type FrysMatchLine,
} from "../lib/api";
import { StepBar } from "../components/StepBar";
import { formatAmounts } from "../lib/format";

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function FrysReview() {
  const [lines, setLines] = useState<FrysMatchLine[] | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
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

      <ul className="card-list">
        {lines.map((line) => (
          <li key={line.normalizedName} className="card">
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
                <label className="inline-field">
                  Quantity
                  <input
                    type="number"
                    min={1}
                    value={quantities[line.normalizedName] ?? line.neededQuantity}
                    onChange={(e) =>
                      setQuantities((q) => ({
                        ...q,
                        [line.normalizedName]: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                  />
                </label>
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
