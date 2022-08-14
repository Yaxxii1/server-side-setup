import { ApolloServer } from "apollo-server-express";
import express from "express";
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { createConnection } from "typeorm";
import { Post } from "./Models/Post";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { Context } from "./types";

const main = async () => {
	const connection = await createConnection({
		type: "postgres",
		database: "serverSetup",
		password: "wsmb492?",
		username: "postgres",
		logging: true,
		synchronize: true,
		migrations: [],
		entities: [Post],
	});
	// await connection.runMigrations();

	const app = express();

	const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [HelloResolver, PostResolver],
			validate: false,
		}),
		context: ({ req, res }: Context) => ({ res, req }),
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
