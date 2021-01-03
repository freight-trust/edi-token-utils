FROM node:12-alpine3.12

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY yarn* ./

RUN yarn

# Bundle app source
COPY . .

CMD [ "node", "index.js" ]