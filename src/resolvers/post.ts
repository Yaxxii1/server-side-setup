import { Post } from "../Models/Post";
import {
	Arg,
	Ctx,
	Field,
	InputType,
	Int,
	Mutation,
	ObjectType,
	Query,
	Resolver,
} from "type-graphql";
import { Context } from "../types";
import { getConnection } from "typeorm";

@InputType()
class PostInput {
	@Field()
	title: string;

	@Field()
	text: string;
}

@ObjectType()
class PaginatedPosts {
	@Field(() => [Post])
	posts: Post[];

	@Field()
	hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
	@Query(() => PaginatedPosts)
	async posts(
		@Arg("limit", () => Int) limit: number,
		@Arg("cursor", () => String, { nullable: true }) cursor: string | null
	): Promise<PaginatedPosts> {
		const realLimit = Math.min(50, limit);
		const realLimitPlusOne = realLimit + 1;

		const replacements: any[] = [realLimitPlusOne];

		if (cursor) {
			replacements.push(new Date(parseInt(cursor)));
		}

		const posts = await getConnection().query(
			`
			select p.*
			from post p
			${cursor ? `where p."createdAt" < $2` : ""}
			order by p."createdAt" DESC
			limit $1
		`,
			replacements
		);

		// const qb = getConnection()
		// 	.getRepository(Post)
		// 	.createQueryBuilder("p")
		// 	.innerJoinAndSelect("p.creator", "u", 'u.id = p."creatorId"')
		// 	.orderBy('p."createdAt"', "DESC")
		// 	.take(realLimit);

		// if (cursor) {
		// 	qb.where('p."createdAt" < :cursor', {
		// 		cursor: new Date(parseInt(cursor)),
		// 	});
		// }

		// const posts = await qb.getMany();
		// console.log("posts", posts);
		// await sleep(3000);

		return {
			posts: posts.slice(0, realLimit),
			hasMore: posts.length === realLimitPlusOne,
		};
	}

	@Query(() => Post, { nullable: true })
	async post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
		// if id doesnt exist, throw error
		return await Post.findOne(id);
	}

	@Mutation(() => Post)
	async createPost(
		@Arg("input") input: PostInput,
		@Ctx() { req }: Context
	): Promise<Post> {
		const post = Post.create({
			...input,
		}).save();

		return post;
	}

	@Mutation(() => Boolean)
	async deletePost(
		@Arg("id", () => Int) id: number,
		@Ctx() { req }: Context
	): Promise<Boolean> {
		await Post.delete({ id });
		return true;
	}
}
