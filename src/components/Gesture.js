import React from 'react';

const Gesture = ({ gesture }) => {
  return (
    <div className="gesture-chart">
      <h3>✋ Gesture Status</h3>
      <div className="stat-box">
        {gesture.pinch ? (
          <p className="label" style={{ fontSize: '13px', color: 'green', fontWeight: 'bold' }}>
            ✅ Pinch Detected
          </p>
        ) : (
          <p className="label" style={{ fontSize: '13px',color: 'gray', fontWeight: 'bold' }}>
            ❌ No Pinch
          </p>
        )}
      </div>
    </div>
  );
};

export default Gesture;
