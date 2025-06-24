export default function Statistics({stats}) {

  return (
    <div className="card statistics">
      <h2>📊 Statistics</h2>
      
      <div className="stats-grid stats">
        <div className="stat-box">
          <h4>Male Count</h4>
          <p>{stats.Male}</p>
          <span>0% of total</span>
        </div>
        <div className="stat-box">
          <h4>Female Count</h4>
          <p>{stats.Female}</p>
          <span>0% of total</span>
        </div>
        <div className="stat-box">
          <h4>Unknown</h4>
          <p>{stats.Unknown}</p>
          <span>0% of total</span>
        </div>
        <div className="stat-box">
          <h4>Total Detected</h4>
          <p>{stats.Total}</p>
          <span>All time</span>
        </div>
      </div>
    </div>
  );
}
