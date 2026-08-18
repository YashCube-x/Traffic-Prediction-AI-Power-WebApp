
import React, { useState, useEffect } from 'react';

export default function AIForecasting() {
  const [predictions, setPredictions] = useState([]);
  const [selectedCorridorId, setSelectedCorridorId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:2001/api/v1/traffic/predictions')
      .then((res) => res.json())
      .then((data) => {
        setPredictions(data);
        if (data.length > 0) {
          setSelectedCorridorId(data[0].corridor_id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Backend predictions unavailable, using static AI predictions fallback:', err);
        const fallbackData = [
          {
            corridor_id: "CORRIDOR_MG_ROAD",
            corridor_name: "M.G. Road Corridor (Central CBD)",
            current_status: "HEAVY",
            peak_hour_warning: true,
            estimated_peak_start: "05:30 PM",
            ai_confidence_score: 0.94,
            forecast_timeline: [
              { time_label: "04:00 PM", predicted_speed_kmh: 24.5, predicted_vehicle_count: 160, congestion_risk: "MODERATE", bottleneck_probability: 0.35 },
              { time_label: "05:00 PM", predicted_speed_kmh: 18.0, predicted_vehicle_count: 210, congestion_risk: "HEAVY", bottleneck_probability: 0.72 },
              { time_label: "06:00 PM", predicted_speed_kmh: 11.2, predicted_vehicle_count: 285, congestion_risk: "SEVERE", bottleneck_probability: 0.91 },
              { time_label: "07:00 PM", predicted_speed_kmh: 15.0, predicted_vehicle_count: 240, congestion_risk: "HEAVY", bottleneck_probability: 0.80 },
              { time_label: "08:00 PM", predicted_speed_kmh: 32.0, predicted_vehicle_count: 130, congestion_risk: "LOW", bottleneck_probability: 0.20 }
            ],
            recommendations: [
              "Reroute commercial heavy vehicles to Outer Ring Road.",
              "Adjust traffic signal green duration by +15s at Trinity Junction.",
              "Notify commuters about 18-minute expected delay between 05:45 PM and 06:45 PM."
            ]
          },
          {
            corridor_id: "CORRIDOR_HEBBAL_FLYOVER",
            corridor_name: "Hebbal Flyover to Airport Expressway",
            current_status: "SEVERE",
            peak_hour_warning: true,
            estimated_peak_start: "04:45 PM",
            ai_confidence_score: 0.96,
            forecast_timeline: [
              { time_label: "04:00 PM", predicted_speed_kmh: 14.0, predicted_vehicle_count: 230, congestion_risk: "HEAVY", bottleneck_probability: 0.78 },
              { time_label: "05:00 PM", predicted_speed_kmh: 9.5, predicted_vehicle_count: 310, congestion_risk: "SEVERE", bottleneck_probability: 0.95 },
              { time_label: "06:00 PM", predicted_speed_kmh: 8.0, predicted_vehicle_count: 340, congestion_risk: "SEVERE", bottleneck_probability: 0.98 },
              { time_label: "07:00 PM", predicted_speed_kmh: 19.5, predicted_vehicle_count: 190, congestion_risk: "MODERATE", bottleneck_probability: 0.45 },
              { time_label: "08:00 PM", predicted_speed_kmh: 42.0, predicted_vehicle_count: 90, congestion_risk: "LOW", bottleneck_probability: 0.10 }
            ],
            recommendations: [
              "Activate express bypass lane for airport taxis.",
              "Recommend Hennur Main Road alternate route for North-bound commuters."
            ]
          }
        ];
        setPredictions(fallbackData);
        setSelectedCorridorId(fallbackData[0].corridor_id);
        setLoading(false);
      });
  }, []);

  const activeCorridor = predictions.find((p) => p.corridor_id === selectedCorridorId) || predictions[0];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="panel-card skeleton skeleton-block" style={{ height: '70px' }} />
        <div className="stats-grid">
          {[0, 1, 2, 3].map((i) => (
            <div className="stat-card" key={i}>
              <span className="skeleton skeleton-text" style={{ width: '60%' }} />
              <span className="skeleton skeleton-stat" style={{ marginTop: '8px' }} />
            </div>
          ))}
        </div>
        <div className="panel-card skeleton skeleton-block" style={{ height: '260px' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Corridor Selector Header */}
      <div className="panel-card" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="mono-eyebrow">TRAFFIC FORECASTING & BOTTLENECK ANALYSIS</span>
          <h2 style={{ fontSize: '22px', fontWeight: '600', marginTop: '4px' }}>Predictive Congestion Insights</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="mono-label">SELECT CORRIDOR:</span>
          <select
            value={selectedCorridorId}
            onChange={(e) => setSelectedCorridorId(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-dark-soft)',
              color: 'var(--color-on-dark)',
              border: '1px solid var(--color-hairline)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {predictions.map((p) => (
              <option key={p.corridor_id} value={p.corridor_id}>
                {p.corridor_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeCorridor && (
        <>
          {/* Top Metric Summary Cards */}
          <div className="stats-grid">
            <div className="stat-card mint-tint">
              <span className="mono-eyebrow">AI Model Confidence</span>
              <div className="stat-value" style={{ color: 'var(--accent-mint-text)' }}>
                {Math.round(activeCorridor.ai_confidence_score * 100)}%
              </div>
              <span className="mono-label">Gradient Boosted Decision Tree Model</span>
            </div>

            <div className="stat-card">
              <span className="mono-eyebrow">Current Corridor Status</span>
              <div className="stat-value" style={{ fontSize: '20px', marginTop: '4px' }}>
                <span className={`status-badge ${activeCorridor.current_status}`}>
                  {activeCorridor.current_status}
                </span>
              </div>
              <span className="mono-label">Live Telemetry Feedback</span>
            </div>

            <div className="stat-card">
              <span className="mono-eyebrow">Peak Congestion Risk</span>
              <div className="stat-value" style={{ color: activeCorridor.peak_hour_warning ? 'var(--accent-orange)' : 'var(--status-low)', fontSize: '20px' }}>
                {activeCorridor.peak_hour_warning ? `🚨 HIGH (${activeCorridor.estimated_peak_start})` : '🟢 LOW RISK'}
              </div>
              <span className="mono-label">Peak Hour Warning System</span>
            </div>

            <div className="stat-card">
              <span className="mono-eyebrow">Next Peak Hour</span>
              <div className="stat-value" style={{ color: 'var(--accent-periwinkle)' }}>
                {activeCorridor.estimated_peak_start || 'N/A'}
              </div>
              <span className="mono-label">Predicted Start Window</span>
            </div>
          </div>

          {/* Timeline Visualizer Panel */}
          <div className="panel-card">
            <div className="panel-header">
              <div>
                <span className="mono-eyebrow">HOURLY PREDICTION TIMELINE</span>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Forecasted Speed vs. Bottleneck Risk</h3>
              </div>
              <span className="mono-label">HORIZON: +4 HOURS</span>
            </div>

            {/* Custom Bar Timeline */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginTop: '16px' }}>
              {activeCorridor.forecast_timeline.map((point) => {
                const speedHeight = Math.min(100, Math.max(15, (point.predicted_speed_kmh / 50) * 100));
                let barColor = 'var(--status-low)';
                if (point.congestion_risk === 'HEAVY') barColor = 'var(--status-heavy)';
                if (point.congestion_risk === 'SEVERE') barColor = 'var(--status-severe)';
                if (point.congestion_risk === 'MODERATE') barColor = 'var(--status-moderate)';

                return (
                  <div
                    key={point.time_label}
                    style={{
                      background: 'var(--color-surface-dark-soft)',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-hairline)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <span className="mono-label" style={{ fontWeight: 'bold' }}>{point.time_label}</span>

                    {/* Speed Indicator Bar */}
                    <div style={{ width: '100%', height: '100px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', alignItems: 'flex-end', padding: '4px' }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${speedHeight}%`,
                          background: barColor,
                          borderRadius: '2px',
                          transition: 'height 0.5s ease'
                        }}
                      ></div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', fontSize: '14px' }}>
                        {point.predicted_speed_kmh} km/h
                      </div>
                      <div className="mono-label" style={{ fontSize: '10px' }}>
                        {point.predicted_vehicle_count} vh | Bottleneck: {Math.round(point.bottleneck_probability * 100)}%
                      </div>
                    </div>

                    <span className={`status-badge ${point.congestion_risk}`} style={{ fontSize: '10px' }}>
                      {point.congestion_risk}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Smart Recommendations */}
          <div className="panel-card">
            <div className="panel-header">
              <div>
                <span className="mono-eyebrow">AI DISPATCH & TRAFFIC MANAGEMENT ACTION PLAN</span>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Recommended Interventions</h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              {activeCorridor.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface-dark-soft)',
                    border: '1px solid var(--color-hairline)'
                  }}
                >
                  <span style={{ color: 'var(--accent-orange)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>0{idx + 1}.</span>
                  <span style={{ fontSize: '14px', color: 'var(--color-on-dark)' }}>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
