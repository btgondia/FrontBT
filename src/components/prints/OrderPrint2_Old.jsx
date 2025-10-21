import React, { useEffect, useMemo, useState } from "react"

const OrderPrint2 = ({
	renderID,
	counter,
	order = { item_details: [] },
	allOrderItems,
	date = "",
	user = {},
	itemData = [],
	item_details = [],
	footer = false,
	defaultOrder = { item_details: [] },
	total_page = 0,
	current_page = 0,
}) => {
	const [gstValues, setGstVAlues] = useState([])
	useEffect(() => {
		if (!defaultOrder?.item_details?.length) return
		const arr = []

		let itemsData = []
		for (let item of defaultOrder.item_details) {
			let final_Amount =
				item.item_total / (1 + ((item?.gst_percentage || 0) + (item?.css_percentage || 0)) / 100)
			itemsData.push({
				...item,
				final_Amount: final_Amount,
			})
		}

		const gst_value = Array.from(new Set(itemsData.map((a) => +a.gst_percentage)))

		for (let a of gst_value) {
			const data = itemsData.filter((b) => +b.gst_percentage === a)
			const amt =
				data.length > 1
					? data.map((b) => +b?.final_Amount).reduce((a, b) => a + b, 0)
					: data.length
					? +data[0].final_Amount
					: 0

			const value = (+amt * a) / 100

			if (value)
				arr.push({
					value: a,
					tex_amt: amt.toFixed(2),
					amount: value.toFixed(2),
				})
		}

		setGstVAlues(arr)
	}, [defaultOrder])

	const reCalculatedItems = useMemo(() => {
		const items = item_details?.map((item, index) => {
			const itemInfo = itemData.find((a) => a.item_uuid === item.item_uuid)

			const itemQty = (+item.b || 0) * (+itemInfo?.conversion || 1) + (+item.p || 0)
			const unit_price = (+item.item_total || 0) / (+itemQty || 1)
			const tex_amt = (+unit_price || 0) - ((+unit_price || 0) * 100) / (100 + (+item.gst_percentage || 0))

			const net_amt = item.item_total / (1 + (+item.gst_percentage || 0) / 100)
			const desc_a = item?.charges_discount?.length ? item?.charges_discount[0]?.value || 0 : 0
			const desc_b = item?.charges_discount?.length ? item?.charges_discount[1]?.value || 0 : 0

			const desc_amt_a = (+net_amt * (desc_a || 0)) / 100
			const desc_amt_b = (+net_amt * (desc_b || 0)) / 100
			const taxable_value = +item.item_total - desc_amt_a - desc_amt_b
			
			const returnedItem = {
				...item,
				...itemInfo,
				dms_erp_id: item.dms_erp_id || itemInfo.dms_erp_id,
				dms_item_name: item.dms_item_name || itemInfo.dms_item_name,
				item_total: item.item_total?.toFixed(2),
				desc_amt_a: desc_amt_a?.toFixed(2),
				desc_amt_b: desc_amt_b?.toFixed(2),
				net_amt: net_amt?.toFixed(2),
				tex_amt: (tex_amt * itemQty)?.toFixed(2),
				desc_a,
				desc_b,
				itemQty,
				taxable_value: taxable_value?.toFixed(2),
			}
			return returnedItem
		})
		if (!items?.length) return []
		else if (items?.length === 1) return items
		else return items
	}, [item_details, itemData])

	const totalItemDetailsMemo = useMemo(() => {
		if (!footer) return []
		let allData = allOrderItems
			?.map((a) => ({
				...a,
				...(itemData?.find((b) => b.item_uuid === a.item_uuid) || {}),
			}))
			.map((item, index) => {
				const itemInfo = itemData.find((a) => a.item_uuid === item.item_uuid)
				let itemQty = (+item.b || 0) * (+itemInfo?.conversion || 1) + (+item.p || 0)
				let unit_price = (+item.item_total || 0) / (+itemQty || 1)
				let tex_amt =
					(+unit_price || 0) - ((+unit_price || 0) * 100) / (100 + (+item.gst_percentage || 0))

				let net_amt = +item.item_total / (1 + (+item.gst_percentage || 0) / 100)
				let desc_a = item?.charges_discount?.length ? item?.charges_discount[0]?.value || 0 : 0
				let desc_b = item?.charges_discount?.length ? item?.charges_discount[1]?.value || 0 : 0
				
				let desc_amt_a = (+net_amt * (desc_a || 0)) / 100
				let desc_amt_b = (+net_amt * (desc_b || 0)) / 100
				let taxable_value = +item.item_total - desc_amt_a - desc_amt_b

				const returnedItem = {
					...item,
					item_total: item.item_total?.toFixed(2),
					desc_amt_a: desc_amt_a?.toFixed(2),
					desc_amt_b: desc_amt_b?.toFixed(2),
					net_amt: +net_amt?.toFixed(2),
					tex_amt: (tex_amt * itemQty)?.toFixed(2),
					desc_a,
					desc_b,
					itemQty,
					taxable_value: taxable_value?.toFixed(2),
				}

				return returnedItem
			})
		let totalData = allData.reduce((acc, item) => {
			return {
				item_total: (+acc.item_total || 0) + (+item.item_total || 0),
				desc_amt_a: (+acc.desc_amt_a || 0) + (+item.desc_amt_a || 0),
				desc_amt_b: (+acc.desc_amt_b || 0) + (+item.desc_amt_b || 0),
				net_amt: (+acc.net_amt || 0) + (+item.net_amt || 0),
				tex_amt: (+acc.tex_amt || 0) + (+item.tex_amt || 0),
				taxable_value: ((+acc.taxable_value || 0) + (+item.taxable_value || 0) || 0)?.toFixed(2),
				itemQty: (+acc.itemQty || 0) + (+item.itemQty || 0),
				mrp: (+acc.mrp || 0) + (+item.mrp || 0),
			}
		}, {})

		return totalData
	}, [footer, allOrderItems, itemData])

	const getFormateDate = (dateStamp) => {
		const date = new Date(dateStamp)
	
		const day = String(date.getDate()).padStart(2, "0")
		const month = date.toLocaleString("en-US", { month: "short" }) // e.g., "May"
		const year = date.getFullYear()
		const hours = date.getHours() % 12 || 12 // Converts to 12-hour format
		const minutes = String(date.getMinutes()).padStart(2, "0") // Ensures two digits
		const ampm = date.getHours() >= 12 ? "pm" : "am"
	
		const formattedDate = `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`
		return formattedDate
	}
	
	const soNumber = order?.dms_details?.so_code || reCalculatedItems?.find(i => i.dms_code)?.dms_code || ""

	return (
		<div
			id={renderID}
			style={{
				width: "210mm",
				height: "128mm",

				pageBreakAfter: "always",
				display: "flex",
				flexDirection: "column",
				justifyContent: "start",
			}}
		>
			<style>
				{`
          @media print {
            @page {
              margin: 5mm; /* Adjust this value to increase or decrease the margin */
            }
            body {
              margin: 0; /* Ensures no body margin interferes */
            }
          }
        `}
			</style>
			<table style={{ width: "100%", borderSpacing: "0px", borderCollapse: "collapse" }}>
				<tr>
					<th style={{ fontSize: "small" }}>
						<div
							style={{
								width: "50%",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
							}}
						>
							<span style={{ fontSize: "10px" }}>
								{current_page}/{total_page}
							</span>
							<span>Tax Invoice</span>
						</div>
					</th>
				</tr>
				<tr>
					<th style={{ padding: "8px 0", textAlign: "start", fontSize: "small" }}>Seller Copy</th>
				</tr>

				<tr>
					<td style={{ width: "100%", border: "1px solid black" }} colSpan={6}>
						<div
							style={{
								width: "100%",
								// height: "14mm",
								padding: "1.5mm 2mm",
								borderBottom: "none",
								display: "flex",
							}}
						>
							<div style={{ flex: 1 }}>
								<div style={{ fontWeight: "700", fontSize: "2.3mm" }}>FROM:- BHARAT TRADERS</div>
								<div style={{ fontWeight: "700", fontSize: "2.3mm" }}>
									Seller Address:- BEHIND SALES TAX OFFICE, SHASTRI WARD GONDIA
								</div>
								<div style={{ fontSize: "2.3mm" }}>
									<span style={{ fontWeight: "700", fontSize: "2.3mm" }}>Fssai Number:- </span>
									11517058000427
								</div>
							</div>
							<div style={{ flex: 1 }}>
								<div style={{ fontSize: "2.3mm" }}>
									<span style={{ fontWeight: "700" }}>GST No:-</span>27ABIPR1186M1Z2
								</div>
								<div style={{ fontSize: "2.3mm" }}>
									<span style={{ fontWeight: "700" }}>PAN No:-</span> ABIPR11B6M
								</div>
								<div style={{ fontSize: "2.3mm" }}>
									<span style={{ fontWeight: "700" }}>Phone No:-</span> 9403061071
								</div>
							</div>
							<div style={{ flex: 1 }}>
								<div style={{ fontSize: "2.3mm" }}>
									<span>Invoice No:-</span> {order.dms_details?.invoice_number || ""}
								</div>
								<div style={{ fontSize: "2.3mm" }}>
									<span>Date :-</span> {
										order?.dms_details?.date
											? getFormateDate(order?.dms_details?.date)
											: getFormateDate(date)
									}
								</div>
								<div style={{ fontSize: "2.3mm" }}>
									<span>Phone No:-</span>{" "}
								</div>
							</div>
						</div>
					</td>
				</tr>
				<tr>
					<td style={{ width: "100%", border: "1px solid black" }} colSpan={6}>
						<div
							style={{
								width: "100%",
								borderSpacing: "0px",
								height: "17mm",
								padding: "1.5mm 2mm",
								borderBottom: "none",
								display: "flex",
							}}
						>
							<div style={{ width: "25%" }}>
								<div style={{ fontSize: "2.3mm", fontWeight: "700" }}>TO:- {counter?.dms_buyer_name}</div>
								<div style={{ fontWeight: "700", fontSize: "2.3mm" }}>
									Seller Address:- {counter?.dms_buyer_address || ""}
								</div>
								<div style={{ fontWeight: "700", fontSize: "2.3mm" }}>Fssai Number:-</div>
							</div>
							<div style={{ flex: 1 }}>
								<div style={{ fontSize: "2.3mm" }}>
									<span style={{ fontWeight: "700" }}>GST No:-</span> {counter?.gst_no}
								</div>
								<div style={{ fontSize: "2.3mm" }}>
									<span style={{ fontWeight: "700" }}>PAN No:-</span>{" "}
								</div>
								<div style={{ fontSize: "2.3mm" }}>
									<span style={{ fontWeight: "700" }}>Phone No:-</span>{" "}
									{counter?.mobile?.length ? counter.mobile[0].mobile : ""}
								</div>
							</div>
							<div>
								<div style={{ fontSize: "2.3mm" }}>
									<span>Buyer Erp Id:-</span> {counter?.dms_buyer_id || ""}
								</div>
								<div style={{ fontSize: "2.3mm" }}>
									<span>Salesman Name:-</span> {user?.user_title}
								</div>
								<div style={{ fontSize: "2.3mm" }}>
									<span>Beat Name:-</span> {counter?.dms_beat_name || ""}
								</div>
								<div style={{ fontSize: "2.3mm" }}>
									<span style={{ fontWeight: "700" }}>Employee Contact No:-</span>
									{user?.user_mobile || ""}
								</div>
							</div>
						</div>
					</td>
				</tr>

				<tr>
					<td colSpan={6} style={{ border: "1px solid black" }}>
						<table
							style={{
								borderCollapse: "collapse",
								width: "100%",
								margin: 0,
								borderSpacing: "0px",
							}}
						>
							<tr
								style={{
									borderBottom: "1px solid black",
									width: "100%",
									backgroundColor: "#e0e0e0",
								}}
							>
								<th
									style={{
										fontWeight: "400",
										fontSize: "2.3mm",
										borderRight: "1px solid black",
										textAlign: "center",
										padding: "0 1px",
										borderTop: "none",
										width: "3%",
									}}
								>
									S No.
								</th>
								<th
									style={{
										fontWeight: "400",
										fontSize: "2.3mm",
										borderInline: "1px solid black",
										textAlign: "center",
										padding: "0 1px",
										borderTop: "none",
										width: "10%",
									}}
								>
									SO No.
								</th>
								<th
									style={{
										fontWeight: "400",
										fontSize: "2.3mm",
										borderInline: "1px solid black",
										textAlign: "center",
										padding: "0 1px",
										borderTop: "none",
										width: "10%",
									}}
								>
									Item ERP id
								</th>
								<th
									style={{
										fontWeight: "400",
										fontSize: "2.3mm",
										borderInline: "1px solid black",
										textAlign: "center",
										padding: "0 1px",
										borderTop: "none",
										width: "30%",
									}}
									colSpan={3}
								>
									Item Name
								</th>
								<th
									style={{
										fontWeight: "400",
										fontSize: "2.3mm",
										borderInline: "1px solid black",
										textAlign: "center",
										padding: "0 1px",
										borderTop: "none",
										width: "3%",
									}}
								>
									MRP (₹)
								</th>
								<th
									style={{
										fontWeight: "400",
										fontSize: "2.3mm",
										borderInline: "1px solid black",
										textAlign: "center",
										padding: "0 1px",
										borderTop: "none",
										width: "7%",
									}}
								>
									Free Qty
								</th>
								<th
									style={{
										fontWeight: "400",
										fontSize: "2.3mm",
										borderInline: "1px solid black",
										textAlign: "center",
										padding: "0 1px",
										borderTop: "none",
										width: "5%",
									}}
								>
									Invoice/Delivery Qty
								</th>
								<th
									style={{
										fontWeight: "400",
										fontSize: "2.3mm",
										borderInline: "1px solid black",
										textAlign: "center",
										padding: "0 1px",
										borderTop: "none",
										width: "5%",
									}}
								>
									Price/Piece
								</th>
								<th
									style={{
										fontWeight: "400",
										fontSize: "2.3mm",
										borderInline: "1px solid black",
										textAlign: "center",
										padding: "0 1px",
										borderTop: "none",
										width: "5%",
									}}
								>
									Net Amt. (₹)
								</th>
								<th
									style={{
										fontWeight: "400",
										fontSize: "2.3mm",
										borderInline: "1px solid black",
										textAlign: "center",
										padding: "0 1px",
										borderTop: "none",
										width: "7%",
									}}
								>
									Secondary Dis. ₹(%)
								</th>
								<th
									style={{
										fontWeight: "400",
										fontSize: "2.3mm",
										borderInline: "1px solid black",
										textAlign: "center",
										padding: "0 1px",
										borderTop: "none",
										width: "10%",
									}}
								>
									Cash Dis. ₹(%)
								</th>
								<th
									style={{
										fontWeight: "400",
										fontSize: "2.3mm",
										borderInline: "1px solid black",
										textAlign: "center",
										padding: "0 1px",
										borderTop: "none",
										width: "5%",
									}}
								>
									Taxable Value (₹)
								</th>
								<th
									style={{
										fontWeight: "400",
										fontSize: "2.3mm",
										borderInline: "1px solid black",
										textAlign: "center",
										padding: "0 1px",
										borderTop: "none",
										width: "5%",
									}}
								>
									GST (%)
								</th>
								<th
									style={{
										fontWeight: "400",
										fontSize: "2.3mm",
										borderInline: "1px solid black",
										textAlign: "center",
										padding: "0 1px",
										borderTop: "none",
										width: "5%",
									}}
								>
									GST Amt. (₹)
								</th>
								<th
									style={{
										fontWeight: "400",
										fontSize: "2.3mm",
										borderLeft: "1px solid black",
										textAlign: "center",
										padding: "0 1px",
										borderTop: "none",
										width: "5%",
									}}
								>
									Total Value (₹)
								</th>
							</tr>

							{reCalculatedItems?.map((item, i) => {
								return (
									<tr key={item.item_uuid} style={{ borderBlock: "1px solid black" }} className="order_item">
										<td
											style={{
												padding: "0 5px",
												fontSize: "2.3mm",
												textAlign: "right",
											}}
										>
											{item?.sr || i + 1}
										</td>
										<td
											style={{
												padding: "0 5px",
												fontSize: "2.3mm",
												borderInline: "1px solid black",
											}}
										>
											{soNumber}
										</td>
										<td
											style={{
												padding: "0 5px",
												fontSize: "2.3mm",
												borderInline: "1px solid black",
											}}
										>
											{item?.dms_erp_id}
										</td>
										<td
											style={{
												padding: "5px",
												borderInline: "1px solid #000",
												fontSize: "2.3mm",
												width: "100mm",
											}}
											colSpan={3}
										>
											{item?.dms_item_name || item?.item_title}
										</td>

										<td
											style={{
												padding: "0 5px",
												fontSize: "2.3mm",
												textAlign: "right",
												borderInline: "1px solid black",
											}}
										>
											{+(+item?.mrp || 0)?.toFixed(2)}
										</td>

										<td
											style={{
												padding: "0 5px",
												fontSize: "2.3mm",
												textAlign: "right",
												borderInline: "1px solid black",
											}}
										>
											0 Cs, {item.free} Pcs
										</td>
										<td
											style={{
												padding: "0 5px",
												fontSize: "2.3mm",
												textAlign: "right",
												borderInline: "1px solid black",
											}}
										>
											{item.itemQty}
										</td>
										<td
											style={{
												padding: "0 5px",
												fontSize: "2.3mm",
												textAlign: "right",
												borderInline: "1px solid black",
											}}
										>
											{((+item.net_amt || 0) / +(+item.itemQty || 1)).toFixed(2)}
										</td>
										<td
											style={{
												padding: "0 5px",
												fontSize: "2.3mm",
												textAlign: "right",
												borderInline: "1px solid black",
											}}
										>
											{(+item.net_amt)?.toFixed(2)}
										</td>
										<td
											style={{
												padding: "0 5px",
												fontSize: "2.3mm",
												textAlign: "right",
												borderInline: "1px solid black",
											}}
										>
											{+(+item.desc_amt_a)?.toFixed(2)} ({+(+item.desc_a)?.toFixed(2)})
										</td>
										<td
											style={{
												padding: "0 5px",
												fontSize: "2.3mm",
												textAlign: "right",
												borderInline: "1px solid black",
											}}
										>
											{(+item.desc_amt_b)?.toFixed(2)} ({+(+item.desc_b)?.toFixed(2)})
										</td>
										<td
											style={{
												padding: "0 5px",
												fontSize: "2.3mm",
												textAlign: "right",
												borderInline: "1px solid black",
											}}
										>
											{(+item.taxable_value)?.toFixed(2)}
										</td>
										<td
											style={{
												padding: "0 5px",
												fontSize: "2.3mm",
												textAlign: "right",
												borderInline: "1px solid black",
											}}
										>
											{(+item.gst_percentage || 0).toFixed(2)}
										</td>
										<td
											style={{
												padding: "0 5px",
												fontSize: "2.3mm",
												textAlign: "right",
												borderInline: "1px solid black",
											}}
										>
											{(+item.tex_amt)?.toFixed(2)}
										</td>
										<td
											style={{
												padding: "0 5px",
												fontSize: "2.3mm",
												textAlign: "right",
												borderLeft: "1px solid black",
											}}
										>
											{(+item.item_total || 0)?.toFixed(2)}
										</td>
									</tr>
								)
							})}

							{footer ? (
								<tr>
									<th
										style={{
											fontWeight: "400",
											fontSize: "2.3mm",
											borderRight: "1px solid black",
											padding: "0 5px",
										}}
									>
										Total
									</th>
									<td style={{ borderInline: "1px solid black" }}></td>
									<td colSpan={4} style={{ borderInline: "1px solid black" }}></td>
									<td
										style={{
											fontSize: "2.3mm",
											textAlign: "right",
											borderInline: "1px solid black",
											padding: "0 5px",
										}}
									>
										{+(+totalItemDetailsMemo?.mrp || 0)?.toFixed(2)}
									</td>
									<td
										style={{
											fontSize: "2.3mm",
											textAlign: "right",
											borderInline: "1px solid black",
											padding: "0 5px",
										}}
									>
										0 Cs {totalItemDetailsMemo?.free || 0} Pcs
									</td>
									<td
										style={{
											fontSize: "2.3mm",
											textAlign: "right",
											borderInline: "1px solid black",
											padding: "0 5px",
										}}
									>
										{totalItemDetailsMemo?.itemQty || 0}
									</td>
									<td style={{ borderInline: "1px solid black" }}></td>
									<td
										style={{
											fontSize: "2.3mm",
											textAlign: "right",
											borderInline: "1px solid black",
											padding: "0 5px",
										}}
									>
										{(+totalItemDetailsMemo?.net_amt || 0).toFixed(2)}
									</td>
									<td
										style={{
											fontSize: "2.3mm",
											textAlign: "right",
											borderInline: "1px solid black",
											padding: "0 5px",
										}}
									>
										{(+totalItemDetailsMemo?.desc_amt_a || 0)?.toFixed(2)}
									</td>
									<td
										style={{
											fontSize: "2.3mm",
											textAlign: "right",
											borderInline: "1px solid black",
											padding: "0 5px",
										}}
									>
										{(+totalItemDetailsMemo?.desc_amt_b || 0).toFixed(2)}
									</td>
									<td
										style={{
											fontSize: "2.3mm",
											textAlign: "right",
											borderInline: "1px solid black",
											padding: "0 5px",
										}}
									>
										{+(+totalItemDetailsMemo?.taxable_value || 0)?.toFixed(2)}
									</td>

									<td style={{ borderInline: "1px solid black" }}></td>
									<td
										style={{
											fontSize: "2.3mm",
											textAlign: "right",
											borderInline: "1px solid black",
											padding: "0 5px",
										}}
									>
										{(+totalItemDetailsMemo?.tex_amt || 0).toFixed(2)}
									</td>
									<td
										style={{
											fontSize: "2.3mm",
											textAlign: "right",
											borderInline: "1px solid black",
											padding: "0 5px",
										}}
									>
										{(+totalItemDetailsMemo?.item_total || 0).toFixed(2)}
									</td>
								</tr>
							) : null}
						</table>
					</td>
				</tr>

				{footer ? (
					<tr>
						<td colSpan={15} style={{ border: "1px solid black" }}>
							<table style={{ borderSpacing: "0px", borderCollapse: "collapse", width:'100%' }}>
								<tr>
									<td>
										<table
											style={{
												textAlign: "start",
												height: "25mm",
												borderSpacing: "0px",
												padding: "1mm",
												borderTop: "none",
											}}
										>
											<tr>
												<td
													style={{
														fontSize: "2.3mm",
														width: "30%",
													}}
												>
													CGST - {gstValues.length ? gstValues[0].amount / 2 : 0.0} , SGST -{" "}
													{gstValues.length ? gstValues[0].amount / 2 : 0} , IGST - 0.00 , UTGST -
													0.00
												</td>
											</tr>
											<tr>
												<td
													style={{
														fontSize: "2.3mm",
														width: "30%",
													}}
												>
													CREDIT NOTE Remarks: --
												</td>
											</tr>
											<tr>
												<td
													style={{
														fontSize: "2.3mm",
														width: "30%",
													}}
												>
													DEBIT NOTE Remarks: --
												</td>
											</tr>
											<tr>
												<td
													style={{
														fontSize: "2.3mm",
														width: "30%",
													}}
												>
													<span>Amount in words:</span>
													{numberToWords(+order?.order_grandtotal || 0)}
												</td>
											</tr>
											<tr>
												<td
													style={{
														fontSize: "2.3mm",
														width: "30%",
													}}
												>
													<span>Remarks:</span>
												</td>
											</tr>
										</table>
									</td>
									<td></td>
									<td>
										<table
											style={{
												width:'100%',
												height: "25mm",
												borderSpacing: "0px",
												padding: "1mm",
												borderTop: "none",
											}}
										>
											<tr>
												<td
													style={{
														fontSize: "2.3mm",
														textAlign: "right",
													}}
												>
													<span>CREDIT NOTE Adjustment:</span> + 0
												</td>
											</tr>
											<tr>
												<td
													style={{
														fontSize: "2.3mm",

														textAlign: "right",
													}}
												>
													<span
														style={{
															textAlign: "right",
														}}
													>
														DEBIT NOTE Adjustment:
													</span>{" "}
													- 0
												</td>
											</tr>
											<tr>
												<td
													style={{
														fontSize: "2.3mm",
														textAlign: "right",
													}}
												>
													<span>Round Off:</span> ₹{" "}
													{(
														order.order_grandtotal - totalItemDetailsMemo?.item_total || 0
													)?.toFixed(2)}
												</td>
											</tr>
											<tr>
												<td
													style={{
														fontSize: "10px",
														textAlign: "right",
													}}
												>
													Total Value: ₹ {(+order?.order_grandtotal || 0)?.toFixed(2)}
												</td>
												<td></td>
											</tr>
										</table>
									</td>
								</tr>
							</table>
						</td>
					</tr>
				) : null}
			</table>
		</div>
	)
}
function numberToWords(num) {
	if (num === 0) return "zero"

	const belowTwenty = [
		"",
		"one",
		"two",
		"three",
		"four",
		"five",
		"six",
		"seven",
		"eight",
		"nine",
		"ten",
		"eleven",
		"twelve",
		"thirteen",
		"fourteen",
		"fifteen",
		"sixteen",
		"seventeen",
		"eighteen",
		"nineteen",
	]
	const tens = [
		"",
		"",
		"twenty",
		"thirty",
		"forty",
		"fifty",
		"sixty",
		"seventy",
		"eighty",
		"ninety",
	]
	const thousands = ["", "thousand", "million", "billion"]

	function convert(n) {
		if (n === 0) return ""
		else if (n < 20) return belowTwenty[n] + " "
		else if (n < 100) return tens[Math.floor(n / 10)] + " " + belowTwenty[n % 10] + " "
		else return belowTwenty[Math.floor(n / 100)] + " hundred " + convert(n % 100)
	}

	let word = ""
	let i = 0

	while (num > 0) {
		if (num % 1000 !== 0) {
			word = convert(num % 1000) + thousands[i] + " " + word
		}
		num = Math.floor(num / 1000)
		i++
	}

	return word.charAt(0).toUpperCase() + word.slice(1).trim()
}
export default OrderPrint2
