const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid')

app.set('view engine', 'ejs')
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.redirect(`${uuidV4()}`);
})

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room });
})

io.on('connection', socket => {
  console.log('User connected: ' + socket.id);

  socket.on('join', roomId => {
    let rooms = io.sockets.adapter.rooms;
    let room = rooms.get(roomId);
    if (room == undefined) {
      console.log('peer1 joined');
      socket.join(roomId);
      socket.emit('created');
    }
    else if (room.size == 1) {
      console.log('peer2 joined');
      socket.join(roomId);
      socket.broadcast.to(roomId).emit('joined');
      console.log(socket.id + ' joined');
    }
    else {
      console.log('room full');
      socket.emit('full');
    }
    console.log(rooms);
  })

  socket.on('new-ice-candidate', (candidate, roomId) => {
    socket.broadcast.to(roomId).emit('new-ice-candidate', candidate);
  });

  socket.on('offer', (offer, roomId) => {
    socket.broadcast.to(roomId).emit('offer', offer);
  });

  socket.on('answer', (answer, roomId) => {
    socket.broadcast.to(roomId).emit('answer', answer);
  });

  socket.on('message', (message, roomId) => {
    console.log('ahaa');
    socket.broadcast.to(roomId).emit('message', message);
  })
});

server.listen(3000);
