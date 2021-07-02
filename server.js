const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid')

var size = 0;

app.set('view engine', 'ejs')
app.use(express.static('public'));

app.get('/', (req, res) => {
  size = 0;
  res.redirect(`${uuidV4()}`);
})

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room });
})

io.on('connection', socket => {
  console.log('User connected: ' + socket.id);

  socket.on('join', roomId => {
    if (size < 10) {
      socket.join(roomId);
      size++;
      socket.emit('joined', size-1);
    }
    else {
      socket.emit('full');
    }
  })

  socket.on('new-ice-candidate', (candidate, id, index) => {
    socket.to(id).emit('new-ice-candidate', candidate, index);
  });

  socket.on('offer', async (offers, roomId) => {
    let i = 0;
    const peers = await io.in(roomId).fetchSockets();
    for (const peer of peers) {
      if (peer.id != socket.id) {
        socket.to(peer.id).emit('offer', offers[i], socket.id, i);
        ++i;
      }
    }
  });

  socket.on('answer', (answer, roomId, id, index) => {
    socket.to(id).emit('answer', answer, socket.id, index);
  });

  socket.on('new-message', (msg, name, roomId) => {
    socket.broadcast.to(roomId).emit('new-message', msg, name);
  })
});

server.listen(process.env.PORT||3000);
