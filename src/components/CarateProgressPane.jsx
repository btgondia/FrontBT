import React from "react";

/**
 * counters: Array<{ uuid: string, title: string }>
 * counts:   Map<counter_uuid, { b:number, p:number }>
 */
const CrateProgressPane = ({ counters = [], counts = new Map() }) => {
  return (
    <div className="crate-list">
      {counters.map((c) => {
        const cp = counts.get(c.uuid) ?? { b: 0, p: 0 };
        const label = `${cp.b} : ${cp.p}`; // B : P
        return (
          <div key={c.uuid} className="crate-item">
            <div className="crate-tube" aria-label="progress">
              <div className="crate-fill" style={{ width: "0%" }} />
              <span className="crate-text">{c.title || "Unnamed Counter"}</span>
              <span className="crate-count">{label}</span>
            </div>
          </div>
        );
      })}

      {counters.length === 0 && (
        <div className="text-gray-500">No counters in current selection.</div>
      )}
    </div>
  );
};

export default CrateProgressPane;
