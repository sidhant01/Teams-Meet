const connectionIndex = {};
const closed = new Event('closed');
const socket = io();
socket.emit('join', ROOM_ID);
const videoGrid = document.getElementById('video-grid');
let localStream;
let localTrack;

const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};

var peerConnection = [];
var offers = [];
var size = 0;
var cur = 0;

socket.on('joined', peersInRoom => {
  size = peersInRoom;
  makeCall();
});

socket.on('offer', async function(offer, id, index) {
    peerConnection.push(new RTCPeerConnection(configuration));
    var last = peerConnection.length-1;
    addTrackEventListener(last);
    addLocalTrack(last);
    size++;
    if (offer) {
        connectionIndex[id] = last;
        peerConnection[last].setRemoteDescription(new RTCSessionDescription(offer));
        peerConnection[last].onicecandidate = event => newIceCandidate(event, id, index);
        const answer = await peerConnection[last].createAnswer();
        await peerConnection[last].setLocalDescription(answer);
        socket.emit('answer', answer, ROOM_ID, id, index);
    }
});

socket.on('answer', async function(answer, id, index) {
  if (answer) {
    connectionIndex[id] = index;
    peerConnection[index].onicecandidate = event => newIceCandidate(event, id, size-1);
    await peerConnection[index].setLocalDescription(offers[index]);
    await peerConnection[index].setRemoteDescription(new RTCSessionDescription(answer));
  }
});

socket.on('new-ice-candidate', async function(candidate, index) {
    const iceCandidate = new RTCIceCandidate(candidate);
    peerConnection[index].addIceCandidate(iceCandidate);
});

socket.on('user-disconnected', id => {
  size--;
  let index = connectionIndex[id];
  peerConnection[index].close([index]);
  cur = index;
  peerConnection[index].dispatchEvent(closed);
  delete connectionIndex.id;
  for (socketId in connectionIndex) {
    if (connectionIndex[socketId] > index) {
      connectionIndex[socketId]--;
    }
  }
})

async function playLocalStream() {
  localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
  localTrack = document.createElement('video');
  localTrack.muted = true;
  localTrack.srcObject = localStream;
  localTrack.onloadedmetadata = function(e) {
    localTrack.play();
  }
  videoGrid.append(localTrack);
}

function addTrackEventListener(index) {
  const stream = new MediaStream();
  const video = document.createElement('video');
  peerConnection[index].ontrack = e => {
    stream.addTrack(e.track, stream);
    video.srcObject = stream;
    video.onloadedmetadata = evt => {
      video.play();
    }
  }
  videoGrid.append(video);
  peerConnection[index].addEventListener('closed', () => {
    video.remove();
    peerConnection.splice(cur, 1);
  })
}

function addLocalTrack(index) {
  localStream.getTracks().forEach(track => {
    peerConnection[index].addTrack(track, localStream);
  });
}

async function makeCall() {
  await playLocalStream();
  for (var i = 0; i < size; i++) {
    peerConnection.push(new RTCPeerConnection(configuration));
    addTrackEventListener(i);
    addLocalTrack(i);
    let offer = await peerConnection[i].createOffer();
    offers.push(offer);
  }
  socket.emit('offers', offers, ROOM_ID);
}

function newIceCandidate(event, id, index) {
  if (event.candidate) {
    socket.emit('new-ice-candidate', event.candidate, id, index);
  }
}

let msg = $('input');

$('html').keydown(e => {
  if (e.which == 13 && msg.val().length !== 0) {
    socket.emit('new-message', msg.val(), NAME, ROOM_ID);
    $('ul').append(`<li class="message"><b>You:</b><br/>${msg.val()}</li>`);
    scrollToBottom();
    msg.val('');
  }
})

socket.on('new-message', (message, user) => {
  $('ul').append(`<li class="message"><b>${user}</b><br/>${message}</li>`)
})

function scrollToBottom() {
  let chatWindow = $('.main-chat-window');
  chatWindow.scrollTop(chatWindow.prop('scrollHeight'));
}

function muteUnmute() {
  const isEnabled = localStream.getAudioTracks()[0].enabled;
  console.log(isEnabled);
  if (isEnabled) {
    localStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
  }
  else {
    localStream.getAudioTracks()[0].enabled = true;
    setMuteButton();
  }
}

function setMuteButton() {
  const html = `<i class="fas fa-microphone"></i>`
  document.querySelector('.main-mute-button').innerHTML = html;
}

function setUnmuteButton() {
  const html = `<i class="unmute fas fa-microphone-slash"></i>`;
  document.querySelector('.main-mute-button').innerHTML = html;
}

function stopPlay() {
  const isEnabled = localStream.getVideoTracks()[0].enabled;
  console.log(isEnabled);
  if (isEnabled) {
    localStream.getVideoTracks()[0].enabled = false;
    setPlayVideoButton();
  }
  else {
    localStream.getVideoTracks()[0].enabled = true;
    setStopVideoButton();
  }
}

function setStopVideoButton() {
  const html = `<i class="fas fa-video"></i>`;
  document.querySelector('.main-video-button').innerHTML = html;
}

function setPlayVideoButton() {
  const html = `<i class="play fas fa-video-slash"></i>`;
  document.querySelector('.main-video-button').innerHTML = html;
}
