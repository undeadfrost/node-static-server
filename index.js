const http = require('http');
const url = require('url');
const path = require('path')
const fs = require('fs')
const mime = require('mime')
const util = require('util')
const ejs = require('ejs')
const zlib = require('zlib');
const debug = require('debug')('*')

const config = require('./config')

// 方法promise化
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
			let {start, end} = this.range(stats, filePath, req, res)
			// let compress = this.gzip(stats, filePath, req, res)
			res.setHeader("Content-Type", `${mimeType};charset=UTF8`)
			// if (compress) {
			// 	fs.createReadStream(filePath, {stats, end}).pipe(compress).pipe(res)
			// } else {
			fs.createReadStream(filePath, {start, end}).pipe(res)
			// }
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
	
	/**
	 * http缓存配置
	 * @param stats
	 * @param req
	 * @param res
	 * @return {boolean}
	 */
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
	
	/**
	 * 断点续传
	 * @param stats
	 * @param filePath
	 * @param req
	 * @param res
	 */
	range(stats, filePath, req, res) {
		const range = req.headers["range"]
		res.setHeader("Accept-Ranges", "bytes")
		if (range) {
			let [, start, end] = range.match(/(\d*)-(\d*)/); //解构出开始和结束的位置
			start = start ? Number(start) : 0
			end = end ? Number(end) : stats.size
			res.statusCode = 206
			res.setHeader("Content-Length", end - start)
			res.setHeader("Content-Range", `bytes ${start}-${end}/${stats.size}`)
			return {start, end}
		} else {
			res.setHeader("Content-Length", stats.size)
			return {start: 0, end: stats.size}
		}
	}
	
	/**
	 * 压缩
	 * @param stats
	 * @param filePath
	 * @param req
	 * @param res
	 * @return {*}
	 */
	gzip(stats, filePath, req, res) {
		const encoding = req.headers["accept-encoding"]
		if (encoding) {
			if (encoding.match(/\bgzip\b/)) {
				res.setHeader("Content-Encoding", "gzip")
				return zlib.createGzip()
			} else if (encoding.match(/\bdeflate\b/)) {
				res.setHeader("Content-Encoding", "deflate")
				return zlib.createDeflate()
			} else {
				return false
			}
		} else {
			return false
		}
	}
	
	/**
	 * 启动函数
	 */
	start() {
		const {host, port} = this.config
		let server = http.createServer(this.handleRequest.bind(this))
		server.listen(port, host)
		debug(`http://${host}:${port} start`) //命令行中打印
	}
}

let server = new StaticServer()
server.start()
