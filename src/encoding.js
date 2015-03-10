
var nibbler = require("./nibbler");

var base64 = nibbler.create({
    dataBits: 8,
    codeBits: 6,
    keyString: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
    pad: "-"
})

var base32 = nibbler.create({
    dataBits: 8,
    codeBits: 5,
    keyString: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
    pad: "-"
});

module.exports = {
    base64: base64,
    base32: base32,
    base64ToBase32: function(source) {
        return base32.encode(base64.decode(source));
    }
}
