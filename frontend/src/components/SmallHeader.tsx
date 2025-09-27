import React from 'react';
import { useLocation } from 'react-router-dom';

const SmallHeader: React.FC = () => {
  const location = useLocation();
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/spots':
        return 'Select Attractions';
      case '/itinerary':
        return 'Your Itinerary';
      default:
        return '';
    }
  };

  return (
    <div className="small-header">
      <div className="breadcrumb">
        <span className="brand-name">Wanderlust AI</span>
        <span className="separator">•</span>
        <span className="page-title">{getPageTitle()}</span>
      </div>
    </div>
  );
};

export default SmallHeader;