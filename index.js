const express = require('express')
const app = express()
const server = require('http').createServer(app)
const port = 3400
const router = express.Router()
const rootPath = '/api/v1'
const { Server } = require('socket.io')
const io = new Server(server, {
  cors: {
    origin: "*"
  }
})
const refresh = io.of(`${rootPath}/refresh`)

const devices = [
  {
    type: 'bulb',
    id: 'b1',
    name: 'Kitchen',
    connectionState: 'connected',
    isTurnedOn: true,
    brightness: 70,
    color: '#cccccc'
  },
  {
    type: 'bulb',
    id: 'b2',
    name: 'Bathroom',
    connectionState: 'poorConnection',
    isTurnedOn: false,
    brightness: 50,
    color: '#ffffff'
  },
  {
    type: 'outlet',
    id: 'o1',
    name: 'Electric heater',
    connectionState: 'connected',
    isTurnedOn: false,
    powerConsumption: 0
  },
  {
    type: 'temperatureSensor',
    id: 'ts1',
    name: 'Outside',
    connectionState: 'connected',
    temperature: 20
  }
]

// Add headers before the routes are defined
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', `http://localhost:3000`);

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

router.get('/devices', (req, res) => {
  res.json(devices)
})

router.get('/device/:deviceId', (req, res) => {
  const { deviceId } = req.params
  const dev = devices.filter(d => {
    return (d.id === deviceId) ? true : false
  })
  if(dev.length) res.json(dev[0])
  else res.sendStatus(404)
})

app.use(rootPath, router)

server.listen(port, () => {
  console.log(`API mockup listening on port ${port}`)
})

refresh.on('connection', socket => {
  console.log(`user ${socket.id} connected`)
  socket.on('disconnect', reason => {
    console.log(`user ${socket.id} disconnected`)
  })
})

const getRandomInt = (min, max) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min
}

const states = ['connected', 'disconnected', 'poorConnection']
const updateConnectionState = (i) => {
  const change = (getRandomInt(0, 100) > 65) ? true : false
  if(change) {
    const changeTo = states.filter(s => (s != devices[i].connectionState) ? true : false)
    const index = getRandomInt(0, changeTo.length)
    devices[i].connectionState = changeTo[index]
  }
  return change
}

const updateBulb = i => {
  let change = false
  if(getRandomInt(0, 100) > 85) {
    change = true
    devices[i].isTurnedOn = !devices[i].isTurnedOn
  }
  if(getRandomInt(0, 100) > 40) {
    change = true
    devices[i].brightness = getRandomInt(1,101)
  }
  if(getRandomInt(0, 100) > 60) {
    devices[i].color = `#${Math.floor(Math.random()*16777215).toString(16)}`
  }
  return change
}

const updateOutlet = i => {
  if(getRandomInt(0, 100) > 70) {
    const device = devices[i]
    if(device.isTurnedOn) {
      device.isTurnedOn = false
      device.powerConsumption = 0
    }
    else {
      device.isTurnedOn = true
      device.powerConsumption = 200
    }
    return true
  }
  else {
    return false
  }
}

const updateTemperatureSensor = i => {
  const device = devices[i]
  if(device.temperature > 22) {
    device.temperature -= 0.5
  }
  else if (device.temperature < 18) {
    device.temperature += 0.5
  }
  else if (getRandomInt(0, 2) > 0) {
    device.temperature -= 0.5
  }
  else {
    device.temperature += 0.5
  }
  return true
}

const changeInterval = () => { setTimeout(() => {
    const changes = []
    for(let i in devices) {
      if(updateConnectionState(i)) {
        changes[i] = true
      }
      switch(devices[i].type) {
        case 'bulb':
          if(updateBulb(i)) {
            changes[i] = true
          }
          break
        case 'outlet':
          if(updateOutlet(i)) {
            changes[i] = true
          }
          break
        case 'temperatureSensor':
          if(updateTemperatureSensor(i)) {
            changes[i] = true
          }
          break
      }
    }
    for(let i in changes) {
      if(changes[i]) refresh.emit("message", JSON.stringify(devices[i]))
      console.log(`device ${devices[i].id} changed`)
    }
    changeInterval()
  }, getRandomInt(10, 100) * 100)
}

changeInterval()
