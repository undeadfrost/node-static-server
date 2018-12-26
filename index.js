const http = require('http');
const url = require('url');
const path = require('path')
const fs = require('fs')
const mime = require('mime')
const util = require('util')
const ejs = require('ejs')
const debug = require('debug')('*')

const config = require('./config')
// 方法promise化
const readFile = util.promisify(fs.readFile)
const stat = util.promisify(fs.stat)
const readdir = util.promisify(fs.readdir)

const template = fs.readFileSync(path.join(__dirname, "/catalog.html"), "utf8")

class StaticServer {
	constructor() {
		this.config = config
		this.template = template
	}
	
	async handleRequest(req, res) {
		const {pathname} = url.parse(req.url)
		const filePath = path.join(this.config.dir, pathname)
		let ext = path.parse(filePath).ext
		let mimeType = mime.getType(ext)
		try {
			const files = await readFile(filePath)
			res.writeHead(200, {"Content-Type": `${mimeType};charset=UTF8`})
			res.end(files)
		} catch (e) {
			await this.sendFileDir(filePath, res)
		}
	}
	
	async sendFileDir(filePath, res) {
		try {
			let dirs = await readdir(filePath)
			let catalog = ejs.render(this.template, {dirs})
			res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'});
			res.end(catalog)
		} catch (e) {
			this.sendError(e, res)
		}
	}
	
	sendError(err, res) {
		debug(err)
		res.statusCode = 404
		res.end()
	}
	
	start() {
		const {host, port} = this.config
		let server = http.createServer(this.handleRequest.bind(this))
		server.listen(port, host)
		debug(`http://${host}:${port} start`) //命令行中打印
	}
}

let server = new StaticServer()
server.start()
