import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import "../MainAdmin/style.css";

const TOTAL_DEVICES = 20;

const normalizeFromApi = (arr = []) => {
  // API returns [{device_number, url}, ...]; ensure 1..20 present & ordered
  const map = new Map(arr.map(d => [Number(d?.device_number), d]));
  return Array.from({ length: TOTAL_DEVICES }, (_, i) => {
    const n = i + 1;
    const rec = map.get(n);
    return { device_number: n, url: (rec?.url || "").trim() };
  });
};

const AssemblyDevices = () => {
  const [devices, setDevices] = useState(
    Array.from({ length: TOTAL_DEVICES }, (_, i) => ({ device_number: i + 1, url: "" }))
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // initial load from API
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get("/api/assembly-devices");
        setDevices(normalizeFromApi(data?.devices));
      } catch (err) {
        console.error("Failed to load Assembly Devices", err);
        alert("Failed to load Assembly Devices. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const setOne = (index, val) => {
    setDevices(prev => {
      const next = [...prev];
      next[index] = { ...next[index], url: val };
      return next;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = { devices: devices.map(d => ({ device_number: d.device_number, url: (d.url || "").trim() })) };
      const { data } = await axios.put("/api/assembly-devices", payload, {
        headers: { "Content-Type": "application/json" },
      });
      setDevices(normalizeFromApi(data?.devices));
      alert("Saved!");
    } catch (err) {
      console.error("Save failed", err);
      alert("Save failed. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (e) => {
    e.preventDefault();
    // Re-fetch latest from server
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get("/api/assembly-devices");
        setDevices(normalizeFromApi(data?.devices));
      } catch (err) {
        console.error("Refresh failed", err);
        alert("Could not refresh from server.");
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <>
      <Sidebar />
      <div className="right-side">
        <Header />

        <div className="page-header px-6 pt-2 pb-1" style={{ borderBottom: "1px solid #e5e7eb" }}>
          <span className="text-xl font-bold text-black flex items-center gap-2">
            <span role="img" aria-label="plug">🔌</span> Assembly Devices
          </span>
        </div>

        <div className="assembly-grid">
          <section className="panel" style={{ gridColumn: "1 / span 2" }}>
            <div className="panel-header">Device URLs</div>

            {loading ? (
              <div className="panel-body devices-body">
                <div className="text-sm text-gray-500">Loading…</div>
              </div>
            ) : (
              <form className="panel-body devices-body" onSubmit={handleSave}>
                <div className="devices-grid">
                  {devices.map((d, i) => (
                    <label key={d.device_number} className="device-field">
                      <span className="device-label">Device {d.device_number} URL</span>
                      <input
                        className="device-input"
                        type="text"
                        placeholder={`http://192.168.x.x/update?dev=${d.device_number}&val=<n>`}
                        value={d.url || ""}
                        onChange={(e) => setOne(i, e.target.value)}
                      />
                    </label>
                  ))}
                </div>

                <div className="devices-actions">
                  <button
                    className="btn btn-lg action-success"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="btn btn-lg action-warn"
                    type="button"
                    onClick={handleCancel}
                    disabled={saving || loading}
                  >
                    Refresh
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default AssemblyDevices;
