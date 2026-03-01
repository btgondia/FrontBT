import React from "react"

export default function PrivayPolicy() {
	const sectionStyle = {
		marginBottom: "20px"
	}

	const headingStyle = {
		borderBottom: "1px solid #ccc",
		paddingBottom: "5px",
		marginBottom: "10px"
	}

	return (
		<div
			style={{
				maxWidth: "800px",
				margin: "auto",
				padding: "20px",
				height: "100vh",
				overflow: "scroll"
			}}
		>
			<h1>Privacy Policy for Business Call Manager</h1>
			<p>Effective Date: 20 August 2024 </p>

			<div style={sectionStyle}>
				<h2 style={headingStyle}>About Us</h2>
				<p>
					Business Call Manager is developed and maintained by <strong>Bharat Traders</strong>, a company
					registered in <strong>Gondia, India</strong>.
				</p>
			</div>

			<div style={sectionStyle}>
				<h2 style={headingStyle}>Introduction</h2>
				<p>
					Welcome to Business Call Manager, an app designed to help you manage your business calls and
					contacts. At Bharat Traders, we are committed to protecting your privacy and ensuring that you have
					a secure and reliable experience when using our app.
				</p>
			</div>

			<div style={sectionStyle}>
				<h2 style={headingStyle}>Information We Collect</h2>
				<ol>
					<li>
						<h3 style={headingStyle}>Call Logs:</h3>
						<ul>
							<li>
								We collect call logs from your device to facilitate core functionalities such as adding
								notes and reminders.
							</li>
							<li>
								The call logs collected include the phone number, date, time, and duration of the call.
							</li>
							<li>
								Call logs are securely stored on our server in an encrypted form to protect your
								privacy.
							</li>
							<li>
								We do not write, update, or delete any call logs or messages on your device. We only
								read call logs to provide the app's functionality.
							</li>
						</ul>
					</li>
					<li>
						<h3 style={headingStyle}>Contacts:</h3>
						<ul>
							<li>
								We access your device’s contacts to improve the app’s functionality and ensure a
								seamless user experience.
							</li>
							<li>
								You can manually add contacts within the app that are not stored on your device. These
								contacts are stored locally within the app and are not shared with any third party.
							</li>
						</ul>
					</li>
					<li>
						<h3 style={headingStyle}>Device Information:</h3>
						<ul>
							<li>
								We may collect information about your device, including the device type, operating
								system, and version to ensure compatibility and improve app performance.
							</li>
						</ul>
					</li>
					<li>
						<h3 style={headingStyle}>Usage Data:</h3>
						<ul>
							<li>
								We collect information on how you interact with the app, including features used, time
								spent on the app, and any errors or issues encountered. This helps us to improve the
								app’s functionality and user experience.
							</li>
						</ul>
					</li>
				</ol>
			</div>

			<div style={sectionStyle}>
				<h2 style={headingStyle}>Why We Need to Access Call Logs</h2>
				<p>
					We need to access your call logs to provide the core functionality of our app, which is to help you
					manage your business calls and contacts. Without access to your call logs, we cannot provide you
					with the features and services that our app offers.
				</p>
			</div>

			<div style={sectionStyle}>
				<h2 style={headingStyle}>How We Use Your Information</h2>
				<ul>
					<li>
						Call Management: To provide and enhance the core functionalities of the app, such as managing
						call logs, adding notes, and setting reminders for specific calls.
					</li>
					<li>
						User Experience: To read and display your contacts for a user-friendly experience, allowing you
						to easily add notes and reminders to specific contacts.
					</li>
					<li>
						Data Analytics: To analyze usage patterns and improve the app’s performance and functionality.
						This helps us to understand user preferences and enhance the overall user experience.
					</li>
					<li>
						Security: To ensure the safety and security of your data through encryption and secure storage
						practices.
					</li>
				</ul>
			</div>

			<div style={sectionStyle}>
				<h2 style={headingStyle}>Data Storage and Security</h2>
				<ol>
					<li>
						<h3 style={headingStyle}>Encryption:</h3>
						<ul>
							<li>
								We use industry-standard encryption protocols to protect your data both in transit and
								at rest.
							</li>
							<li>
								All data transmitted between your device and our servers is encrypted using SSL/TLS.
							</li>
							<li>
								We store your data in encrypted form on our servers, which are protected by robust
								security measures.
							</li>
						</ul>
					</li>
					<li>
						<h3 style={headingStyle}>Secure Servers:</h3>
						<ul>
							<li>
								We store your data on secure servers that are protected by firewalls, intrusion
								detection systems, and other security measures.
							</li>
							<li>
								Our servers are located in secure data centers that are monitored 24/7 by security
								personnel.
							</li>
						</ul>
					</li>
					<li>
						<h3 style={headingStyle}>Access Controls:</h3>
						<ul>
							<li>
								We have implemented strict access controls to ensure that only authorized personnel can
								access your data.
							</li>
							<li>
								Our employees and contractors are subject to confidentiality agreements and are trained
								on our privacy and security policies.
							</li>
						</ul>
					</li>
					<li>
						<h3 style={headingStyle}>Data Backup and Recovery:</h3>
						<ul>
							<li>
								We regularly back up your data to ensure that it is safe in the event of a disaster or
								system failure.
							</li>
							<li>
								We have a disaster recovery plan in place to ensure that we can quickly recover your
								data in the event of an outage or disaster.
							</li>
						</ul>
					</li>
				</ol>
			</div>

			<div style={sectionStyle}>
				<h2 style={headingStyle}>Data Deletion Requests</h2>
				<p>
					We provide users with the ability to request deletion of their data through the app. If you would
					like to request deletion of your data, please follow these steps:
				</p>
				<ul>
					<li>Open the app and navigate to the Settings section.</li>
					<li>Tap on the "Delete Account" or "Delete Data" option.</li>
					<li>Follow the prompts to confirm that you would like to delete your data.</li>
				</ul>
				<p>
					We will process your request and delete your data within a reasonable timeframe, typically within 30
					days. Please note that we may retain certain information for a longer period of time if required by
					law or for legitimate business purposes.
				</p>
			</div>

			<div style={sectionStyle}>
				<h2 style={headingStyle}>Child Safety</h2>
				<p>
					We are committed to protecting the privacy and safety of children. Our app is not intended for use
					by children under the age of 13, and we do not knowingly collect personal information from children
					under 13.
				</p>
			</div>

			<div style={sectionStyle}>
				<h2 style={headingStyle}>Misuse Prevention</h2>
				<p>We take measures to prevent the misuse of our app, including:</p>
				<ul>
					<li>Implementing technical measures to prevent unauthorized access to our app and your data.</li>
					<li>Monitoring user activity to detect and prevent suspicious behavior.</li>
					<li>
						Providing clear guidelines and terms of use to ensure that users understand how to use our app
						responsibly.
					</li>
				</ul>
			</div>

			<div style={sectionStyle}>
				<h2 style={headingStyle}>Changes to This Policy</h2>
				<p>
					We may update this privacy policy from time to time. If we make significant changes, we will notify
					you by posting a notice on our website or through the app.
				</p>
			</div>

			<div style={sectionStyle}>
				<h2 style={headingStyle}>Contact Us</h2>
				<p>
					If you have any questions or concerns about this privacy policy, please contact us at{" "}
					<a href='mailto:priyalramani786@gmail.com'>priyalramani786@gmail.com</a>.
				</p>
			</div>

			<div style={sectionStyle}>
				<h2 style={headingStyle}>Company Details</h2>
				<p>
					Bharat Traders
					<br />
					Ganesh Nagar, Gondia 441601
					<br />
					India
				</p>
			</div>

			<div style={sectionStyle}>
				<h2 style={headingStyle}>Developer Details</h2>
				<p>
					Business Call Manager is developed and maintained by:
					<br />
					Priyal Ramani
					<br />
					Lead Developer, Bharat Traders
					<br />
					<a href='mailto:priyalramani786@gmail.com'>priyalramani786@gmail.com</a>
				</p>
			</div>
		</div>
	)
}
