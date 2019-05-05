const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const mime = require('mime');
const util = require('util');
const ejs = require('ejs');
const zlib = require('zlib');
const debug = require('debug')('*');

const config = require('./config')

// 方法promise化
const stat = util.promisify(fs.stat) // 获取文件信息
const readdir = util.promisify(fs.readdir) // 读取目录内容

// 读取模板文件(同步)
const template = fs.readFileSync(path.join(__dirname, "/catalog.html"), "utf8")

class StaticServer {
	constructor() {
		this.config = config
		this.template = template
	}
	
	/**
	 * 请求内容处理
	 * @param req
	 * @param res
	 * @return {Promise<void>}
	 */
	async handleRequest(req, res) {
		const {pathname} = url.parse(req.url) // 解析Url地址获取url路径
		const filePath = path.join(this.config.dir, pathname) // 拼接url路径到本地物理路径
		try {
			const stats = await stat(filePath) // 读取文件信息
			if (stats.isDirectory()) { // 判断是否为目录文件
				this.sendFileDir(filePath, res) // 获取文件目录
			} else {
				this.sendFile(stats, filePath, req, res) // 获取文件
			}
		} catch (e) {
			// 文件不存在情况
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
		let dirs = await readdir(filePath) // 读取目录下子文件或文件夹
		let catalog = ejs.render(this.template, {dirs}) // 输出渲染目录模板
		res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'});
		res.end(catalog)
	}
	
	/**
	 * 获取文件
	 * @param filePath
	 * @param res
	 * @return {Promise<void>}
	 */
	async sendFile(stats, filePath, req, res) {
		// 检测缓存
		if (this.cache(stats, req, res)) {
			res.statusCode = 304
			res.end()
		} else {
			let ext = path.parse(filePath).ext // 获取文件后缀
			let mimeType = mime.getType(ext) // 获取文件类型
			let {start, end} = this.range(stats, filePath, req, res) // 查看是否支持范围
			let compress = this.gzip(stats, filePath, req, res) // 获取gzip压缩
			res.setHeader("Content-Type", `${mimeType};charset=UTF8`) // 设置response header文件类型及编码
			if (compress) {
				fs.createReadStream(filePath, {start, end}).pipe(compress).pipe(res)
			} else {
				fs.createReadStream(filePath, {start, end}).pipe(res)
			}
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
		res.end('Not Found')
	}
	
	/**
	 * http缓存配置
	 * @param stats
	 * @param req
	 * @param res
	 * @return {boolean}
	 * 强制缓存 服务端 Cache-Control Expires
	 * 协商缓存  服务端 Last-Modified Etag
	 * 协商缓存  客户端 if-modified-since  if-none-match
	 */
	cache(stats, req, res) {
		// Cache-Control no-cache用缓存一定要先经过验证，必须从重新去获取请求
		res.setHeader("Cache-Control", "no-cache")
		// 响应头包含日期/时间， 即在此时候之后，响应过期。
		// 无效的日期，比如 0, 代表着过去的日期，即该资源已经过期。
		res.setHeader('Expires', new Date(Date.now() + 60 * 1000).toGMTString());// 60秒后重新发请求
		const lastModified = stats.ctime.toUTCString() // 文件最后修改时间
		const etag = stats.ctime.toJSON() + stats.size.toString() // 设定资源标识符Etag
		res.setHeader('Etag', etag); // 资源的特定版本的标识符
		res.setHeader('Last-Modified', lastModified); // 设置文件最后修改日期
		// 比对文件修改日期及资源标识符
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
			let [, start, end] = range.match(/(\d*)-(\d*)/); // 解构出开始和结束的位置
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
		let server = http.createServer()
		server.on('request', this.handleRequest.bind(this))
		server.listen(port, host)
		debug(`http://${host}:${port} start`) //命令行中打印
	}
}

let server = new StaticServer()
server.start()
