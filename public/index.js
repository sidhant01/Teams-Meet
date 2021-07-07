playLocalStream();
let localStream;

async function playLocalStream() {
  localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
  const localTrack = document.getElementById('user-video');
  localTrack.muted = true;
  localTrack.srcObject = localStream;
  localTrack.onloadedmetadata = function(e) {
    localTrack.play();
  }
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
  document.querySelector('.mute-button').innerHTML = html;
}

function setUnmuteButton() {
  const html = `<i class="unmute fas fa-microphone-slash"></i>`;
  document.querySelector('.mute-button').innerHTML = html;
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
  document.querySelector('.video-button').innerHTML = html;
}

function setPlayVideoButton() {
  const html = `<i class="play fas fa-video-slash"></i>`;
  document.querySelector('.video-button').innerHTML = html;
}
