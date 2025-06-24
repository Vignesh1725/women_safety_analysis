const CameraFeed = ({status, ready, error, videoSrc, startFeed, stopFeed, loading}) => {

  return (
    <div className="card camera-feed">
      <div className="card-header">
        <span>Camera 1</span>
        <span style={{ color: status === "Online" ? "lightgreen" : "red" }}>{status}</span>
      </div>
      <div className="camera-view">
        {ready === true? (
          <img
          key="video-stream"
          src={videoSrc}
          alt="Live Gender Feed"
          className="img-view"
          onError={() => console.log("⚠️ Video feed failed to load")}
          />
      ) : loading === true ? (
        <div className="loader"></div>
      ) : (
          <div key="Offline"> <p className="offline-text">{error || "Camera is offline"}</p></div>
        )}
      </div>
      <div className="camera-footer">
        <div>
          <span className="tag male">Male</span>
          <span className="tag female">Female</span>
        </div>
        <div>
          <button className="buttons cancel" onClick={() => stopFeed()}>Cancel Feed</button>
          <button className="buttons start" onClick={() => startFeed()}>Start Feed</button>
        </div>
      </div>
    </div>
  );
}


export default CameraFeed