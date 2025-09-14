import {React, useState, useEffect} from 'react';
import './styles/dashboard.css';
import CameraFeed from './components/CameraFeed';
import Statistics from './components/Statistics';
import RiskIndicator from './components/RiskIndicator';
import Gesture from './components/Gesture';
import axios from 'axios';
import LoneWomen from './components/LoneWomen';

let pollInterval = null;
let flaskWaitMessageShown = false;

const App = () => {

  const node_backendURL = "http://localhost:5000"
  const [status, setStatus] = useState('Offline')
  const [error, setError] = useState('')
  const [errorPrinted, setErrorPrinted] = useState(false);
  const [ready, setReady] = useState(false)
  const [videoSrc, setVideoSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    Male: 0,
    Female: 0,
    Unknown: 0,
    Total: 0,
  });
  const [gesture, setGesture] = useState({
    pinch: false
  })


  useEffect(() => {
    let statsInterval;
    if (ready) {
      statsInterval = setInterval(() => {
        axios.get(`${node_backendURL}/stats`)
          .then(res => {
            setStats(res.data)
            if(errorPrinted) setErrorPrinted(false);
          })
          .catch(() => {
            if(!errorPrinted){
              console.log("⚠️ Backend is offline: /stats unavailable");
              setErrorPrinted(true); 
            }
          });
      }, 1000);
    }

    return () => {
      clearInterval(statsInterval);
    };
  }, [ready, node_backendURL,errorPrinted]);

  useEffect(() => {
    let gestureInterval;
    if (ready) {
      gestureInterval = setInterval(() => {
        axios.get(`${node_backendURL}/gesture`)
          .then(res => {
            setGesture(res.data)
            if(errorPrinted) setErrorPrinted(false);
          })
          .catch(() => {
            if(!errorPrinted){
              console.log("⚠️ Backend is offline: /stats unavailable");
              setErrorPrinted(true); 
            }
          });
      }, 1000);
    }

    return () => {
      clearInterval(gestureInterval);
    };
  }, [ready, node_backendURL, errorPrinted]);

  const startFeed = async () => {
    if (ready || pollInterval) return;

    try {
      setLoading(true);
      const res = await axios.get(`${node_backendURL}/start-gender-classify`);
      console.log(res.data.message);

      if (!flaskWaitMessageShown) {
        console.log("Waiting for Flask to be ready...");
        flaskWaitMessageShown = true;
      }

      pollInterval = setInterval(async () => {
        try {
          const pingRes = await axios.get(`${node_backendURL}/ping`);
          if (pingRes.status === 200 && pingRes.data.status === "ok") {
            clearInterval(pollInterval);
            pollInterval = null;
            flaskWaitMessageShown = false;

            setVideoSrc(`${node_backendURL}/video?cacheBuster=${Date.now()}`);
            setReady(true);
            setStatus("Online");
            setLoading(false);
          }
        } catch (err) {
        }
      }, 1000);

    } catch (err) {
      setLoading(false);
      setError("Camera feed could not be started.");
    }
  };

  const stopFeed = async () => {
    try{
      setStats({
        Male: 0,
        Female: 0,
        Unknown: 0,
        Total: 0,
      });
      setGesture(false)
      setLoading(false);
      setVideoSrc(null)
      setReady(false);
      setStatus("Offline");
      flaskWaitMessageShown = false;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }

      const res = await axios.get(`${node_backendURL}/stop`);
      console.log(res.data.message)

      setError("Camera feed is stopped.");
    }
    catch(err){
      setError("Failed to stop")
    }
  };

  return (
    <div className="main-layout">
      <div className="camera-area">
        <CameraFeed status={status} ready={ready} error={error} videoSrc={videoSrc} startFeed={startFeed} stopFeed={stopFeed} loading={loading}/>
      </div>
      <div className="side-panel">
        <div className="top-half">
          <Statistics stats={stats}/>
        </div>
        <div className="bottom-half">
          <div className="card half-box"><LoneWomen stats={stats}  /></div>
          <div className="card half-box"><RiskIndicator stats={stats}  /></div>
          <div className="card half-box"><Gesture gesture={gesture} /></div>  
        </div>

      </div>
    </div>
  );
}

export default App;