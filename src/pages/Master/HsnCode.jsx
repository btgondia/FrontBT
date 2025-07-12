import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import axios from "axios";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/solid";

const HSNCode = () => {
  const [codes, setCodes] = useState([]);
  const [usersTitle, setUsersTitle] = useState("");
  const [popupForm, setPopupForm] = useState(false);
  const [payoutPopup, setPayoutPopup] = useState(false);

  const getUsers = async () => {
    const response = await axios.get("/hsn_code/getHSNCode");
    if (response?.data?.result) {
      const formatted = response.data.result.map((i) => ({
        ...i,
        hsn_code: i.hsn_code ? i.hsn_code.toString().padStart(8, "0") : "",
      }));
      localStorage.setItem("hsn_code", JSON.stringify(formatted));
      setCodes(formatted);
    }
  };

  useEffect(() => {
    getUsers();
  }, [popupForm]);


 
  return (
    <>
      <Sidebar />
      <Header />
      <div className="item-sales-container orders-report-container">
        <div id="heading">
          <h2>Users </h2>
        </div>
        <div id="item-sales-top">
          <div
            id="date-input-container"
            style={{
              overflow: "visible",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <input
              type="text"
              onChange={(e) => setUsersTitle(e.target.value)}
              value={usersTitle}
              placeholder="Search Title..."
              className="searchInput"
            />

            <div>Total Items: {codes.length}</div>
         

            <button className="theme-btn" onClick={() => setPopupForm(true)}>
              Add
            </button>
          </div>
        </div>
        <div className="table-container-user item-sales-container">
          <Table
            itemsDetails={codes.filter((a) =>!usersTitle || a.title.includes(usersTitle))}
            setPopupForm={setPopupForm}
            setPayoutPopup={setPayoutPopup}
          />
        </div>
      </div>
      {popupForm ? (
        <NewUserForm
          onSave={() => setPopupForm(false)}
          popupInfo={popupForm}
          setUsers={setCodes}
    
        />
      ) : (
        ""
      )}
      {payoutPopup ? (
        <UserPayouts
          onSave={() => setPayoutPopup(false)}
          popupInfo={payoutPopup}
          getUsers={getUsers}
        />
      ) : (
        ""
      )}
    </>
  );
};

export default HSNCode;
function Table({ itemsDetails, setPopupForm, setPayoutPopup }) {
  const [items, setItems] = useState("title");
  const [order, setOrder] = useState("asc");
  return (
    <table
      className="user-table"
      style={{ maxWidth: "100vw", height: "fit-content", overflowX: "scroll" }}
    >
      <thead>
        <tr>
          <th>S.N</th>
          <th colSpan={2}>
            {" "}
            <div className="t-head-element">
              <span>Title</span>
              <div className="sort-buttons-container">
                <button
                  onClick={() => {
                    setItems("title");
                    setOrder("asc");
                  }}
                >
                  <ChevronUpIcon className="sort-up sort-button" />
                </button>
                <button
                  onClick={() => {
                    setItems("title");
                    setOrder("desc");
                  }}
                >
                  <ChevronDownIcon className="sort-down sort-button" />
                </button>
              </div>
            </div>
          </th>
          <th colSpan={2}>
            <div className="t-head-element">
              <span>GST Percentage</span>
              <div className="sort-buttons-container"></div>
            </div>
          </th>
          <th colSpan={2}>
            <div className="t-head-element">
              <span>CSS Percentage</span>
              <div className="sort-buttons-container"></div>
            </div>
          </th>
          <th colSpan={2}>
            {" "}
            <div className="t-head-element">
              <span>HSN Code</span>
              <div className="sort-buttons-container">
                <button
                  onClick={() => {
                    setItems("hsn_code");
                    setOrder("asc");
                  }}
                >
                  <ChevronUpIcon className="sort-up sort-button" />
                </button>
                <button
                  onClick={() => {
                    setItems("hsn_code");
                    setOrder("desc");
                  }}
                >
                  <ChevronDownIcon className="sort-down sort-button" />
                </button>
              </div>
            </div>
          </th>
        </tr>
      </thead>
      <tbody className="tbody">
        {itemsDetails
          .filter((a) => a.title)
          .sort((a, b) =>
            order === "asc"
              ? typeof a[items] === "string"
                ? a[items].localeCompare(b[items])
                : a[items] - b[items]
              : typeof a[items] === "string"
              ? b[items].localeCompare(a[items])
              : b[items] - a[items]
          )
          ?.map((item, i) => (
            <tr
              key={Math.random()}
              style={{ height: "30px" }}
              onClick={(e) => {
                e.stopPropagation();
                setPopupForm({ type: "edit", data: item });
              }}
            >
              <td>{i + 1}</td>
              <td colSpan={2}>{item.title}</td>
              <td colSpan={2}>{item.gst_percentage}</td>
              <td colSpan={2}>{item.css_percentage}</td>
              <td colSpan={2}>{item.hsn_code}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}
function NewUserForm({ onSave, popupInfo, setUsers }) {
  const [data, setdata] = useState({
    title: "",
    hsn_code: "",
    gst_percentage: "",
    css_percentage: "",
    created_by: localStorage.getItem("user_uuid"),
  });
  const [errMassage, setErrorMassage] = useState("");
  useEffect(() => {
    if (popupInfo?.type === "edit")
      setdata({
        ...popupInfo.data,
        hsn_code: popupInfo.data.hsn_code
          ? popupInfo.data.hsn_code.toString().padStart(8, "0")
          : "",
      });
  }, [popupInfo.data, popupInfo?.type]);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!data.title  || !data.hsn_code) {
      setErrorMassage("Please insert title hsn_code");
      return;
    } else if (!(data.hsn_code === "" || data.hsn_code?.length === 10)) {
      setErrorMassage("Please enter 10 Numbers in Mobile");
      return;
    }
    if (popupInfo?.type === "edit") {
      const response = await axios({
        method: "put",
        url: "/hsn_code/putHSNCode",
        data,
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.data.success) {
        setUsers((prev) =>
          prev.map((i) => (i.user_uuid === data.user_uuid ? data : i))
        );
        onSave();
      }
    } else {
      const response = await axios({
        method: "post",
        url: "/hsn_code/postHSNCode",
        data,
        headers: { "Content-Type": "application/json" },
      });
      if (response.data.success) {
        setUsers((prev) => [...prev, data]);
        onSave();
      }
    }
  };

  return (
    <div className="overlay">
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
            <form className="form" onSubmit={submitHandler}>
              <div className="row">
                <h1>{popupInfo.type === "edit" ? "Edit" : "Add"} HSN Code </h1>
              </div>

              <div className="form">
                <div className="row">
                  <label className="selectLabel">
                    Title
                    <input
                      type="text"
                      name="route_title"
                      className="numberInput"
                      value={data?.title}
                      onChange={(e) =>
                        setdata({
                          ...data,
                          title: e.target.value,
                        })
                      }
                      maxLength={42}
                    />
                  </label>

                  <label className="selectLabel">
                    HSN Code
                    <input
                      type="text"
                      name="sort_order"
                      className="numberInput"
                      value={data?.hsn_code}
                      onChange={(e) =>
                        setdata({
                          ...data,
                          hsn_code: e.target.value,
                        })
                      }
                      maxLength={8}
                    />
                  </label>
                </div>
                <div className="row">
                  <label className="selectLabel" style={{ width: "50%" }}>
                  GST Percentage
                    <input
                      type="number"
                      name="sort_order"
                      className="numberInput"
                      value={data?.gst_percentage}
                      onChange={(e) =>
                        setdata({
                          ...data,
                          gst_percentage: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="selectLabel" style={{ width: "50%" }}>
                  CSS Percentage
                    <input
                      type="number"
                      name="sort_order"
                      className="numberInput"
                      value={data?.css_percentage}
                      onChange={(e) =>
                        setdata({
                          ...data,
                          css_percentage: e.target.value,
                        })
                      }
                    />
                  </label>
                
                </div>
             
              </div>
              <i style={{ color: "red" }}>
                {errMassage === "" ? "" : "Error: " + errMassage}
              </i>

              <button type="submit" className="submit">
                Save changes
              </button>
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
function UserPayouts({ onSave, popupInfo, getUsers }) {
  const [data, setdata] = useState({
    amount: 0,
    remarks: "",
  });
  const [errMassage, setErrorMassage] = useState("");

  const submitHandler = async (e) => {
    e.preventDefault();

   
    let obj = { user_uuid: popupInfo.user_uuid, ...data };
    const response = await axios({
      method: "post",
      url: "/incentiveStatment/postIncentiveStatment",
      data: obj,
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.data.success) {
      getUsers();
      onSave();
    }
  };

  return (
    <div className="overlay">
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
            <form className="form" onSubmit={submitHandler}>
              <div className="row">
                <h1>{popupInfo?.title || "User"}- Payout</h1>
              </div>

              <div className="form">
                <div className="row">
                  <label className="selectLabel">
                    Payout Amount
                    <input
                      type="number"
                      name="route_title"
                      className="numberInput"
                      value={data?.amount}
                      onChange={(e) =>
                        setdata({
                          ...data,
                          amount: e.target.value,
                        })
                      }
                      maxLength={42}
                    />
                  </label>
                </div>
                <div className="row">
                  <label className="selectLabel">
                    Remarks
                    <textarea
                      type="text"
                      name="sort_order"
                      className="numberInput"
                      value={data?.hsn_code}
                      onChange={(e) =>
                        setdata({
                          ...data,
                          hsn_code: e.target.value,
                        })
                      }
                      style={{ height: "150px" }}
                    />
                  </label>
                </div>
              </div>
              <i style={{ color: "red" }}>
                {errMassage === "" ? "" : "Error: " + errMassage}
              </i>

              <button type="submit" className="submit">
                Save changes
              </button>
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
