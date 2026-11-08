// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: Shows how a Fry's item's quantity relates to the recipe (INT-MF-0004):
// ABOUTME: the suggested pack count and its math, a manual review box, or the
// ABOUTME: Reviewed state once the household has set the quantity. Each state
// ABOUTME: pairs its color with text and an icon.
import type { PackFit } from "../lib/api";
import { Icon } from "./Icon";

const SET_IT_YOURSELF = / Set the quantity yourself\.$/;

interface Props {
  fit: PackFit;
  quantity: number;
  reviewed: boolean;
  onUseSuggestion: () => void;
}

export function PackFitNote({ fit, quantity, reviewed, onUseSuggestion }: Props) {
  if (fit.status === "suggested") {
    const changed = quantity !== fit.packs;
    return (
      <div className="pack-fit">
        <p className="fit-suggested">
          <Icon name="check" size={16} strokeWidth={2.6} />
          Suggested {fit.packs} pack{fit.packs === 1 ? "" : "s"}
        </p>
        <p className="muted">
          {fit.needed} needed ÷ {fit.perPack} per pack, rounded up.
        </p>
        {changed && (
          <p className="muted">
            Changed from the suggested {fit.packs}.{" "}
            <button type="button" className="link-button" onClick={onUseSuggestion}>
              Use suggestion
            </button>
          </p>
        )}
      </div>
    );
  }

  if (reviewed) {
    return (
      <div className="notice reviewed" role="note">
        <Icon name="check" size={18} strokeWidth={2.6} />
        <p>
          <strong>Reviewed.</strong> You set this quantity. {fit.reason.replace(SET_IT_YOURSELF, "")}
        </p>
      </div>
    );
  }

  return (
    <div className="notice review" role="note">
      <Icon name="alert" size={18} />
      <p>
        <strong>Manual review.</strong> {fit.reason}
      </p>
    </div>
  );
}
