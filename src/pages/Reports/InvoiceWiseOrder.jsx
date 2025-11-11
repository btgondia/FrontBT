import axios from "axios"
import React, { useState } from "react"
import Header from "../../components/Header"
import { OrderDetails } from "../../components/OrderDetails"
import Sidebar from "../../components/Sidebar"
import Loader from "../../components/Loader"

const formatDate = (_date) => {
	if (!_date) return null
	const date = new Date(_date)
	return [
		date?.getFullYear().toString().padStart(4, "0"),
		(date?.getMonth() + 1).toString().padStart(2, "0"),
		date?.getDate().toString().padStart(2, "0")
	].join("-")
}
const today = formatDate(new Date().getTime())

const InvoiceWiseOrder = () => {
	const [popupOrder, setPopupOrder] = useState(null)
	const [items, setItems] = useState([])
	const [filters, setFilters] = useState({})
	const [loading, setLoading] = useState(false)

	const getCompleteOrders = async () => {
		if (!filters?.invoiceNumber && !filters?.fromDate && !filters?.toDate)
			return alert("Select date-range or enter invoice number and try again.")
		if (filters?.fromDate || filters?.toDate) {
			const diff = Math.abs((filters?.fromDate || 0) - (filters?.toDate || Date.now()))
			if (diff / (1000 * 60 * 60 * 24 * 30) > 1) return alert("Date-range cannot exceed 30 days.")
		}

		setLoading(true)
		try {
			const response = await axios({
				method: "post",
				url: "/orders/getOrderData",
				data: filters,
				headers: {
					"Content-Type": "application/json"
				}
			})

			if (response.data.success) setItems(response.data.result)
			else setItems([])
		} catch (error) {}
		setLoading(false)
	}

	return (
		<>
			<Sidebar />
			<Header />
			<Loader visible={loading} />
			<div className='item-sales-container orders-report-container'>
				<div id='heading'>
					<h2>Invoice Wise Order</h2>
				</div>
				<div id='item-sales-top'>
					<div
						id='date-input-container'
						style={{
							overflow: "visible",
							display: "flex",
							alignItems: "center",
							width: "100%"
						}}
					>
						<input
							type='date'
							onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.valueAsNumber }))}
							max={today}
							value={formatDate(filters?.fromDate)}
							className='searchInput'
							style={{ width: "180px", padding: "10px", background: "#f1f1f3" }}
						/>
						<input
							type='date'
							onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.valueAsNumber }))}
							value={formatDate(filters?.toDate)}
							max={today}
							className='searchInput'
							style={{ width: "180px", padding: "10px", background: "#f1f1f3" }}
						/>
						<input
							type='text'
							onChange={(e) => setFilters((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
							value={filters?.invoiceNumber}
							placeholder='Search Invoice Number...'
							className='searchInput'
						/>
						<div className='searchInput flex' style={{ padding: 0 }}>
							<input
								type='number'
								onChange={(e) => setFilters((prev) => ({ ...prev, grandTotalFrom: e.target.value }))}
								value={filters?.grandTotalFrom}
								placeholder='From ₹0.00'
								onWheel={(e) => e.preventDefault()}
								style={{
									padding: "11px",
									border: "none",
									background: "none",
									outline: "none",
									width: "90px"
								}}
							/>
							~
							<input
								type='number'
								onChange={(e) => setFilters((prev) => ({ ...prev, grandTotalTo: e.target.value }))}
								value={filters?.grandTotalTo}
								placeholder='To ₹0.00'
								onWheel={(e) => e.preventDefault()}
								style={{
									padding: "11px",
									border: "none",
									background: "none",
									outline: "none",
									width: "90px",
									marginLeft: "5px"
								}}
							/>
						</div>
						<button className='theme-btn' onClick={() => getCompleteOrders()}>
							Search
						</button>
					</div>
				</div>
				<div className='table-container-user item-sales-container'>
					<Table
						itemsDetails={
							!filters?.invoiceNumber && !filters?.grandTotalFrom && !filters?.grandTotalTo
								? items
								: items.filter((a) => {
										if (
											filters?.invoiceNumber &&
											!a.invoice_number
												?.toString()
												.toLocaleLowerCase()
												.includes(filters.invoiceNumber.toLocaleLowerCase())
										)
											return false
										if (filters?.grandTotalFrom && +a.order_grandtotal < filters?.grandTotalFrom)
											return false
										if (filters?.grandTotalTo && +a.order_grandtotal > filters?.grandTotalTo)
											return false
										return true
								  })
						}
						setPopupOrder={setPopupOrder}
					/>
				</div>
			</div>
			{Boolean(popupOrder) && (
				<OrderDetails
					onSave={() => {
						setPopupOrder(null)
						getCompleteOrders()
					}}
					order_uuid={popupOrder.order_uuid}
					orderStatus='edit'
				/>
			)}
		</>
	)
}

export default InvoiceWiseOrder

function Table({ itemsDetails, setPopupOrder }) {
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
		<table className='user-table' style={{ maxWidth: "100vw", height: "fit-content", overflowX: "scroll" }}>
			<thead>
				<tr>
					<th>S.N</th>
					<th colSpan={2}>Order Date</th>
					<th colSpan={3}>Counter</th>
					<th colSpan={2}>Invoice</th>
					<th colSpan={2}>Qty</th>
					<th colSpan={2}>Amount</th>
				</tr>
			</thead>
			<tbody className='tbody'>
				{itemsDetails
					?.sort((a, b) => a.order_date - b.order_date)
					?.map((item, i, array) => (
						<tr key={Math.random()} style={{ height: "30px" }} onClick={() => setPopupOrder(item)}>
							<td>{i + 1}</td>
							<td colSpan={2}>
								{new Date(+item.status[0].time).toDateString()} -{" "}
								{formatAMPM(new Date(+item.status[0].time))}
							</td>

							<td colSpan={3}>{item?.counter_title || ""}</td>
							<td colSpan={2}>{item.invoice_number || ""}</td>
							<td colSpan={2}>{item?.item_details?.length || ""}</td>
							<td colSpan={2}>{item?.order_grandtotal?.toFixed(2) || ""}</td>
						</tr>
					))}
			</tbody>
		</table>
	)
}
