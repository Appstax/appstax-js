
module.exports = {
    log: function(error) {
        if(console && console.error) {
            if(error && error.message) {
                console.error("Appstax Error: " + error.message, error);
            } else {
                console.error("Appstax Error");
            }
            if(error && error.stack) {
                console.error(error.stack);
            }
        }
        throw error;
    }
}
