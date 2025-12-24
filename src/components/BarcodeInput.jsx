import { useEffect, useRef, useState } from "react"
import { PiBarcodeBold } from "react-icons/pi"

export default function BarcodeInput({ onScan }) {
	const inputRef = useRef(null)
	const [value, setValue] = useState("")
	const [isFocused, setIsFocused] = useState(false)
	const focusInput = () => inputRef.current?.focus()

	useEffect(() => {
		focusInput()
	}, [])

	const handleKeyDown = (e) => {
		if (e.key === "Enter") {
			if (value.trim()) {
				onScan(value.trim())
				setValue("")
			}
		}
	}

	return (
		<>
			<input
				ref={inputRef}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={handleKeyDown}
				onFocus={() => setIsFocused(true)}
				onBlur={() => setIsFocused(false)}
				autoFocus
				placeholder='Scan barcode'
				style={{ opacity: 0, position: "absolute", pointerEvents:'none' }}
			/>
			<button
				onClick={focusInput}
				style={{
					display: "flex",
                    borderRadius:4,
                    border:'1px solid gray',
                    padding:'1px',
					...(isFocused
						? {
								background: "#10b981",
								color: "#fff",
						  }
						: {})
				}}
			>
				<PiBarcodeBold size={22} />
			</button>
		</>
	)
}
