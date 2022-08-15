import {
	ApolloServerPluginLandingPageDisabled,
	ApolloServerPluginLandingPageGraphQLPlayground,
} from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";
import connectRedis from "connect-redis";
import express from "express";
import session from "express-session";
import ioredis from "ioredis";
import path from "path";
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { createConnection } from "typeorm";
import { DELETE_ALL, __prod__ } from "./constants";
import { Follow } from "./Models/Follow";
import { Like } from "./Models/Like";
import { Post } from "./Models/Post";
import { User } from "./Models/User";
import { FollowResolver } from "./resolvers/follow";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import { Context } from "./types";
import { createLikeLoader } from "./util/createLikeLoader";
import { createUserLoader } from "./util/createUserLoader";

const main = async () => {
	const connection = await createConnection({
		type: "postgres",
		database: "serverSetup",
		password: "wsmb492?",
		username: "postgres",
		logging: true,
		synchronize: true,
		migrations: [path.join(__dirname, "./migrations/**")],
		entities: [Post, User, Like, Follow],
	});

	await connection.runMigrations();

	// if (DELETE_ALL) {
	// 	await Like.delete({});
	// 	await Post.delete({});
	// 	await User.delete({});
	// }

	const RedisStore = connectRedis(session);

	const redis = ioredis.createClient();

	redis.on("connect", () => console.log("Redis client connected"));
	redis.on("error", (error: Error) => console.log("Redis Client Error", error));

	const app = express();

	app.use(
		session({
			name: "qid",
			store: new RedisStore({
				client: redis,
				disableTouch: true,
			}),
			cookie: {
				maxAge: 1000 * 60 * 60 * 24 * 365 * 1, // 1 year
				httpOnly: true, // only allow cookie to be accessed via HTTP
				sameSite: "lax", // prevent cookie from being sent with cross-site requests
				secure: __prod__, // cookie only works in https
			},
			saveUninitialized: false,
			secret: "erslfgkljrgkjeihgjjejgkherjgyiewfikjrdeigjher",
			resave: false,
		})
	);

	app.set("trust proxy", !__prod__);

	const apolloServer = new ApolloServer({
		plugins: [
			// This disables the new Apollo Sandbox, because it makes problems trying to set cookies
			// disable prod to use Sandbox version
			// nvm dont disbale prod to do so idk doesnt work properly my bad lmao
			__prod__
				? ApolloServerPluginLandingPageDisabled
				: ApolloServerPluginLandingPageGraphQLPlayground,
		],
		schema: await buildSchema({
			resolvers: [HelloResolver, PostResolver, UserResolver, FollowResolver],
			validate: false,
		}),
		context: ({ req, res }: Context) => ({
			res,
			req,
			redis,
			userLoader: createUserLoader(),
			likeLoader: createLikeLoader(),
		}),
	});

	await apolloServer.start();

	apolloServer.applyMiddleware({
		app,
		cors: {
			origin: ["http://localhost:3000", "https://studio.apollographql.com"],
			credentials: true,
		},
	});

	app.listen(4000, () => {
		console.log("⚡ Server running on localhost:4000 ⚡");
	});
};

main().catch((err) => {
	console.error(err);
});
