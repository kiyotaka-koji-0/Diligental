FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

# Build for production
# RUN npm run build

# Start dev server for MVP/Dev
CMD ["npm", "run", "dev"]
