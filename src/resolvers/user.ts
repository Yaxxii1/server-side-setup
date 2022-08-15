import argon2 from "argon2";
import { FORGET_PASSWORD_PREFIX, TIME_UNTIL_EXPIRATION } from "../constants";
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
import { DeleteResult, getConnection } from "typeorm";
import { User } from "../Models/User";
import { Context } from "../types";
import { isAuth } from "../util/isAuth";
import { validateRegister } from "../util/validateRegister";
import { sendEmail } from "../util/sendEmail";
import { v4 } from "uuid";
import { Follow } from "../Models/Follow";

@InputType()
export class UserNamePasswordInput {
	@Field()
	email: string;
	@Field()
	username: string;
	@Field()
	password: string;
}

@ObjectType()
class FieldError {
	@Field()
	field: string;

	@Field()
	message: string;
}

@ObjectType()
class UserWithExtra extends User {
	@Field(() => Int)
	followsCount!: number;

	@Field(() => Int)
	followersCount!: number;

	@Field()
	following!: boolean;
}

@ObjectType()
class UserResponse {
	@Field(() => [FieldError], { nullable: true })
	errors?: FieldError[];

	@Field(() => User, { nullable: true })
	user?: User;
}

@Resolver(User)
export class UserResolver {
	@FieldResolver(() => UserResolver)
	email(@Root() user: User, @Ctx() { req }: Context) {
		if (req.session.userId === user.id) {
			return user.email;
		}
		return "";
	}

	@Query(() => User, { nullable: true })
	me(@Ctx() { req }: Context) {
		if (!req.session.userId) {
			return null;
		}
		const user = User.findOne({
			where: { id: req.session.userId },
		});
		return user;
	}

	@Query(() => [User])
	async users(): Promise<User[]> {
		const users = await User.find({});
		return users;
	}

	@Query(() => User, { nullable: true })
	async userById(@Arg("id", () => Int) id: number): Promise<User | undefined> {
		return User.findOne({ id });
	}

	@Query(() => UserWithExtra, { nullable: true })
	async user(
		@Arg("id", () => Int, { nullable: true }) id: number,
		@Ctx() { req }: Context
	): Promise<UserWithExtra | undefined> {
		const currentUser = await User.findOne(req.session.userId);

		let following = false;
		if (currentUser) {
			const follows = await Follow.createQueryBuilder("follow")
				.leftJoinAndSelect("follow.followsTo", "user")
				.where("follow.follower = :id", { id: currentUser.id })
				.getMany();

			following = follows.some((follow) => follow.followsTo.id === id);
		}

		const result = await User.createQueryBuilder("user")
			.loadRelationCountAndMap("user.followsCount", "user.follows")
			.loadRelationCountAndMap("user.followersCount", "user.followers")
			.where("user.id = :id", { id })
			.getOne();

		const userToReturn = {
			...result,
			following,
		} as UserWithExtra;

		return userToReturn;
	}

	@Mutation(() => UserResponse)
	async register(
		@Arg("options") options: UserNamePasswordInput,
		@Ctx() { req }: Context
	): Promise<UserResponse> {
		const errors = validateRegister(options);
		if (errors) {
			return { errors };
		}

		const hashedPassword = await argon2.hash(options.password);
		let user;
		try {
			const result = await getConnection()
				.createQueryBuilder()
				.insert()
				.into(User)
				.values({
					username: options.username,
					password: hashedPassword,
					email: options.email,
				})
				.returning("*")
				.execute();
			console.log("result:", result);
			user = result.raw[0];
		} catch (error) {
			if (error.code === "23505" || error.detail.includes("already exists")) {
				return {
					errors: [
						{
							field: "username",
							message: "Username already taken",
						},
					],
				};
			}
			console.log(error.message);
		}

		req.session.userId = user.id;
		console.log(user.id);

		return {
			user,
		};
	}

	@Mutation(() => UserResponse)
	async login(
		@Arg("usernameOrEmail") userNameOrEmail: string,
		@Arg("password") password: string,
		@Ctx() { req }: Context
	): Promise<UserResponse> {
		const user = await User.findOne(
			userNameOrEmail.includes("@")
				? { where: { email: userNameOrEmail } }
				: { where: { username: userNameOrEmail } }
		);
		if (!user) {
			return {
				errors: [
					{
						field: "usernameOrEmail",
						message:
							"This username does not exist, make sure you typed it right",
					},
				],
			};
		}
		const valid = await argon2.verify(user.password, password);
		if (!valid) {
			return {
				errors: [
					{
						field: "password",
						message: "This password is incorrect",
					},
				],
			};
		}

		req.session.userId = user.id;

		return {
			user,
		};
	}

	@Mutation(() => UserResponse)
	@UseMiddleware(isAuth)
	async updateUser(
		@Arg("id", () => Int) id: number,
		@Arg("username") username: string,
		@Arg("email") email: string,
		@Ctx() { req }: Context
	) {
		const user = await User.findOne(id);
		if (!user) {
			return {
				errors: [
					{
						field: "id",
						message: "User not found",
					},
				],
			};
		}
		if (user.id !== req.session.userId) {
			throw new Error("You can only update your own account");
		}
		if (username) {
			user.username = username;
		}
		if (email) {
			user.email = email;
		}
		await user.save();
		return { user };
	}

	@Mutation(() => Boolean)
	@UseMiddleware(isAuth)
	deleteUser(
		@Arg("id", () => Int) id: number,
		@Ctx() { req }: Context
	): Promise<DeleteResult> {
		if (id !== req.session.userId) {
			throw new Error("You can only delete your own account!");
		}
		const user = User.delete(id);
		return user;
	}

	@Mutation(() => Boolean)
	logout(@Ctx() { req, res }: Context) {
		return new Promise((resolve) => {
			req.session.destroy((err) => {
				res.clearCookie("qid");
				resolve(!err);
			});
		});
	}

	@Mutation(() => UserResponse)
	async changePassword(
		@Arg("token", () => String) token: string,
		@Arg("newPassword", () => String) newPassword: string,
		@Ctx() { redis, req }: Context
	): Promise<UserResponse> {
		const key = FORGET_PASSWORD_PREFIX + token;
		const userId = await redis.get(key);
		if (!userId) {
			return {
				errors: [
					{
						field: "token",
						message: "This token is invalid or expired",
					},
				],
			};
		}

		const userIdNum = parseInt(userId);
		const user = await User.findOne({ where: { id: userIdNum } });
		if (!user) {
			return {
				errors: [
					{
						field: "token",
						message: "User no longer exists",
					},
				],
			};
		}

		await User.update(
			{ id: userIdNum },
			{
				password: await argon2.hash(newPassword),
			}
		);

		req.session.userId = user.id;

		await redis.del(key);

		return {
			user,
		};
	}

	@Mutation(() => Boolean)
	async forgotPassword(@Arg("email") email: string, @Ctx() { redis }: Context) {
		const user = await User.findOne({ where: { email } });

		if (!user) {
			return null;
		}

		const token = v4();

		await redis.set(
			FORGET_PASSWORD_PREFIX + token,
			user.id,
			"EX",
			TIME_UNTIL_EXPIRATION
		);

		sendEmail(email, `<p> your token is: ${token}</p>`);

		return true;
	}
}
