import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "./OrderAssembly.css";

const ItemsToAssemble = () => {
  const dummyItems = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    quantity: Math.floor(Math.random() * 50) + 1,
    location: `Shelf ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}-${Math.floor(Math.random() * 10) + 1}`
  }));

  return (
    <div className="assembly-container">
      <div className="container-header">
        <h3>Items to Assemble</h3>
        <span className="item-count">{dummyItems.length} items</span>
      </div>
      <div className="container-content">
        {dummyItems.map((item) => (
          <div key={item.id} className="item-card">
            <div className="item-info">
              <h4>{item.name}</h4>
              <p className="item-details">Qty: {item.quantity} | Location: {item.location}</p>
            </div>
            <div className="item-actions">
              <button className="action-btn primary">Pick</button>
              <button className="action-btn secondary">Skip</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CrateProgress = () => {
  const dummyCrates = [
    { id: 'A', name: 'Crate A', progress: 60, items: 12, completed: 7 },
    { id: 'B', name: 'Crate B', progress: 30, items: 8, completed: 2 },
    { id: 'C', name: 'Crate C', progress: 85, items: 15, completed: 13 },
    { id: 'D', name: 'Crate D', progress: 15, items: 20, completed: 3 },
    { id: 'E', name: 'Crate E', progress: 100, items: 6, completed: 6 },
    { id: 'F', name: 'Crate F', progress: 45, items: 10, completed: 4 },
    { id: 'G', name: 'Crate G', progress: 70, items: 14, completed: 10 },
  ];

  const getProgressColor = (progress) => {
    if (progress >= 80) return '#4CAF50';
    if (progress >= 50) return '#FF9800';
    return '#F44336';
  };

  const getStatusText = (progress) => {
    if (progress === 100) return 'Complete';
    if (progress >= 80) return 'Almost Done';
    if (progress >= 50) return 'In Progress';
    return 'Started';
  };

  return (
    <div className="assembly-container">
      <div className="container-header">
        <h3>Crate Progress</h3>
        <span className="item-count">{dummyCrates.length} crates</span>
      </div>
      <div className="container-content">
        {dummyCrates.map((crate) => (
          <div key={crate.id} className="crate-card">
            <div className="crate-header">
              <h4>{crate.name}</h4>
              <span className={`status-badge ${crate.progress === 100 ? 'complete' : 'in-progress'}`}>
                {getStatusText(crate.progress)}
              </span>
            </div>
            <div className="progress-section">
              <div className="progress-info">
                <span className="progress-text">{crate.progress}% done</span>
                <span className="items-text">{crate.completed}/{crate.items} items</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${crate.progress}%`,
                    backgroundColor: getProgressColor(crate.progress)
                  }}
                ></div>
              </div>
            </div>
            <div className="crate-actions">
              <button className="action-btn outline">View Details</button>
              {crate.progress === 100 && (
                <button className="action-btn success">Mark Complete</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const OrderAssembly = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (location.state?.orders) {
      setOrders(location.state.orders);
      sessionStorage.setItem(
        "orderAssemblySelectedOrders",
        JSON.stringify(location.state.orders)
      );
    } else {
      const stored = sessionStorage.getItem("orderAssemblySelectedOrders");
      if (stored) setOrders(JSON.parse(stored));
    }
  }, [location.state]);

  return (
    <>
      <Sidebar />
      <Header />
      <div className="order-assembly-page">
        <div className="page-header">
          <h2>Order Assembly</h2>
          <div className="header-actions">
            <button className="action-btn primary">Start New Assembly</button>
            <button className="action-btn outline">Export Report</button>
          </div>
        </div>
        
        <div className="assembly-layout">
          <div className="left-section">
            <ItemsToAssemble />
          </div>
          
          <div className="right-section">
            <CrateProgress />
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderAssembly;