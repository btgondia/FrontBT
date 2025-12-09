import axios from "axios"
import React, { useEffect, useState } from "react"
import { Billing } from "../Apis/functions"
import { ContentCopy } from "@mui/icons-material"
import { IoIosCheckmarkCircleOutline, IoIosClose } from "react-icons/io"
import { getInitialOrderValue } from "../utils/constants"

const IMPORT_INTERVAL_TIME = 15 //seconds
const LOCAL_ERROR_TYPES = {
	UNMAPPED_USER: "User",
	UNMAPPED_COUNTER: "Counter",
	UNMAPPED_ITEM: "Item",
}

const ImportInvoices = ({ file, onClose }) => {
	const [timer, setTimer] = useState(IMPORT_INTERVAL_TIME)
	const [existingInvoicesState, setExistingInvoicesState] = useState(null)
	const [results, setResults] = useState({
		succeed: [],
		failed: [],
		skipped: [],
		reimported: [],
		resolved: [],
		count: 0,
		total: 0,
	})
	const [flags, setFlags] = useState({
		loading: false,
		posting: false,
	})

	const createOrder = async (dmsInvoice, data) => {
		let order
		const billingParams = {
			creating_new: 1,
			new_order: 1,
			add_discounts: true,
			items: {},
		}

		try {
			billingParams.counter = data.counters.find((i) => i.dms_buyer_id === dmsInvoice.buyer_id)

			const errors = []
			if (!billingParams.counter)
				errors.push({
					errorType: LOCAL_ERROR_TYPES.UNMAPPED_COUNTER,
					name: dmsInvoice.buyer_name,
					id: dmsInvoice.buyer_id,
				})

			for (const i of dmsInvoice.items_details) {
				const item = data.items.find((j) => j.dms_erp_ids.includes(i.dms_erp_id))
				if (!item) {
					errors.push({
						errorType: LOCAL_ERROR_TYPES.UNMAPPED_ITEM,
						name: i.dms_item_name,
						id: i.dms_erp_id,
					})
					continue
				}

				const b = parseInt(+item?.conversion ? i.p / +item.conversion : 0)
				const p = parseInt(+item?.conversion ? i.p % +item.conversion : i.p)

				if (billingParams.items[item.item_uuid]) {
					billingParams.items[item.item_uuid].b += b
					billingParams.items[item.item_uuid].p += p
				} else {
					billingParams.items[item.item_uuid] = {
						...item,
						...i,
						b,
						p,
					}
				}
			}

			billingParams.items = Object.values(billingParams.items)

			const user_uuid = data.users?.find((i) => i.dms_erp_id === dmsInvoice.erp_user)?.user_uuid
			if (!user_uuid)
				errors.push({
					errorType: LOCAL_ERROR_TYPES.UNMAPPED_USER,
					name: dmsInvoice.erp_user_name,
					id: dmsInvoice.erp_user,
				})

			if (errors?.length > 0) return { errors, local: true }

			const { items, ...billing_details } = await Billing(billingParams)
			const initialValues = getInitialOrderValue()
			order = {
				...dmsInvoice,
				...billing_details,
				dms_details: dmsInvoice,
				opened_by: 0,
				priority: 0,
				order_type: "I",
				warehouse_uuid: initialValues.warehouse_uuid,
				time_1: Date.now() + initialValues.time_1,
				time_2: Date.now() + initialValues.time_2,
				item_details: items.map((i) => ({
					...i,
					unit_price:
						i.item_total / (+(+i.conversion * i.b) + i.p + i.free) || i.item_price || i.price,
					gst_percentage: i.item_gst,
					css_percentage: i.item_css,
					status: 0,
					price: i.price || i.item_price || 0,
				})),
				status: [
					{
						stage: 1,
						time: Date.now(),
						user_uuid: user_uuid,
					},
				],
			}
		} catch (error) {
			return {
				message: "Order billing failed (" + error?.message + ")",
			}
		}

		try {
			const response = await axios({
				method: "post",
				url: "/orders/postOrder",
				data: order,
				headers: {
					"Content-Type": "application/json",
				},
			})

			if (response?.data?.success)
				return {
					success: true,
					details: {
						success: true,
						dms_invoice_number: dmsInvoice.invoice_number,
						invoice_number: response.data.result?.invoice_number,
						counter_title: billingParams.counter?.counter_title,
						dms_buyer_name: dmsInvoice.buyer_name,
						order_uuid: response.data.result?.order_uuid,
					},
				}
			else return { message: "Order not created, please check the invoice details." }
		} catch (error) {
			console.error(error)
			return {
				message:
					error.response.status === 500 || !error.response?.data?.message
						? "Something broke, please contact support."
						: error.response?.data?.message,
			}
		}
	}

	const sleep = (ms) =>
		new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve()
			}, ms)
		})

	const processJson = async (json, data) => {
		for (let idx = 0; idx < json.length; idx++) {
			setFlags({ posting: true })

			const dmsInvoice = json[idx]
			const result = await createOrder(dmsInvoice, data)

			if (result.success)
				setResults((prev) => ({
					...prev,
					succeed: prev.succeed.concat([result.details]),
					count: prev.count + 1,
				}))
			else
				setResults((prev) => ({
					...prev,
					failed: prev.failed.concat([
						{
							dms_invoice_number: dmsInvoice.invoice_number,
							dms_buyer_name: dmsInvoice.buyer_name,
							...(result.local ? { invoice: dmsInvoice } : {}),
							...result,
						},
					]),
					count: prev.count + 1,
				}))

			if (result?.local) continue

			setFlags({ posting: false })
			for (let j = IMPORT_INTERVAL_TIME; j > 0; j--) {
				setTimer(j)
				await sleep(1000)
			}
		}

		setFlags({})
	}

	const initiateIntervalImport = async (json) => {
		const payload = {
			dms_counters: [],
			dms_users: [],
			dms_invoice_numbers: [],
			dms_items: [],
		}

		const buyerMap = new Map()

		for (const invoice of json) {
			payload.dms_counters.push(invoice.buyer_id)
			payload.dms_users.push(invoice.erp_user)
			payload.dms_invoice_numbers.push(invoice.invoice_number)
			payload.dms_items = payload.dms_items.concat(invoice.items_details.map((i) => i.dms_erp_id))
			buyerMap.set(invoice.invoice_number, invoice.buyer_name)
		}

		const response = await axios.post("/invoice-import-prerequisite", payload)
		const skipped = response.data?.existing_invoice_orders?.reduce((obj, i) => ({
			...obj,
			[i.dms_details.invoice_number]: {
				dms_buyer_name: buyerMap.get(i.dms_details.invoice_number),
				dms_invoice_number: i.dms_details.invoice_number,
			}
		}), {})

		if (response.data?.existing_invoice_orders?.length)
			json = json.filter((i) => !skipped[i.invoice_number])

		setResults((prev) => ({ ...prev, total: prev.total + json.length, resolved: [], skipped }))
		processJson(json, response.data)

		// if (!response.data?.existing_invoice_orders?.length) {
		// } else {
		// 	setFlags({ loading: false })
		// 	const callback = ({ skipped, reimported }) => {
		// 		setExistingInvoicesState(null)

		// 		if (skipped?.length > 0) {
		// 			const tempJson = json.filter((i) => !skipped?.includes(i.invoice_number))

		// 			skipped = json
		// 				?.filter((i) => skipped.includes(i.invoice_number))
		// 				?.map((i) => ({
		// 					dms_buyer_name: i.buyer_name,
		// 					dms_invoice_number: i.invoice_number,
		// 				}))

		// 			json = tempJson
		// 		}

		// 		if (reimported?.length > 0)
		// 			reimported = json
		// 				?.filter((i) => reimported.includes(i.invoice_number))
		// 				?.map((i) => ({
		// 					dms_buyer_name: i.buyer_name,
		// 					dms_invoice_number: i.invoice_number,
		// 				}))

		// 		setResults((prev) => ({
		// 			...prev,
		// 			total: prev.total + json.length,
		// 			skipped: prev.skipped.concat(skipped),
		// 			reimported: prev.reimported.concat(reimported),
		// 			resolved: [],
		// 		}))

		// 		processJson(json, response.data)
		// 	}

		// 	const list = response.data?.existing_invoice_orders?.map((i) => ({
		// 		...i.dms_details,
		// 		...i,
		// 		dms_invoice_number: i.dms_details.invoice_number,
		// 		buyer_name: json.find((_i) => _i.invoice_number === i.dms_details.invoice_number)
		// 			?.buyer_name,
		// 	}))

		// 	setExistingInvoicesState({ list: list, callback })
		// }
	}

	/**
	 * For local errors: if all the errors for a doc have been resolved,
	 * then move doc.json to resolved status.
	 */
	const onMapped = (id) => {
		setResults((prev) => {
			for (const doc of prev.failed) {
				if (!doc.local) continue
				doc.errors = doc.errors.map((i) => (i.id === id ? { ...i, resolved: true } : i))
				doc.resolved = !doc.errors.some((i) => !i.resolved)
				if (doc.resolved) prev.resolved.push(doc.invoice)
			}
			prev.failed = prev.failed.filter((i) => !i.resolved)
			return prev
		})
	}

	const importResolved = () => {
		const json = [...results.resolved]
		initiateIntervalImport(json)
	}

	useEffect(() => {
		;(async () => {
			try {
				if (!file) return
				setFlags({ loading: true })

				let json = await new Promise((res, rej) => {
					const reader = new FileReader()

					reader.onload = (e) => {
						try {
							const json = JSON.parse(e.target.result)
							res(json)
						} catch (error) {
							alert("The file content is not valid JSON.")
							rej()
						}
					}

					reader.onerror = (e) => {
						alert("Failed to read file, please contact support.")
						rej()
					}

					reader.readAsText(file)
				})

				initiateIntervalImport(json)
			} catch (error) {
				setFlags({})
			}
		})()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [file])

	return (
		<>
			{results.total === 0 && existingInvoicesState === null ? null : flags?.loading ? (
				<div id="spinner-overlay-wrapper" style={{ background: "#00000062", zIndex: 1000 }}>
					<span
						className="loader small"
						style={{
							borderColor: "var(--mainColor)",
							borderBottomColor: "transparent",
							margin: "auto",
							display: "block",
						}}
					/>
				</div>
			) : (
				<div
					id="import-invoices"
					className="overlay"
					style={{ position: "fixed", top: 0, left: 0, zIndex: 9999999 }}
				>
					<div className="modal" style={{ height: "fit-content", width: "75vw", padding: 0 }}>
						<div className="heading relative" style={{ padding: ".75rem 0" }}>
							<span>
								<b>Interval Importing Invoice</b>
							</span>
							{results.total === results.count || existingInvoicesState !== null ? (
								<button id="close-btn" onClick={onClose}>
									<IoIosClose />
								</button>
							) : null}
						</div>
						<div style={{ padding: "0 1.25rem 1.25rem" }}>
							{existingInvoicesState !== null ? (
								<InvoiceSelection
									ordersData={existingInvoicesState?.list}
									onComplete={(value) => existingInvoicesState?.callback(value)}
								/>
							) : (
								<>
									<div style={{ margin: "16px 0 8px", fontSize: "1rem" }}>
										<span>
											<b>
												Processed {results.count} invoices out of {results.total}
											</b>
										</span>
									</div>
									<div
										style={{
											height: "5px",
											width: "100%",
											background: "#e2e2e2",
											borderRadius: "5px",
											overflow: "hidden",
										}}
									>
										<div
											style={{
												background: "var(--main)",
												height: "100%",
												width: (results.count / results.total) * 100 + "%",
											}}
										/>
									</div>
									<div style={{ margin: "8px 0 18px", fontSize: "1rem" }}>
										{flags?.posting ? (
											<div className="flex" style={{ width: "fit-content", gap: "8px" }}>
												<span
													className="loader"
													style={{
														width: "1rem",
														height: "1rem",
														borderWidth: "3px",
														borderColor: "var(--mainColor)",
														borderBottomColor: "transparent",
														margin: "auto",
														display: "block",
													}}
												/>
												<span>posting...</span>
											</div>
										) : results?.count < results?.total ? (
											<span>
												Next order will be created in{" "}
												<span
													style={{ background: "#e2e2e2", borderRadius: "0 5px", padding: "0 4px" }}
												>
													<b>00:{timer.toString().padStart(2, "0")}</b>
												</span>
											</span>
										) : null}
									</div>
									<ResultStatusTabs
										result={results}
										onMapped={onMapped}
										handleImportResolved={importResolved}
									/>
								</>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	)
}

const InvoiceSelection = ({ ordersData, onComplete }) => {
	const [orders, setOrders] = useState([])
	const [selection, setSelection] = useState([])
	const [skip, setSkip] = useState([])
	const [reImport, setReImport] = useState([])
	const [copied, setCopied] = useState()

	useEffect(() => {
		if (ordersData?.length > 0) setOrders(ordersData)
	}, [ordersData])

	const handleInsertion = (type) => {
		if (selection.length === orders.length)
			return onComplete({
				skipped: Array.from(new Set(skip?.concat(type === 1 ? selection : []))),
				reimported: Array.from(new Set(reImport?.concat(type === 2 ? selection : []))),
			})

		setOrders((prev) => prev.filter((i) => !selection.includes(i.invoice_number)))
		if (type === 1) setSkip((prev) => prev.concat(selection))
		else if (type === 2) setReImport((prev) => prev.concat(selection))
		setSelection([])
	}

	return (
		<div id="invoice-selection-wrapper">
			<div>
				<div>
					<span id="heading" style={{ display: "block" }}>
						<b>Existing DMS Invoice Numbers ({orders?.length})</b>
					</span>
					<span style={{ display: "block" }}>Selected: {selection.length}</span>
				</div>
				<div className="flex" style={{ gap: "10px" }}>
					<button
						className="theme-btn"
						onClick={() => handleInsertion(1)}
						disabled={!selection?.length}
					>
						Skip Selected
					</button>
					<button
						className="theme-btn"
						onClick={() => handleInsertion(2)}
						disabled={!selection?.length}
					>
						Re-Import Selected
					</button>
				</div>
			</div>

			<div id="orders-table">
				<table style={{ width: "100%", textAlign: "left" }}>
					<thead style={{ position: "sticky", top: 0, background: "white", zIndex: 1 }}>
						<tr>
							<th>
								<input
									type="checkbox"
									style={{ marginRight: "5px" }}
									checked={selection.length === orders.length}
									onChange={(e) =>
										e.target.checked
											? setSelection(orders.map((i) => i.dms_details.invoice_number))
											: setSelection([])
									}
								/>
							</th>
							<th>DMS invoice number</th>
							<th>Order</th>
						</tr>
					</thead>
					<tbody>
						{orders?.map((i, idx) => (
							<tr
								key={`${i.dms_details.invoice_number}:${idx}`}
								style={{ cursor: "pointer" }}
								onClick={() =>
									setSelection((prev) =>
										prev.includes(i.dms_details.invoice_number)
											? prev.filter((s) => s !== i.dms_details.invoice_number)
											: prev.concat([i.dms_details.invoice_number])
									)
								}
							>
								<td>
									<input
										type="checkbox"
										checked={selection.includes(i.dms_details.invoice_number)}
										onChange={() => null}
										style={{ pointerEvents: "none" }}
									/>
								</td>
								<td>
									{i.dms_details.invoice_number} ({i.buyer_name})
								</td>
								<td>
									<div style={{ position: "relative", display: "inline" }}>
										{copied === i.dms_details.invoice_number + i.invoice_number && (
											<div style={{ position: "absolute", top: "100%" }}>
												<div id="talkbubble" style={{ fontSize: "12px", left: "-2px" }}>
													COPIED!
												</div>
											</div>
										)}
										<ContentCopy
											style={{
												width: "1.15rem",
												height: "1.15rem",
												marginRight: "8px",
												opacity: ".9",
											}}
											onClick={(e) => {
												e.preventDefault()
												e.stopPropagation()
												setCopied(i.dms_details.invoice_number + i.invoice_number)
												navigator?.clipboard?.writeText?.(i.order_uuid)
												setTimeout(() => setCopied(""), 3000)
											}}
										/>
										{i.invoice_number} ({i.counter_title})
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

const tabs = [
	{ label: "Skipped", keyName: "skipped" },
	{ label: "Re-Imported", keyName: "reimported" },
	{ label: "Succeed", keyName: "succeed" },
	{ label: "Failed", keyName: "failed" },
	{ label: "Resolved", keyName: "resolved" },
]

const ResultStatusTabs = ({ result, onMapped, handleImportResolved }) => {
	const [tab, setTab] = useState(null)
	const [companyWiseItems, setCompanyWiseItems] = useState([])
	const [mapItemState, setMapItemState] = useState()

	useEffect(() => {
		axios.get("/items/company-wise/basic").then(({ data }) => setCompanyWiseItems(data.result))
	}, [])

	return (
		<div id="tabs-container">
			{tabs.map((i, idx) => (
				<button
					key={"result-status-tab-btn:" + i.keyName}
					className={tab === idx ? "selected" : null}
					onClick={() => setTab(idx)}
					disabled={!result?.[i.keyName]?.length}
				>
					<b>{i.label}</b> ({result?.[i.keyName]?.length})
				</button>
			))}

			{tab !== null && (
				<div id="status-results">
					{tab === tabs.length - 1 && (
						<button
							className="theme-btn"
							style={{ background: "black" }}
							onClick={handleImportResolved}
							disabled={result?.count !== result?.total}
						>
							Import all resolved invoice ↑
						</button>
					)}
					<ol style={{ paddingLeft: "32.33px" }}>
						{result?.[tabs[tab].keyName]?.map((detail, idx) => (
							<li key={`${tabs[tab].keyName}:${idx}`}>
								{detail.success ? (
									<p>
										<b>{detail.dms_buyer_name}</b> ({detail.dms_invoice_number}) —{" "}
										<b>{detail.invoice_number}</b> ({detail.counter_title})
										<ContentCopy
											style={{
												width: "1.15rem",
												height: "1.15rem",
												marginLeft: "8px",
												opacity: ".9",
												cursor: "pointer",
											}}
											onClick={() => navigator?.clipboard?.writeText?.(detail.order_uuid)}
										/>
									</p>
								) : (
									<>
										<p>
											<b>{detail.dms_buyer_name} :</b> {detail.dms_invoice_number}
										</p>
										<section>
											{typeof detail.message == "string" ? (
												<p>{detail.message}</p>
											) : (
												detail.errors?.map((err, err_idx) => (
													<div key={["err_message", idx, err_idx].join(":")}>
														<p>
															<b>{err.errorType} not found :</b> {err.name} - {err.id}
														</p>
														{!err.resolved && err.errorType === LOCAL_ERROR_TYPES.UNMAPPED_ITEM && (
															<button className="map-item-btn" onClick={() => setMapItemState(err)}>
																Map Item →
															</button>
														)}
													</div>
												))
											)}
										</section>
									</>
								)}
							</li>
						))}
					</ol>
				</div>
			)}

			{mapItemState && (
				<MapItem
					mapItemState={mapItemState}
					companyWiseItems={companyWiseItems}
					onMapped={() => {
						onMapped(mapItemState.id)
						setMapItemState()
					}}
					onClose={() => setMapItemState()}
				/>
			)}
		</div>
	)
}

const MapItem = ({ mapItemState, companyWiseItems, onMapped, onClose }) => {
	const [companySearch, setCompanySearch] = useState("")
	const [itemSearch, setItemSearch] = useState("")
	const [selectedItem, setSelectedItem] = useState()
	const [loading, setLoading] = useState(false)

	const noSearch = companySearch?.length < 3 && itemSearch?.length < 3
	const handleMapping = async () => {
		setLoading(true)
		try {
			const response = await axios.patch("/items/map-item", {
				item_uuid: selectedItem.item_uuid,
				dms_item_code: mapItemState.id,
			})
			if (response.data.success) onMapped()
			else {
				alert(response.data.error)
				setLoading(false)
			}
		} catch (error) {
			console.error(error)
			setLoading(false)
		}
	}

	return (
		<div
			id="map-items"
			className="overlay"
			style={{ position: "fixed", top: 0, left: 0, zIndex: 9999999 }}
		>
			<div className="modal" style={{ height: "fit-content", width: "50vw", padding: 0 }}>
				{loading && (
					<div id="spinner-overlay-wrapper" style={{ background: "#00000062", zIndex: 1000 }}>
						<span
							className="loader small"
							style={{
								borderColor: "var(--mainColor)",
								borderBottomColor: "transparent",
								margin: "auto",
								display: "block",
							}}
						/>
					</div>
				)}
				<div className="heading relative" style={{ padding: ".75rem 0" }}>
					<span>
						<b>Map Item</b>
					</span>
					<button id="close-btn" onClick={onClose}>
						<IoIosClose />
					</button>
				</div>
				<div style={{ padding: "0 .5rem .25rem" }}>
					<div style={{ margin: ".5rem 0" }}>
						<p>
							<b>{mapItemState?.name}</b> - {mapItemState.id}
						</p>
					</div>
					<div id="search-fields-container" style={{ margin: ".25rem 0 .5rem" }}>
						<input
							type="text"
							className="searchInput"
							placeholder="Search items..."
							value={itemSearch}
							onChange={(e) => setItemSearch(e.target.value)}
						/>
						<input
							type="text"
							className="searchInput"
							placeholder="Search companies..."
							value={companySearch}
							onChange={(e) => setCompanySearch(e.target.value)}
						/>
					</div>

					<div className="items_table">
						<table>
							<thead>
								<tr>
									<th></th>
									<th>Item</th>
									<th>Company</th>
								</tr>
							</thead>
							<tbody>
								{noSearch && !selectedItem ? (
									<tr>
										<td colSpan={3} id="search-data-user-info">
											<i>Please search data to view results here.</i>
										</td>
									</tr>
								) : (
									/**
										1. show company if
											company is selected or
											company is searched or
											item is searched

										2. show item if
											item is selected or
											(item is searched and company is searched) or
											(item is searched when companySearch is empty) or
											(company is searched when itemSearch is empty)
									*/
									companyWiseItems?.map((comp) => {
										const isCompanySelected =
											selectedItem && selectedItem?.company_uuid === comp.company_uuid
										const isCompanySearched =
											companySearch.length >= 3 &&
											comp.company_title.toLowerCase().includes(companySearch.toLowerCase())

										if (!(isCompanySelected || isCompanySearched || itemSearch.length >= 3))
											return null
										return comp?.items?.map((i) => {
											const isItemSelected = selectedItem && selectedItem?.item_uuid === i.item_uuid
											const isItemSearched =
												itemSearch.length >= 3 &&
												i.item_title.toLowerCase().includes(itemSearch.toLowerCase())

											if (
												!(
													isItemSelected ||
													(isItemSearched && isCompanySearched) ||
													(isItemSearched && companySearch.length < 3) ||
													(isCompanySearched && itemSearch.length < 3)
												)
											)
												return null
											return (
												<tr
													key={"item:" + i.item_uuid}
													onClick={() =>
														setSelectedItem({
															...i,
															company_uuid: comp.company_uuid,
															company_title: comp.company_title,
														})
													}
													className={isItemSelected ? "selected" : null}
												>
													<td>
														<IoIosCheckmarkCircleOutline className="item-checkmark" />
													</td>
													<td>{i.item_title}</td>
													<td>{comp.company_title}</td>
												</tr>
											)
										})
									})
								)}
							</tbody>
						</table>
					</div>
					<button
						className="theme-btn"
						disabled={!selectedItem}
						onClick={handleMapping}
						style={{
							background: "black",
							width: "100%",
							marginTop: ".5rem",
							padding: ".75rem 1rem",
						}}
					>
						Map to selected item
					</button>
				</div>
			</div>
		</div>
	)
}

export default ImportInvoices
