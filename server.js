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

const names = {};

io.on('connection', socket => {
  console.log('User connected: ' + socket.id);
  socket.on('join', roomId, name => {
    if (size < 10) {
      socket.join(roomId);
      socket.emit('user-connected', size);
      names[socket.id] = name;
      size++;
    }
    else {
      socket.emit('full');
    }
    socket.on('disconnect', () => {
      socket.broadcast.to(roomId).emit('user-disconnected', socket.id);
      delete names.(socket.id);
      size--;
    })
  })

  socket.on('new-ice-candidate', (candidate, id, index) => {
    socket.to(id).emit('new-ice-candidate', candidate, index);
  });

  socket.on('offers', async (offers, roomId) => {
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
  });

  socket.on('get-name', id => {
    socket.emit('peer-name', id, names[id]);
  });
});

server.listen(process.env.PORT||3000);
