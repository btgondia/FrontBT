import { useState, useEffect, useMemo, useCallback } from "react"
import axios from "axios"
import { Billing } from "../../../Apis/functions"
import { ITEM_STATUS, VOICE_MESSAGE, ASSEMBLY_MODES, MOBILE_ASSEMBLY_TABS, DEVICE_MESSAGE } from "./constants"
import {
	announce,
	nnum,
	buildItemsIndex,
	buildCategoryIndex,
	computeItemSummary,
	loadFullOrdersFromSession,
	writeFullOrdersToSession,
	allDoneOrCancelled,
} from "./helpers"

export const useOrderAssemblyLogic = () => {
	const [orders, setOrders] = useState([])
	const [search, setSearch] = useState("")
	const [counters, setCounters] = useState([])
	const [itemsMaster, setItemsMaster] = useState(null)
	const [categoriesMaster, setCategoriesMaster] = useState(null)
	const [counterIndex, setCounterIndex] = useState(new Map())
	const [mode, setMode] = useState(ASSEMBLY_MODES.NORMAL)
	const [buffer, setBuffer] = useState({})
	const [itemStatus, setItemStatus] = useState({})
	const [isSoundOn, setIsSoundOn] = useState(false)
	const [loading, setLoading] = useState(false)
	const [selectedKey, setSelectedKey] = useState(null)
	const [mobileTab, setMobileTab] = useState(MOBILE_ASSEMBLY_TABS.ITEMS)

	// Data Fetching
	useEffect(() => {
		const loadCats = async () => {
			try {
				const r = await axios.get("/itemCategories/GetItemCategoryList")
				const arr = Array.isArray(r.data?.result) ? r.data.result : r.data
				if (Array.isArray(arr) && arr.length) setCategoriesMaster(arr)
			} catch (err) {
				console.error("Failed to fetch categories", err)
			}
		}

		const loadCounters = async () => {
			try {
				const r = await axios.get("/counters/GetCounterData")
				const list = Array.isArray(r.data?.result) ? r.data.result : r.data
				setCounters(list)
				const map = new Map()
				;(list || []).forEach((c) => {
					const id = c?.counter_uuid
					if (!id) return
					const title = c.counter_title || c.counter_name || c.counter || c.counterCode || "Unnamed Counter"
					const sortOrder = nnum(c.sort_order, 9999)
					map.set(id, { title, sort_order: sortOrder })
				})
				if (map.size) setCounterIndex(map)
			} catch (err) {
				console.error("Failed to load counters", err)
			}
		}

		Promise.all([loadCounters(), loadCats()])
	}, [])

	useEffect(() => {
		const loadItems = async () => {
			if (!itemsMaster) {
				try {
					const r = await axios.post("/items/GetItemList")
					const arr = Array.isArray(r.data?.result) ? r.data.result : r.data
					if (Array.isArray(arr) && arr.length) setItemsMaster(arr)
				} catch {}
			}
		}
		loadItems()
	}, [itemsMaster])

	useEffect(() => {
		const sessionOrders = loadFullOrdersFromSession()
		setOrders(sessionOrders)
	}, [])

	function arrangeCounters(arr) {
		const placed = []
		const remaining = []

		for (const item of arr) {
			if (item.crateSerialNumber && item.crateSerialNumber >= 0) {
				placed[item.crateSerialNumber - 1] = item
			} else remaining.push(item)
		}

		remaining.sort((a, b) => a.sort_order - b.sort_order)

		let r = 0
		for (let i = 0; r < remaining.length; i++) {
			if (!placed[i]) {
				placed[i] = remaining[r++]
			}
		}

		return placed
	}

	// Calculations
	const itemsIdx = useMemo(() => buildItemsIndex(itemsMaster || []), [itemsMaster])
	const catIdx = useMemo(() => buildCategoryIndex(categoriesMaster || []), [categoriesMaster])
	const grouped = useMemo(() => computeItemSummary(orders, itemsIdx, catIdx), [orders, itemsIdx, catIdx])

	const filtered = useMemo(() => {
		if (!search.trim()) return grouped
		const q = search.trim().toLowerCase()
		return grouped
			.map((g) => ({
				category: g.category,
				sort_order: g.sort_order,
				rows: g.rows.filter((r) => r.name.toLowerCase().includes(q) || String(r.mrp).includes(q))
			}))
			.filter((g) => g.rows.length > 0)
	}, [grouped, search])

	const [perCounterCounts, ordersByCounter, uniqueCountersArr] = useMemo(() => {
		const counterQtyMap = new Map()
		const counterOrdersMap = new Map()
		const counterUniqueMap = new Map()

		if (!orders?.[0]) return counterQtyMap

		for (const o of orders) {
			const cId = o?.counter_uuid
			if (!cId) continue

			// counterOrdersMap
			const orderIds = counterOrdersMap.get(cId) || []
			orderIds.push({
				order_uuid: o?.order_uuid,
				number: o?.invoice_number?.split("-")?.[1],
				total: +o?.order_grandtotal || 0
			})
			counterOrdersMap.set(cId, orderIds)

			// counterUniqueMap
			if (counterIndex?.size) {
				const cIdx = counterIndex.get(cId)
				const caretSN = o.crateSerialNumber || null
				if (!counterUniqueMap.has(cId)) {
					counterUniqueMap.set(cId, {
						uuid: cId,
						title: cIdx?.title || o.counter_title || "Unnamed Counter",
						sort_order: nnum(cIdx?.sort_order ?? o.counter_sort_order, 9999),
						crateSerialNumber: caretSN
					})
				} else {
					const existing = counterUniqueMap.get(cId)
					if (!existing.crateSerialNumber && caretSN) existing.crateSerialNumber = caretSN
				}
			}

			// counterQtyMap
			if (!itemsIdx?.size) continue
			for (const i of o?.item_details || []) {
				if (Object.values(ITEM_STATUS).slice(1).includes(+i?.status)) continue

				const iMap = counterQtyMap.get(i.item_uuid) || new Map()
				const cData = iMap.get(cId) || {
					b: 0,
					p: 0
				}

				cData.b += nnum(i.b)
				cData.p += nnum(i.p)

				const conv = +itemsIdx.get(i.item_uuid)?.conversion
				const pTotol = cData.b * conv + cData.p
				iMap.set(cId, { b: Math.floor(pTotol / conv), p: pTotol % conv })
				counterQtyMap.set(i.item_uuid, iMap)
			}
		}

		return [counterQtyMap, counterOrdersMap, arrangeCounters(Array.from(counterUniqueMap.values()))]
	}, [orders, itemsIdx, counterIndex])

	// Actions
	const queueAction = useCallback(
		(key, newStatus) => {
			if (!key) return
			const toQueue = {}
			for (const o of orders) {
				for (const item of o?.item_details) {
					if (key === item?.item_uuid) {
						toQueue[`${o.order_uuid}::${key}`] = newStatus
					}
				}
			}

			setBuffer(({ size, ...prev }) => {
				const newState = { ...prev, ...toQueue }
				const newSize = Object.keys(newState || {}).length
				return { ...newState, size: newSize }
			})
		},
		[orders]
	)

	const save = async () => {
		if (!buffer.size) return
		setLoading(true)
		try {
			const { size, ..._buffer } = buffer
			const editsByOrder = new Map()
			for (const key in _buffer) {
				const [order_uuid, item_uuid] = key.split("::")
				const list = editsByOrder.get(order_uuid) || []
				list.push({
					order_uuid,
					key: item_uuid,
					newStatus: _buffer[key]
				})
				editsByOrder.set(order_uuid, list)
			}
			const sessionFull = loadFullOrdersFromSession()
			const changedDocs = []
			const changedByUUID = new Map()
			const user_uuid = localStorage.getItem("user_uuid") || "UNKNOWN_USER"

			for (const [uuid, edits] of editsByOrder.entries()) {
				let full = sessionFull.find((o) => o?.order_uuid === uuid)
				if (!full) continue
				if (!full.item_details?.length && full.items?.length)
					full.item_details = full.items.map((x) => ({ ...x }))
				if (!full.item_details?.length) continue

				let anyChange = false
				for (const ed of edits) {
					for (const ln of full.item_details) {
						if (ln.item_uuid === ed.key && +ln.status !== +ed.newStatus) {
							ln.status = +ed.newStatus
							if (+ed.newStatus === 3) {
								ln.b = ln.p = ln.item_total = 0
							}
							anyChange = true
						}
					}
				}
				if (!anyChange) continue

				const billingResponse = await Billing({
					order_uuid: full?.order_uuid,
					invoice_number: `${full?.order_type}${full?.invoice_number}`,
					replacement: full.replacement,
					adjustment: full.adjustment,
					shortage: full.shortage,
					counter: counters.find((a) => a.counter_uuid === full.counter_uuid),
					items: full.item_details.map((a) => ({
						...itemsMaster.find((b) => a.item_uuid === b.item_uuid),
						...a
					}))
				})
				full = { ...full, ...billingResponse }

				const counterIdx = uniqueCountersArr.findIndex((c) => c.uuid === full.counter_uuid)
				if (counterIdx !== -1) {
					full.crateSerialNumber = counterIdx
				}

				if (allDoneOrCancelled(full.item_details)) {
					full.status = [...(full.status || []), { stage: "2", time: Date.now(), user_uuid }]
				}
				changedDocs.push(full)
				changedByUUID.set(uuid, full)
			}

			if (changedDocs.length) {
				await axios.put("/orders/putOrders", changedDocs)
				setOrders((prev) =>
					prev.map((o) => {
						const upd = changedByUUID.get(o.order_uuid)
						return upd ?
								{
									...o,
									item_details: [...upd.item_details],
									status: [...upd.status],
									order_grandtotal: upd.order_grandtotal
								}
							:	o
					})
				)
				const merged = sessionFull.map((o) => changedByUUID.get(o.order_uuid) || o)
				writeFullOrdersToSession(merged)
				setOrders(merged)
				setBuffer([])
				alert(`Saved ${changedDocs.length} order(s).`)
			}
		} catch (err) {
			console.error(err)
			alert("Failed to save.")
		} finally {
			setLoading(false)
		}
	}

	const getDeviceMessage = (key, currentStatus, nextStatus) => {
		if (!key) {
			return DEVICE_MESSAGE.NOT_FOUND
		}

		if (nextStatus === ITEM_STATUS.IN_PROCESSING && currentStatus === ITEM_STATUS.COMPLETE) {
			return DEVICE_MESSAGE.UNTICK
		}

		if (nextStatus === ITEM_STATUS.CANCEL) {
			return DEVICE_MESSAGE.CANCEL
		}
	}

	const getVoiceMessage = (key, currentStatus, nextStatus) => {
		if (!key) {
			return VOICE_MESSAGE.NOT_FOUND
		}

		if (nextStatus === ITEM_STATUS.IN_PROCESSING && currentStatus === ITEM_STATUS.COMPLETE) {
			return VOICE_MESSAGE.UNTICK
		}

		if (nextStatus === ITEM_STATUS.COMPLETE) {
			const itemSummary = grouped
				.find((c) => c.category === catIdx.get(itemsIdx.get(key).category_uuid)?.title)
				?.rows?.find((r) => r.key === key)

			if (!itemSummary?.totalB && !itemSummary?.totalP) return VOICE_MESSAGE.ZERO
			return VOICE_MESSAGE.formatMessage(itemSummary.totalB, itemSummary.totalP)
		}
	}

	const applyStatusForKey = (key, expectedStatus) => {
		console.log(key ? itemsMaster?.find((i) => i.item_uuid === key)?.barcode : "")

		const currentStatus = itemStatus[key] || ITEM_STATUS.IN_PROCESSING
		const nextStatus = currentStatus === expectedStatus ? ITEM_STATUS.IN_PROCESSING : expectedStatus
		const shouldCallDevices = ![currentStatus, nextStatus].includes(ITEM_STATUS.HOLD)

		const deviceMessage = getDeviceMessage(key, currentStatus, nextStatus)
		const voiceMessage = getVoiceMessage(key, currentStatus, nextStatus)

		if (voiceMessage && isSoundOn) announce(voiceMessage)
		if (key) {
			axios.patch("/orders/item-assembly-log", {
				orderIds: orders
					.filter((o) => o.order_uuid && o.item_details?.some((i) => i.item_uuid === key))
					.map((o) => o.order_uuid),
				item_uuid: key,
				status: nextStatus,
				timestamp: new Date().toJSON(),
				user_uuid: localStorage.getItem("user_uuid") || "UNKNOWN_USER"
			})

			queueAction(key, nextStatus)
			setItemStatus((prev) => ({ ...prev, [key]: nextStatus }))
		}

		setSelectedKey(key)

		return { deviceMessage, shouldCallDevices }
	}

	return {
		orders,
		search,
		setSearch,
		mode,
		setMode,
		buffer,
		itemStatus,
		isSoundOn,
		setIsSoundOn,
		mobileTab,
		setMobileTab,
		loading,
		filtered,
		ordersByCounter,
		uniqueCountersArr,
		perCounterCounts,
		selectedKey,
		setSelectedKey,
		queueAction,
		save,
		applyStatusForKey,
		itemsMaster
	}
}
