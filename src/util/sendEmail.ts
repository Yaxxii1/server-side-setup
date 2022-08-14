import nodemailer from "nodemailer";

export async function sendEmail(to: string, body: string) {
	// let testAccount = await nodemailer.createTestAccount();
	// console.log("Test account", testAccount);

	let transporter = nodemailer.createTransport({
		host: "smtp.ethereal.email",
		port: 587,
		secure: false,
		auth: {
			user: "urdeod2wlj2i4bbh@ethereal.email",
			pass: "Rr6pNZUgYxWScq64rC",
		},
	});
	let info = await transporter.sendMail({
		from: '"Fred Foo 👻" <foo@example.com>',
		to: to,
		subject: "Change Password ",
		html: body, // plain text body
	});

	console.log("Message sent: %s", info.messageId);
	console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}
