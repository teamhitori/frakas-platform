FROM node:latest

COPY . /var/www
WORKDIR /var/www
EXPOSE 80

RUN mkdir -p /var/www/build
RUN npm install
RUN npm run build

# RUN apt-get update
# RUN apt install libsecret-1


ENTRYPOINT ["npm", "run", "debug"]
