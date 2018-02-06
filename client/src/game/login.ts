/**
* name 
*/
module game{
	export class login extends ui.loginUI{
		constructor(){
			super();
			var tlogin = this.getChildByName("login") as laya.ui.Button;
			this.login.on(Laya.Event.CLICK, this, this.onClickLogin);
			this.reg.on(Laya.Event.CLICK, this, this.onClickReg);
		}

		private onClickLogin(): void {
			var act = this.act.text;
			var psw = this.psw.text;
			Debug("onClickLogin: " + act + " " + psw);
		}

		private onClickReg(): void {
			var act = this.act.text;
			var psw = this.psw.text;
			Warn("onClickReg: "+ act + " " + psw);
		}
	}
}