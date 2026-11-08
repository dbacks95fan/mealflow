// ABOUTME: Minimal fake Kroger API for e2e — token, authorize redirect,
// ABOUTME: product search, product-by-id, locations, and cart add (upc "FAIL"
// ABOUTME: makes that item fail). No dependencies.
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_KROGER_PORT ?? 4010);

function send(res, status, body, headers = {}) {
  const payload = body == null ? "" : JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(payload);
}

// Pack sizes for options a and b, keyed by search-term slug, so e2e specs can
// exercise suggested pack counts and each route to manual review. Any other
// term gets "1 unit", which can't be read and so goes to manual review.
const SIZES = {
  "ground-beef": ["3 lb", "1 lb"],
  "crushed-tomatoes": ["14.5 oz", "28 oz"],
  cheese: ["8 oz", "16 oz"],
  onions: ["3 lb", "2 lb"],
  "mystery-spice": ["family size", "family size"],
};

function slug(term) {
  return term.replace(/\W+/g, "-");
}

function sizeFor(termSlug, idSuffix) {
  const sizes = SIZES[termSlug];
  return sizes ? sizes[idSuffix === "b" ? 1 : 0] : "1 unit";
}

function productFor(term, idSuffix, brand, price) {
  // A term containing "fail" yields an un-addable UPC, to exercise partial failure.
  const upc = /fail/i.test(term) ? "FAIL" : `upc-${slug(term)}-${idSuffix}`;
  return {
    productId: `mock-${slug(term)}-${idSuffix}`,
    upc,
    description: `${brand} ${term}`,
    brand,
    items: [{ price: { regular: price }, size: sizeFor(slug(term), idSuffix) }],
    images: [{ sizes: [{ size: "medium", url: `http://mock/${idSuffix}.jpg` }] }],
  };
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path === "/health") return send(res, 200, { ok: true });

  if (path === "/connect/oauth2/token" && req.method === "POST") {
    return send(res, 200, {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      expires_in: 1800,
    });
  }

  if (path === "/connect/oauth2/authorize") {
    const redirectUri = url.searchParams.get("redirect_uri");
    const state = url.searchParams.get("state") ?? "";
    const back = new URL(redirectUri);
    back.searchParams.set("code", "mock-auth-code");
    back.searchParams.set("state", state);
    res.writeHead(302, { location: back.toString() });
    return res.end();
  }

  if (path === "/products" && req.method === "GET") {
    const term = url.searchParams.get("filter.term") ?? "item";
    return send(res, 200, {
      data: [
        productFor(term, "a", "Brand A", 3.49),
        productFor(term, "b", "Brand B", 4.19),
      ],
    });
  }

  if (path.startsWith("/products/") && req.method === "GET") {
    const id = decodeURIComponent(path.slice("/products/".length));
    // Ids look like "mock-<term slug>-<a|b>".
    const match = id.match(/^mock-(.+)-([ab])$/);
    return send(res, 200, {
      data: [
        {
          productId: id,
          upc: id.replace("mock-", "upc-"),
          description: `Saved ${id}`,
          brand: "Brand A",
          items: [{ price: { regular: 3.49 }, size: match ? sizeFor(match[1], match[2]) : "1 unit" }],
          images: [],
        },
      ],
    });
  }

  if (path === "/locations" && req.method === "GET") {
    return send(res, 200, {
      data: [
        {
          locationId: "70100460",
          name: "Fry's Central",
          address: { addressLine1: "1 Main St", city: "Phoenix", state: "AZ" },
        },
      ],
    });
  }

  if (path === "/cart/add" && req.method === "PUT") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      let items = [];
      try {
        items = JSON.parse(raw).items ?? [];
      } catch {
        return send(res, 400, { error: "bad body" });
      }
      if (items.some((i) => i.upc === "FAIL")) return send(res, 400, { error: "invalid upc" });
      return send(res, 204, null);
    });
    return;
  }

  return send(res, 404, { error: `no mock route for ${req.method} ${path}` });
});

server.listen(PORT, () => {
  console.log(`mock-kroger listening on ${PORT}`);
});
