import { ITEM_STATUS, ORDER_ASSEMBLY_SS_KEY } from "./constants"

const synth = window.speechSynthesis
let voice = null

export function initVoice() {
	const voices = synth.getVoices()
	voice = voices.find((v) => v.lang === "en-IN") || voices[0]
}

export function announce(text) {
    console.log(text)
	synth.cancel()
	const u = new SpeechSynthesisUtterance(text)
	u.voice = voice
	u.rate = 1
	u.pitch = 1
	synth.speak(u)
}

export const norm = (s) => String(s ?? "").trim()
export const nnum = (v, d = 0) => (isNaN(+v) ? d : +v)
export const lineItemId = (ln) => String(ln?.item_uuid_v2 || ln?.item_uuid || ln?.item_code || ln?.ITEM_CODE || "")
export const pluralize = (word, count) =>
	count === 1 ? word : word + (["s", "x"].includes(word.toLowerCase().at(-1)) ? "es" : "s")

export const getOrderGrand = (o) => {
	const candidates = [o?.order_grandtotal, o?.grand_total, o?.order_grand_total, o?.grandTotal, o?.total_amount]
	for (const v of candidates) {
		const n = +v
		if (Number.isFinite(n) && n > 0) return n
	}
	return 0
}

export const sumOrdersTotal = (orders = []) => orders.reduce((acc, o) => acc + getOrderGrand(o), 0)

export const buildItemsIndex = (items = []) => {
	const idx = new Map()
	for (let index = 0; index < items.length; index++) {
		const it = items[index]
		const key = it?.item_uuid || it?._id
		if (!key) continue
		idx.set(String(key), {
			name: norm(it.item_title) || norm(it.pronounce) || norm(it.name) || norm(it.title),
			mrp: nnum(it.mrp ?? it.MRP ?? it.price_mrp ?? it.Price_MRP),
			category_uuid: norm(it.category_uuid || it.cat_uuid || ""),
			// pcs per box (conversion)
			conversion: nnum(
				it.conversion ?? it.CONVERSION ?? it.Conv ?? it.conv ?? it.pcs_in_box ?? it.pieces_in_box,
				1
			)
		})
	}
	return idx
}

export const buildCategoryIndex = (cats = []) => {
	const idx = new Map()
	for (const c of cats) {
		const uuid = norm(c.category_uuid || c.uuid || c._id || c.IDENTIFIER || c.id)
		if (!uuid) continue
		idx.set(uuid, {
			title: norm(c.category_title || c.title || c.name || "Uncategorized"),
			sort_order: typeof c.sort_order === "number" ? c.sort_order : nnum(c.sort_order, 9999)
		})
	}
	return idx
}

export const getName = (ln, itemsIdx) => {
	const fromLine = ln.item_title || ln.item_name || ln.title || ln.name || ln.Item || ln.item
	if (fromLine) return norm(fromLine)
	const byUuid = itemsIdx.get(lineItemId(ln))
	return byUuid?.name || ""
}

export const getMRP = (ln, itemsIdx) => {
	const fromLine = ln.mrp ?? ln.MRP ?? ln.price_mrp ?? ln.Price_MRP
	if (!isNaN(+fromLine)) return +fromLine
	const byUuid = itemsIdx.get(lineItemId(ln))
	return byUuid?.mrp || 0
}

export const getConversion = (ln, itemsIdx) => {
	const byUuid = itemsIdx.get(lineItemId(ln))
	return byUuid?.conversion ?? null
}

export const getCategoryMeta = (ln, itemsIdx, catIdx) => {
	const fromLine = norm(ln.category_uuid || ln.cat_uuid || "")
	if (fromLine && catIdx.has(fromLine)) return catIdx.get(fromLine)
	const fromItem = itemsIdx.get(lineItemId(ln))?.category_uuid
	if (fromItem && catIdx.has(fromItem)) return catIdx.get(fromItem)
	return { title: "Uncategorized", sort_order: 999999 }
}

export function computeItemSummary(orders = [], itemsIdx, catIdx) {
    const catMap = new Map()
    for (const o of orders) {
        const lines = Array.isArray(o?.item_details) ? o.item_details : []
        const orderKey = o?.order_uuid || o?.invoice_number || Math.random().toString(36).slice(2)
        for (const ln of lines) {
            const s = +ln?.status
            if (Object.values(ITEM_STATUS).slice(1).includes(s)) continue

            const itemKey = String(lineItemId(ln) || getName(ln, itemsIdx)).trim()
            if (!itemKey) continue

            const name = getName(ln, itemsIdx)
            const mrp = getMRP(ln, itemsIdx)
            const conv = getConversion(ln, itemsIdx)
            const displayName = name

            const catMeta = getCategoryMeta(ln, itemsIdx, catIdx)
            const catTitle = catMeta.title

            if (!catMap.has(catTitle)) {
                catMap.set(catTitle, {
                    sort_order: catMeta.sort_order ?? 9999,
                    rows: new Map()
                })
            }
            const bucket = catMap.get(catTitle).rows

            const prev = bucket.get(itemKey) || {
                key: itemKey,
                name: displayName,
                mrp,
                totalB: 0,
                totalP: 0,
                conversion: conv ?? null,
                orders: new Set()
            }
            prev.totalB += isNaN(+ln.b) ? 0 : +ln.b
            prev.totalP += isNaN(+ln.p) ? 0 : +ln.p
            prev.orders.add(orderKey)
            if (!prev.conversion && conv) prev.conversion = conv
            if (!prev.name && displayName) prev.name = displayName
            if (!prev.mrp && mrp) prev.mrp = mrp

            bucket.set(itemKey, prev)
        }
    }

    const out = []
    for (const [category, { sort_order, rows }] of catMap.entries()) {
        const arr = Array.from(rows.values()).map((r) => {
            let totalB = nnum(r.totalB, 0)
            let totalP = nnum(r.totalP, 0)
            const conv = nnum(r.conversion, 0)

            // 🔁 convert extra pieces into boxes
            if (conv > 0) {
                const extraBoxes = Math.floor(totalP / conv)
                totalB += extraBoxes
                totalP = totalP % conv
            }

            return {
                ...r,
                totalB,
                totalP,
                orderCount: r.orders.size
            }
        })
        arr.sort((a, b) => a.name.localeCompare(b.name)) // items A→Z within category
        out.push({ category, sort_order, rows: arr })
    }
    out.sort((a, b) => {
        if (a.category === "Uncategorized") return 1
        if (b.category === "Uncategorized") return -1
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
        return a.category.localeCompare(b.category)
    })
    return out
}

export const loadFullOrdersFromSession = () => {
    try {
        const raw = sessionStorage.getItem(ORDER_ASSEMBLY_SS_KEY) || "[]"
        const arr = JSON.parse(raw)
        return Array.isArray(arr) ? arr : []
    } catch {
        return []
    }
}

export const writeFullOrdersToSession = (merged) => {
    try {
        sessionStorage.setItem(ORDER_ASSEMBLY_SS_KEY, JSON.stringify(merged))
    } catch {
        /* ignore */
    }
}

export const allDoneOrCancelled = (item_details) =>
    Array.isArray(item_details) &&
    item_details.length > 0 &&
    item_details.every((ln) => {
        const s = +ln?.status
        return s === 1 || s === 3
    })