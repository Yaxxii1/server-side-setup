import { ApolloServer } from "apollo-server-express";
import express from "express";
import "reflect-metadata";
import {
	ApolloServerPluginLandingPageDisabled,
	ApolloServerPluginLandingPageGraphQLPlayground,
} from "apollo-server-core";
import { buildSchema } from "type-graphql";
import { createConnection } from "typeorm";
import { Post } from "./Models/Post";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { Context } from "./types";
import { __prod__ } from "./constants";
import { User } from "./Models/User";
import { UserResolver } from "./resolvers/user";
import connectRedis from "connect-redis";
import session from "express-session";
import ioredis from "ioredis";

const main = async () => {
	const connection = await createConnection({
		type: "postgres",
		database: "serverSetup",
		password: "wsmb492?",
		username: "postgres",
		logging: true,
		synchronize: true,
		migrations: [],
		entities: [Post, User],
	});
	// await connection.runMigrations();

	const RedisStore = connectRedis(session);

	const redis = ioredis.createClient();

	redis.on("connect", () => console.log("Redis client connected"));
	redis.on("error", (error: Error) => console.log("Redis Client Error"));

	const app = express();

	app.use(
		session({
			name: "qid",
			store: new RedisStore({
				client: redis,
				disableTouch: true,
			}),
			cookie: {
				maxAge: 1000 * 60 * 24 * 365 * 1, // 1 year
				httpOnly: true,
				sameSite: "lax",
				secure: __prod__,
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
			__prod__
				? ApolloServerPluginLandingPageDisabled
				: ApolloServerPluginLandingPageGraphQLPlayground,
		],
		schema: await buildSchema({
			resolvers: [HelloResolver, PostResolver, UserResolver],
			validate: false,
		}),
		context: ({ req, res }: Context) => ({ res, req, redis }),
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
