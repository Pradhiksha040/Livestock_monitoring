import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Bell, Smartphone, Mail, Save, Moon, Sun } from 'lucide-react';

export default function Settings() {
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') === 'light';
  });

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('theme-light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('theme-light');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="p-2 bg-brand-500/20 rounded-lg">
          <SettingsIcon className="w-6 h-6 text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
          <p className="text-slate-400 text-sm">Manage your notification preferences and account settings.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Sun className="w-5 h-5 text-slate-400" />
          Appearance
        </h2>
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800/60">
            <div className="flex items-start gap-3">
              {isLightMode ? (
                <Sun className="w-5 h-5 text-amber-500 mt-0.5" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-400 mt-0.5" />
              )}
              <div>
                <p className="font-medium text-slate-200">Light Mode</p>
                <p className="text-sm text-slate-500">Toggle between dark and light themes.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isLightMode} 
                onChange={(e) => setIsLightMode(e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
            </label>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-slate-400" />
          Notification Preferences
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800/60">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="font-medium text-slate-200">Email Alerts</p>
                <p className="text-sm text-slate-500">Receive vet approval decisions and daily safe market date alerts via email.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800/60">
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="font-medium text-slate-200">SMS Alerts</p>
                <p className="text-sm text-slate-500">Get immediate text messages when a treatment is approved by a vet.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors">
            <Save className="w-4 h-4" />
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
