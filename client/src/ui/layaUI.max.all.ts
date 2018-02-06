
import View=laya.ui.View;
import Dialog=laya.ui.Dialog;
module ui {
    export class loginUI extends View {
		public login:Laya.Button;
		public reg:Laya.Button;
		public act:Laya.TextInput;
		public psw:Laya.TextInput;

        public static  uiView:any ={"type":"View","props":{"width":600,"height":400},"child":[{"type":"Button","props":{"y":291,"x":162,"width":120,"var":"login","skin":"comp/button.png","name":"login","labelStrokeColor":"#af908f","labelStroke":0,"label":"登陆","height":42}},{"type":"Button","props":{"y":286,"x":369,"width":120,"var":"reg","skin":"comp/button.png","name":"reg","label":"注册","height":42}},{"type":"TextInput","props":{"y":145,"x":220,"width":200,"var":"act","text":"TextInput","name":"act","height":30,"bgColor":"#bbbaa8"}},{"type":"TextInput","props":{"y":209,"x":225,"width":200,"var":"psw","text":"TextInput","name":"psw","height":30,"bgColor":"#7d504f"}},{"type":"Box","props":{},"child":[{"type":"Script","props":{"runtime":"game.pinus"}},{"type":"Text","props":{"y":18,"x":4,"width":58,"text":"pinus","height":17,"color":"#1c2071"}}]}]};
        constructor(){ super()}
        createChildren():void {
        			View.regComponent("game.pinus",game.pinus);
			View.regComponent("Text",laya.display.Text);

            super.createChildren();
            this.createView(ui.loginUI.uiView);

        }

    }
}
