import React from 'react';
import { Select } from 'antd';
import { MedicineBoxOutlined } from '@ant-design/icons';
import { useStore } from '../store/useStore';

export function HospitalSwitcher() {
  const { hospitals, activeHospitalId, setActiveHospital } = useStore();

  return (
    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
      <MedicineBoxOutlined style={{ color: '#4f46e5', fontSize: 14 }} />
      <Select
        value={activeHospitalId}
        onChange={setActiveHospital}
        variant="borderless"
        size="small"
        popupMatchSelectWidth={false}
        style={{ minWidth: 160 }}
        options={hospitals.map((h) => ({
          value: h.id,
          label: (
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{h.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{h.location}</div>
            </div>
          ),
        }))}
      />
    </div>
  );
}
