// 程序入口
class GameMain{
    constructor()
    {
        Laya.init(600,400);
        Laya.loader.load("./res/atlas/comp.atlas",Laya.Handler.create(this,this.onLoaded));
    }
    private onLoaded():void{
        //实例化导出的UI类
        var loginui:game.login = new game.login();
        //添加到舞台
        Laya.stage.addChild(loginui);
    }
    
}
new GameMain();