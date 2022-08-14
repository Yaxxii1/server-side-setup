import argon2 from "argon2";
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
} from "type-graphql";
import { getConnection } from "typeorm";
import { User } from "../Models/User";
import { Context } from "../types";
import { validateRegister } from "../util/validateRegister";

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
	async user(@Arg("id", () => Int) id: number): Promise<User | undefined> {
		return User.findOne({ id });
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
}
