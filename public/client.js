const socket = io.connect('http://localhost:3000');
socket.emit('join', ROOM_ID);
console.log('hello ' + ROOM_ID);

const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};

var pc = [];
var size = 0;

async function makeCall(sz) {
  socket.on('answer', async function(answer, id, index) {
    if (answer) {
      console.log('index: ' + index);
      pc[index].onicecandidate = event => newIceCandidate(event, id, sz-1);
      await pc[index].setLocalDescription(offers[index]);
      await pc[index].setRemoteDescription(new RTCSessionDescription(answer));
    }
    console.log(index + ' recieved answer');
  });
  var offers = [];
  console.log(offers + ' ' + offers.length);
  for (var i = 0; i < sz; i++) {
    console.log(i + ' ' + sz);
    pc.push(new RTCPeerConnection(configuration));
    pc[i].createDataChannel('channel');
    let offer = await pc[i].createOffer();
    offers.push(offer);
  }
  socket.emit('offer', offers, ROOM_ID);
  console.log(offers.length + ' offers sent');
}

socket.on('joined', sz => {
  size = sz;
  makeCall(size);
});

socket.on('offer', async function(offer, id, index) {
    pc.push(new RTCPeerConnection(configuration));
    pc[pc.length-1].createDataChannel('channel');
    size++;
    console.log('offer recieved');
    if (offer) {
        console.log('offer recieved ' + offer);
        pc[pc.length-1].setRemoteDescription(new RTCSessionDescription(offer));
        pc[pc.length-1].onicecandidate = event => newIceCandidate(event, id, index);
        const answer = await pc[pc.length-1].createAnswer();
        await pc[pc.length-1].setLocalDescription(answer);
        socket.emit('answer', answer, ROOM_ID, id, index);
        console.log('answer sent ' + answer);
    }
});

function newIceCandidate(event, id, index) {
  console.log('ice candidate generated');
  console.log('trying ' + id + ' ' + index);
  if (event.candidate) {
    console.log('fine');
    socket.emit('new-ice-candidate', event.candidate, id, index);
  }
}

// Listen for remote ICE candidates and add them to the local RTCPeerConnection
socket.on('new-ice-candidate', async function(candidate, index) {
// Listen for connectionstatechange on the local RTCPeerConnection
    pc[index].addEventListener('connectionstatechange', event => {
      if (pc[index].connectionState === 'connected') {
        // Peers connected
        console.log('connection successful');
      }
    })
    console.log('ice candidate recieved');
    const iceCandidate = new RTCIceCandidate(candidate);
    pc[index].addIceCandidate(iceCandidate);
});
