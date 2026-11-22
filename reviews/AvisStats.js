import React from 'react';
import { useTranslation } from 'react-i18next';
import './Avis.css';

const AvisStats = ({ percentage, totalAvis }) => {
    const { t } = useTranslation();
    const radius = 50;
    const stroke = 8;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    // Determine color based on percentage
    const getColor = (p) => {
        if (p < 35) return '#ff4d4d'; // Mauvais
        if (p < 60) return '#ffa500'; // Moyen
        if (p < 85) return '#ffcc00'; // Bien
        return '#2ecc71'; // Excellent
    };

    const displayRating = (percentage * 5 / 100).toFixed(1);

    return (
        <div className="progress-ring-container animate-fade-in">
            <svg
                height={radius * 2}
                width={radius * 2}
                className="progress-ring-svg"
            >
                <circle
                    className="progress-ring-circle-bg"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                <circle
                    className="progress-ring-circle"
                    stroke={getColor(percentage)}
                    strokeDasharray={circumference + ' ' + circumference}
                    style={{ strokeDashoffset }}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
            </svg>
            <div className="progress-ring-text">
                <span className="progress-ring-percentage">⭐ {displayRating}</span>
                <span className="progress-ring-label">/ 5</span>
                <span className="progress-ring-sublabel">
                    {totalAvis} {totalAvis > 1 ? "avis" : "avis"}
                </span>
            </div>
        </div>
    );
};

export default AvisStats;
