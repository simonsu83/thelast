/**
* name
*/
var game;
(function (game) {
    function Debug(s) {
        console.debug(s);
    }
    game.Debug = Debug;
    function Warn(s) {
        console.warn(s);
    }
    game.Warn = Warn;
    function Error(s) {
        console.error(s);
    }
    game.Error = Error;
})(game || (game = {}));
//# sourceMappingURL=log.js.map