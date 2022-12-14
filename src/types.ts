import { Request, Response } from "express";
import { Session } from "express-session";
import { Redis } from "ioredis";
import { createLikeLoader } from "./util/createLikeLoader";
import { createUserLoader } from "./util/createUserLoader";

declare module "express-session" {
	export interface Session {
		userId: number;
	}
}

export type Context = {
	req: Request & { session?: Session & { userId?: number } };
	res: Response;
	redis: Redis;
	userLoader: ReturnType<typeof createUserLoader>;
	likeLoader: ReturnType<typeof createLikeLoader>;
};
