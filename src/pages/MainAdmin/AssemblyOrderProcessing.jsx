import { useMemo, useState } from "react";
import axios from "axios";
import { Billing } from "../../Apis/functions";

// ----------------- tiny utils -----------------
const norm = (s) => String(s ?? "").trim();
const nnum = (v, d = 0) => (isNaN(+v) ? d : +v);
const deepClone = (o) => JSON.parse(JSON.stringify(o));
const round2 = (v) => Math.round((+v + Number.EPSILON) * 100) / 100;
const rupeeRound = (v) => Math.round(+v || 0); // Dashboard-style ₹ rounding (no paise)

// Canonical line id
const lineKey = (ln) =>
  norm(
    ln?.item_uuid_v2 ||
      ln?.item_uuid ||
      ln?.IDENTIFIER ||
      ln?.item_code ||
      ln?.ITEM_CODE ||
      ""
  );

// A display key compatible with the summary table’s row.key
const displayKeyFor = (ln) =>
  lineKey(ln) ||
  norm(ln?.item_title || ln?.item_name || ln?.title || ln?.name || "");

// session snapshot helpers (mobile uses this storage key)
const SS_KEY = "orderAssemblySelectedOrders";
const loadFullOrdersFromSession = () => {
  try {
    const raw = sessionStorage.getItem(SS_KEY) || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};
const writeFullOrdersToSession = (merged) => {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify(merged));
  } catch {
    /* ignore */
  }
};

const allDoneOrCancelled = (item_details) =>
  Array.isArray(item_details) &&
  item_details.length > 0 &&
  item_details.every((ln) => {
    const s = +ln?.status;
    return s === 1 || s === 3;
  });

/* ----------------- Robust resolvers ----------------- */
/** parse a trailing "(###)" from any descriptive field */
function parseParenNumber(s) {
  if (!s) return NaN;
  const matches = [...String(s).matchAll(/\((\d+)\)/g)];
  if (!matches.length) return NaN;
  return nnum(matches[matches.length - 1]?.[1], NaN);
}

/** parse "... NN GM*MM KG ..." (tolerant to spaces/case, floats) -> (MM*1000)/NN */
function parseGmKgPattern(s) {
  if (!s) return NaN;
  const txt = String(s).toUpperCase().replace(/\s+/g, " ");
  // Examples: "30 GM*3.6 KG", "27.5 GM*9.24KG", "17 Gm*9.792 Kg", "35 GM*11.76 KG"
  const m = txt.match(/(\d+(?:\.\d+)?)\s*GM\*\s*(\d+(?:\.\d+)?)\s*KG/);
  if (!m) return NaN;
  const gm = parseFloat(m[1]);
  const kg = parseFloat(m[2]);
  if (!isFinite(gm) || !isFinite(kg) || gm <= 0 || kg <= 0) return NaN;
  const pcs = Math.round((kg * 1000) / gm); // pieces = total grams / grams per piece
  return pcs > 0 ? pcs : NaN;
}

/** resolve per-line conversion (boxes→pieces) from fields available in ASSEMBLY payload */
function resolveConversionFromLine(ln) {
  // 1) explicit fields (when present)
  let conv = nnum(ln.conversion ?? ln.one_pack, NaN);
  if (Number.isFinite(conv) && conv > 0) return conv;

  // 2) parse from descriptive names that exist in ASSEMBLY payload
  // dms_item_name carries strings like "(120)" or "30 GM*3.6 KG"
  const nameStr =
    norm(ln?.dms_item_name) ||
    norm(ln?.item_title) ||
    norm(ln?.pronounce) ||
    norm(ln?.title) ||
    "";

  // 2a) "(###)" pattern
  conv = parseParenNumber(nameStr);
  if (Number.isFinite(conv) && conv > 0) return conv;

  // 2b) "NN GM*MM KG" pattern
  conv = parseGmKgPattern(nameStr);
  if (Number.isFinite(conv) && conv > 0) return conv;

  // 3) last resort
  return 1;
}

/** resolve unit price from fields seen in ASSEMBLY payload */
function resolveUnitPriceFromLine(ln) {
  // prefer explicit unit_price, then price, then item_price
  const unit =
    nnum(ln.unit_price, NaN) || nnum(ln.price, NaN) || nnum(ln.item_price, NaN);
  return Number.isFinite(unit) && unit >= 0 ? unit : 0;
}

/** Local parity calc: make sure each line + grand total are correct */
function recalcLineAndGrandTotals(fullDoc) {
  const lines = Array.isArray(fullDoc?.item_details) ? fullDoc.item_details : [];
  let grand = 0;

  for (const ln of lines) {
    // normalize basic fields
    ln.status = nnum(ln.status, 0);
    ln.b = nnum(ln.b, 0);
    ln.p = nnum(ln.p, 0);

    const unit = resolveUnitPriceFromLine(ln);
    const conv = resolveConversionFromLine(ln); // ✅ works with ASSEMBLY payloads

    // sum discount values if present
    let disc = 0;
    if (Array.isArray(ln.charges_discount)) {
      for (const ch of ln.charges_discount) disc += nnum(ch?.value, 0);
    }

    // If cancelled OR qty zero -> hard zero
    const totalPieces = ln.p + ln.b * conv;
    if (ln.status === 3 || totalPieces <= 0) {
      ln.item_total = 0;
    } else {
      // item_total = unit * (p + b * conversion) - discount
      const raw = unit * totalPieces - disc;
      ln.item_total = round2(raw < 0 ? 0 : raw);
    }

    grand += nnum(ln.item_total, 0);
  }

  // write grand total (paise level)
  fullDoc.order_grandtotal = round2(grand);
}

/** Final Dashboard-style rounding (₹) */
function applyDashboardGrandTotalRounding(fullDoc) {
  fullDoc.order_grandtotal = rupeeRound(fullDoc.order_grandtotal);
}

/**
 * Hook encapsulating Order Assembly processing.
 * - Buffers per-item status actions (1=Complete, 2=Hold, 3=Cancel)
 * - On SAVE: rehydrate full order docs from Session Storage
 * - Mutate item_details, run Billing (if available), recalc totals locally
 * - Force Dashboard-style ₹ rounding on grand total
 * - PUT full order docs (mobile-style)
 * - Update page state & Session Storage snapshot
 */
export function useAssemblyProcessing({
  orders,
  setOrders,
  selectedRowMeta, // { key, name, mrp }  // key equals summary row.key
  onQueued, // advance cursor callback
}) {
  // Buffer entries: { order_uuid, key, displayKey, newStatus }
  const [buffer, setBuffer] = useState([]);

  // For row color preview in the “Item Summary” list (keyed by summary row.key)
  const previewStatusByItemKey = useMemo(() => {
    const m = new Map();
    for (const e of buffer) m.set(e.displayKey || e.key, e.newStatus);
    return m;
  }, [buffer]);

  // Queue an action for the currently selected summary row across all visible orders
  const queueActionForSelectedItem = (newStatus) => {
    if (!selectedRowMeta?.key && !selectedRowMeta?.name) {
      alert("Select an item first.");
      return;
    }

    const toQueue = [];
    for (const o of orders) {
      const lines = Array.isArray(o?.item_details) ? o.item_details : [];
      for (const ln of lines) {
        // skip already processed lines (summary also hides these)
        const s = +ln?.status;
        if (s === 1 || s === 2 || s === 3) continue;

        const k = lineKey(ln);
        const dispKey = displayKeyFor(ln);

        // match by ID if available, else by (name + mrp)
        const nm = norm(
          ln?.item_title || ln?.item_name || ln?.title || ln?.name || ""
        );
        const mrp = nnum(ln?.mrp ?? ln?.MRP ?? ln?.price_mrp ?? 0);

        const matchById = selectedRowMeta.key && k && k === selectedRowMeta.key;
        const matchByNameMrp =
          selectedRowMeta.name &&
          nm &&
          nm === selectedRowMeta.name &&
          mrp === +selectedRowMeta.mrp;

        if (matchById || matchByNameMrp) {
          toQueue.push({
            order_uuid: o.order_uuid,
            key: k || selectedRowMeta.key,
            // Force the preview key to the summary row.key so the color always lines up
            displayKey: selectedRowMeta.key || dispKey || k || nm,
            newStatus,
          });
        }
      }
    }

    if (!toQueue.length) {
      alert("No matching lines found for this item.");
      return;
    }

    setBuffer((prev) => {
      const map = new Map(prev.map((e) => [`${e.order_uuid}::${e.key}`, e]));
      for (const e of toQueue) map.set(`${e.order_uuid}::${e.key}`, e);
      return Array.from(map.values());
    });

    if (typeof onQueued === "function") onQueued();
  };

  // SAVE -> exact mobile flow using Session Storage full docs
  const save = async () => {
    if (!buffer.length) {
      alert("No changes to save.");
      return;
    }

    // 1) group edits by order_uuid
    const editsByOrder = new Map();
    const uuids = new Set();
    for (const e of buffer) {
      uuids.add(e.order_uuid);
      const list = editsByOrder.get(e.order_uuid) || [];
      list.push(e);
      editsByOrder.set(e.order_uuid, list);
    }

    // 2) rehydrate full orders from Session Storage (source of truth here)
    const sessionFull = loadFullOrdersFromSession();
    const sessionByUUID = new Map(
      sessionFull.map((o) => [o?.order_uuid, deepClone(o)])
    );

    // 3) apply changes on the full docs
    const changedDocs = [];
    const changedByUUID = new Map();
    const user_uuid = localStorage.getItem("user_uuid") || "UNKNOWN_USER";

    for (const uuid of uuids) {
      const full = sessionByUUID.get(uuid);
      if (!full) continue;

      // Ensure item_details exists (fallback to items if needed)
      if (
        (!Array.isArray(full.item_details) || full.item_details.length === 0) &&
        Array.isArray(full.items) &&
        full.items.length > 0
      ) {
        full.item_details = full.items.map((x) => ({ ...x }));
      }
      if (!Array.isArray(full.item_details) || full.item_details.length === 0)
        continue;

      const edits = editsByOrder.get(uuid) || [];
      let anyChange = false;

      for (const ed of edits) {
        for (const ln of full.item_details) {
          const k = lineKey(ln);
          if (!k) continue;
          if (k === ed.key) {
            if (+ln.status !== +ed.newStatus) {
              ln.status = +ed.newStatus; // 1=done, 2=hold, 3=cancel

              // If CANCEL, force quantity to 0 (both b and p) and total to 0
              if (+ed.newStatus === 3) {
                ln.b = 0;
                ln.p = 0;
                ln.item_total = 0;
              }

              anyChange = true;
            }
          }
        }
      }

      if (!anyChange) continue;

      // opened_by parity with mobile
      if (typeof full.opened_by === "string" && full.opened_by.trim() !== "") {
        const nb = Number(full.opened_by);
        full.opened_by = Number.isFinite(nb) ? nb : 0;
      } else if (full.opened_by == null) {
        full.opened_by = 0;
      }

      // Try project Billing (if present) but don't rely on it for totals
      try {
        if (typeof Billing === "function") Billing(full);
      } catch (e) {
        console.warn("Billing error (continuing):", e);
      }

      // **Authoritative** local recompute for line totals + grand total
      recalcLineAndGrandTotals(full);

      // **Dashboard-style rounding** (₹, no paise)
      applyDashboardGrandTotalRounding(full);

      // Append stage "2" only if every line is 1 or 3
      if (allDoneOrCancelled(full.item_details)) {
        full.status = Array.isArray(full.status) ? full.status.slice() : [];
        full.status.push({ stage: "2", time: Date.now(), user_uuid });
      }

      changedDocs.push(full);
      changedByUUID.set(uuid, full);
    }

    if (!changedDocs.length) {
      alert("Nothing changed.");
      return;
    }

    // 4) PUT the full docs array (mobile-style)
    try {
      await axios.put("/orders/putOrders", changedDocs);

      // 5a) Update page state (reflect new item_details/status + recomputed totals)
      setOrders((prev) =>
        prev.map((o) => {
          const upd = changedByUUID.get(o.order_uuid);
          if (!upd) return o;
          return {
            ...o,
            item_details: Array.isArray(upd.item_details)
              ? upd.item_details.map((x) => ({ ...x }))
              : o.item_details,
            status: Array.isArray(upd.status)
              ? upd.status.map((s) => ({ ...s }))
              : o.status,
            order_grandtotal:
              upd.order_grandtotal ?? o.order_grandtotal ?? o?.order_grandtotal,
          };
        })
      );

      // 5b) Merge back into Session Storage snapshot so reload shows latest
      const merged = sessionFull.map(
        (o) => changedByUUID.get(o.order_uuid) || o
      );
      writeFullOrdersToSession(merged);

      // Clear local buffer
      setBuffer([]);
      alert(`Saved ${changedDocs.length} order(s).`);
    } catch (err) {
      console.error(err);
      alert("Failed to save assembly changes.");
    }
  };

  return {
    queueActionForSelectedItem,
    save,
    pendingCount: buffer.length,
    previewStatusByItemKey,
  };
}
