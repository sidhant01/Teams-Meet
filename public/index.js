const muteButton = `<span class="material-icons-outlined">&#xe029</span>`;
const unmuteButton = `<span class="unmute material-icons-outlined">&#xe02b</span>`;
const stopVideoButton = `<span class="material-icons-outlined">&#xe04b</span>`;
const playVideoButton = `<span class="play material-icons-outlined">&#xe04c</span>`;
let localStream;
sessionStorage.setItem('mic', true);
sessionStorage.setItem('cam', true);

playLocalStream();

async function playLocalStream() {
  localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
  const localTrack = document.getElementById('user-video');
  localTrack.muted = true;
  localTrack.srcObject = localStream;
  localTrack.onloadedmetadata = function(e) {
    localTrack.play();
  }
}

function pressMicButton() {
  const isEnabled = localStream.getAudioTracks()[0].enabled;
  sessionStorage.setItem('mic', !isEnabled);
  console.log(isEnabled);
  if (isEnabled) {
    localStream.getAudioTracks()[0].enabled = false;
    document.querySelector('.main-mute-button').innerHTML = unmuteButton;
  }
  else {
    localStream.getAudioTracks()[0].enabled = true;
    document.querySelector('.main-mute-button').innerHTML = muteButton;
  }
}

function pressVideoButton() {
  const isEnabled = localStream.getVideoTracks()[0].enabled;
  sessionStorage.setItem('cam', !isEnabled);
  console.log(isEnabled);
  if (isEnabled) {
    localStream.getVideoTracks()[0].enabled = false;
    document.querySelector('.main-video-button').innerHTML = playVideoButton;
  }
  else {
    localStream.getVideoTracks()[0].enabled = true;
    document.querySelector('.main-video-button').innerHTML = stopVideoButton;
  }
}
