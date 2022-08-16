import { Message } from "../Models/Message";
import { User } from "../Models/User";
import {
	Arg,
	Ctx,
	Int,
	Mutation,
	Query,
	Resolver,
	UseMiddleware,
} from "type-graphql";
import { Context } from "../types";
import { isAuth } from "../util/isAuth";

@Resolver(Message)
export class MessageResolver {
	@Mutation(() => Message)
	@UseMiddleware(isAuth)
	async sendMessage(
		@Arg("userId", () => Int) userId: number,
		@Arg("message", () => String) message: string,
		@Ctx() { req }: Context
	): Promise<Message> {
		const fromUser = await User.findOne(req.session.userId);

		const user = await User.findOne(userId);
		if (!user) {
			throw new Error("User not found");
		}
		const newMessage = await Message.create({
			message,
			userId,
			user,
			fromUser,
		}).save();
		return newMessage;
	}

	@Query(() => [Message])
	async getMessages(
		@Arg("userId", () => Int) userId: number,
		@Ctx() { req }: Context
	): Promise<Message[]> {
		const fromUser = await User.findOne(req.session.userId);
		const user = await User.findOne(userId);

		if (!user) {
			throw new Error("User not found");
		}

		if (!req.session.userId) {
			throw new Error("you did not get any messages, please login");
		}

		const messages = await Message.find({
			where: {
				userId,
				user,
				fromUser,
			},
		});
		return messages;
	}
}
