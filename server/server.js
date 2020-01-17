import bodyParser from 'body-parser'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { existsSync } from 'fs'
import express from 'express'
import morgan from 'morgan'
import path from 'path'
import winston from 'winston'

import index from './routes/index'

import { appServer, appBuild } from '../src/paths'
// Create our express app (using the port optionally specified)
const app = express()
const PORT = process.env.REACT_APP_PORT_SERVER || process.env.PORT || 5000
const HOST = process.env.REACT_APP_HOST_SERVER || '0.0.0.0'

const configExpress = appServer + '/configExpress.js'
const hasConfigExpress = existsSync(configExpress)

const logger = new winston.createLogger({
  transports: [
    new winston.transports.File({
      filename        : './service-tracking.log',
      level           : 'verbose',
      json            : false,
      handleExceptions: true,
      maxFiles        : 7,
      prettyPrint     : object => { return JSON.stringify(object) }
    }),
    new winston.transports.Console({
      level           : 'verbose',
      handleExceptions: true,
      json            : false,
      colorize        : true,
      prettyPrint     : object => { return JSON.stringify(object) }
    })
  ]
})

// Compress, parse, and log
app.use(compression())
app.use(cookieParser())
app.use(bodyParser.json(process.env.BODY_PARSER_LIMIT ? { limit: process.env.BODY_PARSER_LIMIT } : {}))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(morgan('[:date[clf]] :method :url HTTP/:http-version :status :res[content-length] - :response-time ms', {
  stream: {
    write: message => logger.info(message.trim())
  }
}))

app.disable('x-powered-by')
const http = hasConfigExpress ? require(configExpress).default(app) : app

app.use('^/$', index)
app.use('/api', require(path.resolve(appServer)).default)
// Set up route handling, include static assets and an optional API
app.use(express.static(path.resolve(appBuild)))
// any other route should be handled by react-router, so serve the index page
app.use('*', index)

// Let's rock
http.listen(PORT, HOST, () => {
  console.log(`App listening on port ${PORT}!`)
})

// Handle the bugs somehow
http.on('error', error => {
  if(error.syscall !== 'listen') throw error

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT

  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges')
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(bind + ' is already in use')
      process.exit(1)
      break
    default:
      throw error
  }
})
