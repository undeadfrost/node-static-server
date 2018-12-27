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
		try {
			const stats = await stat(filePath)
			if (stats.isDirectory()) {
				this.sendFileDir(filePath, res)
			} else {
				this.sendFile(stats, filePath, req, res)
			}
		} catch (e) {
			//文件不存在情况
			this.sendError(req, res, e)
		}
	}
	
	/**
	 * 获取目录下所有文件列表
	 * @param filePath
	 * @param res
	 * @return {Promise<void>}
	 */
	async sendFileDir(filePath, res) {
		let dirs = await readdir(filePath)
		let catalog = ejs.render(this.template, {dirs})
		res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'});
		res.end(catalog)
	}
	
	/**
	 * 获取具体文件
	 * @param filePath
	 * @param res
	 * @return {Promise<void>}
	 */
	async sendFile(stats, filePath, req, res) {
		if (this.cache(stats, req, res)) {
			res.statusCode = 304
			res.end()
		} else {
			let ext = path.parse(filePath).ext
			let mimeType = mime.getType(ext)
			let file = await readFile(filePath)
			res.writeHead(200, {"Content-Type": `${mimeType};charset=UTF8`})
			res.end(file)
		}
	}
	
	/**
	 * 错误信息
	 * @param err
	 * @param res
	 */
	sendError(err, res) {
		debug(err)
		res.statusCode = 404
		res.end()
	}
	
	cache(stats, req, res) {
		res.setHeader("Cache-Control", "no-cache")
		res.setHeader('Expires', new Date(Date.now() + 60 * 1000).toGMTString());//60秒后重新发请求
		const lastModified = stats.ctime.toUTCString()
		const etag = stats.ctime.toJSON() + stats.size.toString()
		res.setHeader('Etag', etag);
		res.setHeader('Last-Modified', lastModified);
		const ifModifiedSince = req.headers["if-modified-since"]
		const ifNoneMatch = req.headers["if-none-match"]
		if (lastModified === ifModifiedSince && etag === ifNoneMatch) {
			return true
		}
		return false
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
