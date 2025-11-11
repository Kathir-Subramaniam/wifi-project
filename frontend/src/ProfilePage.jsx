import React, { useEffect, useState } from 'react';
import './ProfilePage.css';

const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

const initialUser = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'user',
};

const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

export default function ProfilePage() {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null); // {type: 'success'|'error', message: string}

  // Change email
  const [newEmail, setNewEmail] = useState('');
  // Change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Devices
  const [devices, setDevices] = useState([]); // [{id, mac, nickname?}]
  const [deviceMac, setDeviceMac] = useState('');
  const [deviceNickname, setDeviceNickname] = useState('');
  const [deviceBusyId, setDeviceBusyId] = useState(null);
  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const isValidEmail = (val) => /\S+@\S+\.\S+/.test(val);
  const isStrongPassword = (val) => val && val.length >= 8;
  const canSaveEmail = newEmail && isValidEmail(newEmail);
  const canSavePassword =
    currentPassword && isStrongPassword(newPassword) && newPassword === confirmPassword;
  const canAddDevice = deviceMac && macRegex.test(deviceMac);

  const clearAlert = () => setAlert(null);
  const setError = (m) => setAlert({ type: 'error', message: m });
  const setSuccess = (m) => setAlert({ type: 'success', message: m });

  // Load current user + devices from API
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const [me, devs] = await Promise.all([
          api('/api/users/self'),
          api('/api/users/self/devices'),
        ]);
        if (ignore) return;
        setUser({
          firstName: me.firstName || '',
          lastName: me.lastName || '',
          email: me.email || '',
          role: me.role || 'user',
        });
        setNewEmail(me.email || '');
        setDevices(Array.isArray(devs) ? devs : []);
      } catch (e) {
        if (!ignore) setError(e.message || 'Failed to load profile.');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  // Handlers with real API calls to /api/users/self
  const handleSaveProfile = async () => {
    clearAlert();
    setSaving(true);
    try {
      await api('/api/users/self', {
        method: 'PUT',
        body: {
          firstName: user.firstName.trim(),
          lastName: user.lastName.trim(),
        },
      });
      setSuccess('Profile saved.');
    } catch (e) {
      setError(e.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    clearAlert();
    if (!canSaveEmail) return setError('Please enter a valid email.');
    setSaving(true);
    try {
      await api('/api/users/self/email', { method: 'PUT', body: { email: newEmail.trim() } });
      setUser((u) => ({ ...u, email: newEmail.trim() }));
      setSuccess('Email updated.');
    } catch (e) {
      setError(e.message || 'Failed to update email.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    clearAlert();
    if (!canSavePassword) {
      if (!currentPassword) return setError('Enter your current password.');
      if (!isStrongPassword(newPassword))
        return setError('New password must be at least 8 characters.');
      if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    }
    setSaving(true);
    try {
      await api('/api/users/self/password', {
        method: 'PUT',
        body: { currentPassword, newPassword },
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password changed.');
    } catch (e) {
      setError(e.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDevice = async () => {
    clearAlert();
    if (!canAddDevice) return setError('Enter a valid MAC address.');
    setSaving(true);
    try {
      const created = await api('/api/users/self/devices', {
        method: 'POST',
        body: {
          mac: deviceMac.toUpperCase().trim(),
          nickname: deviceNickname?.trim() || '',
        },
      });
      setDevices((d) => [...d, created]);
      setDeviceMac('');
      setDeviceNickname('');
      setSuccess('Device added.');
    } catch (e) {
      setError(e.message || 'Failed to add device.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDevice = async (id) => {
    clearAlert();
    setDeviceBusyId(id);
    try {
      await api(`/api/users/self/devices/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setDevices((d) => d.filter((x) => String(x.id) !== String(id)));
      setSuccess('Device removed.');
    } catch (e) {
      setError(e.message || 'Failed to remove device.');
    } finally {
      setDeviceBusyId(null);
    }
  };

  const handleDeleteAccount = async () => {
    clearAlert();
    if (confirmText !== 'DELETE') {
      return setError('Type DELETE to confirm.');
    }
    setSaving(true);
    try {
      await api('/api/users/self', { method: 'DELETE' });
      setSuccess('Account deleted. Redirecting…');
      setShowDeleteModal(false);
      setConfirmText('');
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1000);
    } catch (e) {
      setError(e.message || 'Failed to delete account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ft-root">
      <div className="ft-appbar">
        <div className="ft-brand">
          <div className="ft-brand-icon" />
          <div className="ft-brand-text">FloorTrack</div>
        </div>
        <div style={{ fontWeight: 600 }}>Profile</div>
      </div>

      {alert && (
        <div className={`pf-alert ${alert.type === 'error' ? 'pf-alert-error' : 'pf-alert-success'}`}>
          {alert.message}
        </div>
      )}

      <div className="pf-grid">
        {/* Profile Info */}
        <div className="ft-panel">
          <div className="ft-panel-header">
            <div className="ft-panel-title">Your Profile</div>
            <div className="ft-panel-sub">Basic information</div>
          </div>
          {loading ? (
            <div className="pf-loading">Loading...</div>
          ) : (
            <div className="pf-form">
              <div className="pf-field">
                <label className="pf-label">First Name</label>
                <input
                  className="pf-input"
                  value={user.firstName}
                  onChange={(e) => setUser({ ...user, firstName: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div className="pf-field">
                <label className="pf-label">Last Name</label>
                <input
                  className="pf-input"
                  value={user.lastName}
                  onChange={(e) => setUser({ ...user, lastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
              <div className="pf-actions">
                <button className="pf-btn" disabled={saving} onClick={handleSaveProfile}>
                  Save profile
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Change Email */}
        <div className="ft-panel">
          <div className="ft-panel-header">
            <div className="ft-panel-title">Change Email</div>
            <div className="ft-panel-sub">Current: {user.email || '—'}</div>
          </div>
          <div className="pf-form">
            <div className="pf-field">
              <label className="pf-label">New Email</label>
              <input
                className={`pf-input ${newEmail && !isValidEmail(newEmail) ? 'is-invalid' : ''}`}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@domain.com"
              />
            </div>
            <div className="pf-actions">
              <button className="pf-btn" disabled={!canSaveEmail || saving} onClick={handleSaveEmail}>
                Update email
              </button>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="ft-panel">
          <div className="ft-panel-header">
            <div className="ft-panel-title">Change Password</div>
            <div className="ft-panel-sub">Use at least 8 characters</div>
          </div>
          <div className="pf-form">
            <div className="pf-field">
              <label className="pf-label">Current Password</label>
              <input
                className="pf-input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <div className="pf-field">
              <label className="pf-label">New Password</label>
              <input
                className={`pf-input ${newPassword && !isStrongPassword(newPassword) ? 'is-invalid' : ''}`}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div className="pf-field">
              <label className="pf-label">Confirm New Password</label>
              <input
                className={`pf-input ${confirmPassword && confirmPassword !== newPassword ? 'is-invalid' : ''}`}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div className="pf-actions">
              <button className="pf-btn" disabled={!canSavePassword || saving} onClick={handleSavePassword}>
                Update password
              </button>
            </div>
          </div>
        </div>

        {/* Devices */}
        <div className="ft-panel">
          <div className="ft-panel-header">
            <div className="ft-panel-title">Your Devices</div>
            <div className="ft-panel-sub">Register devices by MAC address</div>
          </div>

          <div className="pf-device-add">
            <input
              className={`pf-input ${deviceMac && !macRegex.test(deviceMac) ? 'is-invalid' : ''}`}
              value={deviceMac}
              onChange={(e) => setDeviceMac(e.target.value)}
              placeholder="AA:BB:CC:DD:EE:FF"
            />
            <input
              className="pf-input"
              value={deviceNickname}
              onChange={(e) => setDeviceNickname(e.target.value)}
              placeholder="Nickname (optional)"
            />
            <button className="pf-btn" disabled={!canAddDevice || saving} onClick={handleAddDevice}>
              Add device
            </button>
          </div>

          <div className="pf-device-list">
            {devices.length === 0 ? (
              <div className="pf-empty">No devices yet.</div>
            ) : (
              devices.map((d) => (
                <div className="pf-device-item" key={d.id}>
                  <div className="pf-device-meta">
                    <div className="pf-device-title">{d.nickname || 'Unnamed device'}</div>
                    <div className="pf-device-sub">{d.mac}</div>
                  </div>
                  <button
                    className="pf-btn pf-btn-danger"
                    disabled={deviceBusyId === d.id}
                    onClick={() => handleRemoveDevice(d.id)}
                  >
                    {deviceBusyId === d.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="ft-panel pf-danger">
          <div className="ft-panel-header">
            <div className="ft-panel-title">Danger Zone</div>
            <div className="ft-panel-sub">Delete your account permanently</div>
          </div>
          <button className="pf-btn pf-btn-danger" onClick={() => setShowDeleteModal(true)}>
            Delete account
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="pf-modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pf-modal-title">Confirm Deletion</div>
            <div className="pf-modal-text">
              This action is permanent and will remove your data. Type DELETE to confirm.
            </div>
            <input
              className="pf-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
            />
            <div className="pf-actions pf-modal-actions">
              <button className="pf-btn" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                className="pf-btn pf-btn-danger"
                disabled={saving || confirmText !== 'DELETE'}
                onClick={handleDeleteAccount}
              >
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
