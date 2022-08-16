import { Field, ObjectType } from "type-graphql";
import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";

@ObjectType()
@Entity()
export class Message extends BaseEntity {
	@Field()
	@PrimaryGeneratedColumn()
	id!: number;

	@Field()
	@Column()
	message!: string;

	@Field()
	@Column()
	userId!: number;

	// A messages get sent to a user from another user
	@Field(() => User)
	@ManyToOne(() => User, (user) => user.messages)
	user!: User;

	@Field(() => User)
	@ManyToOne(() => User, (user) => user.messages)
	fromUser!: User;

	@Field()
	@CreateDateColumn({ type: "timestamp" })
	createdAt: Date;
}
