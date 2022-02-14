const io = require('socket.io')(9090)
const path = require("path")
const ObsClient = require('esdk-obs-nodejs')
const fs = require('fs')
const { dirExists } = require('./file.js')
// 判断系统是ox系统、window系统
const base = process.platform === 'darwin' ? '/Users/admin/Downloads/' : path.join('C\:\/Users\/*****\/Downloads\/')
const config = {
    us: {
        access_key_id: '*****',
        secret_access_key: '*****',
        server: 'obs.cn-east-3.myhuaweicloud.com'
    }
}
let emits = []
let updateds = {}
// ----------  初始化: start --------------
async function init() {
    // 判断文件目录是否存在 不存在即创建
    await dirExists(base + 'uploaded')
}

init()
// ----------  初始化: end --------------

// ----------  文件处理: start --------------
/**
 * 文件名称调整 ｜ 目录迁移
 * @param {string} s 初始目录
 * @param {string} d 目标目录
 */
function mvDir(s, d) {
    return new Promise((resolve, reject) => {
        fs.rename(s, d, function (err) {
            if (err) return reject(false);
            fs.stat(d, function (err, stats) {
                if (err) return reject(false);
                console.log('stats: ' + JSON.stringify(stats))
                return resolve(true)
            })
        })
    })
}

/**
 * 变量名初始化
 * @returns {string} fname 最新文件名称
 * @returns {string} suffix 最新文件名称后缀
 */
function getFileToRename() {
    return new Promise((resolve, reject) => {
        // 判断文件上传是否成功，成功后即迁移文件
        let names = fs.readdirSync(base)
        let modifyFiles = names.filter(e => {
            let arr = e.split('.'); return arr[0] != "" && arr.length > 1
        })
        let tt = modifyFiles.map(e => ({
            name: e,
            ctime: fs.statSync(base + e).ctime
        })).sort((a, b) => (a.ctime < b.ctime ? 1 : -1))
        // 检索当前目录最新文件
        let fname = tt.length && tt[0].name || ""
        let fds = fname.split('.')
        let suffix = fds.length && fds[fds.length - 1];
        return resolve({fname, suffix})
    })
}
// ----------  文件处理: end --------------

// ----------  OBS: start --------------
/**
 * 
 * @param {string} key copyFileName
 * @returns 
 */
function put(key, sourceFile) {
    let client = new ObsClient(config.us);
    return new Promise((resolve, reject) => {
        client.putObject({
            Bucket: '***-test',
            Key: key.replace('--', '/'),
            // 创建文件流，其中sourceFile为待上传的本地文件路径，需要指定到具体的文件名
            Body: fs.createReadStream(sourceFile)
        }, (err, result) => {
            if (err) {
                console.error('Error-->' + err);
                return reject(false)
            } else {
                console.log('Status-->' + result.CommonMsg.Status);
                return resolve(true)
            }
        })
    })

}
// ----------  OBS: end --------------

// ----------  io: start --------------
io.on('connection', function (socket) {
    socket.on('ferret', function (name, cb) {
        console.log('name', name)
        if (!emits.includes(name)) {
            emits.push(name)
            // 获取文件信息以及后缀信息
            getFileToRename(name).then(({fname, suffix}) => {
                // name ---> xxxx
                // fname ---> aaaa.csv
                // suffix ---> csv
                const nfilename = `${name}.${suffix}`
                const s = path.join(base, fname)
                const d = path.join(base, nfilename)
                const u = path.join(base, 'uploaded', nfilename)
                // 文件名称调整
                mvDir(s, d).then(() => {
                    // 这里的回调 cb() 在服务器接收到消息后可以调用，以通知客户端服务器已接收消息；
                    put(nfilename, d).then((res) => {
                        if (res) {
                            // 目录迁移
                            mvDir(d, u).then(() => {
                                // 清空文件上传请求
                                emits = []
                                let gs = name.split('--')
                                // gs[0]：站点
                                let station = gs[0]
                                // gs[2]：下载时间戳
                                let dateStr = new Date(parseInt(gs[2])).toJSON().substr(0, 10)
                                updateds[station] = dateStr
                            })
                        } 
                        cb(res)
                    })
                })
            })
        }
    });

    // 服务端
    socket.on("close", data => {
        socket.disconnect(true);
    });

    // 已经上传的站点返回True
    socket.on("updated", (name, cb) => {
        let isNow = new Date().toJSON().substr(0, 10)
        let downDate = updateds[name]
        cb(isNow === downDate)
    });

});
// ----------  io: end --------------

