import { useState, useEffect, useCallback, useRef } from "react"
import axios from "axios"
import { ASSEMBLY_DEVICE_COUNT, ASSEMBLY_MODES, DEVICE_MESSAGE } from "./constants"

export const useDeviceIntegration = (mode, uniqueCountersArr, perCounterCounts, selectedItemKey) => {
	const [deviceBases, setDeviceBases] = useState([])
	const [deviceCallStatus, setDeviceCallStatus] = useState({})
	const [apiLoading, setApiLoading] = useState(false)
	const [doneCounterIds, setDoneCounterIds] = useState({})

	useEffect(() => {
		const loadDevices = async () => {
			try {
				const { data } = await axios.get("/api/assembly-devices")
				const list = Array.isArray(data?.devices) ? data.devices : []
				const byNum = new Map(list.map((d) => [Number(d.device_number), String(d.url || "").trim()]))
				const normed = Array.from({ length: ASSEMBLY_DEVICE_COUNT }, (_, i) => {
					const n = i + 1
					let base = byNum.get(n) || ""
					if (!base) return ""
					const valIdx = base.toLowerCase().lastIndexOf("val=")
					if (valIdx >= 0) base = base.slice(0, valIdx)
					if (!/[&?]$/.test(base)) base += base.includes("?") ? "&" : "?"
					return base
				})
				setDeviceBases(normed)
			} catch (e) {
				console.error("Failed to load device URLs for assembly", e)
			}
		}
		loadDevices()
	}, [])

	const fetchWithRetry = async (url, attempts = 3, signal, data) => {
		const { id, idx, message } = data || {}
		for (let i = 1; i <= attempts; i++) {
			try {
				await fetch(url, {
					method: "GET",
					mode: "no-cors",
					signal
				})
				if (data) {
					setDeviceCallStatus((prev) =>
						prev?.retrying?.includes(id) ?
							{ ...prev, retrying: (prev?.retrying || [])?.filter((i) => i !== id) }
						:	prev
					)
				}
				return
			} catch (err) {
				if (signal?.aborted) {
					setDeviceCallStatus((prev) =>
						prev?.retrying?.includes(id) ?
							{ ...prev, retrying: (prev?.retrying || [])?.filter((i) => i !== id) }
						:	prev
					)
					return
				}
				if (i === attempts) {
					if (data)
						setDeviceCallStatus((prev) => ({
							retrying: prev?.retrying?.filter((i) => i !== id) || [],
							failed: [
								...(prev?.failed || []),
								{
									idx,
									passedMessage: message,
									message: err?.message || "Device call failed"
								}
							]
						}))
					throw err
				}
				await new Promise((res) => setTimeout(res, 250))
				if (data)
					setDeviceCallStatus((prev) => ({
						...prev,
						retrying: Array.from(new Set([...(prev?.retrying || []), id]))
					}))
			}
		}
	}

	const getCounterDoneStatus = (counterId, currItemId, ordersByCounter, orders) => {
		const counterOrders = ordersByCounter.get(counterId)
		const hasUnProcessedItems = counterOrders?.some((i) => {
			const order = orders.find((o) =>
				[o.invoice_number.split("-")[1], o.order_uuid].includes(i.number.toString())
			)
			return order?.item_details?.some(
				(item) => (item.status !== 1 && item.status !== 3) || item.item_uuid === currItemId
			)
		})
		return !hasUnProcessedItems
	}

	const send = useCallback(
		async (controller, ordersByCounter, orders, overrideMessage) => {
			setApiLoading(true)
			setDeviceCallStatus({})
			try {
				const calls = uniqueCountersArr.map(async (c, idx) => {
					const base = deviceBases[idx]
					if (!base || doneCounterIds?.[c.uuid]) return null

					let message = overrideMessage
					const isCounterDone = getCounterDoneStatus(c.uuid, selectedItemKey, ordersByCounter, orders)

					if (isCounterDone) {
						message = DEVICE_MESSAGE.DONE
					} else if (!message) {
						message = DEVICE_MESSAGE.formatMessage(perCounterCounts.get(c.uuid))
					}

					const finalUrl = `${base}val=${encodeURIComponent(message)}`
					const id = Date.now().toString() + idx
					await fetchWithRetry(finalUrl, 3, controller?.signal, { id, idx, message })
					return isCounterDone ? { [c.uuid]: true } : null
				})

				const results = await Promise.all(calls)
				const newDoneIds = results.reduce((acc, res) => (res ? { ...acc, ...res } : acc), {})
				if (Object.keys(newDoneIds).length > 0) {
					setDoneCounterIds((prev) => ({ ...prev, ...newDoneIds }))
				}
			} catch (err) {
				console.error(err)
			} finally {
				setApiLoading(false)
			}
		},
		[uniqueCountersArr, deviceBases, doneCounterIds, selectedItemKey, perCounterCounts]
	)

	return {
		deviceBases,
		deviceCallStatus,
		apiLoading,
		setDeviceCallStatus,
		send
	}
}
