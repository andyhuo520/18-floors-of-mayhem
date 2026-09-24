FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY public ./public
COPY server.js ./
ENV PORT=3180
EXPOSE 3180
USER node
CMD ["node", "server.js"]
