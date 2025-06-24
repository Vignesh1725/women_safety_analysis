import React from 'react';

const LoneWomen = ({ stats }) => {
  return (
    <div className="gesture-chart">
      <h3>✋ Lone Women</h3>
      <div className="stat-box">
        {stats.Female === 1 ? (
          <span className="label" style={{ fontSize: '13px', color: 'green', fontWeight: 'bold' }}>
            Detected
          </span>
        ) : (
          <span className="label" style={{ color: 'gray' }}>
            Not Detected
          </span>
        )}
      </div>
    </div>
  );
};

export default LoneWomen;