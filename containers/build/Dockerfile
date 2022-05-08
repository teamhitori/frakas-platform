FROM node:latest AS base

COPY . /app
WORKDIR /app
EXPOSE 80

RUN apt-get update -y
RUN apt install libsecret-1-0 -y

RUN mkdir -p /app/build
RUN npm install
RUN npm run build

FROM base AS final
WORKDIR /app
COPY --from=base /app/build .

ENTRYPOINT ["npm", "run", "debug"]
