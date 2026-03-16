import React from "react"

const CrateListView = ({ uniqueCountersArr, perCounterCounts, ordersByCounter }) => {
	return (
		<section className='panel'>
			<div className='panel-body'>
				<div className='crate-list'>
					{uniqueCountersArr.map((c, idx) => {
						const bp = perCounterCounts.get(c.uuid) || { b: 0, p: 0 }
						const chips = ordersByCounter.get(c.uuid) || []
						return (
							<div key={c.uuid} className='crate-item'>
								<div className='crate-tube'>
									<div style={{ overflow: "auto" }}>
										<div className='crate-text'>
											{idx + 1}. {c.title}
										</div>
										<div className='crate-orders'>
											{chips.map((o) => (
												<span key={o.number} className='chip'>
													B-{o.number} • ₹{Math.round(o.total)}
												</span>
											))}
										</div>
									</div>
									<div className='crate-count'>
										{bp.b} : {bp.p}
									</div>
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</section>
	)
}

export default CrateListView
