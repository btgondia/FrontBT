import React, { useState } from 'react'
import { MdCheckCircle, MdClose } from 'react-icons/md'
import { RiErrorWarningFill } from 'react-icons/ri'
import Loader from '../../../components/Loader'

function randomStr(length) {
	let result = ""
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const charactersLength = characters.length
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength))
	}
	return result
}

const DeviceTesting = ({ deviceBases, counters }) => {
	const [isOpen, setIsOpen] = useState()
	const [message, setMessage] = useState("----")
	const [loading, setLoading] = useState(false)
	const [state, setState] = useState([])

	const sendAll = async (signal) => {
		setLoading(true)
		const reqs = []
		const mssg = randomStr(4)
		setMessage(mssg)

		for (let i = 0; i < deviceBases.length; i++) {
			const baseUrl = deviceBases[i]
			if (!baseUrl) continue

			const url = `${baseUrl}val=${mssg}`
			reqs.push(
				fetch(url, {
					method: "get",
					mode: "no-cors",
					signal: signal
				})
			)
		}

		const results = await Promise.allSettled(reqs)
		if (signal?.aborted) return
		setState(
			Array.from(results).map((r) => ({
				succeed: r.status === "fulfilled",
				error: r?.reason?.message || null
			}))
		)
		setLoading(false)
	}

	// useEffect(() => {
	//   if (!deviceBases?.[0] || !isOpen) return
	//   // const controller = new AbortController()
	//   // sendAll(controller.signal)
	//   return () => {
	//     controller.abort()
	//     setLoading(true)
	//     setMessage("")
	//     setState([])
	//   }
	// }, [deviceBases, isOpen])

	return (
		<div>
			<button
				style={{
					background: "#1E90FF",
					color: "white",
					padding: "6px 16px",
					borderRadius: 8,
					border: "none",
					fontSize: 16
				}}
				onClick={() => setIsOpen(true)}
			>
				<span>Test Devices</span>
			</button>
			{isOpen && (
				<div className='overlay'>
					<div
						className='modal'
						style={{ width: "480px", maxWidth: "95vw", position: "relative", padding: 0 }}
					>
						<div className='modal-head' style={{ background: "black" }}>
							<h1 style={{ fontSize: 16, color: "white" }}>Device Testing</h1>
						</div>
						<div className='modal-body'>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: "12px"
								}}
							>
								<div>
									<span
										style={{
											fontFamily: "monospace",
											letterSpacing: 8,
											paddingLeft: "5px",
											fontWeight: 600,
											fontSize: 24,
											marginRight: "10px"
										}}
									>
										{message}
									</span>
								</div>
								<button
									style={{
										padding: "6px 12px",
										marginRight: "8px",
										borderRadius: "10px",
										borderStyle: "solid",
										minWidth: "30%"
									}}
									onClick={() => sendAll()}
								>
									Test
								</button>
							</div>
							<div className='relative'>
								<Loader visible={loading} />
								<ol style={{ fontSize: 14, marginBlock: 20, marginLeft: 15 }}>
									{state?.map((i, idx) => (
										<li
											key={"mssg:" + idx}
											className='faded-markers'
											style={{ marginBlock: "16px" }}
										>
											<span style={{ fontWeight: 500 }}>{counters[idx]?.title}</span>
											{i?.succeed && (
												<MdCheckCircle
													color='#44cd4a'
													style={{
														fontSize: 16,
														marginLeft: "10px",
														verticalAlign: "text-bottom"
													}}
												/>
											)}
											{i?.error && (
												<p style={{ display: "flex", alignItems: "center", gap: "5px" }}>
													<RiErrorWarningFill color='red' style={{ fontSize: 18 }} />
													<span style={{ color: "rgb(85, 85, 85)" }}>{i?.error}</span>
												</p>
											)}
										</li>
									))}
								</ol>
							</div>
						</div>
						<button
							style={{ position: "absolute", right: 10, top: 10, display: "flex" }}
							onClick={() => setIsOpen()}
						>
							<MdClose />
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

export default DeviceTesting