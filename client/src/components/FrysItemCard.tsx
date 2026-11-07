// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: One grocery item on the Fry's review screen (INT-MF-0005): the chosen
// ABOUTME: product with its photo, price, and pack-count state, the quantity
// ABOUTME: stepper, and an expandable radio list for comparing other products.
import { useId, useState } from "react";
import type { FittedProduct, FrysMatchLine, PackFit } from "../lib/api";
import { formatAmounts, money } from "../lib/format";
import { Icon } from "./Icon";
import { PackFitNote } from "./PackFitNote";
import { ProductImage } from "./ProductImage";
import { QuantityStepper } from "./QuantityStepper";

function productLabel(p: FittedProduct): string {
  return [p.brand, p.description, p.size].filter(Boolean).join(" · ");
}

function fitLabel(fit: PackFit): string {
  return fit.status === "suggested"
    ? `Suggested ${fit.packs} pack${fit.packs === 1 ? "" : "s"}`
    : "Needs manual review";
}

interface Props {
  line: FrysMatchLine;
  quantity: number;
  reviewed: boolean;
  /** True once the household picked a different product on this visit. */
  productChanged: boolean;
  onQuantity: (next: number) => void;
  onProduct: (productId: string) => void;
}

export function FrysItemCard({ line, quantity, reviewed, productChanged, onQuantity, onProduct }: Props) {
  const [choosing, setChoosing] = useState(false);
  const listId = useId();
  const need = formatAmounts(line.quantities);
  const chosen = line.chosen;
  const needsReview = chosen?.fit.status === "manual" && !reviewed;

  return (
    <li className={needsReview ? "card frys-item needs-review" : "card frys-item"}>
      <div className="frys-item-head">
        <ProductImage url={chosen?.imageUrl ?? null} label={chosen ? productLabel(chosen) : line.name} />
        <div className="frys-item-text">
          <strong>{line.name}</strong>
          {need && <span className="muted">Need {need}</span>}
          {chosen && (
            <>
              <span className="frys-product">
                {chosen.brand && <span className="frys-brand">{chosen.brand}</span>} {chosen.description}
                {chosen.size && <span className="muted"> · {chosen.size}</span>}
              </span>
              <span className="frys-price">
                {chosen.price != null ? (
                  <>
                    {money(chosen.price)}
                    {quantity > 1 && (
                      <span className="muted">
                        {" "}
                        × {quantity} = {money(chosen.price * quantity)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="muted">No price listed</span>
                )}
              </span>
              {line.remembered && !productChanged && <span className="chip">Remembered</span>}
            </>
          )}
        </div>
      </div>

      {line.unmatched || !chosen ? (
        <div className="notice warn" role="note">
          <Icon name="alert" size={18} />
          <p>No Fry’s product found. Add this one in the Fry’s app.</p>
        </div>
      ) : (
        <>
          <PackFitNote
            fit={chosen.fit}
            quantity={quantity}
            reviewed={reviewed}
            onUseSuggestion={() => chosen.fit.status === "suggested" && onQuantity(chosen.fit.packs)}
          />
          <div className="frys-item-controls">
            <span>Quantity</span>
            <QuantityStepper label={line.name} value={quantity} onChange={onQuantity} />
          </div>

          {line.options.length > 1 ? (
            <button
              type="button"
              className="change-product"
              aria-expanded={choosing}
              aria-controls={listId}
              onClick={() => setChoosing((open) => !open)}
            >
              Change product ({line.options.length} options)
            </button>
          ) : (
            <p className="muted">Only one match found.</p>
          )}

          {choosing && (
            <fieldset id={listId} className="product-options">
              <legend>Choose a product for {line.name}</legend>
              {line.options.map((option) => (
                <label key={option.productId} className="product-option">
                  <input
                    type="radio"
                    name={`product-${line.normalizedName}`}
                    value={option.productId}
                    checked={option.productId === chosen.productId}
                    onChange={() => onProduct(option.productId)}
                  />
                  <ProductImage url={option.imageUrl} label={productLabel(option)} size={40} />
                  <span className="product-option-text">
                    <span>{productLabel(option)}</span>
                    <span className={option.fit.status === "suggested" ? "fit-suggested" : "fit-manual"}>
                      {fitLabel(option.fit)}
                    </span>
                  </span>
                  <span className="frys-price">{option.price != null ? money(option.price) : "—"}</span>
                </label>
              ))}
            </fieldset>
          )}
        </>
      )}
    </li>
  );
}
