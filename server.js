var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]

if (!port) {
    console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
    process.exit(1)
}

var server = http.createServer(function (request, response) {
    var parsedUrl = url.parse(request.url, true)
    var pathWithQuery = request.url
    var queryString = ''
    if (pathWithQuery.indexOf('?') >= 0) { queryString = pathWithQuery.substring(pathWithQuery.indexOf('?')) }
    var path = parsedUrl.pathname
    var query = parsedUrl.query
    var method = request.method
    const session = JSON.parse(fs.readFileSync('./session.json').toString())
    /******** 从这里开始看，上面不要看 ************/

    console.log('有个傻子发请求过来啦！路径（带查询参数）为：' + pathWithQuery)
    if (path === '/sign_in' && method === 'POST') {
        response.setHeader('Content-Type', 'text/html;charset=utf-8')
        const array = []
        request.on('data', (chunk) => {
            array.push(chunk)
        })
        request.on('end', () => {
            const string = Buffer.concat(array).toString()
            const obj = JSON.parse(string)
            const userArray = JSON.parse(fs.readFileSync('./db/users.json'))
            const user = userArray.find((user) => user.name === obj.name && user.password === obj.password)
            const random = Math.random()
            session[random] = { user_id: user.id }
            fs.writeFileSync('./session.json', JSON.stringify(session))
            if (user === undefined) {
                response.statusCode = 400
                response.setHeader('Content-Type', 'text/json;charset=utf-8')
                response.end(`{errorCode:4001}`)
            } else {
                response.statusCode = 200
                response.setHeader('Set-Cookie', `sessionId=${random};HttpOnly`)
                response.end()
            }
        })
    } else if (path === '/home.html') {
        response.statusCode = 200
        response.setHeader('Content-Type', 'text/html;charset=utf-8')
        const cookie = request.headers.cookie
        let session_id
        try { session_id = cookie.split(';').filter((string) => string.indexOf('sessionId=') >= 0)[0].split('=')[1] }
        catch (error) { }
        user_id = session[session_id].user_id
        const userArray = JSON.parse(fs.readFileSync('./db/users.json'))
        let homeHtml
        if (user_id) {
            const user = userArray.find((user) => user['id'] === user_id)
            homeHtml = fs.readFileSync('./public/home.html').toString().replace('{{signStatus}}', '已登录').replace(`{{user}}`, `${user.name}`)
        } else {
            homeHtml = fs.readFileSync('./public/home.html').toString().replace('{{signStatus}}', '未登录').replace('你好，{{user}}', ``)
        }
        response.write(homeHtml)
        response.end()
    } else if (path === '/register' && method === 'POST') {
        response.statusCode = 200
        response.setHeader('Content-Type', 'text/html;charset=utf-8')
        const array = []
        request.on('data', (chunk) => {
            array.push(chunk)
        })
        request.on('end', () => {
            const string = Buffer.concat(array).toString()
            const obj = JSON.parse(string)
            console.log(obj.name)
            let userArray = JSON.parse(fs.readFileSync('./db/users.json'))
            let existOrNot = userArray.find((user) => user.name === obj.name)
            console.log(existOrNot)
            if (existOrNot === undefined) {
                const lastUser = userArray[userArray.length - 1]
                const newUser = { id: lastUser ? lastUser['id'] + 1 : 1, name: obj['name'], password: obj['password'] }
                userArray.push(newUser)
                fs.writeFileSync('./db/users.json', JSON.stringify(userArray))
                response.end()
            } else {
                response.statusCode = 400
                response.end()
            }

        })

    }
    else {
        response.statusCode = 200
        //默认首页
        const filePath = path === '/' ? '/index.html' : path
        //suffix 是后缀
        const index = filePath.lastIndexOf('.')
        const suffix = filePath.substring(index)
        const fileType = {
            '.js': 'text/javascript',
            '.json': 'text/json',
            '.css': 'text/css',
            '.png': 'image/png',
            '.jpg': 'image/jpeg'
        }

        let content
        try { content = fs.readFileSync(`./public${filePath}`) }
        catch (error) {
            response.statusCode = 404
            content = '文件不存在'
        }
        response.setHeader('Content-Type', `${fileType[suffix] || `text/html`};charset=utf-8`)
        response.write(content)
        response.end()
    }
    /******** 代码结束，下面不要看 ************/
})

server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)

