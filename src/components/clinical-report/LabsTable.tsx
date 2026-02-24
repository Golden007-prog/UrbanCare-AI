import React from 'react';
import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { LabResult } from '../../utils/soapParser';

interface Props {
  labs: LabResult[];
}

export const LabsTable: React.FC<Props> = ({ labs }) => {
  const badgeClass = (status: string) => {
    switch (status) {
      case 'HIGH': return 'status-badge high';
      case 'LOW': return 'status-badge low';
      default: return 'status-badge normal';
    }
  };

  return (
    <div className="glass-card labs-card report-fade-in">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Laboratory Investigations
          <span style={{ flex: 'none' }} />
        </span>
        <Tooltip title="Hover over test names for details" overlayClassName="lab-tooltip">
          <InfoCircleOutlined style={{ fontSize: 14, color: '#6366f1', cursor: 'pointer', flex: 'none' }} />
        </Tooltip>
      </div>

      <table className="labs-table">
        <thead>
          <tr>
            <th>Test Name</th>
            <th>Result</th>
            <th>Reference Range</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          {labs.map((lab, i) => (
            <tr key={i} className={lab.status !== 'NORMAL' ? 'abnormal-row' : ''}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {lab.explanation ? (
                    <Tooltip
                      title={
                        <div>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>
                            <span className={badgeClass(lab.status)} style={{ marginRight: 8 }}>{lab.status}</span>
                            {lab.testName}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                            Value: {lab.result} (Ref: {lab.referenceRange})
                          </div>
                          <div>{lab.explanation}</div>
                        </div>
                      }
                      overlayClassName="lab-tooltip"
                      placement="right"
                    >
                      <span style={{ cursor: 'help', borderBottom: '1px dashed #94a3b8' }}>
                        {lab.testName}
                      </span>
                    </Tooltip>
                  ) : (
                    <span>{lab.testName}</span>
                  )}
                  <span className={badgeClass(lab.status)}>{lab.status}</span>
                </div>
              </td>
              <td>{lab.result}</td>
              <td>{lab.referenceRange}</td>
              <td>{lab.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
