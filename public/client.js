const socket = io.connect('http://localhost:3000');
socket.emit('join', ROOM_ID);
console.log('hello ' + ROOM_ID);

const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};
const peerConnection = new RTCPeerConnection(configuration);

const dataChannel = peerConnection.createDataChannel('channel');

async function makeCall() {
    socket.on('answer', async answer => {
        if (answer) {
            const remoteDesc = new RTCSessionDescription(answer);
            await peerConnection.setRemoteDescription(remoteDesc);
        }
        console.log('answer recieved ' + answer);
    });
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer, ROOM_ID);
    console.log('offer sent ' + offer);
}

socket.on('joined', function() {
  console.log(socket.id + ', your friend joined');
  makeCall();
});

socket.on('offer', async offer => {
    console.log('offer recieved');
    if (offer) {
        console.log('offer recieved ' + offer);
        peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer, ROOM_ID);
        console.log('answer sent ' + answer);
    }
});

peerConnection.onicecandidate = event => {
  console.log('ice candidate generated');
  if (event.candidate) {
    socket.emit('new-ice-candidate', event.candidate, ROOM_ID);
  }
}

// Listen for remote ICE candidates and add them to the local RTCPeerConnection
socket.on('new-ice-candidate', async candidate => {
    const iceCandidate = new RTCIceCandidate(candidate);
    peerConnection.addIceCandidate(iceCandidate);
});

// Listen for connectionstatechange on the local RTCPeerConnection
peerConnection.addEventListener('connectionstatechange', event => {
    if (peerConnection.connectionState === 'connected') {
      // Peers connected
      console.log('connection successful!');
    }
});

socket.on('message', message => {
  console.log(message);
});
