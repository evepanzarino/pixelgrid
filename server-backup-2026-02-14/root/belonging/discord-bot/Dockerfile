FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Create uploads directory for Discord image downloads
RUN mkdir -p /app/uploads

EXPOSE 5005

CMD ["node", "bot.js"]
