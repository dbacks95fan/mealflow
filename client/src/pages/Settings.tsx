// ABOUTME: Household settings — rename the household, connect / disconnect a
// ABOUTME: Fry's account, and choose a home Fry's store.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  disconnectFrys,
  findFrysLocations,
  getFrysAuthorizeUrl,
  getFrysStatus,
  getHousehold,
  renameHousehold,
  setFrysLocation,
  type FrysLocation,
  type FrysStatus,
} from "../lib/api";
import { useHousehold } from "../lib/useHousehold";

export function Settings() {
  const household = useHousehold();
  const [params] = useSearchParams();
  const frysParam = params.get("frys");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<FrysStatus | null>(null);
  const [zip, setZip] = useState("");
  const [locations, setLocations] = useState<FrysLocation[]>([]);
  const [error, setError] = useState<string | null>(
    frysParam === "error" ? "Fry’s connection failed. Please try again." : null,
  );
  const [notice, setNotice] = useState<string | null>(
    frysParam === "connected" ? "Fry’s account connected." : null,
  );

  const loadStatus = useCallback(() => {
    getFrysStatus().then(setStatus).catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    getHousehold()
      .then((h) => setName(h.name))
      .catch((err: Error) => setError(err.message));
    loadStatus();
  }, [loadStatus]);

  async function saveName(event: FormEvent) {
    event.preventDefault();
    try {
      const updated = await renameHousehold(name.trim());
      setName(updated.name);
      household?.setName(updated.name);
      setNotice("Household name saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function connect() {
    try {
      const { url } = await getFrysAuthorizeUrl();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start the Fry's connection");
    }
  }

  async function disconnect() {
    try {
      await disconnectFrys();
      loadStatus();
      setNotice("Fry's account disconnected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    }
  }

  async function searchStores(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      setLocations(await findFrysLocations(zip.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Store search failed");
    }
  }

  async function chooseStore(location: FrysLocation) {
    try {
      await setFrysLocation(location.locationId, location.name);
      loadStatus();
      setNotice(`Home store set to ${location.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set the store");
    }
  }

  return (
    <div className="stack">
      <h2>Settings</h2>
      {notice && <p className="notice">{notice}</p>}
      {error && <p role="alert">{error}</p>}

      <form onSubmit={saveName} className="stack">
        <label>
          Household name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button type="submit">Save name</button>
      </form>

      <section className="stack">
        <h3>Fry’s account</h3>
        {!status ? (
          <p>Loading…</p>
        ) : !status.configured ? (
          <p className="muted">Fry’s integration isn’t set up on this server.</p>
        ) : status.connected ? (
          <>
            <p>
              Connected{status.connectedAt ? ` since ${new Date(status.connectedAt).toLocaleDateString()}` : ""}.
              {status.locationName ? ` Home store: ${status.locationName}.` : " No home store chosen yet."}
            </p>
            <button type="button" onClick={disconnect}>
              Disconnect Fry’s
            </button>

            <form onSubmit={searchStores} className="toolbar">
              <input
                aria-label="ZIP code"
                placeholder="ZIP code"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
              />
              <button type="submit">Find stores</button>
            </form>
            {locations.length > 0 && (
              <ul className="card-list">
                {locations.map((loc) => (
                  <li key={loc.locationId} className="card">
                    <div className="toolbar">
                      <span>
                        <strong>{loc.name}</strong>
                        <br />
                        <span className="muted">{loc.address}</span>
                      </span>
                      <button
                        type="button"
                        aria-pressed={status.locationId === loc.locationId}
                        onClick={() => chooseStore(loc)}
                      >
                        {status.locationId === loc.locationId ? "Home store ✓" : "Use this store"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <p className="muted">
              Connect a Fry’s account so MealFlow can add groceries to its cart. Your Fry’s password is
              never seen or stored.
            </p>
            <button type="button" onClick={connect}>
              Connect Fry’s
            </button>
          </>
        )}
      </section>
    </div>
  );
}
