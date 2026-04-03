import React from "react"
import { IoVolumeHigh, IoVolumeMuteOutline } from "react-icons/io5"
import { ASSEMBLY_MODES, MOBILE_ASSEMBLY_TAB_LABELS } from "./constants"
import DeviceTesting from "./DeviceTesting"
import BarcodeInput from "./BarcodeInput"

const AssemblyHeader = ({
	mode,
	setMode,
	mobileTab,
	setMobileTab,
	search,
	setSearch,
	isSoundOn,
	setIsSoundOn,
	buffer,
	apiLoading,
	deviceCallStatus,
	deviceBases,
	uniqueCountersArr,
	handleSave,
	handleClose,
	handleBarcodeScan
}) => {
	const headerExtraWidth = mode === ASSEMBLY_MODES.DEVICE ? "320px" : "180px"

	return (
		<div className='mobile-assembly-header' style={{ borderBottom: "1px solid #e5e7eb", background: "#ffffff" }}>
			<div style={{ width: "100vw", maxWidth: "500px", overflow: "auto" }}>
				<div
					style={{
						display: "flex",
						padding: "10px 12px",
						gap: "20px",
						width: `calc(100vw + ${headerExtraWidth})`,
						maxWidth: `calc(500px + ${headerExtraWidth})`
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							width: "calc(100vw - 24px)",
							maxWidth: "calc(500px - 24px)"
						}}
					>
						<button
							type='button'
							onClick={handleClose}
							style={{
								color: "#DC2626",
								fontWeight: 600,
								fontSize: 14,
								border: "none",
								background: "transparent"
							}}
						>
							Close
						</button>

						<div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
							{mode === ASSEMBLY_MODES.DEVICE && (
								<>
									{(apiLoading || deviceCallStatus?.retrying?.length > 0) && (
										<span
											style={{
												fontSize: 12,
												color: "#B45309",
												background: "#FEF3C7",
												padding: "4px 8px",
												borderRadius: 6,
												display: "flex",
												gap: 6
											}}
										>
											<span>
												{apiLoading ?
													"Updating Devices"
												:	`Retrying ${deviceCallStatus?.retrying?.length}`}
											</span>
											<span className='loader x2-small' style={{ borderColor: "#B45309" }} />
										</span>
									)}
									{buffer?.size > 0 && (
										<span
											style={{
												fontSize: 14,
												color: "#B45309",
												background: "#FEF3C7",
												padding: "4px 8px",
												borderRadius: 6
											}}
										>
											{buffer?.size} pending
										</span>
									)}
									<button
										type='button'
										onClick={handleSave}
										style={{
											background: "#10B981",
											color: "white",
											padding: "6px 16px",
											borderRadius: 8,
											border: "none",
											fontWeight: 700,
											fontSize: 15
										}}
									>
										SAVE
									</button>
								</>
							)}
						</div>
					</div>
					{mode === ASSEMBLY_MODES.DEVICE && (
						<DeviceTesting deviceBases={deviceBases} counters={uniqueCountersArr} />
					)}
					<div
						style={{
							border: "1px solid #cccccc",
							borderRadius: "200px",
							background: "#dddddd",
							display: "flex",
							padding: "2px"
						}}
					>
						{Object.entries(ASSEMBLY_MODES).map(([key, val]) => (
							<button
								key={key}
								style={{
									borderRadius: "200px",
									padding: "6px 15px",
									border: "none",
									textTransform: "capitalize",
									...(mode === val ?
										{ background: "#10B981", color: "#fff" }
									:	{ background: "#dddddd" })
								}}
								onClick={() => setMode(val)}
							>
								{key.toLowerCase()}
							</button>
						))}
					</div>
				</div>
			</div>

			<div style={{ padding: "0 12px 10px", display: "flex", alignItems: "center", gap: 10 }}>
				<div style={{ display: "flex", background: "#e5e7eb", borderRadius: 999, padding: 2 }}>
					{Object.entries(MOBILE_ASSEMBLY_TAB_LABELS).map(([val, label]) => (
						<button
							key={val}
							type='button'
							onClick={() => setMobileTab(+val)}
							style={{
								padding: "6px 10px",
								fontSize: 12,
								fontWeight: 600,
								border: "none",
								background: mobileTab === +val ? "#111827" : "transparent",
								color: mobileTab === +val ? "#f9fafb" : "#4b5563",
								borderRadius: 999
							}}
						>
							{label}
						</button>
					))}
				</div>

				<input
					type='text'
					placeholder='Search...'
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					style={{
						flex: 1,
						height: 32,
						borderRadius: 8,
						border: "1px solid #d1d5db",
						padding: "0 10px",
						fontSize: 13,
						minWidth: 0
					}}
				/>

				<BarcodeInput onScan={handleBarcodeScan} />
				<button
					className={"assembly-icon-button " + (isSoundOn ? "enabled" : "")}
					onClick={() => setIsSoundOn((i) => !i)}
				>
					{isSoundOn ?
						<IoVolumeHigh size={22} />
					:	<IoVolumeMuteOutline size={22} />}
				</button>
			</div>
		</div>
	)
}

export default AssemblyHeader
