// import React, { useEffect, useState } from 'react';
// import './FloorDashboard.css'; // reuse styling
// const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
// import logo from './assets/logo.png';


// async function api(path, opts={}) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     credentials: 'include',
//     headers: { 'Content-Type': 'application/json' },
//     ...opts,
//   });
//   const data = await res.json().catch(() => ({}));
//   if (!res.ok) throw new Error(data?.error || 'Request failed');
//   return data;
// }

// export default function AdminDashboard() {
//   const [tab, setTab] = useState('buildings');
//   const [buildings, setBuildings] = useState([]);
//   const [floors, setFloors] = useState([]);
//   const [aps, setAps] = useState([]);
//   const [devices, setDevices] = useState([]);
//   const [error, setError] = useState(null);
//   const [busy, setBusy] = useState(false);

//   const reload = async () => {
//     setError(null);
//     try {
//       const [b, f, a, d] = await Promise.allSettled([
//         api('/api/admin/buildings'),
//         api('/api/admin/floors'),
//         api('/api/admin/aps'),
//         api('/api/admin/devices'),
//       ]);
//       if (b.status === 'fulfilled') setBuildings(b.value);
//       if (f.status === 'fulfilled') setFloors(f.value);
//       if (a.status === 'fulfilled') setAps(a.value);
//       if (d.status === 'fulfilled') setDevices(d.value);
//     } catch (e) {
//       setError(e.message);
//     }
//   };

//   useEffect(() => { reload(); }, []);

//   const onCreateBuilding = async (name) => {
//     setBusy(true); setError(null);
//     try {
//       await api('/api/admin/buildings', { method: 'POST', body: JSON.stringify({ name }) });
//       await reload();
//     } catch (e) { setError(e.message); } finally { setBusy(false); }
//   };

//   const onCreateFloor = async (name, svgMap, buildingId) => {
//     setBusy(true); setError(null);
//     try {
//       await api('/api/admin/floors', { method: 'POST', body: JSON.stringify({ name, svgMap, buildingId }) });
//       await reload();
//     } catch (e) { setError(e.message); } finally { setBusy(false); }
//   };

//   const onCreateAP = async (name, cx, cy, floorId) => {
//     setBusy(true); setError(null);
//     try {
//       await api('/api/admin/aps', { method: 'POST', body: JSON.stringify({ name, cx: Number(cx), cy: Number(cy), floorId }) });
//       await reload();
//     } catch (e) { setError(e.message); } finally { setBusy(false); }
//   };

//   const onCreateDevice = async (mac, apId) => {
//     setBusy(true); setError(null);
//     try {
//       await api('/api/admin/devices', { method: 'POST', body: JSON.stringify({ mac, apId }) });
//       await reload();
//     } catch (e) { setError(e.message); } finally { setBusy(false); }
//   };

//   const onDelete = async (kind, id) => {
//     setBusy(true); setError(null);
//     try {
//       await api(`/api/admin/${kind}/${id}`, { method: 'DELETE' });
//       await reload();
//     } catch (e) { setError(e.message); } finally { setBusy(false); }
//   };

//   const [bName, setBName] = useState('');
//   const [fName, setFName] = useState('');
//   const [fSvg, setFSvg] = useState('');
//   const [fBuildingId, setFBuildingId] = useState('');
//   const [apName, setApName] = useState('');
//   const [apCx, setApCx] = useState('');
//   const [apCy, setApCy] = useState('');
//   const [apFloorId, setApFloorId] = useState('');
//   const [devMac, setDevMac] = useState('');
//   const [devApId, setDevApId] = useState('');

//   const TabButton = ({ id, label }) => (
//     <button className={`auth-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
//   );

//   return (
//     <div className="ft-root">
//       <div className="ft-appbar">
//         <div className="ft-brand">
//           <a href="/home">
//           <div className="ft-brand-icon"><img src={logo} className="ft-brand-icon" /></div>
//           </a>
//           <div className="ft-brand-text">Admin</div>
//         </div>
//       </div>

//       <div className="auth-tabs" style={{ marginBottom: 16 }}>
//         <TabButton id="buildings" label="Buildings" />
//         <TabButton id="floors" label="Floors" />
//         <TabButton id="aps" label="APs" />
//         <TabButton id="devices" label="Devices" />
//       </div>

//       {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 12 }}>{String(error)}</div>}

//       {tab === 'buildings' && (
//         <div className="ft-panel">
//           <div className="ft-panel-header">
//             <div className="ft-panel-title">Buildings</div>
//             <div className="ft-panel-sub">Create or manage buildings</div>
//           </div>
//           <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
//             <input className="auth-input" placeholder="Building name" value={bName} onChange={e => setBName(e.target.value)} />
//             <button className="auth-submit-btn" disabled={busy || !bName} onClick={() => onCreateBuilding(bName)}>Add</button>
//           </div>
//           {buildings.map(b => (
//             <div key={b.id} className="ft-stat-card" style={{ justifyContent: 'space-between' }}>
//               <div>{b.name} (#{b.id})</div>
//               <button className="auth-submit-btn" disabled={busy} onClick={() => onDelete('buildings', b.id)}>Delete</button>
//             </div>
//           ))}
//         </div>
//       )}

//       {tab === 'floors' && (
//         <div className="ft-panel">
//           <div className="ft-panel-header">
//             <div className="ft-panel-title">Floors</div>
//             <div className="ft-panel-sub">Create or manage floors</div>
//           </div>
//           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 12 }}>
//             <input className="auth-input" placeholder="Floor name" value={fName} onChange={e => setFName(e.target.value)} />
//             <input className="auth-input" placeholder="SVG map (URL or SVG text)" value={fSvg} onChange={e => setFSvg(e.target.value)} />
//             <select className="auth-input" value={fBuildingId} onChange={e => setFBuildingId(e.target.value)}>
//               <option value="">Select building</option>
//               {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
//             </select>
//             <button className="auth-submit-btn" disabled={busy || !fName || !fSvg || !fBuildingId} onClick={() => onCreateFloor(fName, fSvg, fBuildingId)}>Add</button>
//           </div>
//           {floors.map(f => (
//             <div key={f.id} className="ft-stat-card" style={{ justifyContent: 'space-between' }}>
//               <div>{f.name} — {f.buildingName || `B#${f.buildingId}`} (#{f.id})</div>
//               <button className="auth-submit-btn" disabled={busy} onClick={() => onDelete('floors', f.id)}>Delete</button>
//             </div>
//           ))}
//         </div>
//       )}

//       {tab === 'aps' && (
//         <div className="ft-panel">
//           <div className="ft-panel-header">
//             <div className="ft-panel-title">Access Points</div>
//             <div className="ft-panel-sub">Create or manage APs</div>
//           </div>
//           <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 1fr auto', gap: 8, marginBottom: 12 }}>
//             <input className="auth-input" placeholder="AP name" value={apName} onChange={e => setApName(e.target.value)} />
//             <input className="auth-input" placeholder="cx" value={apCx} onChange={e => setApCx(e.target.value)} />
//             <input className="auth-input" placeholder="cy" value={apCy} onChange={e => setApCy(e.target.value)} />
//             <select className="auth-input" value={apFloorId} onChange={e => setApFloorId(e.target.value)}>
//               <option value="">Select floor</option>
//               {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
//             </select>
//             <button className="auth-submit-btn" disabled={busy || !apName || !apCx || !apCy || !apFloorId} onClick={() => onCreateAP(apName, apCx, apCy, apFloorId)}>Add</button>
//           </div>
//           {aps.map(ap => (
//             <div key={ap.id} className="ft-stat-card" style={{ justifyContent: 'space-between' }}>
//               <div>{ap.name} — Floor #{ap.floorId} (#{ap.id})</div>
//               <button className="auth-submit-btn" disabled={busy} onClick={() => onDelete('aps', ap.id)}>Delete</button>
//             </div>
//           ))}
//         </div>
//       )}

//       {tab === 'devices' && (
//         <div className="ft-panel">
//           <div className="ft-panel-header">
//             <div className="ft-panel-title">Devices</div>
//             <div className="ft-panel-sub">Attach devices (clients) to APs</div>
//           </div>
//           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 12 }}>
//             <input className="auth-input" placeholder="MAC address" value={devMac} onChange={e => setDevMac(e.target.value)} />
//             <select className="auth-input" value={devApId} onChange={e => setDevApId(e.target.value)}>
//               <option value="">Select AP</option>
//               {aps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
//             </select>
//             <button className="auth-submit-btn" disabled={busy || !devMac || !devApId} onClick={() => onCreateDevice(devMac, devApId)}>Add</button>
//           </div>
//           {devices.map(d => (
//             <div key={d.id} className="ft-stat-card" style={{ justifyContent: 'space-between' }}>
//               <div>{d.mac} — AP #{d.apId} (#{d.id})</div>
//               <button className="auth-submit-btn" disabled={busy} onClick={() => onDelete('devices', d.id)}>Delete</button>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }


import React, { useEffect, useState } from 'react';
import './FloorDashboard.css'; // reuse styling
import logo from './assets/logo.png';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('buildings');
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [aps, setAps] = useState([]);
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    setError(null);
    try {
      const [b, f, a, d] = await Promise.allSettled([
        api('/api/admin/buildings'),
        api('/api/admin/floors'),
        api('/api/admin/aps'),
        api('/api/admin/devices'),
      ]);
      if (b.status === 'fulfilled') setBuildings(b.value);
      if (f.status === 'fulfilled') setFloors(f.value);
      if (a.status === 'fulfilled') setAps(a.value);
      if (d.status === 'fulfilled') setDevices(d.value);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { reload(); }, []);

  // Create handlers
  const onCreateBuilding = async (name) => {
    setBusy(true); setError(null);
    try {
      await api('/api/admin/buildings', { method: 'POST', body: JSON.stringify({ name }) });
      await reload();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const onCreateFloor = async (name, svgMap, buildingId) => {
    setBusy(true); setError(null);
    try {
      await api('/api/admin/floors', { method: 'POST', body: JSON.stringify({ name, svgMap, buildingId }) });
      await reload();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const onCreateAP = async (name, cx, cy, floorId) => {
    setBusy(true); setError(null);
    try {
      await api('/api/admin/aps', { method: 'POST', body: JSON.stringify({ name, cx: Number(cx), cy: Number(cy), floorId }) });
      await reload();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const onCreateDevice = async (mac, apId) => {
    setBusy(true); setError(null);
    try {
      await api('/api/admin/devices', { method: 'POST', body: JSON.stringify({ mac, apId }) });
      await reload();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  // Delete
  const onDelete = async (kind, id) => {
    setBusy(true); setError(null);
    try {
      await api(`/api/admin/${kind}/${id}`, { method: 'DELETE' });
      await reload();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  // Edit state maps
  const [editBuilding, setEditBuilding] = useState({}); // {id: { name }}
  const [editFloor, setEditFloor] = useState({});       // {id: { name, svgMap }}
  const [editAP, setEditAP] = useState({});             // {id: { name, cx, cy }}
  const [editDevice, setEditDevice] = useState({});     // {id: { mac, apId }}

  // Save edits
  const saveBuilding = async (id) => {
    const payload = editBuilding[id];
    if (!payload) return;
    setBusy(true); setError(null);
    try {
      await api(`/api/admin/buildings/${id}`, { method: 'PUT', body: JSON.stringify({ name: payload.name }) });
      setEditBuilding(prev => { const p = { ...prev }; delete p[id]; return p; });
      await reload();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const saveFloor = async (id) => {
    const payload = editFloor[id];
    if (!payload) return;
    setBusy(true); setError(null);
    try {
      // Both fields optional; send whichever changed
      const body = {};
      if (payload.name != null) body.name = payload.name;
      if (payload.svgMap != null) body.svgMap = payload.svgMap;
      await api(`/api/admin/floors/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      setEditFloor(prev => { const p = { ...prev }; delete p[id]; return p; });
      await reload();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const saveAP = async (id) => {
    const payload = editAP[id];
    if (!payload) return;
    setBusy(true); setError(null);
    try {
      const body = {};
      if (payload.name != null) body.name = payload.name;
      if (payload.cx != null) body.cx = Number(payload.cx);
      if (payload.cy != null) body.cy = Number(payload.cy);
      await api(`/api/admin/aps/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      setEditAP(prev => { const p = { ...prev }; delete p[id]; return p; });
      await reload();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const saveDevice = async (id) => {
    const payload = editDevice[id];
    if (!payload) return;
    setBusy(true); setError(null);
    try {
      // You need a PUT endpoint for devices to support mac/apId changes.
      // If implemented as /api/admin/devices/:id with { mac, apId }, uncomment:
      // await api(`/api/admin/devices/${id}`, { method: 'PUT', body: JSON.stringify({ mac: payload.mac, apId: payload.apId }) });
      // For now, we’ll show an error if endpoint not available:
      throw new Error('Device edit is not enabled yet. Please implement PUT /api/admin/devices/:id');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  // Create fields
  const [bName, setBName] = useState('');
  const [fName, setFName] = useState('');
  const [fSvg, setFSvg] = useState('');
  const [fBuildingId, setFBuildingId] = useState('');
  const [apName, setApName] = useState('');
  const [apCx, setApCx] = useState('');
  const [apCy, setApCy] = useState('');
  const [apFloorId, setApFloorId] = useState('');
  const [devMac, setDevMac] = useState('');
  const [devApId, setDevApId] = useState('');

  const TabButton = ({ id, label }) => (
    <button className={`auth-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
  );

  return (
    <div className="ft-root">
      <div className="ft-appbar">
        <div className="ft-brand">
          <a href="/home">
           <div className="ft-brand-icon"><img src={logo} className="ft-brand-icon" /></div>
           </a>
          <div className="ft-brand-text">Admin</div>
        </div>
        <a href="/" className="ft-live-btn">Dashboard</a>
      </div>

      <div className="auth-tabs" style={{ marginBottom: 16 }}>
        <TabButton id="buildings" label="Buildings" />
        <TabButton id="floors" label="Floors" />
        <TabButton id="aps" label="APs" />
        <TabButton id="devices" label="Devices" />
      </div>

      {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 12 }}>{String(error)}</div>}

      {/* Buildings */}
      {tab === 'buildings' && (
        <div className="ft-panel">
          <div className="ft-panel-header">
            <div className="ft-panel-title">Buildings</div>
            <div className="ft-panel-sub">Create, edit, or delete buildings</div>
          </div>

          {/* Create */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="auth-input" placeholder="Building name" value={bName} onChange={e => setBName(e.target.value)} />
            <button className="auth-submit-btn" disabled={busy || !bName} onClick={() => onCreateBuilding(bName)}>Add</button>
          </div>

          {/* List + edit */}
          {buildings.map(b => {
            const editing = editBuilding[b.id] || null;
            return (
              <div key={b.id} className="ft-stat-card" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                {editing ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
                    <input className="auth-input" value={editing.name ?? b.name} onChange={e => setEditBuilding(prev => ({ ...prev, [b.id]: { ...editing, name: e.target.value } }))} />
                    <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                      <button className="auth-submit-btn" disabled={busy} onClick={() => saveBuilding(b.id)}>Save</button>
                      <button className="auth-submit-btn" disabled={busy} onClick={() => setEditBuilding(prev => { const p = { ...prev }; delete p[b.id]; return p; })}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>{b.name} (#{b.id})</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="auth-submit-btn" disabled={busy} onClick={() => setEditBuilding(prev => ({ ...prev, [b.id]: { name: b.name } }))}>Edit</button>
                      <button className="auth-submit-btn" disabled={busy} onClick={() => onDelete('buildings', b.id)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floors */}
      {tab === 'floors' && (
        <div className="ft-panel">
          <div className="ft-panel-header">
            <div className="ft-panel-title">Floors</div>
            <div className="ft-panel-sub">Create, edit, or delete floors</div>
          </div>

          {/* Create */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 12 }}>
            <input className="auth-input" placeholder="Floor name" value={fName} onChange={e => setFName(e.target.value)} />
            <input className="auth-input" placeholder="SVG map (URL or SVG text)" value={fSvg} onChange={e => setFSvg(e.target.value)} />
            <select className="auth-input" value={fBuildingId} onChange={e => setFBuildingId(e.target.value)}>
              <option value="">Select building</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button className="auth-submit-btn" disabled={busy || !fName || !fSvg || !fBuildingId} onClick={() => onCreateFloor(fName, fSvg, fBuildingId)}>Add</button>
          </div>

          {/* List + edit */}
          {floors.map(f => {
            const editing = editFloor[f.id] || null;
            return (
              <div key={f.id} className="ft-stat-card" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                {editing ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center', width: '100%' }}>
                    <input className="auth-input" value={editing.name ?? f.name} onChange={e => setEditFloor(prev => ({ ...prev, [f.id]: { ...editing, name: e.target.value } }))} />
                    <input className="auth-input" placeholder="SVG map" value={editing.svgMap ?? ''} onChange={e => setEditFloor(prev => ({ ...prev, [f.id]: { ...editing, svgMap: e.target.value } }))} />
                    <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                      <button className="auth-submit-btn" disabled={busy} onClick={() => saveFloor(f.id)}>Save</button>
                      <button className="auth-submit-btn" disabled={busy} onClick={() => setEditFloor(prev => { const p = { ...prev }; delete p[f.id]; return p; })}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>{f.name} — {f.buildingName || `B#${f.buildingId}`} (#{f.id})</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="auth-submit-btn" disabled={busy} onClick={() => setEditFloor(prev => ({ ...prev, [f.id]: { name: f.name, svgMap: '' } }))}>Edit</button>
                      <button className="auth-submit-btn" disabled={busy} onClick={() => onDelete('floors', f.id)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* APs */}
      {tab === 'aps' && (
        <div className="ft-panel">
          <div className="ft-panel-header">
            <div className="ft-panel-title">Access Points</div>
            <div className="ft-panel-sub">Create, edit, or delete APs</div>
          </div>

          {/* Create */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 1fr auto', gap: 8, marginBottom: 12 }}>
            <input className="auth-input" placeholder="AP name" value={apName} onChange={e => setApName(e.target.value)} />
            <input className="auth-input" placeholder="cx" value={apCx} onChange={e => setApCx(e.target.value)} />
            <input className="auth-input" placeholder="cy" value={apCy} onChange={e => setApCy(e.target.value)} />
            <select className="auth-input" value={apFloorId} onChange={e => setApFloorId(e.target.value)}>
              <option value="">Select floor</option>
              {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <button className="auth-submit-btn" disabled={busy || !apName || !apCx || !apCy || !apFloorId} onClick={() => onCreateAP(apName, apCx, apCy, apFloorId)}>Add</button>
          </div>

          {/* List + edit */}
          {aps.map(a => {
            const editing = editAP[a.id] || null;
            return (
              <div key={a.id} className="ft-stat-card" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                {editing ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px auto', gap: 8, alignItems: 'center', width: '100%' }}>
                    <input className="auth-input" value={editing.name ?? a.name} onChange={e => setEditAP(prev => ({ ...prev, [a.id]: { ...editing, name: e.target.value } }))} />
                    <input className="auth-input" placeholder="cx" value={editing.cx ?? a.cx} onChange={e => setEditAP(prev => ({ ...prev, [a.id]: { ...editing, cx: e.target.value } }))} />
                    <input className="auth-input" placeholder="cy" value={editing.cy ?? a.cy} onChange={e => setEditAP(prev => ({ ...prev, [a.id]: { ...editing, cy: e.target.value } }))} />
                    <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                      <button className="auth-submit-btn" disabled={busy} onClick={() => saveAP(a.id)}>Save</button>
                      <button className="auth-submit-btn" disabled={busy} onClick={() => setEditAP(prev => { const p = { ...prev }; delete p[a.id]; return p; })}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>{a.name} — Floor #{a.floorId} (#{a.id})</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="auth-submit-btn" disabled={busy} onClick={() => setEditAP(prev => ({ ...prev, [a.id]: { name: a.name, cx: a.cx, cy: a.cy } }))}>Edit</button>
                      <button className="auth-submit-btn" disabled={busy} onClick={() => onDelete('aps', a.id)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Devices */}
      {tab === 'devices' && (
        <div className="ft-panel">
          <div className="ft-panel-header">
            <div className="ft-panel-title">Devices</div>
            <div className="ft-panel-sub">Attach devices (clients) to APs</div>
          </div>

          {/* Create */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 12 }}>
            <input className="auth-input" placeholder="MAC address" value={devMac} onChange={e => setDevMac(e.target.value)} />
            <select className="auth-input" value={devApId} onChange={e => setDevApId(e.target.value)}>
              <option value="">Select AP</option>
              {aps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button className="auth-submit-btn" disabled={busy || !devMac || !devApId} onClick={() => onCreateDevice(devMac, devApId)}>Add</button>
          </div>

          {/* List + edit */}
          {devices.map(d => {
            const editing = editDevice[d.id] || null;
            return (
              <div key={d.id} className="ft-stat-card" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                {editing ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center', width: '100%' }}>
                    <input className="auth-input" placeholder="MAC" value={editing.mac ?? d.mac} onChange={e => setEditDevice(prev => ({ ...prev, [d.id]: { ...editing, mac: e.target.value } }))} />
                    <select className="auth-input" value={editing.apId ?? d.apId} onChange={e => setEditDevice(prev => ({ ...prev, [d.id]: { ...editing, apId: e.target.value } }))}>
                      <option value="">Select AP</option>
                      {aps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                      <button className="auth-submit-btn" disabled={busy} onClick={() => saveDevice(d.id)}>Save</button>
                      <button className="auth-submit-btn" disabled={busy} onClick={() => setEditDevice(prev => { const p = { ...prev }; delete p[d.id]; return p; })}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>{d.mac} — AP #{d.apId} (#{d.id})</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="auth-submit-btn" disabled={busy} onClick={() => setEditDevice(prev => ({ ...prev, [d.id]: { mac: d.mac, apId: d.apId } }))}>Edit</button>
                      <button className="auth-submit-btn" disabled={busy} onClick={() => onDelete('devices', d.id)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
