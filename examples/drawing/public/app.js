
appstax.init("M3cxWDhHUEhtdk4wTg==");

var channel = appstax.channel("public/lines");
channel.on("message", function(event) {
  drawLine(event.message);
});

var width = 1;
var color = ["#BD1550","#E97F02","#F8CA00","#8A9B0F","#00A0B0"][Math.floor(Math.random()*5)];
var sketch = Sketch.create({ autoclear: false });
sketch.touchmove = function() {
  var touch = this.touches[0];
  var newWidth = Math.min(40, 0.001 + 0.8 * (Math.abs(touch.x - touch.ox) + Math.abs(touch.y - touch.oy)));
  width += 0.1 * (newWidth - width);
  var line = { color: color, width: width, x1: touch.ox, y1: touch.oy, x2: touch.x, y2: touch.y };
  drawLine(line);
  channel.send(line);
}

function drawLine(line) {
  sketch.lineCap = "round";
  sketch.lineJoin = "round";
  sketch.fillStyle = sketch.strokeStyle = line.color;
  sketch.lineWidth = line.width;
  sketch.beginPath();
  sketch.moveTo(line.x1, line.y1);
  sketch.lineTo(line.x2, line.y2);
  sketch.stroke();
}
