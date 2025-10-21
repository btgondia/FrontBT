import React from "react";

/**
 * counters: Array<{ uuid: string, title: string }>
 * counts:   Map<counter_uuid, { b:number, p:number }>
 */
const CarateProgressPane = ({ counters = [], counts = new Map() }) => {
  return (
    <div className="carate-list">
      {counters.map((c) => {
        const cp = counts.get(c.uuid) ?? { b: 0, p: 0 };
        const label = `${cp.b} : ${cp.p}`; // B : P
        return (
          <div key={c.uuid} className="carate-item">
            <div className="carate-tube" aria-label="progress">
              <div className="carate-fill" style={{ width: "0%" }} />
              <span className="carate-text">{c.title || "Unnamed Counter"}</span>
              <span className="carate-count">{label}</span>
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

export default CarateProgressPane;
