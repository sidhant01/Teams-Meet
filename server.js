const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const bodyParser = require('body-parser');
const { v4: uuidV4 } = require('uuid')

app.use(bodyParser.urlencoded({exteded: false}));

var size = 0;

app.set('view engine', 'ejs')
app.use(express.static('public'));

app.get('/', (req, res) => {
  size = 0;
  res.redirect(`${uuidV4()}`);
})

app.get('/:room', (req, res) => {
  res.render('index', { roomId: req.params.room });
})

app.post('/:room', (req, res) => {
  var name = req.body.name;
  res.render('room', { roomId: req.params.room, name: name });
})

io.on('connection', socket => {
  console.log('User connected: ' + socket.id);
  socket.on('join', roomId => {
    if (size < 6) {
      socket.join(roomId);
      socket.emit('user-connected', size);
      size++;
    }
    else {
      socket.emit('full');
    }

    socket.on('disconnect', () => {
      // broadcast event disconnect when a user disconnects
      socket.broadcast.to(roomId).emit('user-disconnected', socket.id);
      size--;
    })
  })

  // emit the ice candidate to the remote peer connection when generated
  socket.on('new-ice-candidate', (candidate, id, index) => {
    socket.to(id).emit('new-ice-candidate', candidate, index);
  });

  // send the offers to the peers in the room
  socket.on('offers', async (offers, roomId, name) => {
    console.log('offer from ' + name);
    let i = 0;
    const peers = await io.in(roomId).fetchSockets();
    for (const peer of peers) {
      // send an offer to all the peers except the sender
      if (peer.id != socket.id) {
        socket.to(peer.id).emit('offer', offers[i], socket.id, i, name);
        ++i;
      }
    }
  });

  // send answer to the peer who sent the offer
  socket.on('answer', (answer, roomId, id, index, name) => {
    console.log('answer from ' + name);
    socket.to(id).emit('answer', answer, socket.id, index, name);
  });

  // broadcast the message in the room
  socket.on('new-message', (msg, name, roomId) => {
    socket.broadcast.to(roomId).emit('new-message', msg, name);
  });
});

server.listen(process.env.PORT||3000);
