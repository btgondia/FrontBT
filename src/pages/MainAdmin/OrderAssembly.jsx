import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import axios from "axios";
import "./style.css";
import { useAssemblyProcessing } from "./AssemblyOrderProcessing";
import { MdClose } from "react-icons/md";
import { RiErrorWarningFill } from "react-icons/ri";
import Loader from "../../components/Loader";
import BarcodeInput from "./order-assembly/BarcodeInput";
import DeviceTesting from "./order-assembly/DeviceTesting";

const ORDER_ASSEMBLY_SS_KEY = "orderAssemblySelectedOrders";
const ASSEMBLY_DEVICE_COUNT = 20
const DEVICE_MESSAGE = {
  DONE: "DONE",
  CANCEL: "XXXX",
  UNTICK: "UT",
  NOT_FOUND: "NF",
  formatMessage: function ({ b = 0, p = 0 } = {}) {
    const B = Number.isFinite(+b) ? +b : 0;
    const P = Number.isFinite(+p) ? +p : 0;
    return B === 0 ? String(P) : `${B}x${P}`;
  }
}
const ITEM_STATUS = {
  IN_PROCESSING: 0,
  COMPLETE: 1,
  HOLD: 2,
  CANCEL: 3,
}
const ASSEMBLY_MODES = {
  NORMAL:"normal",
  DEVICE:"device"
}

/* ----------------- helpers ----------------- */
const norm = (s) => String(s ?? "").trim();
const nnum = (v, d = 0) => (isNaN(+v) ? d : +v);
const lineItemId = (ln) =>
  String(
    ln?.item_uuid_v2 ||
      ln?.item_uuid ||
      ln?.item_code ||
      ln?.ITEM_CODE ||
      ""
  );

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
  for (let index=0; index < items.length; index++) {
    const it = items[index]
    const key =it?.item_uuid || it?._id;
    if (!key) continue;
    idx.set(String(key), {
      name:
        norm(it.item_title) ||
        norm(it.pronounce) ||
        norm(it.name) ||
        norm(it.title),
      mrp: nnum(it.mrp ?? it.MRP ?? it.price_mrp ?? it.Price_MRP),
      category_uuid: norm(it.category_uuid || it.cat_uuid || ""),
      // pcs per box (conversion)
      conversion: nnum(
        it.conversion ??
          it.CONVERSION ??
          it.Conv ??
          it.conv ??
          it.pcs_in_box ??
          it.pieces_in_box,
        1
      ),
    });
  }
  return idx;
};

const buildCategoryIndex = (cats = []) => {
  const idx = new Map();
  for (const c of cats) {
    const uuid = norm(
      c.category_uuid ||
        c.uuid ||
        c._id ||
        c.IDENTIFIER ||
        c.id
    );
    if (!uuid) continue;
    idx.set(uuid, {
      title: norm(
        c.category_title || c.title || c.name || "Uncategorized"
      ),
      sort_order:
        typeof c.sort_order === "number"
          ? c.sort_order
          : nnum(c.sort_order, 9999),
    });
  }
  return idx;
};

const getName = (ln, itemsIdx) => {
  const fromLine =
    ln.item_title ||
    ln.item_name ||
    ln.title ||
    ln.name ||
    ln.Item ||
    ln.item;
  if (fromLine) return norm(fromLine);
  const byUuid = itemsIdx.get(lineItemId(ln));
  return byUuid?.name || "";
};
const getMRP = (ln, itemsIdx) => {
  const fromLine =
    ln.mrp ?? ln.MRP ?? ln.price_mrp ?? ln.Price_MRP;
  if (!isNaN(+fromLine)) return +fromLine;
  const byUuid = itemsIdx.get(lineItemId(ln));
  return byUuid?.mrp || 0;
};
const getConversion = (ln, itemsIdx) => {
  const byUuid = itemsIdx.get(lineItemId(ln));
  return byUuid?.conversion ?? null;
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
    const lines = Array.isArray(o?.item_details)
      ? o.item_details
      : [];
    const orderKey =
      o?.order_uuid ||
      o?.invoice_number ||
      Math.random().toString(36).slice(2);
    for (const ln of lines) {
      const s = +ln?.status;
      if (Object.values(ITEM_STATUS).slice(1).includes(s)) continue;

      const itemKey = String(
        lineItemId(ln) || getName(ln, itemsIdx)
      ).trim();
      if (!itemKey) continue;

      const name = getName(ln, itemsIdx);
      const mrp = getMRP(ln, itemsIdx);
      const conv = getConversion(ln, itemsIdx);
      const displayName = name;

      const catMeta = getCategoryMeta(ln, itemsIdx, catIdx);
      const catTitle = catMeta.title;

      if (!catMap.has(catTitle)) {
        catMap.set(catTitle, {
          sort_order: catMeta.sort_order ?? 9999,
          rows: new Map(),
        });
      }
      const bucket = catMap.get(catTitle).rows;

      const prev = bucket.get(itemKey) || {
        key: itemKey,
        name: displayName,
        mrp,
        totalB: 0,
        totalP: 0,
        conversion: conv ?? null,
        orders: new Set(),
      };
      prev.totalB += isNaN(+ln.b) ? 0 : +ln.b;
      prev.totalP += isNaN(+ln.p) ? 0 : +ln.p;
      prev.orders.add(orderKey);
      if (!prev.conversion && conv) prev.conversion = conv;
      if (!prev.name && displayName) prev.name = displayName;
      if (!prev.mrp && mrp) prev.mrp = mrp;

      bucket.set(itemKey, prev);
    }
  }

  const out = [];
  for (const [category, { sort_order, rows }] of catMap.entries()) {
    const arr = Array.from(rows.values()).map((r) => {
      let totalB = nnum(r.totalB, 0);
      let totalP = nnum(r.totalP, 0);
      const conv = nnum(r.conversion, 0);

      // 🔁 convert extra pieces into boxes
      if (conv > 0) {
        const extraBoxes = Math.floor(totalP / conv);
        totalB += extraBoxes;
        totalP = totalP % conv;
      }

      return {
        ...r,
        totalB,
        totalP,
        orderCount: r.orders.size,
      };
    });
    arr.sort((a, b) => a.name.localeCompare(b.name)); // items A→Z within category
    out.push({ category, sort_order, rows: arr });
  }
  out.sort((a, b) => {
    if (a.category === "Uncategorized") return 1;
    if (b.category === "Uncategorized") return -1;
    if (a.sort_order !== b.sort_order)
      return a.sort_order - b.sort_order;
    return a.category.localeCompare(b.category);
  });
  return out;
}

/* ------------------------------- page ------------------------------- */
const OrderAssembly = () => {
  // force mobile layout on /users/processing route (for testing on PC)
  const isMobileAssembly = window.location.pathname.includes(
    "/users/processing"
  );
  
  const navigate = useNavigate()
  const location = useLocation();
  
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [counters, setCounters] = useState([])
  const [deviceCallStatus, setDeviceCallStatus] = useState()

  const [itemsMaster, setItemsMaster] = useState(
    location.state?.itemsMaster || window.BT_ITEMS || null
  );
  const [categoriesMaster, setCategoriesMaster] = useState(
    location.state?.categoriesMaster ||
      window.BT_CATEGORIES ||
      null
  );
  const [counterIndex, setCounterIndex] = useState(new Map());
  const [doneCounterIds, setDoneCounterIds] = useState({})

  /* ---------- MOBILE VIEW DETECTION ---------- */
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState("items"); // "items" | "crate"

  const [apiLoading, setApiLoading] = useState()
  const [mode, setMode] = useState(ASSEMBLY_MODES.NORMAL)

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 768px)");

    const handleChange = (e) => {
      setIsMobile(e.matches);
    };

    // initial
    setIsMobile(mql.matches);

    // subscribe
    if (mql.addEventListener) {
      mql.addEventListener("change", handleChange);
    } else {
      // older browsers
      mql.addListener(handleChange);
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", handleChange);
      } else {
        mql.removeListener(handleChange);
      }
    };
  }, []);

  // Preserve original grand totals to defend against accidental zeroing
  const originalGrandTotalsRef = useRef(new Map());
  useEffect(() => {
    (orders || []).forEach((o) => {
      const id = o?.order_uuid || o?.invoice_number;
      if (!id) return;
      if (!originalGrandTotalsRef.current.has(id)) {
        const gt = getOrderGrand(o);
        if (gt > 0)
          originalGrandTotalsRef.current.set(id, gt);
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
      const original =
        originalGrandTotalsRef.current.get(id);
      if (
        (!Number.isFinite(current) || current === 0) &&
        Number.isFinite(original)
      ) {
        changed = true;
        return { ...o, order_grandtotal: original };
      }
      return o;
    });
    if (changed) setOrders(patched);
  }, [orders]); // safe due to 'changed' guard

  // Device bases (1..DEVICE_COUNT)
  const [deviceBases, setDeviceBases] = useState(
    Array.from({ length: ASSEMBLY_DEVICE_COUNT }, () => "")
  );
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(
          "/api/assembly-devices"
        );
        const list = Array.isArray(data?.devices)
          ? data.devices
          : [];
        const byNum = new Map(
          list.map((d) => [
            Number(d.device_number),
            String(d.url || "").trim(),
          ])
        );
        const normed = Array.from(
          { length: ASSEMBLY_DEVICE_COUNT },
          (_, i) => {
            const n = i + 1;
            let base = byNum.get(n) || "";
            if (!base) return "";
            const valIdx = base
              .toLowerCase()
              .lastIndexOf("val=");
            if (valIdx >= 0) base = base.slice(0, valIdx);
            if (!/[&?]$/.test(base))
              base += base.includes("?") ? "&" : "?";
            return base;
          }
        );
        setDeviceBases(normed);
      } catch (e) {
        console.error(
          "Failed to load device URLs for assembly",
          e
        );
      }
    })();
  }, []);

  // Always fetch categories (to enable grouping)
  useEffect(() => {
    const loadCats = async () => {
      try {
        const r = await axios.get(
          "https://api.btgondia.com/itemCategories/GetItemCategoryList"
        );
        const arr = Array.isArray(r.data?.result)
          ? r.data.result
          : r.data;
        if (Array.isArray(arr) && arr.length)
          setCategoriesMaster(arr);
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
          const arr = Array.isArray(r.data?.result)
            ? r.data.result
            : r.data;
          if (Array.isArray(arr) && arr.length)
            setItemsMaster(arr);
        } catch {}
      }
    };
    loadItems();
  }, [itemsMaster]);

  useEffect(() => {
    const loadCounters = async () => {
      try {
        const r = await axios({
          method: "get",
          url: "/counters/GetCounterData",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const list = Array.isArray(r.data?.result)
          ? r.data.result
          : r.data;

        setCounters(list)
        const map = new Map();

        (list || []).forEach((c) => {
          const id = c?.counter_uuid;
          if (!id) return;
          const title =
            c.counter_title ||
            c.counter_name ||
            c.counter ||
            c.counterCode ||
            "Unnamed Counter";
          const sortOrder = nnum(c.sort_order, 9999);
          map.set(id, { title, sort_order: sortOrder });
        });

        if (map.size) setCounterIndex(map);
      } catch (err) {
        console.error(
          "Failed to load counters for sort order",
          err
        );
      }
    };

    loadCounters();
  }, []);

  // Orders from router state, with sessionStorage fallback (for mobile/users)
  useEffect(() => {
    const stateOrders = location.state?.orders;

    if (Array.isArray(stateOrders) && stateOrders.length) {
      setOrders(stateOrders);
      return;
    }

    // Fallback: read from sessionStorage (used by /users/processing flow)
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const raw = window.sessionStorage.getItem(ORDER_ASSEMBLY_SS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) {
            setOrders(parsed);
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Failed to read assembly orders from session", err);
    }

    // If nothing found, keep empty array to avoid crashing
    setOrders([]);
  }, [location.state]);

  const itemsIdx = useMemo(
    () => buildItemsIndex(itemsMaster || []),
    [itemsMaster]
  );
  const catIdx = useMemo(
    () => buildCategoryIndex(categoriesMaster || []),
    [categoriesMaster]
  );

  const grouped = useMemo(
    () => computeItemSummary(orders, itemsIdx, catIdx),
    [orders, itemsIdx, catIdx]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.trim().toLowerCase();
    return grouped
      .map((g) => ({
        category: g.category,
        sort_order: g.sort_order,
        rows: g.rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            String(r.mrp).includes(q)
        ),
      }))
      .filter((g) => g.rows.length > 0);
  }, [grouped, search]);

  const ordersTotal = useMemo(
    () => sumOrdersTotal(orders),
    [orders]
  );

  // Counters sorted by sort_order; show crate numbers
  const uniqueCountersMap = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      const id = o?.counter_uuid;
      if (!id) continue;

      // Prefer data from counters master (counterIndex)
      const fromIdx = counterIndex.get(id);

      const title =
        fromIdx?.title ||
        o.counter_title ||
        o.counter_name ||
        o.counter ||
        o.counterCode ||
        "Unnamed Counter";

      // Prefer sort_order from counters master, then fall back to any order-level field
      const sortOrderRaw =
        fromIdx?.sort_order ??
        o.counter_sort_order ??
        o.sort_order ??
        o.sortOrder ??
        o.counterSortOrder ??
        o.counter_sortorder ??
        o.counterSortorder;

      const sortOrder = nnum(sortOrderRaw, 9999);
      if (!map.has(id)) map.set(id, { title, sort_order: sortOrder });
    }
    return map;
  }, [orders, counterIndex]);

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
      list.push({
        number: String(num).replace(/^B-?/i, ""),
        total,
      });
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
    setSelectedKey((prev) =>
      prev && flattenedKeys.includes(prev)
        ? prev
        : flattenedKeys[0] || null
    );
  }, [flattenedKeys]);

  const selectedRowMeta = useMemo(() => {
    for (const g of filtered) {
      for (const r of g.rows) {
        if (r.key === selectedKey)
          return {
            key: r.key,
            name: norm(r.name),
            mrp: nnum(r.mrp),
          };
      }
    }
    return { key: null, name: "", mrp: 0 };
  }, [filtered, selectedKey]);

  // pcs per box for the currently selected item
  const selectedConversion = useMemo(() => {
    // default to 1 if anything is missing
    if (!selectedRowMeta.key && !selectedRowMeta.name)
      return 1;

    // 1) try from itemsIdx by key (item_uuid / item_code)
    const fromIdx = selectedRowMeta.key
      ? itemsIdx.get(selectedRowMeta.key)
      : null;
    if (
      fromIdx &&
      Number.isFinite(fromIdx.conversion) &&
      fromIdx.conversion > 0
    ) {
      return fromIdx.conversion;
    }

    // 2) fallback: search raw itemsMaster by name + mrp
    const arr = Array.isArray(itemsMaster) ? itemsMaster : [];
    if (selectedRowMeta.name && arr.length) {
      const match = arr.find((it) => {
        const nm = norm(
          it?.item_title ||
            it?.pronounce ||
            it?.name ||
            it?.title
        );
        const mrp = nnum(
          it?.mrp ??
            it?.MRP ??
            it?.price_mrp ??
            it?.Price_MRP
        );
        return (
          nm === selectedRowMeta.name &&
          mrp === selectedRowMeta.mrp
        );
      });
      if (match) {
        const conv = nnum(
          match.conversion ??
            match.CONVERSION ??
            match.Conv ??
            match.conv ??
            match.pcs_in_box ??
            match.pieces_in_box,
          1
        );
        if (conv > 0) return conv;
      }
    }

    return 1;
  }, [selectedRowMeta, itemsIdx, itemsMaster]);

  const perCounterCounts = useMemo(() => {
    const intermediate = new Map();
    if (!selectedRowMeta.key && !selectedRowMeta.name)
      return intermediate;

    const conv =
      Number.isFinite(selectedConversion) &&
      selectedConversion > 0
        ? selectedConversion
        : 1;

    // 1) accumulate raw boxes + pieces per counter for the selected item
    for (const o of orders) {
      const cid = o?.counter_uuid;
      if (!cid) continue;
      const lines = Array.isArray(o?.item_details)
        ? o.item_details
        : [];
      let acc =
        intermediate.get(cid) || {
          boxTotal: 0,
          pcsTotal: 0,
        };
      for (const ln of lines) {
        const st = +ln?.status;
        if (Object.values(ITEM_STATUS).slice(1).includes(st)) continue;

        const id = String(
          ln?.item_uuid_v2 ||
            ln?.item_uuid ||
            ln?.item_code ||
            ln?.ITEM_CODE ||
            ""
        );
        const nm = norm(getName(ln, itemsIdx));
        const mrp = nnum(getMRP(ln, itemsIdx));
        const matchesById =
          id && selectedRowMeta.key && id === selectedRowMeta.key;
        const matchesByNameMrp =
          nm &&
          selectedRowMeta.name &&
          nm === selectedRowMeta.name &&
          mrp === selectedRowMeta.mrp;

        if (matchesById || matchesByNameMrp) {
          const box = isNaN(+ln.b) ? 0 : +ln.b;
          const pcs = isNaN(+ln.p) ? 0 : +ln.p;
          acc.boxTotal += box;
          acc.pcsTotal += pcs;
        }
      }
      intermediate.set(cid, acc);
    }

    // 2) normalize using conversion so that pcs < conv for each counter
    const result = new Map();
    for (const [cid, acc] of intermediate.entries()) {
      const totalPieces = acc.boxTotal * conv + acc.pcsTotal;
      const normBoxes = Math.floor(totalPieces / conv);
      const normPcs = totalPieces % conv;
      result.set(cid, { b: normBoxes, p: normPcs });
    }

    return result;
  }, [orders, itemsIdx, selectedRowMeta, selectedConversion]);

  // increments on every action button click (used to trigger device updates)
  const [deviceTriggerCounter, setDeviceTriggerCounter] = useState(0);

  // boolean: all items in all orders for that counter are completed (1) or cancelled (3)
  // excluding current item, of course!
  const getCounterDoneStatus = (counterId, currItemId) => {
    const counterOrders = ordersByCounter.get(counterId)
    const hasUnProcessedItems = counterOrders?.some(i => {
      const order = orders.find(o => [o.invoice_number.split("-")[1], o.order_uuid].includes(i.number.toString()))
      return order.item_details?.some(i => (i.status !== ITEM_STATUS.COMPLETE && i.status !== ITEM_STATUS.CANCEL) || i.item_uuid === currItemId)
    })

    return !hasUnProcessedItems
  }

  async function fetchWithRetry(url, attempts = 3, signal, data) {
    const {id, idx, message} = data || {}
    for (let i = 1; i <= attempts; i++) {
      try {
        await fetch(url, {
          method: "GET",
          mode: "no-cors",
          signal,
        });
        if (data) {
          setDeviceCallStatus(prev =>
            prev?.retrying?.includes(id)
              ? ({...prev, retrying: (prev?.retrying || [])?.filter(i => i !== id)})
              : prev
          )
        }
      } catch (err) {
        if (signal?.aborted) {
          setDeviceCallStatus(prev =>
            prev?.retrying?.includes(id)
              ? ({...prev, retrying: (prev?.retrying || [])?.filter(i => i !== id)})
              : prev
          )
          return
        };
        if (i === attempts) {
          if (data)
            setDeviceCallStatus(prev => ({
              retrying: prev?.retrying?.filter(i => i !== id) || [],
              failed: [
                ...(prev?.failed || []),
                {
                  idx,
                  message,
                  message:
                    err?.response?.data?.message ||
                    err?.response?.data?.error ||
                    err?.message ||
                    (typeof err === "string" ? err : 'An error occurred, please contact support.'),
                }
              ]
            }))
          throw err
        }; 
        await new Promise((res) => setTimeout(res, 250));
        if (data)
          setDeviceCallStatus(prev => ({
            ...prev,
            retrying: Array.from(new Set(([...(prev?.retrying || []), id]))),
          }))
      }
    }
  }

  // console.log(deviceCallStatus)

  const makeCounterCalls = async (c, idx, controller) => {
    const result = {}
    try {
      const base = deviceBases[idx];
      if (!base || doneCounterIds?.[c.uuid])  return Promise.resolve();

      let message = pendingActionRef.current?.message

      const isCounterDone = getCounterDoneStatus(c.uuid, selectedRowMeta.key)
      if (isCounterDone) {
        result[c.uuid] = true
        message = DEVICE_MESSAGE.DONE
      } else if (!message) {
        message = DEVICE_MESSAGE.formatMessage(perCounterCounts.get(c.uuid))
      }
      
      const finalUrl = `${base}val=${encodeURIComponent(message)}`;

      const id = Date.now().toString() + idx
      await fetchWithRetry(finalUrl, 3, controller?.signal, { id, idx, message })
    } catch (error) {
      console.error(error)
    }
    return result
  }

  const send = async (controller) => {
    setApiLoading(true)
    try {
      setDeviceCallStatus({})
      const result = await Promise.all(
        uniqueCountersArr.map((c, idx) => makeCounterCalls(c, idx, controller))
      );
      const doneCounterIdsLocal = result?.reduce((obj, i) => ({ ...obj, ...i }), {})
      if (Object.values(doneCounterIdsLocal)?.[0]) setDoneCounterIds(p => ({...(p || {}), ...doneCounterIdsLocal }))
    } catch (err) {
      console.error(err)
    }
    setApiLoading(false)
  };

  useEffect(() => {
    if (mode !== ASSEMBLY_MODES.DEVICE) return;
    if (!uniqueCountersArr || uniqueCountersArr.length === 0) return;
    if (!selectedRowMeta.key && !selectedRowMeta.name) return;

    const controller = new AbortController();
    send(controller);
    return () => controller.abort();
  }, [
    deviceTriggerCounter,
    uniqueCountersArr,
    perCounterCounts,
    deviceBases,
    selectedRowMeta,
  ]);

  const getMessageForStatus = (nextStatus, currentStatus) => {
    if (typeof currentStatus !== "number")
      return DEVICE_MESSAGE.NOT_FOUND

    if (nextStatus === ITEM_STATUS.CANCEL)
      return DEVICE_MESSAGE.CANCEL
    
    if (
      nextStatus === ITEM_STATUS.IN_PROCESSING
      && currentStatus === ITEM_STATUS.COMPLETE
    )
      return DEVICE_MESSAGE.UNTICK
  }

  // Processing hook – NO auto-move now
  const onQueued = useCallback(() => {}, []);
  const {
    queueActionForSelectedItem,
    save,
    pendingCount,
    previewStatusByItemKey,
  } = useAssemblyProcessing({
    orders,
    setOrders,
    selectedRowMeta,
    onQueued,
  });

  // we run actions only after the correct row is selected
  const pendingActionRef = useRef(null);
  const [pendingActionToken, setPendingActionToken] = useState(0);
  const [loading, setLoading] = useState(false)

  // SAVE helper: just call the hook's save (buffer already knows changes)
  const handleAssemblySave = useCallback(() => {
    setLoading(true)
    save({itemsMaster,counters}).finally(() => setLoading(false))
  }, [save]);

  // whenever we have a pending action, process it (after selection is updated)
  useEffect(() => {
    const pending = pendingActionRef.current;
    if (!pending) return;
    queueActionForSelectedItem(pending.status);
    pendingActionRef.current = null;
  }, [pendingActionToken, queueActionForSelectedItem]);

  // Row highlight colors (based only on status, not on selection)
  const rowHighlight = useMemo(() => {
    const map = {};
    for (const g of filtered) {
      for (const r of g.rows) {
        const k = r.key;
        const st = previewStatusByItemKey?.get?.(k);
        if (st === 1) map[k] = "complete"; // green
        else if (st === 2) map[k] = "hold"; // yellow
        else if (st === 3) map[k] = "cancel"; // red
        else map[k] = "none"; // normal
      }
    }
    return map;
  }, [filtered, previewStatusByItemKey]);

  const applyStatusForKey = useCallback(
    (key, nextStatus, currentStatus) => {
      if (!key) return;
      // store which key & status we want to apply
      pendingActionRef.current = {
        key,
        status: nextStatus,
        message: getMessageForStatus(nextStatus, currentStatus)
      };
      // update selection so selectedRowMeta matches this key
      setSelectedKey(key);
      // trigger the effect that will call queueActionForSelectedItem
      setPendingActionToken((t) => t + 1);
      // also trigger device updates
      // setDeviceTriggerCounter((c) => c + 1);
    },
    [setSelectedKey, setPendingActionToken]
  );

  // COMPLETE toggle
  const toggleCompleteForItemKey = useCallback(
    (key) => {
      const current = previewStatusByItemKey?.get?.(key);
      const next = current === 1 ? 0 : 1;
      applyStatusForKey(key, next, current);
      setDeviceTriggerCounter((c) => c + 1);
    },
    [previewStatusByItemKey, applyStatusForKey]
  );

  // HOLD toggle
  const holdItemByKey = useCallback(
    (key) => {
      const current = previewStatusByItemKey?.get?.(key);
      const next = current === 2 ? 0 : 2;
      applyStatusForKey(key, next, current);
    },
    [previewStatusByItemKey, applyStatusForKey]
  );

  // CANCEL toggle
  const cancelItemByKey = useCallback(
    (key) => {
      const current = previewStatusByItemKey?.get?.(key);
      const next = current === 3 ? 0 : 3;
      applyStatusForKey(key, next, current);
      if (next) setDeviceTriggerCounter((c) => c + 1)
    },
    [previewStatusByItemKey, applyStatusForKey]
  );

  const handleBarcodeScan = (code) => {
    // console.log("SCANNED CODE", code)
    const item = itemsMaster.find(i => i.barcode?.includes?.(code))
    // console.log("FOUND ITEM", item)
    const itemKey = item?.item_uuid || item?._id
    if (itemKey) toggleCompleteForItemKey(itemKey)
  }

  /* --------------------------- RENDER: MOBILE --------------------------- */
  if (isMobile || isMobileAssembly) {
    return (
      <div className="right-side mobile-assembly relative">
        {/* Combined header with tabs + SAVE */}
        {/* TOP HEADER (new layout) */}
        <Loader visible={loading} />

        {deviceCallStatus?.retrying?.length === 0 && deviceCallStatus?.failed?.[0] ? <div className="overlay">
          <div className="modal" style={{padding:15,paddingBottom:0,width:'480px',maxWidth:'95vw',position:'relative'}}>
            <h5 style={{fontSize:16}}>Device Call Errors</h5>
            <span style={{fontSize:13}}>Total {deviceCallStatus.failed.length} devices failed</span>
            <div style={{maxHeight: '60vh',overflow:'auto',paddingBottom:15}}>
              <ol style={{fontSize:14,marginTop:8,marginLeft:30}}>
                {
                  deviceCallStatus.failed.map(i => (
                    <li key={"error-detail:"+i.idx} className="faded-markers" style={{marginBottom: '8px'}}>
                      <b>{'#'}{i.idx + 1} {uniqueCountersArr[i.idx]?.title} [{
                        i.message || `${i.qty?.b || 0}:${i.qty?.p || 0}`
                      }]</b>
                      <br />
                      <p style={{display:'flex',alignItems:'center',gap:'5px'}}>
                        <RiErrorWarningFill color="red" style={{fontSize:18}} />
                        <span style={{color:'rgb(85, 85, 85)'}}>
                          {i.message}
                        </span>
                      </p>
                    </li>
                  ))
                }
              </ol>
            </div>
            <button style={{position:'absolute',right:10,top:10,display:'flex'}} onClick={() => setDeviceCallStatus({})}>
              <MdClose />
            </button>
          </div>
        </div> : null}

        <div
          className="mobile-assembly-header"
          style={{
            borderBottom: "1px solid #e5e7eb",
            background: "#ffffff",
          }}
        >
          {/* Row 1: Close  ......  (xx pending) SAVE */}
          <div
            style={{
              width:'100vw',
              maxWidth:'500px',
              overflow:'auto',
            }}
          >
            <div
              style={{
                display: "flex",
                padding: "10px 12px",
                gap: '20px',
                width:'calc(100vw + 320px)',
                maxWidth:'calc(500px + 320px)',
              }}
            >
              <div style={{
                display: "flex",
                alignItems: "center",
                width:'calc(100vw - 24px)',
                maxWidth:'calc(500px - 24px)'
              }}>
                {/* Close on the left */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Changes will get discarded. Continue?"))
                      navigate(window.location.pathname.split("/").slice(0, -1).join("/"));
                  }}
                  style={{
                    color: "#DC2626",
                    fontWeight: 600,
                    fontSize: 14,
                    border: "none",
                    background: "transparent",
                  }}
                >
                  Close
                </button>

                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, }}>
                  {mode === ASSEMBLY_MODES.DEVICE && <>
                    {
                      (apiLoading || deviceCallStatus?.retrying?.length) ? <span
                        style={{
                          fontSize: 12,
                          color: "#B45309",
                          background: "#FEF3C7",
                          padding: "4px 8px",
                          borderRadius: 6,
                          display:'flex',
                          gap: 6,
                        }}
                      >
                        <span>
                          {apiLoading ? "Updating Devices": `Retrying ${deviceCallStatus?.retrying?.length}`}
                        </span>
                        <span className="loader x2-small" style={{borderColor:"#B45309"}} />
                      </span> : null
                    }
                    {pendingCount > 0 && (
                      <span
                        style={{
                          fontSize: 14,
                          color: "#B45309",
                          background: "#FEF3C7",
                          padding: "4px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {pendingCount} pending
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleAssemblySave}
                      style={{
                        background: "#10B981",
                        color: "white",
                        padding: "6px 16px",
                        borderRadius: 8,
                        border: "none",
                        fontWeight: 700,
                        fontSize: 15,
                      }}
                    >
                      SAVE
                    </button>
                  </>}
                </div>
              </div>
              {mode === ASSEMBLY_MODES.DEVICE && <DeviceTesting deviceBases={deviceBases} counters={uniqueCountersArr} />}
              <div style={{border:"1px solid #cccccc", borderRadius: "200px",background:"#dddddd",display:"flex",padding:"2px"}}>
                {
                  Object.entries(ASSEMBLY_MODES).map(([key, val]) => (
                    <button
                      key={key}
                      style={{
                        borderRadius:"200px",padding:"6px 15px",border:"none",textTransform:'capitalize',
                        ...(mode === val ? ({background:"#10B981",color:"#fff"}) : {background:"#dddddd"})
                      }}
                      onClick={() => setMode(val)}
                    >{key.toLowerCase()}</button>
                  ))
                }
              </div>
            </div>
          </div>

          {/* Row 2: [Crate] [Items]  Search */}
          <div
            style={{
              padding: "0 12px 10px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: 4,
                background: "#e5e7eb",
                borderRadius: 999,
                padding: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setMobileTab("crate")}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "none",
                  minWidth: 80,
                  background:
                    mobileTab === "crate"
                      ? "#111827"
                      : "transparent",
                  color:
                    mobileTab === "crate"
                      ? "#f9fafb"
                      : "#4b5563",
                  borderRadius: 999,
                }}
              >
                Crates
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("items")}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "none",
                  minWidth: 80,
                  background:
                    mobileTab === "items"
                      ? "#111827"
                      : "transparent",
                  color:
                    mobileTab === "items"
                      ? "#f9fafb"
                      : "#4b5563",
                  borderRadius: 999,
                }}
              >
                Items
              </button>
            </div>

            {/* Search bar (takes remaining ~70%) */}
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                height: 32,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                padding: "0 10px",
                fontSize: 13,
              }}
            />

            <BarcodeInput onScan={handleBarcodeScan} />
          </div>
        </div>

        {/* Body: either Crate or Item Summary */}
        <div
          className="assembly-layout-mobile"
          style={{
            height: "calc(100vh - 92px)",
            overflowY: "auto",
          }}
        >
          {mobileTab === "crate" ? (
            <section className="panel">
              <div className="panel-body">
                <div className="crate-list">
                  {uniqueCountersArr.map((c, idx) => {
                    const bp =
                      perCounterCounts.get(c.uuid) ||
                      { b: 0, p: 0 };
                    const chips =
                      ordersByCounter.get(c.uuid) || [];
                    return (
                      <div
                        key={c.uuid}
                        className="crate-item"
                      >
                        <div className="crate-tube">
                          <div style={{overflow:'auto'}}>
                            <div className="crate-text">
                              {idx + 1}. {c.title}
                            </div>
                            <div className="crate-orders">
                              {chips.map((o) => (
                                <span
                                  key={o.number}
                                  className="chip"
                                >
                                  B-{o.number} • ₹
                                  {Math.round(o.total)}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="crate-count">
                            {bp.b} : {bp.p}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : (
            <section className="panel right-pane">
              <div
                className="summary"
                style={{
                  // paddingBottom: 64,
                  maxHeight: "calc(100vh - 110px)",
                  overflowY: "auto",
                }}
              >
                {/* Grouped items */}
                {filtered.map((group) => (
                  <div
                    key={group.category}
                    className="mobile-category-block"
                    style={{ marginBottom: 8 }}
                  >
                    <div
                      className="mobile-category-header"
                      style={{
                        background: "#e5f3dc",
                        padding: "6px 8px",
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {group.category}
                    </div>

                    {group.rows.map((row, idx) => {
                      const statusKey = rowHighlight[row.key];

                      let rowBg = "#ffffff";
                      if (statusKey === "complete") rowBg = "#ecfdf3"; // light green
                      else if (statusKey === "hold") rowBg = "#FFFBEB"; // light yellow
                      else if (statusKey === "cancel") rowBg = "#FEE2E2"; // light red

                      return (
                        <div
                          key={row.key}
                          className="mobile-item-row"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "6px 6px",
                            borderBottom:
                              "1px solid #f3f4f6",
                            backgroundColor: rowBg,
                            gap: 6,
                          }}
                        >
                          {/* Delete / Cancel on extreme left */}
                          <button
                            type="button"
                            onClick={() =>
                              cancelItemByKey(row.key)
                            }
                            className="btn btn-xs action-danger"
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 6,
                              fontSize: 14,
                              padding: 0,
                              margin: 0,
                              display:'flex',
                              alignItems:'center',
                              justifyContent:'center'
                            }}
                          >
                            <MdClose />
                          </button>

                          {/* Main info */}
                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                            }}
                            onClick={() =>
                              setSelectedKey(row.key)
                            }
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                marginBottom: 2,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "#6b7280",
                                }}
                              >
                                {idx + 1}.
                              </span>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow:
                                    "ellipsis",
                                }}
                              >
                                {row.name}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                fontSize: 12,
                                color: "#6b7280",
                              }}
                            >
                              <span>Orders: {row.orderCount}</span>
                              <span>•</span>
                              <span>MRP: ₹{row.mrp}</span>
                              <span>•</span>
                              <span style={{fontWeight:'600',color:'black'}}>QTY: ({row.totalB} : {row.totalP})</span>
                            </div>
                          </div>

                          {/* Hold + Tick on right side (side by side) */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "row",
                              gap: 4,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                holdItemByKey(row.key)
                              }
                              className="btn btn-xs action-warn"
                              style={{
                                minWidth: 60,
                                height: 26,
                                fontSize: 11,
                                borderRadius: 999,
                              }}
                            >
                              HOLD
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                toggleCompleteForItemKey(
                                  row.key
                                )
                              }
                              className="btn btn-xs action-success"
                              style={{
                                minWidth: 60,
                                height: 32,
                                fontSize: 15,
                                fontWeight: 700,
                                borderRadius: 999,
                                padding: "0 14px",
                              }}
                            >
                              ✓
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  /* --------------------------- RENDER: DESKTOP --------------------------- */
  let globalIndex = 0;

  return (
    <>
      <Sidebar />
      <div className="right-side">
        <Header />

        <div
          className="page-header px-6 pt-2 pb-1"
          style={{
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span className="text-xl font-bold text-black flex items-center gap: 2">
            <span role="img" aria-label="tools">
              🛠️
            </span>{" "}
            Order Assembly
          </span>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span className="text-sm font-semibold mr-2">
              Orders Total: ₹ {ordersTotal}
            </span>
            {pendingCount > 0 && (
              <span
                className="text-xs px-2 py-1 rounded-md"
                style={{
                  background: "#FEF3C7",
                  color: "#92400E",
                }}
              >
                {pendingCount} pending
              </span>
            )}
            <button
              className="btn btn-lg action-success"
              type="button"
              onClick={handleAssemblySave}
            >
              SAVE
            </button>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="assembly-layout">
          {/* LEFT: Crate Progress */}
          <section className="panel">
            <div className="panel-header">
              Crate Progress (Counters ={" "}
              {uniqueCountersArr.length})
            </div>
            <div className="panel-body">
              <div className="crate-list">
                {uniqueCountersArr.map((c, idx) => {
                  const bp =
                    perCounterCounts.get(c.uuid) ||
                    { b: 0, p: 0 };
                  const chips =
                    ordersByCounter.get(c.uuid) || [];
                  return (
                    <div
                      key={c.uuid}
                      className="crate-item"
                    >
                      <div className="crate-tube">
                        <div
                          className="crate-fill"
                          style={{ width: "0%" }}
                        />
                        <div className="crate-text">
                          {idx + 1}. {c.title}
                          <span className="crate-orders">
                            {chips.map((o) => (
                              <span
                                key={o.number}
                                className="chip"
                              >
                                (B-{o.number} ₹
                                {Math.round(o.total)})
                              </span>
                            ))}
                          </span>
                        </div>
                        <div className="crate-count">
                          {bp.b} : {bp.p}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* RIGHT: Item Summary with per-row actions */}
          <section className="panel right-pane">
            <div className="panel-header">
              <div className="flex-row">
                <span>Item Summary</span>
              </div>
            </div>

            <div
              className="summary"
              style={{
                padding: "8px",
                maxHeight: "calc(100vh - 140px)",
                overflowY: "auto",
              }}
            >
              {/* Search bar */}
              <div style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="Search item or MRP..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    padding: "6px 10px",
                    fontSize: 14,
                  }}
                />
              </div>

              {filtered.map((group) => (
                <div
                  key={group.category}
                  style={{
                    marginBottom: 12,
                    borderRadius: 4,
                    overflow: "hidden",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {/* Category header */}
                  <div
                    style={{
                      background: "#e5f3dc",
                      padding: "6px 8px",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {group.category}
                  </div>

                  {/* Table header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "40px 1fr 70px 100px 100px 160px",
                      fontSize: 12,
                      fontWeight: 600,
                      background: "#f9fafb",
                      borderBottom:
                        "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ padding: "4px 6px" }}>
                      Sr.
                    </div>
                    <div style={{ padding: "4px 6px" }}>
                      Item
                    </div>
                    <div style={{ padding: "4px 6px" }}>
                      MRP
                    </div>
                    <div style={{ padding: "4px 6px" }}>
                      Qty (B : P)
                    </div>
                    <div style={{ padding: "4px 6px" }}>
                      Orders
                    </div>
                    <div style={{ padding: "4px 6px" }}>
                      Action
                    </div>
                  </div>

                  {group.rows.map((row) => {
                    const statusKey = rowHighlight[row.key];
                    const sr = ++globalIndex;

                    let rowBg = "#ffffff";
                    if (statusKey === "complete") rowBg = "#ecfdf3"; // light green
                    else if (statusKey === "hold") rowBg = "#FFFBEB"; // light yellow
                    else if (statusKey === "cancel") rowBg = "#FEE2E2"; // light red

                    return (
                      <div
                        key={row.key}
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "40px 1fr 70px 100px 100px 160px",
                          fontSize: 12,
                          borderBottom:
                            "1px solid #f3f4f6",
                          backgroundColor: rowBg,
                        }}
                      >
                        <div
                          style={{
                            padding: "6px 6px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {sr}
                        </div>
                        <div
                          style={{
                            padding: "6px 6px",
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            setSelectedKey(row.key)
                          }
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              marginBottom: 2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow:
                                "ellipsis",
                            }}
                          >
                            {row.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#6b7280",
                            }}
                          >
                            MRP: {row.mrp} &nbsp; Qty:{" "}
                            {row.totalB} : {row.totalP}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: "6px 6px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {row.mrp}
                        </div>
                        <div
                          style={{
                            padding: "6px 6px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {row.totalB} : {row.totalP}
                        </div>
                        <div
                          style={{
                            padding: "6px 6px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {row.orderCount}
                        </div>
                        <div
                          style={{
                            padding: "6px 6px",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              cancelItemByKey(row.key)
                            }
                            className="btn btn-xs action-danger"
                            style={{
                              minWidth: 30,
                              height: 26,
                              borderRadius: 6,
                              fontSize: 14,
                            }}
                          >
                            🗑
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              holdItemByKey(row.key)
                            }
                            className="btn btn-xs action-warn"
                            style={{
                              minWidth: 60,
                              height: 26,
                              fontSize: 11,
                              borderRadius: 999,
                            }}
                          >
                            HOLD
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              toggleCompleteForItemKey(
                                row.key
                              )
                            }
                            className="btn btn-xs action-success"
                            style={{
                              minWidth: 60,
                              height: 32,
                              fontSize: 15,
                              fontWeight: 700,
                              borderRadius: 999,
                              padding: "0 14px",
                            }}
                          >
                            ✓
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default OrderAssembly;