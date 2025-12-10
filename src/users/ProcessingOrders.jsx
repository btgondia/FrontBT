import axios from "axios"
import Select from "react-select"
import React, { useEffect, useState, useRef } from "react"
import { openDB } from "idb"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { AiOutlineSearch } from "react-icons/ai"
import { AiFillPlayCircle } from "react-icons/ai"
import { AiOutlineReload } from "react-icons/ai"
import { IoArrowBackOutline } from "react-icons/io5"
import { Phone } from "@mui/icons-material"
import { ArrowDropDown } from "@mui/icons-material"
import CloseIcon from "@mui/icons-material/Close"
import HomeIcon from "@mui/icons-material/Home"
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import { Billing, audioLoopFunction, audioAPIFunction } from "../Apis/functions"
import DiliveryReplaceMent from "../components/DiliveryReplaceMent"
const ORDER_ASSEMBLY_SS_KEY = "orderAssemblySelectedOrders";

const selected_order_label = "SELECTED_PROCESSING_ORDER"

const ProcessingOrders = () => {
	const params = useParams()
	const audiosRef = useRef()
	const Location = useLocation()
	const navigate = useNavigate()

	const [BarcodeMessage, setBarcodeMessage] = useState([])
	const [minMaxPopup, setMinMaxPopup] = useState()
	const [itemChanged, setItemChanged] = useState([])
	const [popupDelivery, setPopupDelivery] = useState(false)
	const [checking, setChecking] = useState(true)
	const [confirmPopup, setConfirmPopup] = useState(false)
	const [popupBarcode, setPopupBarcode] = useState(false)
	const [deliveryMessage, setDeliveryMessage] = useState(false)
	const [holdPopup, setHoldPopup] = useState(false)
	const [popupForm, setPopupForm] = useState(false)
	const [orders, setOrders] = useState([])
	const [items, setItems] = useState([])
	const [companies, setCompanies] = useState([])
	const [paymentModes, setPaymentModes] = useState([])
	const [counters, setCounters] = useState([])
	const [itemCategories, setItemsCategory] = useState([])
	const [playCount, setPlayCount] = useState(1)
	const [selectedOrder, setSelectedOrder] = useState()
	const [playerSpeed, setPlayerSpeed] = useState(1)
	const [orderCreated, setOrderCreated] = useState(false)
	const [oneTimeState, setOneTimeState] = useState(false)
	const [printInvicePopup, setprintInvicePopup] = useState("")
	const [tempQuantity, setTempQuantity] = useState([])
	const [users, setUsers] = useState([])
	const [warningPopup, setWarningPopUp] = useState(false)
	const [deletePopup, setDeletePopup] = useState(false)
	const [loading, setLoading] = useState(false)
	const [phonePopup, setPhonePopup] = useState(false)
	const [dropdown, setDropDown] = useState(false)
	const [filterItemTitle, setFilterItemTile] = useState("")
	const [notesPopup, setNotesPopup] = useState(false)

	const audioCallback = elem_id => {
		setItemChanged(prev => [...prev, selectedOrder.item_details.find(a => a.item_uuid === elem_id)])
		setSelectedOrder(prev => ({
			...prev,
			item_details: prev.item_details.map(a => (a.item_uuid === elem_id ? { ...a, status: 1 } : a))
		}))
	}

	useEffect(() => {
		window.history.pushState(null, document.title, window.location.href)
		window.addEventListener("popstate", function (event) {
			if (selectedOrder) {
				setConfirmPopup(true)
				// window.history.pushState(null, document.title, window.location.href);
				navigate(1)
			} else {
				navigate(-1)
			}
		})
	}, [selectedOrder, confirmPopup])

	const getUsers = async () => {
		const response = await axios({
			method: "get",
			url: "/users/GetUserList",

			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) setUsers(response.data.result)
	}

	useEffect(() => {
		let data = sessionStorage.getItem("playCount")
		if (data) {
			setPlayCount(data)
		}
		getUsers()
	}, [])

	const getIndexedDbData = async () => {
		const db = await openDB("BT", +localStorage.getItem("IDBVersion") || 1)
		let tx = await db.transaction("items", "readwrite").objectStore("items")
		let item = await tx.getAll()
		setItems(item)
		let store = await db.transaction("companies", "readwrite").objectStore("companies")
		let company = await store.getAll()
		setCompanies(company)
		store = await db.transaction("item_category", "readwrite").objectStore("item_category")
		let route = await store.getAll()
		setItemsCategory(route)
		store = await db.transaction("counter", "readwrite").objectStore("counter")
		let countersData = await store.getAll()
		setCounters(countersData)
		store = await db.transaction("payment_modes", "readwrite").objectStore("payment_modes")
		let PaymentData = await store.getAll()
		setPaymentModes(PaymentData)
		db.close()
	}

const getTripOrders = async () => {
    setLoading(true)
    try {
        const db = await openDB("BT", +localStorage.getItem("IDBVersion") || 1)
        let tx = db.transaction("items", "readonly").objectStore("items")
        let IDBItems = await tx.getAll()
        setItems(IDBItems)
        db.close()
        const response = await axios({
            method: "post",
            url: `/orders/${
                Location.pathname.includes("checking")
                    ? "GetOrderCheckingList"
                    : Location.pathname.includes("delivery")
                    ? "GetOrderDeliveryList"
                    : "GetOrderProcessingList"
            }`,
            data: {
                trip_uuid: params.trip_uuid,
                user_uuid: localStorage.getItem("user_uuid")
            }
        })
        if (response.data.success) {
            let data = response.data.result

			// first sorting: user preference based
			if (response.data?.mobileOrderSequence === 1)
				data = data.sort((a, b) => (+a.sort_order || 0) - (+b.sort_order || 0))
			else data.sort((a, b) => a.time_1 - b.time_1)

			// second sorting: priority based
			data = data.sort((a, b) => (+b.priority || 0) - +a.priority)

			// third sorting: to put all priority counters' orders altogether
			let sortedOrders = data.reduce(
				(result, order) =>
					!result.some(i => i.counter_uuid === order.counter_uuid)
						? result.concat(data.filter(i => i.counter_uuid === order.counter_uuid))
						: result,
				[]
			)

			setOrders(sortedOrders)
        }
    } catch (error) {
        
    }
    setLoading(false)
}

const openAssemblyOrders = () => {
  if (!params?.trip_uuid) return;

  const tripOrders = orders || [];

  // Store full orders in sessionStorage for Assembly page (required for SAVE)
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(
        ORDER_ASSEMBLY_SS_KEY,
        JSON.stringify(tripOrders)
      );
    }
  } catch (err) {
    console.warn("Failed to store assembly orders in session", err);
  }

  navigate(`/users/processing/${params.trip_uuid}/assembly`, {
    state: {
      fromProcessing: true,
      trip_uuid: params.trip_uuid,
      orders: tripOrders,
      itemsMaster: items,
      categoriesMaster: itemCategories,
    },
  });
};


useEffect(() => {
    getTripOrders()
    getIndexedDbData()
}, [])


	useEffect(() => {
		if (Location.pathname.includes("delivery") && selectedOrder && !checking) {
			let data = paymentModes?.filter(
				a =>
					!counters
						?.find(a => selectedOrder?.counter_uuid === a.counter_uuid)
						?.payment_modes?.filter(b => b === a.mode_uuid)?.length
			)
			if (data?.length || selectedOrder.credit_allowed !== "Y") {
				setDeliveryMessage(data || [])
				setChecking(true)
			}
		}
	}, [selectedOrder])

	useEffect(() => {
		if (!selectedOrder || !orders?.length) return
		const elem__index = +sessionStorage.getItem(selected_order_label)
		if (!elem__index) return
		const order_uuid = orders?.[elem__index]?.order_uuid
		if (!order_uuid) return
		const ivl_id = setInterval(() => {
			const elem = document.getElementById(order_uuid + selected_order_label)
			if (!elem) return
			clearInterval(ivl_id)
			elem.scrollIntoViewIfNeeded(true)
			
		}, 1000)
	}, [selectedOrder, orders])

	const postActivity = async (others = {}) => {
		try {
			let time = new Date()
			let data = {
				user_uuid: localStorage.getItem("user_uuid"),
				role: Location.pathname.includes("checking")
					? "Checking"
					: Location.pathname.includes("delivery")
					? "Delivery"
					: "Processing",
				narration:
					counters.find(a => a.counter_uuid === selectedOrder.counter_uuid)?.counter_title +
					(sessionStorage.getItem("route_title") ? ", " + sessionStorage.getItem("route_title") : ""),
				timestamp: time.getTime(),
				...others
			}
			const response = await axios({
				method: "post",
				url: "/userActivity/postUserActivity",
				data,
				headers: {
					"Content-Type": "application/json"
				}
			})
			if (response.data.success) {
				
			}
		} catch (error) {
			
		}
	}

	const postOrderData = async (
		dataArray = selectedOrder ? [selectedOrder] : orders,
		hold = false,
		preventPrintUpdate
	) => {
		setLoading(true)
		setprintInvicePopup(null)
		setPopupBarcode(false)
		setBarcodeMessage([])

		let finalData = []
		for (let orderObject of dataArray) {
			let data = orderObject
			if (data?.item_details?.filter(a => +a.status === 3)?.length && Location.pathname.includes("processing"))
				data = {
					...data,
					item_details: data.item_details.map(a => (+a.status === 3 ? { ...a, b: 0, p: 0 } : a)),
					processing_canceled: data.processing_canceled.length
						? [
								...data.processing_canceled,
								...data.item_details.filter(
									a => +a.status === 3 && !data.processing_canceled.filter(b => a.item_uuid === b.item_uuid).length
								)
						  ]
						: data?.item_details?.filter(a => +a.status === 3)
				}

			let billingData = await Billing({
				order_uuid: data?.order_uuid,
				invoice_number: `${data?.order_type}${data?.invoice_number}`,
				replacement: data.replacement,
				adjustment: data.adjustment,
				shortage: data.shortage,
				counter: counters.find(a => a.counter_uuid === data.counter_uuid),
				items: data.item_details.map(a => {
					let itemData = items.find(b => a.item_uuid === b.item_uuid)
					return {
						...itemData,
						...a
						// price: itemData?.price || 0,
					}
				})
			})

			data = {
				...data,
				...billingData,
				item_details: billingData.items
			}

			let time = new Date()
			if (
				data?.item_details?.filter(a => +a.status === 1 || +a.status === 3)?.length ===
					data?.item_details.length &&
				Location.pathname.includes("processing")
			)
				data = {
					...data,
					status: [
						...data.status,
						{
							stage: "2",
							time: time.getTime(),
							user_uuid: localStorage.getItem("user_uuid")
						}
					]
				}
			if (Location.pathname.includes("checking"))
				data = {
					...data,
					status: [
						...data.status,
						{
							stage: "3",
							time: time.getTime(),
							user_uuid: localStorage.getItem("user_uuid")
						}
					]
				}
			if (Location.pathname.includes("delivery"))
				data = {
					...data,
					status: [
						...data.status,
						{
							stage: "3.5",
							time: time.getTime(),
							user_uuid: localStorage.getItem("user_uuid")
						},
						{
							stage: "4",
							time: time.getTime(),
							user_uuid: localStorage.getItem("user_uuid")
						}
					]
				}

			data = Object.keys(data)
				.filter(key => key !== "others" || key !== "items")
				.reduce((obj, key) => {
					obj[key] = data[key]
					return obj
				}, {})

			finalData.push({
				...data,
				opened_by: 0,
				replacement: orderObject.replacement,
				replacement_mrp: orderObject.replacement_mrp,
				preventPrintUpdate
			})
		}
		

		try {
			const response = await axios({
				method: "put",
				url: "/orders/putOrders",
				data: finalData,
				headers: {
					"Content-Type": "application/json"
				}
			})
			if (response.data.success) {
				sessionStorage.setItem("playCount", playCount)
				getTripOrders()
				if (!hold) {
					let dataItem = Location.pathname.includes("processing") ? itemChanged : finalData[0]?.item_details
					let qty = `${
						dataItem?.length > 1
							? dataItem?.reduce((a, b) => (+a.b || 0) + (+b.b || 0))
							: dataItem?.length
							? dataItem[0]?.b
							: 0
					}:${
						dataItem?.length > 1
							? dataItem?.reduce((a, b) => (+a.p || 0) + (+b.p || 0))
							: dataItem?.length
							? dataItem[0]?.p
							: 0
					}`

					setHoldPopup(false)
					postActivity({
						activity:
							(Location.pathname.includes("checking")
								? "Checking"
								: Location.pathname.includes("delivery")
								? "Delivery"
								: "Processing") + " End",
						range: Location.pathname.includes("processing")
							? itemChanged.length
							: finalData[0]?.item_details?.length,
						qty,
						amt: finalData[0].order_grandtotal || 0
					})
				}
				setSelectedOrder(false)
			}
		} catch (error) {
			console.error(error)

			const circularReferenceReplacer = () => {
				const seen = new WeakSet()
				return (key, value) => {
					if (typeof value === "object" && value !== null) {
						if (seen.has(value)) {
							return "[Circular Reference]"
						}
						seen.add(value)
					}
					return value
				}
			}
		}
		setLoading(false)
	}

	const postOrderContained = async (data = selectedOrder, opened_by = 0) => {
		data = Object.keys(data)
			.filter(key => key !== "others" || key !== "items")
			.reduce((obj, key) => {
				obj[key] = data[key]
				return obj
			}, {})

		
		const response = await axios({
			method: "put",
			url: "/orders/putOrders",
			data: [{ order_uuid: data.order_uuid, opened_by }],
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) {
			getTripOrders()
			setTempQuantity([])
		}
	}

	const postHoldOrders = async orders => {
		await postOrderData(orders, true)
	}

	useEffect(() => {
		if (!orderCreated && selectedOrder) {
			postActivity({
				activity:
					(Location.pathname.includes("checking")
						? "Checking"
						: Location.pathname.includes("delivery")
						? "Delivery"
						: "Processing") + " Start"
			})
			setOrderCreated(true)
		}
	}, [oneTimeState, selectedOrder])

	const itemsSortFunction = (a, b) => {
		let aItem = items.find(i => i.item_uuid === a.item_uuid)
		let bItem = items.find(i => i.item_uuid === b.item_uuid)
		let aItemCompany = companies.find(i => i.company_uuid === aItem?.company_uuid)
		let bItemCompany = companies.find(i => i.company_uuid === bItem?.company_uuid)
		let aItemCategory = itemCategories.find(i => i.category_uuid === aItem?.category_uuid)
		let bItemCategory = itemCategories.find(i => i.category_uuid === bItem?.category_uuid)
		return (
			aItemCompany?.company_title?.localeCompare(bItemCompany?.company_title) ||
			aItemCategory?.category_title?.localeCompare(bItemCategory?.category_title) ||
			aItem?.item_title?.localeCompare(bItem?.item_title)
		)
	}

	// useEffect(() => {
	// 	if (selectedOrder)
	// 		setBarcodeFilterState(
	// 			items?.map(a => ({
	// 				item_uuid: a.item_uuid,
	// 				one_pack: a.one_pack,
	// 				qty: 0,
	// 				barcode: items.find(b => a.item_uuid === b.item_uuid)?.barcode
	// 			}))
	// 		)
	// }, [selectedOrder])

	const checkingQuantity = () => {
		setLoading(true)
		try {
			let orderData = orders
			let data = []
			let itemsDetails = []
			itemsDetails = selectedOrder
				? selectedOrder?.item_details.filter(a => a.status === 1)
				: [].concat.apply(
						[],
						orderData.map(a => a.item_details.filter(a => a.status === 1))
				  )
			let item_details = itemsDetails.reduce((acc, curr) => {
				let itemData = acc.find(item => item.item_uuid === curr.item_uuid)
				
				if (itemData) {
					itemData.b = (+itemData.b || 0) + (+curr.b || 0)
					itemData.p = (+itemData.p || 0) + (+curr.p || 0)
					itemData.free = (+itemData.free || 0) + (+curr.free || 0)
				} else {
					acc.push(curr)
				}

				return acc
			}, [])

			for (let orderItem of item_details) {
				let tempItem = tempQuantity.find(b => b.item_uuid === orderItem.item_uuid)
				let ItemData = items.find(b => b.item_uuid === orderItem.item_uuid)

				if (
					(+tempItem?.b || 0) * +(+ItemData?.conversion || 1) + (+tempItem?.p || 0) !==
					(+orderItem?.b || 0) * +(+ItemData?.conversion || 1) + orderItem?.p + (+orderItem?.free || 0)
				)
					setBarcodeMessage(prev => [
						...(prev?.length ? prev : []),
						{
							...ItemData,
							...tempItem,
							...orderItem,
							barcodeQty: (+tempItem?.b || 0) * +(+ItemData?.conversion || 1) + tempItem?.p,
							case: 1,
							qty: (+orderItem?.b || 0) * +(+ItemData?.conversion || 1) + orderItem?.p + (+orderItem?.free || 0)
						}
					])
				else data.push(orderItem)
			}
			setTimeout(() => {
				setPopupBarcode(true)
				setLoading(false)
				getTripOrders()
			}, 2000)
		} catch (error) {
			setLoading(false)
		}
	}

	const updateBillingAmount = async (order = selectedOrder) => {
		
		let billingData = await Billing({
			order_uuid: order?.order_uuid,
			invoice_number: `${order?.order_type}${order?.invoice_number}`,
			replacement: order?.replacement,
			adjustment: order?.adjustment,
			shortage: order?.shortage,
			counter: counters.find(a => a.counter_uuid === order.counter_uuid),
			items: order.item_details.map(a => {
				let itemData = items.find(b => a.item_uuid === b.item_uuid)
				return {
					...itemData,
					...a
					// price: itemData?.price || 0,
				}
			})
		})
		setSelectedOrder(prev => ({
			...prev,
			...order,
			...billingData,
			item_details: billingData.items
		}))
	}

	useEffect(() => {
		if (Location.pathname.includes("delivery")) {
			updateBillingAmount()
		}
	}, [])

	return (
		<div>
			<nav className="user_nav nav_styling" style={{ top: "0px", padding: "10px", maxWidth: "500px" }}>
				<div
					className="user_menubar flex"
					style={{
						width: selectedOrder ? "fit-content" : "160px",
						justifyContent: "space-between"
					}}
				>
					<IoArrowBackOutline
						className="user_Back_icon"
						onClick={() => {
							if (selectedOrder) {
								setConfirmPopup(true)
							} else {
								if (Location.pathname.includes("processing")) navigate("/users/processing")
								else if (Location.pathname.includes("checking")) navigate("/users/checking")
								else if (Location.pathname.includes("delivery")) navigate("/users/delivery")
							}
						}}
					/>
					{!selectedOrder ? (
						<HomeIcon
							className="user_Back_icon"
							onClick={() => {
								navigate("/users")
							}}
						/>
					) : (
						""
					)}
				</div>

				<h1
					style={{
						width: "70%",
						textAlign: "left",
						marginLeft: "30px",
						padding: "10px 0",
						textTransform: "capitalize"
					}}
				>
					{selectedOrder ? selectedOrder.counter_title : Location?.pathname?.split("/")?.filter(i => i)?.[1]}
				</h1>
				{!selectedOrder ? (
					<div className="user_menubar flex" style={{ width: "160px", justifyContent: "space-between" }}>
						<AiOutlineReload
							className="user_Back_icon"
							onClick={() => {
								if (selectedOrder) {
									setConfirmPopup(true)
								} else getTripOrders()
							}}
						/>
					</div>
				) : (
					""
				)}
				{!selectedOrder ? (
					<>
						<div className="inputs">
							<div
								id="customer-dropdown-trigger"
								className={"active"}
								style={{
									transform: dropdown ? "rotate(0deg)" : "rotate(180deg)",
									width: "30px",
									height: "30px",
									backgroundColor: "#fff"
								}}
								onClick={e => {
									setDropDown(prev => !prev)
								}}
							>
								<ArrowDropDown style={{ color: "green" }} />
							</div>
						</div>

						{selectedOrder &&
						!(Location.pathname.includes("checking") || Location.pathname.includes("delivery")) ? (
							<>
								<input
									className="searchInput"
									style={{
										border: "none",
										borderBottom: "2px solid #fff",
										borderRadius: "0px",
										width: "50px",
										padding: "0 5px",
										backgroundColor: "transparent",
										color: "#fff",
										marginRight: "10px"
									}}
									value={playCount}
									onChange={e => setPlayCount(e.target.value)}
								/>
								<select
									className="audioPlayerSpeed"
									style={{
										border: "none",
										borderBottom: "2px solid #fff",
										borderRadius: "0px",
										width: "75px",
										padding: "0 5px",
										backgroundColor: "transparent",
										color: "#fff"
									}}
									defaultValue={playerSpeed}
									onChange={e => {
										
										setPlayerSpeed(e.target.value)
										audiosRef.current.forEach(i => (i.playbackRate = +e.target.value))
									}}
								>
									<option value="1">1x</option>
									<option value="1.25">1.25x</option>
									<option value="1.50">1.50x</option>
								</select>
							</>
						) : (
							""
						)}
					</>
				) : (
					""
				)}
				{selectedOrder ? (
					<h1 style={{ width: "30%", textAlign: "left", marginLeft: "10px" }}>
						Rs:{selectedOrder?.order_grandtotal}
					</h1>
				) : (
					""
				)}
			</nav>
	{dropdown ? (
  <div
    id="customer-details-dropdown"
    className={"page1 flex"}
    style={{ top: "40px", flexDirection: "column", zIndex: "200" }}
    onMouseLeave={() => setDropDown(false)}
  >
    {Location.pathname.includes("checking") ? (
      // CHECKING — Only Summary
      <button
        className="simple_Logout_button"
        onClick={() => {
          setHoldPopup("Checking Summary");
          getTripOrders();
          setDropDown(false);
        }}
      >
        Summary
      </button>
    ) : Location.pathname.includes("processing") ? (
      // PROCESSING — Summary, Hold, Assembly Orders
      <>
        <button
          className="simple_Logout_button"
          onClick={() => {
            setHoldPopup("Summary");
            getTripOrders();
            setDropDown(false);
          }}
        >
          Summary
        </button>

        <button
          className="simple_Logout_button"
          onClick={() => {
            setHoldPopup("Hold");
            getTripOrders();
            setDropDown(false);
          }}
        >
          Hold
        </button>

               <button
  className="simple_Logout_button"
  onClick={() => {
    setDropDown(false)
    openAssemblyOrders()
  }}
>
  Assembly Orders
</button>


      </>
    ) : (
      ""
    )}
  </div>
) : (
  ""
)}


			{printInvicePopup ? (
				<>
					<div className="overlay" style={{ zIndex: 9999999999 }}>
						<div className="modal" style={{ height: "fit-content", width: "max-content" }}>
							<div
								className="content"
								style={{
									height: "fit-content",
									padding: "10px",
									width: "fit-content"
								}}
							>
								<div className="flex" style={{ justifyContent: "space-between" }}>
									<h3>Print Invoice</h3>
								</div>
								<div style={{ overflowY: "scroll" }}>
									<form className="form">
										<div className="flex" style={{ justifyContent: "space-between" }}>
											<button onClick={() => setprintInvicePopup(null)} className="closeButton">
												x
											</button>

											<button
												type="button"
												className="submit"
												style={{ backgroundColor: "red" }}
												onClick={() => postOrderData([{ ...selectedOrder, to_print: 0 }])}
											>
												No
											</button>
											<button
												type="button"
												className="submit"
												onClick={() => postOrderData([{ ...selectedOrder, to_print: 1 }])}
											>
												Yes
											</button>
										</div>
									</form>
								</div>
							</div>
						</div>
					</div>
				</>
			) : (
				""
			)}
			<div
				className="item-sales-container orders-report-container"
				style={{
					width: "100vw",
					maxWidth: "500px",
					left: "0",
					top: "50px",
					textAlign: "center"
				}}
			>
				{selectedOrder ? (
					<>
						{selectedOrder?.notes?.[0]?.length && notesPopup ? (
							<NotesPopup
								onSave={() => setNotesPopup(false)}
								setSelectedOrder={setSelectedOrder}
								notesPopup={notesPopup}
								order={selectedOrder}
							/>
						) : (
							""
						)}
						<div className="flex" style={{ justifyContent: "space-between", padding: "5px" }}>
							<h2 style={{ width: "20vw", textAlign: "start" }}>{selectedOrder.invoice_number}</h2>
							{Location.pathname.includes("delivery") ? (
								<h2 style={{ width: "20vw", textAlign: "start" }}>Rs: {selectedOrder.order_grandtotal}</h2>
							) : (
								""
							)}
							{Location.pathname.includes("checking") ? (
								// <input
								//   type="text"
								//   onChange={(e) => setBarcodeFilter(e.target.value)}
								//   value={barcodeFilter}
								//   placeholder="Search Barcode..."
								//   className="searchInput"
								//   onKeyDown={(e) => {
								//     if (e.key === "Enter") barcodeFilterUpdate();
								//   }}
								// />
								<div className="user_searchbar flex">
									<AiOutlineSearch className="user_search_icon" />
									<input
										style={{ width: "45vw", maxWidth: "180px" }}
										className="searchInput"
										type="text"
										placeholder="search"
										value={filterItemTitle}
										onChange={e => setFilterItemTile(e.target.value)}
									/>
									<CloseIcon className="user_cross_icon" onClick={() => setFilterItemTile("")} />
								</div>
							) : (
								// ) : !Location.pathname.includes("delivery") ? (
								// <button
								//   className="theme-btn"
								//   style={{ width: "max-content" }}
								//   onClick={() =>
								//     audioLoopFunction({
								//       i: 0,
								//       forcePlayCount: +playCount,
								//       src: audiosRef.current,
								//       callback: audioCallback,
								//     })
								//   }
								// >
								//   Play
								// </button>
								""
							)}
							<button
								className="theme-btn"
								style={{ width: "max-content" }}
								onClick={() => {
									Location.pathname.includes("checking")
										? checkingQuantity()
										: Location.pathname.includes("delivery")
										? setPopupDelivery(true)
										: Location.pathname.includes("processing")
										? setprintInvicePopup(true)
										: postOrderData()
								}}
							>
								Save
							</button>
						</div>
					</>
				) : (
					""
				)}
				<div
					className="table-container-user item-sales-container"
					style={{
						width:
							selectedOrder && (Location.pathname.includes("delivery") || Location.pathname.includes("checking"))
								? "100%"
								: "100vw",
						overflow: "scroll",
						left: "0",
						top: "0",
						display: "flex",
						minHeight: "93vh",
						maxWidth: "500px"
					}}
				>
					<table
						className="user-table"
						style={{
							// width: "max-content",
							// minWidth: "100%",
							height: "fit-content",
							width:'auto'
						}}
					>
						<thead>
							<tr>
								{selectedOrder &&
								!(Location.pathname.includes("checking") || Location.pathname.includes("delivery")) ? (
									<th></th>
								) : (
									""
								)}
								<th>S.N</th>
								{selectedOrder ? (
									<>
										<th colSpan={3}>
											<div className="t-head-element">Item Name</div>
										</th>
										<th>
											<div className="t-head-element">MRP</div>
										</th>

										{!Location.pathname.includes("checking") ? (
											<>
												<th>
													<div className="t-head-element">Qty</div>
												</th>

												<th colSpan={Location.pathname.includes("delivery") ? 1 : 2}>
													<div className="t-head-element">Action</div>
												</th>
											</>
										) : (
											<th>Quantity</th>
										)}
									</>
								) : (
									<>
										<th colSpan={2}>
											<div className="t-head-element">Counter</div>
										</th>
										<th colSpan={2}>
											<div className="t-head-element">Route</div>
										</th>
										<th colSpan={2}>
											<div className="t-head-element">Progress</div>
										</th>
										<th>
											<div className="t-head-element">Total</div>
										</th>
										<th>
											<div className="t-head-element">Qty</div>
										</th>
										<th>
											<div className="t-head-element">User</div>
										</th>
										<th>
											<div className="t-head-element"></div>
										</th>
										<th></th>
									</>
								)}
							</tr>
						</thead>
						<tbody className="tbody">
							{selectedOrder ? (
								selectedOrder?.item_details.length ? (
									selectedOrder?.item_details
										.filter(a => a.p || a.b || a.free || +a.status !== 3)
										.filter(
											a =>
												!Location.pathname.includes("checking") ||
												(+a.status === 1 &&
													(!filterItemTitle ||
														items
															.find(b => a.item_uuid === b.item_uuid)
															?.item_title?.toLocaleLowerCase()
															?.includes(filterItemTitle.toLocaleLowerCase())))
										)
										?.sort(itemsSortFunction)
										?.map((item, i) => (
											<tr
												key={item.item_uuid+i}
												style={{
													height: window.location.pathname.includes("checking") ? "60px" : "35px",
													backgroundColor:
														window.location.pathname.includes("processing") ||
														window.location.pathname.includes("delivery")
															? +item.status === 1
																? "green"
																: +item.status === 2
																? "yellow"
																: +item.status === 3
																? "red"
																: "#fff"
															: "#fff",
													color: window.location.pathname.includes("processing")
														? +item.status === 1 || +item.status === 3
															? "#fff"
															: "#000"
														: "#000"
												}}
											>
												{selectedOrder &&
												!(Location.pathname.includes("checking") || Location.pathname.includes("delivery")) ? (
													<td
														style={{ padding: "10px", height: "50px" }}
														onClick={() => {
															setItemChanged(prev =>
																+item.status !== 1
																	? [...prev, selectedOrder.item_details.find(a => a.item_uuid === item.item_uuid)]
																	: prev
															)
															setOneTimeState()
															setSelectedOrder(prev => ({
																...prev,
																item_details: prev.item_details.map(a =>
																	a.item_uuid === item.item_uuid
																		? {
																				...a,
																				status: +a.status === 1 ? 0 : 1
																		  }
																		: a
																)
															}))

															audiosRef.current?.forEach(audio => {
																if (audio.item_uuid === item.item_uuid) {
																	audio.setAttribute("played", "true")
																}
															})
															audioLoopFunction({
																i: 0,
																src: audiosRef.current,
																callback: audioCallback
															})
														}}
													>
														{item.item_uuid === "" ? (
															<AiFillPlayCircle
																style={{
																	fontSize: "25px",
																	cursor: "pointer"
																}}
															/>
														) : +item.status !== 1 ? (
															<CheckCircleOutlineIcon />
														) : (
															""
														)}
													</td>
												) : (
													""
												)}
												<td>{i + 1}</td>
												<td
													colSpan={3}
													onClick={e => {
														e.stopPropagation()
														if (Location.pathname.includes("processing")) {
															setMinMaxPopup(item)
														} else if (Location.pathname.includes("checking")) {
															setTempQuantity(
																tempQuantity?.filter(a => a.item_uuid === item.item_uuid)?.length
																	? tempQuantity?.map(a => {
																			if (a.item_uuid === item.item_uuid) {
																				return {
																					...a,
																					b: +(a.b || 0) + parseInt((+a?.one_pack || 1) / +a.conversion),
																					p: ((a?.p || 0) + (+a?.one_pack || 1)) % +a.conversion
																				}
																			} else {
																				return a
																			}
																	  })
																	: tempQuantity?.length
																	? [
																			...tempQuantity,
																			...items
																				?.filter(a => a.item_uuid === item.item_uuid)
																				.map(a => {
																					return {
																						...a,
																						b:
																							+(a.b || 0) +
																							parseInt(((a?.p || 0) + (+a?.one_pack || 1)) / +a.conversion),

																						p: ((a?.p || 0) + (+a?.one_pack || 1)) % +a.conversion
																					}
																				})
																	  ]
																	: items
																			?.filter(a => a.item_uuid === item.item_uuid)
																			.map(a => {
																				return {
																					...a,
																					b: Math.floor(
																						(+a.b || 0) + +((+a?.p || 0) + (+a?.one_pack || 1)) / +a.conversion
																					),
																					p: ((+a?.p || 0) + (+a?.one_pack || 1)) % +a.conversion
																				}
																			})
															)
														}
													}}
													style={{ width: "200px" }}
												>
													{items.find(a => a.item_uuid === item.item_uuid)?.item_title}
												</td>
												<td>{items.find(a => a.item_uuid === item.item_uuid)?.mrp}</td>

												<td
													onClick={e => {
														e.stopPropagation()
														setOneTimeState()
														setPopupForm(items.find(a => a.item_uuid === item.item_uuid))
													}}
												>
													{Location.pathname.includes("delivery")
														? item.b === 0 && item.p === 0 && item.free
															? item.free + "(F)"
															: item.b + ":" + item.p + (item.free ? "  " + item.free + "(F)" : "")
														: Location.pathname.includes("checking")
														? (tempQuantity?.find(a => a.item_uuid === item.item_uuid)?.b || 0) +
														  ":" +
														  (tempQuantity?.find(a => a.item_uuid === item.item_uuid)?.p || 0)
														: item.b + ":" + ((+item.p || 0) + (+item.free || 0))}
												</td>
												{!(Location.pathname.includes("delivery") || Location.pathname.includes("checking")) ? (
													<>
														<td className="flex">
															<button
																className="theme-btn"
																style={{ width: "max-content" }}
																onClick={() => {
																	setOneTimeState()

																	setSelectedOrder(prev => ({
																		...prev,
																		item_details: prev.item_details.map(a =>
																			a.item_uuid === item.item_uuid
																				? {
																						...a,
																						status: +a.status === 2 ? 0 : 2
																				  }
																				: a
																		)
																	}))
																}}
															>
																Hold
															</button>
														</td>
													</>
												) : (
													""
												)}
												{!Location.pathname.includes("checking") ? (
													<td>
														<DeleteOutlineIcon
															onClick={() => {
																setOneTimeState()

																setSelectedOrder(prev => ({
																	...prev,
																	item_details: prev.item_details.map(a =>
																		a.item_uuid === item.item_uuid
																			? {
																					...a,
																					status: +a.status === 3 ? 0 : 3
																			  }
																			: a
																	)
																}))
															}}
														/>
													</td>
												) : (
													""
												)}
											</tr>
										))
								) : (
									<tr>
										<td colSpan={10} style={{ textAlign: "center" }}>
											No Data Found
										</td>
									</tr>
								)
							) : (
								orders?.map((item, i) => (
									<tr
										key={item.order_uuid + selected_order_label}
										id={item.order_uuid + selected_order_label}
										className={+item.priority ? "blink" : ""}
										style={{
											height: "60px",
											maxHeight: "100px",
											backgroundColor: +item.opened_by || item.opened_by !== "0" ? "yellow" : "#fff"
										}}
										onClick={e => {
											e.stopPropagation()
											setChecking(false)
											setWarningPopUp(item)
											setNotesPopup(true)
											if (i) sessionStorage.setItem(selected_order_label, i - 1)
										}}
									>
										<td>{i + 1}</td>
										<td colSpan={2}>{item.counter_title}</td>
										<td colSpan={2}>{item?.route_title}</td>
										<td colSpan={2}>
											{item?.item_details?.filter(a => +a.status === 1)?.length}/
											{item?.item_details
												.filter(a => !Location.pathname.includes("delivery") || +a.status !== 3)
												.filter(a => !Location.pathname.includes("checking") || +a.status === 1)?.length || 0}
										</td>
										<td>{item.order_grandtotal}</td>
										<td>
											{(item?.item_details?.length > 1
												? item?.item_details?.map(a => +a.b || 0)?.reduce((a, b) => a + b)
												: item?.item_details[0]?.b || 0) +
												":" +
												(item?.item_details?.length > 1
													? item?.item_details?.map(a => +a.p || 0)?.reduce((a, b) => a + b)
													: item?.item_details[0]?.p || 0)}
										</td>
										<td>{users.find(a => a.user_uuid === item.opened_by)?.user_title || "-"}</td>
										<td>
											{item?.mobile ? (
												<Phone
													className="user_Back_icon"
													style={{ color: "#32bd33" }}
													onClick={e => {
														e.stopPropagation()
														if (item.mobile.length === 1) {
															window.location.assign("tel:" + item?.mobile[0]?.mobile)
														} else {
															setPhonePopup(item.mobile)
														}
													}}
												/>
											) : (
												"-"
											)}
										</td>
										{!Location.pathname.includes("checking") ? (
											<td onClick={(e) => {
												e.preventDefault()
												e.stopPropagation()
												setDeletePopup(item)
											}}>
												<DeleteOutlineIcon />
											</td>
										) : (
											""
										)}
									</tr>
								))
							)}
							<tr>
								<td style={{ height: "150px", backgroundColor: "transparent" }}></td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
			{popupForm ? (
				<NewUserForm
					items={items}
					tempQuantity={tempQuantity}
					onClose={() => setPopupForm("")}
					onSave={async data => {
						setSelectedOrder(prev => ({
							...prev,
							...data
						}))
						setPopupForm(false)
						if (data) {
							let billingData = await Billing({
								order_uuid: data?.order_uuid,
								invoice_number: `${data?.order_type}${data?.invoice_number}`,
								counter: counters.find(a => a.counter_uuid === data.counter_uuid),
								items: data.item_details.map(a => {
									let itemData = items.find(b => a.item_uuid === b.item_uuid)
									return {
										...itemData,
										...a
									}
								})
							})
							setSelectedOrder(prev => ({
								...prev,
								...data,
								...billingData,
								item_details: billingData.items
							}))
						}
					}}
					setTempQuantity={setTempQuantity}
					setOrder={setSelectedOrder}
					popupInfo={popupForm}
					order={selectedOrder}
				/>
			) : (
				""
			)}
			{popupBarcode ? (
				<CheckingValues
					onSave={() => {
						setPopupBarcode(false)
						setBarcodeMessage([])
						getTripOrders()
					}}
					BarcodeMessage={BarcodeMessage}
					postOrderData={() => postOrderData(selectedOrder ? [selectedOrder] : orders, false, true)}
					selectedOrder={selectedOrder}
				/>
			) : (
				""
			)}
			{popupDelivery ? (
				<DiliveryPopup
					setLoading={setLoading}
					onSave={() => setPopupDelivery(false)}
					postOrderData={postOrderData}
					order_uuid={selectedOrder?.order_uuid}
					setSelectedOrder={setSelectedOrder}
					order={selectedOrder}
					allowed={paymentModes?.filter(
						a =>
							counters
								?.find(a => selectedOrder?.counter_uuid === a.counter_uuid)
								?.payment_modes?.filter(b => b === a.mode_uuid)?.length
					)}
					counters={counters}
					items={items}
					setOrder={a => {
						updateBillingAmount({ ...selectedOrder, ...a })
						setSelectedOrder({ ...selectedOrder, ...a })
					}}
					credit_allowed={selectedOrder.credit_allowed}
				/>
			) : (
				""
			)}
			{minMaxPopup ? (
				<MinMaxPopup
					onSave={() => setMinMaxPopup(false)}
					popupValue={minMaxPopup}
					order={selectedOrder}
					items={items}
				/>
			) : (
				""
			)}
			{holdPopup ? (
				<HoldPopup
					onSave={() => {
						setHoldPopup(false)
						getTripOrders()
					}}
					setMinMaxPopup={setMinMaxPopup}
					orders={orders}
					holdPopup={holdPopup}
					itemsData={items}
					postHoldOrders={postHoldOrders}
					checkingQuantity={checkingQuantity}
					setTempQuantity={setTempQuantity}
					tempQuantity={tempQuantity}
					categories={itemCategories}
					getTripOrders={getTripOrders}
					counter={counters}
				/>
			) : (
				""
			)}
			{phonePopup ? <PhoneList onSave={() => setPhonePopup(false)} mobile={phonePopup} /> : ""}
			{confirmPopup ? (
				<ConfirmPopup
					onSave={() => {
						setConfirmPopup(false)
						postOrderContained(selectedOrder)
						setSelectedOrder(false)
						clearInterval(+sessionStorage.getItem("intervalId"))
						// audiosRef?.current.forEach((audio) => audio.pause());
						navigator.mediaSession.playbackState = "none"
						audiosRef.current = null
						console.clear()
						setTempQuantity([])
					}}
					selectedOrder={selectedOrder}
					onClose={() => setConfirmPopup(false)}
					Navigate={navigate}
				/>
			) : (
				""
			)}
			{deliveryMessage ? (
				<DeliveryMessagePopup
					onSave={() => {
						setDeliveryMessage(false)
					}}
					data={deliveryMessage}
					credit_allowed={selectedOrder.credit_allowed || ""}
				/>
			) : (
				""
			)}
			{warningPopup ? (
				<OpenWarningMessage
					onClose={() => {
						setWarningPopUp(false)
					}}
					data={warningPopup}
					users={users}
					onSave={() => {
						setSelectedOrder(warningPopup)
						postOrderContained(warningPopup, localStorage.getItem("user_uuid"))
						setWarningPopUp(false)
					}}
				/>
			) : (
				""
			)}
			{deletePopup ? (
				<DeleteOrderPopup
					onSave={() => {
						setDeletePopup(false)
						getTripOrders()
					}}
					order={deletePopup}
					counters={counters}
					items={items}
				/>
			) : (
				""
			)}
			{loading ? (
				<div className="overlay" style={{ zIndex: "99999999999999999" }}>
					<div className="flex" style={{ width: "40px", height: "40px" }}>
						<svg viewBox="0 0 100 100">
							<path d="M10 50A40 40 0 0 0 90 50A40 44.8 0 0 1 10 50" fill="#ffffff" stroke="none">
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
					</div>
				</div>
			) : (
				""
			)}
		</div>
	)
}

export default ProcessingOrders
const DeleteOrderPopup = ({ onSave, order, counters, items }) => {
	const [disable, setDisabled] = useState(true)
	useEffect(() => {
		setTimeout(() => setDisabled(false), 3000)
	}, [])
	const PutOrder = async () => {
		let time = new Date()
		let data = {
			...order,
			status: [
				...order.status,
				{
					stage: 5,
					user_uuid: localStorage.getItem("user_uuid"),
					time: time.getTime()
				}
			],
			processing_canceled: window.location.pathname.includes("processing")
				? order.processing_canceled.length
					? [...order.processing_canceled, ...order.item_details]
					: order.item_details
				: order.processing_canceled || [],
			delivery_return: window.location.pathname.includes("delivery")
				? order.delivery_return.length
					? [...order.delivery_return, ...order.item_details]
					: order.item_details
				: order.delivery_return || [],
			item_details: order.item_details.map(a => ({ ...a, b: 0, p: 0 }))
		}

		let billingData = await Billing({
			order_uuid: data?.order_uuid,
			invoice_number: `${data?.order_type}${data?.invoice_number}`,
			replacement: data.replacement,
			adjustment: data.adjustment,
			shortage: data.shortage,
			counter: counters.find(a => a.counter_uuid === data.counter_uuid),
			items: data.item_details.map(a => {
				let itemData = items.find(b => a.item_uuid === b.item_uuid)
				return {
					...itemData,
					...a
					// price: itemData?.price || 0,
				}
			})
		})
		data = {
			...data,
			...billingData,
			item_details: billingData.items,
			edit: window.location.pathname.includes("processing")
		}
		const response = await axios({
			method: "put",
			url: "/orders/putOrders",
			data: [data],
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) {
			onSave()
		}
	}
	return (
		<div className="overlay">
			<div
				className="modal"
				style={{
					height: "fit-content",
					width: "max-content",
					paddingTop: "50px"
				}}
			>
				<h3>Complete Order will be CANCELLED</h3>

				<div className="flex">
					<button
						type="button"
						className="submit"
						onClick={() => PutOrder()}
						disabled={disable}
						style={{ opacity: disable ? "0.5" : "1" }}
					>
						Confirm
					</button>
				</div>

				<button onClick={onSave} className="closeButton">
					x
				</button>
			</div>
		</div>
	)
}
function NotesPopup({ onSave, order, setSelectedOrder, notesPopup, HoldOrder }) {
	const [notes, setNotes] = useState([])
	const [edit, setEdit] = useState(false)
	useEffect(() => {
		
		setNotes(order?.notes || [])
	}, [order])
	const submitHandler = async () => {
		const response = await axios({
			method: "put",
			url: "/orders/putOrderNotes",
			data: { notes, invoice_number: order?.invoice_number },
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) {
			setSelectedOrder(prev => ({
				...prev,
				notes
			}))
			if (notesPopup === "hold") setTimeout(HoldOrder, 2000)
			onSave()
		}
	}
	return (
		<>
			<div className="overlay" style={{ zIndex: 9999999999 }}>
				<div className="modal" style={{ height: "fit-content", width: "max-content" }}>
					<div className="flex" style={{ justifyContent: "space-between" }}>
						<h3>Order Notes</h3>
						{notesPopup === "hold" ? <h3>Please Enter Notes</h3> : ""}
					</div>
					<div
						className="content"
						style={{
							height: "fit-content",
							padding: "10px",
							width: "fit-content"
						}}
					>
						<div style={{ overflowY: "scroll" }}>
							<form className="form">
								<div className="formGroup">
									<div className="row" style={{ flexDirection: "row", alignItems: "start" }}>
										<div style={{ width: "50px" }}>Notes</div>
										<label className="selectLabel flex" style={{ width: "200px" }}>
											<textarea
												name="route_title"
												className="numberInput"
												style={{ width: "200px", height: "200px" }}
												value={notes?.toString()?.replace(/,/g, "\n")}
												onChange={e => {
													setNotes(e.target.value.split("\n"))
													setEdit(true)
												}}
											/>
										</label>
									</div>
								</div>

								<div className="flex" style={{ justifyContent: "space-between" }}>
									<button onClick={onSave} className="closeButton">
										x
									</button>
									{edit ? (
										<button type="button" className="submit" onClick={submitHandler}>
											Save
										</button>
									) : (
										""
									)}
								</div>
							</form>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
function CheckingValues({ onSave, BarcodeMessage, postOrderData, selectedOrder }) {
	const [confirmPopup, setConfirmPopup] = useState(false)
	return (
		<>
			<div className="overlay" style={{ zIndex: "999999" }}>
				<div className="modal" style={{ height: "fit-content", width: "480px" }}>
					<h1>{BarcodeMessage.length ? "Correction" : "Perfect"}</h1>
					<div
						className="content"
						style={{
							height: "fit-content"
						}}
					>
						<div style={{ overflowY: "scroll", width: "100%" }}>
							{BarcodeMessage?.filter(a => +a.case === 1).length ? (
								<div className="flex" style={{ flexDirection: "column", alignItems: "flex-start" }}>
									<i>Incorrect Quantity</i>
									<table
										className="user-table"
										style={{
											width: "100%",
											height: "fit-content"
										}}
									>
										<thead>
											<tr
												style={{
													color: "#fff",
													backgroundColor: "#7990dd",
													fontSize: "15px"
												}}
											>
												<th colSpan={2}>
													<div className="t-head-element">Item</div>
												</th>
												<th>
													<div className="t-head-element">MRP</div>
												</th>
												<th style={{ backgroundColor: "green" }}>
													<div className="t-head-element">Order</div>
												</th>
												<th style={{ backgroundColor: "red" }}>
													<div className="t-head-element">Checking</div>
												</th>
											</tr>
										</thead>
										<tbody className="tbody" style={{ fontSize: "10px" }}>
											{BarcodeMessage?.filter(a => +a.case === 1)?.map((item, i) => (
												<tr
													key={item?.item_uuid || Math.random()}
													style={{
														height: "30px",
														color: "#fff",
														backgroundColor: "#7990dd"
													}}
												>
													<td colSpan={2}>{item.item_title}</td>
													<td>{item?.mrp || 0}</td>
													<td style={{ backgroundColor: "green" }}>
														{parseInt(+item.b + (+item.p + (+item.free || 0)) / +item.conversion) || 0}:
														{parseInt((+item.p + (+item.free || 0)) % +item.conversion) || 0}
													</td>
													<td style={{ backgroundColor: "red" }}>
														{parseInt(+item.barcodeQty / +item.conversion) || 0}:
														{parseInt(+item.barcodeQty % +item.conversion) || 0}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								""
							)}

							<div className="flex" style={{ justifyContent: "space-between", width: "300px" }}>
								<button type="button" style={{ backgroundColor: "red" }} className="submit" onClick={onSave}>
									Cancel
								</button>
								<button
									type="button"
									className="submit"
									onClick={() => (selectedOrder ? postOrderData() : setConfirmPopup(true))}
								>
									Save
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
			{confirmPopup ? (
				<div className="overlay" style={{ zIndex: "999999" }}>
					<div className="modal" style={{ height: "fit-content", width: "max-content" }}>
						<h1>Move Orders to DELIVERY</h1>
						<div
							className="content"
							style={{
								height: "fit-content",
								padding: "20px",
								width: "fit-content"
							}}
						>
							<div style={{ overflowY: "scroll", width: "100%" }}>
								<div className="flex" style={{ justifyContent: "space-between" }}>
									<button type="button" style={{ backgroundColor: "red" }} className="submit" onClick={onSave}>
										No
									</button>
									<button type="button" className="submit" onClick={() => postOrderData()}>
										Yes
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			) : (
				""
			)}
		</>
	)
}
function HoldPopup({
	onSave,
	orders,
	itemsData,
	holdPopup,
	postHoldOrders,
	checkingQuantity,
	setTempQuantity,
	tempQuantity,
	categories,
	getTripOrders,
	counter,
	setMinMaxPopup
}) {
	const [items, setItems] = useState([])
	const [popupForm, setPopupForm] = useState(false)
	const [confirmPopup, setConfirmPopup] = useState(false)
	const [disabled, setDisabled] = useState(false)
	const audiosRef = useRef()
	const [popup, setPopup] = useState(false)

	const audioCallback = elem_id => {
		setItems(prev => prev.map(i => (i.item_uuid === elem_id ? { ...i, status: 1 } : i)))
	}

	const [filterItemTitle, setFilterItemTile] = useState("")
	useEffect(() => {
		let data = [].concat
			.apply(
				[],
				orders.map(a => a.item_details)
			)
			.filter(a => a.status === (holdPopup === "Hold" ? 2 : holdPopup === "Checking Summary" ? 1 : 0))
			.map((a, index) => {
				let itemDetails = itemsData?.find(b => b.item_uuid === a.item_uuid)

				return {
					...a,
					index,
					category_uuid: itemDetails?.category_uuid,
					item_title: itemDetails?.item_title,
					pronounce: itemDetails?.pronounce,
					mrp: itemDetails?.mrp
				}
			})

		let result = []
		for (let item of data) {
			var existing = result.filter(function (v, i) {
				return v.item_uuid === item.item_uuid
			})

			if (existing.length === 0) {
				let itemsFilteredData = data.filter(a => a.item_uuid === item.item_uuid)
				let b =
					itemsFilteredData.length > 1
						? itemsFilteredData?.map(c => +c.b || 0).reduce((c, d) => c + d)
						: +itemsFilteredData[0]?.b || 0
				let p =
					itemsFilteredData.length > 1
						? itemsFilteredData?.map(c => +c.p || 0).reduce((c, d) => c + d)
						: +itemsFilteredData[0]?.p || 0
				let free =
					itemsFilteredData.length > 1
						? itemsFilteredData?.map(c => +c.free || 0).reduce((c, d) => c + d)
						: +itemsFilteredData[0]?.free || 0
				const conversion = +itemsData?.find(b => b.item_uuid === item.item_uuid)?.conversion || 1
				b = parseInt(+b + (+p + free) / conversion)
				p = parseInt((+p + free) % conversion)
				let obj = {
					...item,
					free,
					b,
					p
				}
				result.push(obj)
			}
		}

		
		result.map(item =>
			setTempQuantity(prev =>
				prev?.filter(a => a.item_uuid === item.item_uuid)?.length
					? prev?.map(a =>
							a.item_uuid === item.item_uuid
								? {
										...a,
										b: +(data.b || 0),
										p: data?.p || 0
								  }
								: a
					  )
					: prev?.length
					? [
							...prev,
							...itemsData
								?.filter(a => a.item_uuid === item.item_uuid)
								.map(a => ({
									...a,
									b: +(data.b || 0),
									p: data?.p || 0
								}))
					  ]
					: itemsData
							?.filter(a => a.item_uuid === item.item_uuid)
							.map(a => ({
								...a,
								b: Math.floor(+data.b || 0 || 0),
								p: +data?.p || 0
							}))
			)
		)

		
		setItems(result)

		const audioElements = []
		let progressCount = 0

		categories
			?.filter(
				a =>
					result?.filter(b => a.category_uuid === itemsData?.find(c => b.item_uuid === c.item_uuid)?.category_uuid)
						.length
			)
			?.forEach(cat => {
				result
					?.filter(i => i.category_uuid === cat.category_uuid)
					?.forEach((item, index) => {
						if (item) {
							
							const handleQty = (value, label, sufix) =>
								value ? `${value} ${label}${value > 1 ? sufix : ""}` : ""
							const speechString = `${item.pronounce} ${item.mrp} MRP ${handleQty(
								+item.b,
								"Box",
								"es"
							)} ${handleQty(+item.p || 0, "Piece", "s")}`

							const loopEndFunctioin = audio => {
								audio.index = item.index
								audio.category_uuid = item.category_uuid
								audioElements.push(audio)
								

								if (progressCount === result?.length) {
									
									audiosRef.current = audioElements
										.sort((a, b) => +a.index - +b.index)
										.map(i => {
											i.volume = 1
											i.currentTime = 0
											return i
										})
									audioLoopFunction({
										i: 0,
										recall: true,
										src: audiosRef.current,
										callback: audioCallback
									})
								}
							}

							audioAPIFunction({
								speechString,
								elem_id: item.item_uuid,
								callback: loopEndFunctioin
							})
						} else progressCount++
					})
			})
	}, [])

	const postOrderData = async () => {
		if (holdPopup !== "Checking Summary")
			postHoldOrders(
				orders
					.filter(
						a => a.item_details.filter(b => items.filter(c => c.edit && c.item_uuid === b.item_uuid).length).length
					)
					.map(a => ({
						...a,
						item_details: a.item_details.map(a => ({
							...a,
							status: items.find(b => b.item_uuid === a.item_uuid)?.status || a.status
						}))
					}))
			)
		onSave()
	}

	
	return (
		<>
			<div className="overlay">
				<div
					className="modal"
					style={{
						height: "fit-content",
						width: "95vw",
						maxWidth: "480px",
						padding: "10px",
						paddingTop: "20px"
					}}
				>
					<h1>{holdPopup}</h1>
					<div className="user_searchbar flex" style={{ width: "100%" }}>
						<AiOutlineSearch className="user_search_icon" />
						<input
							style={{ width: "100%" }}
							className="searchInput"
							type="text"
							placeholder="search"
							value={filterItemTitle}
							onChange={e => setFilterItemTile(e.target.value)}
							id="checking_summary_search"
						/>
						<CloseIcon
							className="user_cross_icon"
							onClick={() => {
								setFilterItemTile("")
								document.getElementById("checking_summary_search").focus()
							}}
						/>
					</div>
					<div
						className="content"
						style={{
							height: "fit-content",
							padding: "20px 0",
							width: "100%"
						}}
					>
						<div style={{ overflow: "auto", width: "100%" }}>
							{items.length ? (
								<div>
									<table className="user-table">
										<thead>
											<tr>
												<th></th>
												<th colSpan={3}>
													<div className="t-head-element">Item</div>
												</th>
												<th colSpan={2}>
													<div className="t-head-element">MRP</div>
												</th>
												<th colSpan={2}>
													<div className="t-head-element">Qty</div>
												</th>
												{!window.location.pathname.includes("checking") &&
												!window.location.pathname.includes("delivery") ? (
													<th colSpan={2}></th>
												) : null}
												{!window.location.pathname.includes("checking") ? <th></th> : ""}
											</tr>
										</thead>
										<tbody className="tbody">
											{categories
												.filter(
													a =>
														items
															?.filter(
																b =>
																	a.category_uuid ===
																	itemsData?.find(c => b.item_uuid === c.item_uuid)?.category_uuid
															)
															?.filter(
																a =>
																	!filterItemTitle ||
																	a.item_title.toLocaleLowerCase().includes(filterItemTitle.toLocaleLowerCase())
															).length
												)

												.map(a => (
													<>
														<tr
															onClick={() =>
																audioLoopFunction({
																	i: 0,
																	src: audiosRef.current?.filter(i => i.category_uuid === a.category_uuid),
																	forcePlayCount: 1,
																	callback: audioCallback
																})
															}
														>
															<td colSpan={8}>
																{a.category_title} <AiFillPlayCircle />
															</td>
														</tr>
														{items
															?.filter(
																b =>
																	a.category_uuid ===
																		itemsData?.find(c => b.item_uuid === c.item_uuid)?.category_uuid &&
																	(!filterItemTitle ||
																		b.item_title.toLocaleLowerCase().includes(filterItemTitle.toLocaleLowerCase()))
															)
															.sort((a, b) => a?.item_title?.localeCompare(b?.item_title))
															.map((item, i) => (
																<tr
																	key={item?.item_uuid || Math.random()}
																	style={{
																		height: "30px",
																		fontSize: "12px",
																		color:
																			+item.status === 1
																				? "#fff"
																				: +item.status === 2
																				? "#000"
																				: +item.status === 3
																				? "#fff"
																				: "#000",
																		backgroundColor:
																			+item.status === 1
																				? "green"
																				: +item.status === 2
																				? "yellow"
																				: +item.status === 3
																				? "red"
																				: "#fff"
																	}}
																	onClick={e => {
																		e.stopPropagation()
																		setMinMaxPopup(item)
																	}}
																>
																	<td
																		style={{ padding: "5px" }}
																		onClick={e => {
																			e.stopPropagation()
																			setItems(prev =>
																				prev.map(a =>
																					a.item_uuid === item.item_uuid
																						? {
																								...a,
																								status: a.status !== 1 ? 1 : holdPopup === "Hold" ? 2 : 0,
																								edit: true
																						  }
																						: a
																				)
																			)
																		}}
																	>
																		{+item.status !== 1 ? (
																			<CheckCircleOutlineIcon style={{ width: "15px" }} />
																		) : (
																			""
																		)}
																	</td>

																	<td colSpan={3}>{item.item_title}</td>
																	<td colSpan={2}>{item.mrp}</td>

																	{!window.location.pathname.includes("checking") ? (
																		<>
																			<td
																				colSpan={2}
																				onClick={e => {
																					e.stopPropagation()
																					if (window.location.pathname.includes("processing")) setPopup(item)
																				}}
																			>
																				{item?.b || 0} : {+item?.p || 0}
																				
																			</td>
																			{!window.location.pathname.includes("delivery") ? (
																				<td colSpan={2}>
																					<button
																						className="theme-btn"
																						style={{
																							width: "max-content"
																						}}
																						onClick={e => {
																							e.stopPropagation()
																							setItems(prev =>
																								prev.map(a =>
																									a.item_uuid === item.item_uuid
																										? {
																												...a,
																												status: a.status !== 2 ? 2 : 0,
																												edit: true
																										  }
																										: a
																								)
																							)
																						}}
																					>
																						Hold
																					</button>
																				</td>
																			) : (
																				""
																			)}
																			<td
																				style={{ padding: "5px" }}
																				onClick={e => {
																					e.stopPropagation()
																					setItems(prev =>
																						prev.map(a =>
																							a.item_uuid === item.item_uuid
																								? {
																										...a,
																										status: a.status !== 3 ? 3 : holdPopup === "Hold" ? 2 : 0,
																										edit: true
																								  }
																								: a
																						)
																					)
																				}}
																			>
																				{+item.status !== 3 ? (
																					<DeleteOutlineIcon
																						style={{
																							width: "15px"
																						}}
																					/>
																				) : (
																					""
																				)}
																			</td>
																		</>
																	) : (
																		<td colSpan={2}>
																			<input
																				value={`${
																					tempQuantity?.find(a => a.item_uuid === item.item_uuid)?.b || 0
																				} : ${tempQuantity?.find(a => a.item_uuid === item.item_uuid)?.p || 0}`}
																				style={{
																					width: "60px",
																					padding: "10px 0"
																				}}
																				className="boxPcsInput"
																				onClick={e => {
																					e.stopPropagation()
																					setPopupForm(item)
																				}}
																			/>
																		</td>
																	)}
																</tr>
															))}
													</>
												))}
										</tbody>
										<tfoot style={{position:'sticky',bottom:0}}>
											<div className="flex" style={{ justifyContent: "space-between" }}>
												<button
													type="button"
													className="submit"
													style={{ backgroundColor: "red" }}
													onClick={() => {
														setConfirmPopup(true)
														setDisabled(true)
														setTimeout(() => {
															setDisabled(false)
														}, 3000)
													}}
												>
													Discard
												</button>
												{items.filter(a => a.edit).length ? (
													<>
														<button
															type="button"
															className="submit"
															onClick={async () => {
																await getTripOrders()
																postOrderData()
															}}
														>
															Save
														</button>
													</>
												) : holdPopup === "Checking Summary" ? (
													<>
														<button type="button" className="submit" onClick={checkingQuantity}>
															Save
														</button>
													</>
												) : null}
											</div>
										</tfoot>
									</table>
								</div>
							) : (
								<div className="flex" style={{ flexDirection: "column", width: "100%" }}>
									<i>No Data Present</i>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
			{popupForm ? (
				<CheckingItemInput
					onSave={() => setPopupForm(false)}
					setOrder={setItems}
					popupInfo={popupForm}
					setTempQuantity={setTempQuantity}
					items={items}
				/>
			) : (
				""
			)}
			{confirmPopup ? (
				<div className="overlay" style={{ zIndex: "9999999999999" }}>
					<div
						className="modal"
						style={{
							height: "fit-content",
							width: "max-content",
							padding: "30px"
						}}
					>
						<h2 style={{ textAlign: "center" }}>Are you sure?</h2>
						<h2 style={{ textAlign: "center" }}>Changes will be discarded</h2>
						<div
							className="content"
							style={{
								height: "fit-content",
								padding: "20px"
							}}
						>
							<div style={{ overflowY: "scroll", width: "100%" }}>
								<form className="form">
									<div className="flex" style={{ justifyContent: "space-between", width: "100%" }}>
										<button
											type="submit"
											style={{
												opacity: disabled ? "0.5" : "1",
												backgroundColor: "red"
											}}
											className="submit"
											onClick={() => {
												audiosRef.current?.[0] && audiosRef.current?.forEach(audio => audio.pause())
												audiosRef.current = null
												navigator.mediaSession.playbackState = "none"
												clearInterval(+sessionStorage.getItem("intervalId"))
												console.clear()
												onSave()
											}}
											disabled={disabled}
										>
											Continue
										</button>
										<button type="submit" className="submit" onClick={() => setConfirmPopup(false)}>
											Cancel
										</button>
									</div>
								</form>
							</div>
						</div>
					</div>
				</div>
			) : (
				""
			)}
			{popup ? (
				<OrdersEdit
					order={orders}
					onSave={() => {
						setPopup(false)
						onSave()
					}}
					items={popup}
					counter={counter}
					itemsData={itemsData}
					onClose={() => setPopup(false)}
				/>
			) : (
				""
			)}
		</>
	)
}
function CheckingItemInput({ onSave, popupInfo, setTempQuantity, items }) {
	const [data, setdata] = useState({})

	useEffect(() => {
		setdata({
			b: popupInfo?.checkB || 0,
			p: popupInfo?.checkP || 0
		})
	}, [])

	const submitHandler = async e => {
		e.preventDefault()
		setTempQuantity(prev =>
			prev?.filter(a => a.item_uuid === popupInfo.item_uuid)?.length
				? prev?.map(a =>
						a.item_uuid === popupInfo.item_uuid
							? {
									...a,
									b: +(data.b || 0),
									p: data?.p || 0
							  }
							: a
				  )
				: prev?.length
				? [
						...prev,
						...items
							?.filter(a => a.item_uuid === popupInfo.item_uuid)
							.map(a => ({
								...a,
								b: +(data.b || 0),
								p: data?.p || 0
							}))
				  ]
				: items
						?.filter(a => a.item_uuid === popupInfo.item_uuid)
						.map(a => ({
							...a,
							b: Math.floor(+data.b || 0 || 0),
							p: +data?.p || 0
						}))
		)
		onSave()
	}

	return (
		<div className="overlay">
			<div className="modal" style={{ height: "fit-content", width: "max-content" }}>
				<div
					className="content"
					style={{
						height: "fit-content",
						padding: "20px",
						width: "fit-content"
					}}
				>
					<div style={{ overflowY: "scroll" }}>
						<form className="form" onSubmit={submitHandler}>
							<div className="formGroup">
								<div className="row" style={{ flexDirection: "row", alignItems: "flex-start" }}>
									<label className="selectLabel flex" style={{ width: "100px" }}>
										Box
										<input
											type="number"
											name="route_title"
											className="numberInput"
											value={data?.b}
											style={{ width: "100px" }}
											onChange={e =>
												setdata({
													...data,
													b: e.target.value
												})
											}
											maxLength={42}
											onWheel={e => e.preventDefault()}
										/>
										{popupInfo.conversion || 0}
									</label>
									<label className="selectLabel flex" style={{ width: "100px" }}>
										Pcs
										<input
											type="number"
											name="route_title"
											className="numberInput"
											value={data?.p}
											style={{ width: "100px" }}
											onChange={e =>
												setdata({
													...data,
													p: e.target.value
												})
											}
											autoComplete={true}
											autoFocus={true}
											maxLength={42}
											onWheel={e => e.preventDefault()}
										/>
									</label>
								</div>
							</div>

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
	)
}
function DiliveryPopup({
	onSave,
	postOrderData,
	order_uuid,
	credit_allowed,
	counters,
	items,
	order,
	allowed,
	setOrder,
	setLoading,
	loading
}) {
	const [PaymentModes, setPaymentModes] = useState([])
	const [modes, setModes] = useState([])
	const [error, setError] = useState("")
	const [popup, setPopup] = useState(false)
	const [firstTime, setFirstTime] = useState(true)
	const [data, setData] = useState({})
	const [outstanding, setOutstanding] = useState({})

	useEffect(() => {
		
		if (firstTime) {
			setData({
				replacement: order?.replacement || 0,
				shortage: order?.shortage || 0,
				adjustment: order?.adjustment || 0,
				adjustment_remarks: order?.adjustment_remarks || ""
			})
			setFirstTime(false)
		} else {
			setOrder({
				replacement: data?.replacement || 0,
				shortage: data?.shortage || 0,
				adjustment: data?.adjustment || 0,
				adjustment_remarks: data?.adjustment_remarks || ""
			})
		}
	}, [popup])
	const GetPaymentModes = async () => {
		const cachedData = localStorage.getItem("paymentModesData")

		if (cachedData) {
			setPaymentModes(JSON.parse(cachedData))
		} else {
			const response = await axios({
				method: "get",
				url: "/paymentModes/GetPaymentModesList",
				headers: {
					"Content-Type": "application/json"
				}
			})
			if (response.data.success) {
				localStorage.setItem("paymentModesData", JSON.stringify(response.data.result))
				setPaymentModes(response.data.result)
			}
		}
	}

	useEffect(() => {
		let time = new Date()
		setOutstanding({
			order_uuid,
			amount: "",
			user_uuid: localStorage.getItem("user_uuid"),
			time: time.getTime(),
			invoice_number: order.invoice_number,
			trip_uuid: order.trip_uuid,
			counter_uuid: order.counter_uuid
		})
		GetPaymentModes()
	}, [])
	useEffect(() => {
		if (PaymentModes.length)
			setModes(
				PaymentModes.map(a => ({
					...a,
					amt: "",
					coin: "",
					status:
						a.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002" ||
						a.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002"
							? "0"
							: 1
				}))
			)
	}, [PaymentModes])
	const submitHandler = async () => {
		if (loading) {
			return
		}
		setLoading(true)
		setError("")
		try {
			let billingData = await Billing({
				order_uuid: data?.order_uuid,
				invoice_number: `${data?.order_type}${data?.invoice_number}`,
				replacement: data.replacement,
				adjustment: data.adjustment,
				shortage: data.shortage,
				counter: counters.find(a => a.counter_uuid === order.counter_uuid),
				items: order.item_details.map(a => {
					let itemData = items.find(b => a.item_uuid === b.item_uuid)
					return {
						...itemData,
						...a
						// price: itemData?.price || 0,
					}
				})
			})

			let Tempdata = {
				...order,
				...billingData,
				item_details: billingData.items,
				replacement: data.replacement,
				replacement_mrp: data.mrp
			}
			if (modes.find(a => a.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002" && a.amt && !a.remarks)) {
				setError("Cheque number is mandatory")
				setLoading(false)
				return
			}

			let modeTotal = modes.map(a => +a.amt || 0)?.reduce((a, b) => a + b)

			if (+Tempdata?.order_grandtotal !== +(+modeTotal + (+outstanding?.amount || 0))) {
				setError("Invoice Amount and Payment mismatch")
				setLoading(false)
				return
			}
			let obj = modes.find(a => a.mode_title === "Cash")
			// if (obj?.amt && obj?.coin === "") {
			//   // setCoinPopup(true);
			//   setLoading(false);
			//   return;
			// }
			let time = new Date()
			obj = {
				user_uuid: localStorage.getItem("user_uuid"),
				time: time.getTime(),
				order_uuid,
				counter_uuid: order.counter_uuid,
				trip_uuid: order.trip_uuid,
				invoice_number: order.invoice_number,
				order_grandtotal: order?.order_grandtotal,
				modes
			}
			let response
			if (modeTotal) {
				response = await axios({
					method: "post",
					url: "/receipts/postReceipt",
					data: obj,
					headers: {
						"Content-Type": "application/json"
					}
				})
			}

			if (outstanding?.amount)
				response = await axios({
					method: "post",
					url: "/Outstanding/postOutstanding",
					data: outstanding,
					headers: {
						"Content-Type": "application/json"
					}
				})
			if (response.data.success) {
				postOrderData()
				onSave()
			}
		} catch (error) { console.error(error) }
		setLoading(false)
	}

	return (
		<>
			<div className="overlay">
				<div className="modal" style={{ height: "fit-content", width: "max-content" }}>
					<div className="flex" style={{ justifyContent: "space-between" }}>
						<h3>Payments</h3>
						<h3>Rs. {order.order_grandtotal}</h3>
					</div>
					<div
						className="content"
						style={{
							height: "fit-content",
							padding: "10px",
							width: "fit-content"
						}}
					>
						<div style={{ overflowY: "scroll" }}>
							<form className="form">
								<div className="formGroup">
									{PaymentModes.map(item => (
										<div
											className="row"
											style={{ flexDirection: "row", alignItems: "center" }}
											key={item.mode_uuid}
										>
											<div style={{ width: "50px" }}>{item.mode_title}</div>
											<label className="selectLabel flex" style={{ width: "80px" }}>
												<input
													type="number"
													name="route_title"
													className="numberInput"
													value={modes.find(a => a.mode_uuid === item.mode_uuid)?.amt}
													placeholder={!allowed.find(a => a.mode_uuid === item.mode_uuid) ? "Not Allowed" : ""}
													style={
														!allowed.find(a => a.mode_uuid === item.mode_uuid)
															? {
																	width: "90px",
																	backgroundColor: "light",
																	fontSize: "12px",
																	color: "#fff"
															  }
															: { width: "80px" }
													}
													onChange={e =>
														setModes(prev =>
															prev.map(a =>
																a.mode_uuid === item.mode_uuid
																	? {
																			...a,
																			amt: e.target.value
																	  }
																	: a
															)
														)
													}
													maxLength={42}
													disabled={!allowed.find(a => a.mode_uuid === item.mode_uuid)}
													onWheel={e => e.preventDefault()}
												/>
												{/* {popupInfo.conversion || 0} */}
											</label>
											{item.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002" &&
											modes.find(a => a.mode_uuid === item.mode_uuid)?.amt ? (
												<label className="selectLabel flex" style={{ width: "200px" }}>
													<input
														type="text"
														name="route_title"
														className="numberInput"
														value={item?.remarks}
														placeholder={"Cheque Number"}
														style={{
															width: "100%",
															backgroundColor: "light",
															fontSize: "12px"
														}}
														onChange={e =>
															setModes(prev =>
																prev?.map(a =>
																	a.mode_uuid === item.mode_uuid ? { ...a, remarks: e.target.value } : a
																)
															)
														}
														maxLength={42}
														onWheel={e => e.preventDefault()}
													/>
												</label>
											) : (
												""
											)}
										</div>
									))}
									<div className="row" style={{ flexDirection: "row", alignItems: "center" }}>
										<div style={{ width: "50px" }}>UnPaid</div>
										<label className="selectLabel flex" style={{ width: "80px" }}>
											<input
												type="number"
												name="route_title"
												className="numberInput"
												value={outstanding?.amount}
												placeholder={credit_allowed !== "Y" ? "Not Allowed" : ""}
												onWheel={e => e.preventDefault()}
												style={
													credit_allowed !== "Y"
														? {
																width: "90px",
																backgroundColor: "light",
																fontSize: "12px",
																color: "#fff"
														  }
														: { width: "80px" }
												}
												onChange={e =>
													setOutstanding(prev => ({
														...prev,
														amount: e.target.value
													}))
												}
												disabled={credit_allowed !== "Y"}
												maxLength={42}
											/>
											{/* {popupInfo.conversion || 0} */}
										</label>
									</div>
									<div className="row" style={{ flexDirection: "row", alignItems: "center" }}>
										<button
											type="button"
											className="submit"
											style={{ color: "#fff", backgroundColor: "#7990dd" }}
											onClick={() => setPopup(true)}
										>
											Deduction
										</button>
									</div>
									<i style={{ color: "red" }}>{error}</i>
								</div>

								<div className="flex" style={{ justifyContent: "space-between" }}>
									<button type="button" style={{ backgroundColor: "red" }} className="submit" onClick={onSave}>
										Cancel
									</button>
									<button type="button" className="submit" onClick={() => submitHandler()}>
										Save
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			</div>
			{popup ? <DiliveryReplaceMent onSave={() => setPopup(false)} setData={setData} data={data} /> : ""}
		</>
	)
}
function MinMaxPopup({ onSave, popupValue, order, items }) {
	const [warehouse, setWarehouse] = useState([])
	const [warehouse_uuid, setWarehouse_uuid] = useState("")

	const [data, setData] = useState({})
	const [warehouseSelection, setWarehouseSelection] = useState(false)

	const getWarehouse = async () => {
		const db = await openDB("BT", +localStorage.getItem("IDBVersion") || 1)
		let tx = await db.transaction("warehouse", "readwrite").objectStore("warehouse")
		let item = await tx.getAll()
		setWarehouse(item)
	}
	useEffect(() => {
		getWarehouse()
		let warehouse_uuid = localStorage.getItem("selected_warehouse")
		if (warehouse_uuid) setWarehouse_uuid(warehouse_uuid)
		else setWarehouseSelection(true)
	}, [])
	useEffect(() => {
		if (!warehouseSelection) {
			let itemData = items.find(a => a.item_uuid === popupValue.item_uuid)
			let warehouseData = itemData?.stock?.find(b => b.warehouse_uuid === warehouse_uuid)
			
			setData(prev => ({
				...prev,
				item_title: itemData.item_title,
				min: warehouseData?.qty || 0
			}))
			if (warehouse_uuid) getMinValue()
		}
	}, [warehouse_uuid, warehouseSelection])
	

	const getMinValue = async () => {
		const response = await axios({
			method: "get",
			url: "/items/minValue/" + warehouse_uuid + "/" + popupValue.item_uuid,

			headers: {
				"Content-Type": "application/json"
			}
		})
		setData(prev => ({
			...prev,
			max: response.data.result || 0,
			min: prev.min - (+response.data.result || 0)
		}))
	}
	return (
		<>
			<div className="overlay" style={{ zIndex: 99999999999999 }}>
				{warehouseSelection ? (
					<div className="modal" style={{ height: "fit-content", width: "max-content" }}>
						<div className="flex" style={{ justifyContent: "space-between" }}>
							<h3>{data?.item_title}</h3>
						</div>
						<div
							className="content"
							style={{
								height: "fit-content",
								padding: "10px",
								width: "fit-content"
							}}
						>
							<div style={{ overflowY: "scroll" }}>
								<div className="inputGroup">
									<label htmlFor="Warehouse">From Warehouse</label>
									<div className="inputGroup" style={{ width: "300px" }}>
										<Select
											options={[
												{ value: 0, label: "None" },
												...warehouse.map(a => ({
													value: a.warehouse_uuid,
													label: a.warehouse_title
												}))
											]}
											onChange={doc => setWarehouse_uuid(doc.value)}
											value={
												warehouse_uuid
													? {
															value: order?.warehouse_uuid,
															label: warehouse?.find(j => j.warehouse_uuid === warehouse_uuid)?.warehouse_title
													  }
													: { value: 0, label: "None" }
											}
											// autoFocus={!order?.warehouse_uuid}
											openMenuOnFocus={true}
											menuPosition="fixed"
											menuPlacement="auto"
											placeholder="Select"
										/>
									</div>
									<div className="flex" style={{ justifyContent: "space-between" }}>
										<button
											type="button"
											className="submit"
											disabled={!warehouse_uuid}
											onClick={() => setWarehouseSelection(false)}
										>
											Okay
										</button>
									</div>
								</div>
								<button onClick={onSave} className="closeButton">
									x
								</button>
							</div>
						</div>
					</div>
				) : (
					<div className="modal" style={{ height: "fit-content", width: "max-content" }}>
						<div className="flex" style={{ justifyContent: "space-between" }}>
							<h3>{data?.item_title}</h3>
						</div>
						<div
							className="content"
							style={{
								height: "fit-content",
								padding: "10px",
								width: "fit-content"
							}}
						>
							<div style={{ overflowY: "scroll" }}>
								<form className="form">
									<div className="formGroup">
										<div className="row" style={{ flexDirection: "row", alignItems: "center" }}>
											<label className="selectLabel flex">
												Warehouse
												<input
													type="number"
													name="route_title"
													className="numberInput"
													placeholder="Wait..."
													value={data?.min}
													onWheel={e => e.preventDefault()}
													maxLength={42}
													style={{ width: "100px" }}
												/>
											</label>

											<label className="selectLabel flex">
												In-Transit
												<input
													type="number"
													name="route_title"
													className="numberInput"
													value={data?.max}
													onWheel={e => e.preventDefault()}
													maxLength={42}
													style={{ width: "100px" }}
												/>
											</label>
										</div>
									</div>

									<div className="flex" style={{ justifyContent: "space-between" }}>
										<button type="button" className="submit" onClick={onSave}>
											Okay
										</button>
									</div>
								</form>
							</div>
						</div>
					</div>
				)}
			</div>
		</>
	)
}
function ConfirmPopup({ onSave, onClose, selectedOrder, Navigate }) {
	if (!selectedOrder) Navigate(-1)
	return selectedOrder ? (
		<div className="overlay">
			<div className="modal" style={{ height: "fit-content", width: "max-content", padding: "30px" }}>
				<h2 style={{ textAlign: "center" }}>Are you sure?</h2>
				<h2 style={{ textAlign: "center" }}>Changes will be discarded</h2>
				<div
					className="content"
					style={{
						height: "fit-content",
						padding: "20px"
					}}
				>
					<div style={{ overflowY: "scroll", width: "100%" }}>
						<form className="form">
							<div className="flex">
								<button type="submit" style={{ backgroundColor: "red" }} className="submit" onClick={onSave}>
									Discard
								</button>
							</div>
						</form>
					</div>
					<button onClick={onClose} className="closeButton">
						<CloseIcon />
					</button>
				</div>
			</div>
		</div>
	) : (
		""
	)
}
function DeliveryMessagePopup({ onSave, data, credit_allowed }) {
	const [disabled, setDisabled] = useState(true)
	useEffect(() => {
		setTimeout(() => setDisabled(false), 3000)
	}, [])
	
	return (
		<div className="overlay">
			<div className="modal" style={{ height: "fit-content", width: "max-content" }}>
				{data.length ? (
					<h2>
						{data.map((a, i) =>
							i === 0 ? (
								<b style={{ color: "red" }}>
									<u>{a.mode_title}</u>
								</b>
							) : data.length === i + 1 ? (
								<>
									{" "}
									and{" "}
									<b style={{ color: "red" }}>
										<u>{a.mode_title}</u>
									</b>
								</>
							) : (
								", " + a.mode_title
							)
						)}{" "}
						not allowed
					</h2>
				) : (
					""
				)}
				{credit_allowed !== "Y" ? (
					<h2>
						<b style={{ color: "red" }}>
							<u>Credit / Unpaid </u>
						</b>
						not allowed
					</h2>
				) : (
					""
				)}

				<div
					className="content"
					style={{
						height: "fit-content",
						padding: "20px"
					}}
				>
					<div style={{ overflowY: "scroll", width: "100%" }}>
						<form className="form">
							<div className="flex" style={{ width: "100%" }}>
								<button
									disabled={disabled}
									type="button"
									style={
										disabled ? { opacity: "0.5", cursor: "not-allowed" } : { opacity: "1", cursor: "pointer" }
									}
									className="submit"
									onClick={onSave}
								>
									Okay
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	)
}
function OpenWarningMessage({ onSave, data, users, onClose }) {
	const [orderData, setOrderData] = useState(data)
	const [timer, setTimer] = useState(0)

	const getOrders = async () => {
		const response = await axios({
			method: "get",
			url: "/orders/GetOrder/" + data.order_uuid,

			headers: {
				"Content-Type": "application/json"
			}
		})
		
		if (response.data.result.opened_by === "0") onSave()
		if (response.data.success) setOrderData(response.data.result)
	}
	useEffect(() => {
		setTimeout(() => setTimer(true), 2000)
		getOrders()
	}, [])
	
	return timer ? (
		<div className="overlay">
			<div
				className="modal"
				style={{
					height: "fit-content",
					width: "max-content",
					paddingTop: "50px"
				}}
			>
				<h2>Order Already Opened By {users.find((a, i) => a.user_uuid === orderData.opened_by)?.user_title}</h2>

				<div
					className="content"
					style={{
						height: "fit-content",
						padding: "20px"
					}}
				>
					<div style={{ overflowY: "scroll", width: "100%" }}>
						<form className="form">
							<div className="flex" style={{ width: "100%" }}>
								<button
									type="button"
									style={{ opacity: "1", cursor: "pointer" }}
									className="submit"
									onClick={onSave}
								>
									Still Open
								</button>
							</div>
						</form>
					</div>
					<button onClick={onClose} className="closeButton">
						x
					</button>
				</div>
			</div>
		</div>
	) : (
		<div />
	)
}
function NewUserForm({ onSave, popupInfo, tempQuantity, setTempQuantity, order, items, onClose }) {
	const [data, setdata] = useState({})
	useEffect(() => {
		let data = window.location.pathname.includes("checking")
			? tempQuantity?.find(a => a.item_uuid === popupInfo.item_uuid)
			: order?.item_details?.find(a => a.item_uuid === popupInfo.item_uuid)
		setdata({
			b: data?.b || 0,
			p: data?.p || 0
		})
	}, [])

	const submitHandler = async e => {
		e.preventDefault()
		let orderData = order

		if (window.location.pathname.includes("checking")) {
			setTempQuantity(
				tempQuantity?.filter(a => a.item_uuid === popupInfo.item_uuid)?.length
					? tempQuantity?.map(a =>
							a.item_uuid === popupInfo.item_uuid
								? {
										...a,
										b: +(+data.b || 0) + parseInt((+data.p || 0) / +a.conversion),
										p: parseInt((+data.p || 0) % +a.conversion)
								  }
								: a
					  )
					: tempQuantity?.length
					? [
							...tempQuantity,
							...items
								?.filter(a => a.item_uuid === popupInfo.item_uuid)
								.map(a => ({
									...a,
									b: +(+data.b || 0) + parseInt((+data.p || 0) / +a.conversion),
									p: parseInt((+data.p || 0) % +a.conversion)
								}))
					  ]
					: items
							?.filter(a => a.item_uuid === popupInfo.item_uuid)
							.map(a => ({
								...a,
								b: +(+data.b || 0) + +Math.floor(parseInt((+data.p || 0) / +a.conversion)),
								p: parseInt((+data.p || 0) % +a.conversion)
							}))
			)
			onClose()
		} else if (window.location.pathname.includes("delivery")) {
			orderData = {
				...orderData,
				delivery_return: orderData.delivery_return.length
					? orderData.delivery_return.filter(a => a.item_uuid === popupInfo.item_uuid).length
						? orderData.delivery_return.map(a =>
								a.item_uuid === popupInfo.item_uuid
									? {
											item_uuid: popupInfo.item_uuid,
											b:
												+a.b +
												(+orderData?.item_details?.find(a => a.item_uuid === popupInfo.item_uuid)?.b || 0) -
												data.b,
											p:
												+a.p +
												(+orderData?.item_details?.find(a => a.item_uuid === popupInfo.item_uuid)?.p || 0) -
												data.p
									  }
									: a
						  )
						: [
								...orderData.delivery_return,
								{
									item_uuid: popupInfo.item_uuid,
									b: (+orderData?.item_details?.find(a => a.item_uuid === popupInfo.item_uuid)?.b || 0) - data.b,
									p: (+orderData?.item_details?.find(a => a.item_uuid === popupInfo.item_uuid)?.p || 0) - data.p
								}
						  ]
					: [
							{
								item_uuid: popupInfo.item_uuid,
								b: (+orderData?.item_details?.find(a => a.item_uuid === popupInfo.item_uuid)?.b || 0) - data.b,
								p: (+orderData?.item_details?.find(a => a.item_uuid === popupInfo.item_uuid)?.p || 0) - data.p
							}
					  ],
				item_details: orderData.item_details.map(a =>
					a.item_uuid === popupInfo.item_uuid
						? {
								...a,
								b: (+data.b || 0) + parseInt(+data.p / (+popupInfo.conversion || 1)),
								p: +data.p % (+popupInfo.conversion || 1)
						  }
						: a
				)
			}
			onSave(orderData)
		} else {
			orderData = {
				...orderData,
				processing_canceled: orderData.processing_canceled.length
					? orderData.processing_canceled.filter(a => a.item_uuid === popupInfo.item_uuid).length
						? orderData.processing_canceled.map(a =>
								a.item_uuid === popupInfo.item_uuid
									? {
											item_uuid: popupInfo.item_uuid,
											b:
												+a.b +
												(+orderData?.item_details?.find(a => a.item_uuid === popupInfo.item_uuid)?.b || 0) -
												data.b,
											p:
												+a.p +
												(+orderData?.item_details?.find(a => a.item_uuid === popupInfo.item_uuid)?.p || 0) -
												data.p
									  }
									: a
						  )
						: [
								...orderData.processing_canceled,
								{
									item_uuid: popupInfo.item_uuid,
									b: (+orderData?.item_details?.find(a => a.item_uuid === popupInfo.item_uuid)?.b || 0) - data.b,
									p: (+orderData?.item_details?.find(a => a.item_uuid === popupInfo.item_uuid)?.p || 0) - data.p
								}
						  ]
					: [
							{
								item_uuid: popupInfo.item_uuid,
								b: (+orderData?.item_details?.find(a => a.item_uuid === popupInfo.item_uuid)?.b || 0) - data.b,
								p: (+orderData?.item_details?.find(a => a.item_uuid === popupInfo.item_uuid)?.p || 0) - data.p
							}
					  ],
				item_details: orderData.item_details.map(a =>
					a.item_uuid === popupInfo.item_uuid
						? {
								...a,
								b: (+data.b || 0) + parseInt(+data.p / (+popupInfo.conversion || 1)),
								p: +data.p % (+popupInfo.conversion || 1)
						  }
						: a
				)
			}
			onSave(orderData)
		}
	}
	
	return (
		<div className="overlay">
			<div className="modal" style={{ height: "fit-content", width: "max-content" }}>
				<div
					className="content"
					style={{
						height: "fit-content",
						padding: "20px",
						width: "fit-content"
					}}
				>
					<div style={{ overflowY: "scroll" }}>
						<form className="form" onSubmit={submitHandler}>
							<div className="formGroup">
								<div className="row" style={{ flexDirection: "row", alignItems: "flex-start" }}>
									<label className="selectLabel flex" style={{ width: "100px" }}>
										Box
										<input
											type="number"
											name="route_title"
											className="numberInput"
											value={data?.b}
											style={{ width: "100px" }}
											onChange={e =>
												setdata({
													...data,
													b: e.target.value
												})
											}
											maxLength={42}
											onWheel={e => e.preventDefault()}
										/>
										{popupInfo.conversion || 0}
									</label>
									<label className="selectLabel flex" style={{ width: "100px" }}>
										Pcs
										<input
											type="number"
											name="route_title"
											className="numberInput"
											value={data?.p}
											style={{ width: "100px" }}
											onChange={e =>
												setdata({
													...data,
													p: e.target.value
												})
											}
											autoComplete={true}
											onWheel={e => e.preventDefault()}
											autoFocus={true}
											maxLength={42}
										/>
									</label>
								</div>
							</div>

							<button type="submit" className="submit">
								Save changes
							</button>
						</form>
					</div>
					<button onClick={onClose} className="closeButton">
						x
					</button>
				</div>
			</div>
		</div>
	)
}
const PhoneList = ({ onSave, mobile }) => {
	return (
		<div className="overlay" style={{ zIndex: 999999999 }}>
			<div
				className="modal"
				style={{
					height: "fit-content",
					width: "max-content",
					minWidth: "250px"
				}}
			>
				<div
					className="content"
					style={{
						height: "fit-content",
						padding: "20px",
						width: "fit-content"
					}}
				>
					<div style={{ overflowY: "scroll", width: "100%" }}>
						{mobile.length ? (
							<div className="flex" style={{ flexDirection: "column", width: "100%" }}>
								<table
									className="user-table"
									style={{
										width: "100%",
										height: "fit-content"
									}}
								>
									<tbody className="tbody">
										{mobile?.map((item, i) => (
											<tr
												key={item?.item_uuid || Math.random()}
												style={{
													height: "30px",
													width: "100%"
												}}
											>
												<td
													colSpan={3}
													className="flex"
													onClick={() => {
														window.location.assign("tel:" + item)
														onSave()
													}}
												>
													<Phone />
													{item}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className="flex" style={{ flexDirection: "column", width: "100%" }}>
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
	)
}
const OrdersEdit = ({ order, onSave, items, counter, itemsData, onClose }) => {
	const [orderEditPopup, setOrderEditPopup] = useState("")
	const [updateOrders, setUpdateOrders] = useState([])
	const [deleteItemsOrder, setDeleteItemOrders] = useState([])
	useEffect(() => {
		setUpdateOrders(order.filter(item => item.item_details.filter(a => a.item_uuid === items.item_uuid)?.length))
	}, [])
	function formatAMPM(date) {
		var hours = date.getHours()
		var minutes = date.getMinutes()
		var ampm = hours >= 12 ? "pm" : "am"
		hours = hours % 12
		hours = hours ? hours : 12 // the hour '0' should be '12'
		minutes = minutes < 10 ? "0" + minutes : minutes
		var strTime = hours + ":" + minutes + " " + ampm
		return strTime
	}
	
	const postOrderData = async deleteItems => {
		let dataArray = deleteItems
			? updateOrders.map(a => ({
					...a,
					item_details: a.item_details.filter(b => !(b.item_uuid === items.item_uuid))
			  }))
			: updateOrders
					.filter(a => a.edit || deleteItemsOrder.filter(b => b === a.order_uuid).length)
					.map(a =>
						deleteItemsOrder.filter(b => b === a.order_uuid).length
							? {
									...a,
									item_details: a.item_details.filter(b => !(b.item_uuid === items.item_uuid))
							  }
							: a
					)
		
		let finalData = []
		for (let orderObject of dataArray) {
			let data = orderObject

			let billingData = await Billing({
				order_uuid: data?.order_uuid,
				invoice_number: `${data?.order_type}${data?.invoice_number}`,
				replacement: data?.replacement,
				adjustment: data.adjustment,
				shortage: data.shortage,
				counter: counter.find(a => a.counter_uuid === data.counter_uuid),
				items: data.item_details.map(a => {
					let itemData = itemsData.find(b => a.item_uuid === b.item_uuid)
					return {
						...itemData,
						...a,
						...(deleteItems ? {} : { edit: true })
						// price: itemData?.price || 0,
					}
				})
			})
			data = {
				...data,
				...billingData,
				item_details: billingData.items
			}
			data = Object.keys(data)
				.filter(key => key !== "others" || key !== "items")
				.reduce((obj, key) => {
					obj[key] = data[key]
					return obj
				}, {})

			finalData.push({ ...data, opened_by: 0 })
		}
		

		const response = await axios({
			method: "put",
			url: "/orders/putOrders",
			data: finalData,
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) {
			onSave()
		}
	}
	return (
		<>
			<div className="overlay" style={{ zIndex: "999999999" }}>
				<div
					className="modal"
					style={{
						height: "fit-content",
						width: "max-content",
						minWidth: "206px",
						padding: "10px",
						paddingTop: "40px"
					}}
				>
					<h1>Orders</h1>
					<div
						className="content"
						style={{
							height: "fit-content",
							padding: "20px 0",
							width: "80vw"
						}}
					>
						<div style={{ overflow: "scroll", width: "100%" }}>
							{order.length ? (
								<div className="flex" style={{ flexDirection: "column" }}>
									<table
										className="user-table"
										style={{
											height: "fit-content",
											fontSize: "10px",
											width: "max-content",
											overflow: "scroll"
										}}
									>
										<thead>
											<tr style={{ color: "#fff", backgroundColor: "#7990dd" }}>
												<th></th>
												<th colSpan={3}>
													<div className="t-head-element">Date</div>
												</th>
												<th colSpan={2}>
													<div className="t-head-element" style={{ width: "40px" }}>
														Invoice Number
													</div>
												</th>
												<th colSpan={2}>
													<div className="t-head-element">Counter</div>
												</th>
												<th colSpan={2}>
													<div className="t-head-element">Quantity</div>
												</th>
												<th colSpan={2}>
													<div className="t-head-element">free</div>
												</th>
												<th></th>
											</tr>
										</thead>
										<tbody className="tbody">
											{updateOrders?.map((item, i) => (
												<tr
													key={item?.item_uuid || Math.random()}
													style={{
														height: "30px",
														color: "#fff",
														backgroundColor: +deleteItemsOrder.filter(a => a === item.order_uuid).length
															? "red"
															: "#7990dd"
													}}
												>
													<td style={{ width: "3ch" }}>{i + 1}</td>
													<td colSpan={3} style={{ width: "70px" }}>
														{new Date(item?.status[0]?.time).toDateString() +
															" - " +
															formatAMPM(new Date(item?.status[0]?.time))}
													</td>
													<td colSpan={2} style={{ width: "40px" }}>
														{item.invoice_number}
													</td>
													<td colSpan={2} style={{ width: "50px" }}>
														{counter?.find(a => a.counter_uuid === item.counter_uuid)?.counter_title || "-"}
													</td>
													<td colSpan={2} style={{ width: "50px", padding: "0 2px" }}>
														<input
															value={
																(item.item_details.find(a => a.item_uuid === items.item_uuid)?.b || 0) +
																" : " +
																(item.item_details.find(a => a.item_uuid === items.item_uuid)?.p || 0)
															}
															className="boxPcsInput"
															style={{
																fontSize: "10px",
																width: "10ch",
																overflow: "scroll",
																padding: "none"
															}}
															onClick={e => {
																e.stopPropagation()
																setOrderEditPopup(item)
															}}
														/>
													</td>
													<td colSpan={2} style={{ width: "50px", padding: "0 2px" }}>
														{item.item_details.find(a => a.item_uuid === items.item_uuid)?.free || 0}
													</td>
													<td
														style={{ width: "50px", padding: "0 2px" }}
														onClick={() => {
															setDeleteItemOrders(prev =>
																prev?.filter(a => a === item.order_uuid).length
																	? prev.filter(a => !(a === item.order_uuid))
																	: [...(prev || []), item.order_uuid]
															)
														}}
													>
														{!deleteItemsOrder.filter(a => a === item.order_uuid).length ? (
															<DeleteOutlineIcon />
														) : (
															""
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<div className="flex" style={{ flexDirection: "column", width: "100%" }}>
									<i>No Data Present</i>
								</div>
							)}
						</div>
						<button
							className="simple_Logout_button"
							style={{
								position: "absolute",
								right: "50px",
								top: "0px",
								backgroundColor: "red",
								fontSize: "15px",
								width: "90px"
							}}
							onClick={() => postOrderData(true)}
						>
							Delete All
						</button>
						<button onClick={onClose} className="closeButton">
							x
						</button>
					</div>
					{updateOrders.filter(a => a.edit).length || deleteItemsOrder.length ? (
						<button className="simple_Logout_button" onClick={() => postOrderData()}>
							Update
						</button>
					) : (
						""
					)}
				</div>
			</div>

			{orderEditPopup ? (
				<QuantityChanged
					popupInfo={items}
					order={orderEditPopup}
					onSave={() => setOrderEditPopup("")}
					setOrder={setUpdateOrders}
					itemsData={itemsData}
				/>
			) : (
				""
			)}
		</>
	)
}
function QuantityChanged({ onSave, popupInfo, setOrder, order, itemsData }) {
	const [data, setdata] = useState({})

	useEffect(() => {
		let data = order.item_details?.find(a => a.item_uuid === popupInfo.item_uuid)
		setdata({
			b: data?.b || 0,
			p: data?.p || 0
		})
	}, [])
	
	const submitHandler = async e => {
		e.preventDefault()
		let item = itemsData.find(a => a.item_uuid === popupInfo.item_uuid)
		setOrder(prev =>
			prev.map(a =>
				a.order_uuid === order.order_uuid
					? {
							...a,
							edit: true,
							item_details: a.item_details.map(b =>
								b.item_uuid === popupInfo.item_uuid
									? {
											...b,
											b: Math.floor(+data.b + +data.p / +item.conversion || 0),
											p: +data.p % +item.conversion
									  }
									: b
							)
					  }
					: a
			)
		)
		onSave()
	}

	return (
		<div className="overlay" style={{ zIndex: 999999999999 }}>
			<div className="modal" style={{ height: "fit-content", width: "max-content" }}>
				<div
					className="content"
					style={{
						height: "fit-content",
						padding: "20px",
						width: "fit-content"
					}}
				>
					<div style={{ overflowY: "scroll" }}>
						<form className="form" onSubmit={submitHandler}>
							<div className="formGroup">
								<div className="row" style={{ flexDirection: "row", alignItems: "flex-start" }}>
									<label className="selectLabel flex" style={{ width: "100px" }}>
										Box
										<input
											type="number"
											name="route_title"
											className="numberInput"
											value={data?.b}
											style={{ width: "100px" }}
											onChange={e =>
												setdata({
													...data,
													b: e.target.value
												})
											}
											maxLength={42}
											onWheel={e => e.preventDefault()}
										/>
										{popupInfo.conversion || 0}
									</label>
									<label className="selectLabel flex" style={{ width: "100px" }}>
										Pcs
										<input
											type="number"
											name="route_title"
											className="numberInput"
											value={data?.p}
											style={{ width: "100px" }}
											onChange={e =>
												setdata({
													...data,
													p: e.target.value
												})
											}
											maxLength={42}
											onWheel={e => e.preventDefault()}
											autoFocus={true}
										/>
									</label>
								</div>
							</div>

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
	)
}
