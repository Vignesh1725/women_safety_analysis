import React, { useEffect, useState } from 'react';

const RiskIndicator = ({ stats }) => {
  const [risk, setRisk] = useState("Low");

  useEffect(() => {
    if (stats.Total === 0) {
      setRisk("Low");
      return;
    }

    const maleRatio = stats.Male / stats.Total;
    if (maleRatio > 0.8 && stats.Total >= 2) {
      setRisk("High");
    } else if (maleRatio > 0.6 && stats.Total >= 2) {
      setRisk("Medium");
    } else {
      setRisk("Low");
    }
  }, [stats]);

  const getColor = () => {
    switch (risk) {
      case "High": return "red";
      case "Medium": return "orange";
      default: return "lightgreen";
    }
  };

  return (
    <div>
      <h2>⚠️ Risk Level</h2>
      <p style={{ color: getColor() }} className='stat-box'>
        {risk}
      </p>
    </div>
  );
};

export default RiskIndicator;
