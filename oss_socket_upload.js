// 注意：这里的示例加入了译者自己的理解，如果觉得不通，可以查看官网示例
// 流程应该是这样的：
// 1.客户端触发了 'ferret' 事件，发送数据 'tobi' 给服务器，
//   并注册了一个回调 function(data){...} 以等待服务端的回执（acknowledgement）
// 2.服务端响应 'ferret' 事件，并在适当的时候调用 cb() ,为客户端返回回执，
//   这里的 'woot' 可有可无，如果没有，那么客户端回调中的 data 就是 undefined
// 3.客户端收到回执 ，执行预先注册的回调 function(data){...} 
let io = require('socket.io')(9090)
let path = require("path")
let OSS = require('ali-oss')
let fs = require('fs')
let { dirExists } = require('./file.js')
// 判断系统是ox系统、window系统
let base = process.platform === 'darwin' ? '/Users/admin/Downloads/' : path.join('C\:\/Users\/****\/Downloads\/')
let fileName = ''
let destPath = ''
let sourceFile = ''
let emits = []

// 目录转移函数
function mvDir() {
    fs.rename(sourceFile, destPath, function (err) {
        if (err) throw err;
        fs.stat(destPath, function (err, stats) {
            if (err) throw err;
            console.log('stats: ' + JSON.stringify(stats));
        });
    });
}

function changeFile() {
    // 判断文件上传是否成功，成功后即迁移文件
    let names = fs.readdirSync(base)
    let modifyFiles = names.filter(e => {
        let arr = e.split('.')
        return arr[0] != "" && arr.length > 1
    })
    let tt = modifyFiles.map(e => {
        return {
            name: e,
            ctime: fs.statSync(base + e).ctime
        }
    }).sort((a, b) => (a.ctime < b.ctime ? 1 : -1))
    // 检索当前目录最新文件
    fileName = tt.length && tt[0].name || ""
    destPath = path.join(base, "uploaded", fileName);
    sourceFile = path.join(base, fileName);
}

async function init() {

    // 判断文件目录是否存在 不存在即创建
    await dirExists(base + 'uploaded')

}

init()

const headers = {
    // 指定该Object被下载时网页的缓存行为。
    // 'Cache-Control': 'no-cache', 
    // 指定该Object被下载时的名称。
    // 'Content-Disposition': 'oss_download.txt', 
    // 指定该Object被下载时的内容编码格式。
    // 'Content-Encoding': 'UTF-8', 
    // 指定过期时间。
    // 'Expires': 'Wed, 08 Jul 2022 16:57:01 GMT', 
    // 指定Object的存储类型。
    // 'x-oss-storage-class': 'Standard', 
    // 指定Object的访问权限。
    // 'x-oss-object-acl': 'private', 
    // 设置Object的标签，可同时设置多个标签。
    // 'x-oss-tagging': 'Tag1=1&Tag2=2', 
    // 指定CopyObject操作时是否覆盖同名目标Object。此处设置为true，表示禁止覆盖同名Object。
    // 'x-oss-forbid-overwrite': 'true', 
};

async function put() {
    let isOk = sourceFile && await !fs.existsSync(sourceFile)
    if (!fileName || !sourceFile || isOk) {
        return Promise.reject(false)
    }
    let client = new OSS({
        // yourregion填写Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou。
        region: 'cn-east-3',
        // 阿里云账号AccessKey拥有所有API的访问权限，风险很高。强烈建议您创建并使用RAM用户进行API访问或日常运维，请登录RAM控制台创建RAM用户。
        accessKeyId: '***',
        accessKeySecret: '****',
        // 填写Bucket名称。关于Bucket名称命名规范的更多信息，请参见Bucket。
        bucket: '***-test',
    });

    try {
        await client.put(fileName, path.normalize(sourceFile), { headers })
        return Promise.resolve(true)
    } catch (e) {
        return Promise.reject(false)
    }

}

io.on('connection', function (socket) {
    socket.on('ferret', function (name, cb) {
        console.log('name', name)
        if (!emits.includes(name)) {
            emits.push(name)
            // 获取目录信息
            changeFile()
            // 这里的回调 cb() 在服务器接收到消息后可以调用，以通知客户端服务器已接收消息；
            // 调用时还可以返回数据给客户端（这里是 'boolean'）
            put().then((res) => {
                if (res) {
                    // 目录迁移
                    mvDir()
                    // 清空文件上传请求
                    emits = []
                    cb(true)
                } else {
                    cb(false)
                }
            }, err => {
                cb(err)
            })
        }
    });

    // 服务端
    socket.on("close", data => {
        socket.disconnect(true);
    });

});

