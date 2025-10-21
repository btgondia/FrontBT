// OrderPrint2.jsx

import React, { useMemo } from 'react';

const OrderPrint2 = ({ data = [], itemData = [] }) => {
  const processedData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data
      .filter(Boolean)
      .map((item) => {
        const itemInfo = itemData.find((a) => a?.item_uuid === item?.item_uuid);
        const itemQty = (+item?.b || 0) * (+itemInfo?.conversion || 1) + (+item?.p || 0);

        return {
          ...item,
          dms_erp_id: item?.dms_erp_id || itemInfo?.dms_erp_id || "-",
          dms_item_name: item?.dms_item_name || itemInfo?.dms_item_name || "-",
          qty: itemQty,
        };
      });
  }, [data, itemData]);

  if (!processedData.length) return <div>No data to display</div>;

  return (
    <table>
      <thead>
        <tr>
          <th>ERP ID</th>
          <th>Item Name</th>
          <th>Quantity</th>
        </tr>
      </thead>
      <tbody>
        {processedData.map((item, idx) => (
          <tr key={item?.item_uuid || idx}>
            <td>{item.dms_erp_id}</td>
            <td>{item.dms_item_name}</td>
            <td>{item.qty}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default OrderPrint2;
