import React from "react"
import { MdClose } from "react-icons/md"
import { RiErrorWarningFill } from "react-icons/ri"

const DeviceErrorModal = ({ deviceCallStatus, uniqueCountersArr, onClose }) => {
	if (deviceCallStatus?.retrying?.length !== 0 || !deviceCallStatus?.failed?.[0]) return null

	return (
		<div className='overlay'>
			<div
				className='modal'
				style={{
					padding: 15,
					paddingBottom: 0,
					width: "480px",
					maxWidth: "95vw",
					position: "relative"
				}}
			>
				<h5 style={{ fontSize: 16 }}>Device Call Errors</h5>
				<span style={{ fontSize: 13 }}>Total {deviceCallStatus.failed.length} devices failed</span>
				<div style={{ maxHeight: "60vh", overflow: "auto", paddingBottom: 15 }}>
					<ol style={{ fontSize: 14, marginTop: 8, marginLeft: 30 }}>
						{deviceCallStatus.failed.map((i) => (
							<li key={"error-detail:" + i.idx} className='faded-markers' style={{ marginBottom: "8px" }}>
								<b>
									#{i.idx + 1} {uniqueCountersArr[i.idx]?.title} [{i.passedMessage || `${i.qty?.b || 0}:${i.qty?.p || 0}`}]
								</b>
								<br />
								<p style={{ display: "flex", alignItems: "center", gap: "5px" }}>
									<RiErrorWarningFill color='red' style={{ fontSize: 18 }} />
									<span style={{ color: "rgb(85, 85, 85)" }}>{i.message}</span>
								</p>
							</li>
						))}
					</ol>
				</div>
				<button
					style={{ position: "absolute", right: 10, top: 10, display: "flex", border: "none", background: "transparent" }}
					onClick={onClose}
				>
					<MdClose />
				</button>
			</div>
		</div>
	)
}

export default DeviceErrorModal
