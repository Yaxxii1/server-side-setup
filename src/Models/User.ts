import { Field, ObjectType } from "type-graphql";
import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	BaseEntity,
	OneToMany,
} from "typeorm";
import { Like } from "./Like";
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

	@Field(() => String)
	@CreateDateColumn()
	createdAt: Date;

	@Field(() => Boolean)
	@Column({ default: false })
	isActive: boolean;

	@Field(() => String)
	@UpdateDateColumn()
	updatedAt: Date;
}
