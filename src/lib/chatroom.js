'use strict';

const EventEmitter = require('events');
const net = require('net');
const logger = require('./logger');
const User = require('./../model/user');

const PORT = process.env.PORT || 3000;

const server = net.createServer();
const event = new EventEmitter();
const socketPool = {};

const parseData = (buffer) => {
  let text = buffer.toString().trim();
  if (!text.startsWith('@')) return null;
  text = text.split(' ');
  const command = text[0];

  const message = text.slice(1).join(' ');

  logger.log(logger.INFO, `THIS IS THE MESSAGE: ${command}`);
  logger.log(logger.INFO, `THIS IS THE MESSAGE: ${message}`);

  return {
    command,
    message,
  };
};

const startAction = (user, buffer) => {
  const entry = parseData(buffer);
  if (entry) event.emit(entry.command, entry, user);
};

event.on('@nickname', (data, user) => {
  logger.log(logger.INFO, data);
  socketPool[user._id].nickname = data.message;
  user.socket.write(`You have changed your user name to ${data.message}\n`);
});

event.on('@users', (data, user) => {
  logger.log(logger.INFO, data);
  Object.keys(socketPool).forEach((userIdKey) => {
    user.socket.write(`${socketPool[userIdKey].nickname}\n`);
  });
});

event.on('@dm', (data, user) => {
  const nickname = data.message.split(' ').shift().trim();
  const message = data.message.split(' ').splice(1).join(' ').trim();
  console.log('message: ', message);  
  Object.keys(socketPool).forEach((userIdKey) => {
    if (socketPool[userIdKey].nickname === nickname) {
      const targetedUser = socketPool[userIdKey];
      targetedUser.socket.write(`${user.nickname}: ${message}\n`);
      user.socket.write(`>>${user.nickname}<<: ${message}\n`);      
    }
  });
});

server.on('connection', (socket) => {
  const user = new User(socket);
  socket.write(`Welcome to the chatroom, ${user.nickname}!\n`);

  socketPool[user._id] = user;
  logger.log(logger.INFO, `A new user ${user.nickname} has entered the chatroom`);

  socket.on('data', (buffer) => {
    startAction(user, buffer);
  });
});

server.listen(PORT, () => {
  logger.log(logger.INFO, `Server up on PORT: ${PORT}`);
});
