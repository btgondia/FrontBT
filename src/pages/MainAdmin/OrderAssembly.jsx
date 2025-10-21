// (unchanged from your latest file)
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import axios from "axios";
import { openDB } from "idb";
import ItemSummaryPane from "../../components/ItemSummaryPane";
import "./style.css";
import { useAssemblyProcessing } from "./AssemblyOrderProcessing";

/* ----------------- helpers ----------------- */
const norm = (s) => String(s ?? "").trim();
const nnum = (v, d = 0) => (isNaN(+v) ? d : +v);
const lineItemId = (ln) =>
  String(ln?.item_uuid_v2 || ln?.item_uuid || ln?.item_code || ln?.ITEM_CODE || "");

/* Robust total getter (prevents UI zeroing) */
const getOrderGrand = (o) => {
  const candidates = [
    o?.order_grandtotal,
    o?.grand_total,
    o?.order_grand_total,
    o?.grandTotal,
    o?.total_amount,
  ];
  for (const v of candidates) {
    const n = +v;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
};
const sumOrdersTotal = (orders = []) =>
  orders.reduce((acc, o) => acc + getOrderGrand(o), 0);

const buildItemsIndex = (items = []) => {
  const idx = new Map();
  for (const it of items) {
    const key = it?.item_uuid || it?.ITEM_UUID || it?.uuid || it?.item_code || it?._id;
    if (!key) continue;
    idx.set(String(key), {
      name:
        norm(it.item_title) ||
        norm(it.pronounce) ||
        norm(it.name) ||
        norm(it.title),
      mrp: nnum(it.mrp ?? it.MRP ?? it.price_mrp ?? it.Price_MRP),
      category_uuid: norm(it.category_uuid || it.cat_uuid || ""),
    });
  }
  return idx;
};

const buildCategoryIndex = (cats = []) => {
  const idx = new Map();
  for (const c of cats) {
    const uuid = norm(c.category_uuid || c.uuid || c._id || c.IDENTIFIER || c.id);
    if (!uuid) continue;
    idx.set(uuid, {
      title: norm(c.category_title || c.title || c.name || "Uncategorized"),
      sort_order: typeof c.sort_order === "number" ? c.sort_order : nnum(c.sort_order, 9999),
    });
  }
  return idx;
};

const getName = (ln, itemsIdx) => {
  const fromLine =
    ln.item_title || ln.item_name || ln.title || ln.name || ln.Item || ln.item;
  if (fromLine) return norm(fromLine);
  const byUuid = itemsIdx.get(lineItemId(ln));
  return byUuid?.name || "";
};
const getMRP = (ln, itemsIdx) => {
  const fromLine = ln.mrp ?? ln.MRP ?? ln.price_mrp ?? ln.Price_MRP;
  if (!isNaN(+fromLine)) return +fromLine;
  const byUuid = itemsIdx.get(lineItemId(ln));
  return byUuid?.mrp || 0;
};
const getCategoryMeta = (ln, itemsIdx, catIdx) => {
  const fromLine = norm(ln.category_uuid || ln.cat_uuid || "");
  if (fromLine && catIdx.has(fromLine)) return catIdx.get(fromLine);
  const fromItem = itemsIdx.get(lineItemId(ln))?.category_uuid;
  if (fromItem && catIdx.has(fromItem)) return catIdx.get(fromItem);
  return { title: "Uncategorized", sort_order: 999999 };
};

/* -------- compute grouped summary (Item Summary pane) -------- */
function computeItemSummary(orders = [], itemsIdx, catIdx) {
  const catMap = new Map();
  for (const o of orders) {
    const lines = Array.isArray(o?.item_details) ? o.item_details : [];
    const orderKey = o?.order_uuid || o?.invoice_number || Math.random().toString(36).slice(2);
    for (const ln of lines) {
      const s = +ln?.status; // 1=Complete, 2=Hold, 3=Cancel
      if (s === 1 || s === 2 || s === 3) continue;

      const itemKey = String(lineItemId(ln) || getName(ln, itemsIdx)).trim();
      if (!itemKey) continue;

      const name = getName(ln, itemsIdx);
      const mrp = getMRP(ln, itemsIdx);
      const catMeta = getCategoryMeta(ln, itemsIdx, catIdx);
      const catTitle = catMeta.title;

      if (!catMap.has(catTitle)) {
        catMap.set(catTitle, { sort_order: catMeta.sort_order ?? 9999, rows: new Map() });
      }
      const bucket = catMap.get(catTitle).rows;

      const prev = bucket.get(itemKey) || {
        key: itemKey, name, mrp, totalB: 0, totalP: 0, orders: new Set(),
      };
      prev.totalB += isNaN(+ln.b) ? 0 : +ln.b;
      prev.totalP += isNaN(+ln.p) ? 0 : +ln.p;
      prev.orders.add(orderKey);
      if (!prev.name && name) prev.name = name;
      if (!prev.mrp && mrp) prev.mrp = mrp;

      bucket.set(itemKey, prev);
    }
  }

  const out = [];
  for (const [category, { sort_order, rows }] of catMap.entries()) {
    const arr = Array.from(rows.values()).map((r) => ({ ...r, orderCount: r.orders.size }));
    arr.sort((a, b) => a.name.localeCompare(b.name)); // items A→Z within category
    out.push({ category, sort_order, rows: arr });
  }
  out.sort((a, b) => {
    if (a.category === "Uncategorized") return 1;
    if (b.category === "Uncategorized") return -1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.category.localeCompare(b.category);
  });
  return out;
}

/* ------------------------------- page ------------------------------- */
const OrderAssembly = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");

  const [itemsMaster, setItemsMaster] = useState(location.state?.itemsMaster || window.BT_ITEMS || null);
  const [categoriesMaster, setCategoriesMaster] = useState(location.state?.categoriesMaster || window.BT_CATEGORIES || null);

  // Preserve original grand totals to defend against accidental zeroing
  const originalGrandTotalsRef = useRef(new Map());
  useEffect(() => {
    (orders || []).forEach((o) => {
      const id = o?.order_uuid || o?.invoice_number;
      if (!id) return;
      if (!originalGrandTotalsRef.current.has(id)) {
        const gt = getOrderGrand(o);
        if (gt > 0) originalGrandTotalsRef.current.set(id, gt);
      }
    });
  }, [orders]);
  // If any order gets zeroed, restore its original total
  useEffect(() => {
    if (!orders?.length) return;
    let changed = false;
    const patched = orders.map((o) => {
      const id = o?.order_uuid || o?.invoice_number;
      if (!id) return o;
      const current = +o?.order_grandtotal;
      const original = originalGrandTotalsRef.current.get(id);
      if ((!Number.isFinite(current) || current === 0) && Number.isFinite(original)) {
        changed = true;
        return { ...o, order_grandtotal: original };
      }
      return o;
    });
    if (changed) setOrders(patched);
  }, [orders]); // safe due to 'changed' guard

  // Device bases (1..20)
  const [deviceBases, setDeviceBases] = useState(Array.from({ length: 20 }, () => ""));
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/assembly-devices");
        const list = Array.isArray(data?.devices) ? data.devices : [];
        const byNum = new Map(list.map((d) => [Number(d.device_number), String(d.url || "").trim()]));
        const normed = Array.from({ length: 20 }, (_, i) => {
          const n = i + 1;
          let base = byNum.get(n) || "";
          if (!base) return "";
          const valIdx = base.toLowerCase().lastIndexOf("val=");
          if (valIdx >= 0) base = base.slice(0, valIdx);
          if (!/[&?]$/.test(base)) base += base.includes("?") ? "&" : "?";
          return base;
        });
        setDeviceBases(normed);
      } catch (e) {
        console.error("Failed to load device URLs for assembly", e);
      }
    })();
  }, []);

  // Always fetch categories (to enable grouping)
  useEffect(() => {
    const loadCats = async () => {
      try {
        const r = await axios.get("https://api.btgondia.com/itemCategories/GetItemCategoryList");
        const arr = Array.isArray(r.data?.result) ? r.data.result : r.data;
        if (Array.isArray(arr) && arr.length) setCategoriesMaster(arr);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };
    loadCats();
  }, []);

  // Fallback items via API
  useEffect(() => {
    const loadItems = async () => {
      if (!itemsMaster) {
        try {
          const r = await axios.post("/items/GetItemList");
          const arr = Array.isArray(r.data?.result) ? r.data.result : r.data;
          if (Array.isArray(arr) && arr.length) setItemsMaster(arr);
        } catch {}
      }
    };
    loadItems();
  }, [itemsMaster]);

  // Orders from router state
  useEffect(() => {
    setOrders(location.state?.orders || []);
  }, [location.state]);

  const itemsIdx = useMemo(() => buildItemsIndex(itemsMaster || []), [itemsMaster]);
  const catIdx   = useMemo(() => buildCategoryIndex(categoriesMaster || []), [categoriesMaster]);

  const grouped  = useMemo(() => computeItemSummary(orders, itemsIdx, catIdx), [orders, itemsIdx, catIdx]);

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.trim().toLowerCase();
    return grouped
      .map((g) => ({
        category: g.category,
        sort_order: g.sort_order,
        rows: g.rows.filter((r) => r.name.toLowerCase().includes(q) || String(r.mrp).includes(q)),
      }))
      .filter((g) => g.rows.length > 0);
  }, [grouped, search]);

  const ordersTotal = useMemo(() => sumOrdersTotal(orders), [orders]);

  // Counters sorted by sort_order; show carate numbers
  const uniqueCountersMap = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      const id = o?.counter_uuid;
      if (!id) continue;
      const title =
        o.counter_title || o.counter_name || o.counter || o.counterCode || "Unnamed Counter";
      const sortOrder = nnum(o.counter_sort_order, 9999);
      if (!map.has(id)) map.set(id, { title, sort_order: sortOrder });
    }
    return map;
  }, [orders]);

  const uniqueCountersArr = useMemo(() => {
    const arr = Array.from(uniqueCountersMap, ([uuid, meta]) => ({
      uuid,
      title: meta.title,
      sort_order: meta.sort_order,
    }));
    arr.sort((a, b) => a.sort_order - b.sort_order);
    return arr;
  }, [uniqueCountersMap]);

  // Chips per counter
  const ordersByCounter = useMemo(() => {
    const out = new Map();
    for (const o of orders) {
      const cid = o?.counter_uuid;
      if (!cid) continue;
      const list = out.get(cid) || [];
      const num = o?.invoice_number || o?.order_uuid || "";
      const total = getOrderGrand(o);
      list.push({ number: String(num).replace(/^B-?/i, ""), total });
      out.set(cid, list);
    }
    for (const [k, list] of out.entries()) {
      list.sort((a, b) => nnum(a.number) - nnum(b.number));
    }
    return out;
  }, [orders]);

  // Summary selection & device updates
  const flattenedKeys = useMemo(() => {
    const arr = [];
    for (const g of filtered) for (const r of g.rows) arr.push(r.key);
    return arr;
  }, [filtered]);

  const [selectedKey, setSelectedKey] = useState(null);
  useEffect(() => {
    setSelectedKey((prev) => (prev && flattenedKeys.includes(prev) ? prev : flattenedKeys[0] || null));
  }, [flattenedKeys]);

  const moveCursorToNextLine = useCallback(() => {
    if (!flattenedKeys.length) return;
    const i = flattenedKeys.indexOf(selectedKey);
    const nextKey = flattenedKeys[Math.min(i + 1, flattenedKeys.length - 1)];
    setSelectedKey(nextKey);
  }, [flattenedKeys, selectedKey]);

  // Prevent auto-advance when we trigger a revert
  const suppressAdvanceRef = useRef(false);
  const onQueued = useCallback(() => {
    if (!suppressAdvanceRef.current) {
      moveCursorToNextLine();
    }
  }, [moveCursorToNextLine]);

  const selectedRowMeta = useMemo(() => {
    for (const g of filtered) {
      for (const r of g.rows) {
        if (r.key === selectedKey) return { key: r.key, name: norm(r.name), mrp: nnum(r.mrp) };
      }
    }
    return { key: null, name: "", mrp: 0 };
  }, [filtered, selectedKey]);

  const perCounterCounts = useMemo(() => {
    const map = new Map();
    if (!selectedRowMeta.key && !selectedRowMeta.name) return map;

    for (const o of orders) {
      const cid = o?.counter_uuid;
      if (!cid) continue;
      const lines = Array.isArray(o?.item_details) ? o.item_details : [];
      let acc = map.get(cid) || { b: 0, p: 0 };
      for (const ln of lines) {
        const st = +ln?.status;
        if (st === 1 || st === 2 || st === 3) continue;

        const id = String(ln?.item_uuid_v2 || ln?.item_uuid || ln?.item_code || ln?.ITEM_CODE || "");
        const nm = norm(getName(ln, itemsIdx));
        const mrp = nnum(getMRP(ln, itemsIdx));
        const matchesById = id && selectedRowMeta.key && id === selectedRowMeta.key;
        const matchesByNameMrp = nm && selectedRowMeta.name && nm === selectedRowMeta.name && mrp === selectedRowMeta.mrp;
        if (matchesById || matchesByNameMrp) {
          acc.b += isNaN(+ln.b) ? 0 : +ln.b;
          acc.p += isNaN(+ln.p) ? 0 : +ln.p;
        }
      }
      map.set(cid, acc);
    }
    return map;
  }, [orders, itemsIdx, selectedRowMeta]);

  // Device updates
  const formatVal = ({ b = 0, p = 0 }) => {
    const B = Number.isFinite(+b) ? +b : 0;
    const P = Number.isFinite(+p) ? +p : 0;
    return B === 0 ? String(P) : `${B}x${P}`;
  };
  useEffect(() => {
    if (!uniqueCountersArr || uniqueCountersArr.length === 0) return;
    const controller = new AbortController();
    const send = async () => {
      try {
        const reqs = uniqueCountersArr.map((c, idx) => {
          const cp = perCounterCounts.get(c.uuid) ?? { b: 0, p: 0 };
          const base = deviceBases[idx] || "";
          if (!base) return Promise.resolve();
          const valParam = formatVal(cp);
          const finalUrl = `${base}val=${encodeURIComponent(valParam)}`;
          return fetch(finalUrl, { method: "GET", mode: "no-cors", signal: controller.signal }).catch(() => {});
        });
        await Promise.all(reqs);
      } catch {}
    };
    send();
    return () => controller.abort();
  }, [selectedKey, uniqueCountersArr, perCounterCounts, deviceBases]);

  // Processing hook (uses onQueued wrapper)
  const {
    queueActionForSelectedItem,
    save,
    pendingCount,
    previewStatusByItemKey,
  } = useAssemblyProcessing({
    orders,
    setOrders,
    selectedRowMeta,
    onQueued, // wrapped to respect suppressAdvanceRef
  });

  /* ---- Revert logic: target exact row, no auto-advance ---- */
  const [pendingRevertKey, setPendingRevertKey] = useState(null);
  const revertActionForItemKey = (key) => {
    if (!key) return;
    suppressAdvanceRef.current = true; // don't move selection on revert
    setPendingRevertKey(key);
    setSelectedKey(key);
  };
  // run the revert only after selection equals the target key
  useEffect(() => {
    if (!pendingRevertKey) return;
    if (selectedKey !== pendingRevertKey) return;
    // now the hook sees the right selectedRowMeta
    queueActionForSelectedItem(0); // 0 = clear status
    // release suppression on next tick
    setTimeout(() => {
      suppressAdvanceRef.current = false;
      setPendingRevertKey(null);
    }, 0);
  }, [pendingRevertKey, selectedKey, queueActionForSelectedItem]);

  // Row highlight colors
  const rowHighlight = useMemo(() => {
    const map = {};
    for (const g of filtered) {
      for (const r of g.rows) {
        const k = r.key;
        const st = previewStatusByItemKey?.get?.(k);
        if (st === 1) map[k] = "green";       // COMPLETE
        else if (st === 2) map[k] = "yellow"; // HOLD
        else if (st === 3) map[k] = "red";    // CANCEL
        else if (k === selectedKey) map[k] = "blue"; // current cursor
        else map[k] = "white";                // untouched
      }
    }
    return map;
  }, [filtered, previewStatusByItemKey, selectedKey]);

  return (
    <>
      <Sidebar />
      <div className="right-side">
        <Header />

        <div className="page-header px-6 pt-2 pb-1" style={{ borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center" }}>
          <span className="text-xl font-bold text-black flex items-center gap: 2">
            <span role="img" aria-label="tools">🛠️</span> Order Assembly
          </span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {pendingCount > 0 && (
              <span className="text-xs px-2 py-1 rounded-md" style={{ background: "#FEF3C7", color: "#92400E" }}>
                {pendingCount} pending
              </span>
            )}
            <button className="btn btn-lg action-success" type="button" onClick={save}>SAVE</button>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="assembly-layout">
          {/* LEFT: Carate Progress */}
          <section className="panel">
            <div className="panel-header">Carate Progress (Counters = {uniqueCountersArr.length})</div>
            <div className="panel-body">
              <div className="carate-list">
                {uniqueCountersArr.map((c, idx) => {
                  const bp = perCounterCounts.get(c.uuid) || { b: 0, p: 0 };
                  const chips = ordersByCounter.get(c.uuid) || [];
                  return (
                    <div key={c.uuid} className="carate-item">
                      <div className="carate-tube">
                        <div className="carate-fill" style={{ width: "0%" }} />
                        <div className="carate-text">
                          {idx + 1}. {c.title}
                          <span className="carate-orders">
                            {chips.map((o) => (
                              <span key={o.number} className="chip">
                                (B-{o.number} ₹{Math.round(o.total)})
                              </span>
                            ))}
                          </span>
                        </div>
                        <div className="carate-count">{bp.b} : {bp.p}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* RIGHT: Item Summary + sticky actions */}
          <section className="panel right-pane">
            <div className="panel-header">
              <div className="flex-row">
                <span>Item Summary</span>
                <span className="ml-auto text-sm font-semibold">Orders Total: ₹ {ordersTotal}</span>
              </div>
            </div>

            <div className="summary">
              <ItemSummaryPane
                search={search}
                setSearch={setSearch}
                grouped={filtered}
                selectedKey={selectedKey}
                onRowClick={setSelectedKey}
                rowHighlight={rowHighlight}
                statusByKey={previewStatusByItemKey}
                onRevert={revertActionForItemKey}
              />
            </div>

            <div className="sticky-actions">
              <div className="actions-body" style={{ height: "auto", padding: 0 }}>
                <button className="btn btn-lg action-danger" type="button" onClick={() => queueActionForSelectedItem(3)}>CANCEL</button>
                <button className="btn btn-lg action-warn"   type="button" onClick={() => queueActionForSelectedItem(2)}>HOLD</button>
                <button className="btn btn-lg action-success"type="button" onClick={() => queueActionForSelectedItem(1)}>COMPLETE</button>
              </div>
              <div className="text-xs mt-2" style={{ color: "#6b7280" }}>
                After clicking a button, the cursor moves to the next line. Colors: <b>Green</b>=Complete, <b>Yellow</b>=Hold, <b>Red</b>=Cancel, <b>Blue</b>=current selection.
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default OrderAssembly;
