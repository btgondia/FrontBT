import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import "./style.css";

/* ---------- helpers: item extraction ---------- */
const norm = (s) => String(s ?? "").trim().toLowerCase();

// Read items from different possible shapes of one order
function extractItemNames(order) {
  const pools = [
    order?.items,
    order?.item_details,
    order?.line_items,
    order?.Items,
    order?.OrderItems,
    order?.products,
  ].filter(Boolean);

  const names = [];
  for (const pool of pools) {
    for (const it of pool) {
      if (typeof it === "string") {
        const v = norm(it);
        if (v) names.push(v);
      } else if (it && typeof it === "object") {
        let v =
          norm(it.name) ||
          norm(it.Name) ||
          norm(it.item) ||
          norm(it.Item) ||
          norm(it.item_name) ||
          norm(it.title) ||
          norm(it.code);

        // BT fallback
        if (!v && it.item_uuid) {
          v = `id:${String(it.item_uuid)}`;
        }

        if (v) names.push(v);
      }
    }
  }
  return names;
}

const jaccard = (a, b) => {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const uni = a.size + b.size - inter;
  return inter / Math.max(1, uni);
};

/* ---------- aggregate orders -> counters ---------- */
function aggregateCounters(orders) {
  const map = new Map();
  for (const o of orders) {
    const cid =
      o.counter_id ??
      o.counter_uuid ??
      o.counterId ??
      o.counter_code ??
      o.counter ??
      o.CounterId ??
      o.CounterUUID;

    const cname =
      o.counter_title ??
      o.counter_name ??
      o.counterName ??
      o.counter ??
      o.CounterName ??
      String(cid || "—");

    if (!cid) continue;

    const key = String(cid);
    const entry =
      map.get(key) ||
      ({
        counter_id: key,
        counter_name: cname,
        items: new Set(),
      });

    for (const nm of extractItemNames(o)) entry.items.add(nm);
    map.set(key, entry);
  }
  return Array.from(map.values());
}

/* ---------- similarity + grouping engine ---------- */
// compute full similarity matrix
function computeSimMatrix(counters) {
  const n = counters.length;
  const sim = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    sim[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const s = jaccard(counters[i].items, counters[j].items);
      sim[i][j] = s;
      sim[j][i] = s;
    }
  }
  return sim;
}

// Initial balanced seeds
function initialGroups(counters, sim, groupSize) {
  const n = counters.length;
  if (!n) return [];

  const targetSize = Math.max(1, groupSize);
  const gcount = Math.ceil(n / targetSize);

  // centrality score
  const score = counters.map((_, i) =>
    sim[i].reduce((a, b) => a + b, 0)
  );
  const order = [...Array(n).keys()].sort((a, b) => score[b] - score[a]);

  const groups = Array.from({ length: gcount }, () => []);
  const currentSizes = Array(gcount).fill(0);

  let p = 0;
  for (let g = 0; g < gcount && p < order.length; g++, p++) {
    groups[g].push(order[p]);
    currentSizes[g]++;
  }

  const avgSimToGroup = (i, group) => {
    let sum = 0;
    let cnt = 0;
    for (const j of group) {
      if (j === i) continue;
      sum += sim[i][j];
      cnt++;
    }
    return cnt ? sum / cnt : 0;
  };

  for (; p < order.length; p++) {
    const ci = order[p];
    let bestG = -1;
    let bestS = -1;

    for (let gi = 0; gi < gcount; gi++) {
      if (currentSizes[gi] >= targetSize) continue;
      const s = avgSimToGroup(ci, groups[gi]);
      if (s > bestS) {
        bestS = s;
        bestG = gi;
      }
    }

    if (bestG === -1) {
      bestG = groups
        .map((gr, idx) => [idx, gr.length])
        .sort((a, b) => a[1] - b[1])[0][0];
    }

    groups[bestG].push(ci);
    currentSizes[bestG]++;
  }

  return groups;
}

// Local refinement
function refineGroups(groups, sim, groupSize) {
  const targetSize = Math.max(1, groupSize);
  const gcount = groups.length;
  const maxIters = 8;
  const improvementThreshold = 0.03;

  const avgSimToGroup = (i, group) => {
    let sum = 0;
    let cnt = 0;
    for (const j of group) {
      if (j === i) continue;
      sum += sim[i][j];
      cnt++;
    }
    return cnt ? sum / cnt : 0;
  };

  for (let iter = 0; iter < maxIters; iter++) {
    let movedAny = false;

    for (let gi = 0; gi < gcount; gi++) {
      const group = groups[gi].slice();

      for (let idx = 0; idx < group.length; idx++) {
        const i = group[idx];
        const currentGroup = groups[gi];
        if (currentGroup.length <= 1) continue;

        const curFit = avgSimToGroup(i, currentGroup);

        let bestG = gi;
        let bestDelta = 0;

        for (let gj = 0; gj < gcount; gj++) {
          if (gj === gi) continue;
          if (groups[gj].length >= targetSize) continue;

          const candFit = avgSimToGroup(i, groups[gj]);
          const delta = candFit - curFit;

          if (delta > improvementThreshold && delta > bestDelta) {
            bestDelta = delta;
            bestG = gj;
          }
        }

        if (bestG !== gi) {
          groups[gi] = currentGroup.filter((x) => x !== i);
          groups[bestG].push(i);
          movedAny = true;
        }
      }
    }

    if (!movedAny) break;
  }

  return groups;
}

// Build groups
function buildGroups(counters, groupSize) {
  const sim = computeSimMatrix(counters);
  if (!counters.length) return { groups: [], sim };

  const initial = initialGroups(counters, sim, groupSize);
  const refined = refineGroups(initial, sim, groupSize);

  return { groups: refined, sim };
}

/* ---------- diagnostics ---------- */
function bestMatches(counters) {
  const n = counters.length;
  const rows = [];
  for (let i = 0; i < n; i++) {
    let best = -1;
    let bestIdx = -1;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const s = jaccard(counters[i].items, counters[j].items);
      if (s > best) {
        best = s;
        bestIdx = j;
      }
    }
    rows.push({ i, bestIdx, score: best });
  }
  return rows;
}

function computeGroupStats(counters, groups, sim) {
  const gcount = groups.length;
  const perGroup = [];
  const matrix = Array.from({ length: gcount }, () =>
    Array(gcount).fill(0)
  );

  // intra
  for (let gi = 0; gi < gcount; gi++) {
    const idxs = groups[gi];
    let sum = 0;
    let pairs = 0;
    let min = Infinity;

    for (let a = 0; a < idxs.length; a++) {
      for (let b = a + 1; b < idxs.length; b++) {
        const s = sim[idxs[a]][idxs[b]];
        sum += s;
        pairs++;
        if (s < min) min = s;
      }
    }

    const avgIntra = pairs ? sum / pairs : 0;
    const minIntra = pairs ? min : 0;

    perGroup.push({
      avgIntra,
      minIntra,
      nearestGroup: null,
      nearestSim: 0,
    });
  }

  // group-group similarity
  for (let gi = 0; gi < gcount; gi++) {
    for (let gj = gi + 1; gj < gcount; gj++) {
      let sum = 0;
      let cnt = 0;

      for (const i of groups[gi]) {
        for (const j of groups[gj]) {
          sum += sim[i][j];
          cnt++;
        }
      }

      const avg = cnt ? sum / cnt : 0;
      matrix[gi][gj] = avg;
      matrix[gj][gi] = avg;

      if (avg > perGroup[gi].nearestSim) {
        perGroup[gi].nearestSim = avg;
        perGroup[gi].nearestGroup = gj;
      }
      if (avg > perGroup[gj].nearestSim) {
        perGroup[gj].nearestSim = avg;
        perGroup[gj].nearestGroup = gi;
      }
    }
  }

  return { perGroup, matrix };
}

/* ---------- DEMO ORDERS ---------- */
const DEMO_ORDERS = [
  { order_no: "B-1001", counter_id: "C01", counter_title: "Bharat Traders", items: ["A","B","C","D","E","F","G"] },
  { order_no: "B-1002", counter_id: "C02", counter_title: "Ganesh Stores", items: ["C","D","E","H"] },
  { order_no: "B-1003", counter_id: "C02", counter_title: "Ganesh Stores", items: ["E","H","J"] },
  { order_no: "B-1004", counter_id: "C03", counter_title: "Jalaram Agency", items: ["X","Y","Z"] },
  { order_no: "B-1005", counter_id: "C04", counter_title: "Mahesh Sales", items: ["A","B","I","J"] },
  { order_no: "B-1006", counter_id: "C05", counter_title: "Sejal Stationers", items: ["B","C","E","I","K"] },
  { order_no: "B-1007", counter_id: "C06", counter_title: "Om Traders", items: ["M","N","O","P","Q"] },
  { order_no: "B-1008", counter_id: "C07", counter_title: "Jagdamba", items: ["A","E","I","O","U"] },
  { order_no: "B-1009", counter_id: "C08", counter_title: "Shree Agency", items: ["B","C","D","E"] },
  { order_no: "B-1010", counter_id: "C09", counter_title: "Shakti Stores", items: ["D","E","F","G"] },
];

/* ---------- MAIN COMPONENT ---------- */
export default function AssemblyGrouping() {
  const location = useLocation();

  // orders from router or session
  let stateOrders =
    Array.isArray(location?.state?.orders)
      ? location.state.orders
      : [];

  let ssOrders = [];
  try {
    ssOrders = JSON.parse(
      sessionStorage.getItem("orderAssemblySelectedOrders") || "[]"
    );
    if (!Array.isArray(ssOrders)) ssOrders = [];
  } catch {
    ssOrders = [];
  }

  const realOrders = stateOrders.length ? stateOrders : ssOrders;

  const [useDemo, setUseDemo] = useState(realOrders.length === 0);
  const [groupSize, setGroupSize] = useState(10);

  const sourceOrders = useDemo ? DEMO_ORDERS : realOrders;
  const counters = useMemo(() => aggregateCounters(sourceOrders), [sourceOrders]);
  const best = useMemo(() => bestMatches(counters), [counters]);

  const groupSizeNum = Math.max(1, Number(groupSize) || 1);

  const groupData = useMemo(
    () => buildGroups(counters, groupSizeNum),
    [counters, groupSizeNum]
  );
  const groups = groupData.groups;
  const sim = groupData.sim;

  const groupStats = useMemo(
    () => computeGroupStats(counters, groups, sim),
    [counters, groups, sim]
  );

  /* ---------- TRIPS + ASSIGNMENT ---------- */
  const [tripData, setTripData] = useState([]);
  const [assignMode, setAssignMode] = useState(false);
  const [groupTrips, setGroupTrips] = useState({});
  const [assignSaving, setAssignSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadTrips = async () => {
      try {
        const response = await axios({
          method: "get",
          url: "/trips/GetTripList/" + localStorage.getItem("user_uuid"),
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.data?.success) {
          setTripData(response.data.result || []);
        }
      } catch (err) {
        if (err.name !== "CanceledError") {
          console.error("Error loading trips", err);
        }
      }
    };

    loadTrips();
    return () => controller.abort();
  }, []);

  // warehouse logic
  const warehouseId = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("warehouse") || "");
    } catch {
      return localStorage.getItem("warehouse") || "";
    }
  }, []);

  const availableTrips = useMemo(
    () =>
      (tripData || []).filter(
        (t) =>
          t.trip_uuid &&
          t.status &&
          (+warehouseId === 1 ||
            warehouseId === t.warehouse_uuid)
      ),
    [tripData, warehouseId]
  );

  // count items in each assigned trip
  const tripCounterCounts = useMemo(() => {
    const res = {};
    groups.forEach((idxs, gi) => {
      const t = groupTrips[gi];
      if (!t || !t.trip_uuid) return;
      const key = String(t.trip_uuid);
      res[key] = (res[key] || 0) + idxs.length;
    });
    return res;
  }, [groups, groupTrips]);

  /* ---------- ASSIGN TRIPS HANDLER ---------- */
  const handleAssignTrips = async () => {
    if (useDemo) {
      window.alert("Assign Trips is disabled in demo mode.");
      return;
    }

    if (!groups.length) return;

    const payload = [];

    groups.forEach((idxs, gi) => {
      const trip = groupTrips[gi];
      if (!trip || !trip.trip_uuid) return;

      const counterIds = new Set(
        idxs.map((ci) => String(counters[ci].counter_id))
      );

      sourceOrders.forEach((order) => {
        const cid =
          order.counter_id ??
          order.counter_uuid ??
          order.counterId ??
          order.counter_code ??
          order.counter ??
          order.CounterId ??
          order.CounterUUID;

        if (!cid) return;

        if (counterIds.has(String(cid))) {
          if (!order.order_uuid) return;

          payload.push({
            order_uuid: order.order_uuid,
            trip_uuid: trip.trip_uuid,
            warehouse_uuid: trip.warehouse_uuid,
          });
        }
      });
    });

    if (!payload.length) {
      window.alert("Please select a trip for at least one group.");
      return;
    }

    try {
      setAssignSaving(true);
      const res = await axios({
        method: "put",
        url: "/orders/putOrders",
        data: payload,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.data?.success) {
        window.alert("Trips assigned successfully.");
        setAssignMode(false);
      } else {
        window.alert("Unable to assign trips. Please try again.");
      }
    } catch (err) {
      console.error("Assign trips error", err);
      window.alert("Error while assigning trips.");
    } finally {
      setAssignSaving(false);
    }
  };

  return (
    <>
      <Sidebar />
      <div className="right-side">
        <Header />
        <div className="content" style={{ paddingTop: 12 }}>
          <div className="panel" style={{ width: "100%" }}>
            <div className="panel-header">
              <span>🧩 Assembly Grouping (counter-wise)</span>

              <div className="ml-auto flex-row" style={{ gap: 12 }}>
                <label className="flex-row" style={{ gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={useDemo}
                    onChange={(e) => setUseDemo(e.target.checked)}
                  />
                  <span>Use demo data</span>
                </label>

                <label className="flex-row" style={{ gap: 6 }}>
                  <span>Group size</span>
                  <input
                    className="device-input"
                    style={{ width: 80, padding: "6px 10px" }}
                    type="number"
                    min={1}
                    max={50}
                    value={groupSize}
                    onChange={(e) => setGroupSize(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div
              className="panel-body"
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr",
                gap: 12,
              }}
            >
              {/* LEFT PANEL */}
              <div className="panel" style={{ minHeight: 300 }}>
                <div className="panel-header">🔗 Best match for each counter</div>
                <div className="panel-body">
                  {!counters.length ? (
                    <div className="noOrder">No counters found</div>
                  ) : (
                    <ul className="bestmatch-list">
                      {best.map(({ i, bestIdx, score }) => {
                        const me = counters[i];
                        const mate =
                          bestIdx >= 0 ? counters[bestIdx] : null;
                        return (
                          <li key={me.counter_id} className="bestmatch-row">
                            <div className="bm-left">
                              <div className="bm-name">{me.counter_name}</div>
                              <div className="bm-sub">
                                {me.items.size} items
                              </div>
                            </div>
                            <div className="bm-arrow">⇄</div>
                            <div className="bm-right">
                              {mate ? (
                                <>
                                  <div className="bm-name">
                                    {mate.counter_name}
                                  </div>
                                  <div className="bm-sub">
                                    {mate.items.size} items • similarity{" "}
                                    {(score * 100).toFixed(0)}%
                                  </div>
                                </>
                              ) : (
                                <div className="bm-sub">No match</div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* RIGHT PANEL */}
              <div className="panel" style={{ minHeight: 300 }}>
                <div className="panel-header">
                  🧺 Grouping preview ({groups.length} groups)
                </div>

                <div className="panel-body">
                  {!groups.length ? (
                    <div className="noOrder">Nothing to group</div>
                  ) : (
                    <>
                      {/* GROUP CARDS */}
                      <div className="groups-wrap">
                        {groups.map((idxs, gi) => {
                          const stats = groupStats.perGroup[gi] || {};
                          return (
                            <div className="group-card" key={gi}>
                              <div className="group-title">
                                Group {gi + 1}{" "}
                                <span className="gt-badge">{idxs.length}</span>
                              </div>

                              <ul className="group-list">
                                {idxs.map((ci) => {
                                  const c = counters[ci];
                                  return (
                                    <li
                                      key={c.counter_id}
                                      className="group-row"
                                    >
                                      <div className="gr-name">
                                        {c.counter_name}
                                      </div>
                                      <div className="gr-sub">
                                        {c.items.size} items
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>

                              <div className="group-stats-line">
                                Avg intra:{" "}
                                {(100 * (stats.avgIntra || 0)).toFixed(0)}%
                                {" • "}
                                Min intra:{" "}
                                {(100 * (stats.minIntra || 0)).toFixed(0)}%
                                {" • "}
                                Nearest:{" "}
                                {stats.nearestGroup != null
                                  ? `G${stats.nearestGroup + 1} (${(
                                      100 * (stats.nearestSim || 0)
                                    ).toFixed(0)}%)`
                                  : "—"}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* GROUP–GROUP MATRIX */}
                      {groups.length > 1 && (
                        <div className="group-matrix-wrap">
                          <div className="group-matrix-title">
                            Group–Group similarity (avg)
                          </div>
                          <table className="group-matrix">
                            <thead>
                              <tr>
                                <th></th>
                                {groups.map((_, gi) => (
                                  <th key={gi}>G{gi + 1}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {groups.map((_, gi) => (
                                <tr key={gi}>
                                  <th>G{gi + 1}</th>
                                  {groups.map((__, gj) => (
                                    <td key={gj}>
                                      {gi === gj
                                        ? "—"
                                        : `${(
                                            100 *
                                            (groupStats.matrix[gi][gj] || 0)
                                          ).toFixed(0)}%`}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* ASSIGN TRIPS PANEL */}
                      {assignMode && (
                        <div className="assign-trips-panel">
                          <div className="assign-trips-title">
                            Assign trips to groups
                          </div>

                          {groups.map((idxs, gi) => {
                            const current = groupTrips[gi];

                            return (
                              <div
                                key={gi}
                                className="assign-trips-row"
                              >
                                <div className="assign-trips-label">
                                  G{gi + 1} ({idxs.length} counters)
                                </div>

                                <select
                                  className="assign-trip-select"
                                  value={current?.trip_uuid || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const trip = availableTrips.find(
                                      (t) =>
                                        String(t.trip_uuid) ===
                                        String(val)
                                    );
                                    setGroupTrips((prev) => ({
                                      ...prev,
                                      [gi]: trip || null,
                                    }));
                                  }}
                                >
                                  <option value="">
                                    Select trip
                                  </option>

                                  {availableTrips.map((trip) => {
                                    const key = String(trip.trip_uuid);
                                    const count =
                                      tripCounterCounts[key] || 0;

                                    return (
                                      <option
                                        key={trip.trip_uuid}
                                        value={trip.trip_uuid}
                                      >
                                        {trip.trip_title} [{count}]
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            );
                          })}

                          <div className="assign-trips-actions">
                            <button
                              className="btn action-success"
                              type="button"
                              onClick={handleAssignTrips}
                              disabled={assignSaving}
                            >
                              {assignSaving
                                ? "Assigning..."
                                : "Apply to orders"}
                            </button>

                            <button
                              className="btn"
                              type="button"
                              onClick={() => setAssignMode(false)}
                              disabled={assignSaving}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ---------- BOTTOM ACTION BAR (updated) ---------- */}
            <div
              className="sticky-actions"
              style={{ borderTop: "1px solid #e5e7eb" }}
            >
              <div className="actions-body">
                {/* removed the two coming soon buttons */}
                <button
                  className="btn action-primary"
                  type="button"
                  onClick={() => setAssignMode((prev) => !prev)}
                >
                  Assign Trips
                </button>
              </div>
            </div>
            {/* ---------- END ACTION BAR ---------- */}
          </div>
        </div>
      </div>
    </>
  );
}
