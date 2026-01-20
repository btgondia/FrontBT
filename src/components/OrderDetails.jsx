import { useState, useEffect, useRef, useCallback, useMemo, useContext } from "react"
import axios from "axios"
import Select from "react-select"
import { LuClipboardEdit } from "react-icons/lu"
import { ImScissors } from "react-icons/im"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import { v4 as uuid } from "uuid"
import { Billing, CONTROL_AUTO_REFRESH, jumpToNextIndex } from "../Apis/functions"
import {
	Add,
	AddCircleOutline,
	Cancel,
	CheckCircle,
	Comment,
	DeleteOutline,
	DeliveryDiningRounded,
	NoteAdd,
	Print,
	Refresh,
	Splitscreen,
	WhatsApp
} from "@mui/icons-material"
import { PiCircleDashedBold } from "react-icons/pi";
import { TbArrowsExchange2 } from "react-icons/tb";

import { FaAngleRight, FaCircleMinus, FaLink } from "react-icons/fa6";

import { useReactToPrint } from "react-to-print"
import { AddCircle as AddIcon, RemoveCircle } from "@mui/icons-material"

import FreeItems from "./FreeItems"
import DiliveryReplaceMent from "./DiliveryReplaceMent"
import TaskPopupMenu from "./TaskPopupMenu"
import MessagePopup from "./MessagePopup"
import context from "../context/context"
import { FaPercent, FaSave } from "react-icons/fa"
import Prompt from "./Prompt"
import OrderPrintWrapper from "./OrderPrintWrapper"
import NotesPopup from "./popups/NotesPopup"
import {
	chcekIfDecimal,
	checkDecimalPlaces,
	compareObjects,
	truncateDecimals
} from "../utils/helperFunctions"
import { useLocation } from "react-router-dom"
import { getInitialOrderValue } from "../utils/constants"
import { MdCurrencyRupee, MdDownloadDone, MdFileDownloadDone, MdLocalOffer, MdOutlineEdit, MdOutlineEditOff, MdOutlineHistory, MdReplay } from "react-icons/md"
import { RiPercentFill } from "react-icons/ri";
import { IoMdCloseCircle } from "react-icons/io";

import "./orderDetails.css"
import { ITEM_STATUS_LABELS } from "../pages/MainAdmin/OrderAssembly"

const default_status = [
	{ value: 0, label: "Preparing" },
	{ value: 1, label: "Ready" },
	{ value: 2, label: "Hold" },
	{ value: 3, label: "Canceled" }
]

const priorityOptions = [
	{ value: 0, label: "Normal" },
	{ value: 1, label: "High" }
]

const selectStyles = {
	control:(provided) => ({
		...provided,
		background:"#fff",
		borderColor:"#c6c6c6",
	}),
	singleValue:(provided) => ({
		...provided,
		color: "black",
	}),
	indicatorsContainer: (provided, state) => ({
		...provided,
		display:state.isDisabled ? "none":provided.display
	}),
	menuPortal: (provided) => ({
		...provided,
		zIndex:999999
	})
}

export function OrderDetails({
	orderJson,
	order_uuid,
	onSave,
	orderStatus,
	paymentModeData = [],
	itemCategories = [],
	counter = [],
	trips = [],
	userData = [],
	warehouseData = [],
	reminder = null,
	setOrders
}) {
	const [promptLocalState, setPromptLocalState] = useState(null)
	const {
		setNotification,
		getSpecialPrice,
		saveSpecialPrice,
		spcPricePrompt,
		updateOrder: updateCompleteOrder
	} = useContext(context)
	const [printConfig, setPrintConfig] = useState({})
	const [company, setCompanies] = useState([])
	const [routeData, setRoutesData] = useState([])
	const [counters, setCounters] = useState([])
	const [waiting, setWaiting] = useState(false)
	const [caption, setCaption] = useState("")
	const [captionPopup, setCaptionPopup] = useState("")
	const [reminderDate, setReminderDate] = useState()
	const [category, setCategory] = useState([])
	const [itemsData, setItemsData] = useState([])
	const [editOrder, setEditOrder] = useState(false)
	const [deliveryPopup, setDeliveryPopup] = useState(false)
	const [orderData, setOrderData] = useState()
	const [selectedTrip, setSelectedTrip] = useState("")
	const [printData, setPrintData] = useState({ item_details: [], status: [] })
	const [holdPopup, setHoldPopup] = useState(false)
	const [messagePopup, setMessagePopup] = useState(false)
	const [splitHoldPopup, setSplitHold] = useState(false)
	const [commentPopup, setCommentPoup] = useState(false)
	const [complete, setComplete] = useState(false)
	const [completeOrder, setCompleteOrder] = useState(false)
	const [order, setOrder] = useState({})
	const [edit_prices, setEditPrices] = useState([])
	const [taskPopup, setTaskPopup] = useState(false)
	const [warehousePopup, setWarhousePopup] = useState(false)
	const [users, setUsers] = useState([])
	const [tripData, setTripData] = useState([])
	// const [uuids, setUuid] = useState()
	const [popupDetails, setPopupDetails] = useState()
	const [popupDiscount, setPopupDiscount] = useState()
	const [itemAssemblyLogs, setItemAssemblyLogs] = useState()
	// const [copymsg, setCopymsg] = useState()
	const [notesPopup, setNotesPoup] = useState()
	const [counterNotesPopup, setCounterNotesPoup] = useState()
	const [popupForm, setPopupForm] = useState()
	const [focusedInputId, setFocusedInputId] = useState(0)
	const reactInputsRef = useRef({})
	const componentRef = useRef(null)
	const [deletePopup, setDeletePopup] = useState(false)
	const [warehouse, setWarehouse] = useState([])
	const location = useLocation()
	const [deductionsPopup, setDeductionsPopup] = useState()
	const [deductionsCoinPopup, setDeductionsCoinPopup] = useState()
	const [deductionsData, setDeductionsData] = useState()
	const [openDMSInvoicePopup, setOpenDMSInvoicePopup] = useState()

	const getRoutesData = async () => {
		const cachedData = localStorage.getItem("routesData")

		if (cachedData) {
			setRoutesData(JSON.parse(cachedData))
		} else {
			const response = await axios({
				method: "get",
				url: "/routes/GetOrderRouteList",
				headers: {
					"Content-Type": "application/json"
				}
			})

			if (response.data.success) {
				localStorage.setItem("routesData", JSON.stringify(response.data.result))
				setRoutesData(response.data.result)
			}
		}
	}

	const fetchCompanies = async () => {
		const cachedData = localStorage.getItem("companiesData")
		try {
			if (cachedData) {
				setCompanies(JSON.parse(cachedData))
			} else {
				const response = await axios.get("/companies/getCompanies")
				if (response?.data?.result?.[0]) {
					localStorage.setItem("companiesData", JSON.stringify(response.data.result))
					setCompanies(response.data.result)
				}
			}
		} catch (error) {
			
		}
	}

	useEffect(CONTROL_AUTO_REFRESH, [])
	const getOrder = async order_uuid => {
		const response = await axios({
			method: "get",
			url: "/orders/GetOrder/" + order_uuid,

			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) {
			setOrder(response.data.result)

			const reason = response?.data?.result?.status?.find(s => +s.stage === 5)?.cancellation_reason
			if (reason)
				setPromptLocalState({
					active: true,
					heading: "Cancellation Reason",
					message: reason,
					actions: [
						{
							label: "Close",
							classname: "confirm",
							action: () => setPromptLocalState(null)
						}
					]
				})
		}
	}
	useEffect(() => {
		if (order?.receipt_number) {
			setDeliveryPopup("edit")
		}
	}, [order?.receipt_number])
	useEffect(() => {
		if (orderJson) {
			setOrder(orderJson)
		} else {
			getOrder(order_uuid)
		}
		fetchCompanies()
	}, [])

	const handleConvertOrder = async order_type => {
		try {
			setPromptLocalState(prev => ({
				...prev,
				actions: prev.actions.map(i => ({
					...i,
					disabled: true,
					loading: i.classname?.includes?.("confirm")
				}))
			}))

			const response = await axios({
				method: "put",
				url: "/orders/updateOrderType",
				headers: {
					"Content-Type": "application/json"
				},
				data: {
					invoice_number: orderData?.invoice_number,
					order_uuid: orderData?.order_uuid,
					order_type
				}
			})

			setOrderData(prev => ({ ...prev, ...response.data.result }))
			setPromptLocalState(null)
		} catch (error) {
			setPromptLocalState(prev => ({
				...prev,
				actions: prev.actions.map(i => ({ ...i, disabled: false, loading: false }))
			}))
			
		}
	}

	const convertConfirmation = () => {
		setPromptLocalState({
			active: true,
			heading: "Confirm to convert order?",
			message: (
				<>
					On confirm, the order{" "}
					<b>
						{orderData?.order_type === "E" && !isNaN(orderData?.invoice_number[0]) ? "E-" : null}
						{orderData?.invoice_number}
					</b>{" "}
					will be converted to <b>{orderData?.order_type === "E" ? "invoice" : "estimate"}</b> order.
				</>
			),
			actions: [
				{
					label: "Cancel",
					classname: "cancel",
					action: () => setPromptLocalState(null)
				},
				{
					label: "Yes, convert",
					classname: "confirm flex",
					style: { gap: "5px" },
					action: () => handleConvertOrder(orderData?.order_type === "E" ? "I" : "E")
				}
			]
		})
	}

	const getItemCategories = async () => {
		if (itemCategories.length) {
			setCategory(itemCategories)
			return
		}
		const response = await axios({
			method: "get",
			url: "/itemCategories/GetItemCategoryList",
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) setCategory(response.data.result)
	}
	const getWarehouseData = async () => {
		if (warehouseData.length) {
			setWarehouse(warehouseData)
			return
		}
		const response = await axios({
			method: "get",
			url: "/warehouse/GetWarehouseList",

			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) setWarehouse(response.data.result)
	}
	const getTripData = async () => {
		if (trips.length) {
			setTripData(trips)
			return
		}
		const response = await axios({
			method: "get",
			url: "/trips/GetTripList/" + localStorage.getItem("user_uuid"),

			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) setTripData(response.data.result)
	}
	useEffect(() => {
		getTripData()
	}, [popupForm])

	useEffect(() => {
		if (order?.order_status === "A") setEditOrder(true)
	}, [order?.order_status])

	const appendNewRow = () => {
		let item_uuid = uuid()
		setFocusedInputId(`REACT_SELECT_COMPONENT_ITEM_TITLE@${item_uuid}`)
		setTimeout(
			() =>
				setOrderData(prev => ({
					...prev,
					item_details: [
						...prev.item_details,
						{
							uuid: item_uuid,
							b: 0,
							p: 0,
							sr: prev.item_details?.length + 1
						}
					]
				})),
			250
		)
	}

	const shiftFocus = id => jumpToNextIndex(id, reactInputsRef, setFocusedInputId, appendNewRow)
	const callBilling = async (data = orderData, updateInDB) => {
		if (!data && !editOrder) return
		let counter = counters.find(a => data.counter_uuid === a.counter_uuid)
		let time = new Date()
		let autoBilling = await Billing({
			order_edit: true,
			order_uuid: data?.order_uuid,
			invoice_number: `${data?.order_type || ""}${data?.invoice_number}`,
			shortage: data.shortage,
			adjustment: data.adjustment,
			replacement: data.replacement,
			counter_uuid: data.counter_uuid,
			coin: data.coin,
			counter,
			items: orderData?.item_details,
			others: {
				stage: 1,
				user_uuid: "240522",
				time: time.getTime(),

				type: "NEW"
			}
		})

		setOrderData(prev => {
			const updated_data = {
				...prev,
				...(data || {}),
				...autoBilling,
				item_details: autoBilling.items?.map(a => ({
					...(prev.item_details.find(b => b.item_uuid === a.item_uuid) || {}),
					...a
				}))
			}
			if (updateInDB) updateOrder({ data: updated_data })
			return updated_data
		})
	}

	const reactToPrintContent = useCallback(() => {
		return componentRef.current
	}, [])

	const invokePrint = useReactToPrint({
		content: reactToPrintContent,
		removeAfterPrint: true,
		onAfterPrint: () => (printConfig ? setPrintConfig(null) : null)
	})

	const [printLoading, setPrintLoading] = useState()

	const handlePrint = async () => {
		setPrintLoading(true)

		try {
			const response = await axios.get(`/orders/paymentPending/${orderData?.counter_uuid}`)
			if (!response?.data?.result?.length) invokePrint()
			else
				setPromptLocalState({
					active: true,
					heading: "Print pending payment summary?",
					message: "If yes, counter's pending payment summary will be included in the order print.",
					actions: [
						{
							label: "No",
							classname: "cancel",
							action: () => {
								setPromptLocalState(null)
								invokePrint()
							}
						},
						{
							label: "Yes",
							classname: "confirm",
							action: async () => {
								const counterOrders = response?.data?.result
									?.sort((a, b) => +a.time_1 - +b.time_1)
									?.reduce(
										(data, i) => ({
											...data,
											[i.counter_uuid]: {
												orders: (data?.[i.counter_uuid]?.orders || []).concat([i]),
												numbers:
													data?.[i.counter_uuid]?.numbers ||
													counters?.find(c => c?.counter_uuid === i?.counter_uuid)?.mobile?.map(m => m?.mobile)
											}
										}),
										{}
									)

								setPromptLocalState(null)
								setPrintConfig({ pendingPayments: true, counterOrders })
							}
						}
					]
				})
		} catch (error) {
			console.error(error)
		}
		setPrintLoading(false)
	}

	const deductionsNotAllowedWarning = () =>
		setPromptLocalState({
			active: true,
			heading: "Deductions Unavailable",
			message: "Deductions are not allowed for estimate orders.",
			actions: [
				{
					label: "Okay",
					classname: "confirm",
					action: () => setPromptLocalState(null)
				}
			]
		})

	const getUsers = async () => {
		if (userData.length) {
			setUsers(userData)
			return
		}
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
		setOrderData({
			...order,
			priority: order?.priority || 0,
			item_details: order?.item_details?.map((a, i) => {
				let itemData = itemsData.find(b => b.item_uuid === a.item_uuid)
				return {
					...itemData,
					...a,
					uuid: uuid(),
					default: true,
					sr: i + 1,
					p_price: +(a?.edit_price || a.price),
					b_price: chcekIfDecimal(+(a?.edit_price || a.price) * +(itemData?.conversion || 0))
				}
			}),
			fulfillment: []
		})

		if (order?.notes?.filter(a => a)?.length) {
			setNotesPoup(true)
		}
	}, [itemsData, order])

	const onItemPriceChange = async (e, item) => {
		setOrderData(prev => {
			return {
				...prev,
				item_details: prev.item_details.map(a =>
					a.uuid === item.uuid
						? {
								...a,
								p_price: checkDecimalPlaces(e.target.value),
								b_price: chcekIfDecimal(e.target.value * item.conversion || 0, 2)
						  }
						: a
				)
			}
		})
		setEditPrices(prev =>
			prev.filter(a => a.item_uuid === item.item_uuid).length
				? prev.map(a =>
						a.item_uuid === item.item_uuid
							? {
									...a,
									p_price: checkDecimalPlaces(e.target.value),
									b_price: chcekIfDecimal(e.target.value * item.conversion || 0, 2)
							  }
							: a
				  )
				: prev.length
				? [
						...prev,
						{
							...item,
							p_price: checkDecimalPlaces(e.target.value),
							b_price: chcekIfDecimal(e.target.value * item.conversion || 0, 2)
						}
				  ]
				: [
						{
							...item,
							p_price: checkDecimalPlaces(e.target.value),
							b_price: chcekIfDecimal(e.target.value * item.conversion || 0, 2)
						}
				  ]
		)
	}
	useEffect(() => {
		if (counters?.find(a => a.counter_uuid === order?.counter_uuid)?.notes?.filter(a => a)?.length) {
			setCounterNotesPoup(counters?.find(a => a.counter_uuid === order?.counter_uuid))
		}
	}, [counters, order?.counter_uuid])

	useEffect(() => {
		setPrintData(prev => ({
			...prev,
			...orderData,
			item_details:
				orderData?.item_details
					?.map(a => ({
						...a,
						category_title: category.find(b => b.category_uuid === a.category_uuid)?.category_title
					}))
					.sort(
						(a, b) =>
							a?.category_title?.localeCompare(b.category_title) || a?.item_title?.localeCompare(b.item_title)
					)
					?.filter(a => +a.status !== 3)
					?.map((a, i) => ({
						...a,
						sr: i + 1
					})) || []
		}))
	}, [category, orderData])

	const getItemsData = async () => {
		const cachedData = localStorage.getItem("itemsData")
		if (cachedData) {
			setItemsData(JSON.parse(cachedData))
		} else {
			const response = await axios({
				method: "get",
				url: "/items/GetItemList",
				headers: {
					"Content-Type": "application/json"
				}
			})
			if (response.data.success) {
				localStorage.setItem("itemsData", JSON.stringify(response.data.result))
				setItemsData(response.data.result)
			}
		}
	}

	const getItemsDataReminder = async () => {
		if (reminder) {
			setReminderDate(reminder)
			return
		}
		const response = await axios({
			method: "get",
			url: "/items/getNewItemReminder",

			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) setReminderDate(response.data.result)
	}

	const getCounters = async counters => {
		if (counter.length) {
			setCounters(counter)
		} else {
			const response = await axios({
				method: "post",
				url: "/counters/GetCounterList",
				data: { counters },
				headers: {
					"Content-Type": "application/json"
				}
			})
			if (response.data.success) setCounters(response.data.result)
		}
	}

	const sendMsg = async () => {
		if (waiting) {
			return
		}
		setWaiting(true)
		let timeout = setTimeout(() => {
			setNotification({
				message: "Error Processing Request",
				success: false
			})

			setWaiting(false)
		}, 45000)
		const response = await axios({
			method: "post",
			url: "/orders/sendPdf",
			data: {
				caption,
				counter_uuid: orderData?.counter_uuid,
				order_uuid: orderData?.order_uuid,
				invoice_number: orderData?.invoice_number,
				additional_users: userSelection,
				additional_numbers: Object.values(additionalNumbers?.values),
				sendCounter
			},
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data) {
			clearTimeout(timeout)
			setNotification(response.data)
			setTimeout(() => setNotification(null), 5000)
			setCaptionPopup(null)
			setCaption("")
			setWaiting(false)
		}
	}

	useEffect(() => {
		// getAutoBill();
		getUsers()
		getWarehouseData()
		getItemCategories()
		getItemsDataReminder()
		getRoutesData()
	}, [])

	useEffect(() => {
		const controller = new AbortController()
		
		if (order) {
			getItemsData(
				order?.item_details?.map(a => a.item_uuid),
				controller
			)
			setDeductionsData({
				replacement: +order?.replacement || 0,
				shortage: +order?.shortage || 0,
				adjustment: +order?.adjustment || 0,
				adjustment_remarks: order?.adjustment_remarks || ""
			})
			getCounters([order?.counter_uuid])
		}
		return () => {
			controller.abort()
		}
	}, [order])

	const onSubmit = async ({
		type = { stage: 0, diliveredUser: "" },
		completedOrderEdited,
		modes,
		outstanding,
		modeTotal
	}) => {
		let empty_item = orderData?.item_details
			.filter(a => a.item_uuid)
			.map(a => ({
				...a,
				is_empty: !((+a.p || 0) + (+a.b || 0) + (+a.free || 0)) && a.status !== 3
			}))
			.find(a => a.is_empty)

		if (empty_item) {
			setNotification({
				message: `${empty_item.item_title} has 0 Qty.
      0 Qty Not allowed.`,
				success: false
			})
			setTimeout(() => setNotification(null), 2000)
			return
		}
		let empty_price = orderData?.item_details
			.filter(a => a.item_uuid && !a.free && a.state !== 3)
			.map(a => ({
				...a,
				is_empty: !+a.p_price
			}))
			.find(a => a.is_empty)
		if (empty_price) {
			setNotification({
				message: `item ${empty_price?.item_title} has 0 price.`,
				success: false
			})
			setTimeout(() => setNotification(null), 2000)
			return
		}
		if (orderData?.payment_pending && !orderData?.notes?.length) return setNotesPoup(true)
		let counter = counters.find(a => orderData?.counter_uuid === a.counter_uuid)
		let fulfillment = orderData?.fulfillment

		for (let item of orderData?.item_details) {
			let itemData = order?.item_details.find(a => a.item_uuid === item.item_uuid)
			let aQty = +(item?.b || 0) * (+item?.conversion || 0) + (+item?.p || 0)
			let bQty = +(itemData?.b || 0) * (+item?.conversion || 0) + (+itemData?.p || 0)
			let difference = bQty - aQty
			if (bQty > aQty) {
				let exicting = fulfillment?.find(a => a.item_uuid === item.item_uuid)
				if (exicting) {
					difference = difference + (+(exicting.b || 0) * (+item.conversion || 0) + (+exicting.p || 0))
				}

				fulfillment.push({
					item_uuid: item.item_uuid,
					b: Math.floor(difference / (+item.conversion || 1)),
					p: Math.floor(difference % (+item.conversion || 1))
				})
			}
		}
		
		let data = {
			...orderData,
			item_details: orderData?.item_details?.filter(a => a.item_uuid) || []
		}

		let autoBilling = await Billing({
			order_edit: true,
			order_uuid: data?.order_uuid,
			invoice_number: `${data?.order_type ?? ""}${data?.invoice_number}`,
			counter,
			items: data.item_details.map(a => ({ ...a, item_price: a.p_price })),
			replacement: data.replacement,
			adjustment: data.adjustment,
			shortage: data.shortage,
			edit_prices: edit_prices.map(a => ({
				...a,
				item_price: a.p_price
			})),
			others: {}
		})
		data = {
			...data,
			...autoBilling,
			item_details: autoBilling.items
		}
		let time = new Date()
		let user_uuid = localStorage.getItem("user_uuid")
		data = {
			...data,
			item_details: data.item_details?.map(a => ({
				...a,
				gst_percentage: a.item_gst,
				css_percentage: a.item_css,

				status: a.status || 0,
				price: a.p_price || a?.price || a.item_price || 0
			})),
			order_status: data?.item_details?.filter(a => a.price_approval === "N")?.length ? "A" : "R",
			orderStatus
		}

		data =
			type.stage === 5
				? {
						...data,
						status: [
							{
								stage: 1,
								time: data?.status?.find(a => +a.stage === 1)?.time || time.getTime(),
								user_uuid: data?.status?.find(a => +a.stage === 1)?.user_uuid || user_uuid
							},
							{
								stage: 2,
								time: data?.status?.find(a => +a.stage === 1)?.time || time.getTime(),
								user_uuid: data?.status?.find(a => +a.stage === 1)?.user_uuid || user_uuid
							},
							{
								stage: 3,
								time: data?.status?.find(a => +a.stage === 1)?.time || time.getTime(),
								user_uuid: data?.status?.find(a => +a.stage === 1)?.user_uuid || user_uuid
							},
							{
								stage: 4,
								time: time.getTime(),
								user_uuid
							},
							{
								stage: 3.5,
								time: time.getTime(),
								user_uuid: type.diliveredUser
							}
						]
				  }
				: {
						...data,
						fulfillment: [
							...(fulfillment || []),
							...(order?.fulfillment?.filter(a => !fulfillment.find(b => b.item_uuid === a.item_uuid)) || [])
						]
				  }

		if (completedOrderEdited) {
			setOrderData(data)
			setDeliveryPopup("edit")
			return
		}

		if (completeOrder) {
			updateCompleteOrder({
				data,
				completeOrder,
				modes,
				outstanding,
				modeTotal,
				location: window.location.pathname
			})
			if (setOrders) setOrders(prev => prev?.map(a => (a.order_uuid === data.order_uuid ? data : a)))

			onSave()
		} else {
			setMessagePopup({
				data,
				completeOrder,
				modes,
				outstanding,
				modeTotal,
				location: window.location.pathname
			})
		}
	}

	const updateOrder = async (param = {}) => {
		let controller = new AbortController()
		if (waiting) {
			return
		}
		setWaiting(true)
		setTimeout(() => {
			setNotification({
				message: "Error Processing Request",
				success: false
			})
			controller.abort()
			setWaiting(false)
		}, 45000)
		try {
			
			updateCompleteOrder(param)
			setTimeout(() => {
				getOrder(order_uuid, true)
			}, 2000)
			setEditOrder(false)
			setWaiting(false)
			if (!completeOrder) {
				setMessagePopup(false)
			}
			if (completeOrder) {
				if (setOrders) setOrders(prev => prev?.map(a => (a.order_uuid === orderData?.order_uuid ? orderData : a)))

				onSave()
			}
		} catch (err) {
			setWaiting(false)
		}
	}

	const splitOrder = async (type = { stage: 0 }) => {
		let controller = new AbortController()
		if (waiting) {
			return
		}
		setWaiting(true)
		setTimeout(() => {
			setNotification({
				message: "Error Processing Request",
				success: false
			})
			controller.abort()
			setWaiting(false)
		}, 45000)
		let counter = counters.find(a => orderData?.counter_uuid === a.counter_uuid)
		let fulfillment = orderData?.fulfillment
		for (let item of orderData?.item_details) {
			let itemData = order?.item_details.find(a => a.item_uuid === item.item_uuid)
			let aQty = +(item?.b || 0) * (+item?.conversion || 0) + (+item?.p || 0)
			let bQty = +(itemData?.b || 0) * (+item?.conversion || 0) + (+itemData?.p || 0)
			let difference = bQty - aQty
			if (bQty > aQty) {
				let exicting = fulfillment?.find(a => a.item_uuid === item.item_uuid)
				if (exicting) {
					difference = difference + (+(exicting.b || 0) * (+item.conversion || 0) + (+exicting.p || 0))
				}

				fulfillment.push({
					item_uuid: item.item_uuid,
					b: Math.floor(difference / (+item.conversion || 1)),
					p: Math.floor(difference % (+item.conversion || 1))
				})
			}
		}
		
		let data = {
			...orderData,

			item_details: orderData?.item_details?.filter(a => a.item_uuid && +a.status !== 2) || []
		}
		let data2 = {
			...orderData,

			item_details: orderData?.item_details?.filter(a => a.item_uuid && +a.status === 2) || []
		}

		let autoBilling = await Billing({
			order_edit: true,
			order_uuid: data?.order_uuid,
			invoice_number: `${data?.order_type || ""}${data?.invoice_number}`,
			counter,
			items: data.item_details,
			replacement: data.replacement,
			adjustment: data.adjustment,
			shortage: data.shortage,
			edit_prices: edit_prices.map(a => ({
				...a,
				item_price: a.p_price
			})),
			others: {}
		})
		data = {
			...data,
			...autoBilling,
			item_details: autoBilling.items
		}
		let autoBilling2 = await Billing({
			order_edit: true,
			order_uuid: data2?.order_uuid,
			invoice_number: `${data2?.order_type || ""}${data2?.invoice_number}`,
			counter,
			items: data2.item_details,
			replacement: data2.replacement,
			adjustment: data2.adjustment,
			edit_prices: edit_prices.map(a => ({
				...a,
				item_price: a.p_price
			})),
			shortage: data2.shortage,
			others: {}
		})
		data2 = {
			...data2,
			...autoBilling2,
			item_details: autoBilling2.items
		}
		let time = new Date()
		let user_uuid = localStorage.getItem("user_uuid")
		data = {
			...data,

			item_details: data.item_details?.map(a => ({
				...a,
				gst_percentage: a.item_gst,
				css_percentage: a.item_css,
				status: a.status || 0,
				price: a.p_price || a?.price || a.item_price || 0
			})),
			order_status: data?.item_details?.filter(a => a.price_approval === "N")?.length ? "A" : "R",
			orderStatus
		}

		data =
			type.stage === 5
				? {
						...data,
						status: [
							{
								stage: 1,
								time: data?.status?.find(a => +a.stage === 1)?.time || time.getTime(),
								user_uuid: data?.status?.find(a => +a.stage === 1)?.user_uuid || user_uuid
							},
							{
								stage: 2,
								time: data?.status?.find(a => +a.stage === 1)?.time || time.getTime(),
								user_uuid: data?.status?.find(a => +a.stage === 1)?.user_uuid || user_uuid
							},
							{
								stage: 3,
								time: data?.status?.find(a => +a.stage === 1)?.time || time.getTime(),
								user_uuid: data?.status?.find(a => +a.stage === 1)?.user_uuid || user_uuid
							},
							{
								stage: 4,
								time: time.getTime(),
								user_uuid
							}
						]
				  }
				: {
						...data,
						fulfillment: [
							...(fulfillment || []),
							...(order?.fulfillment?.filter(a => !fulfillment.find(b => b.item_uuid === a.item_uuid)) || [])
						]
				  }
		

		const response = await axios({
			method: "put",
			url: "/orders/putOrders",
			signal: controller.signal,
			data: [data],
			headers: {
				"Content-Type": "application/json"
			}
		})
		delete data2.order_uuid
		delete data2.invoice_number
		delete data2._id
		const response2 = await axios({
			method: "post",
			url: "/orders/postOrder",
			signal: controller.signal,
			data: data2,
			headers: {
				"Content-Type": "application/json"
			}
		})

		if (response2.data.success) {
			// window.location.reload();
			
		}
		if (response.data.success) {
			if (setOrders) setOrders(prev => prev?.map(a => (a.order_uuid === data.order_uuid ? data : a)))
			onSave()
		}
		setWaiting(false)
	}

	const handleWarehouseChacking = async (complete, methodType) => {
		let warehouse_uuid =
			users.find(a => a.user_uuid === localStorage.getItem("user_uuid"))?.warehouse[0] ||
			JSON.parse(localStorage.getItem("warehouse") || "")
		if (methodType === "complete") {
			setComplete(true)
		}
		if (warehouse_uuid && warehouse_uuid !== orderData?.warehouse_uuid) {
			if (!orderData?.warehouse_uuid) {
				updateWarehouse(warehouse_uuid, methodType)
			} else {
				if (methodType === "complete" || complete) {
					setDeliveryPopup(true)
				} else {
					handleTaskChecking()
				}
			}
		} else {
			if (methodType === "complete" || complete) {
				setDeliveryPopup(true)
			} else {
				handleTaskChecking()
			}
		}
	}

	const updateWarehouse = async (warehouse_uuid, method) => {
		const response = await axios({
			method: "put",
			url: "/orders/putOrders",
			data: [{ ...orderData, warehouse_uuid }],
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) {
			setOrderData(prev => ({
				...prev,
				warehouse_uuid
			}))
			if (method === "complete" || complete) {
				setDeliveryPopup(true)
			} else handleTaskChecking()
		}
	}

	useEffect(() => {
		if (!editOrder) return
		reactInputsRef.current?.[orderData?.item_details?.[0]?.uuid]?.focus()
	}, [editOrder])

	const HoldOrder = async (hold = "Y") => {
		let data = {
			...orderData,
			hold
		}
		data = Object.keys(data)
			?.filter(key => key !== "notes")
			.reduce((obj, key) => {
				obj[key] = data[key]
				return obj
			}, {})
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

	let listItemIndexCount = 0
	const handleTaskChecking = async () => {
		const response = await axios({
			method: "get",
			url: "/tasks/getCounterTask/" + orderData?.counter_uuid,
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) {
			setTaskPopup(response.data.result)
		} else handlePrint()
	}

	const [dateTimeUpdating, setDateTimeUpdating] = useState(0)
	const handleDateTimeUpdate = async e => {
		try {
			setDateTimeUpdating(1)
			const time = {
				time_1: new Date(e.target.value).getTime(),
				time_2: (orderData?.time_2 - orderData?.time_1 || 48 * 60 * 60 * 1000) + new Date(e.target.value).getTime()
			}

			setOrderData(data => ({ ...data, ...time }))
			const response = await axios.put("/orders/order_datetime", {
				order_uuid: orderData?.order_uuid,
				...time
			})

			if (response?.success) setDateTimeUpdating(2)
		} catch (error) {
			setDateTimeUpdating(0)
		}
	}

	const [additionalNumbers, setAdditionalNumbers] = useState({
		count: 0,
		values: []
	})
	
	const [sendCounter, setSendCounter] = useState(true)
	const [userSelection, setUserSelection] = useState([])

	const recreateOrder = async copyStages => {
		try {
			setPromptLocalState(null)
			const { time_1, time_2 } = getInitialOrderValue()
			const oldOrder = order
			const newOrder = {
				status: copyStages
					? oldOrder?.status?.filter(i => +i.stage !== 5)
					: [
							{
								stage: "1",
								time: Date.now(),
								user_uuid: localStorage.getItem("user_uuid")
							}
					  ],
				time_1: copyStages ? oldOrder?.time_1 : time_1 + Date.now(),
				time_2: copyStages ? oldOrder?.time_2 : time_2 + Date.now(),
				priority: oldOrder?.priority,
				order_type: oldOrder?.order_type || "",
				item_details: oldOrder?.item_details?.map(item => ({
					...item,
					b: item?.original_qty?.b,
					p: item?.original_qty?.p,
					status: copyStages ? item.status : 0
				})),
				order_grandtotal: 0,
				order_uuid: uuid(),
				warehouse_uuid: oldOrder?.warehouse_uuid,
				counter_uuid: oldOrder?.counter_uuid,
				trip_uuid: oldOrder?.trip_uuid
			}

			let { items, ...billingData } = await Billing({
				order_edit: true,
				creating_new: 1,
				order_uuid: newOrder?.order_uuid,
				replacement: newOrder.replacement,
				adjustment: newOrder.adjustment,
				shortage: newOrder.shortage,
				edit_prices: edit_prices.map(a => ({
					...a,
					item_price: a.p_price
				})),
				counter: counters.find(a => a.counter_uuid === newOrder.counter_uuid),
				items: newOrder.item_details?.map(a => {
					let _itemData = itemsData.find(b => a.item_uuid === b.item_uuid)
					return {
						..._itemData,
						...a,
						price: _itemData.p_price || _itemData?.price || 0
					}
				})
			})

			const data = {
				...newOrder,
				...billingData,
				item_details: items
			}

			const response = await axios.post(`/orders/postOrder/`, data)
			if (response?.data?.result?.order_uuid)
				setNotification({
					success: true,
					message: `Order ${response?.data?.result?.invoice_number} recreated successfully!`
				})
			else
				setNotification({
					success: false,
					message: `Failed to recreate order!`
				})
		} catch (error) {
			console.error(error)
			setNotification({ success: false, message: `Failed to recreate order!` })
		}
		setTimeout(() => setNotification(null), 5000)
	}

	const checkDMSDetails = async () => {
		let { counter_uuid, item_details } = orderData

		let isNotHaldiramsItems = item_details.find(orderItem => {
			let company_uuid = itemsData.find(item => item.item_uuid === orderItem.item_uuid)?.company_uuid
			return company_uuid !== "b153f6ae-d2b2-11ec-9d64-0242ac120002"
		})

		if (isNotHaldiramsItems) return "Only Haldirams Items Allowed for DMS"

		let counterData = counters.find(i => i.counter_uuid === counter_uuid)

		if (
			!counterData?.dms_beat_name ||
			!counterData?.dms_buyer_address ||
			!counterData?.dms_buyer_name ||
			!counterData?.dms_buyer_id
		)
			return "Counter DMS details are missing"

		for (let item of item_details) {
			if (!item?.dms_erp_id || !item?.dms_item_name)
				return `Item DMS details are missing for ${item?.item_title}`
		}
	}

	const checkDMSWrapper = async () => {
		const errorMessage = await checkDMSDetails()
		if (errorMessage) setNotification({ success: false, message: errorMessage })
		else setOpenDMSInvoicePopup(true)
	}

	const copyStageConfirmation = () => {
		setPromptLocalState({
			active: true,
			heading: "Copy order stages",
			message: "Do you want to copy the current order stages to new order?",
			actions: [
				{
					label: "Yes, copy stages",
					classname: "confirm",
					action: () => recreateOrder(true)
				},
				{
					label: "No, start from processing",
					classname: "confirm",
					action: () => recreateOrder(null)
				}
			]
		})
	}

	const CovertedQty = (qty, conversion) => {
		let b = qty / +conversion
		b = Math.sign(b) * Math.floor(Math.sign(b) * b)
		let p = Math.floor(qty % +conversion)
		return b + ":" + p
	}

	const isCancelled = order?.status?.find(i => +i.stage === 5)

	const constructItem = (item_uuid) => {
		let itemData = itemsData.find(a => a.item_uuid === item_uuid)
		let counterData = counters.find(a => a.counter_uuid === orderData?.counter_uuid)

		let item_rate = counterData?.company_discount?.find(
			a => a.company_uuid === itemData.company_uuid
		)?.item_rate

		let item_price = itemData.item_price
		if (item_rate === "a") item_price = itemData.item_price_a
		if (item_rate === "b") item_price = itemData.item_price_b
		if (item_rate === "c") item_price = itemData.item_price_c
		if (item_rate === "d") item_price = itemData.item_price_d
		let p_price =
			+getSpecialPrice(counters, itemData, orderData?.counter_uuid)?.price ||
			item_price ||
			0

		return {
			...itemData,
			status: 0,
			p_price,
			b_price: Math.floor(p_price * itemData.conversion || 0)
		}
	}

	const handleItemSelect = (item_uuid, curr_uuid) => {
		setOrderData(prev => ({
			...prev,
			item_details: prev.item_details?.map(a =>
				a.uuid === curr_uuid
					? { ...a, ...constructItem(item_uuid) }
					: a
			)
		}))
	}
	
	const handleFreeItems = ({item_details, newFreeItems}) => {
		setOrderData(prev => ({
			...prev,
			item_details: item_details
			.concat(newFreeItems.map(i => ({ ...constructItem(i.uuid), ...i  })))
		}))
		setHoldPopup(false)
	}
	
	const updateItemRate = async (item_rate) => {
		const updatedItems = orderData?.item_details?.map(i => {

			const itemData = itemsData.find(a => a.item_uuid === i.item_uuid)
			let item_price = itemData.item_price

			if (item_rate === "a") item_price = itemData.item_price_a
			else if (item_rate === "b") item_price = itemData.item_price_b
			else if (item_rate === "c") item_price = itemData.item_price_c
			else if (item_rate === "d") item_price = itemData.item_price_d
			
			const p_price =
				+getSpecialPrice(counters, itemData, orderData?.counter_uuid)?.price ||
				+item_price ||
				0
			
			return {
				...i,
				...itemData,
				price: item_price,
				item_price,
				p_price,
				b_price: Math.floor((p_price * +itemData.conversion) || 0)
			}
		})

		const billingResponse = await Billing({
			order_edit: true,
			order_uuid: orderData?.order_uuid,
			invoice_number: `${orderData?.order_type ?? ""}${orderData?.invoice_number}`,
			counter,
			items: updatedItems,
			replacement: orderData.replacement,
			adjustment: orderData.adjustment,
			shortage: orderData.shortage,
			others: {}
		})

		const data = {
			...orderData,
			...billingResponse,
			item_details: billingResponse.items
		}

		return data
	}

	return openDMSInvoicePopup ? (
		<DMSInvoicePopup
			order={order}
			onClose={() => {
				setOpenDMSInvoicePopup(false)
			}}
			onSave={onSave}
			setNotification={setNotification}
		/>
	) : deliveryPopup ? (
		<PaymentPopup
			onSave={({ modes, outstanding, modeTotal }) => {
				if (order?.receipt_number) {
					onSave()
				}
				if (deliveryPopup === "edit" || deliveryPopup === "adjustment")
					onSubmit({
						type: { stage: 0, diliveredUser: "" },
						modes,
						outstanding,
						modeTotal
					})
				setDeliveryPopup(false)
			}}
			onClose={() => setDeliveryPopup(false)}
			deliveryPopup={deliveryPopup}
			postOrderData={({ diliveredUser, modes, outstanding, modeTotal }) =>
				onSubmit({
					type: { stage: 5, diliveredUser },
					modes,
					outstanding,
					modeTotal
				})
			}
			setSelectedOrder={setOrderData}
			order={orderData}
			counters={counters}
			items={itemsData}
			updateBilling={callBilling}
			users={users}
		/>
	) : (
		<>
			<div id="overlay" className="order-details">
				<div id="drawer">
					<div className="inventory_header" style={{position:"relative"}}>
						<h2
							className="flex"
							data-tooltip-id="my-tooltip"
							data-tooltip-content={`${
								counters
									.find(a => a.counter_uuid === orderData?.counter_uuid)
									?.mobile?.filter(a => a.mobile)?.map(a => [a.title?.trim?.()?.toUpperCase(), a.mobile].filter(Boolean).join(": "))
									?.join(" | ") || ""
							}`}
						>
							Order Details • {counters.find(a => a.counter_uuid === orderData?.counter_uuid)?.counter_title || ""}{", "}
							{routeData.find(
								a =>
									a.route_uuid ===
									counters.find(a => a.counter_uuid === orderData?.counter_uuid)?.route_uuid
							)?.route_title || ""} • {orderData?.invoice_number || ""}
						</h2>
						<button style={{padding:0,border:"none",background:"none",color:"white",display:"flex",position:"absolute",right:"10px",top:"50%",translate:"0 -50%"}} onClick={() => onSave()}>
							<IoMdCloseCircle style={{fontSize:"2rem"}} />
						</button>
					</div>
					<div style={{display:"flex", padding:'10px',gap:'10px',paddingBottom: "20px"}}>
						<div style={{display:"flex", flexDirection:"column",justifyContent:"space-between"}}>
							<div className="action-buttons">
								{!isCancelled ? (
									<>
										<button
											className="theme-btn"
											style={{background:"var(--mainColor)"}}
											onClick={() => {
												handleWarehouseChacking(true, "complete")
												setCompleteOrder(true)
											}}
											>
											<CheckCircle /><span>Complete Order</span>
										</button>
										<button
											style={{ backgroundColor: "red" }}
											className="theme-btn"
											onClick={() => setDeletePopup("Delete")}
										>
											<Cancel /><span>Cancel Order</span>
										</button>
									</>
								) : null}
								<hr />
								<button
									style={{ backgroundColor: "blue" }}
									className="theme-btn"
									onClick={() =>
										order?.order_type === "E" ? deductionsNotAllowedWarning() : setDeductionsPopup(true)
									}
								>
									<ImScissors /><span>Deductions</span>
								</button>
								<button
									className="theme-btn"
									onClick={e => {
										reactInputsRef.current = {}
										e.target.blur()
										setPopupForm(true)
										setSelectedTrip({
											trip_uuid: orderData?.trip_uuid || 0,
											warehouse_uuid: orderData?.warehouse_uuid || ""
										})
									}}
								>
									<DeliveryDiningRounded /><span>Assign Trip</span>
								</button>
								<hr />
								{order?.order_type === "E" && (
									<button
										className="theme-btn"
										onClick={convertConfirmation}
									>
										<TbArrowsExchange2 />
										<span>Convert</span>
									</button>
								)}
								<button
									className="theme-btn"
									disabled={editOrder}
									onClick={() => setSplitHold(true)}
								>
									<Splitscreen /><span>Split Order</span>
								</button>
								<UpdateRate 
									updateItemRate={updateItemRate}
									disabled={editOrder}
									onConfirm={(data) => updateOrder({
										sendPaymentReminder: false,
										data,
										completeOrder,
										location: window.location.pathname
									})}
								/>
							</div>
						</div>
						<div style={{flex:1}}>
							<div id="voucherForm">
								<div className="inventory_header" style={{ backgroundColor: "#fff", color: "#000", gap:"10px", marginBottom:"10px" }}>
									<div className="inputGroup">
										<label htmlFor="Warehouse">Counter</label>
										<div className="inputGroup">
											<Select
												isDisabled={!editOrder}
												styles={{
													container:(provided) => ({
														...provided,
														width:"240px",
													}),
													...selectStyles,
												}}
												options={counters?.map(a => ({
													value: a.counter_uuid,
													label: a.counter_title + ", " + a.route_title
												}))}
												onChange={doc => {
													setOrderData(prev => ({
														...prev,
														counter_uuid: doc.value
													}))
												}}
												value={
													orderData?.counter_uuid
														? {
																value: orderData?.counter_uuid,
																label: counters?.find(j => j.counter_uuid === orderData?.counter_uuid)
																	?.counter_title
															}
														: { value: 0, label: "None" }
												}
												openMenuOnFocus={true}
												menuPosition="fixed"
												menuPlacement="auto"
												placeholder="Select"
											/>
										</div>
									</div>
									<div className="inputGroup">
										<label htmlFor="Warehouse">Priority</label>
										<div className="inputGroup">
											<Select
												isDisabled={!editOrder}
												styles={{
													container:(provided) => ({
														...provided,
														width:"110px"
													}),
													...selectStyles
												}}
												options={priorityOptions}
												onChange={doc =>
													setOrderData(x => ({
														...x,
														priority: doc?.value
													}))
												}
												value={priorityOptions?.find(j => j.value === orderData?.priority)}
												openMenuOnFocus={true}
												menuPosition="fixed"
												menuPlacement="auto"
												placeholder="Select Priority"
											/>
										</div>
									</div>
									<div className="inputGroup">
										<label htmlFor="Warehouse">Warehouse</label>
										<div style={{display:"flex"}}>
											<Select
												isDisabled={!editOrder}
												styles={{
													container:(provided) => ({
														...provided,
														width:"180px"
													}),
													...selectStyles
												}}
												options={[
													{ value: "", label: "None" },
													...warehouse?.map((a, j) => ({
														value: a.warehouse_uuid,
														label: a.warehouse_title
													}))
												]}
												onChange={e => {
													setOrderData(prev => ({
														...prev,
														warehouse_uuid: e.value
													}))
												}}
												value={{
													value: orderData?.warehouse_uuid || "",
													label:
														warehouse.find(a => orderData?.warehouse_uuid === a.warehouse_uuid)
															?.warehouse_title || "None"
												}}
												openMenuOnFocus={true}
												menuPosition="fixed"
												menuPlacement="auto"
												placeholder="Item"
											/>
										</div>
									</div>
									<div className="inputGroup">
										<label htmlFor="Warehouse">Time</label>
										<div style={{display:"flex"}}>
											<div className="inputGroup" style={{ width: "fit-content" }}>
												{/* <label
													htmlFor="order-datetime"
													style={{ margin: "auto", width: "fit-content" }}>
													{new Date(+orderData?.time_1).toDateString()}
												</label> */}
												<input
													type="datetime-local"
													id="order-datetime"
													onChange={handleDateTimeUpdate}
													disabled={!editOrder || dateTimeUpdating === 1}
													value={orderData?.time_1 ? new Date(+orderData?.time_1).toJSON().split(".")[0] : ""}
													/>
											</div>
											{/* {dateTimeUpdating === 2 ? (
												<span style={{ fontSize: "1.1rem" }}>✓</span>
											) : (
												<svg viewBox="0 0 100 100" style={{ width: "20px", opacity: dateTimeUpdating }}>
													<path d="M10 50A40 40 0 0 0 90 50A40 44.8 0 0 1 10 50" fill="#000" stroke="none">
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
											)} */}
										</div>
									</div>
								</div>

								<div className="table-container">
									<div className={"items_table "+(editOrder?"editing":"")}>
										<table cellSpacing="0">
											<thead>
												<tr>
													{editOrder ? <th /> : null}
													<th>#</th>
													<th style={{textAlign:"left"}}>Item Name</th>
													<th>MRP</th>
													{editOrder ? <th style={{textAlign:"center"}}>Status</th> : ""}
													<th>Qty(b)</th>
													<th>Qty(p)</th>
													<th>Price(p)</th>
													<th>Price(b)</th>
													{editOrder ? (
														<>
															<th>Sp Disc</th>
															<th></th>
														</>
													) : null}
													<th></th>
												</tr>
											</thead>
											<tbody className="lh-copy">
												{orderData?.item_details?.map((item, i) => {
													const item_title_component_id = `REACT_SELECT_COMPONENT_ITEM_TITLE@${item.uuid}`
													const item_status_component_id = `REACT_SELECT_COMPONENT_ITEM_STATUS@${item.uuid}`
													return (
														<tr
															key={i}
															style={{
																height: "20px",
																backgroundColor:
																	item.price_approval === "N"
																		? "#00edff"
																		: +item.status === 1
																		? "green"
																		: +item.status === 2
																		? "yellow"
																		: +item.status === 3
																		? "red"
																		: "#fff",
																color:
																	item.price_approval === "N"
																		? "#000"
																		: +item.status === 1 || +item.status === 3
																		? "#fff"
																		: "#000",
															}}
														>
															{editOrder ? (
																<td>
																	{item.price_approval === "N" ? (
																		<span
																			onClick={() =>
																				setOrderData(prev => ({
																					...prev,
																					item_details: prev.item_details?.map(a =>
																						a.uuid === item.uuid
																							? {
																									...a,
																									price_approval: "Y"
																								}
																							: a
																					)
																				}))
																			}
																		>
																			<CheckCircle
																				style={{
																					fontSize: 15,
																					cursor: "pointer",
																					color: "blue"
																				}}
																			/>
																		</span>
																	) : null}
																	<span
																		onClick={() =>
																			setOrderData(prev => {
																				let exicting = order?.fulfillment?.find(a => a.item_uuid === item.item_uuid)
																				let difference = 0
																				if (exicting) {
																					difference =
																						+(item.b || 0) * (+item.conversion || 0) +
																						(+item.p || 0) +
																						(+(exicting.b || 0) * (+item.conversion || 0) + (+exicting.p || 0))
																				}
																				let fulfillment = exicting
																					? [
																							...(prev.fulfillment || []),

																							{
																								item_uuid: item.item_uuid,
																								b: Math.floor(difference / (+item.conversion || 1)),
																								p: Math.floor(difference % (+item.conversion || 1))
																							}
																						]
																					: [
																							...(prev.fulfillment || []),
																							{
																								item_uuid: item.item_uuid,
																								b: item.b,
																								p: item.p
																							}
																						]

																				return {
																					...prev,
																					item_details: prev.item_details?.filter(a => !(a.uuid === item.uuid)),
																					fulfillment
																				}
																			})
																		}
																		style={{
																			outline:"1.25px solid",
																			outlineColor:+item.status === 1 ? "white":"transparent",
																			background:+item.status === 3 ? "transparent":"white",
																			display:"flex",
																			width:"fit-content",
																			borderRadius:"1rem",
																		}}
																	>
																		<FaCircleMinus
																			style={{
																				fontSize: item.price_approval === "N" ? 15 : 20,
																				cursor: "pointer",
																				color: +item.status === 3 ? "white": "red"
																			}}
																		/>
																	</span>
																</td>
															) : null}
															<td style={{ textAlign: "center", width: "3ch" }}>
																{item.sr || i + 1}.
															</td>
															<td>
																<div
																	className="inputGroup"
																	index={!item.default ? listItemIndexCount++ : ""}
																	id={!item.default ? item_title_component_id : ""}
																>
																	{editOrder && !item.default ? (
																		<Select
																			ref={ref => (reactInputsRef.current[item_title_component_id] = ref)}
																			styles={{
																				container: styles => ({
																					...styles,
																					width:"220px",
																					textAlign:'left',
																					padding: 0,
																				}),
																				option: (styles, state) => ({
																					...styles,
																					padding: "4px 8px",
																					color:state.isSelected?"white":"black"
																				}),
																			}}
																			id={"1_item_uuid" + item.uuid}
																			options={itemsData
																				?.filter(
																					a =>
																						!order?.item_details?.filter(b => a.item_uuid === b.item_uuid)?.length &&
																						a.status !== 0
																				)
																				.sort((a, b) => a?.item_title?.localeCompare(b.item_title))
																				.map((a, j) => ({
																					value: a.item_uuid,
																					label:
																						a.item_title +
																						"______" +
																						a.mrp +
																						`, ${
																							company.find(b => b.company_uuid === a.company_uuid)?.company_title
																						}` +
																						(a.qty > 0
																							? " _______[" + CovertedQty(a.qty || 0, a.conversion) + "]"
																							: ""),
																					key: a.item_uuid,
																					qty: a.qty
																				}))}
																			onChange={e => {
																				handleItemSelect(e.value, item.uuid)
																				shiftFocus(item_status_component_id)
																			}}
																			value={{
																				value: item.item_uuid || "",
																				label: item.item_title ? item.item_title + "______" + item.mrp : "",
																				key: item.item_uuid || item.uuid
																			}}
																			openMenuOnFocus={true}
																			autoFocus={
																				focusedInputId === item_title_component_id || (i === 0 && focusedInputId === 0)
																			}
																			menuPosition="fixed"
																			menuPlacement="auto"
																			placeholder="Item"
																		/>
																	) : (
																		itemsData.find(a => a.item_uuid === item.item_uuid)?.item_title || ""
																	)}
																</div>
															</td>
															<td>
																₹{item.mrp || ""}
															</td>
															{editOrder ? (
																<td
																	style={{ textAlign: "left" }}
																	index={listItemIndexCount++}
																	id={item_status_component_id}
																>
																	<Select
																		ref={ref => (reactInputsRef.current[item_status_component_id] = ref)}
																		options={default_status}
																		styles={{
																			container:(provided)=>({
																				...provided,
																				width:"130px",
																				margin:"auto"
																			}),
																			dropdownIndicator: (styles) => ({
																				...styles,
																				padding:"4px"
																			}),
																			indicatorSeparator: (styles) => ({
																				...styles,
																				display:"none"
																			}),
																			option:(provided,state)=>({
																				...provided,
																				color:state.isSelected?"white":"black",
																				padding:"4px"
																			})
																		}}
																		onChange={e => {
																			setOrderData(prev => ({
																				...prev,
																				item_details: prev.item_details?.map(a => {
																					if (a.uuid === item.uuid) {
																						const p_price =
																							+getSpecialPrice(counters, item, order?.counter_uuid)?.price ||
																							item.p_price
																						return {
																							...a,
																							status: e.value,
																							p_price: checkDecimalPlaces(p_price),
																							b_price: chcekIfDecimal(p_price * item.conversion || 0)
																						}
																					} else return a
																				})
																			}))
																			shiftFocus(item_status_component_id)
																		}}
																		value={+item.status >= 0 ? default_status.find(a => +a.value === +item.status) : 0}
																		openMenuOnFocus={true}
																		menuPosition="fixed"
																		menuPlacement="auto"
																		placeholder="Status"
																	/>
																</td>
															) : null}
															<td>
																{editOrder ? (
																	<input
																		id={"q" + item.uuid}
																		type="number"
																		className="numberInput"
																		index={listItemIndexCount++}
																		value={item.b || 0}
																		onChange={e => {
																			setOrderData(prev => {
																				return {
																					...prev,
																					item_details: prev.item_details?.map(a =>
																						a.uuid === item.uuid
																							? {
																									...a,
																									b: e.target.value
																								}
																							: a
																					)
																				}
																			})
																		}}
																		onFocus={e => {
																			e.target.onwheel = () => false
																			e.target.select()
																		}}
																		onKeyDown={e => (e.key === "Enter" ? shiftFocus(e.target.id) : "")}
																		disabled={!item.item_uuid}
																		onWheel={e => e.preventDefault()}
																	/>
																) : (
																	item.b || 0
																)}
															</td>
															<td>
																{editOrder ? (
																	<input
																		id={"p" + item.uuid}
																		type="number"
																		className="numberInput"
																		onWheel={e => e.preventDefault()}
																		index={listItemIndexCount++}
																		value={item.p || 0}
																		onChange={e => {
																			setOrderData(prev => {
																				return {
																					...prev,
																					item_details: prev.item_details?.map(a =>
																						a.uuid === item.uuid
																							? {
																									...a,
																									p: e.target.value
																								}
																							: a
																					)
																				}
																			})
																		}}
																		onFocus={e => {
																			e.target.onwheel = () => false
																			e.target.select()
																		}}
																		onKeyDown={e => (e.key === "Enter" ? shiftFocus(e.target.id) : "")}
																		disabled={!item.item_uuid}
																	/>
																) : (
																	item.p || 0
																)}
															</td>
															<td>
																{editOrder ? (
																	<input
																		type="number"
																		className="numberInput"
																		onWheel={e => e.preventDefault()}
																		index={listItemIndexCount++}
																		value={item?.p_price || 0}
																		onChange={e => onItemPriceChange(e, item)}
																		onFocus={e => {
																			e.target.onwheel = () => false
																			e.target.select()
																		}}
																		onKeyDown={e => (e.key === "Enter" ? shiftFocus(e.target.id) : "")}
																		disabled={!item.item_uuid}
																	/>
																) : (
																	"₹" + chcekIfDecimal(item.p_price || 0)
																)}
															</td>
															<td>
																{editOrder ? (
																	<input
																		type="number"
																		className="numberInput"
																		onWheel={e => e.preventDefault()}
																		index={listItemIndexCount++}
																		value={item?.b_price || ""}
																		onChange={e => {
																			setOrderData(prev => {
																				return {
																					...prev,
																					item_details: prev.item_details.map(a =>
																						a.uuid === item.uuid
																							? {
																									...a,
																									b_price: e.target.value,
																									p_price: truncateDecimals(e.target.value / item.conversion || 0, 4)
																								}
																							: a
																					)
																				}
																			})
																			setEditPrices(prev =>
																				prev.filter(a => a.item_uuid === item.item_uuid).length
																					? prev.map(a =>
																							a.item_uuid === item.item_uuid
																								? {
																										...a,
																										b_price: e.target.value,
																										p_price: checkDecimalPlaces(
																											e.target.value / item.conversion || 0,
																											4
																										)
																									}
																								: a
																						)
																					: prev.length
																					? [
																							...prev,
																							{
																								...item,
																								b_price: e.target.value,
																								p_price: checkDecimalPlaces(e.target.value / item.conversion || 0, 4)
																							}
																						]
																					: [
																							{
																								...item,

																								b_price: e.target.value,
																								p_price: checkDecimalPlaces(e.target.value / item.conversion || 0, 4)
																							}
																						]
																			)
																		}}
																		onFocus={e => {
																			e.target.onwheel = () => false
																			e.target.select()
																		}}
																		onKeyDown={e => (e.key === "Enter" ? shiftFocus(e.target.id) : "")}
																		disabled={!item.item_uuid}
																	/>
																) : (
																	"₹" + truncateDecimals(item?.b_price || 0, 2)
																)}
															</td>
															{editOrder ? (
																<>
																	<td>
																		{item?.charges_discount?.find(a => a.title === "Salesperson Discount")?.value ||
																			"0"}%
																	</td>
																	<td>
																		{+item?.item_price !== +item?.p_price &&
																			(+getSpecialPrice(counters, item, orderData?.counter_uuid)?.price === +item?.p_price ? (
																				<span
																					className="table-icon checkmark"
																					style={{border:"1px solid white"}}
																					onClick={() => spcPricePrompt(item, orderData?.counter_uuid, setCounters)}
																				>S</span>
																			) : (
																				<FaSave
																					style={{fontSize:"1.8rem"}}
																					className="table-icon"
																					title="Save current price as special item price"
																					onClick={() =>	
																						saveSpecialPrice(
																							item,
																							orderData?.counter_uuid,
																							setCounters,
																							+item?.p_price
																						)
																					}
																				/>
																			))}
																	</td>
																	<td>
																		<button className="table-icon fill" onClick={() => setPopupDiscount(item)}>
																			<RiPercentFill />
																		</button>
																	</td>
																</>
															) : item?.assembly_logs?.length ? (
																<td>
																	<button className="table-icon fill" onClick={() => setItemAssemblyLogs(item.assembly_logs)}>
																		<MdOutlineHistory />
																	</button>
																</td>
															) : null}
														</tr>
													)
												})}
											</tbody>
											<tfoot>
												<tr style={{borderBottom:'none'}}>
													{editOrder ? (<td></td>) : null}
													<td></td>
													<td>
														<div style={{textAlign:"right"}}><b>TOTAL</b></div>
													</td>
													{editOrder ? (<td></td>) : null}
													<td></td>
													<td>
														<b>
															{(orderData?.item_details?.length > 1
															? orderData?.item_details?.map(a => +a?.b || 0).reduce((a, b) => a + b)
															: orderData?.item_details?.length
															? orderData?.item_details[0]?.b
															: 0) || 0}
														</b>
													</td>
													<td>
														<b>
															{(orderData?.item_details?.length > 1
																? orderData?.item_details?.map(a => +a?.p || 0).reduce((a, b) => a + b)
																: orderData?.item_details?.length
																? orderData?.item_details[0]?.p
																: 0) || 0}
														</b>
													</td>
													<td></td>
													<td></td>
													{editOrder ? 
														<>
															<td></td>
															<td></td>
															<td></td>
														</> 
													: ""}
												</tr>
											</tfoot>
										</table>
									</div>
								</div>

								<div style={{marginTop:"10px", display:"flex", justifyContent:"space-between"}}>
									<div className="action-buttons center" style={{flexDirection:"row"}}>
										{
											editOrder && <>
												<button
													className="theme-btn"
													disabled={!editOrder}
													onClick={() => {
														setOrderData(prev => ({
															...prev,
															item_details: [...prev.item_details, { uuid: uuid(), b: 0, p: 0, edit: true }]
														}))
														setTimeout(() => document.querySelector(".items_table tbody>tr:last-child").scrollIntoView(), 100);
													}}
												>
													<AddIcon />
													<span>Add Item</span>
												</button>
												<button
													className="theme-btn"
													disabled={!editOrder}
													onClick={() => setHoldPopup("Summary")}
												>
													<MdLocalOffer /> Free
												</button>
											</>
										}
										<button
											className="theme-btn"
											style={{background:editOrder?"red":"var(--main)"}}
											onClick={e => {
												reactInputsRef.current = {}
												e.target.blur()
												// if (!editOrder) {
													getItemsData([])
													getCounters([])
												// }
												setEditOrder(prev => !prev)
										}}
											>
											{
												editOrder 
												? <><MdOutlineEditOff /><span>Discard</span></>
												: <><MdOutlineEdit /><span>Edit Order</span></>
											}
										</button>
										
										{isCancelled && order?.item_details?.[0]?.original_qty && (
											<button
												type="button"
												className="order-btn order-total recreate-order-btn"
												onClick={copyStageConfirmation}
												style={{ width:"auto", fontSize:"unset", fontWeight:'bold' }}
											>
												<Refresh className="refresh" />
												<MdReplay className="add" />
												<span>Recreate</span>
											</button>
										)}
										{editOrder ? (
												<button
													className="order-total"
													type="button"
													style={{ width:"auto",fontSize:'unset',justifyContent:'center',fontWeight:'bold' }}
													onClick={
														window.location.pathname.includes("completeOrderReport") ||
														window.location.pathname.includes("pendingEntry") ||
														window.location.pathname.includes("upiTransactionReport")
															? () =>
																	onSubmit({
																		type: { stage: 0, diliveredUser: "" },
																		completedOrderEdited: 1
																	})
															: () => onSubmit({ type: { stage: 0, diliveredUser: "" } })
													}
												>
													<MdFileDownloadDone />
													Save Changes
												</button>
										) : null}
									</div>
									<div className="order-basic-details">
										<div>
											{waiting ? (
												<div style={{ width: "40px" }}>
													<svg viewBox="0 0 100 100">
														<path d="M10 50A40 40 0 0 0 90 50A40 44.8 0 0 1 10 50" fill="#000" stroke="none">
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
											) : null}
											<button
												type="button"
												onClick={() => {setDeductionsCoinPopup(true)}}
												style={{
													display:"flex",
													alignItems:"center",
													background: "none",
													color: "var(--main)",
													border: "none",
												}}
											>
												<AddCircleOutline style={{fontSize:"32px"}} />
											</button>
											<label>
												{editOrder && (
													<input
														type="checkbox"
														name="payment-pending-status"
														id="payment-pending-status"
														checked={Boolean(orderData?.payment_pending)}
														onChange={e =>
															setOrderData(x => ({
																...x,
																payment_pending: +e.target.checked
															}))
														}
													/>
												)}
												<span><b>Payment pending</b></span>
												{!editOrder && <span>{orderData?.payment_pending ? "Yes" : "No"}</span>}
											</label>
											<div>
												<span
													className={
														window.location.pathname.includes("completeOrderReport") ||
														window.location.pathname.includes("signedBills") ||
														window.location.pathname.includes("pendingEntry") ||
														window.location.pathname.includes("upiTransactionReport")
															? "hover_class"
															: ""
													}
													onClick={() =>
														window.location.pathname.includes("completeOrderReport") ||
														window.location.pathname.includes("signedBills") ||
														window.location.pathname.includes("pendingEntry") ||
														window.location.pathname.includes("upiTransactionReport")
															? setDeliveryPopup("put")
															: {}
													}
												>
													<b>Payment Total</b>
												</span>
												<span>₹{orderData?.payment_total || 0}</span>
											</div>
											<div>
												<span><b>Order Total</b></span>
												<span>₹{orderData?.order_grandtotal || 0}</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
						<div style={{display:"flex", flexDirection:"column",justifyContent:"space-between"}}>
							<div className="action-buttons">
								<button
									className="theme-btn"
									onClick={e => {
										e.target.blur()
										setNotesPoup(prev => !prev)
									}}
								>
									<LuClipboardEdit /><span>Notes</span>
								</button>
								<button
									style={{ backgroundColor: "black", position: "relative" }}
									className="theme-btn"
									onClick={() => {
										if (
											!window.location.pathname.includes("completeOrderReport") &&
											(window.location.pathname.includes("admin") || window.location.pathname.includes("trip"))
										) handleWarehouseChacking()
										else handlePrint()
									}}
								>
									{/* <span style={printLoading ? { color: "transparent" } : null}> */}
										<Print /><span>Print</span>
									{/* </span> */}
									{printLoading ? (
										<span
											style={{
												position: "absolute",
												top: "50%",
												left: "50%",
												translate: "-50% -50%",
												borderColor: "white",
												borderBottomColor: "transparent",
												width: "22px",
												height: "22px",
												borderWidth: "2px",
												zIndex: 99999999999999999
											}}
											className="loader"
										/>
									) : null}
								</button>
								<hr />
								<button className="theme-btn" onClick={checkDMSWrapper}>
									<FaLink />
									<span>DMS INV</span>
								</button>
								<button
									className="theme-btn"
									onClick={() =>
										setPopupDetails({
											type: "Status",
											data: orderData?.status
										})
									}
								>
									<PiCircleDashedBold />
									<span>Status</span>
								</button>
								<hr />
								<button className="theme-btn" onClick={() => setCounterNotesPoup(counters.find(a => a.counter_uuid === orderData?.counter_uuid))}>
									<NoteAdd /><span>Counter Note</span>
								</button>
								<button
									className="theme-btn"
									onClick={e => {
										e.target.blur()
										setCommentPoup(prev => !prev)
									}}
									data-tooltip-id="my-tooltip"
									data-tooltip-content="Comments"
								>
									<Comment /><span>Comments</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{promptLocalState?.active && <Prompt {...promptLocalState} />}
			{holdPopup ? (
				<FreeItems
					close={() => setHoldPopup(false)}
					updateOrder={handleFreeItems}
					orders={orderData}
					itemsData={itemsData}
				/>
			) : (
				""
			)}
			{messagePopup ? (
				<MessagePopup
					onClose={() => updateOrder({ sendPaymentReminder: false, ...messagePopup })}
					message="Update Amount"
					message2={"Rs. " + messagePopup?.data?.order_grandtotal}
					button1="Save"
					button2="Cancel"
					onSave={() => setMessagePopup(false)}
				/>
			) : (
				""
			)}
			{splitHoldPopup ? (
				<MessagePopup
					onClose={splitOrder}
					message="Create Separate Order for Hold ?"
					message2=""
					button1="Save"
					button2="Cancel"
					onSave={() => setSplitHold(false)}
				/>
			) : (
				""
			)}
			{warehousePopup ? (
				<NewUserForm
					onClose={() => setWarhousePopup(false)}
					updateChanges={updateWarehouse}
					popupInfo={warehousePopup}
				/>
			) : (
				""
			)}
			{popupDetails ? (
				<CheckingValues
					onSave={() => setPopupDetails(false)}
					popupDetails={popupDetails}
					users={users}
					items={itemsData}
				/>
			) : (
				""
			)}
			{itemAssemblyLogs ? (
				<ItemAssemblyLogs
					onClose={() => setItemAssemblyLogs(false)}
					popupDetails={itemAssemblyLogs}
				/>
			) : null}
			{popupDiscount ? (
				<DiscountPopup
					onSave={() => setPopupDiscount(false)}
					popupDetails={popupDiscount}
					items={itemsData}
					onUpdate={data => {
						setOrderData({
							...orderData,
							item_details: orderData?.item_details?.map(a =>
								a.item_uuid === data.item_uuid ? { ...a, charges_discount: data.charges_discount } : a
							)
						})
						setPopupDiscount(false)
					}}
				/>
			) : (
				""
			)}
			{taskPopup ? (
				<TaskPopupMenu
					onSave={() => {
						invokePrint()
						setTaskPopup(false)
					}}
					taskData={taskPopup}
					users={users}
					counter={counters.find(a => a.counter_uuid === orderData?.counter_uuid)}
				/>
			) : (
				""
			)}
			{deletePopup ? (
				<DeleteOrderPopup
					onSave={() => setDeletePopup(false)}
					onDeleted={() => {
						setDeletePopup(false)
						onSave()
					}}
					deletePopup={deletePopup}
					order={order}
					counters={counters}
					items={itemsData}
					item_details={order?.item_details}
					HoldOrder={HoldOrder}
					edit_prices={edit_prices}
					updateCompleteOrder={updateCompleteOrder}
				/>
			) : (
				""
			)}

			{notesPopup ? (
				<NotesPopup
					onSave={() => setNotesPoup(false)}
					setSelectedOrder={setOrderData}
					notesPopup={notesPopup}
					HoldOrder={HoldOrder}
					order={orderData}
				/>
			) : (
				""
			)}
			{captionPopup ? (
				<>
					<div className="overlay" style={{ zIndex: 999999999 }}>
						<div className="modal" style={{ height: "fit-content", width: "max-content" }}>
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
										<div className="formGroup" style={{ gap: "20px" }}>
											<div
												className="row"
												style={{
													flexDirection: "row",
													alignItems: "center",
													justifyContent: "start"
												}}
											>
												<label className="selectLabel flex" style={{ width: "20px" }}>
													<input
														type="checkbox"
														name="route_title"
														className="numberInput"
														style={{ width: "20px" }}
														checked={sendCounter}
														placeholder="Enter your title here"
														onChange={e => {
															setSendCounter(e.target.checked)
														}}
													/>
												</label>
												<div>Send To Counter</div>
											</div>
											<div
												className="row"
												style={{
													flexDirection: "row",
													alignItems: "center",
													justifyContent: "space-between"
												}}
											>
												<div style={{ width: "50px" }}>Caption</div>
												<label className="selectLabel flex" style={{ width: "200px" }}>
													<input
														type="text"
														name="route_title"
														className="numberInput"
														style={{ width: "200px" }}
														value={caption}
														placeholder="Enter your caption here"
														onChange={e => {
															setCaption(e.target.value)
														}}
													/>
												</label>
											</div>

											<div id="additional_numbers">
												<div>
													<span>Additional Numbers</span>
													<button
														type="button"
														className="theme-btn"
														onClick={() =>
															setAdditionalNumbers(_i => ({
																..._i,
																count: _i.count + 1
															}))
														}
														// disabled={Object.values(additionalNumbers?.values)?.length < additionalNumbers?.count}
													>
														Add
													</button>
												</div>
												<div>
													{Array(additionalNumbers?.count)
														?.fill("")
														?.map((_, idx) => (
															<input
																key={"additional_mobile_number-" + idx}
																type="text"
																maxLength={10}
																placeholder="Mobile Number"
																value={additionalNumbers?.values?.[idx]}
																onChange={e =>
																	!e.target.value || +e.target.value
																		? setAdditionalNumbers(_i => ({
																				..._i,
																				values: {
																					..._i.values,
																					[idx]: e.target.value
																				}
																		  }))
																		: (e.target.value = additionalNumbers?.values?.[idx] || "")
																}
															/>
														))}
												</div>
											</div>

											<div>
												<span>Users</span>
												<UserSelection
													users={users.filter(a => a.status === 1)}
													selection={userSelection}
													setSelection={setUserSelection}
												/>
											</div>
										</div>

										<div className="flex" style={{ justifyContent: "space-between" }}>
											<button onClick={() => setCaptionPopup(null)} className="closeButton">
												x
											</button>

											{!waiting ? (
												<button type="button" className="submit" onClick={sendMsg}>
													Send
												</button>
											) : (
												<button type="button" className="submit" style={{ width: "80px" }}>
													<svg viewBox="0 0 100 100" style={{ width: "20px" }}>
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
												</button>
											)}
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
			{counterNotesPopup ? (
				<CounterNotesPopup
					onSave={() => setCounterNotesPoup(false)}
					notesPopup={counterNotesPopup}
					HoldOrder={HoldOrder}
					// postOrderData={() => onSubmit({ stage: 5 })}
					setSelectedOrder={setOrderData}
					order={orderData}
				/>
			) : (
				""
			)}
			{popupForm ? (
				<TripPopup
					onSave={() => {
						setPopupForm(false)
						getOrder(orderData?.order_uuid)
					}}
					selectedTrip={selectedTrip}
					setSelectedTrip={setSelectedTrip}
					popupInfo={popupForm}
					orders={orderData}
					trips={tripData}
					onClose={() => {
						setPopupForm(null)

						setSelectedTrip(null)
					}}
				/>
			) : (
				""
			)}

			<OrderPrintWrapper
				componentRef={componentRef}
				orders={[printData]}
				reminderDate={reminderDate}
				users={users}
				items={itemsData}
				counters={counters}
				print={invokePrint}
				category={category}
				route={routeData}
				{...printConfig}
			/>

			{deductionsPopup ? (
				<DiliveryReplaceMent
					onSave={() => setDeductionsPopup(false)}
					data={deductionsData}
					setData={setDeductionsData}
					updateBilling={result => {
						if (
							location.pathname.includes("completeOrderReport") ||
							location.pathname.includes("pendingEntry") ||
							location.pathname.includes("upiTransactionReport")
						) {
							setOrderData(prev => ({
								...prev,
								replacement: result?.replacement || 0,
								shortage: result?.shortage || 0,
								adjustment: result?.adjustment || 0,
								adjustment_remarks: result?.adjustment_remarks || "",
								edit_prices: edit_prices.map(a => ({
									...a,
									item_price: a.p_price
								}))
							}))
							setDeliveryPopup("adjustment")
						} else {
							callBilling(
								{
									...order,
									replacement: result?.replacement || 0,
									shortage: result?.shortage || 0,
									adjustment: result?.adjustment || 0,
									adjustment_remarks: result?.adjustment_remarks || "",
									edit_prices: edit_prices.map(a => ({
										...a,
										item_price: a.p_price
									}))
								},
								true
							)
						}
					}}
				/>
			) : (
				""
			)}
			{deductionsCoinPopup ? (
				<AddCoinPopup
					onSave={() => setDeductionsCoinPopup(false)}
					data={orderData?.coin}
					updateBilling={result => {
						callBilling(
							{
								...order,
								coin: result,
								edit_prices: edit_prices.map(a => ({
									...a,
									item_price: a.p_price
								}))
							},
							true
						)
					}}
				/>
			) : (
				""
			)}
			{commentPopup ? (
				<CommentPopup
					comments={orderData?.comments || []}
					setOrderData={setOrderData}
					onSave={() => {
						setCommentPoup(false)
					}}
					invoice_number={orderData?.invoice_number}
				/>
			) : (
				""
			)}
		</>
	)
}

const DeleteOrderPopup = ({
	onSave,
	order,
	counters,
	items,
	onDeleted,
	deletePopup,
	edit_prices,
	HoldOrder,
	updateCompleteOrder
}) => {
	const [disable, setDisabled] = useState(true)
	const [reason, setReason] = useState("")
	const [sendNotification, setSendNotification] = useState()
	const [messageTemplate, setMessageTemplate] = useState([])
	const [confirm, setConfirm] = useState(false)

	useEffect(() => {
		let controller = new AbortController()
		getMessageTemplate(controller)
		setTimeout(() => setDisabled(false), deletePopup === "hold" ? 100 : 0)
		return () => controller.abort()
	}, [deletePopup])

	const getMessageTemplate = async controller => {
		let response = await axios({
			method: "get",
			url: "/details/getMessageTemplate",
			headers: {
				"Content-Type": "application/json"
			},
			signal: controller.signal
		})
		if (response.data.success) {
			setMessageTemplate(response.data.result)
		}
	}
	const postMessageTemplate = async () => {
		let response = await axios({
			method: "post",
			url: "/details/postOrderCancelMessageTemplate",
			headers: {
				"Content-Type": "application/json"
			},
			data: {
				id: uuid(),
				body: reason
			}
		})
		if (response.data.success) {
			setMessageTemplate(response.data.result)
		}
	}
	const deleteMessageTemplate = async data => {
		let response = await axios({
			method: "delete",
			url: "/details/deleteOrderCancelMessageTemplate",
			headers: {
				"Content-Type": "application/json"
			},
			data
		})
		if (response.data.success) {
			setMessageTemplate(response.data.result)
		}
	}

	const PutOrder = async () => {
		if (deletePopup === "hold") {
			HoldOrder()
			return
		}
		let time = new Date()
		let data = {
			...order,
			status: [
				...order?.status,
				{
					stage: 5,
					user_uuid: localStorage.getItem("user_uuid"),
					time: time.getTime(),
					cancellation_reason: reason
				}
			],
			fulfillment: order?.fulfillment?.length
				? [...order?.fulfillment, ...order?.item_details]
				: order?.item_details,
			item_details: order?.item_details?.map(a => ({
				...a,
				b: 0,
				p: 0,
				original_qty: {
					b: a?.b,
					p: a?.p
				}
			}))
		}

		let billingData = await Billing({
			order_edit: true,
			order_uuid: data?.order_uuid,
			invoice_number: `${data?.order_type || ""}${data?.invoice_number}`,
			replacement: data.replacement,
			adjustment: data.adjustment,
			shortage: data.shortage,
			edit_prices: edit_prices.map(a => ({
				...a,
				item_price: a.p_price
			})),
			counter: counters.find(a => a.counter_uuid === data.counter_uuid),
			items: data.item_details?.map(a => {
				let itemData = items.find(b => a.item_uuid === b.item_uuid)
				return {
					...itemData,
					...a,
					price: itemData?.p_price || 0
				}
			})
		})
		data = {
			...data,
			...billingData,
			notifyCancellation: sendNotification,
			item_details: billingData.items,
			edit: true
		}
		updateCompleteOrder({ data })
		onDeleted()
	}
	
	return (
		<div className="overlay" style={{ zIndex: 9999999999 }}>
			{confirm ? (
				<div
					className="modal"
					style={{
						height: "fit-content",
						width: "max-content",
						paddingTop: "50px"
					}}
				>
					<h3>Do you want to delete message?</h3>
					<div className="flex" style={{ justifyContent: "space-between" }}>
						<button
							type="submit"
							className="submit"
							onClick={e => {
								e.preventDefault()
								setConfirm(false)
							}}
							style={{ backgroundColor: "red" }}
						>
							Discard
						</button>
						<button
							type="submit"
							className="submit"
							onClick={e => {
								e.preventDefault()
								deleteMessageTemplate(confirm)
								setConfirm(false)
							}}
						>
							Confirm
						</button>
					</div>
				</div>
			) : (
				<form
					className="modal"
					style={{
						height: "fit-content",
						width: "max-content",
						paddingTop: "50px"
					}}
					onSubmit={e => {
						e.preventDefault()
						PutOrder()
					}}
				>
					<h3>Order will be {deletePopup?.toLowerCase() === "delete" ? "deleted" : deletePopup?.toLowerCase()}</h3>
					<div className="flex">
						<textarea
							type="text"
							name="cancellation-reason"
							className="cancellation-reason"
							value={reason}
							onChange={e => setReason(e.target.value)}
							placeholder="Cancellation reason"
							required
						/>
						<button
							type="button"
							className="submit"
							style={{  padding: "8px" }}
							onClick={postMessageTemplate}
						>
							<AddIcon />
						</button>
					</div>

					<div
						style={{
							overflowY: "scroll",
							maxHeight: "150px",
							minHeight: "100px",
							width: "100%"
						}}
					>
						{messageTemplate?.map((item, i) => (
							<div
								key={item.id}
								onClick={e => {
									e.stopPropagation()
									setReason(prev => prev + item.body)
								}}
								className="flex"
								style={{
									cursor: "pointer",
									width: "100%",
									justifyContent: "space-between"
								}}
							>
								<div>
									{i + 1}) {item.body}
								</div>
								<div>
									<button
										type="button"
										className="submit"
										style={{
											padding: "0",
											background: "transparent",
											color: "red",
											marginTop: "0"
										}}
										onClick={e => {
											e.stopPropagation()
											setConfirm(item)
										}}
									>
										<DeleteOutline style={{ height: "20px", marginTop: "5px" }} />
									</button>
								</div>
							</div>
						))}
					</div>
					<div
						style={{
							margin: "10px 0",
							display: "flex",
							alignItems: "center",
							gap: "8px"
						}}
					>
						<input
							type="checkbox"
							id="sent-cancellation-notification"
							checked={sendNotification}
							onChange={e => setSendNotification(e.target.checked)}
						/>
						<label htmlFor="sent-cancellation-notification">Send whatsapp update to counter?</label>
					</div>
					<div className="flex">
						<button type="submit" className="submit" disabled={disable} style={{ opacity: disable ? "0.5" : "1" }}>
							Confirm
						</button>
					</div>

					<button onClick={onSave} className="closeButton">
						x
					</button>
				</form>
			)}
		</div>
	)
}
function CheckingValues({ onSave, popupDetails, users, items }) {
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
	return (
		<div className="overlay" style={{ zIndex: 999999999 }}>
			<div className="modal" style={{ height: "fit-content", width: "max-content" }}>
				<h1>{popupDetails.type}</h1>
				<div
					className="content"
					style={{
						height: "fit-content",
						padding: "20px",
						width: "fit-content"
					}}
				>
					<div style={{ overflowY: "scroll", width: "100%" }}>
						{popupDetails.type === "Status" ? (
							<div className="flex" style={{ flexDirection: "column", width: "100%" }}>
								<table
									className="user-table"
									style={{
										maxWidth: '80vw',
										height: "fit-content"
									}}
								>
									<thead>
										<tr>
											<th colSpan={2}>
												<div className="t-head-element">Type</div>
											</th>
											<th colSpan={2}>
												<div className="t-head-element">Time</div>
											</th>
											<th>
												<div className="t-head-element">User</div>
											</th>
										</tr>
									</thead>
									<tbody className="tbody">
										{popupDetails?.data?.length &&
											popupDetails?.data?.map((item, i) => (
												<tr
													key={item?.item_uuid || Math.random()}
													style={{
														height: "30px"
													}}
												>
													<td colSpan={2}>
														{+item.stage === 1
															? "Order Placed By"
															: +item.stage === 2
															? "Order Processed By"
															: +item.stage === 3
															? "Order Checked By"
															: +item.stage === 3.5
															? "Order Delivered By"
															: +item.stage === 4
															? "Order Completed By"
															: ""}
													</td>
													<td colSpan={2}>
														{new Date(+item.time).toDateString() + " " + formatAMPM(new Date(item.time)) || ""}
													</td>
													<td>
														{item.user_uuid === "240522"
															? "Admin"
															: users.find(a => a.user_uuid === item?.user_uuid)?.user_title || ""}
													</td>
												</tr>
											))}
									</tbody>
								</table>
							</div>
						) : popupDetails.type === "Delivery Return" ? (
							<div className="flex" style={{ flexDirection: "column", width: "100%" }}>
								<table
									className="user-table"
									style={{
										width: "max-content",
										height: "fit-content"
									}}
								>
									<thead>
										<tr>
											<th colSpan={2}>
												<div className="t-head-element">Item</div>
											</th>
											<th>
												<div className="t-head-element">Quantity</div>
											</th>
										</tr>
									</thead>
									<tbody className="tbody">
										{popupDetails.data?.map((item, i) => (
											<tr
												key={item?.item_uuid || Math.random()}
												style={{
													height: "30px"
												}}
											>
												<td colSpan={2}>{items.find(a => a.item_uuid === item.item_uuid)?.item_title || ""}</td>
												<td>
													{item?.b || 0}:{item.p || 0}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : popupDetails.type === "Auto Added" ? (
							<div className="flex" style={{ flexDirection: "column", width: "100%" }}>
								<table
									className="user-table"
									style={{
										width: "max-content",
										height: "fit-content"
									}}
								>
									<thead>
										<tr>
											<th colSpan={2}>
												<div className="t-head-element">Item</div>
											</th>
											<th>
												<div className="t-head-element">Quantity</div>
											</th>
										</tr>
									</thead>
									<tbody className="tbody">
										{popupDetails.data?.map((item, i) => (
											<tr
												key={item?.item_uuid || Math.random()}
												style={{
													height: "30px"
												}}
											>
												<td colSpan={2}>{items.find(a => a.item_uuid === item.item_uuid)?.item_title || ""}</td>
												<td>
													{item?.b || 0}:{item.p || 0}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : popupDetails.type === "Fulfillment" ? (
							<div className="flex" style={{ flexDirection: "column", width: "100%" }}>
								<table
									className="user-table"
									style={{
										width: "max-content",
										height: "fit-content"
									}}
								>
									<thead>
										<tr>
											<th colSpan={2}>
												<div className="t-head-element">Item</div>
											</th>
											<th>
												<div className="t-head-element">Quantity</div>
											</th>
										</tr>
									</thead>
									<tbody className="tbody">
										{popupDetails.data?.map((item, i) => (
											<tr
												key={item?.item_uuid || Math.random()}
												style={{
													height: "30px"
												}}
											>
												<td colSpan={2}>{items.find(a => a.item_uuid === item.item_uuid)?.item_title || ""}</td>
												<td>
													{item?.b || 0}:{item.p || 0}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							""
						)}

						<div className="flex" style={{ justifyContent: "space-between" }}>
							<button type="button" className="submit" onClick={onSave}>
								Cancel
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
function ItemAssemblyLogs({ onClose, popupDetails }) {
	return (
		<div className="overlay" style={{ zIndex: 999999999 }}>
			<div className="modal" style={{ height: "fit-content", width: "500px" }}>
				<h1>Item Assembly Logs</h1>
				<div className="content">
					<div style={{ overflowY: "scroll", width: "100%" }}>
						<div className="flex" style={{ flexDirection: "column", width: "100%" }}>
							<table className="user-table">
								<thead>
									<tr>
										<th>
											<div className="t-head-element">Status</div>
										</th>
										<th>
											<div className="t-head-element">Updated At</div>
										</th>
									</tr>
								</thead>
								<tbody className="tbody">
									{popupDetails?.length
										? popupDetails?.toSorted((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())?.map((item) => {
											const date = new Date(item.timestamp)
												.toLocaleString("en-IN", {
													day: "2-digit",
													month: "2-digit",
													year: "numeric",
													hour: "2-digit",
													minute: "2-digit",
													hour12: true
												})
												
											return (
												<tr key={item?._id}>
													<td>{ITEM_STATUS_LABELS[item.status] || "-"}</td>
													<td>{date}</td>
												</tr>
										  	)
										})
										: null}
								</tbody>
							</table>
						</div>

						<button type="button" style={{ marginRight: "10px" }} className="submit" onClick={onClose}>
							Close
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
function DiscountPopup({ onSave, popupDetails, onUpdate }) {
	const [data, setData] = useState([])
	const [edit, setEdit] = useState("")
	useEffect(() => {
		setData(
			popupDetails.charges_discount?.map(a => ({
				...a,
				uuid: a._id || a._id || uuid()
			}))
		)
	}, [popupDetails.charges_discount])

	return (
		<div className="overlay" style={{ zIndex: 999999999 }}>
			<div className="modal" style={{ height: "fit-content", width: "500px" }}>
				<h1>Discount</h1>
				<div className="content">
					<div style={{ overflowY: "scroll", width: "100%" }}>
						<div className="flex" style={{ flexDirection: "column", width: "100%" }}>
							<table className="user-table">
								<thead>
									<tr>
										<th colSpan={2}>
											<div className="t-head-element">Name</div>
										</th>
										<th colSpan={2}>
											<div className="t-head-element">Value</div>
										</th>
									</tr>
								</thead>
								<tbody className="tbody">
									{data?.length
										? data?.map((item, i) => (
												<tr
													key={item?.uuid || Math.random()}
													style={{
														padding: "10px"
													}}
												>
													<td colSpan={2}>
														{item._id ? (
															item.title
														) : (
															<input
																type="text"
																className="numberInput"
																style={{
																	
																}}
																value={item.title || ""}
																onChange={e => {
																	setData(prev =>
																		prev?.map(a =>
																			a.uuid === item.uuid
																				? {
																						...a,
																						title: e.target.value
																				  }
																				: a
																		)
																	)
																	setEdit(true)
																}}
																onFocus={e => {
																	e.target.onwheel = () => false
																	e.target.select()
																}}
																onWheel={e => e.preventDefault()}
															/>
														)}
													</td>
													<td colSpan={2}>
														<input
															type="number"
															className="numberInput"
															style={{
																
															}}
															placeholder="0"
															value={item.value}
															onChange={e => {
																setData(prev =>
																	prev?.map(a => (a.uuid === item.uuid ? { ...a, value: e.target.value } : a))
																)
																setEdit(true)
															}}
															onFocus={e => {
																e.target.onwheel = () => false
																e.target.select()
															}}
															onWheel={e => e.preventDefault()}
														/>
													</td>
												</tr>
										  ))
										: ""}
								</tbody>
							</table>
						</div>

						<div className="flex" style={{ justifyContent: "space-between" }}>
							<div>
								<button type="button" style={{ marginRight: "10px" }} className="submit" onClick={onSave}>
									Cancel
								</button>
								{edit && (
									<button
										type="button"
										className="submit"
										onClick={() => onUpdate({ ...popupDetails, charges_discount: data })}
									>
										Save
									</button>
								)}
							</div>
							<button
								type="button"
								className="submit"
								onClick={() => setData(prev => [...(prev || []), { uuid: uuid() }])}
							>
								<Add />
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
function PaymentPopup({
	onSave,
	postOrderData,
	credit_allowed,
	counters,
	order,
	updateBilling,
	deliveryPopup,
	users,
	onClose
}) {
	const [PaymentModes, setPaymentModes] = useState([])
	const [modes, setModes] = useState([])
	const [error, setError] = useState("")
	const [popup, setPopup] = useState(false)
	const [waiting, setWaiting] = useState(false)
	const [diliveredUser, setDiliveredUser] = useState("")

	// const [coinPopup, setCoinPopup] = useState(false);
	const [data, setData] = useState({})
	const [outstanding, setOutstanding] = useState({})
	const time2 = new Date()
	time2.setHours(12)
	let reminder = useMemo(() => {
		return new Date(
			time2.setDate(
				time2.getDate() + (counters.find(a => a.counter_uuid === order?.counter_uuid)?.payment_reminder_days || 0)
			)
		).getTime()
	}, [counters, order?.counter_uuid])
	let type = useMemo(() => {
		return counters.find(a => a.counter_uuid === order?.counter_uuid)?.outstanding_type || 0
	}, [counters, order?.counter_uuid])
	
	const GetPaymentModes = async () => {
		const cachedData = localStorage.getItem("paymentModesData")

		if (cachedData) {
			setPaymentModes(JSON.parse(cachedData))
			GetReciptsModes()
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
				GetReciptsModes()
			}
		}
	}
	const getTripData = async trip_uuid => {
		const response = await axios({
			method: "post",
			url: "/trips/GetTripData",
			data: { params: ["users"], trips: [trip_uuid].filter(a => a) },
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) {
			
			if (response.data.result[0]?.users[0]) setDiliveredUser(response.data.result[0]?.users[0])
		}
	}
	const GetReciptsModes = async () => {
		const response = await axios({
			method: "post",
			url: "/receipts/getReceipt",
			data: {
				order_uuid: order?.order_uuid,
				invoice_number: order?.invoice_number
			},
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) setModes(response.data.result.modes)
	}
	const GetOutstanding = async () => {
		const response = await axios({
			method: "post",
			url: "/Outstanding/getOutstanding",
			data: {
				order_uuid: order?.order_uuid,
				counter_uuid: order?.counter_uuid
			},
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) setOutstanding(response.data.result)
		else {
			let time = new Date()

			setOutstanding({
				order_uuid: order?.order_uuid,
				amount: "",
				user_uuid: localStorage.getItem("user_uuid"),
				time: time.getTime(),
				invoice_number: order?.invoice_number,
				trip_uuid: order?.trip_uuid,
				counter_uuid: order?.counter_uuid,
				reminder,
				type
			})
		}
	}
	
	useEffect(() => {
		if (deliveryPopup === "put" || deliveryPopup === "edit" || deliveryPopup === "adjustment") {
			GetOutstanding()
		} else {
			let time = new Date()
			setOutstanding({
				order_uuid: order?.order_uuid,
				amount: "",
				user_uuid: localStorage.getItem("user_uuid"),
				time: time.getTime(),
				invoice_number: order?.invoice_number,
				trip_uuid: order?.trip_uuid,
				counter_uuid: order?.counter_uuid,
				reminder,
				type
			})
		}
		GetPaymentModes()
		if (order.trip_uuid) getTripData(order.trip_uuid)
		if (deliveryPopup === "adjustment") {
			updateBilling({
				order_edit: true,
				...order
			})
			setData({
				replacement: order?.replacement || 0,
				shortage: order?.shortage || 0,
				adjustment: order?.adjustment || 0,
				adjustment_remarks: order?.adjustment_remarks || ""
			})
		}
	}, [deliveryPopup, order, reminder, type])
	
	useEffect(() => {
		if (PaymentModes?.length)
			setModes(
				PaymentModes?.map(a => ({
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
		if (waiting) {
			return
		}
		setWaiting(true)
		setTimeout(() => setWaiting(false), 60000)
		if (modes.find(a => a.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002" && a.amt && !a.remarks)) {
			setError("Cheque number is mandatory")
			setWaiting(false)
			return
		}
		updateBilling({
			order_edit: true,
			...order,
			replacement: data?.replacement || 0,
			shortage: data?.shortage || 0,
			adjustment: data?.adjustment || 0,
			adjustment_remarks: data?.adjustment_remarks || ""
		})
		setError("")
		let modeTotal = modes?.map(a => +a.amt || 0)?.reduce((a, b) => a + b)
		if (+order?.order_grandtotal !== +(+modeTotal + (+outstanding?.amount || 0))) {
			setError("Invoice Amount and Payment mismatch")
			setWaiting(false)
			return
		}
		let location = window.location.pathname
		if (
			location.includes("completeOrderReport") ||
			location.includes("signedBills") ||
			location.includes("pendingEntry") ||
			location.includes("upiTransactionReport")
		) {
			onSave({ modes, outstanding, modeTotal })
		} else {
			postOrderData({ diliveredUser, modes, outstanding, modeTotal })

			onSave()
		}
		setWaiting(false)
	}

	const entryTotal = (modes?.reduce((sum, i) => sum + (i.amt || 0), 0) + (+outstanding?.amount || 0)) || 0
	const remainingAmount = (order?.order_grandtotal || 0) - entryTotal

	return (
		<>
			<div className="overlay" style={{ zIndex: 9999999999 }}>
				<div className="modal" style={{ height: "fit-content", width: "max-content" }} onContextMenu={e => e.preventDefault()}>
					<div className="flex" style={{ justifyContent: "space-between" }}>
						<h3>Payments</h3>
						<h3>Rs. {order?.order_grandtotal}</h3>
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
									{PaymentModes?.map(item => {
										const modeAmt = modes.find(a => a.mode_uuid === item.mode_uuid)?.amt
										return (
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
														value={+modeAmt || ""}
														style={{ width: "80px" }}
														disabled={order?.order_type === "E" && item?.mode_title !== "Cash"}
														onContextMenu={e => {
															e.preventDefault()
															e.stopPropagation()
															if (e.target.disabled || !remainingAmount) return
															setModes(prev => 
																prev?.map(a =>
																	a.mode_uuid === item.mode_uuid
																		? ({ ...a, amt: remainingAmount })
																		: a
																)
															)
														}}
														onChange={e => {
															if (+e.target.value && ((entryTotal - (+modeAmt || 0) + (+e.target.value || 0)) > +order?.order_grandtotal)) return
															if (e.target.value === "" || !isNaN(e.target.value))
																setModes(prev =>
																	prev?.map(a =>
																		a.mode_uuid === item.mode_uuid
																			? {
																					...a,
																					amt: (+e.target.value || undefined)
																				}
																			: a
																	)
																)
														}}
														maxLength={42}
														onWheel={e => e.preventDefault()}
														autocomplete="off"
													/>
												</label>
												{
													item.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002" &&
													modes.find(a => a.mode_uuid === item.mode_uuid)?.amt ? (
														<label className="selectLabel flex" style={{ width: "200px" }}>
															<input
																type="text"
																name="route_title"
																className="numberInput"
																value={modes.find(a => a.mode_uuid === item.mode_uuid)?.remarks}
																placeholder={"Cheque Number"}
																style={{
																	width: "100%",
																	backgroundColor: "light",
																	fontSize: "12px"
																}}
																onChange={e =>
																	setModes(prev =>
																		prev?.map(a =>
																			a.mode_uuid === item.mode_uuid ? ({ ...a, remarks: e.target.value }) : a
																		)
																	)
																}
																maxLength={42}
																onWheel={e => e.preventDefault()}
																autocomplete="off"
															/>
														</label>
													) : null
												}
											</div>
									)})}
									<div className="row" style={{ flexDirection: "row", alignItems: "center" }}>
										<div style={{ width: "50px" }}>UnPaid</div>
										<label className="selectLabel flex" style={{ width: "80px" }}>
											<input
												type="number"
												name="route_title"
												className="numberInput"
												value={+outstanding?.amount || 0}
												placeholder={""}
												disabled={order?.order_type === "E"}
												style={
													!credit_allowed === "Y"
														? {
																width: "90px",
																backgroundColor: "light",
																fontSize: "12px",
																color: "#fff"
														  }
														: { width: "80px" }
												}
												onContextMenu={e => {
													if (e.target.disabled || !remainingAmount) return
													e.preventDefault()
													e.stopPropagation()
													setOutstanding(prev => ({
														...prev,
														amount: remainingAmount
													}))
												}}
												onChange={e => {
													if (+e.target.value && ((entryTotal - (+outstanding?.amount || 0) + (+e.target.value || 0)) > +order?.order_grandtotal)) return
													else if (e.target.value === "" || !isNaN(e.target.value))
														setOutstanding(prev => ({
															...prev,
															amount: (+e.target.value || undefined)
														}))
												}}
												maxLength={42}
												onWheel={e => e.preventDefault()}
												autocomplete="off"
											/>
											{/* {popupInfo.conversion || 0} */}
										</label>
										{outstanding?.amount ? (
											<label className="selectLabel flex" style={{ width: "100%" }}>
												<input
													type="text"
													name="route_title"
													className="numberInput"
													value={outstanding?.remarks}
													placeholder={"Remarks"}
													style={{
														width: "100%",
														backgroundColor: "light",
														fontSize: "12px"
													}}
													onChange={e =>
														setOutstanding(prev => ({
															...prev,
															remarks: e.target.value
														}))
													}
													maxLength={42}
													onWheel={e => e.preventDefault()}
													autocomplete="off"
												/>
												{/* {popupInfo.conversion || 0} */}
											</label>
										) : (
											""
										)}
									</div>
									<div>
										<span>Remaining</span>
										<span>
											<b> ₹{+remainingAmount.toFixed(2)}</b>
										</span>
									</div>
									<div className="row" style={{ flexDirection: "row", alignItems: "center" }}>
										{deliveryPopup === "put" ? (
											""
										) : (
											<button
												type="button"
												className="submit"
												style={{ color: "#fff", backgroundColor: "#7990dd" }}
												onClick={() => setPopup(true)}
											>
												Deductions
											</button>
										)}
									</div>
									<div className="row" style={{ flexDirection: "row", alignItems: "center" }}>
										<div style={{ width: "100px" }}>	Delivered By</div>
										<label className="selectLabel flex" style={{ width: "120px" }}>
											<select
												className="numberInput"
												style={{
													width: "100%",
													backgroundColor: "light",
													fontSize: "12px"
												}}
												value={diliveredUser}
												onChange={e => setDiliveredUser(e.target.value)}
											>
												<option value="">None</option>
												{users
													.filter(a => a.status)
													.map(a => (
														<option value={a.user_uuid}>{a.user_title}</option>
													))}
											</select>
											{/* {popupInfo.conversion || 0} */}
										</label>
									</div>
									<i style={{ color: "red" }}>{error}</i>
								</div>

								<div className="flex" style={{ justifyContent: "space-between" }}>
									<button type="button" style={{ backgroundColor: "red" }} className="submit" onClick={onClose}>
										Cancel
									</button>
									<button type="button" className="submit" onClick={submitHandler}>
										Save
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			</div>

			{popup ? (
				<DiliveryReplaceMent
					onSave={() => {
						setPopup(false)
					}}
					setData={setData}
					updateBilling={e =>
						updateBilling({
							order_edit: true,
							...order,
							replacement: e?.replacement || 0,
							shortage: e?.shortage || 0,
							adjustment: e?.adjustment || 0,
							adjustment_remarks: e?.adjustment_remarks || ""
						})
					}
					data={data}
				/>
			) : (
				""
			)}
		</>
	)
}
function CounterNotesPopup({ onSave, notesPopup }) {
	const [notes, setNotes] = useState([])
	const [edit, setEdit] = useState(false)
	useEffect(() => {
		
		setNotes(notesPopup?.notes || [])
	}, [notesPopup?.notes])
	
	const submitHandler = async () => {
		const response = await axios({
			method: "put",
			url: "/counters/putCounter",
			data: [
				{
					counter_uuid: notesPopup.counter_uuid,
					notes
				}
			],
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
			<div className="overlay" style={{ zIndex: 9999999999 }}>
				<div
					className="modal"
					style={{
						height: "fit-content",
						width: "max-content",
						backgroundColor: "cyan"
					}}
				>
					<div className="flex" style={{ justifyContent: "space-between" }}>
						<h3>Counter Notes</h3>
						{/* <h3>Please Enter Notes</h3> */}
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
								<div className="formGroup" style={{ backgroundColor: "#fff" }}>
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
function DMSInvoicePopup({ onSave, order, setNotification }) {
	const [invoiceNumber, setInvoiceNumber] = useState(order?.dms_details?.invoice_number)
	const [edit, setEdit] = useState(false)
	useEffect(() => {
		setInvoiceNumber(order?.dms_details?.invoice_number)
	}, [order?.dms_details?.invoice_number])

	const submitHandler = async () => {
		const response = await axios({
			method: "put",
			url: "/orders/updateDMSInvoiceNumber",
			data: {
				dms_invoice_number: invoiceNumber,
				order_uuid: order?.order_uuid,
				invoice_number: order?.invoice_number
			},
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) {
			onSave()
		} else if (response.data.message) {
			setNotification(response.data)
		}
	}
	return (
		<>
			<div className="overlay" style={{ zIndex: 9999999999 }}>
				<div
					className="modal"
					style={{
						height: "fit-content",
						width: "max-content"
					}}
				>
					<div className="flex" style={{ justifyContent: "space-between" }}>
						<h3>DMS Invoice Number</h3>
						{/* <h3>Please Enter Notes</h3> */}
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
								<div className="formGroup" style={{ backgroundColor: "#fff" }}>
									<div className="row" style={{ flexDirection: "row", alignItems: "start" }}>
										<label className="selectLabel flex" style={{ width: "200px" }}>
											<input
												name="route_title"
												className="numberInput"
												value={invoiceNumber}
												onChange={e => {
													setInvoiceNumber(e.target.value)
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
function NewUserForm({ popupInfo, updateChanges, onClose }) {
	const [data, setdata] = useState("")

	const [warehouse, setWarehouse] = useState([])
	const getItemsData = async () => {
		const response = await axios({
			method: "get",
			url: "/warehouse/GetWarehouseList",

			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) setWarehouse(response.data.result)
	}
	useEffect(() => {
		setdata(popupInfo)
		getItemsData()
	}, [popupInfo])
	const submitHandler = async e => {
		e.preventDefault()
		updateChanges(data)
		onClose()
	}

	return (
		<div className="overlay" style={{ zIndex: 99999999999 }}>
			<div className="modal" style={{ height: "fit-content", width: "fit-content", padding: 50 }}>
				<div
					className="content"
					style={{
						height: "fit-content",
						padding: "20p0",
						marginBottom: "10px",
						width: "fit-content"
					}}
				>
					<div style={{ overflowY: "scroll" }}>
						<form className="form" onSubmit={submitHandler}>
							<div className="row">
								<h1>Update Warehouse</h1>
							</div>

							<div className="formGroup">
								<div className="row">
									<label className="selectLabel">
										Warehouse
										<div className="inputGroup">
											<Select
												options={[
													{ value: 0, label: "None" },
													...warehouse?.map(a => ({
														value: a.warehouse_uuid,
														label: a.warehouse_title
													}))
												]}
												onChange={doc => setdata(doc.value)}
												value={
													data
														? {
																value: data,
																label: warehouse?.find(j => j.warehouse_uuid === data)?.warehouse_title
														  }
														: { value: 0, label: "None" }
												}
												autoFocus={!data}
												openMenuOnFocus={true}
												menuPosition="fixed"
												menuPlacement="auto"
												placeholder="Select"
											/>
										</div>
									</label>
								</div>
							</div>

							<button type="submit" className="submit">
								Save Changes
							</button>
						</form>
					</div>
					<button type="button" onClick={() => onClose()} className="closeButton">
						x
					</button>
				</div>
			</div>
		</div>
	)
}
function TripPopup({ onSave, setSelectedTrip, selectedTrip, trips, onClose, orders }) {
	const submitHandler = async e => {
		e.preventDefault()
		const response = await axios({
			method: "put",
			url: "/orders/putOrders",
			data: [
				{
					order_uuid: orders.order_uuid,
					trip_uuid: selectedTrip.trip_uuid
				}
			],
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) {
			onSave()
		}
	}
	return (
		<div className="overlay" style={{ zIndex: "99999999999" }}>
			<div className="modal" style={{ height: "fit-content", width: "fit-content" }}>
				<div
					className="content"
					// style={{ flexDirection: "row", flexWrap: "wrap", gap: "5" }}
					style={{
						height: "fit-content",
						padding: "20p0",
						marginBottom: "10px",
						width: "fit-content"
					}}
				>
					<div style={{ overflowY: "scroll" }}>
						<form className="form" onSubmit={submitHandler}>
							<div className="row">
								<h1>Assign Trip</h1>
							</div>

							<div className="formGroup">
								Trip
								<div className="row">
									<label className="selectLabel">
										<select
											name="route_title"
											className="numberInput"
											value={selectedTrip.trip_uuid}
											onChange={e =>
												setSelectedTrip({
													trip_uuid: e.target.value,
													warehouse_uuid: trips?.find(a => a.trip_uuid === e.target.value)?.warehouse_uuid || ""
												})
											}
											maxLength={42}
											style={{ width: "200px" }}
										>
											<option value="0">None</option>
											{trips
												?.filter(
													a =>
														a.trip_uuid &&
														a.status &&
														(+JSON.parse(localStorage.getItem("warehouse") || "") === 1 ||
															JSON.parse(localStorage.getItem("warehouse") || "") === a.warehouse_uuid)
												)
												?.map(a => (
													<option value={a.trip_uuid}>{a.trip_title}</option>
												))}
										</select>
									</label>
								</div>
							</div>

							<button type="submit" className="submit">
								Save changes
							</button>
						</form>
					</div>
					<button type="button" onClick={() => onClose()} className="closeButton">
						x
					</button>
				</div>
			</div>
		</div>
	)
}
const UserSelection = ({ users, selection, setSelection }) => {
	const [search, setSearch] = useState("")
	return (
		<div id="counters-list" className="users-list">
			<div style={{ margin: "0" }}>
				<input type="text" value={search} placeholder="Search" onChange={e => setSearch(e.target.value)} />
				<div className="list" style={{ maxHeight: "150px" }}>
					<div>
						<input
							id="all-counters"
							type="checkbox"
							checked={selection?.length === users?.length}
							onChange={() =>
								setSelection(selection?.length === users?.length ? [] : users.map(_i => _i?.user_uuid))
							}
						/>
						<label htmlFor="all-counters">User Title</label>
					</div>
					<hr />
					{users
						?.sort((a, b) => a.user_title.localeCompare(b.user_title))
						?.filter(i => !search || i?.user_title?.toLowerCase()?.includes(search?.toLowerCase()))
						?.map(i => (
							<div key={i?.user_uuid}>
								<input
									type="checkbox"
									id={i?.user_uuid}
									checked={selection?.includes(i?.user_uuid)}
									onChange={e =>
										setSelection(state =>
											state
												.filter(_i => _i !== i?.user_uuid)
												.concat(state?.includes(i?.user_uuid) ? [] : [i?.user_uuid])
										)
									}
								/>
								<label htmlFor={i?.user_uuid}>{i?.user_title}</label>
							</div>
						))}
				</div>
			</div>
		</div>
	)
}
function AddCoinPopup({ onSave, data = 0, updateBilling = () => {} }) {
	const [add, setAdd] = useState(0)
	const [sub, setSub] = useState(0)
	useEffect(() => {
		if (data > 0) {
			setSub(data)
		} else {
			setAdd(-data)
		}
	}, [data])
	return (
		<div className="overlay" style={{ zIndex: "9999999999999" }}>
			<div className="modal" style={{ height: "fit-content", width: "max-content" }}>
				<div
					className="content"
					style={{
						height: "fit-content",
						padding: "20px",
						width: "fit-content"
					}}
				>
					<h2>Adjustment</h2>
					<div style={{ overflowY: "scroll" }}>
						<form className="form">
							<div className="formGroup">
								<div className="row" style={{ flexDirection: "row", alignItems: "center" }}>
									<label className="selectLabel flex" style={{ width: "100px" }}>
										+
										<input
											type="number"
											name="route_title"
											className="numberInput"
											value={add}
											style={{ width: "100px" }}
											onChange={e => setAdd(e.target.value)}
											maxLength={42}
											onWheel={e => e.preventDefault()}
											disabled={sub > 0}
										/>
										{/* {popupInfo.conversion || 0} */}
									</label>
									<label className="selectLabel flex" style={{ width: "100px" }}>
										-
										<input
											type="number"
											name="route_title"
											className="numberInput"
											value={sub}
											style={{ width: "100px" }}
											onChange={e => setSub(e.target.value)}
											maxLength={42}
											onWheel={e => e.preventDefault()}
											disabled={add > 0}
										/>
										{/* {popupInfo.conversion || 0} */}
									</label>
								</div>
							</div>

							<div className="flex" style={{ justifyContent: "space-between" }}>
								<button type="button" style={{ backgroundColor: "red" }} className="submit" onClick={onSave}>
									Cancel
								</button>
								<button
									type="button"
									className="submit"
									onClick={() => {
										updateBilling(-add || sub)
										onSave()
									}}
								>
									Save
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	)
}
function CommentPopup({ comments, onSave, invoice_number, setOrderData }) {
	const [data, setData] = useState([])

	//post request to save bank statement import

	//get request to get bank statement import

	useEffect(() => {
		setData(comments || [])
	}, [comments])

	const submitHandler = async () => {
		const response = await axios({
			method: "put",
			url: "/orders/putOrderComments",
			data: {
				invoice_number,
				comments: data
			},
			headers: {
				"Content-Type": "application/json"
			}
		})
		
		if (response.data.success) {
			setOrderData(prev => ({
				...prev,
				comments: data
			}))
			onSave()
		}
	}

	return (
		<div className="overlay" style={{ zIndex: "99999999999999" }}>
			<div className="modal" style={{ height: "fit-content", width: "fit-content" }}>
				<div
					className="content"
					style={{
						height: "fit-content",
						padding: "20px",
						minWidth: "500px"
					}}
				>
					<div style={{ overflowY: "scroll" }}>
						<div className="form">
							<div className="row">
								<h1>Comments</h1>
							</div>

							<div className="items_table" style={{ flex: "1", height: "75vh", overflow: "scroll" }}>
								<table className="f6 w-100 center" cellSpacing="0">
									<thead style={{ position: "static" }}>
										<tr className="white">
											<th className="pa2 tc bb b--black-20">Notes</th>
											<th className="pa2 tc bb b--black-20">Created At</th>
											<th></th>
										</tr>
									</thead>

									<tbody>
										{data?.map((item, i) => (
											<tr key={item.uuid} item-billing-type={item?.billing_type}>
												<td>
													<input
														id={"p" + item.uuid}
														style={{
															width: "50vw",
															marginLeft: "10px",
															marginRight: "10px"
														}}
														type="text"
														className="numberInput"
														onWheel={e => e.preventDefault()}
														value={item.note || ""}
														onChange={e => {
															setData(prev =>
																prev.map(a => (a.uuid === item.uuid ? { ...a, note: e.target.value } : a))
															)
														}}
														onFocus={e => e.target.select()}
													/>
												</td>
												<td>{new Date(item.created_at).toLocaleDateString()}</td>

												<td className="ph2 pv1 tc bb b--black-20 bg-white" style={{ textAlign: "center" }}>
													<DeleteOutlineIcon
														style={{
															color: "red",
															marginLeft: "10px",
															marginRight: "10px"
														}}
														className="table-icon"
														onClick={() => {
															setData(prev => ({
																...prev,
																counter_notes: prev.counter_notes.filter(a => a.uuid !== item.uuid)
															}))
															
														}}
													/>
												</td>
											</tr>
										))}
										<tr>
											<td
												onClick={() =>
													setData(prev => [
														...(prev || []),
														{
															uuid: uuid(),
															created_at: new Date().toUTCString(),
															note: ""
														}
													])
												}
											>
												<AddIcon sx={{ fontSize: 40 }} style={{ color: "#32bd33", cursor: "pointer" }} />
											</td>
										</tr>
									</tbody>
								</table>
							</div>
							{compareObjects(comments, data) ? (
								<button
									type="button"
									className="submit"
									style={{
										maxWidth: "250px"
									}}
									onClick={() => {
										submitHandler()
									}}
								>
									Save changes
								</button>
							) : (
								""
							)}
						</div>
					</div>
					<button
						onClick={() => {
							onSave(null)
						}}
						className="closeButton"
					>
						x
					</button>
				</div>
			</div>
		</div>
	)
}

const UpdateRate = ({ disabled, updateItemRate, onConfirm }) => {
	const [visible, setVisible] = useState(false)
	const [promptState, setPromptState] = useState({})

	const onRateSelect = async (rate) => {
		const updatedOrderData = await updateItemRate(rate)
		setPromptState({
			active: true,
			heading: `Update items rate to ${rate.toUpperCase()}`,
			message: <span style={{fontSize: "20px!important" }}>
				On confirm, all the items will be updated to use item rate <b>{rate.toUpperCase()}</b>.
				<br />
				<b>Order Grand Total: ₹{updatedOrderData.order_grandtotal}</b>
			</span>,
			actions: [
				{
					label: "Cancel",
					classname: "cancel",
					action: () => setPromptState(null)
				},
				{
					label: `Confirm`,
					classname: "confirm",
					action: async () => {
						try {
							await onConfirm(updatedOrderData)
						} catch (error) {
							console.error(error)
						}
						setPromptState(null)
						setVisible(false)
					}
				}
			]
		})
	}

	return (<div style={{position:"relative"}}>
		<button
			className="theme-btn"
			disabled={disabled}
			onClick={() => setVisible(i => !i)}
		>
			<MdCurrencyRupee />
			<span>Update Rate</span>
			<FaAngleRight size={16} />
		</button>
		{visible &&
			<div id="update-rate-popover">
				<button onClick={() => onRateSelect("")}>Default</button>
				<button onClick={() => onRateSelect("a")}>Item Rate A</button>
				<button onClick={() => onRateSelect("b")}>Item Rate B</button>
				<button onClick={() => onRateSelect("c")}>Item Rate C</button>
				<button onClick={() => onRateSelect("d")}>Item Rate D</button>
			</div>
		}
		{promptState?.active && <Prompt {...promptState} />}
	</div>)
}