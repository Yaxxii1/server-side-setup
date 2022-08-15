export const __prod__ = process.env.NODE_ENV === "production"; // check if we are in production mode
export const FORGET_PASSWORD_PREFIX: string = "forget-password:";
export const TIME_UNTIL_EXPIRATION: number = 1000 * 60 * 60 * 24; // 1 day
export const COOKIE_NAME: string = "qid";
export const DELETE_ALL: boolean = false;
