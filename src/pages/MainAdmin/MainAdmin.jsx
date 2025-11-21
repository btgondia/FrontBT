import axios from "axios"
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import Header from "../../components/Header"
import Sidebar from "../../components/Sidebar"
import "./style.css"
import CloseIcon from "@mui/icons-material/Close"
import { AiOutlineSearch } from "react-icons/ai"
import Card from "../../components/Card"
import VerticalTabs from "../../components/VerticalTabs"
import { OrderDetails } from "../../components/OrderDetails"
import { ArrowDropDown, Print } from "@mui/icons-material"
import { useReactToPrint } from "react-to-print"
import Select from "react-select"
import { Billing } from "../../Apis/functions"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import ChangeStage from "../../components/ChangeStage"
import MessagePopup from "../../components/MessagePopup"
import TaskPopupMenu from "../../components/TaskPopupMenu"
import SalesPersoneFilterPopup from "../../components/SalesPersoneFilterPopup"
import CollectionTag from "../QuikAccess/CollectionTag"
import { useLocation, useNavigate } from "react-router-dom"
import context from "../../context/context"
import { IoCloseCircle } from "react-icons/io5"
import OrderPrintWrapper from "../../components/OrderPrintWrapper"
import PendingPaymentsSummary from "../../components/prints/PendingPaymentsSummary"
import NotesPopup from "../../components/popups/NotesPopup"
import { getOrderStage, getStageName } from "../../utils/helperFunctions"
import SkipStagesPopup from "../../components/SkipStagesPopup"
import PrintTypePopup from "../../components/PrintTypePopup"
import { GrRefresh } from "react-icons/gr"

const MainAdmin = () => {
	const [isCollectionTags, setCollectionTags] = useState(false)
	const [popupForm, setPopupForm] = useState(false)
	const [noOrder, setNoOrder] = useState(false)
	const [paymentModes, setPaymentModes] = useState([])
	const [ordersData, setOrdersData] = useState([])
	const [details, setDetails] = useState([])
	const [routesData, setRoutesData] = useState([])
	const [salesPersonFilterPopup, setSalesPersoneFilter] = useState(false)
	const [stageFilterPopup, setStageFilterPopup] = useState(false)
	const [salesPersoneList, setSalesPersoneList] = useState([])
	const [stageList, setStageList] = useState([])
	const [tripData, setTripData] = useState([])
	const [counter, setCounter] = useState([])
	const [btn, setBtn] = useState(false)
	const [selectedWarehouseOrders, setSelectedWarehouseOrders] = useState([])
	const [selectedWarehouseOrder, setSelectedWarehouseOrder] = useState(false)
	const [confirmMarkPaymentPendingDialogue, setConfirmMarkPaymentPendingDialogue] = useState(false)

	const [selectedOrder, setSelectedOrder] = useState([])

	const [selectedRouteOrder, setSelectedRouteOrder] = useState({})
	const [selectedTrip, setSelectedTrip] = useState("")
	const [searchItems, setSearhItems] = useState("")
	const [popupOrder, setPopupOrder] = useState(null)
	const [users, setUsers] = useState([])
	const [dropdown, setDropDown] = useState(false)
	const [joinSummary, setJoinSummary] = useState(false)
	const [selectOrder, setSelectOrder] = useState(false)
	const [summaryPopup, setSumaryPopup] = useState(false)
	const [items, setItems] = useState([])
	const [category, setCategory] = useState([])
	const [changesStatePopup, setChangeStatePopup] = useState(false)
	const [holdOrders, setHoldOrders] = useState(false)
	const componentRef = useRef(null)
	const [messagePopup, setMessagePopup] = useState("")

	const [company, setCompanies] = useState([])
	const [tasks, setTasks] = useState([])
	const [reminderDate, setReminderDate] = useState()
	const [selectedtasks, setSelectedTasks] = useState(false)
        const location = useLocation()
        const navigate = useNavigate()
	const [notesState, setNotesState] = useState()
	const [isCooldown, setIsCooldown] = useState(false)

	const {
		updateServerPdf,
		setLoading,
		loading,
		setNotification,
		skipStages,
		setSkipStages,
		printTypePopup,
		setPrintTypePopup,
		setView
	} = useContext(context)

	let user_uuid = localStorage.getItem("user_uuid")

	const paymentsSummaryRef = useRef(null)
	const [showSelect, setShowSelect] = useState()
	const [printDependencies, setPrintDependencies] = useState()

	const printPaymentSummary = useReactToPrint({
		content: () => paymentsSummaryRef.current,
		documentTitle: "Pending Payments Summary",
		removeAfterPrint: true,
		onAfterPrint: () => setPrintDependencies(null),
		onPrintError: () => setPrintDependencies(null)
	})

	const createPaymentSummary = condition => {
		let data
		if (condition === 0) data = selectedOrder?.filter(i => i.payment_pending)
		else data = selectedOrder

		const counterOrders = data
			?.sort((a, b) => +a.time_1 - +b.time_1)
			?.reduce(
				(data, i) => ({
					...data,
					[i.counter_uuid]: {
						orders: (data?.[i.counter_uuid]?.orders || []).concat([i]),
						numbers:
							data?.[i.counter_uuid]?.numbers ||
							counter?.find(c => c?.counter_uuid === i?.counter_uuid)?.mobile?.map(m => m?.mobile)
					}
				}),
				{}
			)

		setPrintDependencies(counterOrders)
	}

	const createPaymentSummaryCopy = condition => {
		let data
		if (condition === 0) data = selectedOrder?.filter(i => i.payment_pending)
		else data = selectedOrder

		const counterOrders = data
			?.sort((a, b) => +a.time_1 - +b.time_1)
			?.reduce(
				(data, i) => ({
					...data,
					[i.counter_uuid]: {
						orders: (data?.[i.counter_uuid]?.orders || []).concat([i]),
						numbers:
							data?.[i.counter_uuid]?.numbers ||
							counter?.find(c => c?.counter_uuid === i?.counter_uuid)?.mobile?.map(m => m?.mobile)
					}
				}),
				{}
			)

		const itemsQuantity = items =>
			Object.values(
				items?.reduce(
					(quantities, i) => ({
						b: (quantities?.b || 0) + +i?.b,
						p: (quantities?.p || 0) + +i?.p
					}),
					{}
				)
			)?.join(":")

		const getDate = i => {
			const date = new Date(i)
			return [date.getDate(), date.getMonth() + 1, date.getFullYear()]
				.map(i => i.toString().padStart(2, "0"))
				.join("/")
		}

		let copyData = Object.keys(counterOrders || {})
			.map(a => {
				let {
					route_title = "",
					counter_title = "",
					credit_rating = "",
					address = "",
					sort_order = 0,
					dms_buyer_name
				} = counter.find(c => c.counter_uuid === a)

				return {
					route_title,
					counter_title,
					credit_rating,
					address,
					sort_order,
					dms_buyer_name,
					orders: counterOrders[a]?.orders || [],
					numbers: counterOrders[a]?.numbers || []
				}
			})
			.filter(Boolean)
			.sort((a, b) => a?.sort_order - b?.sort_order)
			.map(({ route_title, counter_title, credit_rating, address, orders, numbers, dms_buyer_name }) => {
				const orderDetails = orders
					?.map(
						order =>
							`${getDate(+order?.time_1)}        ${order?.invoice_number}        Rs.${
								order?.order_grandtotal
							} ${itemsQuantity(order?.item_details)}          [ ${order?.notes?.join(", ")} ]`
					)
					.join("\n")

				const estimateCashTotal = orders
					?.filter(i => i.order_type === "E")
					?.reduce((sum, i) => sum + +i?.order_grandtotal, 0)

				const restTotal = orders
					?.filter(i => i.order_type !== "E")
					?.reduce((sum, i) => sum + +i?.order_grandtotal, 0)

				let amounts = [
					estimateCashTotal > 0 ? `${estimateCashTotal} (cash)` : null,
					restTotal > 0 ? restTotal : null
				]?.filter(i => i)

				if (amounts.length === 2) amounts = amounts.join(" + ") + " = Rs." + (estimateCashTotal + restTotal)
				else amounts = "Rs." + amounts[0]

				return `
${counter_title}${
					dms_buyer_name?.length > 0 && dms_buyer_name !== counter_title ? ` / ${dms_buyer_name}` : ""
				},${route_title} ${credit_rating ? "[" + credit_rating + "]" : ""} ${numbers?.[0]}
${address}
${orderDetails}
TOTAL: ${amounts}
-----------------------------------------------
                `
			})
			.join("\n")

		navigator.clipboard.writeText(copyData)
		setNotification({
			success: true,
			message: "Copied"
		})
	}

	const paymentSummaryInvokeHandler = () => {
		if (!selectedOrder?.[0]) return
		const pendingPayments = selectedOrder?.filter(i => i.payment_pending)
		const nonPendingPayments = selectedOrder?.filter(i => !i.payment_pending)

		if (pendingPayments?.[0] && nonPendingPayments?.[0]) setShowSelect({ status: true, type: 0 })
		else if (pendingPayments?.[0]) createPaymentSummary(0)
		else if (nonPendingPayments?.[0]) createPaymentSummary(1)
	}

	const paymentSummaryInvokeHandlerCopy = () => {
		if (!selectedOrder?.[0]) return
		const pendingPayments = selectedOrder?.filter(i => i.payment_pending)
		const nonPendingPayments = selectedOrder?.filter(i => !i.payment_pending)

		if (pendingPayments?.[0] && nonPendingPayments?.[0]) setShowSelect({ status: true, type: 1 })
		else if (pendingPayments?.[0]) createPaymentSummaryCopy(0)
		else if (nonPendingPayments?.[0]) createPaymentSummaryCopy(1)
	}

	const selectedOrderGrandTotal = useMemo(
		() =>
			selectedOrder?.length > 1
				? selectedOrder.map(a => +a.order_grandtotal).reduce((a, b) => a + b)
				: selectedOrder.length
				? selectedOrder[0].order_grandtotal
				: "",
		[selectedOrder]
	)

	const selectedPrintOrder = useMemo(() => ordersData?.filter(a => +a.to_print) || [], [ordersData])
	const getItemsDataReminder = async () => {
		const response = await axios({
			method: "get",
			url: "/items/getNewItemReminder",

			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) setReminderDate(response.data.result)
	}
	useEffect(() => {
		if (selectedWarehouseOrders?.length) {
			setSelectedWarehouseOrder(selectedWarehouseOrders[0])
		} else {
			setSelectedWarehouseOrder(false)
		}
	}, [selectedWarehouseOrders])

	const getCompanies = async () => {
		const cachedData = localStorage.getItem("companiesData")

		if (cachedData) {
			setCompanies(JSON.parse(cachedData))
		} else {
			const response = await axios({
				method: "get",
				url: "/companies/getCompanies",
				headers: {
					"Content-Type": "application/json"
				}
			})

			if (response.data.success) {
				localStorage.setItem("companiesData", JSON.stringify(response.data.result))
				setCompanies(response.data.result)
			}
		}
	}

	const reactToPrintContent = useCallback(() => {
		return componentRef.current
	}, [componentRef])
	const [warehouse, setWarehouse] = useState([])
	const getWarehouseDAta = async (controller = new AbortController()) => {
		const response = await axios({
			method: "get",
			url: "/warehouse/GetWarehouseList",
			signal: controller.signal,
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) setWarehouse(response.data.result)
	}
	const getItemCategories = async () => {
		const response = await axios({
			method: "get",
			url: "/itemCategories/GetItemCategoryList",

			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) setCategory(response.data.result)
	}
	const handlePrint = useReactToPrint({
		content: reactToPrintContent,
		removeAfterPrint: true
	})

	const getItemsData = async item_uuid => {
		const cachedData = localStorage.getItem("itemsData")
		if (cachedData) {
			setItems(JSON.parse(cachedData))
		} else {
			const response = await axios({
				method: "post",
				url: "/items/GetItemList",
				data: item_uuid,
				headers: {
					"Content-Type": "application/json"
				}
			})
			if (response.data.success) {
				localStorage.setItem("itemsData", JSON.stringify(response.data.result))
				setItems(response.data.result)
			}
		}
	}

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

	const getCounter = async () => {
		const response = await axios({
			method: "get",
			url: "/counters/GetCounterData",

			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) setCounter(response.data.result)
	}
	const getDetails = async controller => {
		const response = await axios({
			method: "get",
			url: "/details/GetDetails",
			signal: controller.signal,
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) setDetails(response.data.result)
	}
	useEffect(() => {
		if (tasks?.length) setSelectedTasks(tasks[0])
	}, [tasks])

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

	const handleWarehouseChacking = async () => {
		let data = []

		for (let orderData of selectedOrder) {
			let warehouse_uuid = localStorage.getItem("warehouse") || ""
			warehouse_uuid = JSON.parse(warehouse_uuid)

			if (warehouse_uuid && +warehouse_uuid !== 0 && warehouse_uuid !== orderData.warehouse_uuid) {
				
				if (!orderData.warehouse_uuid) {
					updateWarehouse(warehouse_uuid, orderData)
				} else {
					
					data.push({ warehouse_uuid, orderData })
				}
			}
		}

		
		if (data?.length) {
			setSelectedWarehouseOrders(data)
		} else {
			getTasksData()
		}
	}
	const updateWarehouse = async (warehouse_uuid, orderData) => {
		const response = await axios({
			method: "put",
			url: "/orders/putOrders",
			data: [{ ...orderData, warehouse_uuid }],
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) {
			return true
		}
	}
	const getTasksData = async () => {
		const response = await axios({
			method: "post",
			url: "/tasks/getCounterList",
			data: { counter_uuid: selectedOrder.map(a => a.counter_uuid) },
			headers: {
				"Content-Type": "application/json"
			}
		})
		
		if (response.data.success) setTasks(response.data.result)
		else handlePrint()
	}

	const getTripData = async controller => {
		const response = await axios({
			method: "get",
			url: "/trips/GetTripList/" + localStorage.getItem("user_uuid"),
			signal: controller.signal,
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) setTripData(response.data.result)
	}

	const [ordersSpinner, setOrdersSpinner] = useState()

	useEffect(() => {
		const controller = new AbortController()
		if (holdOrders) getRunningHoldOrders()
		else getRunningOrders(controller)

		let intervalOrder = setInterval(async () => {
			if (+sessionStorage.getItem("PREVENT_AUTO_REFRESH") === 1) return
			if (holdOrders) await getRunningHoldOrders()
			else await getRunningOrders(controller)
		}, 600000)

		return () => {
			clearInterval(intervalOrder)
			controller.abort()
		}
	}, [holdOrders, location, popupForm, btn])

	useEffect(() => {
		let controller = new AbortController()
		if (location.pathname.includes("admin")) {
			getRoutesData()
			getTripData(controller)
		} else if (location.pathname.includes("trip")) {
			getTripData(controller)
		}
		return () => {
			controller.abort()
		}
	}, [location.pathname])

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
		const controller = new AbortController()
		getCounter()

		getDetails(controller)
		getUsers()

		getItemCategories()
		getCompanies()
		getItemsDataReminder()
		GetPaymentModes()
		getWarehouseDAta(controller)
		setView(0)
		return () => {
			controller.abort()
		}
	}, [])
	useEffect(() => {
		let item_uuid = ordersData.map(a => a.item_details.map(b => b.item_uuid)).flat()
		if (item_uuid?.length && !items.length) getItemsData(item_uuid)
	}, [ordersData])
	const orders = useMemo(
		() =>
			ordersData
				.filter(
					a =>
						(!salesPersoneList.length ||
							salesPersoneList.filter(b => b === a.status.find(b => +b.stage === 1)?.user_uuid).length) &&
						(!stageList.length || stageList.filter(b => b === getOrderStage(a.status)).length) &&
						(!+users?.find(_u => _u?.user_uuid === user_uuid)?.hide_pending_payments || !+a?.payment_pending) &&
						(!searchItems ||
							a.invoice_number?.toString()?.includes(searchItems?.toLocaleLowerCase()) ||
							a.counter_title?.toLocaleLowerCase()?.includes(searchItems?.toLocaleLowerCase()))
				)
				.sort((a, b) => +a.status[0].time - +b.status[0].time),
		[ordersData, salesPersoneList, searchItems, stageList, user_uuid, users]
	)
	const getRunningOrders = async (controller, setLoadingState = true) => {
		if (!controller) controller = new AbortController()
		if (setLoadingState) setLoading(true)
		const response = await axios({
			method: "get",
			signal: controller.signal,
			url: "/orders/GetOrderAllRunningList/" + user_uuid
		})

		if (response.data.success) {
			let data = response.data.result
			setSelectedOrder(prev => prev.map(a => data.find(b => b.order_uuid === a.order_uuid) || a))

			setOrdersData(response.data.result)
			if (response.data.pdforders?.length) updateServerPdf(response.data.pdforders)
			if (response.data.result?.length === 0) setNoOrder(true)
			else setNoOrder(false)
		} else {
			setNoOrder(true)
			setOrdersData([])
		}
		if (setLoadingState) setLoading(false)
	}
	const getRunningHoldOrders = async () => {
		const response = await axios({
			method: "get",
			url: "/orders/GetOrderHoldRunningList/" + user_uuid
		})

		if (response.data.success) {
			let data = response.data.result
			setSelectedOrder(prev => prev.map(a => data.find(b => b.order_uuid === a.order_uuid) || a))
			setOrdersData(response.data.result)
		} else {
			setOrdersData([])
		}
	}
	

	const postOrderData = async () => {
		const response = await axios({
			method: "put",
			url: "/orders/putOrders",
			data: selectedOrder
				.filter(a => a.order_status !== "A")
				.map(a => ({
					order_uuid: a.order_uuid,
					trip_uuid: +selectedTrip?.trip_uuid === 0 ? "" : selectedTrip?.trip_uuid,
					warehouse_uuid: selectedTrip?.warehouse_uuid
				})),
			headers: {
				"Content-Type": "application/json"
			}
		})
		if (response.data.success) {
			setSelectedOrder([])
			setSelectedTrip("")
			setBtn(prev => !prev)
		}
	}
	const routeOrderLength = useMemo(() => {
		let data = [
			{
				route_uuid: "none",
				route_title: "Unknown",
				orderLength: orders.filter(
					a => counter.filter(c => c.counter_uuid === a.counter_uuid && c.route_uuid === "none")?.length
				)?.length,
				checkingLength: orders.filter(
					b =>
						counter.filter(c => c.counter_uuid === b.counter_uuid && c.route_uuid === "none")?.length &&
						(b.status?.length > 1
							? +b.status.map(x => +x.stage || 0).reduce((c, d) => Math.max(c, d)) === 2
							: +b?.status[0]?.stage === 2)
				)?.length,
				processingLength: orders.filter(
					b =>
						counter.filter(c => c.counter_uuid === b.counter_uuid && c.route_uuid === "none")?.length &&
						(b.status?.length > 1
							? +b.status.map(x => +x.stage || 0).reduce((c, d) => Math.max(c, d)) === 1
							: +b?.status[0]?.stage === 1)
				)?.length,
				deliveryLength: orders.filter(
					b =>
						counter.filter(c => c.counter_uuid === b.counter_uuid && c.route_uuid === "none")?.length &&
						(b.status?.length > 1
							? +b.status.map(x => +x.stage || 0).reduce((c, d) => Math.max(c, d)) === 3
							: +b?.status[0]?.stage === 3)
				)?.length,
				deliveredLength: orders.filter(
					b =>
						counter.filter(c => c.counter_uuid === b.counter_uuid && c.route_uuid === "none")?.length &&
						(b.status?.length > 1
							? +b.status.map(x => +x.stage || 0).reduce((c, d) => Math.max(c, d)) === 3.5
							: +b?.status[0]?.stage === 3.5)
				)?.length
			}
		]

		for (let route of routesData) {
			data.push({
				...route,
				orderLength: orders.filter(
					b => counter.filter(c => c.counter_uuid === b.counter_uuid && route.route_uuid === c.route_uuid)?.length
				)?.length,

				processingLength: orders.filter(
					b =>
						counter.filter(c => c.counter_uuid === b.counter_uuid && route.route_uuid === c.route_uuid)?.length &&
						(b.status?.length > 1
							? +b.status.map(x => +x.stage || 0).reduce((c, d) => Math.max(c, d)) === 1
							: +b?.status[0]?.stage === 1)
				)?.length,
				checkingLength: orders.filter(
					b =>
						counter.filter(c => c.counter_uuid === b.counter_uuid && route.route_uuid === c.route_uuid)?.length &&
						(b.status?.length > 1
							? +b.status.map(x => +x.stage || 0).reduce((c, d) => Math.max(c, d)) === 2
							: +b?.status[0]?.stage === 2)
				)?.length,
				deliveryLength: orders.filter(
					b =>
						counter.filter(c => c.counter_uuid === b.counter_uuid && route.route_uuid === c.route_uuid)?.length &&
						(b.status?.length > 1
							? +b.status.map(x => +x.stage || 0).reduce((c, d) => Math.max(c, d)) === 3
							: +b?.status[0]?.stage === 3)
				)?.length,
				deliveredLength: orders.filter(
					b =>
						counter.filter(c => c.counter_uuid === b.counter_uuid && route.route_uuid === c.route_uuid)?.length &&
						(b.status?.length > 1
							? +b.status.map(x => +x.stage || 0).reduce((c, d) => Math.max(c, d)) === 3.5
							: +b?.status[0]?.stage === 3.5)
				)?.length
			})
		}
		return data
	}, [counter, orders, routesData])

	const TripsOrderLength = useMemo(() => {
		let data = [
			{
				trip_uuid: 0,
				sort_order: 0,
				trip_title: "Unknown",
				orderLength: orders.filter(b => !b.trip_uuid)?.length,
				processingLength: orders.filter(
					b =>
						!b.trip_uuid &&
						(b.status?.length > 1
							? +b.status.map(x => +x.stage).reduce((c, d) => Math.max(c, d)) === 1
							: +b?.status[0]?.stage === 1)
				)?.length,
				checkingLength: orders.filter(
					b =>
						!b.trip_uuid &&
						(b.status?.length > 1
							? +b.status.map(x => +x.stage).reduce((c, d) => Math.max(c, d)) === 2
							: +b?.status[0]?.stage === 2)
				)?.length,
				deliveryLength: orders.filter(
					b =>
						!b.trip_uuid &&
						(b.status?.length > 1
							? +b.status.map(x => +x.stage).reduce((c, d) => Math.max(c, d)) === 3
							: +b?.status[0]?.stage === 3)
				)?.length,
				deliveredLength: orders.filter(
					b =>
						!b.trip_uuid &&
						(b.status?.length > 1
							? +b.status.map(x => +x.stage).reduce((c, d) => Math.max(c, d)) === 3.5
							: +b?.status[0]?.stage === 3.5)
				)?.length
			}
		]

		for (let trip of tripData) {
			data.push({
				...trip,
				orderLength: orders.filter(b => trip.trip_uuid === b.trip_uuid)?.length,
				processingLength: orders.filter(
					b =>
						trip.trip_uuid === b.trip_uuid &&
						(b.status?.length > 1
							? +b.status.map(x => +x.stage).reduce((c, d) => Math.max(c, d)) === 1
							: +b?.status[0]?.stage === 1)
				)?.length,
				checkingLength: orders.filter(
					b =>
						trip.trip_uuid === b.trip_uuid &&
						(b.status?.length > 1
							? +b.status.map(x => +x.stage).reduce((c, d) => Math.max(c, d)) === 2
							: +b?.status[0]?.stage === 2)
				)?.length,
				deliveryLength: orders.filter(
					b =>
						trip.trip_uuid === b.trip_uuid &&
						(b.status?.length > 1
							? +b.status.map(x => +x.stage).reduce((c, d) => Math.max(c, d)) === 3
							: +b?.status[0]?.stage === 3)
				)?.length,
				deliveredLength: orders.filter(
					b =>
						trip.trip_uuid === b.trip_uuid &&
						(b.status?.length > 1
							? +b.status.map(x => +x.stage).reduce((c, d) => Math.max(c, d)) === 3.5
							: +b?.status[0]?.stage === 3.5)
				)?.length
			})
		}
		return data.sort((a,b) => (+a.sort_order || data.length) - (+b.sort_order || data.length))
	}, [orders, tripData])

	const updatePendingPaymentsVisibility = async () => {
		try {
			const user = users?.find(_i => _i?.user_uuid === user_uuid)
			user.hide_pending_payments = +!(user?.hide_pending_payments || 0)
			setUsers(state => state?.map(_i => (_i?.user_uuid === user_uuid ? user : _i)))
			await axios.put("/users/putUser", {
				user_uuid,
				hide_pending_payments: user.hide_pending_payments
			})
		} catch (error) {
			
		}
	}

	const markAsPendingPayment = async updatedData => {
		setLoading(true)
		try {
			if (notesState?.index < selectedOrder?.length - 1) {
				setNotesState(prev => ({
					...prev,
					index: prev?.index + 1,
					data: (prev?.data || []).concat(updatedData)
				}))
			} else {
				const data = (notesState?.data || []).concat([updatedData]).map(i => ({
					...i,
					payment_pending: 1,
					status:
						Math.max(...i?.status?.map(s => +s.stage)) < 3.5
							? i.status.concat([
									{
										stage: 3.5,
										time: Date.now(),
										user_uuid: localStorage.getItem("user_uuid")
									}
							  ])
							: i.status
				}))
				setNotesState({})
				await axios.put("/orders/putOrders", data)
				setOrdersData(prev =>
					prev.map(i => ({
						...i,
						...(data?.find(_i => _i.order_uuid === i.order_uuid) || {})
					}))
				)
			}
		} catch (error) {
			console.error(error)
		}
		setLoading(false)
	}

	const handleRefresh = async () => {
		if (isCooldown) return

		setOrdersSpinner(true)
		setIsCooldown(true)

		try {
			if (holdOrders) await getRunningHoldOrders()
			else await getRunningOrders(null, false)
			setNotification({ success: true, message: "Refreshed successfully!" })
		} catch (error) {
			setNotification({ success: false, message: "Failed to refresh!" })
		}

		setTimeout(() => setNotification(null), 5000)
		setOrdersSpinner(null)

		setTimeout(() => setIsCooldown(false), 10000)
	}

	return (
		<>
			<div
				style={{
					position: "fixed",
					bottom: "10vh",
					left: 0,
					fontSize: "20px",
					zIndex: "9999999999999",
					fontWeight: "bold",
					width: "100px",
					textAlign: "center"
				}}
			>
				{selectedOrderGrandTotal}
			</div>
			<Sidebar setCollectionTags={setCollectionTags} />
			<div
				className="right-side"
				onContextMenu={e => {
					e.preventDefault()
					e.stopPropagation()
					setSelectOrder(prev => !prev)
					setSelectedOrder([])
				}}
			>
				<Header headerActions={
					<>
						<button className="theme-btn simple" onClick={handleRefresh}>
							<GrRefresh
								style={{fontSize:'18px'}}
								className={ordersSpinner ? "rotating" : ""}
							/>
						</button>
						{selectedPrintOrder.length ? (
							<div
								onClick={() => {
									setSelectOrder(false)
									handlePrint()
									axios({
										method: "put",
										url: "/orders/putOrders",
										data: selectedPrintOrder.map(a => ({ ...a, to_print: 0 })),
										headers: {
											"Content-Type": "application/json"
										}
									}).then(response => {
										if (response.data.success) {
											setBtn(prev => !prev)
										}
									})
								}}
							>
								<div style={{ position: "relative" }}>
									<span
										className="flex"
										style={{
											position: "absolute",
											color: "#fff",
											backgroundColor: "red",
											borderRadius: "50%",
											width: "10px",
											height: "10px",
											fontSize: "10px",
											right: "1px"
										}}
									>
										{selectedPrintOrder?.length}
									</span>
									<Print />
								</div>
							</div>
						) : null}
					</>
				} />
				<div
					style={
						holdOrders
							? { backgroundColor: "#f2e017", display: "flex", height: "100%" }
							: { display: "flex", height: "100%" }
					}
				>
					<VerticalTabs />
					<div className="inputs">
						<div
							id="customer-dropdown-trigger"
							className={"active"}
							style={{
								position: "fixed",
								top: "70px",
								right: "10px",
								backgroundColor: "#fff",
								padding: "8px",
								width: "fit-content"
							}}
							onClick={e => {
								setDropDown(prev => !prev)
							}}
						>
							<ArrowDropDown
								style={{
									transform: !dropdown ? "rotate(360deg)" : "rotate(180deg)"
								}}
							/>
						</div>
					</div>
					{confirmMarkPaymentPendingDialogue ? (
						<MessagePopup
							onSave={() => {
								setConfirmMarkPaymentPendingDialogue(false)
								setSelectedOrder(prev => prev.filter(i => !i.payment_pending))
								setNotesState({ active: true, index: 0 })
							}}
							onClose={() => {
								setConfirmMarkPaymentPendingDialogue(false)
							}}
							message={"Are you sure you want to mark the selected orders as pending payment?"}
							button2={"Confirm"}
							button1={"Discard"}
						/>
					) : (
						""
					)}
					{dropdown && (
						<div
							id="customer-details-dropdown"
							className={"page1 flex"}
							style={{ top: "100px", flexDirection: "column", zIndex: "200" }}
							onMouseLeave={() => setDropDown(false)}
						>
							<button
								className="simple_Logout_button"
								onClick={() => {
									setSalesPersoneFilter(!salesPersoneList.length)
									setSalesPersoneList([])
								}}
							>
								{!salesPersoneList.length ? "Sales Person Filter" : "Cancel Filter"}
							</button>
							<button
								className="simple_Logout_button"
								onClick={() => {
									setStageFilterPopup(!stageList.length)
									setStageList([])
								}}
							>
								{!stageList.length ? "Order Status Filter" : "Cancel Status Filter"}
							</button>
							{!selectOrder ? (
								<>
									<button
										className="simple_Logout_button"
										onClick={() => {
											setPopupForm(true)
											setDropDown(false)
										}}
									>
										Add Trip
									</button>
									{holdOrders ? (
										<button
											// style={{ padding: "10px" }}
											className="simple_Logout_button"
											type="button"
											onClick={() => {
												setHoldOrders(false)
												setOrdersData([])
											}}
										>
											Show Running Orders
										</button>
									) : (
										<></>
									)}
								</>
							) : (
								<>
									{selectedOrder?.length ? (
										<>
											<button
												className="simple_Logout_button"
												type="button"
												onClick={() => {
													setSumaryPopup(true)
													setDropDown(false)
												}}
											>
												Item Summary
											</button>
											<button
												className="simple_Logout_button"
												type="button"
												onClick={() => setConfirmMarkPaymentPendingDialogue(true)}
											>
												Mark As Pending Payment
											</button>
											<button type="button" className="simple_Logout_button" onClick={paymentSummaryInvokeHandler}>
												Pending Payments Summary
											</button>
											<button
												type="button"
												className="simple_Logout_button"
												onClick={paymentSummaryInvokeHandlerCopy}
											>
												Copy Pending Payments Summary
											</button>
										</>
									) : (
										""
									)}
								</>
							)}
                                                        <button className="simple_Logout_button" onClick={updatePendingPaymentsVisibility}>
                                                                {!users?.find(_i => _i?.user_uuid === user_uuid)?.hide_pending_payments
                                                                        ? "Hide Pending Payments"
                                                                        : "Show Pending Payments"}
                                                        </button>
                                                        {selectOrder && selectedOrder?.length ? (
                                                              <>
  <>
  <button
    type="button"
    className="simple_Logout_button"
    onClick={() => {
      sessionStorage.setItem(
        "orderAssemblySelectedOrders",
        JSON.stringify(selectedOrder)
      );
      navigate("/admin/orderAssembly", { state: { orders: selectedOrder } });
    }}
  >
    Order Assembly
  </button>

  <button
  type="button"
  className="simple_Logout_button"
  onClick={() => {
    if (!selectedOrder || selectedOrder.length === 0) {
      alert("Please select at least 1 order.");
      return;
    }

    // ✅ allow only Processing (stage === 1)
    const nonProcessing = selectedOrder.find((o) => {
      const statusArr = o.status || o.Status || [];
      const last = statusArr[statusArr.length - 1] || {};

      // stage might be in different keys, so we try a few
      const rawStage =
        last.stage ??
        last.Stage ??
        last.stage_id ??
        last.status ??
        last.Status;

      const stage = Number(rawStage);

      // if stage is missing/invalid, don't block (to avoid false positives)
      if (!rawStage || Number.isNaN(stage)) {
        return false;
      }

      // block if it is clearly not Processing
      return stage !== 1;
    });

    if (nonProcessing) {
      const orderNo =
        nonProcessing.order_number ||
        nonProcessing.order_no ||
        nonProcessing.OrderNo ||
        nonProcessing.order_uuid ||
        "";
      alert(
        `Only Processing Orders Allowed (problem: ${orderNo || "unknown"})`
      );
      return;
    }

    sessionStorage.setItem(
      "orderAssemblySelectedOrders",
      JSON.stringify(selectedOrder)
    );
    navigate("/admin/assembly-grouping", { state: { orders: selectedOrder } });
  }}
>
  Assembly Grouping
</button>


</>


</>

																
                                                        ) : null}
                                                </div>
                                        )}
					<div className="content-container" id="content-file-container">
						{noOrder ? (
							<div className="noOrder">No Order</div>
						) : location.pathname.includes("admin") ? (
							<>
								{routeOrderLength?.map(route => {
									const orders_data = orders?.filter(
										b =>
											counter.filter(
												c =>
													c.counter_uuid === b.counter_uuid &&
													(route.route_uuid === c.route_uuid ||
														((!c.route_uuid || c.route_uuid === "none") && route.route_uuid === "none"))
											)?.length
									)

									if (orders_data?.length)
										return (
											<div key={route.route_uuid} className="sectionDiv">
												<h1>
													<span
														style={{ cursor: "pointer" }}
														onClick={() =>
															setJoinSummary(
																orders?.filter(
																	b =>
																		counter.filter(
																			c =>
																				c.counter_uuid === b.counter_uuid &&
																				(route.route_uuid === c.route_uuid ||
																					((!c.route_uuid || c.route_uuid === "none") &&
																						route.route_uuid === "none"))
																		)?.length
																)
															)
														}
													>
														{route.route_title}
													</span>{" "}
													<span>({route.orderLength})</span>
													<span>
														[ Processing {route?.processingLength}, Checking {route.checkingLength}, OFD{" "}
														{route?.deliveryLength}, Delivered {route?.deliveredLength} ]
													</span>
													<span>({[...new Set(orders_data?.map(_i => _i?.counter_uuid))]?.length})</span>
													{selectOrder ? (
														<input
															type="checkbox"
															style={{
																marginLeft: "10px",
																transform: "scale(1.5)"
															}}
															onClick={() =>
																orders.filter(
																	a =>
																		counter.filter(
																			c =>
																				c.counter_uuid === a.counter_uuid &&
																				(route.route_uuid === c.route_uuid ||
																					((!c.route_uuid || c.route_uuid === "none") &&
																						route.route_uuid === "none"))
																		)?.length && selectedOrder.filter(b => b.order_uuid === a.order_uuid)?.length
																)?.length ===
																orders.filter(
																	a =>
																		counter.filter(
																			c =>
																				c.counter_uuid === a.counter_uuid &&
																				(route.route_uuid === c.route_uuid ||
																					((!c.route_uuid || c.route_uuid === "none") &&
																						route.route_uuid === "none"))
																		)?.length
																)?.length
																	? setSelectedOrder(
																			selectedOrder.filter(
																				b =>
																					!orders.filter(
																						a =>
																							counter.filter(
																								c =>
																									c.counter_uuid === a.counter_uuid &&
																									(route.route_uuid === c.route_uuid ||
																										((!c.route_uuid || +c.route_uuid === 0) &&
																											+route.route_uuid === 0))
																							)?.length && b.order_uuid === a.order_uuid
																					)?.length
																			)
																	  )
																	: setSelectedOrder(
																			selectedOrder?.length
																				? [
																						...selectedOrder.filter(
																							b =>
																								!orders.filter(
																									a =>
																										counter.filter(
																											c =>
																												c.counter_uuid === a.counter_uuid &&
																												(route.route_uuid === c.route_uuid ||
																													((!c.route_uuid || +c.route_uuid === 0) &&
																														+route.route_uuid === 0))
																										)?.length && b.order_uuid === a.order_uuid
																								)?.length
																						),
																						...orders.filter(
																							a =>
																								counter.filter(
																									c =>
																										c.counter_uuid === a.counter_uuid &&
																										(route.route_uuid === c.route_uuid ||
																											((!c.route_uuid || +c.route_uuid === 0) &&
																												+route.route_uuid === 0))
																								)?.length
																						)
																				  ]
																				: orders.filter(
																						a =>
																							counter.filter(
																								c =>
																									c.counter_uuid === a.counter_uuid &&
																									(route.route_uuid === c.route_uuid ||
																										((!c.route_uuid || +c.route_uuid === 0) &&
																											+route.route_uuid === 0))
																							)?.length
																				  )
																	  )
															}
															defaultChecked={
																orders.filter(
																	a =>
																		counter.filter(
																			c =>
																				c.counter_uuid === a.counter_uuid &&
																				(route.route_uuid === c.route_uuid ||
																					((!c.route_uuid || c.route_uuid === "none") &&
																						route.route_uuid === "none"))
																		)?.length && selectedOrder.filter(b => b.order_uuid === a.order_uuid)?.length
																)?.length ===
																orders.filter(
																	a =>
																		counter.filter(
																			c =>
																				c.counter_uuid === a.counter_uuid &&
																				(route.route_uuid === c.route_uuid ||
																					((!c.route_uuid || c.route_uuid === "none") &&
																						route.route_uuid === "none"))
																		)?.length
																)?.length
															}
														/>
													) : (
														""
													)}
												</h1>
												<div
													className="content"
													style={{
														flexDirection: "row",
														flexWrap: "wrap",
														gap: "0px",
														marginBottom: "10px",
														paddingBottom: "20px",
														height: "fit-content"
													}}
													id="seats_container"
												>
													{orders_data?.map(item => {
														return (
															<div
																className={"seatSearchTarget " + (
																	(!selectOrder && +item?.priority === 1 && +item?.status?.at(-1)?.stage === 1)
																		? "shaking-cards"
																		: ""
																)}
																style={{ height: "fit-content" }}
																key={item.order_uuid}
																onClick={e =>
																	selectOrder
																		? setSelectedOrder(prev =>
																				prev.filter(a => a.order_uuid === item.order_uuid)?.length
																					? prev.filter(a => a.order_uuid !== item.order_uuid)
																					: prev?.length
																					? [...prev, item]
																					: [item]
																		  )
																		: setSelectedRouteOrder(item.order_uuid)
																}
																onDoubleClick={() => setSelectedRouteOrder(item.order_uuid)}
															>
																<span
																	className="dblClickTrigger"
																	style={{ display: "none" }}
																/>
																<Card
																	details={details}
																	order={item}
																	onDoubleClick={() => setPopupOrder(item)}
																	getOrders={() => {
																		if (holdOrders) getRunningHoldOrders()
																		else getRunningOrders()
																	}}
																	setSelectOrder={setSelectOrder}
																	dateTime={item?.status[0]?.time}
																	title1={item?.invoice_number || ""}
																	selectedOrder={
																		selectOrder
																			? selectedOrder.filter(a => a.order_uuid === item.order_uuid)?.length
																			: selectedRouteOrder === item.order_uuid
																	}
																	selectedCounter={
																		selectedOrder.filter(a => a.counter_uuid === item.counter_uuid)?.length
																	}
																	title2={item?.counter_title || ""}
																	status={getStageName(getOrderStage(item?.status))}
																	rounded
																/>
															</div>
														)
													})}
												</div>
											</div>
										)
									else return null
								})}
							</>
						) : (
							<>
								{
									(() => {
										const ordersData = orders.filter(a => !a?.trip_uuid)
										if (!ordersData?.length) return null
										return (
											<div key={Math.random()} className="sectionDiv">
												<h2>
													<span
														style={{ cursor: "pointer" }}
														onClick={() => setJoinSummary(orders.filter(a => !a?.trip_uuid))}
													>
														UnKnown
													</span>{" "}
													({ordersData?.length}) [Processing{" "}
													{TripsOrderLength.find(a => +a.trip_uuid === 0)?.processingLength}, Checking{" "}
													{TripsOrderLength.find(a => +a.trip_uuid === 0)?.checkingLength}, OFD{" "}
													{TripsOrderLength.find(a => +a.trip_uuid === 0)?.deliveryLength}, OFD{" "}
													{TripsOrderLength.find(a => +a.trip_uuid === 0)?.deliveredLength}]
													{selectOrder ? (
														<input
															type="checkbox"
															style={{
																marginLeft: "10px",
																transform: "scale(1.5)"
															}}
															defaultChecked={
																orders.filter(
																	a =>
																		!a?.trip_uuid &&
																		selectedOrder.filter(b => b.order_uuid === a.order_uuid)?.length
																)?.length === orders.filter(a => !a?.trip_uuid)?.length
															}
															onClick={() =>
																orders?.filter(
																	a =>
																		!a?.trip_uuid &&
																		selectedOrder?.filter(b => b.order_uuid === a.order_uuid)?.length
																)?.length === orders?.filter(a => !a?.trip_uuid)?.length
																	? setSelectedOrder(
																			selectedOrder.filter(
																				b =>
																					!orders.filter(a => !a?.trip_uuid && b.order_uuid === a.order_uuid)
																						?.length
																			)
																		)
																	: setSelectedOrder(
																			selectedOrder?.length
																				? [
																						...selectedOrder.filter(
																							b =>
																								!orders.filter(a => !a?.trip_uuid && b.order_uuid === a.order_uuid)
																									?.length
																						),
																						...orders.filter(a => !a?.trip_uuid)
																					]
																				: orders?.filter(a => !a?.trip_uuid)
																		)
															}
														/>
													) : (
														""
													)}
												</h2>
												<div
													className="content"
													style={{
														flexDirection: "row",
														flexWrap: "wrap",
														gap: "0",
														marginBottom: "10px",
														height: "fit-content"
													}}
													id="seats_container"
												>
													{orders

														.filter(a => !a?.trip_uuid)

														.map(item => {
															return (
																<div
																	className={`seatSearchTarget ${
																		!selectOrder && +item?.priority === 1 && +item?.status?.at(-1)?.stage === 1
																			? "shaking-cards"
																			: ""
																	}`}
																	style={{ height: "fit-content" }}
																	key={item.order_uuid}
																	onClick={e =>
																		selectOrder
																			? setSelectedOrder(prev =>
																					prev.filter(a => a.order_uuid === item.order_uuid)?.length
																						? prev.filter(a => a.order_uuid !== item.order_uuid)
																						: prev?.length
																						? [...prev, item]
																						: [item]
																				)
																			: setSelectedRouteOrder(item.order_uuid)
																	}
																>
																	<span
																		className="dblClickTrigger"
																		style={{ display: "none" }}
																		// onClick={() =>
																		//   menuOpenHandler(item)
																		// }
																	/>

																	<Card
																		details={details}
																		getOrders={() => {
																			if (holdOrders) getRunningHoldOrders()
																			else getRunningOrders()
																		}}
																		setSelectOrder={setSelectOrder}
																		order={item}
																		onDoubleClick={() => setPopupOrder(item)}
																		// on_order={order}
																		dateTime={item?.status[0]?.time}
																		// key={item.seat_uuid}
																		title1={item?.invoice_number || ""}
																		selectedCounter={
																			selectedOrder.filter(a => a.counter_uuid === item.counter_uuid)?.length
																		}
																		selectedOrder={
																			selectOrder
																				? selectedOrder.filter(a => a.order_uuid === item.order_uuid)?.length
																				: selectedRouteOrder === item.order_uuid
																		}
																		title2={item?.counter_title || ""}
																		status={getStageName(getOrderStage(item?.status))}
																		// price={item.price}
																		// visibleContext={visibleContext}
																		// setVisibleContext={setVisibleContext}
																		// isMouseInsideContext={isMouseInsideContext}
																		// seats={seatsState.filter(s => +s.seat_status === 1)}
																		rounded
																	/>
																</div>
															)
														})}
												</div>
											</div>
										)
									})()
								}
								{TripsOrderLength?.map(trip => {
									const orders_data = orders?.filter(a => a.trip_uuid === trip.trip_uuid)
									if (orders_data?.length)
										return (
											<div key={trip.trip_uuid} className="sectionDiv">
												<h1>
													<span
														style={{ cursor: "pointer" }}
														onClick={() => setJoinSummary(orders.filter(a => a.trip_uuid === trip.trip_uuid))}
													>
														{trip.trip_title}
													</span>{" "}
													<span>({trip.orderLength})</span>
													<span>
														[Processing {trip?.processingLength}, Checking {trip?.checkingLength}, OFD{" "}
														{trip?.deliveryLength}
														,Delivered {trip?.deliveredLength}]
													</span>
													<span>
														{trip?.users?.[0]
															? `[${trip?.users
																	?.map(a => users?.find(b => b.user_uuid === a)?.user_title)
																	?.join(", ")}]`
															: ""}
													</span>
													<span>({[...new Set(orders_data?.map(_i => _i?.counter_uuid))]?.length})</span>
													{selectOrder ? (
														<input
															type="checkbox"
															style={{
																marginLeft: "10px",
																transform: "scale(1.5)"
															}}
															defaultChecked={
																orders.filter(
																	a =>
																		a.trip_uuid === trip.trip_uuid &&
																		selectedOrder.filter(b => b.order_uuid === a.order_uuid)?.length
																)?.length === orders.filter(a => a.trip_uuid === trip.trip_uuid)?.length
															}
															onClick={() =>
																orders?.filter(
																	a =>
																		a.trip_uuid === trip.trip_uuid &&
																		selectedOrder?.filter(b => b.order_uuid === a.order_uuid)?.length
																)?.length === orders?.filter(a => a.trip_uuid === trip.trip_uuid)?.length
																	? setSelectedOrder(
																			selectedOrder.filter(
																				b =>
																					!orders.filter(
																						a => a.trip_uuid === trip.trip_uuid && b.order_uuid === a.order_uuid
																					)?.length
																			)
																	  )
																	: setSelectedOrder(
																			selectedOrder?.length
																				? [
																						...selectedOrder.filter(
																							b =>
																								!orders.filter(
																									a =>
																										a.trip_uuid === trip.trip_uuid && b.order_uuid === a.order_uuid
																								)?.length
																						),
																						...orders.filter(a => a.trip_uuid === trip.trip_uuid)
																				  ]
																				: orders?.filter(a => a.trip_uuid === trip.trip_uuid)
																	  )
															}
														/>
													) : (
														""
													)}
												</h1>
												<div
													className="content"
													style={{
														flexDirection: "row",
														flexWrap: "wrap",
														gap: "0px",
														marginBottom: "10px",
														paddingBottom: "20px",
														height: "fit-content"
													}}
													id="seats_container"
												>
													{orders_data?.map(item => (
														<div
															className={"seatSearchTarget " + (
																(!selectOrder && +item?.priority === 1 && +item?.status?.at(-1)?.stage === 1)
																	? "shaking-cards"
																	: ""
															)}
															style={{ height: "fit-content" }}
															key={item.order_uuid}
															onClick={e =>
																selectOrder
																	? setSelectedOrder(prev =>
																			prev.filter(a => a.order_uuid === item.order_uuid)?.length
																				? prev.filter(a => a.order_uuid !== item.order_uuid)
																				: prev?.length
																				? [...prev, item]
																				: [item]
																		)
																	: setSelectedRouteOrder(item.order_uuid)
															}
														>
															<span
																className="dblClickTrigger"
																style={{ display: "none" }}
															/>
															<Card
																details={details}
																order={item}
																onDoubleClick={() => setPopupOrder(item)}
																getOrders={() => {
																	if (holdOrders) getRunningHoldOrders()
																	else getRunningOrders()
																}}
																setSelectOrder={setSelectOrder}
																dateTime={item?.status[0]?.time}
																title1={item?.invoice_number || ""}
																selectedOrder={
																	selectOrder
																		? selectedOrder.filter(a => a.order_uuid === item.order_uuid)?.length
																		: selectedRouteOrder === item.order_uuid
																}
																selectedCounter={
																	selectedOrder.filter(a => a.counter_uuid === item.counter_uuid)?.length
																}
																title2={item?.counter_title || ""}
																status={getStageName(getOrderStage(item?.status))}
																rounded
															/>
														</div>
													))}
												</div>
											</div>
										)
									else return ""
								})}
							</>
						)}

						<div
							className="searchBar"
							style={{
								zIndex: 1,
								width: selectedOrder.length ? "69%" : "510px"
							}}
						>
							<input
								type="text"
								placeholder="Search..."
								style={{ maxWidth: "300px", maxHeight: "50px" }}
								value={searchItems}
								onChange={e => setSearhItems(e.target.value)}
							/>

							{selectedOrder.length ? (
								<>
									<button
										className="simple_Logout_button"
										style={{ minWidth: "100px", margin: "0 20px 10px 20px" }}
										type="button"
										onClick={() => {
											setPopupForm({ type: "edit" })
											setDropDown(false)
										}}
									>
										Assign Trip
									</button>
									<button
										className="simple_Logout_button"
										style={{ minWidth: "100px", margin: "0 20px 10px 20px" }}
										type="button"
										onClick={() => handleWarehouseChacking()}
									>
										Print Invoice
									</button>
									<button
										className="simple_Logout_button"
										style={{ minWidth: "100px", margin: "0 20px 10px 20px" }}
										type="button"
										onClick={() => {
											const stage = selectedOrder?.map(a => +a.status[a.status?.length - 1]?.stage)
											
											setChangeStatePopup(stage?.sort((a, b) => a - b)?.at(-1))
										}}
									>
										Change Stage
									</button>
								</>
							) : (
								""
							)}
						</div>
					</div>

					{isCollectionTags && (
						<CollectionTag isTripsModalOpen={isCollectionTags} setIsTripsModalOpen={setCollectionTags} />
					)}
				</div>
			</div>

			<OrderPrintWrapper
				componentRef={componentRef}
				orders={selectOrder ? selectedOrder : selectedPrintOrder}
				reminderDate={reminderDate}
				users={users}
				items={items}
				counters={counter}
				category={category}
				route={routesData}
			/>

			{selectedWarehouseOrder ? (
				<WarehouseUpdatePopup
					onClose={() =>
						setSelectedWarehouseOrders(prev => {
							if (prev?.length === 1) {
								getTasksData()
								return []
							} else {
								prev.filter(a => a.orderData.order_uuid !== selectedWarehouseOrder.orderData.order_uuid)
							}
						})
					}
					updateChanges={updateWarehouse}
					popupInfo={selectedWarehouseOrder}
					warehouse={warehouse}
				/>
			) : (
				""
			)}
			{popupForm ? (
				<NewUserForm
					onSave={() => {
						setPopupForm(false)
						postOrderData()
						setSelectOrder("")
					}}
					selectedTrip={selectedTrip}
					setSelectedTrip={setSelectedTrip}
					setRoutesData={setRoutesData}
					popupInfo={popupForm}
					orders={selectedOrder}
					trips={tripData}
					onClose={() => {
						setPopupForm(null)
						setSelectOrder("")
						setSelectedOrder([])
						setSelectedTrip(null)
					}}
					warehouse={warehouse}
				/>
			) : (
				""
			)}
			{selectedtasks ? (
				<TaskPopupMenu
					onSave={() => {
						if (tasks?.length === 1) {
							handlePrint()
							setTasks([])
							setSelectedTasks(false)
						} else {
							setTasks(prev => prev.filter(a => a.task_uuid !== selectedtasks.task_uuid))
						}
					}}
					taskData={selectedtasks}
					users={users}
					counter={counter.find(a => a.counter_uuid === selectedtasks.counter_uuid)}
				/>
			) : (
				""
			)}
			{popupOrder ? (
				<OrderDetails
					onSave={() => {
						setPopupOrder(null)
						setTimeout(() => {
							if (holdOrders) getRunningHoldOrders()
							else getRunningOrders()
						}, 3000)
					}}
					order_uuid={popupOrder.order_uuid}
					items={items}
					counter={counter}
					paymentModeData={paymentModes}
					itemCategories={category}
					trips={tripData}
					userData={users}
					orderJson={{
						...popupOrder,
						item_details: popupOrder?.item_details
							?.map(a => ({
								...a,
								category_title: category.find(
									b => b.category_uuid === items.find(b => b.item_uuid === a.item_uuid)?.category_uuid
								)?.category_title
							}))
							.sort(
								(a, b) =>
									a?.category_title?.localeCompare(b.category_title) || a?.item_title?.localeCompare(b.item_title)
							)
					}}
					warehouseData={warehouse}
					reminder={reminderDate}
				/>
			) : (
				""
			)}
			{messagePopup ? (
				<MessagePopup
					onClose={() => {
						setMessagePopup("")
					}}
					message={messagePopup}
					button1="Okay"
				/>
			) : (
				""
			)}
			{salesPersonFilterPopup ? (
				<SalesPersoneFilterPopup
					onClose={() => {
						setSalesPersoneFilter(false)
					}}
					users={users}
					setSalesPersoneList={setSalesPersoneList}
				/>
			) : (
				""
			)}
			{stageFilterPopup ? (
				<SalesPersoneFilterPopup
					onClose={() => {
						setStageFilterPopup(false)
					}}
					type="stage"
					setSalesPersoneList={setStageList}
				/>
			) : (
				""
			)}
			{skipStages ? (
				<SkipStagesPopup
					onClose={() => {
						setSkipStages(false)
					}}
					type="stage"
				/>
			) : (
				""
			)}
			{printTypePopup ? (
				<PrintTypePopup
					onClose={() => {
						setPrintTypePopup(false)
					}}
					type="stage"
				/>
			) : (
				""
			)}
			{summaryPopup ? (
				<HoldPopup
					onSave={() => {
						setSumaryPopup(false)
						if (holdOrders) getRunningHoldOrders()
						else getRunningOrders()
					}}
					orders={selectedOrder}
					itemsData={items}
					counter={counter}
					category={category}
					setPopupOrder={setPopupOrder}
					updateOrders={() => {
						const controller = new AbortController()
						if (location.pathname.includes("admin") || location.pathname.includes("trip")) {
							if (holdOrders) getRunningHoldOrders()
							else getRunningOrders()
						}
						if (location.pathname.includes("admin")) {
							getRoutesData()
						} else if (location.pathname.includes("trip")) {
							getTripData(controller)
						}
					}}
				/>
			) : (
				""
			)}
			{joinSummary ? (
				<SummaryPopup
					onSave={() => {
						setJoinSummary(false)
						if (holdOrders) getRunningHoldOrders()
						else getRunningOrders()
					}}
					setOrdersData={setOrdersData}
					orders={joinSummary}
					itemsData={items}
					counter={counter}
					category={category}
					company={company}
					setPopupOrder={setPopupOrder}
					updateOrders={() => {
						const controller = new AbortController()
						if (location.pathname.includes("admin") || location.pathname.includes("trip")) {
							if (holdOrders) getRunningHoldOrders()
							else getRunningOrders()
						}
						if (location.pathname.includes("admin")) {
							getRoutesData()
						} else if (location.pathname.includes("trip")) {
							getTripData(controller)
						}
					}}
				/>
			) : (
				""
			)}
			{changesStatePopup ? (
				<ChangeStage
					onClose={() => {
						setChangeStatePopup(false)
						setSelectOrder("")
						setSelectedOrder([])
						setTimeout(() => {
							if (holdOrders) getRunningHoldOrders()
							else getRunningOrders()
						}, 3000)
					}}
					orders={selectedOrder}
					stage={changesStatePopup}
					counters={counter}
					items={items}
					users={users}
					isLoading={loading}
					setIsLoading={setLoading}
					setNotification={setNotification}
				/>
			) : (
				""
			)}
			{printDependencies && (
				<div className="overlay" style={{ opacity: 0, zIndex: "-1" }}>
					<PendingPaymentsSummary
						print={printPaymentSummary}
						counterOrders={printDependencies}
						paymentsSummaryRef={paymentsSummaryRef}
						routers={routesData}
						counters={counter}
					/>
				</div>
			)}
			{showSelect?.status && (
				<div className="overlay">
					<div className="payment-summary-type">
						<h3>Select payment summary type</h3>
						<div>
							<button
								onClick={() => (showSelect?.type === 0 ? createPaymentSummary(0) : createPaymentSummaryCopy(0))}
							>
								Pending payments only
							</button>
							<button
								onClick={() => (showSelect?.type === 0 ? createPaymentSummary(1) : createPaymentSummaryCopy(1))}
							>
								All payments
							</button>
						</div>
						<button onClick={() => setShowSelect(null)} className="close-btn">
							<IoCloseCircle />
						</button>
					</div>
				</div>
			)}
			{notesState?.active && (
				<NotesPopup
					mainDashboard={true}
					orderInfo={true}
					order={selectedOrder[notesState?.index]}
					onSave={() => setNotesState(false)}
					customSubmit={markAsPendingPayment}
					counterName={
						counter?.find(i => i.counter_uuid === selectedOrder?.[notesState?.index]?.counter_uuid)?.counter_title
					}
				/>
			)}
		</>
	)
}

export default MainAdmin
function NewUserForm({ onSave, popupInfo, setSelectedTrip, selectedTrip, trips, onClose, warehouse }) {
	const [data, setdata] = useState("")
	const [errMassage, setErrorMassage] = useState("")

	const [edit, setEdit] = useState(true)

	useEffect(() => {
		if (popupInfo?.type === "edit") setSelectedTrip({ trip_uuid: "0", warehouse_uuid: "" })
		else {
			let warehouse_uuid = JSON.parse(localStorage.getItem("warehouse") || "")
			setdata({
				warehouse_uuid
			})
			setEdit(warehouse_uuid ? false : true)
		}
	}, [popupInfo?.type])
	const submitHandler = async e => {
		e.preventDefault()
		if (popupInfo?.type === "edit") {
			
			onSave()
		} else {
			if (!data.trip_title) {
				setErrorMassage("Please insert Trip Title")
				return
			}

			const response = await axios({
				method: "post",
				url: "/trips/postTrip",
				data,
				headers: {
					"Content-Type": "application/json"
				}
			})
			if (response.data.success) {
				onSave()
			}
		}
	}
	return (
		<div className="overlay">
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
								<h1>{popupInfo.type === "edit" ? "Edit" : "Add"} Trip</h1>
							</div>

							<div className="formGroup">
								{popupInfo.type === "edit" ? "Trip" : "Trip Title"}
								{popupInfo.type === "edit" ? (
									<div className="row">
										<label className="selectLabel">
											<select
												name="route_title"
												className="numberInput"
												value={selectedTrip?.trip_uuid}
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
													.filter(
														a =>
															a.trip_uuid &&
															a.status &&
															(+JSON.parse(localStorage.getItem("warehouse")) === 1 ||
																JSON.parse(localStorage.getItem("warehouse") || "") === a.warehouse_uuid)
													)
													.map(a => (
														<option key={a.trip_uuid} value={a.trip_uuid}>{a.trip_title}</option>
													))}
											</select>
										</label>
									</div>
								) : (
									<>
										<div className="row">
											<label className="selectLabel">
												<input
													type="text"
													name="route_title"
													className="numberInput"
													value={data?.trip_title}
													onChange={e =>
														setdata({
															...data,
															trip_title: e.target.value
														})
													}
													maxLength={42}
												/>
											</label>
										</div>{" "}
										<div className="row">
											<label className="selectLabel">
												Warehouse
												<div className="inputGroup" style={{ width: "200px" }}>
													<Select
														options={[
															{ value: 0, label: "None" },
															...warehouse.map(a => ({
																value: a.warehouse_uuid,
																label: a.warehouse_title
															}))
														]}
														onChange={doc =>
															setdata(prev => ({
																...prev,
																warehouse_uuid: doc.value
															}))
														}
														value={
															data?.warehouse_uuid
																? {
																		value: data?.warehouse_uuid,
																		label: warehouse?.find(j => j.warehouse_uuid === data.warehouse_uuid)
																			?.warehouse_title
																  }
																: { value: 0, label: "None" }
														}
														autoFocus={!data?.warehouse_uuid}
														openMenuOnFocus={true}
														menuPosition="fixed"
														menuPlacement="auto"
														placeholder="Select"
														isDisabled={!edit}
													/>
												</div>
											</label>
										</div>{" "}
									</>
								)}
							</div>
							<i style={{ color: "red" }}>{errMassage === "" ? "" : "Error: " + errMassage}</i>

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

function HoldPopup({ onSave, orders, itemsData, counter, category, setPopupOrder, updateOrders }) {
	const [items, setItems] = useState([])
	const [stage, setStage] = useState("")
	const [itemStatus, setItemStatus] = useState("")
	const [FilteredOrder, setFilteredOrder] = useState([])
	const [popup, setPopup] = useState(false)
	const [orderTotal, setOrderTotal] = useState(0)
	const componentRef = useRef(null)
	const componentBoxRef = useRef(null)
	const [filterItemTitle, setFilterItemTile] = useState("")

	const reactToPrintContent = useCallback(() => {
		return componentRef.current
	}, [])

	const reactToBoxPrintContent = useCallback(() => {
		return componentBoxRef.current
	}, [])

	const handlePrint = useReactToPrint({
		content: reactToPrintContent,
		removeAfterPrint: true
	})
	const handleBoxPrint = useReactToPrint({
		content: reactToBoxPrintContent,
		documentTitle: "BoxStatement",
		removeAfterPrint: true
	})
	const stagesData = [
		{ value: "all", label: "All" },
		{ value: 1, label: "Processing" },
		{ value: 2, label: "Checking" },
		{ value: 3, label: "Out For Delivery" },
		{ value: 3.5, label: "Out For Delivery" }
	]
	const ItemsStatusData = [
		{ value: "all", label: "All" },
		{ value: 0, label: "Placed" },
		{ value: 1, label: "Complete" },
		{ value: 2, label: "Hold" },
		{ value: 3, label: "Canceld" }
	]
	useEffect(() => {
		let orderStage = orders.map(a => ({
			...a,
			stage:
				a.status?.length > 1
					? a.status.map(b => +b.stage || 0).reduce((c, b) => Math.max(c, b))
					: a.status[0].stage
		}))

		setFilteredOrder(orderStage)
		orderStage = orderStage.filter(a => stage === "all" || +a.stage === stage)

		let data = [].concat
			.apply(
				[],
				orderStage.map(a => a.item_details)
			)
			.filter(a => itemStatus === "all" || +a.status === itemStatus)
			.map(a => {
				
				let itemDetails = itemsData?.find(b => b.item_uuid === a.item_uuid)
				return {
					...a,
					item_title: itemDetails?.item_title,
					mrp: itemDetails?.mrp,
					category_uuid: itemDetails?.category_uuid
				}
			})

		

		let result = []
		for (let item of data) {
			var existing = result.filter(function (v, i) {
				return v.item_uuid === item.item_uuid
			})

			if (existing?.length === 0) {
				let itemsFilteredData = data.filter(a => a.item_uuid === item.item_uuid)
				let b =
					itemsFilteredData?.length > 1
						? itemsFilteredData?.map(c => +c.b || 0).reduce((c, d) => c + d)
						: +itemsFilteredData[0]?.b || 0
				let p =
					itemsFilteredData?.length > 1
						? itemsFilteredData?.map(c => +c.p || 0).reduce((c, d) => c + d)
						: +itemsFilteredData[0]?.p || 0
				let free =
					itemsFilteredData?.length > 1
						? itemsFilteredData?.map(c => +c.free || 0).reduce((c, d) => c + d)
						: +itemsFilteredData[0]?.free || 0
				let obj = {
					...item,
					order_count: orders.filter(a => a.item_details.filter(b => b.item_uuid === item.item_uuid)?.length)
						?.length,
					b: parseInt(+b + (+p + free) / +itemsData?.find(b => b.item_uuid === item.item_uuid)?.conversion),
					p: parseInt((+p + free) % +itemsData?.find(b => b.item_uuid === item.item_uuid)?.conversion)
				}
				result.push(obj)
			}
		}

		setOrderTotal(
			orderStage?.length > 1
				? orderStage.map(a => +a?.order_grandtotal || 0).reduce((a, b) => a + b)
				: orderStage[0]?.order_grandtotal
		)
		
		setItems(result)
	}, [stage, itemStatus, orders, itemsData])

	return (
		<>
			<div className="overlay">
				<div
					className="modal"
					style={{
						height: "600px",
						width: "max-content",
						minWidth: "300px",
						paddingTop: "50px"
					}}
				>
					<div className="flex" style={{ justifyContent: "space-between", alignItems: "start" }}>
						<h1>Summary</h1>
						{stage && itemStatus ? (
							<>
								<div
									className="flex"
									style={{
										flexDirection: "column",
										justifyContent: "space-between",
										height: "80px"
									}}
								>
									<button
										style={{ width: "fit-Content", backgroundColor: "black" }}
										className="theme-btn"
										onClick={() => {
											handlePrint()
										}}
									>
										Print
									</button>
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
										<button
											style={{
												width: "fit-Content",
												backgroundColor: "black",
												position: "absolute",
												right: "-100px"
											}}
											className="theme-btn"
											onClick={() => {
												handleBoxPrint()
											}}
										>
											Box
										</button>
									</div>
								</div>
								<h3>Orders Total:Rs. {orderTotal}</h3>
							</>
						) : (
							""
						)}
					</div>

					<div
						className="content"
						style={{
							height: "fit-content",
							padding: "20px",
							width: "fit-content"
						}}
					>
						<div style={{ overflowY: "scroll", width: "100%" }}>
							{stage && (itemStatus || itemStatus === 0) ? (
								items?.length ? (
									<div className="flex" style={{ flexDirection: "column", width: "100%" }}>
										<table
											className="user-table"
											style={{
												width: "600px",
												height: "fit-content"
											}}
										>
											<thead>
												<tr>
													<th>Sr.</th>
													<th colSpan={3}>
														<div className="t-head-element">Item</div>
													</th>
													<th colSpan={2}>
														<div className="t-head-element">MRP</div>
													</th>
													<th colSpan={2}>
														<div className="t-head-element">Qty</div>
													</th>
													<th colSpan={2}>
														<div className="t-head-element">Order Count</div>
													</th>
												</tr>
											</thead>
											<tbody className="tbody">
												{category
													.filter(
														a =>
															items?.filter(
																b =>
																	(!filterItemTitle ||
																		b.item_title
																			.toLocaleLowerCase()
																			.includes(filterItemTitle?.toLocaleLowerCase())) &&
																	a.category_uuid === b.category_uuid
															)?.length
													)
													.map(a => (
														<React.Fragment key={a.category_uuid}>
															<tr>
																<td colSpan={8}>{a.category_title}</td>
															</tr>

															{items
																?.filter(
																	b =>
																		(!filterItemTitle ||
																			b.item_title
																				?.toLocaleLowerCase()
																				?.includes(filterItemTitle?.toLocaleLowerCase())) &&
																		a.category_uuid === b.category_uuid
																)
																.sort((a, b) => a?.item_title?.localeCompare(b?.item_title))
																?.map((item, i) => (
																	<tr
																		key={item?.item_uuid || Math.random()}
																		style={{
																			height: "30px",
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
																		onClick={() => setPopup(item)}
																	>
																		<td>{i + 1}</td>
																		<td colSpan={3}>{item.item_title}</td>
																		<td colSpan={2}>{item.mrp}</td>
																		<td colSpan={2}>
																			{Math.floor(item?.b || 0)} : {item?.p || 0}
																		</td>
																		<td colSpan={2}>{item.order_count || 0}</td>
																	</tr>
																))}
														</React.Fragment>
													))}
												<tr
													style={{
														height: "30px",
														fontWeight: "bold"
													}}
												>
													<td>Total</td>
													<td colSpan={3}></td>
													<td colSpan={2}></td>
													<td colSpan={4}>
														{Math.floor(
															items?.length > 1
																? items.map(a => +a.b || 0).reduce((a, b) => a + b)
																: items[0].b || 0
														)}{" "}
														:{" "}
														{items?.length > 1
															? items.map(a => +a.p || 0).reduce((a, b) => a + b)
															: items[0].p || 0}
													</td>
												</tr>
												<tr
													style={{
														height: "30px",
														fontWeight: "bold"
													}}
												>
													<td colSpan={4}>Total Lines</td>

													<td colSpan={2}></td>
													<td colSpan={4}>
														{Math.floor(
															orders?.length > 1
																? orders.map(a => a.item_details.length || 0).reduce((a, b) => a + b)
																: orders[0]?.item_details.length || 0
														)}
													</td>
												</tr>
											</tbody>
										</table>
									</div>
								) : (
									<div className="flex" style={{ flexDirection: "column", width: "100%" }}>
										<i>No Data Present</i>
									</div>
								)
							) : stage ? (
								<div style={{ width: "400px" }}>
									<h3>Item Status</h3>
									<Select
										options={ItemsStatusData}
										onChange={doc => setItemStatus(doc.value)}
										value={
											itemStatus
												? {
														value: itemStatus,
														label: ItemsStatusData?.find(j => j.value === itemStatus)?.label
												  }
												: ""
										}
										openMenuOnFocus={true}
										menuPosition="fixed"
										menuPlacement="auto"
										placeholder="Select"
									/>
								</div>
							) : !stage ? (
								<div style={{ width: "400px" }}>
									<h3>Order Stage</h3>
									<Select
										options={stagesData}
										onChange={doc => setStage(doc.value)}
										value={
											stage
												? {
														value: stage,
														label: stagesData?.find(j => j.value === stage)?.label
												  }
												: ""
										}
										openMenuOnFocus={true}
										menuPosition="fixed"
										menuPlacement="auto"
										placeholder="Select"
									/>
								</div>
							) : (
								""
							)}
						</div>
						<button onClick={onSave} className="closeButton">
							x
						</button>
					</div>
				</div>
			</div>
			{popup ? (
				<OrdersEdit
					order={FilteredOrder}
					onSave={() => {
						setPopup(false)
						updateOrders()
					}}
					items={popup}
					counter={counter}
					itemsData={itemsData}
					onClose={() => setPopup(false)}
					setPopupOrder={setPopupOrder}
				/>
			) : (
				""
			)}
			<div
				style={{
					position: "fixed",
					top: -100,
					left: -180,
					zIndex: "-1000"
				}}
			>
				<div
					ref={componentRef}
					id="item-container"
					style={{
						// margin: "45mm 40mm 30mm 60mm",
						// textAlign: "center",
						height: "128mm"
						// padding: "10px"
					}}
				>
					{items?.length ? (
						<table
							className="user-table"
							style={{
								width: "170mm",
								// marginTop: "20mm",
								// marginLeft: "20mm",
								// marginRight: "20mm",
								border: "1px solid black",
								// pageBreakInside: "auto",
								display: "block"
							}}
						>
							<thead
								style={{
									width: "100%",
									color: "#000",
									backgroundColor: "#fff"
								}}
							>
								<tr style={{ width: "100%", fontSize: "12px" }}>
									<th style={{ width: "10mm" }}>Sr.</th>
									<th colSpan={5} style={{ width: "100mm" }}>
										<div className="t-head-element">Item</div>
									</th>
									<th colSpan={3} style={{ width: "30mm" }}>
										<div className="t-head-element">MRP</div>
									</th>
									<th colSpan={3} style={{ width: "30mm" }}>
										<div className="t-head-element">Qty</div>
									</th>
								</tr>
							</thead>
							<tbody className="tbody" style={{ width: "100%" }}>
								{category
									.filter(a => items?.filter(b => a.category_uuid === b.category_uuid)?.length)
									.sort((a, b) => a?.category_title?.localeCompare(b?.category_title))
									.map(a => (
										<React.Fragment key={a.category_uuid}>
											<tr
												style={{
													// pageBreakAfter: "auto",
													width: "100%",
													height: "8px",
													fontSize: "12px"
												}}
											>
												<td colSpan={11} style={{ padding: "5px" }}>
													{a.category_title}
												</td>
											</tr>

											{items
												.filter(b => a.category_uuid === b.category_uuid)
												.sort((a, b) => a?.item_title?.localeCompare(b?.item_title))
												?.map((item, i) => (
													<tr
														key={item?.item_uuid || Math.random()}
														style={{
															height: "8px",
															// pageBreakAfter: "auto",
															color: "#000",
															backgroundColor: "#fff",
															fontSize: "12px"
														}}
														onClick={() => setPopup(item)}
													>
														<td style={{ padding: "0" }}>{i + 1}</td>
														<td colSpan={5} style={{ padding: "0" }}>
															{item.item_title}
														</td>
														<td colSpan={3} style={{ padding: "0" }}>
															{item.mrp}
														</td>
														<td colSpan={3} style={{ padding: "0" }}>
															{Math.floor(item?.b || 0)} : {item?.p || 0}
														</td>
													</tr>
												))}
										</React.Fragment>
									))}
								<tr
									style={{
										height: "30px",
										fontWeight: "bold",
										fontSize: "12px"
									}}
								>
									<td style={{ padding: "5px" }}>Total</td>
									<td colSpan={5} style={{ padding: "5px" }}></td>
									<td colSpan={3} style={{ padding: "5px" }}></td>
									<td colSpan={3} style={{ padding: "5px" }}>
										{Math.floor(
											items?.length > 1 ? items?.map(a => +a.b || 0).reduce((a, b) => a + b) : items[0]?.b || 0
										)}{" "}
										: {items?.length > 1 ? items.map(a => +a.p || 0).reduce((a, b) => a + b) : items[0].p || 0}
									</td>
								</tr>
							</tbody>
						</table>
					) : (
						""
					)}
				</div>
			</div>
			<div
				style={{ position: "fixed", top: -100, left: -180, zIndex: "-1000" }}
				// style={{ position: "fixed", top: 0, left: 0, zIndex: 999999999999 }}
			>
				<div ref={componentBoxRef} id="item-container" style={{ height: "128mm" }}>
					{items?.length ? (
						<table
							className="user-table"
							style={{
								width: "170mm",
								border: "1px solid black",
								display: "block"
							}}
						>
							<thead
								style={{
									width: "100%",
									color: "#000",
									backgroundColor: "#fff"
								}}
							>
								<tr style={{ width: "100%", fontSize: "12px" }}>
									<th style={{ width: "10mm" }}>Sr.</th>
									<th colSpan={5} style={{ width: "100mm" }}>
										<div className="t-head-element">Item</div>
									</th>
									<th colSpan={3} style={{ width: "30mm" }}>
										<div className="t-head-element">MRP</div>
									</th>
									<th colSpan={3} style={{ width: "30mm" }}>
										<div className="t-head-element">Qty</div>
									</th>
								</tr>
							</thead>
							<tbody className="tbody" style={{ width: "100%" }}>
								{category
									.filter(a => items?.filter(b => a.category_uuid === b.category_uuid && b.b)?.length)
									.sort((a, b) => a?.category_title?.localeCompare(b?.category_title))
									.map(a => (
										<React.Fragment key={a.category_uuid}>
											<tr
												style={{
													width: "100%",
													height: "8px",
													fontSize: "12px"
												}}
											>
												<td colSpan={11} style={{ padding: "5px" }}>
													{a.category_title}
												</td>
											</tr>

											{items
												?.filter(b => a.category_uuid === b.category_uuid && b.b)
												?.sort((a, b) => a?.item_title?.localeCompare(b?.item_title))
												?.map((item, i) => (
													<tr
														key={item?.item_uuid || Math.random()}
														style={{
															height: "8px",
															color: "#000",
															backgroundColor: "#fff",
															fontSize: "12px"
														}}
														onClick={() => setPopup(item)}
													>
														<td style={{ padding: "5px" }}>{i + 1}</td>
														<td colSpan={5} style={{ padding: "5px" }}>
															{item.item_title}
														</td>
														<td colSpan={3} style={{ padding: "5px" }}>
															{item.mrp}
														</td>
														<td colSpan={3} style={{ padding: "5px" }}>
															{Math.floor(item?.b || 0)} : {0}
														</td>
													</tr>
												))}
										</React.Fragment>
									))}
								<tr
									style={{
										height: "30px",
										fontWeight: "bold",
										fontSize: "12px"
									}}
								>
									<td style={{ padding: "5px" }}>Total</td>
									<td colSpan={5} style={{ padding: "5px" }}></td>
									<td colSpan={3} style={{ padding: "5px" }}></td>
									<td colSpan={3} style={{ padding: "5px" }}>
										{Math.floor(
											items?.length > 1 ? items?.map(a => +a.b || 0).reduce((a, b) => a + b) : items[0]?.b || 0
										)}{" "}
										: {0}
									</td>
								</tr>
							</tbody>
						</table>
					) : (
						""
					)}
				</div>
			</div>
		</>
	)
}
function SummaryPopup({
	onSave,
	orders,
	itemsData,
	counter,
	category,
	company,
	setPopupOrder,
	updateOrders,
	setOrdersData
}) {
	const [items, setItems] = useState([])

	const [FilteredOrder, setFilteredOrder] = useState([])
	const [popup, setPopup] = useState(false)
	const [orderTotal, setOrderTotal] = useState(0)
	const componentRef = useRef(null)
	const reactToPrintContent = useCallback(() => {
		return componentRef.current
	}, [])

	useEffect(() => {
		let orderStage = orders.map(a => ({
			...a,
			stage:
				a.status?.length > 1
					? a.status.map(b => +b.stage || 0).reduce((c, b) => Math.max(c, b))
					: a.status[0].stage
		}))
		setFilteredOrder(orderStage)

		let data = [].concat
			.apply(
				[],
				orderStage.map(a => a.item_details)
			)

			.map(a => {
				let itemDetails = itemsData?.find(b => b.item_uuid === a.item_uuid)

				return {
					...a,
					item_title: itemDetails?.item_title,
					mrp: itemDetails?.mrp,
					category_uuid: itemDetails?.category_uuid
				}
			})
		
		let result = []
		for (let item of data) {
			var existing = result.filter(function (v, i) {
				return v.item_uuid === item.item_uuid
			})

			if (existing?.length === 0) {
				let itemsFilteredData = data.filter(a => a.item_uuid === item.item_uuid)
				let b =
					itemsFilteredData?.length > 1
						? itemsFilteredData?.map(c => +c.b || 0).reduce((c, d) => c + d)
						: +itemsFilteredData[0]?.b || 0
				let p =
					itemsFilteredData?.length > 1
						? itemsFilteredData?.map(c => +c.p || 0).reduce((c, d) => c + d)
						: +itemsFilteredData[0]?.p || 0
				let free =
					itemsFilteredData?.length > 1
						? itemsFilteredData?.map(c => +c.free || 0).reduce((c, d) => c + d)
						: +itemsFilteredData[0]?.free || 0
				let obj = {
					...item,
					b: parseInt(+b + (+p + free) / +itemsData?.find(b => b.item_uuid === item.item_uuid)?.conversion),
					p: parseInt((+p + free) % +itemsData?.find(b => b.item_uuid === item.item_uuid)?.conversion)
				}
				result.push(obj)
			}
		}
		setOrderTotal(
			orderStage?.length > 1
				? orderStage.map(a => +a?.order_grandtotal || 0).reduce((a, b) => a + b)
				: orderStage[0]?.order_grandtotal
		)
		

		setItems(result)
	}, [itemsData, orders, setOrdersData, popup])
	const GetItemsQty = category_uuid => {
		let itemData = items?.filter(b => category_uuid === b.category_uuid)
		let box =
			itemData?.length > 1
				? itemData.map(a => +a.b || 0).reduce((a, b) => a + b)
				: itemData?.length
				? itemData[0]?.b
				: 0
		let pcs =
			itemData?.length > 1
				? itemData.map(a => +a.p || 0).reduce((a, b) => a + b)
				: itemData?.length
				? itemData[0]?.p
				: 0
		return box + " : " + pcs
	}
	const getTotalItems = company_uuid => {
		let itemData = [].concat
			.apply(
				[],
				orders.map(a => a.item_details)
			)
			.map(a => ({
				...itemsData?.find(b => b.item_uuid === a.item_uuid),
				...a
			}))

		itemData = itemData
			?.filter(
				b => category.filter(a => a.company_uuid === company_uuid && a.category_uuid === b.category_uuid)?.length
			)
			.map(a => {
				return {
					...a,
					total: (+a.b * +a?.conversion + +a.p) * +a.item_price
				}
			})
		let box =
			itemData?.length > 1
				? itemData.map(a => +a.b || 0).reduce((a, b) => a + b)
				: itemData?.length
				? itemData[0]?.b
				: 0
		let pcs =
			itemData?.length > 1
				? itemData.map(a => +a.p || 0).reduce((a, b) => a + b)
				: itemData?.length
				? itemData[0]?.p
				: 0

		let Price = Math.floor(
			itemData?.length > 1
				? itemData.map(a => +a.item_total || 0).reduce((a, b) => a + b)
				: itemData?.length
				? itemData[0]?.total
				: 0
		)

		return box + " : " + pcs + " (Rs " + Price + " )"
	}
	return (
		<>
			<div className="overlay">
				<div
					className="modal"
					style={{
						height: "600px",
						width: "max-content",
						minWidth: "250px",
						paddingTop: "50px"
					}}
				>
					<div className="flex" style={{ justifyContent: "space-between", alignItems: "center" }}>
						<h1 style={{ textAlign: "center", width: "100%" }}>Rs. {orderTotal}</h1>
					</div>

					<div
						className="content"
						style={{
							height: "fit-content",
							padding: "20px",
							width: "fit-content"
						}}
					>
						<div style={{ overflowY: "scroll", width: "100%" }}>
							{items?.length ? (
								<div className="flex" style={{ flexDirection: "column", width: "100%" }}>
									<table
										className="user-table"
										style={{
											width: "500px",
											height: "fit-content"
										}}
									>
										<thead>
											<tr>
												<th>Sr.</th>
												<th colSpan={3}>
													<div className="t-head-element">Item</div>
												</th>

												<th colSpan={3}>
													<div className="t-head-element">Qty</div>
												</th>
											</tr>
										</thead>
										<tbody className="tbody">
											{company
												.filter(
													c =>
														category.filter(
															a =>
																items?.filter(b => a.category_uuid === b.category_uuid)?.length &&
																c.company_uuid === a.company_uuid
														)?.length
												)
												.map(c => (
													<React.Fragment key={c.company_uuid}>
														{category
															.filter(
																a =>
																	items?.filter(b => a.category_uuid === b.category_uuid)?.length &&
																	c.company_uuid === a.company_uuid
															)
															.map((a, i) => (
																<React.Fragment key={a.category_uuid}>
																	<tr
																		style={{
																			height: "30px"
																		}}
																	>
																		<td>{i + 1}</td>
																		<td colSpan={3}>{a.category_title}</td>

																		<td colSpan={2}>{GetItemsQty(a.category_uuid)}</td>
																	</tr>
																</React.Fragment>
															))}
														<tr
															style={{
																height: "30px",
																fontWeight: "bold"
															}}
														>
															<td></td>
															<td colSpan={3}>{c.company_title}</td>

															<td colSpan={3}>{getTotalItems(c.company_uuid)}</td>
														</tr>
														<tr
															style={{
																height: "30px",
																fontWeight: "bold"
															}}
														>
															<td></td>
															<td colSpan={3}></td>

															<td colSpan={2}></td>
														</tr>
													</React.Fragment>
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
			{popup ? (
				<OrdersEdit
					order={FilteredOrder}
					onSave={() => {
						setPopup(false)
						updateOrders()
					}}
					items={popup}
					counter={counter}
					itemsData={itemsData}
					onClose={() => setPopup(false)}
					setPopupOrder={setPopupOrder}
				/>
			) : (
				""
			)}{" "}
			<div
				style={{
					position: "fixed",
					top: -100,
					left: -180,
					zIndex: "-1000"
				}}
			>
				<div
					ref={componentRef}
					id="item-container"
					style={{
						// margin: "45mm 40mm 30mm 60mm",
						// textAlign: "center",
						height: "128mm"
						// padding: "10px"
					}}
				>
					{items?.length ? (
						<table
							className="user-table"
							style={{
								width: "170mm",
								// marginTop: "20mm",
								// marginLeft: "20mm",
								// marginRight: "20mm",
								border: "1px solid black",
								pageBreakInside: "auto",
								display: "block"
							}}
						>
							<thead
								style={{
									width: "100%",
									color: "#000",
									backgroundColor: "#fff"
								}}
							>
								<tr
									style={{
										width: "100%",
										color: "#000",
										backgroundColor: "#fff"
									}}
								>
									<th style={{ width: "10mm" }}>Sr.</th>
									<th colSpan={5} style={{ width: "100mm" }}>
										<div className="t-head-element">Item</div>
									</th>
									<th colSpan={3} style={{ width: "30mm" }}>
										<div className="t-head-element">MRP</div>
									</th>
									<th colSpan={3} style={{ width: "30mm" }}>
										<div className="t-head-element">Qty</div>
									</th>
								</tr>
							</thead>
							<tbody className="tbody" style={{ width: "100%" }}>
								{category
									.sort((a, b) => a?.category_title?.localeCompare(b?.category_title))
									.filter(a => items?.filter(b => a.category_uuid === b.category_uuid)?.length)
									.map(a => (
										<React.Fragment key={a.category_uuid}>
											<tr style={{ pageBreakAfter: "always", width: "100%" }}>
												<td colSpan={11}>{a.category_title}</td>
											</tr>

											{items
												.filter(b => a.category_uuid === b.category_uuid)
												?.map((item, i) => (
													<tr
														key={item?.item_uuid || Math.random()}
														style={{
															height: "30px",
															pageBreakAfter: "always",
															color: "#000",
															backgroundColor: "#fff"
														}}
														onClick={() => setPopup(item)}
													>
														<td>{i + 1}</td>
														<td colSpan={5}>{item.item_title}</td>
														<td colSpan={3}>{item.mrp}</td>
														<td colSpan={3}>
															{Math.floor(item?.b || 0)} : {item?.p || 0}
														</td>
													</tr>
												))}
										</React.Fragment>
									))}
								<tr
									style={{
										height: "30px",
										fontWeight: "bold"
									}}
								>
									<td>Total</td>
									<td colSpan={5}></td>
									<td colSpan={3}></td>
									<td colSpan={3}>
										{Math.floor(
											items?.length > 1 ? items?.map(a => +a.b || 0).reduce((a, b) => a + b) : items[0]?.b || 0
										)}{" "}
										: {items?.length > 1 ? items.map(a => +a.p || 0).reduce((a, b) => a + b) : items[0].p || 0}
									</td>
								</tr>
							</tbody>
						</table>
					) : (
						""
					)}
				</div>
			</div>
		</>
	)
}

const OrdersEdit = ({ order, onSave, items, counter, itemsData, onClose, setPopupOrder }) => {
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
					.filter(a => a.edit || deleteItemsOrder.filter(b => b === a.order_uuid)?.length)
					.map(a =>
						deleteItemsOrder.filter(b => b === a.order_uuid)?.length
							? {
									...a,
									item_details: a.item_details.filter(b => !(b.item_uuid === items.item_uuid))
							  }
							: a
					)

		

		let finalData = []
		for (let orderObject of dataArray) {
			let data = orderObject
			const counterData = counter.find(a => a.counter_uuid === data.counter_uuid)

			let billingData = await Billing({
				order_uuid: data?.order_uuid,
				invoice_number: data?.invoice_number,
				replacement: data.replacement,
				adjustment: data.adjustment,
				shortage: data.shortage,
				counter: counterData,
				// add_discounts: true,
				items: data.item_details.map(a => {
					let itemData = itemsData.find(b => a.item_uuid === b.item_uuid)
					const price =
						+counterData?.item_special_price?.find(i => i.item_uuid === a.item_uuid)?.price ||
						+itemData?.item_price ||
						0
					return { ...itemData, ...a, price }
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
			<div className="overlay">
				<div
					className="modal"
					style={{
						height: "500px",
						width: "max-content",
						minWidth: "250px"
					}}
				>
					<h1>Orders</h1>
					<div
						className="content"
						style={{
							height: "fit-content",
							padding: "20px",
							width: "700px"
						}}
					>
						<div style={{ overflowY: "scroll", width: "100%" }}>
							{order?.length ? (
								<div className="flex" style={{ flexDirection: "column", width: "100%" }}>
									<table
										className="user-table"
										style={{
											height: "fit-content"
										}}
									>
										<thead>
											<tr style={{ color: "#fff", backgroundColor: "#7990dd" }}>
												<th>Sr.</th>
												<th colSpan={3}>
													<div className="t-head-element">Date</div>
												</th>
												<th colSpan={2}>
													<div className="t-head-element">Invoice Number</div>
												</th>
												<th colSpan={2}>
													<div className="t-head-element">Counter</div>
												</th>
												<th colSpan={2}>
													<div className="t-head-element">Quantity</div>
												</th>
												<th colSpan={2}>
													<div className="t-head-element">Free</div>
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
														backgroundColor: +deleteItemsOrder.filter(a => a === item.order_uuid)?.length
															? "red"
															: "#7990dd"
													}}
													onClick={e => {
														e.stopPropagation()
														setPopupOrder(item)
													}}
												>
													<td>{i + 1}</td>
													<td colSpan={3}>
														{new Date(item?.status[0]?.time).toDateString() +
															" - " +
															formatAMPM(new Date(item?.status[0]?.time))}
													</td>
													<td colSpan={2}>{item.invoice_number}</td>
													<td colSpan={2}>
														{counter?.find(a => a.counter_uuid === item.counter_uuid)?.counter_title || "-"}
													</td>
													<td colSpan={2}>
														<input
															value={
																(item.item_details.find(a => a.item_uuid === items.item_uuid)?.b || 0) +
																" : " +
																(item.item_details.find(a => a.item_uuid === items.item_uuid)?.p || 0)
															}
															className="boxPcsInput"
															onClick={e => {
																e.stopPropagation()
																setOrderEditPopup(item)
															}}
														/>
													</td>
													<td colSpan={2}>
														{item.item_details.find(a => a.item_uuid === items.item_uuid)?.free || 0}
													</td>
													<td
														onClick={e => {
															e.stopPropagation()
															setDeleteItemOrders(prev =>
																prev?.filter(a => a === item.order_uuid)?.length
																	? prev.filter(a => !(a === item.order_uuid))
																	: [...(prev || []), item.order_uuid]
															)
														}}
													>
														{!deleteItemsOrder.filter(a => a === item.order_uuid)?.length ? (
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
								backgroundColor: "red"
							}}
							onClick={() => postOrderData(true)}
						>
							Delete All
						</button>
						<button onClick={onClose} className="closeButton">
							x
						</button>
					</div>
					{updateOrders.filter(a => a.edit)?.length || deleteItemsOrder?.length ? (
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
function WarehouseUpdatePopup({ popupInfo, updateChanges, onClose, warehouse }) {
	const [data, setdata] = useState("")

	useEffect(() => {
		setdata(popupInfo.warehouse_uuid)
	}, [popupInfo])
	const submitHandler = async e => {
		e.preventDefault()
		updateChanges(data, popupInfo.orderData)
		onClose()
	}

	return (
		<div className="overlay" style={{ zIndex: 99999999999 }}>
			<div className="modal" style={{ height: "fit-content", width: "fit-content", padding: 50 }}>
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
								<h1>Update Warehouse</h1>
							</div>
							<div className="row">
								<h2>Order:{popupInfo.orderData.invoice_number}</h2>
							</div>

							<div className="formGroup">
								<div className="row">
									<label className="selectLabel">
										Warehouse
										<div className="inputGroup" style={{ width: "200px" }}>
											<Select
												options={[
													{ value: 0, label: "None" },
													...warehouse.map(a => ({
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
