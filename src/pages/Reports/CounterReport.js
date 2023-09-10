import axios from "axios"
import React, { useEffect, useState } from "react"
import Header from "../../components/Header"
import Sidebar from "../../components/Sidebar"
import { TiArrowSortedUp, TiArrowSortedDown, TiArrowUnsorted } from "react-icons/ti"

import OutlinedInput from "@mui/material/OutlinedInput"
import MenuItem from "@mui/material/MenuItem"
import FormControl from "@mui/material/FormControl"
import ListItemText from "@mui/material/ListItemText"
import Select from "@mui/material/Select"
import Checkbox from "@mui/material/Checkbox"

const ITEM_HEIGHT = 48
const ITEM_PADDING_TOP = 8
const MenuProps = {
	PaperProps: {
		style: {
			maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
			width: 250
		}
	}
}

const today = new Date().getTime()

const formatDate = _date => {
	const date = new Date(_date)
	return [
		date?.getFullYear().toString().padStart(4, "0"),
		(date?.getMonth() + 1).toString().padStart(2, "0"),
		date?.getDate().toString().padStart(2, "0")
	].join("-")
}

const CounterReport = () => {
	const [data, setData] = useState({})
	const [dateValues, setDateValues] = useState({ from_date: today, to_date: today })
	const [companies, setCompanies] = useState()
	const [routes, setRoutes] = useState()

	const [selectedCompanies, setSelectedCompanies] = useState([])
	const [selectedRoutes, setSelectedRoutes] = useState([])

	const search = async () => {
		const response = await axios.post("counters/report", {
			date_range: dateValues,
			companies: selectedCompanies,
			routes: selectedRoutes
		})
		if (response.status === 200) {
			const counters = response.data.result

			for (const counter of counters) {
				const company_purchase = {}

				for (const item of counter.item_details) {
					company_purchase[item.company_uuid] = {
						total_amount: (company_purchase[item.company_uuid]?.total_amount || 0) + item.item_total,
						b: (company_purchase[item.company_uuid]?.b || 0) + item.b,
						p: (company_purchase[item.company_uuid]?.p || 0) + item.p
					}
				}

				counter.counter_uuid = counter._id
				counter.company_purchase = company_purchase

				delete counter._id
				delete counter.item_details
			}

			const total_values = counters.reduce((result, i) => {
				for (const company in i.company_purchase) {
					result[company] = {
						total_amount: (result[company]?.total_amount || 0) + i.company_purchase[company].total_amount,
						b: (result[company]?.b || 0) + i.company_purchase[company].b,
						p: (result[company]?.p || 0) + i.company_purchase[company].p
					}
				}
				return result
			}, {})

			setData({
				table_data: counters,
				total_values: total_values,
				companies: companies?.filter(i => selectedCompanies.includes(i.company_uuid)),
				routes: selectedRoutes.reduce((obj, i) => ({
					...obj,
					[i]: routes?.find(_i => _i.route_uuid === i)?.route_title
				}))
			})
		}
	}

	useEffect(() => {
		;(async () => {
			const companiesResponse = await axios.get("/companies/getCompanies")
			if (companiesResponse?.data?.result?.[0]) {
				let data = companiesResponse?.data?.result
					?.filter(i => +i.status)
					?.map(i => ({
						company_title: i.company_title,
						company_uuid: i.company_uuid
					}))
				setCompanies(data)
				setSelectedCompanies(data.map(i => i.company_uuid))
			}

			const routesResponse = await axios.get("/routes/GetRouteList")
			if (routesResponse?.data?.result?.[0]) {
				let data = routesResponse?.data?.result
					?.filter(i => +i.order_status)
					?.map(i => ({
						route_title: i.route_title,
						route_uuid: i.route_uuid
					}))
				setRoutes(data)
				setSelectedRoutes(data.map(i => i.route_uuid))
			}
		})()
	}, [])

	const options = [
		{
			type: "Company",
			selected: selectedCompanies,
			setSelection: data => setSelectedCompanies(data),
			menu_items: companies,
			label: "company_title",
			key: "company_uuid"
		},
		{
			type: "Route",
			selected: selectedRoutes,
			setSelection: data => setSelectedRoutes(data),
			menu_items: routes,
			label: "route_title",
			key: "route_uuid"
		}
	]

	const getRenderValue = (selected, type, key, label, selectedValues, menu_items) => (
		<span style={{ fontSize: ".9rem" }}>
			{selected.length === 0 ? (
				<>
					<b>{type}: </b>
					<em>None</em>
				</>
			) : selected.length === menu_items.length ? (
				<>
					<b>{type}: </b>
					<em>All</em>
				</>
			) : (
				<>
					<b>{type}: </b>
					<em>
						{menu_items
							.filter(i => selectedValues.includes(i[key]))
							.map(i => i[label])
							.slice(0, 10)
							.join(", ")}
					</em>
				</>
			)}
		</span>
	)

	return (
		<>
			<Sidebar />
			<Header />
			<div className="item-sales-container orders-report-container">
				<div id="heading">
					<h2>Counter Report</h2>
				</div>
				<div id="item-sales-top">
					<div id="date-input-container" style={{ alignItems: "flex-end" }}>
						<input
							type="date"
							onChange={e => setDateValues(prev => ({ ...prev, from_date: e.target.valueAsNumber }))}
							max={formatDate(today)}
							value={formatDate(dateValues.from_date)}
							className="searchInput"
							style={{ width: "180px", padding: "10px", background: "#f1f1f3" }}
						/>
						<input
							type="date"
							onChange={e => setDateValues(prev => ({ ...prev, to_date: e.target.valueAsNumber }))}
							max={formatDate(today)}
							value={formatDate(dateValues.to_date)}
							className="searchInput"
							style={{ width: "180px", padding: "10px", background: "#f1f1f3" }}
						/>
						{options?.map(option => (
							<FormControl sx={{ width: 250 }}>
								<Select
									className="mui-multi-select"
									multiple
									displayEmpty
									value={option.selected}
									onChange={e => option.setSelection(e.target.value)}
									input={<OutlinedInput />}
									renderValue={i => getRenderValue(i, option.type, option.key, option.label, option.selected, option.menu_items)}
									MenuProps={MenuProps}
								>
									{option.menu_items?.map(menu_item => (
										<MenuItem key={menu_item[option.key]} value={menu_item[option.key]} className="mui-multi-menuitem">
											<Checkbox
												checked={option.selected.indexOf(menu_item[option.key]) > -1}
												className="mui-multi-menuitem-checkbox"
											/>
											<ListItemText primary={menu_item[option.label]} className="mui-multi-menuitem-text" />
										</MenuItem>
									))}
								</Select>
							</FormControl>
						))}
						<button style={{ width: "100px", justifyContent: "center", padding: "12px" }} className="theme-btn" onClick={search}>
							Search
						</button>
					</div>
				</div>
				<div className="table-container-user item-sales-container">
					<Table {...data} />
				</div>
			</div>
		</>
	)
}

function Table({ table_data: data = [], total_values = {}, companies = [], routes = {} }) {
	const columns = ["Route", "Counter"]?.concat(companies?.map(i => i.company_title))
	const [sortingState, setSortingState] = useState({})

	// const sortData = keys => {
	// 	const sortTarget = sortingState?.sort_target?.toLowerCase()
	// 	const sortMethod = sortingState[sortingState?.sort_target]
	// 	const sortedData = keys?.sort(
	// 		(a, b) =>
	// 			(sortTarget === "user"
	// 				? data[a]?.user_title?.localeCompare(data[b]?.user_title)
	// 				: (data[a]?.[sortTarget]?.amount || 0) - (data[b]?.[sortTarget]?.amount || 0)) * sortMethod
	// 	)
	// 	return sortedData
	// }

	function formatIndianCurrency(number) {
		const indianNumberFormat = new Intl.NumberFormat("en-IN")
		return indianNumberFormat.format(number)
	}

	return (
		<table className="user-table performance-summary-table counter-report">
			<thead>
				<tr>
					{columns?.map(i => (
						<th onClick={() => setSortingState(prev => ({ ...prev, [i]: (prev[i] || 1) * -1, sort_target: i }))}>
							<div>
								<span>{i}</span>
								{sortingState?.[i] === 1 ? (
									<TiArrowSortedUp />
								) : sortingState?.[i] === -1 ? (
									<TiArrowSortedDown />
								) : (
									<TiArrowUnsorted />
								)}
							</div>
						</th>
					))}
				</tr>
			</thead>
			<tbody className="tbody">
				{data?.map(counter => (
					<tr key={counter?.counter_uuid} style={{ height: "30px" }}>
						<td>{routes?.[counter.route_uuid]}</td>
						<td>{counter.counter_title}</td>
						{companies?.map(({ company_uuid: key }) => (
							<td>
								<div>
									<span>
										<b>₹{formatIndianCurrency(counter?.company_purchase?.[key]?.total_amount || 0)}</b>
									</span>
									<span>
										{counter?.company_purchase?.[key]?.b || 0}:{counter?.company_purchase?.[key]?.p || 0}
									</span>
								</div>
							</td>
						))}
					</tr>
				))}
				<tr
					style={{
						height: "30px",
						position: "sticky",
						bottom: 0,
						background: "#ffffff",
						boxShadow: "0px 0px 25px -15px black"
					}}
				>
					<td colSpan={2}>
						<b>TOTAL: </b>
					</td>
					{companies?.map(({ company_uuid: key }) => (
						<td>
							<div>
								<span>
									<b>₹{formatIndianCurrency(total_values?.[key]?.total_amount || 0)}</b>
								</span>
								<span>
									{total_values?.[key]?.b || 0}:{total_values?.[key]?.p || 0}
								</span>
							</div>
						</td>
					))}
				</tr>
			</tbody>
		</table>
	)
}

export default CounterReport
