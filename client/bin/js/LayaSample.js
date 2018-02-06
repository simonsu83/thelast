// 程序入口
var GameMain = /** @class */ (function () {
    function GameMain() {
        Laya.init(600, 400);
        Laya.loader.load("./res/atlas/comp.atlas", Laya.Handler.create(this, this.onLoaded));
    }
    GameMain.prototype.onLoaded = function () {
        //实例化导出的UI类
        var loginui = new game.login();
        //添加到舞台
        Laya.stage.addChild(loginui);
    };
    return GameMain;
}());
new GameMain();
//# sourceMappingURL=LayaSample.js.map