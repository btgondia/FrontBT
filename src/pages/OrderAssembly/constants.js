import { pluralize } from "../../utils/helperFunctions"

export const ACTION_TRIGGER_SOURCE = {
	BARCODE: "barcode",
	BUTTON: "button"
}

export const ORDER_ASSEMBLY_SS_KEY = "orderAssemblySelectedOrders"

export const ASSEMBLY_DEVICE_COUNT = 20

export const DEVICE_MESSAGE = {
	DONE: "DONE",
	CANCEL: "XXXX",
	UNTICK: "UT",
	NOT_FOUND: "NF",
	formatMessage: function ({ b = 0, p = 0 } = {}) {
		const B = Number.isFinite(+b) ? +b : 0
		const P = Number.isFinite(+p) ? +p : 0
		return B === 0 ? String(P) : `${B}x${P}`
	}
}

export const VOICE_MESSAGE = {
	UNTICK: "Untick",
	ZERO: "Zero",
	NOT_FOUND: "Error",
	formatMessage: function (b, p) {
		const B = Number.isFinite(+b) ? +b : 0
		const P = Number.isFinite(+p) ? +p : 0
		return [
			[B, pluralize("Box", B)],
			[P, pluralize("Piece", P)]
		]
			.filter(([v]) => v > 0)
			.map((i) => i.join(" "))
			.join(", ")
	}
}

export const ITEM_STATUS = {
	IN_PROCESSING: 0,
	COMPLETE: 1,
	HOLD: 2,
	CANCEL: 3
}

export const ITEM_STATUS_LABELS = {
	[ITEM_STATUS.IN_PROCESSING]: "In Processing",
	[ITEM_STATUS.COMPLETE]: "Complete",
	[ITEM_STATUS.HOLD]: "On Hold",
	[ITEM_STATUS.CANCEL]: "Cancelled"
}

export const ITEM_STATUS_COLORS = {
	[ITEM_STATUS.IN_PROCESSING]: { bg: "#fffff" },
	[ITEM_STATUS.COMPLETE]: { bg: "#ecfdf3" },
	[ITEM_STATUS.HOLD]: { bg: "#FFFBEB" },
	[ITEM_STATUS.CANCEL]: { bg: "#FEE2E2" }
}

export const ASSEMBLY_MODES = {
	NORMAL: "normal",
	DEVICE: "device"
}

export const MOBILE_ASSEMBLY_TABS = {
	CRATES: 0,
	ITEMS: 1
}

export const MOBILE_ASSEMBLY_TAB_LABELS = {
	[MOBILE_ASSEMBLY_TABS.CRATES]: "Crates",
	[MOBILE_ASSEMBLY_TABS.ITEMS]: "Items"
}
