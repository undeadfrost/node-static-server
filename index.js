const http = require('http');
const url = require('url');
const path = require('path')
const fs = require('fs')
const mime = require('mime')

const staticServer = http.createServer((req, res) => {
	let urlObj = url.parse(req.url)
	let urlPathname = urlObj.pathname
	let filePathname = path.join(__dirname, "/public", urlPathname)
	let ext = path.parse(urlPathname).ext
	let mimeType = mime.getType(ext)
	fs.readFile(filePathname, (err, data) => {
		if (err) {
			fs.stat(filePathname, (err, stats) => {
				if (err) {
					res.writeHead(404)
					res.write("404")
					res.end()
				} else {
					if (stats.isDirectory()) {
						let files = fs.readdirSync(filePathname)
						console.log(files)
						res.writeHead(200)
						res.write(files.toString())
						res.end()
					}
				}
			})
		} else {
			res.writeHead(200, {"Content-Type": `${mimeType};charset=UTF8`})
			res.write(data)
			res.end()
		}
	})
})


staticServer.listen(3000, () => {
	console.log("静态资源服务器运行中.")
	console.log("正在监听3000端口：")
})
