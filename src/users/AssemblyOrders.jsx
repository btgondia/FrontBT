// src/users/AssemblyOrders.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Billing } from "../Apis/functions";
import { useLocation } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

const AssemblyOrders = ({ orderData, setOrderData }) => {
  const Location = useLocation();
  const [loading, setLoading] = useState(false);

  // Local copy of items for Assembly UI
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (orderData?.item_details) {
      setItems(orderData.item_details);
    }
  }, [orderData]);

  // Toggle item status (1=done, 2=hold, 3=cancel)
  const updateItemStatus = (index, status) => {
    const newItems = [...items];
    newItems[index].status = status;
    setItems(newItems);
  };

  // Save order (copied from ProcessingOrders.jsx with minor adjustments)
  const saveAssemblyOrder = async () => {
    setLoading(true);
    try {
      let finalData = {
        ...orderData,
        item_details: items,
      };

      // Recalculate totals before saving
      finalData = Billing(finalData);

      const time = new Date();

      // Stage transition logic (same as Processing)
      if (
        finalData?.item_details?.filter(
          (a) => +a.status === 1 || +a.status === 3
        )?.length === finalData?.item_details.length &&
        Location.pathname.includes("assembly")
      ) {
        finalData = {
          ...finalData,
          status: [
            ...finalData.status,
            {
              stage: "2",
              time: time.getTime(),
              user_uuid: localStorage.getItem("user_uuid"),
            },
          ],
        };
      }

      // Call API
      await axios.put("/orders/putOrders", [finalData]);

      // Update parent state
      setOrderData(finalData);

      toast.success("Assembly order saved successfully!");
    } catch (error) {
      console.error("Error saving assembly order:", error);
      toast.error("Failed to save assembly order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="assembly-page">
      <Toaster position="top-right" />

      <h2>Assembly Orders</h2>

      {/* Items list */}
      <div className="items-list">
        {items.map((item, index) => (
          <div key={item.item_uuid || index} className="item-row">
            <span>{item.item_name}</span>
            <div className="actions">
              <button onClick={() => updateItemStatus(index, 1)}>Done</button>
              <button onClick={() => updateItemStatus(index, 2)}>Hold</button>
              <button onClick={() => updateItemStatus(index, 3)}>Cancel</button>
            </div>
            <span>Status: {item.status || "pending"}</span>
          </div>
        ))}
      </div>

      {/* Save button */}
      <div className="save-bar">
        <button onClick={saveAssemblyOrder} disabled={loading}>
          {loading ? "Saving..." : "SAVE"}
        </button>
      </div>
    </div>
  );
};

export default AssemblyOrders;
