const closed = new Event('closed');
const socket = io();
const videoGrid = $('#video-grid');
const muteButton = `<span class="material-icons">&#xe029</span>`;
const unmuteButton = `<span class="unmute material-icons">&#xe02b</span>`;
const stopVideoButton = `<span class="material-icons-outlined">&#xe04b</span>`;
const playVideoButton = `<span class="play material-icons-outlined">&#xe04c</span>`;
let localStream;
let myVideo;

const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};
const connectionIndex = {};
const peerNames = {};

var peerConnection = [];
var offers = [];
var size = 0;
var cur = 0;

socket.emit('join', ROOM_ID);

socket.on('user-connected', peersInRoom => {
  size = peersInRoom;
  makeCall();
});

socket.on('new-peer', (id, name) => {
  peerNames[id] = name;
})

socket.on('offer', async function(offer, id, index) {
    peerConnection.push(new RTCPeerConnection(configuration));
    var last = peerConnection.length-1;
    addTrackEventListener(last, peerNames[id]);
    addLocalTracks(last);
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
  delete peerNames.id;
  for (socketId in connectionIndex) {
    if (connectionIndex[socketId] > index) {
      connectionIndex[socketId]--;
    }
  }
});

async function playLocalStream() {
  localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
  if (sessionStorage.getItem('mic') === "false") {
    pressMicButton();
  }
  if (sessionStorage.getItem('cam') === "false") {
    pressVideoButton();
  }
  myVideo = document.createElement('video');
  myVideo.muted = true;
  myVideo.srcObject = localStream;
  myVideo.onloadedmetadata = function(e) {
    myVideo.play();
  }
  videoGrid.append(myVideo);
  // $(video).draggable();
}

function addTrackEventListener(index, name) {
  const remoteStream = new MediaStream();
  const remoteVideo = document.createElement('video');
  remoteVideo.srcObject = remoteStream;
  peerConnection[index].ontrack = e => {
    remoteStream.addTrack(e.track, remoteStream);
    remoteVideo.onloadedmetadata = evt => {
      remoteVideo.play();
    }
  }
  remoteVideo.onloadedmetadata = evt => remoteVideo.play();
  videoGrid.append(remoteVideo);
  peerConnection[index].addEventListener('closed', (req) => {
    let x = peerConnection.indexOf(req.target);
    remoteVideo.remove();
    peerConnection.splice(cur, 1);
  })
}

function addLocalTracks(index) {
  localStream.getTracks().forEach(track => {
    peerConnection[index].addTrack(track, localStream);
  });
}

async function makeCall() {
  await playLocalStream();
  for (var i = 0; i < size; i++) {
    peerConnection.push(new RTCPeerConnection(configuration));
    addTrackEventListener(i);
    addLocalTracks(i);
    let offer = await peerConnection[i].createOffer();
    offers.push(offer);
  }
  socket.emit('offers', offers, ROOM_ID);
}

function newIceCandidate(event, id, index) {
  console.log('index is ' + index);
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

function pressMicButton() {
  const isEnabled = localStream.getAudioTracks()[0].enabled;
  console.log(isEnabled);
  if (isEnabled) {
    localStream.getAudioTracks()[0].enabled = false;
    $('.main-mute-button').html(unmuteButton);
  }
  else {
    localStream.getAudioTracks()[0].enabled = true;
    $('.main-mute-button').html(muteButton);
  }
}

function pressVideoButton() {
  const isEnabled = localStream.getVideoTracks()[0].enabled;
  console.log(isEnabled);
  if (isEnabled) {
    localStream.getVideoTracks()[0].enabled = false;
    $('.main-video-button').html(playVideoButton);
  }
  else {
    localStream.getVideoTracks()[0].enabled = true;
    $('.main-video-button').html(stopVideoButton);
  }
}

function copyLink() {
  link = window.location.href;
  var $temp = $("<input>");
  $("body").append($temp);
  $temp.val(link).select();
  document.execCommand("copy");
  $temp.remove();
}

function disconnect() {
  window.location.href = "/";
}
