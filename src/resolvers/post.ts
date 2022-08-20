import { isAuth } from "../utils/isAuth";
import {
	Arg,
	Ctx,
	Field,
	FieldResolver,
	InputType,
	Int,
	Mutation,
	ObjectType,
	Query,
	Resolver,
	Root,
	UseMiddleware,
} from "type-graphql";
import { getConnection } from "typeorm";
import { Post } from "../Models/Post";
import { User } from "../Models/User";
import { Context } from "../types";
import { Like } from "../Models/Like";

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
	@FieldResolver(() => String)
	textSnippet(@Root() post: Post): string {
		return post.text.slice(0, 50);
	}

	@FieldResolver(() => User)
	creator(@Root() post: Post, @Ctx() { userLoader }: Context): Promise<User> {
		return userLoader.load(post.creatorId);
	}

	@FieldResolver(() => Int, { nullable: true })
	async voteStatus(
		@Root() post: Post,
		@Ctx() { likeLoader, req }: Context
	): Promise<number | null> {
		if (!req.session.userId) {
			return null;
		}

		const like = await likeLoader.load({
			postId: post.id,
			userId: req.session.userId,
		});

		return like ? like.value : 0;
	}

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
	@UseMiddleware(isAuth)
	async createPost(
		@Arg("input") input: PostInput,
		@Ctx() { req }: Context
	): Promise<Post> {
		const post = Post.create({
			...input,
			creatorId: req.session.userId,
		}).save();

		return post;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(isAuth)
	async deletePost(
		@Arg("id", () => Int) id: number,
		@Ctx() { req }: Context
	): Promise<Boolean> {
		await Post.delete({ id, creatorId: req.session.userId });
		return true;
	}

	@Mutation(() => Post, { nullable: true })
	@UseMiddleware(isAuth)
	async updatePost(
		@Arg("id", () => Int) id: number,
		@Arg("title", () => String) title: string,
		@Arg("text", () => String) text: string,
		@Ctx() { req }: Context
	): Promise<Post | null> {
		const result = await getConnection()
			.createQueryBuilder()
			.update(Post)
			.set({ title, text })
			.where('id = :id and "creatorId" = :creatorId', {
				id,
				creatorId: req.session.userId,
			})
			.returning("*")
			.execute();

		console.log("result:", result);
		return result.raw[0];
	}

	@Mutation(() => Boolean)
	@UseMiddleware(isAuth)
	async like(
		@Arg("postId", () => Int) postId: number,
		@Arg("value", () => Int) value: number,
		@Ctx() { req }: Context
	): Promise<Boolean> {
		const isLike = value !== -1;
		const realValue = isLike ? 1 : -1;
		const { userId } = req.session;
		const like = await Like.findOne({
			where: {
				postId,
				userId,
			},
		});

		// if the user has liked this post already, but he changed his mind and wants to unlike it
		if (like && like.value !== realValue) {
			await getConnection().transaction(async (transactionManagerObject) => {
				await transactionManagerObject.query(`
					update "like"
					set value = ${realValue}
					where "postId" = ${postId} and "userId" = ${userId}
				`);
				await transactionManagerObject.query(`
					update post 
					set "points" = "points" + ${2 * realValue}
					where id = ${postId}
				`);
			});
			// if the user did not like this post already
		} else if (!like) {
			await getConnection().transaction(async (transactionManagerObject) => {
				await transactionManagerObject.query(`
					insert into "like" ("userId", "postId", value)
					values (${userId}, ${postId}, ${realValue})
				`);
				await transactionManagerObject.query(`
					update post 
					set "points" = "points" + ${realValue}
					where id = ${postId}
				`);
			});
		}

		return true;
	}
}
