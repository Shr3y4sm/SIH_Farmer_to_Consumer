"use client";

import { useEffect, useState } from "react";
import type { ConsumerLocation, EscrowRecord, FarmLot, GeofenceLot, OrderStatus, QuoteInput, QuoteSnapshot, Role } from "@farmit/domain";
import { calculateQuote } from "@farmit/pricing";
import { translations, type Locale } from "@farmit/translations";

type Decision = "accepted" | "declined" | null;
type View = "overview" | "workspace" | "logistics" | "account";
type MarketplaceResponse = { origin: ConsumerLocation; radiusKm: number; lots: GeofenceLot[] };
type ForecastResponse = { variety: string; origin: string; history: { weekLabel: string; bags: number }[]; supplyBags: number; horizon: number; forecast: { weekLabel: string; bags: number; low: number; high: number }[]; method: string; wmaBags: number; trendPerWeek: number; mapePct: number };
type RelayStop = { kind: "farm" | "hub" | "store"; id: string; label: string; loadKg?: number };
type RelayRouteView = { hubId: string; hubLabel: string; pickupStops: RelayStop[]; pickupKm: number; lineHaulKm: number; loadKg: number };
type RelayPlanResponse = { destination: { label: string }; orderCount: number; routes: RelayRouteView[]; totalKm: number; individualKm: number; savedKm: number; savedPercent: number; method: string };
type Account = { name: string; email: string; role: Role };
type ConsumerOrderRequest = { id: string; lotId: string; farmerName: string; consumerName: string; riceKg: number; deliveryNote: string; status: "requested"; createdAt: string };

const demoKey = "farmit-demo-state";
const consumerHub: ConsumerLocation = { id: "hub_jayanagar", label: "Jayanagar, Bengaluru", latitude: 12.9308, longitude: 77.5838 };
const initialLot: FarmLot = { id: "lot_tumkur_01", farmerName: "Shivanna", village: "Huliyurdurga, Tumkur", variety: "Sona Masuri", quantityKg: 680, floorPayoutPerKg: 24.41, harvestDate: "2026-09-02", qualityNote: "Clean grain · 13% moisture · locally harvested", latitude: 12.95, longitude: 76.9 };
const offlineLots: GeofenceLot[] = [
  { ...initialLot, distanceKm: 77.8, withinGeofence: true },
  { id: "lot_tumkur_02", farmerName: "Lakshmamma", village: "Kunigal, Tumkur", variety: "Sona Masuri", quantityKg: 540, floorPayoutPerKg: 24.9, harvestDate: "2026-09-04", qualityNote: "Freshly threshed · sun-dried · single-plot lot", latitude: 13.02, longitude: 77.03, distanceKm: 60.8, withinGeofence: true },
  { id: "lot_blr_01", farmerName: "Prakash", village: "Nelamangala, Bengaluru Rural", variety: "Sona Masuri", quantityKg: 720, floorPayoutPerKg: 24.55, harvestDate: "2026-09-07", qualityNote: "Closest to the city hub · low food miles", latitude: 13.1, longitude: 77.39, distanceKm: 28.2, withinGeofence: true },
];
const draftLotTemplate: Omit<FarmLot, "id"> = { farmerName: "", village: "Huliyurdurga, Tumkur", variety: "Sona Masuri", quantityKg: 500, floorPayoutPerKg: 24.41, harvestDate: "2026-09-15", qualityNote: "Freshly harvested paddy", latitude: 12.95, longitude: 76.9 };
const villageOptions = [
  { village: "Huliyurdurga, Tumkur", latitude: 12.95, longitude: 76.9 },
  { village: "Kunigal, Tumkur", latitude: 13.02, longitude: 77.03 },
  { village: "Gubbi, Tumkur", latitude: 13.36, longitude: 76.94 },
  { village: "Koratagere, Tumkur", latitude: 13.19, longitude: 77.05 },
  { village: "Madhugiri, Tumkur", latitude: 13.66, longitude: 77.21 },
  { village: "Magadi, Ramanagara", latitude: 12.97, longitude: 77.23 },
  { village: "Channapatna, Ramanagara", latitude: 12.65, longitude: 77.21 },
  { village: "Kanakapura, Ramanagara", latitude: 12.55, longitude: 77.21 },
  { village: "Nelamangala, Bengaluru Rural", latitude: 13.1, longitude: 77.39 },
  { village: "Doddaballapur, Bengaluru Rural", latitude: 13.29, longitude: 77.54 },
  { village: "Devanahalli, Bengaluru Rural", latitude: 13.24, longitude: 77.71 },
];
// Deck-aligned operator inputs: milling ₹4/kg, ~₹100 total freight, no packaging/QA line, no GST —
// so the published total lands near the pitch's ₹946 slide (farmer payout stays above the MSP floor).
const initialQuote: QuoteInput = { millingPerKg: 4, packagingQaPerKg: 0, farmToMill: 30, weeklyLineHaul: 40, lastMile: 30, taxRate: 0, expiresInHours: 48 };
const money = (value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Home() {
  const [role, setRole] = useState<Role>("consumer");
  const [locale, setLocale] = useState<Locale>("en");
  const [account, setAccount] = useState<Account | null>(null);
  const [view, setView] = useState<View>("overview");
  const [catalog, setCatalog] = useState<GeofenceLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>(initialLot.id);
  const [draftLot, setDraftLot] = useState<Omit<FarmLot, "id">>(draftLotTemplate);
  const [quoteInput, setQuoteInput] = useState<QuoteInput>(initialQuote);
  const [quote, setQuote] = useState<QuoteSnapshot | null>(null);
  const [decision, setDecision] = useState<Decision>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [escrow, setEscrow] = useState<EscrowRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("");
  const [demand, setDemand] = useState<ForecastResponse | null>(null);
  const [relayPlan, setRelayPlan] = useState<RelayPlanResponse | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [consumerRequest, setConsumerRequest] = useState<ConsumerOrderRequest | null>(null);
  const [requestedRiceKg, setRequestedRiceKg] = useState(20);
  const [deliveryNote, setDeliveryNote] = useState("");
  const copy = translations[locale];

  const selectedLot = catalog.find((item) => item.id === selectedLotId) ?? null;
  const liveQuote = quote && selectedLot && quote.lotId === selectedLot.id ? quote : null;
  const nearbyLots = catalog.filter((item) => item.withinGeofence);
  const outsideCount = catalog.length - nearbyLots.length;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(demoKey);
      if (saved) {
        const state = JSON.parse(saved) as { selectedLotId?: string; quoteInput?: QuoteInput; quote?: QuoteSnapshot | null; decision?: Decision; orderStatus?: OrderStatus | null; escrow?: EscrowRecord | null };
        if (state.selectedLotId) setSelectedLotId(state.selectedLotId);
        if (state.quoteInput) {
          const { platformCharge: _stale, ...saved } = state.quoteInput as QuoteInput & { platformCharge?: number };
          setQuoteInput({ ...initialQuote, ...saved });
        }
        setQuote(state.quote ?? null); setDecision(state.decision ?? null); setOrderStatus(state.orderStatus ?? null); setEscrow(state.escrow ?? null);
      }
    } catch { setNotice("Could not restore the local demo session."); }
    setHydrated(true);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) throw new Error("no session");
        const { user } = (await response.json()) as { user: Account };
        setAccount(user);
        setRole(user.role);
        if (user.role === "farmer") setDraftLot((current) => ({ ...current, farmerName: current.farmerName || user.name }));
      } catch {
        window.location.assign("/login");
      }
    })();
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(demoKey, JSON.stringify({ selectedLotId, quoteInput, quote, decision, orderStatus, escrow }));
  }, [hydrated, selectedLotId, quoteInput, quote, decision, orderStatus, escrow]);

  async function refreshCatalog() {
    try {
      const response = await fetch(`/api/lots?lat=${consumerHub.latitude}&lng=${consumerHub.longitude}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as MarketplaceResponse;
      setCatalog(data.lots);
      setOfflineMode(false);
      return data.lots;
    } catch {
      setCatalog(offlineLots);
      setOfflineMode(true);
      return offlineLots;
    }
  }

  function selectConsumerLot(lotId: string) {
    setSelectedLotId(lotId);
    setQuote(null);
    setDecision(null);
    setOrderStatus(null);
    setEscrow(null);
    setConsumerRequest(null);
  }

  useEffect(() => {
    if (role !== "consumer" || offlineMode || !selectedLotId) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/quote?lotId=${encodeURIComponent(selectedLotId)}`, { cache: "no-store" });
        if (cancelled) return;
        if (!response.ok) {
          setQuote((current) => current?.lotId === selectedLotId ? null : current);
          return;
        }
        setQuote((await response.json()) as QuoteSnapshot);
      } catch {
        if (!cancelled) setNotice("The published offer could not be loaded. Try refreshing the marketplace.");
      }
    })();
    return () => { cancelled = true; };
  }, [role, offlineMode, selectedLotId]);

  useEffect(() => {
    void refreshCatalog();
    void (async () => {
      try {
        const response = await fetch("/api/forecast?horizon=4");
        if (response.ok) setDemand((await response.json()) as ForecastResponse);
      } catch { /* demand outlook is optional in the demo */ }
      try {
        const response = await fetch("/api/routes", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
        if (response.ok) setRelayPlan((await response.json()) as RelayPlanResponse);
      } catch { /* logistics desk is optional in the demo */ }
    })(); /* eslint-disable-line react-hooks/exhaustive-deps */
  }, []);

  async function resetDemo() { localStorage.removeItem(demoKey); setSelectedLotId(initialLot.id); setDraftLot(draftLotTemplate); setQuoteInput(initialQuote); setQuote(null); setDecision(null); setOrderStatus(null); setEscrow(null); setNotice("Demo reset. Start by listing a farmer lot."); setView("workspace"); await refreshCatalog(); }
  async function signOut() { try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* best-effort sign-out */ } localStorage.removeItem(demoKey); window.location.assign("/login"); }

  async function saveLot() {
    if (draftLot.quantityKg < 29.85 || draftLot.floorPayoutPerKg < 24.41) { setNotice("Lot needs at least 29.85 kg and a ₹24.41/kg minimum payout."); return; }
    if (!draftLot.farmerName.trim()) { setNotice("Add the farmer name before listing the lot."); return; }
    setLoading(true); setNotice("");
    try {
      const response = await fetch("/api/lots", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draftLot) });
      const saved = (await response.json()) as FarmLot & { error?: string };
      if (!response.ok) throw new Error(saved.error ?? "The lot could not be listed.");
      await refreshCatalog();
      setSelectedLotId(saved.id);
      setNotice(`Lot listed. ${saved.farmerName}'s harvest is now visible to buyers within the 100 km ring.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "The lot could not be listed. Check the fields and try again."); } finally { setLoading(false); }
  }

  async function generateQuote() {
    if (!selectedLot) { setNotice("Select a farm lot in the marketplace before publishing a snapshot."); return; }
    setLoading(true); setNotice("");
    try {
      const response = await fetch("/api/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...quoteInput, lotId: selectedLot.id }) });
      const nextQuote = (await response.json()) as QuoteSnapshot & { error?: string };
      if (!response.ok) throw new Error(nextQuote.error ?? "Quote could not be generated.");
      setQuote(nextQuote); setDecision(null); setOrderStatus(null);
      setNotice(`Published. ${selectedLot.farmerName}'s lot is priced at ${money(nextQuote.total)} and the snapshot is now fixed for the consumer.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Quote could not be generated. Check the operator inputs and try again."); } finally { setLoading(false); }
  }

  function previewLocalQuote() {
    if (!selectedLot) return;
    setQuote(calculateQuote(selectedLot, initialQuote));
    setDecision(null);
    setOrderStatus(null);
    setEscrow(null);
    setNotice("Local demo preview loaded. Connect the backend for operator-published snapshots and live reservations.");
  }

  async function submitConsumerRequest() {
    if (!selectedLot) return;
    setLoading(true);
    try {
      const response = await fetch("/api/marketplace/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lotId: selectedLot.id, riceKg: requestedRiceKg, deliveryNote }) });
      const result = (await response.json().catch(() => null)) as ConsumerOrderRequest & { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "The request could not be submitted.");
      setConsumerRequest(result as ConsumerOrderRequest);
      setNotice(`Request sent to ${selectedLot.farmerName}. The operator can now prepare a transparent offer.`);
    } catch (error) {
      if (offlineMode) {
        const localRequest: ConsumerOrderRequest = { id: `local_${Date.now()}`, lotId: selectedLot.id, farmerName: selectedLot.farmerName, consumerName: account?.name ?? "Demo consumer", riceKg: requestedRiceKg, deliveryNote, status: "requested", createdAt: new Date().toISOString() };
        setConsumerRequest(localRequest);
        setNotice(`Local demo request sent to ${selectedLot.farmerName}.`);
      } else setNotice(error instanceof Error ? error.message : "The request could not be submitted.");
    } finally { setLoading(false); }
  }

  function localEscrow(snapshot: QuoteSnapshot): EscrowRecord {
    return {
      quoteId: snapshot.id,
      lotId: snapshot.lotId,
      total: snapshot.total,
      status: "held",
      heldAt: new Date().toISOString(),
      dispatchedAt: null,
      releasedAt: null,
      deliveryCode: null,
      split: { farmer: snapshot.paddyPayout, miller: snapshot.milling + snapshot.packagingQa, transporters: snapshot.farmToMill + snapshot.lineHaul + snapshot.lastMile, platform: snapshot.platformCharge, tax: snapshot.tax },
    };
  }

  async function escrowAction(action: "hold" | "dispatch", quoteId: string) {
    const response = await fetch("/api/escrow", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quoteId, action }) });
    const record = (await response.json().catch(() => null)) as (EscrowRecord & { error?: string }) | null;
    if (!response.ok) throw new Error(record?.error ?? "The escrow action could not be completed.");
    setEscrow(record as EscrowRecord);
  }

  async function submitDecision(nextDecision: Exclude<Decision, null>) { if (!liveQuote) return; setLoading(true); try { const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quoteId: liveQuote.id, decision: nextDecision }) }); const result = (await response.json().catch(() => null)) as { error?: string } | null; if (!response.ok) throw new Error(result?.error ?? "That decision could not be saved."); if (nextDecision === "accepted") await escrowAction("hold", liveQuote.id); setDecision(nextDecision); setOrderStatus(nextDecision === "accepted" ? "reserved" : null); setNotice(nextDecision === "accepted" ? "Reservation confirmed. The escrow is holding (simulated) — see the audit ledger." : "Offer declined. The price snapshot remains unchanged."); } catch (error) { if (offlineMode) { setDecision(nextDecision); setOrderStatus(nextDecision === "accepted" ? "reserved" : null); if (nextDecision === "accepted") setEscrow(localEscrow(liveQuote)); setNotice(nextDecision === "accepted" ? "Local demo reservation confirmed. Connect the backend for a live order." : "Offer declined in the local demo."); } else setNotice(error instanceof Error ? error.message : "That decision could not be saved. Try again."); } finally { setLoading(false); } }

  async function advanceDelivery() {
    if (!orderStatus || orderStatus === "delivered") return;
    const next: Record<OrderStatus, OrderStatus> = { reserved: "milling", milling: "in_transit", in_transit: "delivered", delivered: "delivered" };
    const nextStatus = next[orderStatus];
    setLoading(true);
    try {
      if (offlineMode && liveQuote) {
        setOrderStatus(nextStatus);
        if (nextStatus === "in_transit" && escrow) setEscrow({ ...escrow, status: "in_transit", dispatchedAt: new Date().toISOString(), deliveryCode: "FARMIT-OFFLINE" });
        setNotice(nextStatus === "in_transit" ? "Local demo dispatch complete. The offline QR handshake is ready." : `Delivery advanced to ${statusLabel(nextStatus)}.`);
        return;
      }
      const response = await fetch("/api/orders", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ quoteId: liveQuote?.id, status: nextStatus }) });
      if (!response.ok) throw new Error();
      setOrderStatus(nextStatus);
      if (nextStatus === "in_transit" && liveQuote) await escrowAction("dispatch", liveQuote.id);
      setNotice(nextStatus === "in_transit" ? "Dispatched. The doorstep QR is ready — confirm the handoff to release the escrow." : `Delivery advanced to ${statusLabel(nextStatus)}.`);
    } catch { setNotice("Delivery status could not be advanced."); } finally { setLoading(false); }
  }

  async function confirmHandoff() {
    if (!liveQuote || !escrow?.deliveryCode) return;
    setLoading(true);
    try {
      if (offlineMode) {
        setEscrow({ ...escrow, status: "released", releasedAt: new Date().toISOString() });
        setOrderStatus("delivered");
        setNotice("Local demo QR handshake verified. Escrow released (simulated). Connect the backend for live settlement.");
        return;
      }
      const response = await fetch("/api/escrow", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quoteId: liveQuote.id, action: "release", code: escrow.deliveryCode }) });
      const record = (await response.json()) as EscrowRecord & { error?: string };
      if (!response.ok) throw new Error(record.error ?? "The QR handshake failed.");
      setEscrow(record);
      const orderResponse = await fetch("/api/orders", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ quoteId: liveQuote.id, status: "delivered" }) });
      if (!orderResponse.ok) throw new Error("The delivery status could not be updated.");
      setOrderStatus("delivered");
      setNotice("QR handshake verified. Escrow released — farmer, miller, transporters and platform paid (simulated).");
    } catch (error) { setNotice(error instanceof Error ? error.message : "The QR handshake failed."); } finally { setLoading(false); }
  }

  const workspaceLabel = role === "farmer" ? "My harvest" : role === "operator" ? "Weekly runs" : "Marketplace";
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">F</span><span>Farm<span className="brand-accent">It</span></span></div><div className="topbar-actions"><span className="status-dot" /> {account ? `${account.name} · ${account.role}` : "Signed in"} <button className="text-button" onClick={resetDemo}>Reset demo</button><button className="text-button" onClick={signOut}>Sign out</button></div></header>
    <section className="hero"><div className="hero-copy"><span className="eyebrow">MARKETPLACE 01 · TUMKUR → JAYNAGAR</span><h1>Good rice starts<br /><em>with a fair start.</em></h1><p>A working demo marketplace: many farms inside a 100 km sourcing ring, one transparent household order.</p></div><div className="route-illustration" aria-label="Route from Tumkur to Jaynagar"><div className="route-point"><strong>T</strong><span>Tumkur</span></div><div className="route-line"><i /><i /><i /></div><div className="route-point destination"><strong>J</strong><span>Jayanagar</span></div><span className="route-label">one weekly run</span></div></section>
    <div className="workspace"><aside className="sidebar"><div className="profile"><div className="avatar">{role === "farmer" ? "S" : role === "operator" ? "O" : "A"}</div><div><strong>{role === "farmer" ? "Shivanna" : role === "operator" ? "FarmIt team" : "Ananya Rao"}</strong><span>{copy[role]}</span></div></div><nav><button className={`nav-item ${view === "overview" ? "active" : ""}`} onClick={() => setView("overview")}><span>◈</span> Overview</button><button className={`nav-item ${view === "workspace" ? "active" : ""}`} onClick={() => setView("workspace")}><span>□</span> {workspaceLabel}</button>{role === "operator" && <button className={`nav-item ${view === "logistics" ? "active" : ""}`} onClick={() => setView("logistics")}><span>⬡</span> Logistics</button>}<button className={`nav-item ${view === "account" ? "active" : ""}`} onClick={() => setView("account")}><span>◇</span> Account</button></nav><div className="side-note"><span className="tiny-sun">✦</span><strong>Small batch,<br />clear numbers.</strong><p>Saved locally for this demo. Supabase replaces this store when the pilot is connected.</p></div></aside>
      <section className="content"><div className="role-switcher"><button className="language" onClick={() => setLocale(locale === "en" ? "kn" : "en")}>{locale === "en" ? "ಕನ್ನಡ" : "English"}</button></div>
        {view === "logistics" && role === "operator" ? <LogisticsPanel plan={relayPlan} demand={demand} /> : view === "account" ? <AccountPanel role={role} user={account} onReset={resetDemo} onSignOut={signOut} /> : role === "farmer" ? <FarmerPanel draft={draftLot} setDraft={setDraftLot} onSave={saveLot} loading={loading} /> : role === "operator" ? <OperatorPanel lots={nearbyLots} selectedLotId={selectedLotId} onSelectLot={setSelectedLotId} input={quoteInput} setInput={setQuoteInput} onGenerate={generateQuote} loading={loading} quote={quote} demand={demand} onOpenLogistics={() => setView("logistics")} /> : <ConsumerPanel lots={nearbyLots} outsideCount={outsideCount} selectedLotId={selectedLotId} onSelectLot={selectConsumerLot} selectedLot={selectedLot} quote={liveQuote} hasSnapshot={Boolean(quote)} onPreview={offlineMode ? previewLocalQuote : undefined} decision={decision} orderStatus={orderStatus} onDecision={submitDecision} onAdvance={advanceDelivery} onConfirmHandoff={confirmHandoff} loading={loading} copy={copy} demand={demand} escrow={escrow} />}
        {(role === "farmer" || role === "operator") && view === "workspace" && <WorkspaceGuide role={role} locale={locale} />}
        {role === "consumer" && view === "workspace" && <ConsumerOrderComposer lot={selectedLot} riceKg={requestedRiceKg} setRiceKg={setRequestedRiceKg} deliveryNote={deliveryNote} setDeliveryNote={setDeliveryNote} request={consumerRequest} onSubmit={submitConsumerRequest} loading={loading} />}
        {offlineMode && role === "consumer" && selectedLot && !liveQuote && <button className="primary-button" onClick={previewLocalQuote}>Preview local demo price <span>→</span></button>}
        {offlineMode && <div className="notice"><span>◌</span>Local demo data · connect the backend to publish and reserve live orders.</div>}
        {notice && <div className="notice"><span>✓</span>{notice}</div>}
      </section>
    </div><footer><span>FarmIt v1 prototype</span><span>Illustrative demo data · No payment or fulfilment</span><span>Privacy &amp; safety</span></footer>
  </main>;
}

function FarmerPanel({ draft, setDraft, onSave, loading }: { draft: Omit<FarmLot, "id">; setDraft: (lot: Omit<FarmLot, "id">) => void; onSave: () => void; loading: boolean }) {
  return <><PageHeading kicker="01 / YOUR HARVEST" title="List a paddy lot" description="List the harvest so buyers inside the 100 km sourcing ring can find it in the marketplace." /><div className="panel-grid"><div className="card form-card"><div className="card-header"><div><span className="card-label">FARM LOT</span><h2>Sona Masuri paddy</h2></div><span className="pill green">Server catalog</span></div><label>Farmer name<input value={draft.farmerName} onChange={(e) => setDraft({ ...draft, farmerName: e.target.value })} placeholder="e.g. Shivanna" /></label><label>Village / taluk<select value={draft.village} onChange={(e) => { const option = villageOptions.find((item) => item.village === e.target.value); setDraft({ ...draft, village: e.target.value, latitude: option?.latitude ?? draft.latitude, longitude: option?.longitude ?? draft.longitude }); }}>{villageOptions.map((option) => <option key={option.village} value={option.village}>{option.village}</option>)}</select></label><div className="form-row"><label>Available paddy (kg)<input type="number" value={draft.quantityKg} onChange={(e) => setDraft({ ...draft, quantityKg: Number(e.target.value) })} /></label><label>Minimum payout / kg<input type="number" value={draft.floorPayoutPerKg} onChange={(e) => setDraft({ ...draft, floorPayoutPerKg: Number(e.target.value) })} /></label></div><label>Quality note<input value={draft.qualityNote} onChange={(e) => setDraft({ ...draft, qualityNote: e.target.value })} /></label><button className="primary-button" onClick={onSave} disabled={loading}>{loading ? "Listing…" : "List lot in marketplace"} <span>→</span></button></div><div className="insight-card"><span className="eyebrow">YOUR FLOOR, PROTECTED</span><div className="big-number">{money(draft.floorPayoutPerKg)}<small>/kg minimum</small></div><p>FarmIt will not generate an offer below your chosen payout. The current common-paddy MSP reference is <strong>₹24.41/kg</strong>.</p><div className="meter"><span style={{ width: `${Math.min(100, (draft.floorPayoutPerKg / 30) * 100)}%` }} /></div><span className="muted">67% documented raw-rice yield · demo assumption</span></div></div></>;
}

function OperatorPanel({ lots, selectedLotId, onSelectLot, input, setInput, onGenerate, loading, quote, demand, onOpenLogistics }: { lots: GeofenceLot[]; selectedLotId: string; onSelectLot: (lotId: string) => void; input: QuoteInput; setInput: (input: QuoteInput) => void; onGenerate: () => void; loading: boolean; quote: QuoteSnapshot | null; demand: ForecastResponse | null; onOpenLogistics: () => void }) {
  const field = (key: keyof QuoteInput, label: string, suffix = "₹") => { const percent = key === "taxRate"; return <label>{label}<div className="input-with-prefix"><span>{suffix}</span><input type="number" min="0" max={percent ? "100" : undefined} step={percent ? "0.1" : "0.01"} value={percent ? input[key] * 100 : input[key]} onChange={(e) => setInput({ ...input, [key]: Number(e.target.value) / (percent ? 100 : 1) })} /></div></label>; };
  return <><PageHeading kicker="02 / OPERATIONS DESK" title="Build the weekly run" description="Pick a listed farm lot and publish the internal costs. The published snapshot is what the consumer sees." /><div className="operator-layout"><div className="card form-card"><div className="card-header"><div><span className="card-label">ACTIVE RUN · SAT 12 SEP</span><h2>Cost inputs</h2></div><span className={`pill ${quote ? "green" : "amber"}`}>{quote ? "Published" : "Needs quote"}</span></div><label>Lot to price<select value={selectedLotId} onChange={(e) => onSelectLot(e.target.value)}>{lots.map((item) => <option key={item.id} value={item.id}>{item.farmerName} · {item.village} · {item.distanceKm} km</option>)}</select></label><div className="form-row">{field("millingPerKg", "Milling / rice kg")}{field("packagingQaPerKg", "Packaging + QA / rice kg")}</div><div className="form-row">{field("farmToMill", "Farm → mill")}{field("weeklyLineHaul", "Weekly line-haul")}</div><div className="form-row">{field("lastMile", "Jaynagar last mile")}{field("taxRate", "GST rate", "%")}</div><div className="form-row">{field("expiresInHours", "Snapshot valid for", "h")}</div><button className="primary-button" onClick={onGenerate} disabled={loading || !selectedLotId}>{loading ? "Publishing…" : quote && quote.lotId === selectedLotId ? "Publish replacement snapshot" : "Publish fixed snapshot"}<span>→</span></button>{quote && <p className="muted form-footnote">Published total for {lots.find((item) => item.id === quote.lotId)?.farmerName ?? quote.lotId}: <strong>{money(quote.total)}</strong> · expires {new Date(quote.expiresAt).toLocaleString()}</p>}</div><div className="operator-aside"><span className="eyebrow">GUARDRAIL</span><h2>Server-owned pricing</h2><p>Operators enter partner costs. The server looks up the lot, applies yield, the MSP floor payout, the 10% platform fee and GST, then freezes the snapshot and the escrow split.</p><div className="rule"><span>01</span><b>Yield conversion</b><small>20 kg rice needs 29.85 kg paddy at 67% yield.</small></div><div className="rule"><span>02</span><b>MSP floor</b><small>No lot is priced below ₹24.41/kg.</small></div><div className="rule"><span>03</span><b>10% fee + escrow</b><small>FarmIt earns 10% of cost of goods + logistics; the split releases on QR handoff.</small></div></div></div>{demand && <div className="demand-card"><div className="demand-head"><div><span className="eyebrow">DEMAND OUTLOOK · {demand.origin}</span><h2>Weekly 20 kg bag demand</h2></div><span className="pill green">{demand.supplyBags} bags supply nearby</span></div><Sparkline history={demand.history.map((point) => point.bags)} forecast={demand.forecast.map((point) => point.bags)} /><div className="demand-stats"><div><b>~{demand.forecast[0]?.bags ?? "—"}<small> next wk</small></b><span>{demand.forecast[0]?.low}–{demand.forecast[0]?.high} range</span></div><div><b>{demand.trendPerWeek > 0 ? "+" : ""}{demand.trendPerWeek}</b><span>bags/week trend</span></div><div><b>±{demand.mapePct}%</b><span>model error (MAPE)</span></div><div><b>{demand.forecast.reduce((sum, point) => sum + point.bags, 0)}</b><span>bags in 4-week horizon</span></div></div><p className="muted">Method: {demand.method} · deterministic demo history, labelled illustrative. Solid line: observed weeks. Dashed: forecast.</p><button className="text-button" onClick={onOpenLogistics}>Open the logistics desk to plan this week&apos;s relays →</button></div>}</>;
}

function WorkspaceGuide({ role, locale }: { role: "farmer" | "operator"; locale: Locale }) {
  const farmer = role === "farmer";
  const steps = farmer
    ? locale === "kn"
      ? [["1", "ನಿಮ್ಮ ಹೆಸರು ಪರಿಶೀಲಿಸಿ", "ನಿಮ್ಮ ಖಾತೆಯ ಹೆಸರು ಈಗಾಗಲೇ ತುಂಬಲಾಗಿದೆ."], ["2", "ಬೆಳೆ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ", "ಗ್ರಾಮ, ಪ್ರಮಾಣ ಮತ್ತು ಕನಿಷ್ಠ ಪಾವತಿಯನ್ನು ನಮೂದಿಸಿ."], ["3", "ಪಟ್ಟಿ ಮಾಡಿ", "ಕೆಳಗಿನ ಬಟನ್ ಒತ್ತಿ. ಖರೀದಿದಾರರು ನಿಮ್ಮ ಬೆಳೆಯನ್ನು ನೋಡುತ್ತಾರೆ."]]
      : [["1", "Check your name", "Your account name is already filled in."], ["2", "Add harvest details", "Choose your village, quantity and minimum payout."], ["3", "List your harvest", "Press the button below so buyers can find it."]]
    : locale === "kn"
      ? [["1", "ಒಂದು ರೈತನನ್ನು ಆರಿಸಿ", "ಪಟ್ಟಿಯಿಂದ ಬೆಳೆ ಆಯ್ಕೆಮಾಡಿ."], ["2", "ವೆಚ್ಚಗಳನ್ನು ಪರಿಶೀಲಿಸಿ", "ಮಿಲ್ಲಿಂಗ್ ಮತ್ತು ಸಾಗಣೆ ವೆಚ್ಚಗಳನ್ನು ನಮೂದಿಸಿ."], ["3", "ಬೆಲೆ ಪ್ರಕಟಿಸಿ", "ಖರೀದಿದಾರರಿಗೆ ಸ್ಪಷ್ಟವಾದ ಒಟ್ಟು ಬೆಲೆ ಕಾಣಿಸುತ್ತದೆ."]]
      : [["1", "Choose a farmer", "Select a harvest from the list."], ["2", "Check the costs", "Enter milling and transport costs."], ["3", "Publish the price", "The buyer will see one clear total."]];
  return <div className="role-guide"><div><span className="eyebrow">{farmer ? (locale === "kn" ? "ರೈತನಿಗೆ ಸರಳ ಹಂತಗಳು" : "SIMPLE STEPS FOR FARMERS") : (locale === "kn" ? "ನಿರ್ವಾಹಕನಿಗೆ ಸರಳ ಹಂತಗಳು" : "SIMPLE STEPS FOR OPERATORS")}</span><h3>{farmer ? (locale === "kn" ? "ಇಂದು ನಿಮ್ಮ ಕೆಲಸ" : "Your task today") : (locale === "kn" ? "ಈ ವಾರದ ಕೆಲಸ" : "This week’s task")}</h3></div><div className="role-guide-steps">{steps.map(([number, title, detail]) => <div className="role-guide-step" key={number}><span>{number}</span><div><strong>{title}</strong><small>{detail}</small></div></div>)}</div></div>;
}

function ConsumerOrderComposer({ lot, riceKg, setRiceKg, deliveryNote, setDeliveryNote, request, onSubmit, loading }: { lot: GeofenceLot | null; riceKg: number; setRiceKg: (value: number) => void; deliveryNote: string; setDeliveryNote: (value: string) => void; request: ConsumerOrderRequest | null; onSubmit: () => void; loading: boolean }) {
  if (!lot) return null;
  return <div className="card form-card order-composer"><div className="card-header"><div><span className="card-label">START A CONSUMER REQUEST</span><h2>Request from {lot.farmerName}</h2></div><span className={`pill ${request?.lotId === lot.id ? "green" : "amber"}`}>{request?.lotId === lot.id ? "Request sent" : "Choose quantity"}</span></div><p className="muted">Describe what you need. The operator will use this request to publish a fixed, itemized offer.</p><div className="form-row"><label>Rice quantity (kg)<input type="number" min="1" max="100" step="1" value={riceKg} onChange={(event) => setRiceKg(Number(event.target.value))} /></label><label>Delivery preference<input value="Jayanagar · Saturday morning" readOnly /></label></div><label>Order note (optional)<input value={deliveryNote} maxLength={240} onChange={(event) => setDeliveryNote(event.target.value)} placeholder="e.g. Please use a cloth bag; call on arrival" /></label>{request?.lotId === lot.id ? <div className="notice"><span>✓</span>Request #{request.id} is queued for {request.farmerName} · {request.riceKg} kg rice.</div> : <button className="primary-button" onClick={onSubmit} disabled={loading || riceKg < 1 || riceKg > 100}>{loading ? "Sending…" : "Send request to this farm"}<span>→</span></button>}</div>;
}

function ConsumerPanel({ lots, outsideCount, selectedLotId, onSelectLot, selectedLot, quote, hasSnapshot, onPreview, decision, orderStatus, onDecision, onAdvance, onConfirmHandoff, loading, copy, demand, escrow }: { lots: GeofenceLot[]; outsideCount: number; selectedLotId: string; onSelectLot: (lotId: string) => void; selectedLot: GeofenceLot | null; quote: QuoteSnapshot | null; hasSnapshot: boolean; onPreview?: () => void; decision: Decision; orderStatus: OrderStatus | null; onDecision: (decision: Exclude<Decision, null>) => void; onAdvance: () => void; onConfirmHandoff: () => void; loading: boolean; copy: (typeof translations)[Locale]; demand: ForecastResponse | null; escrow: EscrowRecord | null }) {
  const statusIndex = orderStatus ? (["reserved", "milling", "in_transit", "delivered"] as OrderStatus[]).indexOf(orderStatus) : -1;
  return <><PageHeading kicker="03 / MARKETPLACE" title={copy.offer} description={`${copy.chooseFarmer} — every rupee on the receipt is accounted for.`} /><div className="market-bar"><h2>{copy.marketplace}</h2><span>{lots.length} farms {copy.within} · {consumerHub.label}</span></div><div className="market-grid">{lots.map((item) => <button key={item.id} className={`lot-card ${item.id === selectedLotId ? "selected" : ""}`} onClick={() => onSelectLot(item.id)}><span className="distance-badge">{item.distanceKm} km</span><strong>{item.farmerName}</strong><small>{item.village} · harvested {item.harvestDate}</small><small>{item.qualityNote}</small><span className="lot-meta"><span>{item.quantityKg} kg paddy</span><b>₹{item.floorPayoutPerKg.toFixed(2)}/kg floor</b></span></button>)}</div>{outsideCount > 0 && <p className="geofence-note">◈ {outsideCount} lots hidden — outside the 100 km sourcing ring (food-miles guardrail).</p>}{demand && (() => { const next = demand.forecast[0]; if (!next) return null; const tight = next.bags > demand.supplyBags; return <p className={`demand-note ${tight ? "tight" : "ok"}`}>◈ Demand outlook: ~{next.bags} bags expected next week ({next.low}–{next.high}) · {demand.supplyBags} bags of paddy supply within 100 km{tight ? " — reserve early." : " — supply is comfortable."}</p>; })()}<div className="consumer-layout"><div className="offer-card">{quote && selectedLot ? <><div className="offer-top"><div><span className="card-label">SONA MASURI · 20 KG</span><h2>From {selectedLot.farmerName}&apos;s farm</h2><p>{selectedLot.village} · Harvested {selectedLot.harvestDate} · {selectedLot.distanceKm} km away</p></div><div className="rice-stamp">SM<span>20kg</span></div></div><div className="price-line"><span>Your total</span><strong>{money(quote.total)}</strong></div><div className="breakdown"><PriceRow label={`Farmer payout · ${quote.paddyKg} kg paddy`} value={quote.paddyPayout} /><PriceRow label="Milling" value={quote.milling} /><PriceRow label="Packaging + quality check" value={quote.packagingQa} /><PriceRow label="Farm → mill transport" value={quote.farmToMill} /><PriceRow label="Weekly route + last mile" value={quote.lineHaul + quote.lastMile} /><PriceRow label="FarmIt fee · 10%" value={quote.platformCharge} />{quote.tax > 0 && <PriceRow label="GST" value={quote.tax} />}<div className="yield-note">ⓘ 20 kg rice needs {quote.paddyKg} kg paddy at {quote.yieldRate * 100}% documented yield.</div></div><div className="delivery-row"><span className="calendar-icon">▣</span><div><b>Scheduled delivery</b><small>{quote.weeklyRun} · Jaynagar</small></div><span className="pill green">Fixed snapshot</span></div>{decision === "accepted" ? <div className="reserved-box"><strong>Reserved · {statusLabel(orderStatus ?? "reserved")}</strong><span>No payment has been taken. The escrow ledger below tracks every rupee until the doorstep handoff.</span><div className="ledger-box"><div className="ledger-head"><b>Audit ledger · escrow</b><span className={`pill ${escrow?.status === "released" ? "green" : "amber"}`}>{escrowStatusLabel(escrow)}</span></div><div className="ledger-row"><span>Farmer · {selectedLot.farmerName}</span><strong>{money(escrow?.split?.farmer ?? quote.paddyPayout)}</strong></div><div className="ledger-row"><span>Local miller (milling + QA)</span><strong>{money(escrow?.split?.miller ?? quote.milling + quote.packagingQa)}</strong></div><div className="ledger-row"><span>Transporters (relay + line-haul)</span><strong>{money(escrow?.split?.transporters ?? quote.farmToMill + quote.lineHaul + quote.lastMile)}</strong></div><div className="ledger-row"><span>FarmIt platform fee (10%)</span><strong>{money(escrow?.split?.platform ?? quote.platformCharge)}</strong></div>{quote.tax > 0 && <div className="ledger-row"><span>GST</span><strong>{money(escrow?.split?.tax ?? quote.tax)}</strong></div>}<div className="ledger-row total"><span>Escrow total</span><strong>{money(escrow?.total ?? quote.total)}</strong></div></div>{escrow?.status === "in_transit" && escrow.deliveryCode ? <><div className="qr-box"><img src={`/api/escrow/qr?code=${encodeURIComponent(escrow.deliveryCode)}`} alt={`Delivery QR code ${escrow.deliveryCode}`} /><div><strong>Doorstep QR handshake</strong><small>Code: {escrow.deliveryCode}</small><small>Scanning confirms the handoff and releases the escrow split.</small></div></div><button className="primary-button" onClick={onConfirmHandoff} disabled={loading}>{loading ? "Verifying…" : "Simulate courier scan · release escrow"} <span>→</span></button></> : escrow?.status === "released" ? <span>✓ Escrow released — farmer, miller, transporters and platform paid (simulated).</span> : <button className="primary-button" onClick={onAdvance} disabled={loading}>{(orderStatus ?? "reserved") === "delivered" ? "Delivered" : "Advance delivery"} <span>→</span></button>}</div> : decision === "declined" ? <div className="declined-box"><strong>Offer declined</strong><span>The price snapshot remains unchanged for this weekly run.</span></div> : <div className="offer-actions"><button className="primary-button" onClick={() => onDecision("accepted")} disabled={loading}>{copy.reserve}</button><button className="text-button" onClick={() => onDecision("declined")} disabled={loading}>{copy.decline}</button></div>}</> : <div className="empty-offer"><span className="empty-icon">◍</span><h3>{hasSnapshot ? "Snapshot is for another farm" : "No published snapshot yet"}</h3><p>Select a farm above{hasSnapshot ? " to see its published snapshot." : ", then ask the operator to publish this week's fixed price."}</p></div>}</div><div className="timeline-card"><span className="eyebrow">DELIVERY WEEK · SAT</span><h2>How it reaches you</h2><TimelineItem active={statusIndex >= 0} title="Reserved" detail="Snapshot fixed · escrow slot created" /><TimelineItem active={statusIndex >= 1} title="Milling &amp; packing" detail="Local micro-mill · 67% documented yield" /><TimelineItem active={statusIndex >= 2} title="On the road" detail={`Farm relay from ${selectedLot?.village ?? "the farm"} · ${selectedLot ? selectedLot.distanceKm : "—"} km`} /><TimelineItem active={statusIndex >= 3} title="Delivered" detail="Doorstep handoff in Jaynagar" /></div></div></>;
}

function AccountPanel({ role, user, onReset, onSignOut }: { role: Role; user: Account | null; onReset: () => void; onSignOut: () => void }) {
  const name = user?.name ?? (role === "farmer" ? "Shivanna" : role === "operator" ? "FarmIt team" : "Ananya Rao");
  return <><PageHeading kicker="ACCOUNT" title="Your account" description="Signed into the FarmIt prototype. The catalog, quote and escrow stores run server-side and require a valid session." /><div className="card account-card"><div className="profile"><div className="avatar">{name[0].toUpperCase()}</div><div><strong>{name}</strong><span>Signed in as {user?.role ?? role}</span></div></div><div className="account-row"><span>Account</span><strong>{user?.email ?? `${role}@farmit.in`}</strong></div><div className="account-row"><span>Storage</span><strong>Browser local storage</strong></div><div className="account-row"><span>Marketplace</span><strong>Server catalog · 100 km geofence</strong></div><div className="account-row"><span>Payments</span><strong>Disabled in v1</strong></div><button className="text-button" onClick={onReset}>Clear demo session and restart</button><button className="text-button" onClick={onSignOut}>Sign out</button></div></>;
}
function PageHeading({ kicker, title, description }: { kicker: string; title: string; description: string }) { return <div className="page-heading"><span className="eyebrow">{kicker}</span><h2>{title}</h2><p>{description}</p></div>; }
function PriceRow({ label, value }: { label: string; value: number }) { return <div className="price-row"><span>{label}</span><strong>{money(value)}</strong></div>; }
function TimelineItem({ active = false, title, detail }: { active?: boolean; title: string; detail: string }) { return <div className={`timeline-item ${active ? "active" : ""}`}><span className="timeline-dot" /><div><b>{title}</b><small>{detail}</small></div></div>; }
function statusLabel(status: OrderStatus) { return ({ reserved: "Reserved", milling: "Milling & packing", in_transit: "On the road", delivered: "Delivered" })[status]; }
function escrowStatusLabel(escrow: EscrowRecord | null) { if (!escrow) return "Pending"; return ({ held: "Held (simulated)", in_transit: "Held · out for delivery", released: "Released & paid" })[escrow.status]; }

function LogisticsPanel({ plan, demand }: { plan: RelayPlanResponse | null; demand: ForecastResponse | null }) {
  if (!plan) return <><PageHeading kicker="04 / LOGISTICS DESK" title="Consolidated relay routes" description="Route planning could not be loaded. Refresh to try again." /></>;
  return <><PageHeading kicker="04 / LOGISTICS DESK" title="Consolidated relay routes" description="Open orders batched into FPO-hub relays — short farm-gate pickups first, then one bulk line-haul per hub." /><div className="logistics-summary"><div><b>{plan.savedPercent}%</b><span>food-miles saved</span></div><div><b>{plan.totalKm} km</b><span>consolidated plan</span></div><div><b>{plan.individualKm} km</b><span>one-truck-per-farmer baseline</span></div><div><b>{plan.savedKm} km</b><span>saved this run</span></div></div><p className="geofence-note">◈ {plan.orderCount} pickups · destination {plan.destination.label} · method: {plan.method}.</p>{plan.routes.map((route, i) => <div key={`${route.hubId}-${i}`} className="route-card"><div className="demand-head"><div><h3>Relay via {route.hubLabel}</h3><small>{route.loadKg} kg paddy · pickup tour {route.pickupKm} km + line-haul {route.lineHaulKm} km</small></div><span className="pill green">{route.pickupStops.length - 2} farm stops</span></div>{route.pickupStops.map((stop, j) => <div key={`${stop.id}-${j}`} className="stop-row"><span>{stop.kind === "hub" ? "▣" : "•"} {stop.label}</span><strong>{stop.loadKg ? `${stop.loadKg} kg` : stop.kind === "hub" ? "FPO hub" : "dark store"}</strong></div>)}</div>)}{demand && <div className="demand-card"><div className="demand-head"><div><span className="eyebrow">DEMAND OUTLOOK · {demand.origin}</span><h2>Why these volumes</h2></div><span className="pill green">{demand.supplyBags} bags supply nearby</span></div><Sparkline history={demand.history.map((point) => point.bags)} forecast={demand.forecast.map((point) => point.bags)} /><div className="demand-stats"><div><b>~{demand.forecast[0]?.bags ?? "—"}</b><span>bags next week</span></div><div><b>{demand.trendPerWeek > 0 ? "+" : ""}{demand.trendPerWeek}</b><span>bags/week trend</span></div><div><b>±{demand.mapePct}%</b><span>model error (MAPE)</span></div></div><p className="muted">Method: {demand.method} · deterministic demo history, labelled illustrative.</p></div>}</>;
}

function Sparkline({ history, forecast }: { history: number[]; forecast: number[] }) {
  const all = [...history, ...forecast];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const width = 320;
  const height = 64;
  const pad = 5;
  const toPoints = (values: number[], offset: number) => values.map((v, i) => `${(pad + ((offset + i) / (all.length - 1)) * (width - 2 * pad)).toFixed(1)},${(height - pad - ((v - min) / Math.max(max - min, 1)) * (height - 2 * pad)).toFixed(1)}`).join(" ");
  return <svg className="spark" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Weekly demand: observed weeks (solid) and forecast (dashed)"><polyline points={toPoints(history, 0)} fill="none" stroke="#173d37" strokeWidth="2" /><polyline points={toPoints(forecast, history.length - 1)} fill="none" stroke="#dd714e" strokeWidth="2" strokeDasharray="5 4" /></svg>;
}
