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
module game{
   export class Pomelo {

        static DEBUG: boolean = true;
        static EVENT_IO_ERROR: string = 'io-error';
        static EVENT_CLOSE: string = 'close';
        static EVENT_KICK: string = 'onKick';
        static EVENT_HEART_BEAT_TIMEOUT: string = 'heartbeat timeout';

        private JS_WS_CLIENT_TYPE: string = 'js-websocket';
        private JS_WS_CLIENT_VERSION: string = '0.0.5';

        private RES_OK: number = 200;
        private RES_FAIL: number = 500;
        private RES_OLD_CLIENT: number = 501;


        private socket: Laya.Socket;
        private callbacks: any = {};
        private handlers: any = {};
        // Map from request id to route
        private routeMap: any = {};

        private heartbeatInterval: number = 0;
        private heartbeatTimeout: number = 0;
        private nextHeartbeatTimeout: number = 0;
        private gapThreshold: number = 100;
        private heartbeatId: any = null;
        private heartbeatTimeoutId: any = null;

        private handshakeCallback: any = null;
        private handshakeBuffer: any;
        private initCallback: Function | null;

        private _callbacks: any = {};

        private reqId: number = 0;

        // public get serverHandlers(): serverHandlers {
        //     return <serverHandlers>Routedic._handlers;
        // }

        private _package: IPackage;
        private _message: IMessage;

        constructor() {
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
                'user': {
                }
            };

            this.initCallback = null;

            this.reqId = 0;

            this.handlers[Package.TYPE_HANDSHAKE] = this.handshake;
            this.handlers[Package.TYPE_HEARTBEAT] = this.heartbeat;
            this.handlers[Package.TYPE_DATA] = this.onData;
            this.handlers[Package.TYPE_KICK] = this.onKick;
        }


        public init(params: any, cb: Function): void {
            console.log('init', params);
            this.initCallback = cb;
            let host = params.host;
            let port = params.port;
            //
            //var url = 'ws://' + host;
            //if(port) {
            //    url +=  ':' + port;
            //}

            this.handshakeBuffer.user = params.user;
            this.handshakeCallback = params.handshakeCallback;
            this.initWebSocket(host, port, cb);
        }
        private initWebSocket(host: string, port: number, cb: Function): void {
            console.log('[Pomelo] connect to:', host, port);

            if(this.socket) {
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
        }


        public on(event: any, fn: Function) {
            (this._callbacks[event] = this._callbacks[event] || []).push(fn);
        }
        public request(route: string, msg: any, cb: Function) {
            if (arguments.length === 2 && typeof msg === 'function') {
                cb = msg;
                msg = {};
            } else {
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
            let reqId = this.reqId;


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
        }

        public notify(route: string, msg: any): void {
            this.sendMessage(0, route, msg);
        }

        private onMessage(event: Laya.Event): void {
            if (event instanceof ArrayBuffer) {
                let byte: Laya.Byte = new Laya.Byte(event);
                this.socket.input.clear();
                this.processPackage(this._package.decode(byte));
            }

        }
        private sendMessage(reqId: number, route: string, msg: any) {
            let byte: Laya.Byte;

            // var msgbuffer = Protocol.strencode(JSON.stringify(msg));
            // console.log("msgbuffer",msgbuffer);
            let msgbuffer = this._message.encode(reqId, route, msg);
            byte = this._package.encode(Package.TYPE_DATA, msgbuffer);
            this.send(byte);

        }

        private onConnect(e: Laya.Event): void {
            console.log('[Pomelo] connect success', e);
            this.send(this._package.encode(Package.TYPE_HANDSHAKE, Protocol.strencode(JSON.stringify(this.handshakeBuffer))));
        }

        private onClose(e: Laya.Event): void {
            console.error('[Pomelo] connect close:', e);
            this.emit(Pomelo.EVENT_CLOSE, e);
        }

        private onIOError(e: Laya.Event): void {
            this.emit(Pomelo.EVENT_IO_ERROR, e);
            console.error('socket error: ', e);
        }

        private onKick(event: any) {
            this.emit(Pomelo.EVENT_KICK, event);
        }
        private onData(data: any) {
            //probuff decode
            let msg = this._message.decode(data);

            if (msg.id > 0) {
                msg.route = this.routeMap[msg.id];
                delete this.routeMap[msg.id];
                if (!msg.route) {
                    return;
                }
            }

            //msg.body = this.deCompose(msg);

            this.processMessage(msg);

        }

        private processMessage(msg: any) {
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
            let cb = this.callbacks[msg.id];

            delete this.callbacks[msg.id];
            if (typeof cb !== 'function') {
                return;
            }
            if (msg.body && msg.body.code == 500) {
                let obj: any = { 'code': 500, 'desc': '服务器内部错误', 'key': 'INTERNAL_ERROR' };
                msg.body.error = obj;
            }
            cb(msg.body);
            return;
        }

        private heartbeat(data: any) {

            if (!this.heartbeatInterval) {
                // no heartbeat
                return;
            }

            let obj = this._package.encode(Package.TYPE_HEARTBEAT);
            if (this.heartbeatTimeoutId) {
                Laya.timer.clear(this, this.heartbeatTimeoutId);
                this.heartbeatTimeoutId = null;
            }

            if (this.heartbeatId) {
                // already in a heartbeat interval
                return;
            }


            let self = this;
            self.heartbeatId = Laya.timer.once(self.heartbeatInterval, self,
                function () {
                    self.heartbeatId = null;
                    self.send(obj);

                    self.nextHeartbeatTimeout = Date.now() + self.heartbeatTimeout;
                    self.heartbeatTimeoutId = self.heartbeatTimeoutCb.bind(self, data);
                    Laya.timer.once(self.heartbeatTimeout, self, self.heartbeatTimeoutCb.bind(self, data));
                });
        }

        private heartbeatTimeoutCb(data: any) {
            let gap = this.nextHeartbeatTimeout - Date.now();
            if (gap > this.gapThreshold) {
                this.heartbeatTimeoutId = Laya.timer.once(gap, this, this.heartbeatTimeoutCb, );
            } else {
                console.error('server heartbeat timeout', data);
                this.emit(Pomelo.EVENT_HEART_BEAT_TIMEOUT, data);
                this._disconnect();
            }
        }
        public off(event?: any, fn?: any) {
            this.removeAllListeners(event, fn);
        }
        public removeAllListeners(event?: any, fn?: any) {
            // all
            if (0 == arguments.length) {
                this._callbacks = {};
                return;
            }

            // specific event
            let callbacks = this._callbacks[event];
            if (!callbacks) {
                return;
            }

            // remove all handlers
            if (event && !fn) {
                delete this._callbacks[event];
                return;
            }

            // remove specific handler
            let i = this.index(callbacks, fn._off || fn);
            if (~i) {
                callbacks.splice(i, 1);
            }
            return;
        }
        private index(arr: any, obj: any) {
            if ([].indexOf) {
                return arr.indexOf(obj);
            }

            for (let i = 0; i < arr.length; ++i) {
                if (arr[i] === obj)
                    return i;
            }
            return -1;
        }
        public disconnect(): void {
            this._disconnect();
        }
        private _disconnect(): void {
            console.warn('[Pomelo] client disconnect ...');

            if (this.socket && this.socket.connected) this.socket.close();
            this.socket = null;
            if (this.heartbeatId) {
                Laya.timer.clear(this, this.heartbeatId);
                this.heartbeatId = null;
            }

            if (this.heartbeatTimeoutId) {
                Laya.timer.clear(this, this.heartbeatTimeoutId);
                this.heartbeatTimeoutId = null;
            }

        }
        private processPackage(msg: any): void {
            this.handlers[msg.type].apply(this, [msg.body]);
        }
        private handshake(resData: any) {

            let data = JSON.parse(Protocol.strdecode(resData));
            if (data.code === this.RES_OLD_CLIENT) {
                this.emit(Pomelo.EVENT_IO_ERROR, 'client version not fullfill');
                return;
            }

            if (data.code !== this.RES_OK) {
                this.emit(Pomelo.EVENT_IO_ERROR, 'handshake fail');
                return;
            }

            this.handshakeInit(data);

            let obj = this._package.encode(Package.TYPE_HANDSHAKE_ACK);
            this.send(obj);
            if (this.initCallback) {
                this.initCallback(data);
                this.initCallback = null;
            }
        }
        private handshakeInit(data: any): void {

            if (data.sys) {
                Routedic.init(data.sys.dict, this);
                Protobuf.init(data.sys.protos);
            }
            if (data.sys && data.sys.heartbeat) {
                this.heartbeatInterval = data.sys.heartbeat * 1000;   // heartbeat interval
                this.heartbeatTimeout = this.heartbeatInterval * 2;        // max heartbeat timeout
            } else {
                this.heartbeatInterval = 0;
                this.heartbeatTimeout = 0;
            }

            if (typeof this.handshakeCallback === 'function') {
                this.handshakeCallback(data.user);
            }
        }
        private send(byte: Laya.Byte): void {

            if (this.socket && this.socket.connected) {
                let byteArray: ArrayBuffer = new ArrayBuffer(byte.length);
                byte.pos = 0;
                let bytestr = 'length:' + byte.length + '[';
                for (let i = 0; i < byte.length; i++) {
                    let rbyte = byte.readByte();
                    this.socket.output.writeByte(rbyte);
                    if (i == byte.length - 1) {
                        bytestr += rbyte + '';
                    } else {
                        bytestr += rbyte + ',';
                    }
                }
                bytestr += ']';
                // console.log("send :"+bytestr);
                this.socket.flush();
            }
        }
        //private deCompose(msg){
        //    return JSON.parse(Protocol.strdecode(msg.body));
        //}
        private emit(event: string, ...args: any[]) {
            let params = [].slice.call(arguments, 1);
            let callbacks = this._callbacks[event];

            if (callbacks) {
                callbacks = callbacks.slice(0);
                for (let i = 0, len = callbacks.length; i < len; ++i) {
                    callbacks[i].apply(this, params);
                }
            }

            return this;
        }

        /**
         *
         * 写入Laya.Byte
         * @param(Laya.Byte) 需要写入的Laya.Byte
         * @param(Laya.Byte) 写入的Laya.Byte
         *
         */
        public static writeBytes(fromByte: Laya.Byte, toByte: Laya.Byte) {
            fromByte.pos = 0;
            for (let i = 0; i < fromByte.length; i++) {
                let rbyte = fromByte.getByte();
                toByte.writeByte(rbyte);
            }
        }

    }

    class Package implements IPackage {
        static TYPE_HANDSHAKE: number = 1;
        static TYPE_HANDSHAKE_ACK: number = 2;
        static TYPE_HEARTBEAT: number = 3;
        static TYPE_DATA: number = 4;
        static TYPE_KICK: number = 5;

        public encode(type: number, body?: Laya.Byte) {
            let length: number = body ? body.length : 0;

            let buffer: Laya.Byte = new Laya.Byte();
            buffer.writeByte(type & 0xff);
            buffer.writeByte((length >> 16) & 0xff);
            buffer.writeByte((length >> 8) & 0xff);
            buffer.writeByte(length & 0xff);

            if (body)
                Pomelo.writeBytes(body, buffer);

            return buffer;
        }
        public decode(buffer: Laya.Byte) {

            let type: number = buffer.getUint8();
            let len: number = (buffer.getUint8() << 16 | buffer.getUint8() << 8 | buffer.getUint8()) >>> 0;

            let body: Laya.Byte;

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
        }
    }

    class Message implements IMessage {

        public static MSG_FLAG_BYTES: number = 1;
        public static MSG_ROUTE_CODE_BYTES: number = 2;
        public static MSG_ID_MAX_BYTES: number = 5;
        public static MSG_ROUTE_LEN_BYTES: number = 1;

        public static MSG_ROUTE_CODE_MAX: number = 0xffff;

        public static MSG_COMPRESS_ROUTE_MASK: number = 0x1;
        public static MSG_TYPE_MASK: number = 0x7;

        static TYPE_REQUEST: number = 0;
        static TYPE_NOTIFY: number = 1;
        static TYPE_RESPONSE: number = 2;
        static TYPE_PUSH: number = 3;

        constructor(private routeMap: any) {

        }

        public encode(id: number, route: string, msg: any) {
            let buffer: Laya.Byte = new Laya.Byte();

            let type: number = id ? Message.TYPE_REQUEST : Message.TYPE_NOTIFY;

            let byte: Laya.Byte = Protobuf.encode(route, msg) || Protocol.strencode(JSON.stringify(msg));

            let rot: any = Routedic.getID(route) || route;

            buffer.writeByte((type << 1) | ((typeof (rot) == 'string') ? 0 : 1));

            if (id) {
                // 7.x
                do {
                    let tmp: number = id % 128;
                    let next: number = Math.floor(id / 128);

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
        }

        public decode(buffer: Laya.Byte): any {
            // parse flag
            let flag: number = buffer.getUint8();
            let compressRoute: number = flag & Message.MSG_COMPRESS_ROUTE_MASK;
            let type: number = (flag >> 1) & Message.MSG_TYPE_MASK;
            let route: any;

            // parse id
            let id: number = 0;
            if (type === Message.TYPE_REQUEST || type === Message.TYPE_RESPONSE) {
                // 7.x
                let i: number = 0;
                let m: number;
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
                    let routeLen: number = buffer.getUint8();
                    route = routeLen ? buffer.readUTFBytes(routeLen) : '';
                }
            }
            else if (type === Message.TYPE_RESPONSE) {
                route = this.routeMap[id];
            }

            if (!id && !(typeof (route) == 'string')) {
                route = Routedic.getName(route);
            }

            let body: any = Protobuf.decode(route, buffer) || JSON.parse(Protocol.strdecode(buffer));

            return { id: id, type: type, route: route, body: body };
        }

    }
    class Protocol {

        public static strencode(str: string): Laya.Byte {
            let buffer: Laya.Byte = new Laya.Byte();
            buffer.length = str.length;
            buffer.writeUTFBytes(str);
            return buffer;
        }

        public static strdecode(byte: Laya.Byte): string {
            return byte.readUTFBytes(byte.bytesAvailable);
        }
    }
    class Protobuf {
        static TYPES: any = {
            uInt32: 0,
            sInt32: 0,
            int32: 0,
            double: 1,
            string: 2,
            message: 2,
            float: 5
        };
        private static _clients: any = {};
        private static _servers: any = {};

        static init(protos: any): void {
            this._clients = protos && protos.client || {};
            this._servers = protos && protos.server || {};
        }

        static encode(route: string, msg: any): Laya.Byte {

            let protos: any = this._clients[route];

            if (!protos) return null;

            return this.encodeProtos(protos, msg);
        }

        static decode(route: string, buffer: Laya.Byte): any {

            let protos: any = this._servers[route];

            if (!protos) return null;

            return this.decodeProtos(protos, buffer);
        }
        private static encodeProtos(protos: any, msg: any): Laya.Byte {
            let buffer: Laya.Byte = new Laya.Byte();

            for (let name in msg) {
                if (protos[name]) {
                    let proto: any = protos[name];

                    switch (proto.option) {
                        case 'optional':
                        case 'required':
                            buffer.writeArrayBuffer(this.encodeTag(proto.type, proto.tag));
                            this.encodeProp(msg[name], proto.type, protos, buffer);
                            break;
                        case 'repeated':
                            if (!!msg[name] && msg[name].length > 0) {
                                this.encodeArray(msg[name], proto, protos, buffer);
                            }
                            break;
                    }
                }
            }

            return buffer;
        }
        static decodeProtos(protos: any, buffer: Laya.Byte): any {
            let msg: any = {};

            while (buffer.bytesAvailable) {
                let head: any = this.getHead(buffer);
                let name: string = protos.__tags[head.tag];

                switch (protos[name].option) {
                    case 'optional':
                    case 'required':
                        msg[name] = this.decodeProp(protos[name].type, protos, buffer);
                        break;
                    case 'repeated':
                        if (!msg[name]) {
                            msg[name] = [];
                        }
                        this.decodeArray(msg[name], protos[name].type, protos, buffer);
                        break;
                }
            }

            return msg;
        }

        static encodeTag(type: number, tag: number): Laya.Byte {
            let value: number = this.TYPES[type] != undefined ? this.TYPES[type] : 2;

            return this.encodeUInt32((tag << 3) | value);
        }
        static getHead(buffer: Laya.Byte): any {
            let tag: number = this.decodeUInt32(buffer);

            return { type: tag & 0x7, tag: tag >> 3 };
        }

        static encodeProp(value: any, type: string, protos: any, buffer: Laya.Byte): void {
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
                    let proto: any = protos.__messages[type] || this._clients['message ' + type];
                    if (!!proto) {
                        let buf: Laya.Byte = this.encodeProtos(proto, value);
                        // buffer.writeArrayBuffer(this.encodeUInt32(buf.length));
                        Pomelo.writeBytes(this.encodeUInt32(value.length), buffer);
                        buffer.writeArrayBuffer(buf);
                    }
                    break;
            }
        }

        static decodeProp(type: string, protos: any, buffer: Laya.Byte): any {
            switch (type) {
                case 'uInt32':
                    return this.decodeUInt32(buffer);
                case 'int32':
                case 'sInt32':
                    return this.decodeSInt32(buffer);
                case 'float':
                    {
                        let floats: Laya.Byte = new Laya.Byte();
                        // buffer.writeArrayBuffer(floats, 0, 4);
                        let uint8arry = buffer.getUint8Array(0, 4);
                        for (let i = 0; i < uint8arry.length; i++) {
                            floats.writeByte(uint8arry[i]);
                        }
                        floats.endian = Laya.Byte.LITTLE_ENDIAN;
                        let float: number = buffer.getFloat32();
                        return floats.getFloat32();
                    }
                case 'double':
                    {
                        let doubles: Laya.Byte = new Laya.Byte();
                        // buffer.writeArrayBuffer(doubles, 0, 8);
                        let uint8arry = buffer.getUint8Array(0, 8);
                        for (let i = 0; i < uint8arry.length; i++) {
                            doubles.writeByte(uint8arry[i]);
                        }
                        doubles.endian = Laya.Byte.LITTLE_ENDIAN;
                        return doubles.getFloat64();
                    }
                case 'string':
                    let length: number = this.decodeUInt32(buffer);
                    return buffer.readUTFBytes(length);
                default:
                    let proto: any = protos && (protos.__messages[type] || this._servers['message ' + type]);
                    if (proto) {
                        let len: number = this.decodeUInt32(buffer);
                        let buf: Laya.Byte;
                        if (len) {
                            buf = new Laya.Byte();
                            // buffer.writeArrayBuffer(buf, 0, len);
                            let uint8arry = buffer.getUint8Array(0, len);
                            for (let i = 0; i < uint8arry.length; i++) {
                                buf.writeByte(uint8arry[i]);
                            }
                        }

                        return len ? Protobuf.decodeProtos(proto, buf) : false;
                    }
                    break;
            }
        }


        static isSimpleType(type: string): boolean {
            return (
                type === 'uInt32' ||
                type === 'sInt32' ||
                type === 'int32' ||
                type === 'uInt64' ||
                type === 'sInt64' ||
                type === 'float' ||
                type === 'double'
            );
        }
        static encodeArray(array: Array<any>, proto: any, protos: any, buffer: Laya.Byte): void {
            let isSimpleType = this.isSimpleType;
            if (isSimpleType(proto.type)) {
                // buffer.writeArrayBuffer(this.encodeTag(proto.type, proto.tag));
                // buffer.writeArrayBuffer(this.encodeUInt32(array.length));
                Pomelo.writeBytes(this.encodeTag(proto.type, proto.tag), buffer);
                Pomelo.writeBytes(this.encodeUInt32(array.length), buffer);
                let encodeProp = this.encodeProp;
                for (let i: number = 0; i < array.length; i++) {
                    encodeProp(array[i], proto.type, protos, buffer);
                }
            } else {
                let encodeTag = this.encodeTag;
                for (let j: number = 0; j < array.length; j++) {
                    // buffer.writeArrayBuffer(encodeTag(proto.type, proto.tag));
                    Pomelo.writeBytes(this.encodeTag(proto.type, proto.tag), buffer);
                    this.encodeProp(array[j], proto.type, protos, buffer);
                }
            }
        }
        static decodeArray(array: Array<any>, type: string, protos: any, buffer: Laya.Byte): void {
            let isSimpleType = this.isSimpleType;
            let decodeProp = this.decodeProp;

            if (isSimpleType(type)) {
                let length: number = this.decodeUInt32(buffer);
                for (let i: number = 0; i < length; i++) {
                    array.push(decodeProp(type, protos, buffer));
                }
            } else {
                array.push(decodeProp(type, protos, buffer));
            }
        }

        static encodeUInt32(n: number): Laya.Byte {
            let result: Laya.Byte = new Laya.Byte();

            do {
                let tmp: number = n % 128;
                let next: number = Math.floor(n / 128);

                if (next !== 0) {
                    tmp = tmp + 128;
                }

                result.writeByte(tmp);
                n = next;
            }
            while (n !== 0);

            return result;
        }
        static decodeUInt32(buffer: Laya.Byte): number {
            let n: number = 0;

            for (let i: number = 0; i < buffer.length; i++) {
                let m: number = buffer.getUint8();
                n = n + ((m & 0x7f) * Math.pow(2, (7 * i)));
                if (m < 128) {
                    return n;
                }
            }
            return n;
        }
        static encodeSInt32(n: number): Laya.Byte {
            n = n < 0 ? (Math.abs(n) * 2 - 1) : n * 2;

            return this.encodeUInt32(n);
        }
        static decodeSInt32(buffer: Laya.Byte): number {
            let n: number = this.decodeUInt32(buffer);

            let flag: number = ((n % 2) === 1) ? -1 : 1;

            n = ((n % 2 + n) / 2) * flag;

            return n;
        }
        static encodeFloat(value: number): Laya.Byte {
            let floats: Laya.Byte = new Laya.Byte;
            floats.endian = Laya.Byte.LITTLE_ENDIAN;
            floats.writeFloat32(value);
            return floats;
        }
        static encodeDouble(value: number): Laya.Byte {
            let floats: Laya.Byte = new Laya.Byte;
            floats.endian = Laya.Byte.LITTLE_ENDIAN;
            floats.writeFloat64(value);
            return floats;
        }
    }
    class Routedic {
        private static _ids: any = {};
        private static _names: any = {};
        public static _handlers: any = {};

        static init(dict: any, pomelo: Pomelo): void {
            this._names = dict || {};
            let _names = this._names;
            let _ids = this._ids;
            for (let name in _names) {
                let id = _names[name];
                _ids[id] = name;

                let names = name.split('.');
                let current = this._handlers;
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


        }

        static getID(name: string) {
            return this._names[name];
        }
        static getName(id: number) {
            return this._ids[id];
        }
    }

    interface IMessage {
        /**
         * encode
         * @param id
         * @param route
         * @param msg
         * @return ByteArray
         */
        encode(id: number, route: string, msg: any): Laya.Byte;

        /**
         * decode
         * @param buffer
         * @return Object
         */
        decode(buffer: Laya.Byte): any;
    }
    interface IPackage {

        encode(type: number, body?: Laya.Byte): Laya.Byte;

        decode(buffer: Laya.Byte): any;
    }
}