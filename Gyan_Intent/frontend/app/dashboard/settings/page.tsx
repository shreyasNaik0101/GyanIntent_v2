"use client";

import { motion } from "framer-motion";
import { Settings as SettingsIcon, User, Bell, Lock, Palette, Globe, Mail, Phone, Calendar as CalendarIcon, MapPin, Save } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    name: "Student Name",
    email: "student@school.edu",
    phone: "+91 98765 43210",
    dateOfBirth: "2008-05-15",
    address: "Mumbai, Maharashtra",
    bio: "Passionate learner exploring STEM subjects",
  });

  const [notifications, setNotifications] = useState({
    assignmentDue: true,
    newAnnouncements: true,
    quizResults: true,
    classReminders: true,
    emailNotifications: false,
  });

  const [appearance, setAppearance] = useState({
    theme: "dark",
    language: "en",
    fontSize: "medium",
  });

  const [activeSection, setActiveSection] = useState<string | null>(null);

  const saveProfile = () => {
    // TODO: Save profile to backend/Google Classroom
    alert("Profile updated successfully!");
  };

  const saveNotifications = () => {
    // TODO: Save notification preferences
    alert("Notification preferences updated!");
  };

  const saveAppearance = () => {
    // TODO: Save appearance settings
    alert("Appearance settings updated!");
  };
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold mb-2">Settings</h2>
        <p className="text-white/60">Manage your account and preferences</p>
      </div>

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl overflow-hidden"
        >
          <button
            onClick={() => setActiveSection(activeSection === 'profile' ? null : 'profile')}
            className="w-full flex items-center gap-3 p-6 hover:bg-white/5 transition"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <User className="text-purple-400" size={20} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold">Profile</h3>
              <p className="text-white/60 text-sm">Update your personal information</p>
            </div>
            <motion.div
              animate={{ rotate: activeSection === 'profile' ? 180 : 0 }}
              className="text-white/40"
            >
              ▼
            </motion.div>
          </button>
          
          {activeSection === 'profile' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/5 p-6 space-y-4"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Full Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Email</label>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                    <Mail size={16} className="text-white/40" />
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="flex-1 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Phone</label>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                    <Phone size={16} className="text-white/40" />
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="flex-1 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Date of Birth</label>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                    <CalendarIcon size={16} className="text-white/40" />
                    <input
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                      className="flex-1 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Address</label>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                  <MapPin size={16} className="text-white/40" />
                  <input
                    type="text"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="flex-1 bg-transparent focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Bio</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>
              <button
                onClick={saveProfile}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:opacity-90 transition"
              >
                <Save size={16} />
                Save Changes
              </button>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-xl overflow-hidden"
        >
          <button
            onClick={() => setActiveSection(activeSection === 'notifications' ? null : 'notifications')}
            className="w-full flex items-center gap-3 p-6 hover:bg-white/5 transition"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Bell className="text-amber-400" size={20} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-white/60 text-sm">Manage notification preferences</p>
            </div>
            <motion.div
              animate={{ rotate: activeSection === 'notifications' ? 180 : 0 }}
              className="text-white/40"
            >
              ▼
            </motion.div>
          </button>
          
          {activeSection === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/5 p-6 space-y-4"
            >
              {Object.entries(notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <button
                    onClick={() => setNotifications({ ...notifications, [key]: !value })}
                    className={`relative w-12 h-6 rounded-full transition ${
                      value ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/10'
                    }`}
                  >
                    <motion.div
                      animate={{ x: value ? 24 : 0 }}
                      className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
                    />
                  </button>
                </div>
              ))}
              <button
                onClick={saveNotifications}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:opacity-90 transition"
              >
                <Save size={16} />
                Save Preferences
              </button>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-6 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Lock className="text-red-400" size={20} />
            </div>
            <div>
              <h3 className="font-semibold">Privacy & Security</h3>
              <p className="text-white/60 text-sm">Two-factor authentication, password management</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel rounded-xl overflow-hidden"
        >
          <button
            onClick={() => setActiveSection(activeSection === 'appearance' ? null : 'appearance')}
            className="w-full flex items-center gap-3 p-6 hover:bg-white/5 transition"
          >
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Palette className="text-cyan-400" size={20} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold">Appearance</h3>
              <p className="text-white/60 text-sm">Customize the look and feel</p>
            </div>
            <motion.div
              animate={{ rotate: activeSection === 'appearance' ? 180 : 0 }}
              className="text-white/40"
            >
              ▼
            </motion.div>
          </button>
          
          {activeSection === 'appearance' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/5 p-6 space-y-4"
            >
              <div>
                <label className="text-sm text-white/60 mb-2 block">Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {['dark', 'light'].map((theme) => (
                    <button
                      key={theme}
                      onClick={() => setAppearance({ ...appearance, theme })}
                      className={`p-3 rounded-lg border transition ${
                        appearance.theme === theme
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span className="capitalize">{theme}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Font Size</label>
                <div className="grid grid-cols-3 gap-2">
                  {['small', 'medium', 'large'].map((size) => (
                    <button
                      key={size}
                      onClick={() => setAppearance({ ...appearance, fontSize: size })}
                      className={`p-3 rounded-lg border transition ${
                        appearance.fontSize === size
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span className="capitalize">{size}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={saveAppearance}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:opacity-90 transition"
              >
                <Save size={16} />
                Save Settings
              </button>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-panel p-6 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Globe className="text-green-400" size={20} />
            </div>
            <div>
              <h3 className="font-semibold">Language & Region</h3>
              <p className="text-white/60 text-sm">Currently: English (India) • Change language and timezone</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
