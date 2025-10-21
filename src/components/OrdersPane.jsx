import React from "react";
import CardOrderAssembly from "./CardOrderAssembly";

/**
 * showHeader=false to avoid duplication under panel header
 */
const OrdersPane = ({ orders = [], showHeader = false }) => {
  return (
    <div className="orders-section" style={{ borderRight: "none" }}>
      {showHeader && <div className="orders-header">Orders</div>}
      {orders.length > 0 ? (
        <div className="orders-list">
          {orders.map((order, index) => (
            <CardOrderAssembly
              key={order.order_uuid || index}
              order={order}
              title1={order.invoice_number}
              title2={order.counter_title || order.counter_name}
              dateTime={order?.status?.[0]?.time || Date.now()}
              selectedOrder={false}
              selectedCounter={false}
              setSelectOrder={() => {}}
            />
          ))}
        </div>
      ) : (
        <div className="text-gray-500 mt-10 px-6">No orders selected.</div>
      )}
    </div>
  );
};

export default OrdersPane;
