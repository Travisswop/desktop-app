import React from 'react';

const Analytics: React.FC = () => {
  // Sample data for analytics
  const data = {
    totalUsers: 1000,
    activeUsers: 300,
    newSignUps: 50,
  };

  return (
    <div>
      <h1>Analytics Overview</h1>
      <ul>
        <li>Total Users: {data.totalUsers}</li>
        <li>Active Users: {data.activeUsers}</li>
        <li>New Sign-Ups: {data.newSignUps}</li>
      </ul>
    </div>
  );
};

export default Analytics;
