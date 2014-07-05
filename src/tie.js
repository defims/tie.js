/*
 * todo:
 * watch path, .i.e obj.path.to.value
 * */
;(function(win ,doc) {

    /*
     * Copyright 2012 The Polymer Authors. All rights reserved.
     * Use of this source code is governed by a BSD-style
     * license that can be found in the LICENSE file.
     * https://github.com/Polymer/WeakMap/blob/master/weakmap.js
     */

    if (typeof WeakMap === 'undefined') {
      (function() {
        var defineProperty = Object.defineProperty;
        var counter = Date.now() % 1e9;

        var WeakMap = function() {
          this.name = '__st' + (Math.random() * 1e9 >>> 0) + (counter++ + '__');
        };

        WeakMap.prototype = {
          set: function(key, value) {
            var entry = key[this.name];
            if (entry && entry[0] === key)
              entry[1] = value;
            else
              defineProperty(key, this.name, {value: [key, value], writable: true});
          },
          get: function(key) {
            var entry;
            return (entry = key[this.name]) && entry[0] === key ?
                entry[1] : undefined;
          },
          "delete": function(key) {
            this.set(key, undefined);
          }
        };

        window.WeakMap = WeakMap;
      })();
    }


    /*
     * =watch
     */
    function watch(obj ,prop ,handler) {
        try{//ignore if configure is false
            var  defineProperty = Object.defineProperty
                ,handlers = obj.__tie__handlers__
                ,watchers = obj.__tie__watchers__
                ;
            //handlers
            if(!handlers) {
                handlers = {};
                defineProperty(obj ,"__tie__handlers__" ,{
                    value: handlers
                    ,enumerable: false
                    ,configurable: true
                })
            }
            if(prop in handlers) {
                handlers[prop].push(handler);
            }
            else {
                handlers[prop] = [handler];
            }
            //watchers signal
            if(!watchers) {
                watchers = {};
                defineProperty(obj ,"__tie__watchers__" ,{
                    value: watchers
                    ,enumerable: false
                    ,configurable: true
                })
            }
            var  descriptor = Object.getOwnPropertyDescriptor(obj ,prop)
                ,o = {}
                ;
            //如果已有getter 和 setter则储存，可以形成链
            if(!watchers[prop]  && descriptor && descriptor.get) {
                defineProperty(o ,prop ,descriptor);
            }
            else {
                o[prop] = obj[prop];
            }
            defineProperty(obj ,prop ,{//defineProperty针对移动设备支持率很高
                 get: function() {
                    return o[prop];
                }
                ,set: function(val) {
                    var  oldVal = o[prop]
                        ,i ,handler
                        ;
                    o[prop] = val;
                    for(i=0; handler = handlers[prop][i]; i++) {
                        handler(obj ,prop ,val ,oldVal);
                    }
                }
                ,enumerable: true
                ,configurable: true
            });
            //设定标识
            watchers[prop] = true;
        }catch(e) {}
    }
    ////test
    //var a = {b:1}
    //watch(a ,"b" ,function(obj ,prop ,val ,oldVal) {
    //    console.log("first" ,val)
    //})
    //a.b = 2;
    //watch(a ,"b" ,function(obj ,prop ,val ,oldVal) {
    //    console.log("second" ,val)
    //})
    //a.b = 3;
    //console.log(a)


    /*
     * =unwatch
     */
    function unwatch(obj ,prop ,handler) {//todo
    }


    /*
     * =eachElement
     */
    function eachElement(elements ,callback) {
        if(elements) {
            if(!("length" in elements)) {
                elements = [elements];
            }
            ;[].forEach.call(elements ,callback);//forEach移动支持度很高
        }
    }


    /*
     * =directives
     */
    var directives = {}
        ,events = new WeakMap
        ;
    directives.event = function(directives ,element ,val ,oldVal) {
        var that = this
            ,evt = directives[0]
            ,fn ,oldFn
            ;
        if(oldVal && (oldFn = events.get(oldVal))) {
            element.removeEventListener(evt ,oldFn);
        }
        if(typeof(val) == "function") {
            fn = function(e) {
                val.call(that ,this ,e);
            }
            events.set(val ,fn);
            element.addEventListener(evt ,fn);
        }
    }
    //class指令，删除旧的css class，增加新的css class
    directives.class = function(directives ,element ,val ,oldVal) {
        if(oldVal) {
            element.classList.remove(oldVal);
        }
        if(val) {
            element.classList.add(val);
        }
    }

    /*
     * =tie
     * @about 绑定对象
     */
    function Tie() {
        var that = this;
        that.object = null;
        that.property = null;
        that.elementPoint = null;
        that.directive = null;
    }


    /*
     * =win.TIE
     * @about 绑定
     * @usage TIE(obj ,elementPoint ,prop ,directive)
     *        element = elementPoint[prop]
     *        value = obj[prop]
     *        element[directive] = value ,某些指令可能特殊处理具体看directives，
     *        使用引用实现简易DI
     */
    win.TIE = function(obj ,prop ,elementPoint ,elementProp ,directive) {
        var that = this;

        //绑定
        var tie = new Tie;
        tie.object = obj;
        tie.property = prop;
        tie.elementPoint = elementPoint;
        tie.elementProperty = elementProp;

        //更新函数
        function update(obj ,prop ,val ,oldVal) {
            var drctvtp = typeof(directive)
                ,elements = tie.elementPoint[tie.elementProperty]
                ;
            if(drctvtp == "string") {
                var drctvs = directive.split(".");
                eachElement(elements ,function(element) {

                    //判断是否系统渲染指令
                    var  system = true
                        ,obj = element
                        ,len = drctvs.length - 1
                        ,drctv = drctvs[len]
                        ,i ,item
                        ;
                    for(i=0; i<len; i++) {
                        item = drctvs[i];
                        if(!(item in obj)) {
                            system = false;
                            break;
                        }
                        obj = obj[item];
                    }
                    if(system && (drctv in obj)) {//执行系统渲染指令
                        obj[drctv] = val;
                    }
                    else {//如果是tie预置渲染指令则执行
                        item = drctvs.shift();
                        if(item in directives && typeof(directives[item]) == "function") {
                            directives[item].call(that ,drctvs ,element ,val ,oldVal);
                        }
                    }
                });
            }else if(drctvtp == "function") {//使用自定义渲染指令
                eachElement(elements ,function(element) {
                    directive.call(that ,element ,val ,oldVal);
                });
            }
        }

        //后续触发
        watch(tie.object ,tie.property ,update);//监测值变化
        watch(tie.elementPoint ,tie.elementProperty ,function() {//监测dom变化
            update(tie.object ,tie.property ,tie.object[tie.property]);
        });

        //首次触发
        update();

        return tie;
    }


    /*
     * =win.UNTIE
     * @about 取消绑定
     */
    win.UNTIE = function() {//todo
    }

})(window ,document);
