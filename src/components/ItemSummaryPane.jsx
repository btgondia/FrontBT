// (unchanged from your latest file)
import React from "react";

const ItemSummaryPane = ({
  search,
  setSearch,
  grouped,
  selectedKey,
  onRowClick,
  rowHighlight,
  /* NEW: show/hide revert button and handle click */
  statusByKey,         // Map-like (key -> 1|2|3) from useAssemblyProcessing
  onRevert,            // function(key)
}) => {
  const getRowBg = (k) => {
    const c = rowHighlight?.[k] || "white";
    if (c === "green") return "#e7f9ef";
    if (c === "yellow") return "#fff6e5";
    if (c === "red") return "#ffecec";
    if (c === "blue") return "#eaf3ff";
    return "#fff";
  };

  const hasAction = (k) => {
    const st = typeof statusByKey?.get === "function" ? statusByKey.get(k) : statusByKey?.[k];
    return st === 1 || st === 2 || st === 3;
  };

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search item or MRP..."
        style={{
          width: "100%",
          padding: "8px 10px",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          marginBottom: 10,
        }}
      />

      {grouped.map((g) => (
        <div key={g.category} style={{ marginBottom: 12 }}>
          <div
            style={{
              background: "#e6f3e9",
              color: "#1f462a",
              fontWeight: 700,
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid #d7e8db",
              marginBottom: 6,
            }}
          >
            {g.category}
          </div>

          <table style={{ width: "100%", background: "#fff", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f7fafc", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "8px 10px", width: 60 }}>Sr.</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Item</th>
                <th style={{ textAlign: "right", padding: "8px 10px", width: 80 }}>MRP</th>
                <th style={{ textAlign: "center", padding: "8px 10px", width: 120 }}>Qty (B : P)</th>
                <th style={{ textAlign: "center", padding: "8px 10px", width: 140 }}>
                  Order Count
                </th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r, i) => {
                const isSelected = r.key === selectedKey;
                return (
                  <tr
                    key={r.key}
                    onClick={() => onRowClick(r.key)}
                    style={{
                      cursor: "pointer",
                      background: getRowBg(r.key),
                      borderBottom: "1px solid #eef2f7",
                    }}
                  >
                    <td style={{ padding: "8px 10px" }}>{i + 1}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ fontWeight: isSelected ? 700 : 500 }}>{r.name}</div>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{r.mrp}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      {r.totalB} : {r.totalP}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <span>{r.orderCount}</span>
                      {hasAction(r.key) && (
                        <button
                          title="Revert action"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRevert?.(r.key);
                          }}
                          style={{
                            marginLeft: 8,
                            fontSize: 12,
                            padding: "3px 8px",
                            borderRadius: 999,
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            color: "#334155",
                            cursor: "pointer",
                          }}
                        >
                          ↺ Revert
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default ItemSummaryPane;
