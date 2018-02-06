/**
 * Created by govo on 15/8/14.
 *
 * Pomelo Client for Egret, with protobuf support, with js ws client version 0.0.5
 * Github: https://github.com/govo/PomeloForEgret.git
 *
 * Thanks to:
 * D-Deo @ https://github.com/D-Deo/pomelo-flash-tcp.git
 * and yicaoyimu @ http://bbs.egret.com/forum.php?mod=viewthread&tid=2538&highlight=pomelo
 */
//import { serverHandlers } from '../../shared';
var game;
(function (game) {
    var Pomelo = /** @class */ (function () {
        function Pomelo() {
            this.JS_WS_CLIENT_TYPE = 'js-websocket';
            this.JS_WS_CLIENT_VERSION = '0.0.5';
            this.RES_OK = 200;
            this.RES_FAIL = 500;
            this.RES_OLD_CLIENT = 501;
            this.callbacks = {};
            this.handlers = {};
            // Map from request id to route
            this.routeMap = {};
            this.heartbeatInterval = 0;
            this.heartbeatTimeout = 0;
            this.nextHeartbeatTimeout = 0;
            this.gapThreshold = 100;
            this.heartbeatId = null;
            this.heartbeatTimeoutId = null;
            this.handshakeCallback = null;
            this._callbacks = {};
            this.reqId = 0;
            if (!console.group) {
                console.group = console.log;
                console.groupEnd = function () { console.log('----'); };
                console.info = console.log;
                console.warn = console.log;
                console.error = console.log;
            }
            this.callbacks = {};
            this.handlers = {};
            // Map from request id to route
            this.routeMap = {};
            this._message = new Message(this.routeMap);
            this._package = new Package();
            this.heartbeatInterval = 0;
            this.heartbeatTimeout = 0;
            this.nextHeartbeatTimeout = 0;
            this.gapThreshold = 100;
            this.heartbeatId = null;
            this.heartbeatTimeoutId = null;
            this.handshakeCallback = null;
            this.handshakeBuffer = {
                'sys': {
                    type: this.JS_WS_CLIENT_TYPE,
                    version: this.JS_WS_CLIENT_VERSION
                },
                'user': {}
            };
            this.initCallback = null;
            this.reqId = 0;
            this.handlers[Package.TYPE_HANDSHAKE] = this.handshake;
            this.handlers[Package.TYPE_HEARTBEAT] = this.heartbeat;
            this.handlers[Package.TYPE_DATA] = this.onData;
            this.handlers[Package.TYPE_KICK] = this.onKick;
        }
        Pomelo.prototype.init = function (params, cb) {
            console.log('init', params);
            this.initCallback = cb;
            var host = params.host;
            var port = params.port;
            //
            //var url = 'ws://' + host;
            //if(port) {
            //    url +=  ':' + port;
            //}
            this.handshakeBuffer.user = params.user;
            this.handshakeCallback = params.handshakeCallback;
            this.initWebSocket(host, port, cb);
        };
        Pomelo.prototype.initWebSocket = function (host, port, cb) {
            console.log('[Pomelo] connect to:', host, port);
            if (this.socket) {
                this.socket.off(Laya.Event.OPEN, this, this.onConnect);
                this.socket.off(Laya.Event.CLOSE, this, this.onClose);
                this.socket.off(Laya.Event.ERROR, this, this.onIOError);
                this.socket.off(Laya.Event.MESSAGE, this, this.onMessage);
            }
            this.socket = new Laya.Socket();
            this.socket.on(Laya.Event.OPEN, this, this.onConnect);
            this.socket.on(Laya.Event.CLOSE, this, this.onClose);
            this.socket.on(Laya.Event.ERROR, this, this.onIOError);
            this.socket.on(Laya.Event.MESSAGE, this, this.onMessage);
            this.socket.connect(host, port);
        };
        Pomelo.prototype.on = function (event, fn) {
            (this._callbacks[event] = this._callbacks[event] || []).push(fn);
        };
        Pomelo.prototype.request = function (route, msg, cb) {
            if (arguments.length === 2 && typeof msg === 'function') {
                cb = msg;
                msg = {};
            }
            else {
                msg = msg || {};
            }
            route = route || msg.route;
            if (!route) {
                return false;
            }
            this.reqId++;
            if (this.reqId > 127) {
                this.reqId = 1;
            }
            var reqId = this.reqId;
            if (Pomelo.DEBUG) {
                console.group('REQUEST:');
                console.info('Route:', route);
                console.log('Id:', reqId);
                console.log('Param:', msg);
                console.groupEnd();
            }
            this.sendMessage(reqId, route, msg);
            this.callbacks[reqId] = cb;
            this.routeMap[reqId] = route;
            return true;
        };
        Pomelo.prototype.notify = function (route, msg) {
            this.sendMessage(0, route, msg);
        };
        Pomelo.prototype.onMessage = function (event) {
            if (event instanceof ArrayBuffer) {
                var byte = new Laya.Byte(event);
                this.socket.input.clear();
                this.processPackage(this._package.decode(byte));
            }
        };
        Pomelo.prototype.sendMessage = function (reqId, route, msg) {
            var byte;
            // var msgbuffer = Protocol.strencode(JSON.stringify(msg));
            // console.log("msgbuffer",msgbuffer);
            var msgbuffer = this._message.encode(reqId, route, msg);
            byte = this._package.encode(Package.TYPE_DATA, msgbuffer);
            this.send(byte);
        };
        Pomelo.prototype.onConnect = function (e) {
            console.log('[Pomelo] connect success', e);
            this.send(this._package.encode(Package.TYPE_HANDSHAKE, Protocol.strencode(JSON.stringify(this.handshakeBuffer))));
        };
        Pomelo.prototype.onClose = function (e) {
            console.error('[Pomelo] connect close:', e);
            this.emit(Pomelo.EVENT_CLOSE, e);
        };
        Pomelo.prototype.onIOError = function (e) {
            this.emit(Pomelo.EVENT_IO_ERROR, e);
            console.error('socket error: ', e);
        };
        Pomelo.prototype.onKick = function (event) {
            this.emit(Pomelo.EVENT_KICK, event);
        };
        Pomelo.prototype.onData = function (data) {
            //probuff decode
            var msg = this._message.decode(data);
            if (msg.id > 0) {
                msg.route = this.routeMap[msg.id];
                delete this.routeMap[msg.id];
                if (!msg.route) {
                    return;
                }
            }
            //msg.body = this.deCompose(msg);
            this.processMessage(msg);
        };
        Pomelo.prototype.processMessage = function (msg) {
            if (!msg.id) {
                // server push message
                if (Pomelo.DEBUG) {
                    console.group('EVENT:');
                    console.info('Route:', msg.route);
                    console.info('Msg:', msg.body);
                    console.groupEnd();
                }
                this.emit(msg.route, msg.body);
                return;
            }
            if (Pomelo.DEBUG) {
                console.group('RESPONSE:');
                console.info('Id:', msg.id);
                console.info('Msg:', msg.body);
                console.groupEnd();
            }
            //if have a id then find the callback function with the request
            var cb = this.callbacks[msg.id];
            delete this.callbacks[msg.id];
            if (typeof cb !== 'function') {
                return;
            }
            if (msg.body && msg.body.code == 500) {
                var obj = { 'code': 500, 'desc': '服务器内部错误', 'key': 'INTERNAL_ERROR' };
                msg.body.error = obj;
            }
            cb(msg.body);
            return;
        };
        Pomelo.prototype.heartbeat = function (data) {
            if (!this.heartbeatInterval) {
                // no heartbeat
                return;
            }
            var obj = this._package.encode(Package.TYPE_HEARTBEAT);
            if (this.heartbeatTimeoutId) {
                Laya.timer.clear(this, this.heartbeatTimeoutId);
                this.heartbeatTimeoutId = null;
            }
            if (this.heartbeatId) {
                // already in a heartbeat interval
                return;
            }
            var self = this;
            self.heartbeatId = Laya.timer.once(self.heartbeatInterval, self, function () {
                self.heartbeatId = null;
                self.send(obj);
                self.nextHeartbeatTimeout = Date.now() + self.heartbeatTimeout;
                self.heartbeatTimeoutId = self.heartbeatTimeoutCb.bind(self, data);
                Laya.timer.once(self.heartbeatTimeout, self, self.heartbeatTimeoutCb.bind(self, data));
            });
        };
        Pomelo.prototype.heartbeatTimeoutCb = function (data) {
            var gap = this.nextHeartbeatTimeout - Date.now();
            if (gap > this.gapThreshold) {
                this.heartbeatTimeoutId = Laya.timer.once(gap, this, this.heartbeatTimeoutCb);
            }
            else {
                console.error('server heartbeat timeout', data);
                this.emit(Pomelo.EVENT_HEART_BEAT_TIMEOUT, data);
                this._disconnect();
            }
        };
        Pomelo.prototype.off = function (event, fn) {
            this.removeAllListeners(event, fn);
        };
        Pomelo.prototype.removeAllListeners = function (event, fn) {
            // all
            if (0 == arguments.length) {
                this._callbacks = {};
                return;
            }
            // specific event
            var callbacks = this._callbacks[event];
            if (!callbacks) {
                return;
            }
            // remove all handlers
            if (event && !fn) {
                delete this._callbacks[event];
                return;
            }
            // remove specific handler
            var i = this.index(callbacks, fn._off || fn);
            if (~i) {
                callbacks.splice(i, 1);
            }
            return;
        };
        Pomelo.prototype.index = function (arr, obj) {
            if ([].indexOf) {
                return arr.indexOf(obj);
            }
            for (var i = 0; i < arr.length; ++i) {
                if (arr[i] === obj)
                    return i;
            }
            return -1;
        };
        Pomelo.prototype.disconnect = function () {
            this._disconnect();
        };
        Pomelo.prototype._disconnect = function () {
            console.warn('[Pomelo] client disconnect ...');
            if (this.socket && this.socket.connected)
                this.socket.close();
            this.socket = null;
            if (this.heartbeatId) {
                Laya.timer.clear(this, this.heartbeatId);
                this.heartbeatId = null;
            }
            if (this.heartbeatTimeoutId) {
                Laya.timer.clear(this, this.heartbeatTimeoutId);
                this.heartbeatTimeoutId = null;
            }
        };
        Pomelo.prototype.processPackage = function (msg) {
            this.handlers[msg.type].apply(this, [msg.body]);
        };
        Pomelo.prototype.handshake = function (resData) {
            var data = JSON.parse(Protocol.strdecode(resData));
            if (data.code === this.RES_OLD_CLIENT) {
                this.emit(Pomelo.EVENT_IO_ERROR, 'client version not fullfill');
                return;
            }
            if (data.code !== this.RES_OK) {
                this.emit(Pomelo.EVENT_IO_ERROR, 'handshake fail');
                return;
            }
            this.handshakeInit(data);
            var obj = this._package.encode(Package.TYPE_HANDSHAKE_ACK);
            this.send(obj);
            if (this.initCallback) {
                this.initCallback(data);
                this.initCallback = null;
            }
        };
        Pomelo.prototype.handshakeInit = function (data) {
            if (data.sys) {
                Routedic.init(data.sys.dict, this);
                Protobuf.init(data.sys.protos);
            }
            if (data.sys && data.sys.heartbeat) {
                this.heartbeatInterval = data.sys.heartbeat * 1000; // heartbeat interval
                this.heartbeatTimeout = this.heartbeatInterval * 2; // max heartbeat timeout
            }
            else {
                this.heartbeatInterval = 0;
                this.heartbeatTimeout = 0;
            }
            if (typeof this.handshakeCallback === 'function') {
                this.handshakeCallback(data.user);
            }
        };
        Pomelo.prototype.send = function (byte) {
            if (this.socket && this.socket.connected) {
                var byteArray = new ArrayBuffer(byte.length);
                byte.pos = 0;
                var bytestr = 'length:' + byte.length + '[';
                for (var i = 0; i < byte.length; i++) {
                    var rbyte = byte.readByte();
                    this.socket.output.writeByte(rbyte);
                    if (i == byte.length - 1) {
                        bytestr += rbyte + '';
                    }
                    else {
                        bytestr += rbyte + ',';
                    }
                }
                bytestr += ']';
                // console.log("send :"+bytestr);
                this.socket.flush();
            }
        };
        //private deCompose(msg){
        //    return JSON.parse(Protocol.strdecode(msg.body));
        //}
        Pomelo.prototype.emit = function (event) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            var params = [].slice.call(arguments, 1);
            var callbacks = this._callbacks[event];
            if (callbacks) {
                callbacks = callbacks.slice(0);
                for (var i = 0, len = callbacks.length; i < len; ++i) {
                    callbacks[i].apply(this, params);
                }
            }
            return this;
        };
        /**
         *
         * 写入Laya.Byte
         * @param(Laya.Byte) 需要写入的Laya.Byte
         * @param(Laya.Byte) 写入的Laya.Byte
         *
         */
        Pomelo.writeBytes = function (fromByte, toByte) {
            fromByte.pos = 0;
            for (var i = 0; i < fromByte.length; i++) {
                var rbyte = fromByte.getByte();
                toByte.writeByte(rbyte);
            }
        };
        Pomelo.DEBUG = true;
        Pomelo.EVENT_IO_ERROR = 'io-error';
        Pomelo.EVENT_CLOSE = 'close';
        Pomelo.EVENT_KICK = 'onKick';
        Pomelo.EVENT_HEART_BEAT_TIMEOUT = 'heartbeat timeout';
        return Pomelo;
    }());
    game.Pomelo = Pomelo;
    var Package = /** @class */ (function () {
        function Package() {
        }
        Package.prototype.encode = function (type, body) {
            var length = body ? body.length : 0;
            var buffer = new Laya.Byte();
            buffer.writeByte(type & 0xff);
            buffer.writeByte((length >> 16) & 0xff);
            buffer.writeByte((length >> 8) & 0xff);
            buffer.writeByte(length & 0xff);
            if (body)
                Pomelo.writeBytes(body, buffer);
            return buffer;
        };
        Package.prototype.decode = function (buffer) {
            var type = buffer.getUint8();
            var len = (buffer.getUint8() << 16 | buffer.getUint8() << 8 | buffer.getUint8()) >>> 0;
            var body;
            if (buffer.bytesAvailable >= len) {
                body = new Laya.Byte();
                if (len) {
                    body = new Laya.Byte(buffer.getUint8Array(buffer.pos, buffer.bytesAvailable));
                }
            }
            else {
                console.log('[Package] no enough length for current type:', type);
            }
            return { type: type, body: body, length: len };
        };
        Package.TYPE_HANDSHAKE = 1;
        Package.TYPE_HANDSHAKE_ACK = 2;
        Package.TYPE_HEARTBEAT = 3;
        Package.TYPE_DATA = 4;
        Package.TYPE_KICK = 5;
        return Package;
    }());
    var Message = /** @class */ (function () {
        function Message(routeMap) {
            this.routeMap = routeMap;
        }
        Message.prototype.encode = function (id, route, msg) {
            var buffer = new Laya.Byte();
            var type = id ? Message.TYPE_REQUEST : Message.TYPE_NOTIFY;
            var byte = Protobuf.encode(route, msg) || Protocol.strencode(JSON.stringify(msg));
            var rot = Routedic.getID(route) || route;
            buffer.writeByte((type << 1) | ((typeof (rot) == 'string') ? 0 : 1));
            if (id) {
                // 7.x
                do {
                    var tmp = id % 128;
                    var next = Math.floor(id / 128);
                    if (next != 0) {
                        tmp = tmp + 128;
                    }
                    buffer.writeByte(tmp);
                    id = next;
                } while (id != 0);
                // 5.x
                //				var len:Array = [];
                //				len.push(id & 0x7f);
                //				id >>= 7;
                //				while(id > 0)
                //				{
                //					len.push(id & 0x7f | 0x80);
                //					id >>= 7;
                //				}
                //
                //				for (var i:int = len.length - 1; i >= 0; i--)
                //				{
                //					buffer.writeByte(len[i]);
                //				}
            }
            if (rot) {
                if (typeof rot == 'string') {
                    buffer.writeByte(rot.length & 0xff);
                    buffer.writeUTFBytes(rot);
                }
                else {
                    buffer.writeByte((rot >> 8) & 0xff);
                    buffer.writeByte(rot & 0xff);
                }
            }
            if (byte) {
                Pomelo.writeBytes(byte, buffer);
            }
            return buffer;
        };
        Message.prototype.decode = function (buffer) {
            // parse flag
            var flag = buffer.getUint8();
            var compressRoute = flag & Message.MSG_COMPRESS_ROUTE_MASK;
            var type = (flag >> 1) & Message.MSG_TYPE_MASK;
            var route;
            // parse id
            var id = 0;
            if (type === Message.TYPE_REQUEST || type === Message.TYPE_RESPONSE) {
                // 7.x
                var i = 0;
                var m = void 0;
                do {
                    m = buffer.getUint8();
                    id = id + ((m & 0x7f) * Math.pow(2, (7 * i)));
                    i++;
                } while (m >= 128);
                // 5.x
                //				var byte:int = buffer.getUint8();
                //				id = byte & 0x7f;
                //				while(byte & 0x80)
                //				{
                //					id <<= 7;
                //					byte = buffer.getUint8();
                //					id |= byte & 0x7f;
                //				}
            }
            // parse route
            if (type === Message.TYPE_REQUEST || type === Message.TYPE_NOTIFY || type === Message.TYPE_PUSH) {
                if (compressRoute) {
                    route = buffer.getUint16();
                }
                else {
                    var routeLen = buffer.getUint8();
                    route = routeLen ? buffer.readUTFBytes(routeLen) : '';
                }
            }
            else if (type === Message.TYPE_RESPONSE) {
                route = this.routeMap[id];
            }
            if (!id && !(typeof (route) == 'string')) {
                route = Routedic.getName(route);
            }
            var body = Protobuf.decode(route, buffer) || JSON.parse(Protocol.strdecode(buffer));
            return { id: id, type: type, route: route, body: body };
        };
        Message.MSG_FLAG_BYTES = 1;
        Message.MSG_ROUTE_CODE_BYTES = 2;
        Message.MSG_ID_MAX_BYTES = 5;
        Message.MSG_ROUTE_LEN_BYTES = 1;
        Message.MSG_ROUTE_CODE_MAX = 0xffff;
        Message.MSG_COMPRESS_ROUTE_MASK = 0x1;
        Message.MSG_TYPE_MASK = 0x7;
        Message.TYPE_REQUEST = 0;
        Message.TYPE_NOTIFY = 1;
        Message.TYPE_RESPONSE = 2;
        Message.TYPE_PUSH = 3;
        return Message;
    }());
    var Protocol = /** @class */ (function () {
        function Protocol() {
        }
        Protocol.strencode = function (str) {
            var buffer = new Laya.Byte();
            buffer.length = str.length;
            buffer.writeUTFBytes(str);
            return buffer;
        };
        Protocol.strdecode = function (byte) {
            return byte.readUTFBytes(byte.bytesAvailable);
        };
        return Protocol;
    }());
    var Protobuf = /** @class */ (function () {
        function Protobuf() {
        }
        Protobuf.init = function (protos) {
            this._clients = protos && protos.client || {};
            this._servers = protos && protos.server || {};
        };
        Protobuf.encode = function (route, msg) {
            var protos = this._clients[route];
            if (!protos)
                return null;
            return this.encodeProtos(protos, msg);
        };
        Protobuf.decode = function (route, buffer) {
            var protos = this._servers[route];
            if (!protos)
                return null;
            return this.decodeProtos(protos, buffer);
        };
        Protobuf.encodeProtos = function (protos, msg) {
            var buffer = new Laya.Byte();
            for (var name_1 in msg) {
                if (protos[name_1]) {
                    var proto = protos[name_1];
                    switch (proto.option) {
                        case 'optional':
                        case 'required':
                            buffer.writeArrayBuffer(this.encodeTag(proto.type, proto.tag));
                            this.encodeProp(msg[name_1], proto.type, protos, buffer);
                            break;
                        case 'repeated':
                            if (!!msg[name_1] && msg[name_1].length > 0) {
                                this.encodeArray(msg[name_1], proto, protos, buffer);
                            }
                            break;
                    }
                }
            }
            return buffer;
        };
        Protobuf.decodeProtos = function (protos, buffer) {
            var msg = {};
            while (buffer.bytesAvailable) {
                var head = this.getHead(buffer);
                var name_2 = protos.__tags[head.tag];
                switch (protos[name_2].option) {
                    case 'optional':
                    case 'required':
                        msg[name_2] = this.decodeProp(protos[name_2].type, protos, buffer);
                        break;
                    case 'repeated':
                        if (!msg[name_2]) {
                            msg[name_2] = [];
                        }
                        this.decodeArray(msg[name_2], protos[name_2].type, protos, buffer);
                        break;
                }
            }
            return msg;
        };
        Protobuf.encodeTag = function (type, tag) {
            var value = this.TYPES[type] != undefined ? this.TYPES[type] : 2;
            return this.encodeUInt32((tag << 3) | value);
        };
        Protobuf.getHead = function (buffer) {
            var tag = this.decodeUInt32(buffer);
            return { type: tag & 0x7, tag: tag >> 3 };
        };
        Protobuf.encodeProp = function (value, type, protos, buffer) {
            switch (type) {
                case 'uInt32':
                    // buffer.writeArrayBuffer(this.encodeUInt32(value));
                    Pomelo.writeBytes(this.encodeUInt32(value), buffer);
                    break;
                case 'int32':
                case 'sInt32':
                    // buffer.writeArrayBuffer(this.encodeSInt32(value));
                    Pomelo.writeBytes(this.encodeSInt32(value), buffer);
                    break;
                case 'float':
                    //Float32Array
                    // var floats:Laya.Byte = new Laya.Byte();
                    // floats.endian = Laya.Byte.LITTLE_ENDIAN;
                    // floats.getFloat32(value);
                    // buffer.writeArrayBuffer(floats);
                    Pomelo.writeBytes(this.encodeFloat(value), buffer);
                    break;
                case 'double':
                    // var doubles:Laya.Byte = new Laya.Byte();
                    // doubles.endian = Laya.Byte.LITTLE_ENDIAN;
                    // doubles.getFloat32(value);
                    // buffer.writeArrayBuffer(doubles);
                    Pomelo.writeBytes(this.encodeDouble(value), buffer);
                    break;
                case 'string':
                    // buffer.writeArrayBuffer(this.encodeUInt32(value.length));
                    Pomelo.writeBytes(this.encodeUInt32(value.length), buffer);
                    buffer.writeUTFBytes(value);
                    break;
                default:
                    var proto = protos.__messages[type] || this._clients['message ' + type];
                    if (!!proto) {
                        var buf = this.encodeProtos(proto, value);
                        // buffer.writeArrayBuffer(this.encodeUInt32(buf.length));
                        Pomelo.writeBytes(this.encodeUInt32(value.length), buffer);
                        buffer.writeArrayBuffer(buf);
                    }
                    break;
            }
        };
        Protobuf.decodeProp = function (type, protos, buffer) {
            switch (type) {
                case 'uInt32':
                    return this.decodeUInt32(buffer);
                case 'int32':
                case 'sInt32':
                    return this.decodeSInt32(buffer);
                case 'float':
                    {
                        var floats = new Laya.Byte();
                        // buffer.writeArrayBuffer(floats, 0, 4);
                        var uint8arry = buffer.getUint8Array(0, 4);
                        for (var i = 0; i < uint8arry.length; i++) {
                            floats.writeByte(uint8arry[i]);
                        }
                        floats.endian = Laya.Byte.LITTLE_ENDIAN;
                        var float = buffer.getFloat32();
                        return floats.getFloat32();
                    }
                case 'double':
                    {
                        var doubles = new Laya.Byte();
                        // buffer.writeArrayBuffer(doubles, 0, 8);
                        var uint8arry = buffer.getUint8Array(0, 8);
                        for (var i = 0; i < uint8arry.length; i++) {
                            doubles.writeByte(uint8arry[i]);
                        }
                        doubles.endian = Laya.Byte.LITTLE_ENDIAN;
                        return doubles.getFloat64();
                    }
                case 'string':
                    var length_1 = this.decodeUInt32(buffer);
                    return buffer.readUTFBytes(length_1);
                default:
                    var proto = protos && (protos.__messages[type] || this._servers['message ' + type]);
                    if (proto) {
                        var len = this.decodeUInt32(buffer);
                        var buf = void 0;
                        if (len) {
                            buf = new Laya.Byte();
                            // buffer.writeArrayBuffer(buf, 0, len);
                            var uint8arry = buffer.getUint8Array(0, len);
                            for (var i = 0; i < uint8arry.length; i++) {
                                buf.writeByte(uint8arry[i]);
                            }
                        }
                        return len ? Protobuf.decodeProtos(proto, buf) : false;
                    }
                    break;
            }
        };
        Protobuf.isSimpleType = function (type) {
            return (type === 'uInt32' ||
                type === 'sInt32' ||
                type === 'int32' ||
                type === 'uInt64' ||
                type === 'sInt64' ||
                type === 'float' ||
                type === 'double');
        };
        Protobuf.encodeArray = function (array, proto, protos, buffer) {
            var isSimpleType = this.isSimpleType;
            if (isSimpleType(proto.type)) {
                // buffer.writeArrayBuffer(this.encodeTag(proto.type, proto.tag));
                // buffer.writeArrayBuffer(this.encodeUInt32(array.length));
                Pomelo.writeBytes(this.encodeTag(proto.type, proto.tag), buffer);
                Pomelo.writeBytes(this.encodeUInt32(array.length), buffer);
                var encodeProp = this.encodeProp;
                for (var i = 0; i < array.length; i++) {
                    encodeProp(array[i], proto.type, protos, buffer);
                }
            }
            else {
                var encodeTag = this.encodeTag;
                for (var j = 0; j < array.length; j++) {
                    // buffer.writeArrayBuffer(encodeTag(proto.type, proto.tag));
                    Pomelo.writeBytes(this.encodeTag(proto.type, proto.tag), buffer);
                    this.encodeProp(array[j], proto.type, protos, buffer);
                }
            }
        };
        Protobuf.decodeArray = function (array, type, protos, buffer) {
            var isSimpleType = this.isSimpleType;
            var decodeProp = this.decodeProp;
            if (isSimpleType(type)) {
                var length_2 = this.decodeUInt32(buffer);
                for (var i = 0; i < length_2; i++) {
                    array.push(decodeProp(type, protos, buffer));
                }
            }
            else {
                array.push(decodeProp(type, protos, buffer));
            }
        };
        Protobuf.encodeUInt32 = function (n) {
            var result = new Laya.Byte();
            do {
                var tmp = n % 128;
                var next = Math.floor(n / 128);
                if (next !== 0) {
                    tmp = tmp + 128;
                }
                result.writeByte(tmp);
                n = next;
            } while (n !== 0);
            return result;
        };
        Protobuf.decodeUInt32 = function (buffer) {
            var n = 0;
            for (var i = 0; i < buffer.length; i++) {
                var m = buffer.getUint8();
                n = n + ((m & 0x7f) * Math.pow(2, (7 * i)));
                if (m < 128) {
                    return n;
                }
            }
            return n;
        };
        Protobuf.encodeSInt32 = function (n) {
            n = n < 0 ? (Math.abs(n) * 2 - 1) : n * 2;
            return this.encodeUInt32(n);
        };
        Protobuf.decodeSInt32 = function (buffer) {
            var n = this.decodeUInt32(buffer);
            var flag = ((n % 2) === 1) ? -1 : 1;
            n = ((n % 2 + n) / 2) * flag;
            return n;
        };
        Protobuf.encodeFloat = function (value) {
            var floats = new Laya.Byte;
            floats.endian = Laya.Byte.LITTLE_ENDIAN;
            floats.writeFloat32(value);
            return floats;
        };
        Protobuf.encodeDouble = function (value) {
            var floats = new Laya.Byte;
            floats.endian = Laya.Byte.LITTLE_ENDIAN;
            floats.writeFloat64(value);
            return floats;
        };
        Protobuf.TYPES = {
            uInt32: 0,
            sInt32: 0,
            int32: 0,
            double: 1,
            string: 2,
            message: 2,
            float: 5
        };
        Protobuf._clients = {};
        Protobuf._servers = {};
        return Protobuf;
    }());
    var Routedic = /** @class */ (function () {
        function Routedic() {
        }
        Routedic.init = function (dict, pomelo) {
            this._names = dict || {};
            var _names = this._names;
            var _ids = this._ids;
            for (var name_3 in _names) {
                var id = _names[name_3];
                _ids[id] = name_3;
                var names = name_3.split('.');
                var current = this._handlers;
                // for (let i = 0; i < names.length; i++) {
                //     let subName = names[i];
                //     // last one
                //     if (i == names.length - 1) {
                //         current[subName] = function () {
                //             let n = name;
                //             let fn = async (msg: Object) => {
                //                 return new Promise<Object>((resolve, reject) => {
                //                     if (!pomelo.request(n, msg, (ret: any) => {
                //                         resolve(ret);
                //                     })) {
                //                         reject('route not found:' + name);
                //                     }
                //                 });
                //             };
                //             //事件必须以on开头
                //             if(subName.indexOf('on') == 0) {
                //                 let ev = <any>fn;
                //                 ev.on = function(cb: Function) {
                //                     pomelo.on('$' + n, cb);
                //                 };
                //                 ev.once = function(cb: Function) {
                //                     let fn = function(args: any) {
                //                         cb(args);
                //                         pomelo.removeAllListeners('$' + n, fn);
                //                     };
                //                     pomelo.on('$' + n, fn);
                //                 };
                //                 ev.clear = function(cb: Function) {
                //                     pomelo.removeAllListeners('$' + n, cb);
                //                 };
                //             }
                //             return fn;
                //         }();
                //     }
                //     else {
                //         if (!current[subName]) {
                //             current[subName] = {};
                //             current = current[subName];
                //         }
                //         else {
                //             current = current[subName];
                //         }
                //     }
                // }
            }
        };
        Routedic.getID = function (name) {
            return this._names[name];
        };
        Routedic.getName = function (id) {
            return this._ids[id];
        };
        Routedic._ids = {};
        Routedic._names = {};
        Routedic._handlers = {};
        return Routedic;
    }());
})(game || (game = {}));
//# sourceMappingURL=PomeloForLaya.js.map