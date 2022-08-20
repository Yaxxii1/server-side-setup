import { Context } from "../types";
import { MiddlewareFn } from "type-graphql";

export const isAuth: MiddlewareFn<Context> = ({ context }, next) => {
	if (!context.req.session.userId) {
		throw new Error("You need to be logged in to do this Action!");
	}

	return next();
};
