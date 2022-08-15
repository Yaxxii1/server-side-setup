FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package.json ./
COPY yarn.lock ./
# I HAVE NO IDEA HOW TO DO ANY OF THIS LMAO SORRY MY BAD BUT MAYBE SOMEONE ELSE CAN HELP ME
RUN yarn

COPY . .
COPY .env.production .env

RUN yarn build

ENV NODE_ENV production

EXPOSE 8080
CMD [ "node", "dist/index.js" ]
USER node