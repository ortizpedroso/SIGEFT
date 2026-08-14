FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY bun.lock* package-lock.json* ./
RUN npm install

COPY . .

ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "dev"]
