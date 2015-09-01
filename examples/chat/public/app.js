
appstax.init("S0sxYW9lYkk1ZWs5dzg=");

window.addEventListener("load", function() {
  initForm();
  initChannel();
});

function initForm() {
  var form = document.querySelector("#chat form");
  var input = form.querySelector("input[type=text]");
  input.focus();
  form.addEventListener("submit", function(event) {
    event.preventDefault();
    if(input.value != "") {
      var message = {
        text: input.value,
        time: Date.now()
      }
      addMessageToHtml(message);
      sendMessage(message);
      input.value = "";
    }
  });
}

function initChannel() {
  var ch = appstax.channel("public/chat");
  ch.on("message", function(event) {
    addMessageToHtml(event.message);
  });
}

function addMessageToHtml(message) {
  var li = document.createElement("li");
  li.textContent = message.text;
  var date = document.createElement("span");
  date.className = "date";
  date.textContent = formatTime(message.time);
  li.appendChild(date);
  var ul = document.querySelector("#chat ul");
  ul.appendChild(li);
  var scroll = document.querySelector("#chat .scroll");
  scroll.scrollTop = scroll.scrollHeight - scroll.clientHeight;
}

function sendMessage(message) {
  var ch = appstax.channel("public/chat");
  ch.send(message);
}

function formatTime(time) {
  var date = new Date(time);
  return pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
  function pad(s) {
    return (s+"").length == 1 ? "0"+s : s;
  }
}
