import axios from "axios"

const CardOrderAssembly = ({
	title2,
	title1,
	selectedOrder,
	status,
	dateTime,
	rounded,
	onDoubleClick,
	selectedCounter,
	setSelectOrder,
	order,
	getOrders = () => {},
}) => {
	const PutOrder = async (deleteOrder = false) => {
		let data = {
			...order,
			counter_order: 0,
			accept_notification: deleteOrder ? "0" : "1",
		}
		if (deleteOrder) {
			let time = new Date()
			let stage = order?.status?.length
				? order?.status?.map((a) => +a.stage || 0)?.reduce((a, b) => Math.max(a, b))
				: order?.status[0]?.stage || 0
			data = {
				...data,
				status: [
					...order.status,
					{
						stage: 5,
						user_uuid: localStorage.getItem("user_uuid"),
						time: time.getTime(),
					},
				],
				fulfillment: order.fulfillment?.length
					? [...order.fulfillment, ...order.item_details]
					: order.item_details,
				item_details: order.item_details?.map((a) => ({ ...a, b: 0, p: 0 })),
			}
		}

		const response = await axios({
			method: "put",
			url: "/orders/putOrders",
			data: [data],
			headers: {
				"Content-Type": "application/json",
			},
		})
		if (response.data.success) {
			getOrders()
		}
	}

	const getQty = () => {
		let data = order.item_details
		let result =
			(data.length > 1 ? data.map((a) => +a.b || 0).reduce((a, b) => a + b) : data[0].b || 0) +
			":" +
			(data.length > 1 ? data.map((a) => +a.p || 0).reduce((a, b) => a + b) : data[0].p || 0)
		return result + " (" + order.order_grandtotal + ")"
	}

	var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
	const monthNames = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	]

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

	// const calculateAge = elapsed => {
	// 	const units = ["Day", "Hour", "Minute", "Second"]
	// 	const divisors = [86400000, 3600000, 60000, 1000]
	// 	for (let i = 0; i < divisors.length; i++) {
	// 		let value = Math.floor(elapsed / divisors[i])
	// 		if (value >= 1) {
	// 			return `${value} ${units[i]}${value !== 1 ? "s" : ""}`
	// 		}
	// 	}
	// 	return "Just now"
	// }
const getHighestStage = (status = []) => {
  try {
    return status.length
      ? status.map(s => +s.stage || 0).reduce((a, b) => Math.max(a, b), 0)
      : 0
  } catch {
    return 0
  }
}

	const curr = Date.now()
	const daysCount = ~~((curr - dateTime) / (24 * 60 * 60 * 1000))
	if (!order.time_1) order.time_1 = dateTime + 24 * 60 * 60 * 1000
	if (!order.time_2) order.time_2 = dateTime + (24 + 48) * 60 * 60 * 1000

	let cardColor1Height = 0
	if (!order?.payment_pending)
		if (order.order_status === "A" || order.counter_order) cardColor1Height = 0
		else cardColor1Height = ((curr - dateTime) * 100) / (order?.time_1 - dateTime)

	if (cardColor1Height) cardColor1Height = Math.min(cardColor1Height, 100)

	let cardColor2Height = 0
	if (!order?.payment_pending)
		if (order.order_status === "A" || order.counter_order) cardColor2Height = 0
		else cardColor2Height = ((curr - dateTime) * 100) / (order?.time_2 - dateTime)

	if (cardColor2Height) cardColor2Height = Math.min(cardColor2Height, 100)

	return (
	<div
		onDoubleClick={onDoubleClick}
		onContextMenu={(e) => {
			e.preventDefault()
			e.stopPropagation()
			setSelectOrder(true)
		}}
	>
		<button
			className={
				"card-focus" +
				(rounded ? " rounded" : "") +
				(selectedOrder ? " selected-seat" : selectedCounter ? " blinking-seat" : "")
			}
			style={{ margin: "5px" }}
		>
			<div
				className={
					"card" +
					(rounded ? " rounded" : "") +
					(order?.payment_pending ? " payment-pending" : "")
				}
				style={{
					backgroundColor:
						getHighestStage(order?.status) === 3.5
							? "#b6eab6"
							: order.order_status === "A"
							? "#00edff"
							: order.counter_order
							? "#e28743"
							: "#fff",
					padding: "8px",
					textAlign: "left",
				}}
			>
				<p className="title2" style={{ marginBottom: "4px" }}>
					{title1 ? title1 : title2}
				</p>
				<p className="caption" style={{ color: "#000" }}>
					{title1 ? title2 : ""}
				</p>
				<p className="caption" style={{ color: "#000", fontWeight: 600 }}>
					₹ {order?.order_grandtotal || 0}
				</p>
			</div>
		</button>
	</div>
)
}

export default CardOrderAssembly
