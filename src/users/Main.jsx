import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PullToRefresh from "react-simple-pull-to-refresh";
import "./style.css";
import { Link, useLocation } from "react-router-dom";
import { deleteDB, openDB } from "idb";
import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import axios from "axios";
import { refreshDb } from "../Apis/functions";
import { addtionalInfo, Version } from "../App";
import { MdLogout } from "react-icons/md";
import Prompt from "../components/Prompt";

const Main = () => {
  const [userRole, setUserRole] = useState([]);
  const [popupForm, setPopupForm] = useState(false);
  const [isSideMenuOpen, setSideMenuOpen] = useState(false);
  const [user_bal, setUserBal] = useState({});
  const { pathname } = useLocation();
  const Navigate = useNavigate();
  const [warehouseState, setWarehouseState] = useState({
    current: null,
    select: null,
  });
  const [promptState, setPromptState] = useState();
  const [loading, setLoading] = useState();

  const rolesArray = [
    {
      type: 1,
      name: "Order",
      link: "/orders",
      img: "dinein.png",
    },
    {
      type: 2,
      name: "Processing",
      link: "/processing",
      img: "dinein.png",
    },
    {
      type: 3,
      name: "Checking",
      link: "/checking",
      img: "dinein.png",
    },
    {
      type: 4,
      name: "Out For Delivery",
      link: "/delivery",
      img: "dinein.png",
    },
    {
      type: 5,
      name: "Stock Transfer",
      link: "/stock-transfer",
      img: "dinein.png",
    },
    {
      type: 6,
      name: "Collection",
      link: "/outstandingCollection",
      img: "dinein.png",
    },
    {
      type: 7,
      name: "Advance Ordering",
      link: "/advanceOrdering",
      img: "dinein.png",
    },
    {
      type: 8,
      name: "Stock Adjustments",
      link: "/stock-adjustments",
      img: "dinein.png",
    },
  ];

  const updateWarehouseState = async (selected_warehouse) => {
    if (!selected_warehouse) return;
    const db = await openDB("BT", +localStorage.getItem("IDBVersion") || 1);
    const _warehouse = await db
      .transaction("warehouse", "readwrite")
      .objectStore("warehouse")
      .get(selected_warehouse);
    setWarehouseState({
      current: {
        warehouse_uuid: _warehouse?.warehouse_uuid,
        warehouse_title: _warehouse?.warehouse_title,
      },
    });
    db.close();
  };

  useEffect(() => {
    if (!localStorage.getItem("user_uuid")) {
      return Navigate("/login");
    }

    let user_roles = localStorage.getItem("user_role");
    if (user_roles) user_roles = JSON.parse(user_roles);
    setUserRole(user_roles || []);
    updateWarehouseState(localStorage.getItem("selected_warehouse"));
    localStorage.removeItem("selectedCategories");
    return () => setUserRole([]);
  }, []);

  useEffect(() => {
    if (isSideMenuOpen) {
      axios({
        method: "get",
        url: "/users/GetUser/" + localStorage.getItem("user_uuid"),

        headers: {
          "Content-Type": "application/json",
        },
      }).then((response) => {
        if (response.data.success) setUserBal(response.data.result);
      });
    }
  }, [isSideMenuOpen]);

  const switchWarehouse = async (selected_warehouse) => {
    setLoading(true);
    try {
      localStorage.setItem("selected_warehouse", selected_warehouse);

      await axios({
        method: "put",
        url: "/users/putUser",
        data: {
          user_uuid: localStorage.getItem("user_uuid"),
          selected_warehouse,
        },
      });

      await refreshDb();
      await updateWarehouseState(selected_warehouse);
    } catch (error) { console.error(error) }
    setPromptState();
    setLoading();
  };

  const invokeAlert = (i) => {
    setWarehouseState((prev) => ({ ...prev, select: false }));
    setPromptState({
      message: `Are you sure you want to switch to warehouse '${i?.warehouse_title}'?`,
      actions: [
        {
          label: "Cancel",
          classname: "cancel",
          action: () => setPromptState(),
        },
        {
          label: "Continue",
          classname: "confirm",
          action: () => switchWarehouse(i.warehouse_uuid),
        },
      ],
    });
  };

  return (
    <>
      <PullToRefresh onRefresh={() => window.location.reload(true)}>
        <div
          className="servicePage"
          style={{ maxHeight: "100vh", minHeight: "-webkit-fill-available" }}
        >
          <button
            className="time-icon"
            type="button"
            onClick={() => setSideMenuOpen(true)}
            style={{ color: "#000", left: "1rem" }}
          >
            <MenuIcon />
          </button>
          <div className="servicesContainer">
            {userRole?.map((data, i) => (
              <Link
                key={i}
                to={pathname + rolesArray.find((a) => +a.type === +data)?.link}
                onClick={() => {}}
                className="linkDecoration"
                style={{ textDecoration: "none", height: "fit-content" }}
              >
                <div className="service">
                  <span>{rolesArray.find((a) => +a.type === +data)?.name}</span>
                </div>
              </Link>
            ))}
          </div>
          <div
            style={{
              position: "fixed",
              bottom: "60px",
              right: "10px",
              fontSize: "18px",
              textAlign:'right',
              display:'flex',
              flexDirection:'column'
            }}
          >
            Version {Version}.{localStorage.getItem("IDBVersion")}
            <small style={{opacity:.5,fontSize:11}}>{addtionalInfo}</small>
          </div>

          <button
            type="button"
            className="cartBtn"
            onClick={() => setPopupForm("refresh")}
          >
            Refresh
          </button>
        </div>
      </PullToRefresh>
      {popupForm ? (
        <Logout onSave={() => setPopupForm(false)} popupForm={popupForm} />
      ) : (
        ""
      )}
      <div
        className="user-overlay"
        style={
          isSideMenuOpen
            ? { justifyContent: "center" }
            : { justifyContent: "flex-start", left: "-9999", display: "none" }
        }
        //  className={`sidebar ${isSideMenuOpen ? "sideopen" : ""}`}
      >
        <div className="sidebar-container">
          <div className="links">
            <div id="sidebar-header">
              <div>
                <h1 style={{ color: "#fff" }}>
                  {user_bal.user_title || "Bharat Traders"}
                </h1>
                <div style={{ marginBottom: "2px" }}>
                  <span>
                    Balance Incentive: Rs {user_bal.incentive_balance}
                  </span>
                </div>
                {warehouseState?.current && (
                  <div>
                    <span>
                      Current Warehouse :{" "}
                      {warehouseState?.current?.warehouse_title}
                    </span>
                  </div>
                )}
              </div>
              <button type="button" onClick={() => setSideMenuOpen(false)}>
                <CloseIcon />
              </button>
            </div>

            <button
              className="sidebar-btn"
              type="button"
              onClick={() =>
                setWarehouseState((prev) => ({ ...prev, select: true }))
              }
            >
              <span>Switch Warehouse</span>
            </button>
            <button
              className="sidebar-btn"
              id="user-logout-btn"
              type="button"
              onClick={() => setPopupForm(true)}
            >
              <span>Logout</span>
              <MdLogout />
            </button>
          </div>
        </div>
      </div>
      {warehouseState?.select && (
        <SwitchWarehouse
          invokeAlert={invokeAlert}
          current={warehouseState?.current?.warehouse_uuid}
          close={() =>
            setWarehouseState((prev) => ({ ...prev, select: false }))
          }
        />
      )}
      {promptState && (
        <Prompt
          {...promptState}
          classes={{ wrapper: "theme-touch" }}
          loading={loading}
        />
      )}
    </>
  );
};

export default Main;

function Logout({ onSave, popupForm }) {
  const [isLoading, setIsLoading] = useState(false);

  const submitHandler = async (e) => {
    setIsLoading(true);
    try {
      e.preventDefault();
     
      if (popupForm === "refresh") {
        setTimeout(() => setIsLoading(false), 10000);
        await refreshDb();
        onSave();
      } else {
        deleteDB("BT", {
          blocked(currentVersion, blockedVersion, event) {
            console.log("IDB DELETE REQUEST BLOCKED.", {
              currentVersion,
              blockedVersion,
            });
            window.location.reload();
          },
        });
        localStorage.clear();
        sessionStorage.clear();
        window.location.assign("/login");
      }
    } catch (error) { console.error(error) }
    setIsLoading(false);
  };

  return (
    <div className="overlay" style={{ zIndex: 9999999999 }}>
      <div
        className="modal"
        style={{ height: "fit-content", width: "fit-content" }}
      >
        <div
          className="content"
          style={{
            height: "fit-content",
            padding: "20px",
            width: "fit-content",
          }}
        >
          <div style={{ overflowY: "scroll" }}>
            <form className="form">
              <div className="row">
                <h1>Are you Confirm </h1>
              </div>
              {!isLoading ? (
                <button
                  type="submit"
                  onClick={submitHandler}
                  className="submit"
                >
                  {popupForm === "refresh" ? "Refresh" : "Logout"}
                </button>
              ) : (
                <button className="submit" id="loading-screen">
                  <svg viewBox="0 0 100 100">
                    <path
                      d="M10 50A40 40 0 0 0 90 50A40 44.8 0 0 1 10 50"
                      fill="#ffffff"
                      stroke="none"
                    >
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        dur="1s"
                        repeatCount="indefinite"
                        keyTimes="0;1"
                        values="0 50 51;360 50 51"
                      ></animateTransform>
                    </path>
                  </svg>
                </button>
              )}
            </form>
          </div>
          <button onClick={onSave} className="closeButton">
            x
          </button>
        </div>
      </div>
    </div>
  );
}

function SwitchWarehouse({ close, invokeAlert, current }) {
  const [warehouses, setWarehouses] = useState();

  useEffect(() => {
    (async () => {
      const db = await openDB("BT", +localStorage.getItem("IDBVersion") || 1);
      const _warehouses = await db
        .transaction("warehouse", "readwrite")
        .objectStore("warehouse")
        .getAll();
      setWarehouses(
        _warehouses
          ?.filter((i) => (!current || i.warehouse_uuid !== current)&&i.status)
          ?.map((i) => ({
            warehouse_uuid: i.warehouse_uuid,
            warehouse_title: i.warehouse_title,
          }))
      );
    })();
  }, []);

  return (
    <div className="overlay" style={{ zIndex: 9999999999 }}>
      <div className="theme-modal theme-touch">
        <div className="flex between">
          <h2>Switch Warehouse</h2>
          <CloseIcon style={{ cursor: "pointer" }} onClick={close} />
        </div>
        <div id="warehouses-list">
          {warehouses?.map((i) => (
            <div key={i.warehouse_uuid} onClick={() => invokeAlert(i)}>
              {i.warehouse_title || (
                <small>
                  <em>N/A</em>
                </small>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
