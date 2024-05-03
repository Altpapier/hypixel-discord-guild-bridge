FROM node:18-alpine

RUN apk add --update --no-cache \
    make \
    g++ \
    jpeg-dev \
    cairo-dev \
    giflib-dev \
    pango-dev \
    libtool \
    autoconf \
    automake

WORKDIR /usr/src/app
COPY package*.json ./
RUN yarn install
COPY . .

CMD [ "yarn", "start" ]
