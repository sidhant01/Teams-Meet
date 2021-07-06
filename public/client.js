const connectionIndex = {};
const closed = new Event('closed');
const socket = io();
socket.emit('join', ROOM_ID);
const videoGrid = document.getElementById('video-grid');
let localStream;

const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};

var pc = [];
var offers = [];
var size = 0;
var cur = 0;

socket.on('joined', siz => {
  size = siz;
  makeCall(size);
});

socket.on('offer', async function(offer, id, index) {
    pc.push(new RTCPeerConnection(configuration));
    var last = pc.length-1;
    addTrackEventListener(last);
    addLocalTrack(last);
    // pc[last].createDataChannel('channel');
    size++;
    // console.log('offer recieved');
    if (offer) {
        // console.log('offer recieved ' + offer);
        connectionIndex[id] = last;
        pc[last].setRemoteDescription(new RTCSessionDescription(offer));
        pc[last].onicecandidate = event => newIceCandidate(event, id, index);
        const answer = await pc[last].createAnswer();
        await pc[last].setLocalDescription(answer);
        socket.emit('answer', answer, ROOM_ID, id, index);
        // console.log('answer sent ' + answer);
    }
});

socket.on('answer', async function(answer, id, index) {
  if (answer) {
    // console.log('index: ' + index);
    connectionIndex[id] = index;
    pc[index].onicecandidate = event => newIceCandidate(event, id, size-1);
    console.log('size = ' + size-1);
    await pc[index].setLocalDescription(offers[index]);
    await pc[index].setRemoteDescription(new RTCSessionDescription(answer));
  }
  // console.log(index + ' recieved answer');
});

socket.on('new-ice-candidate', async function(candidate, index) {
    // pc[index].addEventListener('connectionstatechange', event => {
    //   console.log('connection state change of ' + index);
    //   if (pc[index].connectionState === 'connected') {
    //     // console.log('connection successful');
    //   }
    // })
    // console.log('ice candidate recieved');
    const iceCandidate = new RTCIceCandidate(candidate);
    console.log('adding ice on ' + index);
    pc[index].addIceCandidate(iceCandidate);
});

socket.on('user-disconnected', id => {
  size--;
  let index = connectionIndex[id];
  console.log('disconnect index ' + index);
  console.log('pc length = ' + pc.length);
  for (var i = 0; i < pc.length; i++) {
    console.log('connection state = ' + pc[i].connectionState);
  }
  pc[index].close([index]);
  cur = index;
  console.log('closed ' + index);
  pc[index].dispatchEvent(closed);
  delete connectionIndex.id;
  for (socketId in connectionIndex) {
    if (connectionIndex[socketId] > index) {
      connectionIndex[socketId]--;
    }
  }
  // console.log('state is ' + pc[connectionIndex[id]].connectionState);
  // console.log(connectionIndex[id]);
  // console.log('connection closed');
})

async function playLocalStream() {
  localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
  const localTrack = document.createElement('video');
  localTrack.muted = true;
  localTrack.srcObject = localStream;
  localTrack.onloadedmetadata = function(e) {
    localTrack.play();
  }
  videoGrid.append(localTrack);
  // console.log('local stream playing');
}

function addTrackEventListener(index) {
  const stream = new MediaStream();
  const video = document.createElement('video');
  pc[index].ontrack = e => {
    stream.addTrack(e.track, stream);
    video.srcObject = stream;
    video.onloadedmetadata = evt => {
      video.play();
    }
    // console.log('track event ' + index);
    // this was/is working
    // videoGrid.append(video);
  }
  videoGrid.append(video);
  // should the videoGrid.append(video) be here?????
  // console.log('index is ' + index);
  pc[index].addEventListener('closed', () => {
    console.log('here1');
    video.remove();
    console.log('here2');
    pc.splice(cur, 1);
    console.log('here3');
  })
}

function addLocalTrack(index) {
  localStream.getTracks().forEach(track => {
    pc[index].addTrack(track, localStream);
    // console.log('tracks added when called');
  });
}

async function makeCall(siz) {
  await playLocalStream();
  // console.log(offers + ' ' + offers.length);
  for (var i = 0; i < siz; i++) {
    // console.log(i + ' ' + siz);
    pc.push(new RTCPeerConnection(configuration));
    addTrackEventListener(i);
    addLocalTrack(i);
    // pc[i].createDataChannel('channel');
    let offer = await pc[i].createOffer();
    offers.push(offer);
  }
  socket.emit('offer', offers, ROOM_ID);
  // console.log(offers.length + ' offers sent');
}

function newIceCandidate(event, id, index) {
  // console.log('ice candidate generated');
  // console.log('trying ' + id + ' ' + index);
  if (event.candidate) {
    // console.log('fine');
    socket.emit('new-ice-candidate', event.candidate, id, index);
  }
}

let msg = $('input');

$('html').keydown(e => {
  if (e.which == 13 && msg.val().length !== 0) {
    // console.log(msg.val());
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
  const html = `<i class="fas fa-microphone-slash"></i>`;
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
  const html = `<i class="fas fa-video-slash"></i>`;
  document.querySelector('.main-video-button').innerHTML = html;
}
