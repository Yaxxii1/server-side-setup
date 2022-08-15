import DataLoader from "dataloader";
import { User } from "../Models/User";

export const createUserLoader = () =>
	new DataLoader<number, User>(async (keys) => {
		const users = await User.findByIds(keys as number[]);
		const userIdToUser: Record<number, User> = {};
		users.forEach((user) => {
			userIdToUser[user.id] = user;
		});

		const sortedUsers = keys.map((userId) => userIdToUser[userId]);

		return sortedUsers;
	});
