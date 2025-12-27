import { useEffect, useRef, useState } from "react"
import { PiBarcodeBold } from "react-icons/pi"

export function useBarcodeScanner(onScan, enabled = true) {
	const buffer = useRef("")
	const lastTime = useRef(0)

	useEffect(() => {
		if (!enabled) return

		const handler = (e) => {
			// Ignore IME / composition input
			if (e.isComposing) return

			const now = Date.now()
			const delta = now - lastTime.current
			lastTime.current = now
			// If delay is too large → human typing → reset
			if (delta > 50) {
				buffer.current = ""
			}


			if (e.key === "Enter") {
				if (buffer.current.length > 3) {
					onScan(buffer.current)
				}
				buffer.current = ""
				lastTime.current = null
				return
			}

			// Accept only scanner-safe characters
			if (/^[a-zA-Z0-9\-_.]$/.test(e.key)) {
				buffer.current += e.key
			}
		}

		window.addEventListener("keydown", handler)
		return () => window.removeEventListener("keydown", handler)
	}, [onScan, enabled])
}

export default function BarcodeInput({ onScan }) {
	const [isScannerOn, setIsScannerOn] = useState(false)

	useBarcodeScanner(onScan, isScannerOn)

	return (
		<div style={{ display: "flex", gap: 8 }}>
			<button
				onClick={() => setIsScannerOn((i) => !i)}
				style={{
					display: "flex",
					borderRadius: 4,
					border: "1px solid gray",
					padding: "1px",
					...(isScannerOn
						? {
								background: "#10b981",
								color: "#fff"
						  }
						: {})
				}}
			>
				<PiBarcodeBold size={22} />
			</button>
		</div>
	)
}
