function foo() {
  const socket = io();
  socket.emit('join', ROOM_ID);
  console.log('hello ' + ROOM_ID);
  const videoGrid = document.getElementById('video-grid');
  let localStream;

  const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};

  var pc = [];
  var offers = [];
  var size = 0;

  socket.on('joined', siz => {
    size = siz;
    makeCall(size);
  });

  socket.on('offer', async function(offer, id, index) {
      pc.push(new RTCPeerConnection(configuration));
      var last = pc.length-1;
      addTrackEventListener(last);
      addLocalTrack(last);
      pc[last].createDataChannel('channel');
      size++;
      console.log('offer recieved');
      if (offer) {
          console.log('offer recieved ' + offer);
          pc[last].setRemoteDescription(new RTCSessionDescription(offer));
          pc[last].onicecandidate = event => newIceCandidate(event, id, index);
          const answer = await pc[last].createAnswer();
          await pc[last].setLocalDescription(answer);
          socket.emit('answer', answer, ROOM_ID, id, index);
          console.log('answer sent ' + answer);
      }
  });

  socket.on('answer', async function(answer, id, index) {
    if (answer) {
      console.log('index: ' + index);
      pc[index].onicecandidate = event => newIceCandidate(event, id, size-1);
      await pc[index].setLocalDescription(offers[index]);
      await pc[index].setRemoteDescription(new RTCSessionDescription(answer));
    }
    console.log(index + ' recieved answer');
  });

  socket.on('new-ice-candidate', async function(candidate, index) {
      pc[index].addEventListener('connectionstatechange', event => {
        if (pc[index].connectionState === 'connected') {
          console.log('connection successful');
        }
      })
      console.log('ice candidate recieved');
      const iceCandidate = new RTCIceCandidate(candidate);
      pc[index].addIceCandidate(iceCandidate);
  });

  async function playLocalStream() {
    localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
    const localTrack = document.createElement('video');
    localTrack.srcObject = localStream;
    localTrack.onloadedmetadata = function(e) {
      localTrack.play();
    }
    videoGrid.append(localTrack);
    console.log('local stream playing');
  }

  function addTrackEventListener(index) {
    pc[index].ontrack = e => {
      const stream = new MediaStream();
      stream.addTrack(event.track, stream);
      const video = document.createElement('video');
      video.srcObject = stream;
      video.onloadedmetadata = evt => {
        video.play();
      }
      videoGrid.append(video);
    }
  }

  function addLocalTrack(index) {
    localStream.getTracks().forEach(track => {
      pc[index].addTrack(track, localStream);
      console.log('tracks added when called');
    });
  }

  async function makeCall(siz) {
    await playLocalStream();
    console.log(offers + ' ' + offers.length);
    for (var i = 0; i < siz; i++) {
      console.log(i + ' ' + siz);
      pc.push(new RTCPeerConnection(configuration));
      addTrackEventListener(i);
      addLocalTrack(i);
      pc[i].createDataChannel('channel');
      let offer = await pc[i].createOffer();
      offers.push(offer);
    }
    socket.emit('offer', offers, ROOM_ID);
    console.log(offers.length + ' offers sent');
  }

  function newIceCandidate(event, id, index) {
    console.log('ice candidate generated');
    console.log('trying ' + id + ' ' + index);
    if (event.candidate) {
      console.log('fine');
      socket.emit('new-ice-candidate', event.candidate, id, index);
    }
  }
}
