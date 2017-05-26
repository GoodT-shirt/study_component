var zmm = {
    _modules: {},
    _configs: {
        // 用于拼接相对路径
        basePath: (function (path) {
            //debugger;
            if (path.charAt(path.length - 1) === '/') {
                path = path.substr(0, path.length - 1);
            }
            var aaa = path.substr(path.indexOf(location.host) + location.host.length + 1);
            return aaa;
        })(location.href),
        // 用于拼接相对根路径
        host: location.protocol + '//' + location.host + '/'
    }
};
//解释字符串的话要用正则表达式
zmm.hasModule = function (_uri) {
    // 判断是否已有该模块，不论加载中或已加载好
    return this._modules.hasOwnProperty(_uri);
};
zmm.isModuleLoaded = function (_uri) {
    // 判断该模块是否已加载好
    return !!this._modules[_uri];       //!!是为了返回布尔值
};
zmm.pushModule = function (_uri) {
    // 新模块占坑，但此时还未加载完成，表示加载中；防止重复加载
    if (!this._modules.hasOwnProperty(_uri)) {
        this._modules[_uri] = null;
    }
};
zmm.installModule = function (_uri, mod) {
    this._modules[_uri] = mod;
};
zmm.load = function (uris) {
    var i, nsc;
    for (i = 0; i < uris.length; i++) {
        if (!this.hasModule(uris[i])) {
            this.pushModule(uris[i]);
            // 开始加载
            var nsc = document.createElement('script');
            nsc.src = uris[i];
            document.head.appendChild(nsc);
        }
    }
};
zmm.resolvePath = function (path) {
    // 返回绝对路径
    var res = '', paths = [], resPaths;
    if (path.match(/.*:\/\/.*/)) {
        // 绝对路径
        res = path.match(/.*:\/\/.*?\//)[0]; // 协议+域名
        path = path.substr(res.length);
    } else if (path.charAt(0) === '/') {
        // 相对根路径 /开头
        res = this._configs.host;
        path = path.substr(1);
    } else {
        // 相对路径 ./或../开头或直接文件名
        res = this._configs.host;
        resPaths = this._configs.basePath.split('/');
    }
    resPaths = resPaths || [];
    paths = path.split('/');
    for (var i = 0; i < paths.length; i++) {
        if (paths[i] === '..') {
            resPaths.pop();
        } else if (paths[i] === '.') {
            // do nothing
        } else {
            resPaths.push(paths[i]);
        }
    }
    res += resPaths.join('/');
    return res;
};
var define = zmm.define = function (dependPaths, fac) {
    var _uri = document.currentScript.src;
    if (zmm.isModuleLoaded(_uri)) {
        return;
    }
    var factory, depPaths, uris = [];
    //debugger;
    if (arguments.length === 1) {
        factory = arguments[0];
        // 挂载到模块组中
        zmm.installModule(_uri, factory());
        // 告诉proxy该_uri模块已装载好，记住每一个模块都是一个define函数调用，模块一装载，define就执行
        zmm.proxy.emit(_uri);
    } else {
        // 有依赖的情况
        factory = arguments[1];
        // a.js的成功装载会调用emit函数，从而会检查任务栈。
        //如果某任务的依赖都装载完成，则执行该任务的回调
        zmm.use(arguments[0], function () {     //此函数被execute执行
            zmm.installModule(_uri, factory.apply(null, arguments));
            zmm.proxy.emit(_uri);
        });
    }
};
zmm.use = function (paths, callback) {
    if (!Array.isArray(paths)) {
        paths = [paths];
    }
    var uris = [], i;
    for (i = 0; i < paths.length; i++) {        //把所有依赖都压入栈中
        uris.push(this.resolvePath(paths[i]));
    }
    // 检查zmm和任务栈
    this.proxy.watch(uris, callback);
    //加载模块
    this.load(uris);
};
zmm.proxy = function () {
    var proxy = {};
    var taskId = 0;
    var taskList = {};
    var execute = function (task) {
        var uris = task.uris,
            callback = task.callback;
        for (var i = 0, arr = []; i < uris.length; i++) {
            arr.push(zmm._modules[uris[i]]);        //把依赖的模块压入参数数组arr中
        }
        callback.apply(null, arr);
    };
    /*
    此函数应完成的功能是，查看是谁订阅了该事件，订阅了该事件的对象
    可以执行自己的导出了。 的
     */
    var deal_loaded = function (_uri) {
        var i, k, task, sum;
        //debugger;
        // 当一个模块加载完成时，遍历当前任务栈
        for (k in taskList) {                       //能找到它（可能在对象上，也可能在原型链上)
            if (!taskList.hasOwnProperty(k)) {      //在原型链上，但不在本身上
                continue;                           //继续遍历
            }
            task = taskList[k];
            if (task.uris.indexOf(_uri) > -1) {     //该task模块依赖_uri模块
                // 查看这个任务中的所有依赖模块是否都已加载好
                for (i = 0, sum = 0; i < task.uris.length; i++) {
                    if (zmm.isModuleLoaded(task.uris[i])) {
                        sum++;
                    }
                }
                if (sum === task.uris.length) {
                    // 都加载完成 删除任务
                    delete(taskList[k]);           //删除这个任务k
                    execute(task);
                }
            }
        }
    };
    proxy.watch = function (uris, callback) {
        // 先检查一遍是否都加载好了
        for (var i = 0, sum = 0; i < uris.length; i++) {
            if (zmm.isModuleLoaded(uris[i])) {
                sum++;
            }
        }
        //如果所有依赖都己加载完成(比如myown依赖的a己加载 ，则直接执行新模块myown)
        if (sum === uris.length) {
            execute({
                uris: uris,
                callback: callback
            });
        } else {//否则就要添加任务（或说注册任务)
            // 订阅新加载任务,比如myown依赖a,b模块，则要有两个任务，分别是加载a和b
            //这就相当于注册任务
            var task = {
                uris: uris,
                callback: callback
            };
            //这个新任务的依赖为uris，它本身要导出的变量则在callback中
            taskList['' + taskId] = task;
            taskId++;
        }
    };
    proxy.emit = function (_uri) {
        console.log(_uri + ' is loaded!');
        deal_loaded(_uri);
    };
    return proxy;
}();