import { openDB } from "idb";
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { IoArrowBackOutline } from "react-icons/io5";
import axios from "axios";
import { Phone } from "@mui/icons-material";
import { HiLocationMarker } from "react-icons/hi";
import { MdOutlineOpenInNew } from "react-icons/md";

import { v4 as uuid } from "uuid";
import Loader from "../components/Loader";
import Popup from "./Popup";
import { useMemo } from "react";

const AdvanceOrdering = ({ refreshDb }) => {
  const [counters, setCounters] = useState([]);
  const [counterFilter, setCounterFilter] = useState("");
  const [routes, setRoutes] = useState([]);
  const [phonePopup, setPhonePopup] = useState(false);
  const [remarks, setRemarks] = useState(false);
  const [popupForm, setPopupForm] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectCompanyPopup, setSelectCompanyPopup] = useState(false);
  const [locationState, setLocationState] = useState();

  const params = useParams();
  const Navigate = useNavigate();
  const getIndexedDbData = async () => {
    const db = await openDB("BT", +localStorage.getItem("IDBVersion") || 1);
    let tx = await db
      .transaction("counter", "readwrite")
      .objectStore("counter");
    let counter = await tx.getAll();
    setCounters(counter?.filter((a) => +a?.status !== 0));
    let store = await db
      .transaction("routes", "readwrite")
      .objectStore("routes");
    let route = await store.getAll();
    setRoutes(route);
    db.close();
  };
  useEffect(() => {
    getIndexedDbData();
  }, []);

  const locationHandler = () => {
    if (!navigator.geolocation)
      return
    try {
      const counter_uuid = locationState?.counter_uuid;
      setLocationState((i) => ({ ...i, active: false }));
      setLoading(true);

      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const location_coords = {
            latitude: position.coords.latitude,
            longitude: +position.coords.longitude,
          };
          const response = await axios.patch(
            "/counters/update_location_coords",
            {
              counter_uuid,
              location_coords,
            }
          );
          if (response.data.success)
            setCounters((state) =>
              state.map((i) => {
                if (i.counter_uuid === counter_uuid) {
                  const counter = { ...i, location_coords };
                  openDB("BT", +localStorage.getItem("IDBVersion") || 1).then(
                    (db) =>
                      db
                        .transaction("counter", "readwrite")
                        .objectStore("counter")
                        .put(counter)
                  );
                  return counter;
                } else return i;
              })
            );
        } catch (error) {
          console.error(error);
        }
      });
    } catch (err) {
     
    } finally {
      setLoading(false);
    }
  };

  const deleteLocation = async () => {
    try {
      const counter_uuid = locationState?.counter_uuid;
      setLoading(true);
      setLocationState((i) => ({ ...i, active: false }));
      const response = await axios.patch(
        `/counters/delete_location_coords/${counter_uuid}`
      );
      if (response.data.success)
        setCounters((state) =>
          state.map((i) => {
            if (i.counter_uuid === counter_uuid) {
              const counter = { ...i, location_coords: null };
              openDB("BT", +localStorage.getItem("IDBVersion") || 1).then(
                (db) =>
                  db
                    .transaction("counter", "readwrite")
                    .objectStore("counter")
                    .put(counter)
              );
              return counter;
            } else return i;
          })
        );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Loader visible={loading} />
      <div
        className="item-sales-container orders-report-container"
        style={{ overflow: "visible", left: "0" }}
      >
        <nav
          className="user_nav nav_styling"
          style={{ top: "0", maxWidth: "500px" }}
        >
          <div className="user_menubar">
            <IoArrowBackOutline
              className="user_Back_icon"
              onClick={() => Navigate(-1)}
            />
          </div>

          <h1 style={{ width: "100%", textAlign: "center" }}>Counters</h1>
          {refresh ? (
            <button
              className="submit"
              id="loading-screen"
              style={{ padding: 0, margin: 0 }}
            >
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
          ) : (
            <button className="theme-btn" onClick={() => setPopupForm(true)}>
              Add
            </button>
          )}
        </nav>
        <div
          style={{
            position: "absolute",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            width: "100vw",
            maxWidth: "500px",
            paddingTop: "5px",
            backgroundColor: "rgb(242, 242, 242)",
          }}
        >
          <input
            type="text"
            onChange={(e) => setCounterFilter(e.target.value)}
            value={counterFilter}
            placeholder="Search Counter Title..."
            className="searchInput counterSearch"
            style={{ width: "200px" }}
          />
          {counterFilter.length >= 3 || params.route_uuid ? (
            <div
              style={{
                overflowY: "scroll",
                height: params.route_uuid ? "90vh" : "80vh",
                marginTop: params.route_uuid ? "10px" : "10px",
                width: "100%",
              }}
            >
              {/* <table className="table" style={{ width: "100vw", maxWidth: "500px" }}>
								<tbody style={{ width: "100%" }}> */}
              <div>
                {counters
                  ?.filter((a) => a.counter_title)
                  .sort((a, b) => +a.sort_order - b.sort_order)
                  ?.filter(
                    (a) =>
                      (!counterFilter ||
                        a.counter_title
                          .toLocaleLowerCase()
                          .includes(counterFilter.toLocaleLowerCase())) &&
                      (window.location.pathname.includes("route")
                        ? params.route_uuid === a.route_uuid
                        : true)
                  )
                  ?.map((item, index) => {
                    return (
                      <div
                        key={item.counter_uuid}
                        className="counterSearch"
                        // style={{ color: item.status === 2 ? "red" : "#000" }}
                        onClick={(e) => {
                          if (item.status === 2) {
                            setRemarks(item.remarks);
                          } else {
                            e.stopPropagation();
                            setSelectCompanyPopup(item.counter_uuid);
                          }
                        }}
                      >
                        <div>
                          <div style={{ width: "60%" }}>
                            {item.counter_title}
                          </div>
                          <div style={{ width: "40%" }}>
                            {
                              routes.find(
                                (a) => a?.route_uuid === item?.route_uuid
                              )?.route_title
                            }
                          </div>
                          <div className="user-counter-actions">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocationState({
                                  active: true,
                                  location: item?.location_coords,
                                  counter_uuid: item.counter_uuid,
                                });
                              }}
                            >
                              <HiLocationMarker
                                className={`location-marker ${
                                  item?.location_coords && "green"
                                }`}
                              />
                            </button>
                            {item?.mobile.length ? (
                              <Phone
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.mobile.length === 1) {
                                    window.location.assign(
                                      "tel:" + item?.mobile[0]?.mobile
                                    );
                                  } else {
                                    setPhonePopup(item.mobile);
                                  }
                                }}
                                className="user_Back_icon"
                                style={{ color: "#32bd33" }}
                              />
                            ) : (
                              ""
                            )}
                          </div>
                        </div>
                        <div>
                          <small>{item?.address}</small>
                        </div>
                      </div>
                    );
                  })}
              </div>
              {/* </tbody>
							</table> */}
            </div>
          ) : (
            <div
              className="servicesContainer"
              style={{
                width: "100%",
                padding: "20px",
                height: "90vh",
                gridAutoFlow: "row",
                gridAutoRows: "20%",
                marginTop: "20px",
                backgroundColor: "#f2f2f2",
                overflowY: "scroll",
                paddingBottom: "100px",
              }}
            >
              {routes.length
                ? routes
                    ?.sort((a, b) => a.sort_order - b.sort_order)
                    .map((data, i) => (
                      <Link
                        key={i}
                        to={
                          "#"
                          // pathname + rolesArray.find((a) => +a.type === +data)?.link
                        }
                        className="linkDecoration"
                        onClick={() => {
                          setCounterFilter("");
                          window.location.assign(
                            `/users/advanceRoute/` + data.route_uuid
                          );
                        }}
                      >
                        <div className="service">
                          <span>{data.route_title}</span>
                        </div>
                      </Link>
                    ))
                : ""}
            </div>
          )}
        </div>
      </div>
      {phonePopup ? (
        <PhoneList onSave={() => setPhonePopup(false)} mobile={phonePopup} />
      ) : (
        ""
      )}
      {remarks ? (
        <div className="overlay">
          <div
            className="modal"
            style={{
              height: "fit-content",
              width: "max-content",
              padding: "50px",
            }}
          >
            <h3>{remarks}</h3>

            <button onClick={() => setRemarks(false)} className="closeButton">
              x
            </button>
          </div>
        </div>
      ) : (
        ""
      )}
      {popupForm ? (
        <NewUserForm
          onSave={() => setPopupForm(false)}
          popupInfo={popupForm}
          refreshDbC={async () => {
            setRefresh(true);
            await refreshDb();
            await getIndexedDbData();
            setRefresh(false);
          }}
        />
      ) : (
        ""
      )}
      {locationState?.active ? (
        locationState?.location ? (
          <Popup
            close={() => setLocationState(null)}
            Content={() => (
              <div id="location-actions-wrapper">
                <a
                  href={`http://maps.google.com/maps?q=loc:${Object.values(
                    locationState?.location
                  )?.join(",")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <button id="google-maps-btn" className="update">
                    Open in Google Maps
                    <MdOutlineOpenInNew />
                  </button>
                </a>
                <button className="update red" onClick={deleteLocation}>
                  Delete Location
                </button>
              </div>
            )}
          />
        ) : (
          <Popup
            close={() => setLocationState(null)}
            Content={() => (
              <>
                <h3>
                  You can easily update your counter location with your current
                  location.
                </h3>
                <button className="update" onClick={locationHandler}>
                  Update Now
                </button>
              </>
            )}
          />
        )
      ) : (
        ""
      )}
      {selectCompanyPopup ? (
        <SelectCategoryPopup
          onSave={() => {
            Navigate("/users/advanceOrdering/" + selectCompanyPopup);
            setSelectCompanyPopup(false);
          }}
          popupForm={selectCompanyPopup}
        />
      ) : (
        ""
      )}
    </>
  );
};

export default AdvanceOrdering;
function NewUserForm({ onSave, popupInfo, refreshDbC }) {
  const [routesData, setRoutesData] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);
  const [data, setdata] = useState({});
  const [errMassage, setErrorMassage] = useState("");
  const [loading, setLoading] = useState("");
  const [otppoup, setOtpPopup] = useState(false);
  const [otp, setOtp] = useState("");
  const getRoutesData = async () => {
    const response = await axios({
      method: "get",
      url: "/routes/GetRouteList",

      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.data.success) setRoutesData(response.data.result);
  };

  const GetPaymentModes = async () => {
    const cachedData = localStorage.getItem('paymentModesData');
  
    if (cachedData) {
      setPaymentModes(JSON.parse(cachedData));
    } else {
      const response = await axios({
        method: "get",
        url: "/paymentModes/GetPaymentModesList",
        headers: {
          "Content-Type": "application/json",
        },
      });
     
      if (response.data.success) {
        localStorage.setItem('paymentModesData', JSON.stringify(response.data.result));
        setPaymentModes(response.data.result);
      }
    }
  };
  
  useEffect(() => {
    getRoutesData();
    GetPaymentModes();
  }, []);
  useEffect(() => {
    setdata({
      payment_modes: paymentModes
        ?.filter(
          (a) =>
            a.mode_uuid === "c67b54ba-d2b6-11ec-9d64-0242ac120002" ||
            a.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002"
        )
        .map((a) => a.mode_uuid),
      credit_allowed: "N",
      status: 1,
      mobile: [1, 2, 3, 4].map((a) => ({
        uuid: uuid(),
        mobile: "",
        type: "",
      })),
    });
  }, [paymentModes]);
 
  const submitHandler = async (e) => {
    e.preventDefault();
    if (!data.counter_title) {
      setErrorMassage("Please insert  Title");
      return;
    }
    setLoading(true);
    // if (data?.mobile?.length !== 10) {
    //   setErrorMassage("Please enter 10 Numbers in Mobile");
    //   return;
    // }
    if (!data.route_uuid) {
      setdata({ ...data, route_uuid: "0" });
    }

    const response = await axios({
      method: "post",
      url: "/counters/postCounter",
      data,
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.data.success) {
      refreshDbC();

      setLoading(false);
      onSave();
    }
  };
  const onChangeHandler = (e) => {
    let temp = data.payment_modes || [];
    let options = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    for (let i of options) {
      if (data?.payment_modes?.filter((a) => a === i).length)
        temp = temp?.filter((a) => a !== i);
      else temp = [...temp, i];
    }
    // temp = data.filter(a => options.filter(b => b === a.user_uuid).length)
   

    setdata((prev) => ({ ...prev, payment_modes: temp }));
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
                <h1>{popupInfo.type === "edit" ? "Edit" : "Add"} Counter </h1>
              </div>

              <div className="form">
                <div className="row">
                  <label className="selectLabel">
                    Counter Title
                    <input
                      type="text"
                      name="route_title"
                      className="numberInput"
                      value={data?.counter_title}
                      onChange={(e) =>
                        setdata({
                          ...data,
                          counter_title: e.target.value,
                        })
                      }
                      maxLength={42}
                    />
                  </label>

                  <label className="selectLabel">
                    Sort Order
                    <input
                      type="number"
                      onWheel={(e) => e.preventDefault()}
                      name="sort_order"
                      className="numberInput"
                      value={data?.sort_order}
                      onChange={(e) =>
                        setdata({
                          ...data,
                          sort_order: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <div className="row">
                  <label className="selectLabel">
                    Adress
                    <input
                      type="text"
                      name="route_title"
                      className="numberInput"
                      value={data?.address}
                      onChange={(e) =>
                        setdata({
                          ...data,
                          address: e.target.value,
                        })
                      }
                      maxLength={42}
                    />
                  </label>

                  <label className="selectLabel">
                    Route
                    <select
                      name="user_type"
                      className="select"
                      value={data?.route_uuid}
                      onChange={(e) =>
                        setdata({
                          ...data,
                          route_uuid: e.target.value,
                        })
                      }
                    >
                      <option value="">None</option>
                      {routesData
                        ?.sort((a, b) => a.sort_order - b.sort_order)
                        ?.map((a) => (
                          <option value={a.route_uuid}>{a.route_title}</option>
                        ))}
                    </select>
                  </label>
                </div>
                <div className="row">
                  <label className="selectLabel" style={{ width: "100%" }}>
                    Mobile
                    <div>
                      {data?.mobile?.map((a) => (
                        <div
                          key={a.uuid}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            margin: "5px 0",
                          }}
                        >
                          <input
                            type="number"
                            name="route_title"
                            className="numberInput"
                            value={a?.mobile}
                            style={{ width: "15ch" }}
                            disabled={a.lable?.find(
                              (c) =>
                                (c.type === "cal" || c.type === "wa") &&
                                +c.varification
                            )}
                            onChange={(e) => {
                              if (
                                e.target.value.length > 10 ||
                                a.lable?.find(
                                  (c) =>
                                    (c.type === "cal" || c.type === "wa") &&
                                    +c.varification
                                )
                              ) {
                                return;
                              }
                              setdata((prev) => ({
                                ...prev,
                                mobile: prev.mobile.map((b) =>
                                  b.uuid === a.uuid
                                    ? { ...b, mobile: e.target.value }
                                    : b
                                ),
                              }));
                            }}
                            maxLength={10}
                          />
                        </div>
                      ))}
                    </div>
                  </label>
                  <label className="selectLabel" style={{ width: "100%" }}>
                    Payment Modes
                    <select
                      className="numberInput"
                      style={{ width: "200px", height: "100px" }}
                      value={
                        data.credit_allowed === "Y"
                          ? data.payment_modes.length
                            ? [...data?.payment_modes, "unpaid"]
                            : "unpaid"
                          : data?.payment_modes
                      }
                      onChange={onChangeHandler}
                      multiple
                    >
                      {/* <option selected={occasionsTemp.length===occasionsData.length} value="all">All</option> */}
                      {paymentModes?.map((occ) => (
                        <option
                          value={occ.mode_uuid}
                          style={{ marginBottom: "5px", textAlign: "center" }}
                        >
                          {occ.mode_title}
                        </option>
                      ))}
                      <option
                        onClick={() =>
                          setdata((prev) => ({
                            ...prev,
                            credit_allowed:
                              prev.credit_allowed === "Y" ? "N" : "Y",
                          }))
                        }
                        style={{ marginBottom: "5px", textAlign: "center" }}
                        value="unpaid"
                      >
                        Unpaid
                      </option>
                    </select>
                  </label>{" "}
                </div>

                <div className="row">
                  <label className="selectLabel">
                    Status
                    <select
                      className="numberInput"
                      value={data.status}
                      onChange={(e) =>
                        setdata((prev) => ({ ...prev, status: e.target.value }))
                      }
                    >
                      {/* <option selected={occasionsTemp.length===occasionsData.length} value="all">All</option> */}

                      <option value={1}>Active</option>
                      <option value={0}>Hide</option>
                      <option value={2}>Locked</option>
                    </select>
                  </label>
                  {+data.status === 2 ? (
                    <label className="selectLabel">
                      Remarks
                      <input
                        type="text"
                        name="route_title"
                        className="numberInput"
                        value={data?.remarks}
                        onChange={(e) =>
                          setdata({
                            ...data,
                            remarks: e.target.value,
                          })
                        }
                        maxLength={42}
                      />
                    </label>
                  ) : (
                    ""
                  )}
                </div>
                <div className="row">
                  <label className="selectLabel">
                    GST
                    <input
                      type="text"
                      name="GST"
                      className="numberInput"
                      value={data?.gst}
                      onChange={(e) =>
                        setdata({
                          ...data,
                          gst: e.target.value,
                        })
                      }
                      maxLength={42}
                    />
                  </label>
                  <label className="selectLabel">
                    Food License
                    <input
                      type="text"
                      name="food_license"
                      className="numberInput"
                      value={data?.food_license}
                      onChange={(e) =>
                        setdata({
                          ...data,
                          food_license: e.target.value,
                        })
                      }
                      maxLength={42}
                    />
                  </label>
                </div>
                <div className="row">
                  <label className="selectLabel">
                    Counter Code
                    <input
                      type="text"
                      name="one_pack"
                      className="numberInput"
                      value={data?.counter_code}
                      onChange={(e) =>
                        setdata({
                          ...data,
                          counter_code: e.target.value.replace(/\s/g, ""),
                        })
                      }
                    />
                  </label>
                </div>
              </div>
              <i style={{ color: "red" }}>
                {errMassage === "" ? "" : "Error: " + errMassage}
              </i>

              {loading ? (
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
              ) : (
                <button type="submit" className="submit">
                  Save changes
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
const PhoneList = ({ onSave, mobile }) => {
  return (
    <div className="overlay" style={{ zIndex: 999999999 }}>
      <div
        className="modal"
        style={{
          height: "fit-content",
          width: "max-content",
          minWidth: "250px",
        }}
      >
        <div
          className="content"
          style={{
            height: "fit-content",
            padding: "20px",
            width: "fit-content",
          }}
        >
          <div style={{ overflowY: "scroll", width: "100%" }}>
            {mobile.length ? (
              <div
                className="flex"
                style={{ flexDirection: "column", width: "100%" }}
              >
                <table
                  className="user-table"
                  style={{
                    width: "100%",
                    height: "fit-content",
                  }}
                >
                  <tbody className="tbody">
                    {mobile
                      ?.filter((i) => i?.mobile)
                      ?.map((item, i) => (
                        <tr
                          key={item?.item_uuid || Math.random()}
                          style={{
                            height: "30px",
                            width: "100%",
                          }}
                        >
                          <td
                            colSpan={3}
                            className="flex"
                            onClick={() => {
                              window.location.assign("tel:" + item?.mobile);
                              onSave();
                            }}
                          >
                            <Phone style={{ marginRight: "10px" }} />
                            {item?.mobile}
                            {item?.title||""}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                className="flex"
                style={{ flexDirection: "column", width: "100%" }}
              >
                <i>No Data Present</i>
              </div>
            )}
          </div>
          <button onClick={onSave} className="closeButton">
            x
          </button>
        </div>
      </div>
    </div>
  );
};
function SelectCategoryPopup({ onSave }) {
  const [selectedCategory, setSelectedCategory] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterCompanyTitle, setFilterCompanyTitle] = useState("");
  const [filterCategoryTitle, setFilterCategoryTitle] = useState("");
  const getRoutesData = async () => {
    const response = await axios({
      method: "get",
      url: "/itemCategories/GetItemCategoryList",

      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.data.success)
      setCategories(response.data.result.map((a) => ({ ...a, expand: true })));
  };
  
  const getCounter = async () => {
    const cachedData = localStorage.getItem('companiesData');
    
    if (cachedData) {
      setCompanies(JSON.parse(cachedData));
    } else {
      const response = await axios({
        method: "get",
        url: "/companies/getCompanies",
        headers: {
          "Content-Type": "application/json",
        },
      });
  
      if (response.data.success) {
        localStorage.setItem('companiesData', JSON.stringify(response.data.result));
        setCompanies(response.data.result);
      }
    }
  };  

  useEffect(() => {
    getRoutesData();
    getCounter();
  }, []);

  const submitHandler = async (e) => {
    e.preventDefault();
    localStorage.setItem(
      "selectedCategories",
      JSON.stringify(selectedCategory)
    );
    onSave();
  };

  const filterCategory = useMemo(
    () =>
      categories
        .filter(
          (a) =>
            !filterCategoryTitle ||
            a.category_title
              ?.toLocaleLowerCase()
              ?.includes(filterCategoryTitle?.toLocaleLowerCase())
        )

        .sort((a, b) => a?.category_title?.localeCompare(b?.category_title)),
    [filterCategoryTitle, categories]
  );
  const filteredCompany = useMemo(
    () =>
      companies.filter(
        (a) =>
          (!filterCompanyTitle ||
            a.company_title
              ?.toLocaleLowerCase()
              ?.includes(filterCompanyTitle?.toLocaleLowerCase())) &&
          filterCategory?.filter((b) => a.company_uuid === b.company_uuid)
            .length
      ),
    [companies, filterCompanyTitle, filterCategory]
  );

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
            padding: "10px",
            width: "fit-content",
          }}
        >
          <div
            className="flex"
            style={{ justifyContent: "flex-start", alignItems: "flex-start" }}
          >
            <div style={{ maxHeight: "400px", overflowY: "scroll" }}>
              <div>
                <input
                  type="text"
                  onChange={(e) => setFilterCompanyTitle(e.target.value)}
                  value={filterCompanyTitle}
                  placeholder="Search Companies..."
                  className="searchInput"
                  style={{ width: "150px" }}
                />
                <input
                  type="text"
                  onChange={(e) => setFilterCategoryTitle(e.target.value)}
                  value={filterCategoryTitle}
                  placeholder="Search Categories..."
                  className="searchInput"
                  style={{ width: "150px" }}
                />
                <table
                  className="user-table"
                  style={{
                    maxWidth: "300px",
                    height: "fit-content",
                    overflowX: "scroll",
                  }}
                >
                  <thead>
                    <tr style={{ zIndex: "999999999999" }}>
                      <th>S.N</th>
                      <th colSpan={2}> Title</th>
                    </tr>
                  </thead>
                  <tbody className="tbody">
                    {filteredCompany.map((a) => (
                      <>
                        <tr style={{ pageBreakAfter: "auto", width: "100%" }}>
                          <td colSpan={2}>
                            {a.company_title}
                            <span
                              onClick={(e) => {
                                e.stopPropagation();

                                setSelectedCategory((prev) =>
                                  prev.filter((c) =>
                                    filterCategory?.find(
                                      (b) =>
                                        a.company_uuid === b.company_uuid &&
                                        c === b.category_uuid
                                    )
                                  ).length
                                    ? prev.filter(
                                        (c) =>
                                          !filterCategory?.find(
                                            (b) =>
                                              a.company_uuid ===
                                                b.company_uuid &&
                                              c === b.category_uuid
                                          )
                                      )
                                    : [
                                        ...(prev || []),
                                        ...filterCategory
                                          ?.filter(
                                            (b) =>
                                              a.company_uuid === b.company_uuid
                                          )
                                          .map((c) => c.category_uuid),
                                      ]
                                );
                              }}
                              style={{ marginLeft: "10px" }}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  selectedCategory?.filter((c) =>
                                    filterCategory?.find(
                                      (b) =>
                                        a.company_uuid === b.company_uuid &&
                                        c === b.category_uuid
                                    )
                                  ).length ===
                                  filterCategory?.filter(
                                    (b) => a.company_uuid === b.company_uuid
                                  ).length
                                }
                                onChange={() => {}}
                                style={{ transform: "scale(1.3)" }}
                              />
                            </span>
                          </td>
                          <td
                            style={{
                              // fontSize: "20px",
                              // width: "20px",
                              transition: "all ease 1s",
                            }}
                          >
                            {selectedCategory?.filter((c) =>
                              filterCategory?.find(
                                (b) =>
                                  a.company_uuid === b.company_uuid &&
                                  c === b.category_uuid
                              )
                            ).length +
                              "/" +
                              filterCategory?.filter(
                                (b) => a.company_uuid === b.company_uuid
                              ).length}
                          </td>
                        </tr>
                        {filterCategory
                          ?.filter((b) => a.company_uuid === b.company_uuid)
                          ?.sort((a, b) =>
                            a.category_title?.localeCompare(b.category_title)
                          )
                          ?.map((item, i, array) => {
                            return (
                              <tr
                                key={Math.random()}
                                style={{ height: "30px" }}
                              >
                                <td
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    setSelectedCategory((prev) =>
                                      prev.filter(
                                        (a) => a === item.category_uuid
                                      ).length
                                        ? prev.filter(
                                            (a) => a !== item.category_uuid
                                          )
                                        : [...(prev || []), item.category_uuid]
                                    );
                                  }}
                                  className="flex"
                                  style={{
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedCategory.find(
                                      (a) => a === item.category_uuid
                                    )}
                                    style={{
                                      transform: "scale(1.3)",
                                    }}
                                  />
                                  {i + 1}
                                </td>

                                <td colSpan={2}>{item.category_title || ""}</td>
                              </tr>
                            );
                          })}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <button className="fieldEditButton" onClick={submitHandler}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
