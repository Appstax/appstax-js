
// Remember to initialize the app with your app id from appstax.com (sign up to get one)

appstax.init("eTRaZThXemNZTnhCeQ==");

window.addEventListener("load", function() {
  loadSnapshots();
  initVideo();
  initButton();
});

function initVideo() {
  navigator.getUserMedia = navigator.getUserMedia || 
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia;
  if(typeof navigator.getUserMedia === "undefined") {
    alert("A web camera is required for this app, but your browser does not support it. Please download Firefox, Google Chrome or Opera and try again.")
  } else {
    navigator.getUserMedia({audio:false, video: true}, function(localMediaStream) {
    var video = document.querySelector("video");
    video.autoplay = true;
    video.src = window.URL.createObjectURL(localMediaStream);
    }, function(error) {
      alert("You need to allow access to your web camera. Reload the page to try again.");
    }); 
  }
}

function getVideoFrameAsFile() {
  var name = "snapshot.png";
  var mime = "image/png";
  var video  = document.querySelector("video");
  var canvas = document.createElement("canvas");
  canvas.width  = video.clientWidth;
  canvas.height = video.clientHeight;
  var ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  var dataURI = canvas.toDataURL(mime);
  var binary = atob(dataURI.split(',')[1]);
  var array = [];
  for(var i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }
  var file = new File([new Uint8Array(array)], name, {type: mime});
  return file;
}

function initButton() {
  var button = document.querySelector("button");
  button.addEventListener("click", function() {
    flash();
    saveSnapshot();
  });
}

function flash() {
  var flash = document.querySelector("#booth .flash");
  flash.className = "flash on";
  setTimeout(function() {
    flash.className = "flash";
  }, 1)
}

function saveSnapshot() {
  var file = getVideoFrameAsFile();
  var snapshot = appstax.object("snapshots");
  snapshot.image = appstax.file(file);
  snapshot.save().then(loadSnapshots);
}

function loadSnapshots() {
  appstax.findAll("snapshots").then(renderSnapshots);
}

function renderSnapshots(snapshots) {
  var list = document.querySelector("#snapshots ul");
  list.innerHTML = "";
  snapshots.reverse().forEach(function(snapshot) {
    var url = snapshot.image.imageUrl("resize", {width:120});
    list.innerHTML += "<li><img src='" + url + "'/></li>"
  });
}
