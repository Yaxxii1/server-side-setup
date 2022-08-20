import { UserNamePasswordInput } from "../resolvers/user";

export const validateRegister = (options: UserNamePasswordInput) => {
	const symbols = [
		"!" ||
			"@" ||
			"#" ||
			"$" ||
			"%" ||
			"^" ||
			"&" ||
			"*" ||
			"(" ||
			")" ||
			"-" ||
			"+" ||
			"=" ||
			"|" ||
			"{" ||
			"}" ||
			"[" ||
			"]" ||
			";" ||
			":" ||
			'"' ||
			"'" ||
			"," ||
			"." ||
			"<" ||
			">" ||
			"/" ||
			`?` ||
			"`" ||
			"~" ||
			" ",
	];

	//#region Check if email is valid
	if (!options.email.includes("@")) {
		return [
			{
				field: "email",
				message: "Incorrect Email",
			},
		];
	}

	//#endregion Check if email is valid

	//#region Check if username is valid
	if (options.username.length < 3) {
		return [
			{
				field: "username",
				message: "Username must be at least 3 characters long",
			},
		];
	}

	if (options.username.includes(symbols.toString())) {
		return [
			{
				field: "username",
				message: `Username cannot contain ${symbols}`,
			},
		];
	}

	//#endregion Check if username is valid

	//#region Check if password is valid
	// if (options.password.length < 8) {
	// 	return [
	// 		{
	// 			field: "password",
	// 			message: "Password must be at least 8 characters long",
	// 		},
	// 	];
	// }

	// if (!options.password.includes(symbols.toString())) {
	// 	return [
	// 		{
	// 			field: "password",
	// 			message: "Password must contain at least one symbol",
	// 		},
	// 	];
	// }
	//#endregion Check if password is valid

	return null;
};
