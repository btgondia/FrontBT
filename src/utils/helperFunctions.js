export const pluralize = (word, count) =>
	count === 1 ? word : word + (["s", "x"].includes(word.toLowerCase().at(-1)) ? "es" : "s")

export function getOrderStage(status = []) {
	let numbers = status.map((item) => +item.stage)
	let max = Math.max(...numbers)
	return max
}

const stagesData = [
	{ value: "all", label: "All" },
	{ value: 1, label: "Processing" },
	{ value: 2, label: "Checking" },
	{ value: 3, label: "Out for Delivery" },
	{ value: 3.5, label: "Delivered" }
]
export function getStageName(stage) {
	let name = stagesData.find((item) => item.value === stage)
	return name.label
}
export function formatAMPM(date) {
	var hours = date.getHours()
	var minutes = date.getMinutes()
	var ampm = hours >= 12 ? "pm" : "am"
	hours = hours % 12
	hours = hours ? hours : 12 // the hour '0' should be '12'
	minutes = minutes < 10 ? "0" + minutes : minutes
	var strTime = hours + ":" + minutes + " " + ampm
	return strTime
}
export function getLastWeekDates() {
	// Get the current date
	var currentDate = new Date()

	// Set the date to the first day of the current month

	// Subtract one day to get the last day of the previous month
	currentDate.setDate(currentDate.getDay() - 7)

	// Return the date
	return currentDate
}
export function getLastMonthDate() {
	// Get the current date
	var currentDate = new Date()

	// Set the date to the first day of the current month
	// currentDate.setDate(1);

	// Subtract one day to get the last day of the previous month
	currentDate.setMonth(currentDate.getMonth() - 1)

	// Return the date
	return currentDate
}
export function getFormateDate(time) {
	let curTime = "yy-mm-dd"
		.replace("mm", ("00" + (time?.getMonth() + 1)?.toString()).slice(-2))
		.replace("yy", ("0000" + time?.getFullYear()?.toString()).slice(-4))
		.replace("dd", ("00" + time?.getDate()?.toString()).slice(-2))

	return curTime
}
export function getMidnightTimestamp(now) {
	// Current date and time
	const midnight = new Date(now).toUTCString() // Copy current date
	return new Date(midnight).getTime() // Return Unix timestamp in milliseconds
	// Return Unix timestamp in milliseconds
}
export function truncateDecimals(number, digits) {
	const stringNumber = number.toString()
	const decimalIndex = stringNumber.indexOf(".")

	if (decimalIndex === -1) {
		// If there's no decimal point, return the original number
		return number
	}

	const truncatedString = stringNumber.slice(0, decimalIndex + 1 + digits)
	return parseFloat(truncatedString)
}
export function compareObjects(obj1, obj2) {
	if (!obj1 && obj2) {
		return true
	}
	const obj1Keys = Object.keys(obj1)
	const obj2Keys = Object.keys(obj2)

	if (obj1Keys.length !== obj2Keys.length) {
		return true // If number of keys is different, there are changes
	}

	// Check if the values of each key are equal
	for (let key of obj1Keys) {
		if (obj1[key] !== obj2[key]) {
			return true // If any value is different, there are changes
		}
	}

	return false // If reached here, no changes found
}

export function checkDecimalPlaces(value) {
	// Convert the value to a string
	let valueString = value.toString()

	// Find the decimal point
	let decimalIndex = valueString.indexOf(".")

	// Check if there is a decimal point
	if (decimalIndex !== -1) {
		// Get the number of decimal places
		let decimalPlaces = valueString.length - decimalIndex - 1

		// Return nothing if there are more than 4 decimal places
		if (decimalPlaces > 4) {
			return parseFloat(value || 0).toFixed(4)
		}
	}

	// Return the value if it has 4 or fewer decimal places
	return value
}
export const chcekIfDecimal = (value, digit = 2) => {
	if (value.toString().includes(".")) {
		return parseFloat(value || 0).toFixed(digit)
	} else {
		return value
	}
}
export const getDDMMYYDate = (date, sign = "-") => {
	const today = new Date(date)
	const dd = String(today.getDate()).padStart(2, "0")
	const mm = String(today.getMonth() + 1).padStart(2, "0") // January is 0!
	const yy = today.getFullYear()

	return `${dd}${sign}${mm}${sign}${yy}`
}

export function debounce(func, delay) {
	let timeoutId

	return function (...args) {
		const context = this

		clearTimeout(timeoutId)

		timeoutId = setTimeout(() => {
			func.apply(context, args)
		}, delay)
	}
}
