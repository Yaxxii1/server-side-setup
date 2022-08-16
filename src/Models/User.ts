import { Field, ObjectType } from "type-graphql";
import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";
import { Follow } from "./Follow";
import { Like } from "./Like";
import { Message } from "./Message";
import { Post } from "./Post";

@ObjectType()
@Entity()
export class User extends BaseEntity {
	@Field()
	@PrimaryGeneratedColumn()
	id!: number;

	@Field()
	@Column({ unique: true })
	username!: string;

	@Field()
	@Column({ unique: true })
	email!: string;

	@Column()
	password!: string;

	@OneToMany(() => Post, (post) => post.creator)
	posts: Post[];

	@OneToMany(() => Like, (like) => like.user)
	likes: Like[];

	@OneToMany(() => Follow, (follow) => follow.follower)
	follows!: Follow[];

	@OneToMany(() => Follow, (follow) => follow.followsTo)
	followers!: Follow[];

	// a user can send messages to other users
	@OneToMany(() => Message, (message) => message.user)
	messages: Message[];

	@Field(() => Boolean)
	@Column({ default: false })
	isActive: boolean;

	@Field(() => String)
	@CreateDateColumn()
	createdAt: Date;

	@Field(() => String)
	@UpdateDateColumn()
	updatedAt: Date;
}
