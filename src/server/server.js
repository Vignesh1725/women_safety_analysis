const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const http = require('http');
const dotenv = require('dotenv')
const { URL} = require('url')

dotenv.config();
const backendURL = "http://localhost:7000";
const url = new URL(backendURL)

const app = express();
const PORT = 5000;
let pythonProcess = null;

app.use(cors());

let flaskStarted = false;

app.get('/ping', async (req, res) => {
  if (!flaskStarted) {
    return res.status(200).json({ status: "waiting" });
  }

  try {
    const response = await fetch(`${backendURL}/ping`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ status: "flask error" });
  }
});

app.get('/start-gender-classify', async (req, res) => {
  if (!pythonProcess) {
    pythonProcess = spawn('py', ['-u', '../projects/app.py'], {
      env: { ...process.env, TF_CPP_MIN_LOG_LEVEL: '3' }
    });

    pythonProcess.stdout.on('data', data => {
    const str = data.toString();
    console.log(str)
    if (!flaskStarted && str.includes(`Running on`)) {
        flaskStarted = true;
        console.log("Flask server is ready.");
    }
    });

    pythonProcess.stderr.on('data', data => {
    const str = data.toString();
    console.log(str)
    if (!flaskStarted && str.includes(`Running on`)) {
        flaskStarted = true;
        console.log("Flask server is ready.");
    }
    });

    
    pythonProcess.on('close', code => {
      flaskStarted = false;
      pythonProcess = null;
      console.log(`Flask server stopped`);
    });

    res.json({ message: "Gender classification started." });
  } else {
    res.json({ message: "Already running." });
  }
});

app.get('/stop', async (req, res) => {
  if (pythonProcess) {
    try {
      await fetch(`${backendURL}/shutdown`);
    } catch (error) {
      console.warn("Expected error during shutdown (Flask terminated):", error.message);
    }

    setTimeout(() => {
      try { pythonProcess.kill(); } catch (e) {}
      pythonProcess = null;
      res.json({ message: "Stopped and released camera." });
    }, 1000);
  } else {
    res.json({ message: "Already stopped." });
  }
});


app.get('/video', (req, res) => {
  if (!flaskStarted) return res.status(503).json({ message: "Flask server not yet started." });

  const proxy = http.request({
    hostname: url.hostname,
    port: url.port,
    path: '/video',
    method: 'GET',
    headers: {
      'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
    },
  }, flaskRes => {
    if (!res.headersSent) {
      res.writeHead(200, flaskRes.headers);
    }

    flaskRes.pipe(res);

    flaskRes.on('end', () => {
      if (!res.writableEnded) {
        try { res.end(); } catch (e) {}
      }
    });
  });

  proxy.on('error', err => {
    console.error('Error proxying /video:', err.message);
    if (!res.headersSent) {
      res.sendStatus(502);
    } else {
      try { res.end(); } catch (e) {}
    }
  });

  proxy.end();
});



app.get('/stats', async (req, res) => {
  if (!flaskStarted) return res.status(503).json({ message: "Flask server not yet started." });

  try {
    const response = await fetch(`${backendURL}/stats`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats from Flask" });
  }
  
});

app.get('/gesture', async (req, res) => {
  if (!flaskStarted) return res.status(503).json({ message: "Flask server not yet started." });

  try {
    const response = await fetch(`${backendURL}/gesture`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch gesture from Flask" });
  }
});

app.listen(PORT, () => {
    console.log(`Express server running at ${backendURL}`);
});