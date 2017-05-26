/*
 只要通过这种形式就可以加载各个模块了，可以不用写<script>标签了
 http://www.runoob.com/w3cnote/requirejs-tutorial-1.html
 */
//require(["./a"]);
//zmm.use("../a.js");
//http://www.jb51.net/article/99337.htm
define(['../a.js', '../b.js'], function (ob1,ob2) {
    //ob是a.js模块的导出对象
    //alert(ob.a);
    //console.log("i'm loaded!");
    //alert("good");
    alert(ob1.a);
    alert(ob2.a);
    //define执行时，告诉eventProxy订阅a加载事件，加载好了就执行这个回调函数
    // 该回调函数存储myown的导出，表示myown模块也己经加载完毕，于emit事件myown己加载
});


//github for wndows的使用方法
//http://www.cnblogs.com/jiqing9006/p/3987702.html
//http://blog.csdn.net/jinzhencs/article/details/50442728
//github账号是QQ及密码
//要先提交到本地仓库，再提交到远程仓库
