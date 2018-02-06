/**
* name
*/
var game;
(function (game) {
    var pinus = /** @class */ (function () {
        function pinus() {
            /**攻击速度**/
            this.port = "";
            /**人物名称**/
            this.ip = "";
            this.frame = 0;
        }
        Object.defineProperty(pinus.prototype, "owner", {
            /**
             *设置owner函数，可以直接获取到添加附加脚本的组件实例
             **/
            set: function (value) {
                this.box = value;
                //自定义的脚本会有时序问题，所以在此添加一个延时
                this.box.frameOnce(2, this, this.onLoaded);
            },
            enumerable: true,
            configurable: true
        });
        pinus.prototype.onLoaded = function () {
            //通过子元素的name值获取该对象
            var userN = this.box.getChildByName("userN");
            //设置文本内容为属性栏中给的值
            // userN.text = this.ip;
            this.box.frameLoop(1, this, this.onLoop);
        };
        /*
        设置帧循环，实现左右移动
        */
        pinus.prototype.onLoop = function () {
            this.frame++;
        };
        return pinus;
    }());
    game.pinus = pinus;
})(game || (game = {}));
//# sourceMappingURL=pinus.js.map