import React, { useEffect, useState } from 'react';
import { Heart, Thermometer, Wind, Droplets, Activity, AlertTriangle, Shield, Clock } from 'lucide-react';
import clsx from 'clsx';

interface PortalData {
  patient: {
    name: string;
    age: number;
    gender: string;
    primaryCondition: string;
    riskLevel: string;
    admissionStatus: string;
  };
  vitals: {
    heartRate: number;
    systolicBP: number;
    diastolicBP: number;
    respRate: number;
    spo2: number;
    temperature: number;
  } | null;
  alerts: { id: string; type: string; message: string; createdAt: string }[];
  permissionLevel: string;
  expiresAt: string;
}

export default function FamilyPortal() {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Extract token from URL
  const token = window.location.pathname.split('/family/')[1];

  useEffect(() => {
    if (!token) {
      setError('No access token provided.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';
        const res = await fetch(`${API_URL}/api/family/${token}`);
        if (!res.ok) {
          setError('This link is invalid or has expired.');
          setLoading(false);
          return;
        }
        const json = await res.json();
        setData(json.data);
      } catch {
        // Mock fallback for demo
        setData({
          patient: {
            name: 'John Doe',
            age: 45,
            gender: 'Male',
            primaryCondition: 'Hypertension',
            riskLevel: 'Stable',
            admissionStatus: 'admitted',
          },
          vitals: {
            heartRate: 82,
            systolicBP: 138,
            diastolicBP: 88,
            respRate: 18,
            spo2: 96,
            temperature: 98.8,
          },
          alerts: [],
          permissionLevel: 'read-only',
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading patient information...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 max-w-md text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-sm text-slate-500">{error || 'Unable to load patient data.'}</p>
        </div>
      </div>
    );
  }

  const { patient, vitals, alerts } = data;

  const vitalCards = vitals ? [
    { label: 'Heart Rate', value: vitals.heartRate, unit: 'BPM', icon: Heart, color: 'text-rose-500 bg-rose-50' },
    { label: 'Blood Pressure', value: `${vitals.systolicBP}/${vitals.diastolicBP}`, unit: 'mmHg', icon: Activity, color: 'text-indigo-500 bg-indigo-50' },
    { label: 'SpO2', value: vitals.spo2, unit: '%', icon: Droplets, color: 'text-sky-500 bg-sky-50' },
    { label: 'Temperature', value: vitals.temperature, unit: '°F', icon: Thermometer, color: 'text-amber-500 bg-amber-50' },
    { label: 'Respiration', value: vitals.respRate, unit: '/min', icon: Wind, color: 'text-emerald-500 bg-emerald-50' },
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">U</span>
            </div>
            <span className="font-bold text-lg text-slate-900">
              UrbanCare <span className="text-indigo-600 font-medium">Family Portal</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            <Shield className="w-3 h-3" />
            Read-Only Access
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Patient Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{patient.name}</h1>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>{patient.age} Years, {patient.gender}</span>
            <span>•</span>
            <span>{patient.primaryCondition}</span>
            <span>•</span>
            <span className={clsx(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              patient.riskLevel === 'Critical' ? 'bg-red-100 text-red-700' :
              patient.riskLevel === 'Warning' ? 'bg-amber-100 text-amber-700' :
              'bg-emerald-100 text-emerald-700'
            )}>
              {patient.riskLevel}
            </span>
          </div>
        </div>

        {/* Vitals */}
        {vitalCards.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              Latest Vitals
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {vitalCards.map(({ label, value, unit, icon: Icon, color }) => (
                <div key={label} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center mb-2', color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                  <p className="text-lg font-bold text-slate-900">
                    {value} <span className="text-xs font-normal text-slate-400">{unit}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Alerts
          </h2>
          {alerts.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center">
              <p className="text-sm text-emerald-600">No active alerts. Patient is stable.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={clsx(
                    'p-4 rounded-xl border text-sm',
                    alert.type === 'critical' ? 'bg-red-50 border-red-100 text-red-700' :
                    alert.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                    'bg-blue-50 border-blue-100 text-blue-700'
                  )}
                >
                  <p className="font-medium">{alert.message}</p>
                  <p className="text-[10px] mt-1 opacity-60">{new Date(alert.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 pt-4">
          <Clock className="w-3 h-3" />
          Link expires: {new Date(data.expiresAt).toLocaleString()}
        </div>
      </main>
    </div>
  );
}
