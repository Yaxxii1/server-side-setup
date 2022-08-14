import { Request, Response } from "express";
import { Session } from "express-session";

declare module "express-session" {
	export interface Session {
		userId: number;
	}
}

export type Context = {
	req: Request & { session?: Session & { userId?: number } };
	res: Response;
};
