/**
* name 
*/
module game{
	export class pinus{
 		/**攻击速度**/
        public port: string = "";
        /**人物名称**/
        public ip: string = "";
        /**定义一个变量来接收Box组件实例**/
        private box: Laya.Sprite;
        private frame:number =  0;
        constructor() {
        }
        /**
         *设置owner函数，可以直接获取到添加附加脚本的组件实例 
         **/
        public set owner(value: any) {
            this.box = value;
            //自定义的脚本会有时序问题，所以在此添加一个延时
            this.box.frameOnce(2, this, this.onLoaded);
        }
        private onLoaded(): void {
            //通过子元素的name值获取该对象
            var userN: Laya.Label = this.box.getChildByName("userN") as Laya.Label;
            //设置文本内容为属性栏中给的值
           // userN.text = this.ip;
            this.box.frameLoop(1, this, this.onLoop);
            
        }
        /*
        设置帧循环，实现左右移动
        */
        private onLoop(): void {
           this.frame++;
        }
	}
}