var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var View = laya.ui.View;
var Dialog = laya.ui.Dialog;
var ui;
(function (ui) {
    var loginUI = /** @class */ (function (_super) {
        __extends(loginUI, _super);
        function loginUI() {
            return _super.call(this) || this;
        }
        loginUI.prototype.createChildren = function () {
            View.regComponent("game.pinus", game.pinus);
            View.regComponent("Text", laya.display.Text);
            _super.prototype.createChildren.call(this);
            this.createView(ui.loginUI.uiView);
        };
        loginUI.uiView = { "type": "View", "props": { "width": 600, "height": 400 }, "child": [{ "type": "Button", "props": { "y": 291, "x": 162, "width": 120, "var": "login", "skin": "comp/button.png", "name": "login", "labelStrokeColor": "#af908f", "labelStroke": 0, "label": "登陆", "height": 42 } }, { "type": "Button", "props": { "y": 286, "x": 369, "width": 120, "var": "reg", "skin": "comp/button.png", "name": "reg", "label": "注册", "height": 42 } }, { "type": "TextInput", "props": { "y": 145, "x": 220, "width": 200, "var": "act", "text": "TextInput", "name": "act", "height": 30, "bgColor": "#bbbaa8" } }, { "type": "TextInput", "props": { "y": 209, "x": 225, "width": 200, "var": "psw", "text": "TextInput", "name": "psw", "height": 30, "bgColor": "#7d504f" } }, { "type": "Box", "props": {}, "child": [{ "type": "Script", "props": { "runtime": "game.pinus" } }, { "type": "Text", "props": { "y": 18, "x": 4, "width": 58, "text": "pinus", "height": 17, "color": "#1c2071" } }] }] };
        return loginUI;
    }(View));
    ui.loginUI = loginUI;
})(ui || (ui = {}));
//# sourceMappingURL=layaUI.max.all.js.map