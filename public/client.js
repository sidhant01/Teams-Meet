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

// holds the index of the RTCPeerConnection object associated with a remote peer
const connectionIndex = {};

var peerConnection = [];
var offers = [];
var size = 0;
var cur = 0;

socket.emit('join', ROOM_ID, NAME);

socket.on('user-connected', peersInRoom => {
  size = peersInRoom;
  makeCall();
});


socket.on('offer', async function(offer, id, index, peerName) {
  // create an RTCPeerConnection object on recieving an offer
  peerConnection.push(new RTCPeerConnection(configuration));
  var last = peerConnection.length-1;

  // listen for media tracks from remote peer
  addTrackEventListener(last, peerName);

  addLocalTracks(last);
  size++;

  if (offer) {
    connectionIndex[id] = last;
    peerConnection[last].setRemoteDescription(new RTCSessionDescription(offer));

    // send ice candidate to the remote peer once formed
    peerConnection[last].onicecandidate = event => newIceCandidate(event, id, index);

    // create and send answer to the remote peer
    const answer = await peerConnection[last].createAnswer();
    await peerConnection[last].setLocalDescription(answer);
    socket.emit('answer', answer, ROOM_ID, id, index, NAME);
  }
});

socket.on('answer', async function(answer, id, index, peerName) {
  if (answer) {
    connectionIndex[id] = index;

    // listen for media tracks from remote peer
    addTrackEventListener(index, peerName);

    // send ice candidate to the remote peer once formed
    peerConnection[index].onicecandidate = event => newIceCandidate(event, id, size-1);

    await peerConnection[index].setLocalDescription(offers[index]);
    await peerConnection[index].setRemoteDescription(new RTCSessionDescription(answer));
  }
});

// add ice candidate to RTCPeerConnection object once recieved from remote peer
socket.on('new-ice-candidate', async function(candidate, index) {
    const iceCandidate = new RTCIceCandidate(candidate);
    peerConnection[index].addIceCandidate(iceCandidate);
});

socket.on('user-disconnected', id => {
  size--;
  let index = connectionIndex[id];

  // close the connection with remote peer
  peerConnection[index].close([index]);

  // dispatch the event to remove remote peer's video
  peerConnection[index].dispatchEvent(closed);

  delete connectionIndex.id;

  // decrement the connection index of all the sockets whose
  // connection index is greater than the peer who left the room
  for (socketId in connectionIndex) {
    if (connectionIndex[socketId] > index) {
      connectionIndex[socketId]--;
    }
  }
});

async function playLocalStream() {
  localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
  // switch off the mic or camera if user turned off on the landing page
  if (sessionStorage.getItem('mic') === "false") {
    pressMicButton();
  }
  if (sessionStorage.getItem('cam') === "false") {
    pressVideoButton();
  }
  // create a div to contain user video and name
  const videoDiv = document.createElement('div');
  myVideo = document.createElement('video');
  const nameElement = document.createTextNode('You');
  videoDiv.setAttribute('class', 'video-div');
  myVideo.muted = true;
  myVideo.srcObject = localStream;
  myVideo.onloadedmetadata = function(e) {
    myVideo.play();
  }

  // make videoDiv draggable
  $(videoDiv).draggable();

  // append the video and the name elements in videoDiv
  videoDiv.appendChild(myVideo);
  videoDiv.appendChild(nameElement);
  videoDiv.setAttribute('class', 'video-div');
  videoGrid.append(videoDiv);
}

async function makeCall() {
  await playLocalStream();

  // create size number of RTCPeerConnection and offer objects to connect with each peer in the room
  for (var i = 0; i < size; i++) {
    peerConnection.push(new RTCPeerConnection(configuration));
    addLocalTracks(i);
    let offer = await peerConnection[i].createOffer();
    offers.push(offer);
  }
  // send the array of offers to the server
  socket.emit('offers', offers, ROOM_ID, NAME);
}

function addTrackEventListener(index, name) {
  console.log(name);
  const remoteStream = new MediaStream();

  // create a div to contain remote peer's video and name
  const videoDiv = document.createElement('div');
  const remoteVideo = document.createElement('video');
  const nameElement = document.createTextNode(name);
  videoDiv.setAttribute('class', 'video-div');
  remoteVideo.srcObject = remoteStream;

  // add tracks to remoteStream on recieving from remote peer
  peerConnection[index].ontrack = e => {
    remoteStream.addTrack(e.track, remoteStream);
    remoteVideo.onloadedmetadata = evt => {
      remoteVideo.play();
    }
  }
  remoteVideo.onloadedmetadata = evt => remoteVideo.play();

  // append the video and name elements in videoDiv
  videoDiv.appendChild(remoteVideo);
  videoDiv.appendChild(nameElement);
  videoGrid.append(videoDiv);

  // make videoDiv draggable
  $(videoDiv).draggable();

  // remove peer's video when the peer leaves the room
  peerConnection[index].addEventListener('closed', (req) => {
    let x = peerConnection.indexOf(req.target);
    videoDiv.remove();

    // remove the peer connection
    peerConnection.splice(cur, 1);
  })
}

// add the user's tracks to the localStream
function addLocalTracks(index) {
  localStream.getTracks().forEach(track => {
    peerConnection[index].addTrack(track, localStream);
  });
}

// send the newly formed ice candidate to the remote peer
function newIceCandidate(event, id, index) {
  console.log('index is ' + index);
  if (event.candidate) {
    socket.emit('new-ice-candidate', event.candidate, id, index);
  }
}

let msg = $('input');


$('html').keydown(e => {

  // send the message when user hits enter key
  if (e.which == 13 && msg.val().length !== 0) {
    socket.emit('new-message', msg.val(), NAME, ROOM_ID);
    $('ul').append(`<li class="message"><b>You:</b><br/>${msg.val()}</li>`);
    scrollToBottom();
    msg.val('');
  }
})

// append the message in the message box when recieved
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

// copy the page url
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
