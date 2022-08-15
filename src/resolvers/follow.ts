import { Follow } from "../Models/Follow";
import {
	Arg,
	Ctx,
	Field,
	Int,
	Mutation,
	ObjectType,
	Query,
	Resolver,
	UseMiddleware,
} from "type-graphql";
import { User } from "../Models/User";
import { isAuth } from "../util/isAuth";
import { Context } from "../types";

@ObjectType()
class FollowFollowsTo {
	@Field(() => User)
	followsTo!: User;

	@Field()
	followedAt!: Date;
}

@ObjectType()
class FollowFollowers {
	@Field(() => User)
	follower!: User;

	@Field()
	followedAt!: Date;
}

@Resolver(Follow)
export class FollowResolver {
	@Query(() => [FollowFollowsTo])
	async followsTo(@Arg("id", () => Int) id: number): Promise<Follow[]> {
		const followsTo = await Follow.createQueryBuilder("follow")
			.leftJoinAndSelect("follow.followsTo", "user")
			.where("follow.follower = :id", { id })
			.getMany();

		return followsTo;
	}

	@Query(() => [FollowFollowers])
	async followers(@Arg("id", () => Int) id: number): Promise<Follow[]> {
		const followers = await Follow.createQueryBuilder("follow")
			.leftJoinAndSelect("follow.follower", "user")
			.where("follow.followsTo = :id", { id: id })
			.getMany();
		return followers;
	}

	@Mutation(() => Follow, { nullable: true })
	@UseMiddleware(isAuth)
	async follow(
		@Arg("id", () => Int) id: number,
		@Ctx() { req }: Context
	): Promise<Follow | undefined> {
		const followedUser = await User.findOne(id);

		const followsTo = await Follow.createQueryBuilder("follow")
			.leftJoinAndSelect("follow.followsTo", "user")
			.where("follow.follower = :id", { id: req.session.userId })
			.getMany();

		if (
			followedUser &&
			followedUser.id !== req.session.userId &&
			!followsTo.some((follow) => follow.followsTo.id === id)
		) {
			const follow = Follow.create({
				follower: req.session.userId as any,
				followsTo: followedUser,
			});
			return await Follow.save(follow);
		}
		return undefined;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(isAuth)
	async unFollow(
		@Arg("id", () => Int) id: number,
		@Ctx() { req }: Context
	): Promise<boolean> {
		const currentUser = await User.findOne(req.session.userId);
		try {
			const result = await Follow.createQueryBuilder()
				.delete()
				.from(Follow)
				.where("follower = :id", { id: currentUser?.id })
				.andWhere("followsTo = :id2", { id2: id })
				.execute();
			if (!result.affected) {
				return false;
			}
			return true;
		} catch (error) {
			return false;
		}
	}
}
