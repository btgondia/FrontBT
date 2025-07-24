import axios from "axios"

const Card = ({
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
		<>
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
							gap: "2px",
							backgroundColor:
								order.order_status === "A" ? "#00edff" : order.counter_order ? "#e28743" : "#fff",
						}}
					>
						<p
							className="title2"
							style={{
								display: "inline-block",
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
								maxWidth: "15ch",
							}}
						>
							{title1 ? title1 : title2}
						</p>
						<p
							className="caption"
							style={{
								color: "#000",
								display: "inline-block",
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
								maxWidth: "15ch",
							}}
						>
							{title1 ? title2 : ""}
						</p>
						<p className="title2">{daysCount} Days</p>
						{order.counter_order ? (
							<div className="flex" style={{ justifyContent: "space-between", width: "100px" }}>
								<button
									className="acceptrejectButton"
									onClick={(e) => {
										e.stopPropagation()
										PutOrder(true)
									}}
								>
									Reject
								</button>
								<button
									className="acceptrejectButton green"
									onClick={(e) => {
										e.stopPropagation()
										PutOrder(false)
									}}
								>
									Accept
								</button>
							</div>
						) : (
							<div>{status}</div>
						)}
						<div style={{ fontSize: "10px", fontWeight: 600 }}>
  {`${days[new Date(dateTime).getDay()] || ""} ${new Date(dateTime).getDate() || ""} ${
    monthNames[new Date(dateTime).getMonth()] || ""
  }`}{" "}
  {formatAMPM(new Date(dateTime)) || ""}
</div>

						<div style={{ fontSize: "10px", fontWeight: 600 }}>{getQty()}</div>
						<div
							className="card-color-sheet"
							id="sheet1"
							style={{ height: `calc(${cardColor1Height}% + 2px)` }}
						/>
						<div
							className="card-color-sheet"
							id="sheet2"
							style={{
								height: cardColor1Height >= 100 ? `calc(${cardColor2Height}% + 2px)` : 0,
							}}
						/>
					</div>
				</button>
			</div>
			{/* {on_order && visibleContext?.id === on_order.seat_uuid &&
            <ContextMenu
            //   itemRef={itemRef}
              id={on_order?.uuid}
              visibleContext={visibleContext}
              setVisibleContext={setVisibleContext}
              isMouseInsideContext={isMouseInsideContext}
              order_type={0}
              seats={seats}
              currentSeat={on_order?.seat_uuid}
            />
          } */}
		</>
	)
}

export default Card
