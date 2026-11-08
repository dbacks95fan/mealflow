// Copyright (c) 2026 DPSystems, LLC.
// ABOUTME: A Fry's product photo, or a labeled placeholder when Fry's has no
// ABOUTME: image or the image fails to load (INT-MF-0005).
import { useState } from "react";

interface Props {
  url: string | null;
  /** What the product is, for the image's alt text. */
  label: string;
  size?: number;
}

export function ProductImage({ url, label, size = 56 }: Props) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };

  if (!url || failed) {
    return (
      <span className="product-image placeholder" style={style} role="img" aria-label={`No photo for ${label}`}>
        <svg width={size / 2} height={size / 2} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="M21 16l-5-5-9 9" />
        </svg>
      </span>
    );
  }

  return (
    <img
      className="product-image"
      src={url}
      alt={label}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
