import React from "react"
import { useNavigate } from "react-router-dom"
import "./style.css"
import Loader from "../../components/Loader"
import { ASSEMBLY_MODES, ITEM_STATUS, MOBILE_ASSEMBLY_TABS } from "./order-assembly/constants"
import { useOrderAssemblyLogic } from "./order-assembly/useOrderAssemblyLogic"
import { useDeviceIntegration } from "./order-assembly/useDeviceIntegration"
import AssemblyHeader from "./order-assembly/AssemblyHeader"
import CrateListView from "./order-assembly/CrateListView"
import ItemSummaryView from "./order-assembly/ItemSummaryView"
import DeviceErrorModal from "./order-assembly/DeviceErrorModal"

let controller
const OrderAssembly = () => {
	const navigate = useNavigate()

	const {
		orders,
		search,
		setSearch,
		mode,
		setMode,
		buffer,
		itemStatus,
		isSoundOn,
		setIsSoundOn,
		mobileTab,
		setMobileTab,
		loading,
		filtered,
		ordersByCounter,
		uniqueCountersArr,
		perCounterCounts,
		selectedKey,
		save,
		applyStatusForKey,
		itemsMaster
	} = useOrderAssemblyLogic()

	const { deviceBases, deviceCallStatus, apiLoading, setDeviceCallStatus, send } = useDeviceIntegration(
		uniqueCountersArr,
		ordersByCounter,
		perCounterCounts
	)

	const handleAction = (key, status) => {
		const { shouldCallDevices, deviceMessage } = applyStatusForKey(key, status)
		
		if (shouldCallDevices && mode === ASSEMBLY_MODES.DEVICE) {
			if (controller) controller.abort()
			controller = new AbortController()
			send(controller, orders, key, deviceMessage)
		}
	}

	const handleToggleComplete = (key) => handleAction(key, ITEM_STATUS.COMPLETE)
	const handleHold = (key) => handleAction(key, ITEM_STATUS.HOLD)
	const handleCancel = (key) => handleAction(key, ITEM_STATUS.CANCEL)

	const onBarcodeScan = (code) => {
		const item = itemsMaster?.find((i) => i.barcode?.includes?.(code))
		handleToggleComplete(item?.item_uuid || null)
	}

	const handleClose = () => {
		if (window.confirm("Changes will get discarded. Continue?")) {
			navigate(window.location.pathname.split("/").slice(0, -1).join("/"))
		}
	}

	return (
		<div className='right-side mobile-assembly relative'>
			<Loader visible={loading} />

			<DeviceErrorModal
				deviceCallStatus={deviceCallStatus}
				uniqueCountersArr={uniqueCountersArr}
				onClose={() => setDeviceCallStatus({})}
			/>

			<AssemblyHeader
				mode={mode}
				setMode={setMode}
				mobileTab={mobileTab}
				setMobileTab={setMobileTab}
				search={search}
				setSearch={setSearch}
				isSoundOn={isSoundOn}
				setIsSoundOn={setIsSoundOn}
				buffer={buffer}
				apiLoading={apiLoading}
				deviceCallStatus={deviceCallStatus}
				deviceBases={deviceBases}
				uniqueCountersArr={uniqueCountersArr}
				handleSave={save}
				handleClose={handleClose}
				handleBarcodeScan={onBarcodeScan}
			/>

			<div className='assembly-layout-mobile' style={{ height: "calc(100vh - 92px)", overflowY: "auto" }}>
				{mobileTab === MOBILE_ASSEMBLY_TABS.CRATES ?
					<CrateListView
						uniqueCountersArr={uniqueCountersArr}
						perCounterCounts={perCounterCounts}
						ordersByCounter={ordersByCounter}
						selectedKey={selectedKey}
					/>
				:	<ItemSummaryView
						filtered={filtered}
						itemStatus={itemStatus}
						onToggleComplete={handleToggleComplete}
						onHold={handleHold}
						onCancel={handleCancel}
					/>
				}
			</div>
		</div>
	)
}

export default OrderAssembly
