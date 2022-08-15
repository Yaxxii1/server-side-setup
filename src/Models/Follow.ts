import { Field, ObjectType } from "type-graphql";
import {
	BaseEntity,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";

@ObjectType()
@Entity()
export class Follow extends BaseEntity {
	@Field()
	@PrimaryGeneratedColumn()
	id!: number;

	@Field(() => User)
	@ManyToOne(() => User, (user) => user.follows)
	follower!: User;

	@Field(() => User)
	@ManyToOne(() => User, (user) => user.followers)
	followsTo!: User;

	@Field()
	@CreateDateColumn({ type: "timestamp" })
	followedAt!: Date;
}
