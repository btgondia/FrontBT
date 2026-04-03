import React from "react"
import { MdClose } from "react-icons/md"
import { ITEM_STATUS } from "./constants"

const ItemSummaryView = ({ filtered, itemStatus, onToggleComplete, onHold, onCancel }) => {
	const getRowHighlight = (key) => {
		const st = itemStatus[key]
		if (st === ITEM_STATUS.COMPLETE) return "complete"
		if (st === ITEM_STATUS.HOLD) return "hold"
		if (st === ITEM_STATUS.CANCEL) return "cancel"
		return "none"
	}

	return (
		<section className='panel right-pane'>
			<div className='summary' style={{ maxHeight: "calc(100vh - 110px)", overflowY: "auto" }}>
				{filtered.map((group) => (
					<div key={group.category} className='mobile-category-block' style={{ marginBottom: 8 }}>
						<div
							className='mobile-category-header'
							style={{ background: "#e5f3dc", padding: "6px 8px", fontWeight: 600, fontSize: 13 }}
						>
							{group.category}
						</div>

						{group.rows.map((row, idx) => {
							const statusKey = getRowHighlight(row.key)
							let rowBg = "#ffffff"
							if (statusKey === "complete") rowBg = "#ecfdf3"
							else if (statusKey === "hold") rowBg = "#FFFBEB"
							else if (statusKey === "cancel") rowBg = "#FEE2E2"

							return (
								<div
									key={row.key}
									className='mobile-item-row'
									style={{
										display: "flex",
										alignItems: "center",
										padding: "6px 6px",
										borderBottom: "1px solid #f3f4f6",
										backgroundColor: rowBg,
										gap: 6
									}}
								>
									<button
										type='button'
										onClick={() => onCancel(row.key)}
										className='btn btn-xs action-danger'
										style={{
											width: 30,
											height: 30,
											borderRadius: 6,
											display: "flex",
											alignItems: "center",
											justifyContent: "center"
										}}
									>
										<MdClose style={{ flexShrink: 0 }} />
									</button>

									<div style={{ flex: 1, minWidth: 0 }}>
										<div style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 2 }}>
											<span style={{ fontSize: 12, color: "#6b7280" }}>{idx + 1}.</span>
											<span
												style={{
													fontSize: 13,
													fontWeight: 600,
													whiteSpace: "nowrap",
													overflow: "hidden",
													textOverflow: "ellipsis"
												}}
											>
												{row.name}
											</span>
										</div>
										<div
											style={{
												display: "flex",
												flexWrap: "wrap",
												gap: 6,
												fontSize: 12,
												color: "#6b7280"
											}}
										>
											<span>Orders: {row.orderCount}</span>
											<span>•</span>
											<span>MRP: ₹{row.mrp}</span>
											<span>•</span>
											<span style={{ fontWeight: "600", color: "black" }}>
												QTY: ({row.totalB} : {row.totalP})
											</span>
										</div>
									</div>

									<div style={{ display: "flex", flexDirection: "row", gap: 4 }}>
										<button
											type='button'
											onClick={() => onHold(row.key)}
											className='btn btn-xs action-warn'
											style={{ minWidth: 60, height: 26, fontSize: 11, borderRadius: 999 }}
										>
											HOLD
										</button>
										<button
											type='button'
											onClick={() => onToggleComplete(row.key)}
											className='btn btn-xs action-success'
											style={{
												minWidth: 60,
												height: 32,
												fontSize: 15,
												fontWeight: 700,
												borderRadius: 999,
												padding: "0 14px"
											}}
										>
											✓
										</button>
									</div>
								</div>
							)
						})}
					</div>
				))}
			</div>
		</section>
	)
}

export default ItemSummaryView
