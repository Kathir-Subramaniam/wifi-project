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

async function fetchFloorDetail(floorId) {
  // Returns { id, name, svgMap }
  return api(`/api/floors/${floorId}`);
}

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file, 'utf-8');
  });

// Simple debounce hook
function useDebouncedState(initial, delay = 300) {
  const [value, setValue] = useState(initial);
  const [immediate, setImmediate] = useState(initial);
  useEffect(() => {
    const t = setTimeout(() => setImmediate(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return [immediate, setValue];
}

// A themed file picker that wraps a hidden input
function FilePicker({ onPick, label = 'Upload SVG', accept = '.svg,image/svg+xml', disabled }) {
  const inputRef = React.useRef(null);
  return (
    <div className="ft-filepicker">
      <button
        type="button"
        className="auth-submit-btn"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="ft-filepicker-input"
        onChange={onPick}
      />
    </div>
  );
}

// Generic comparator builder
function by(getter, dir = 'asc') {
  return (a, b) => {
    const av = getter(a);
    const bv = getter(b);
    if (av == null && bv != null) return dir === 'asc' ? 1 : -1;
    if (av != null && bv == null) return dir === 'asc' ? -1 : 1;
    if (av == null && bv == null) return 0;
    if (typeof av === 'number' && typeof bv === 'number') {
      return dir === 'asc' ? av - bv : bv - av;
    }
    const as = String(av).toLowerCase();
    const bs = String(bv).toLowerCase();
    if (as < bs) return dir === 'asc' ? -1 : 1;
    if (as > bs) return dir === 'asc' ? 1 : -1;
    return 0;
  };
}

// Stable multi-sort
function sortWith(list, ...comparators) {
  if (!Array.isArray(list)) return [];
  const cmp = (a, b) => {
    for (const c of comparators) {
      const r = c(a, b);
      if (r !== 0) return r;
    }
    return 0;
  };
  return [...list].sort(cmp);
}

function SortDropdown({ fields, value, order, onChange }) {
  // value: current field, order: 'asc'|'desc'
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef(null);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return;
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) setOpen(false);
    };
    const onEsc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const currentFieldLabel = fields.find(f => f.value === value)?.label || fields[0]?.label || 'Sort';
  const currentOrderLabel = order === 'desc' ? 'Descending' : 'Ascending';

  return (
    <div className="ft-sort-dd">
      <button
        ref={btnRef}
        type="button"
        className="auth-submit-btn ft-sort-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {currentFieldLabel} • {currentOrderLabel}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 6, opacity: 0.8 }}>
          <path d="M7 10l5 5 5-5" stroke="#CDE8FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div ref={menuRef} role="menu" className="ft-sort-menu">
          <div className="ft-sort-section">
            <div className="ft-legend-sub" style={{ padding: '6px 10px' }}>Field</div>
            {fields.map(f => {
              const selected = f.value === value;
              return (
                <button
                  key={f.value}
                  role="menuitemradio"
                  aria-checked={selected}
                  className={`ft-sort-item ${selected ? 'selected' : ''}`}
                  onClick={() => onChange({ field: f.value, order })}
                >
                  <span className="ft-sort-check">{selected ? '✓' : ''}</span>
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

          <div className="ft-sort-divider" />

          <div className="ft-sort-section">
            <div className="ft-legend-sub" style={{ padding: '6px 10px' }}>Order</div>
            {[
              { v: 'asc', label: 'Ascending' },
              { v: 'desc', label: 'Descending' },
            ].map(o => {
              const selected = o.v === order;
              return (
                <button
                  key={o.v}
                  role="menuitemradio"
                  aria-checked={selected}
                  className={`ft-sort-item ${selected ? 'selected' : ''}`}
                  onClick={() => onChange({ field: value, order: o.v })}
                >
                  <span className="ft-sort-check">{selected ? '✓' : ''}</span>
                  <span>{o.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SortBar({ fields, value, order, onField, onOrder }) {
  // Wrap unified onChange to update both parts
  const handleChange = ({ field, order }) => {
    onField(field);
    onOrder(order);
  };

  return (
    <div className="ft-sortbar">
      <div className="ft-legend-sub">Sort</div>
      <SortDropdown
        fields={fields}
        value={value}
        order={order}
        onChange={handleChange}
      />
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('buildings');
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [aps, setAps] = useState([]);
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // Sort state per tab
  const [sortBuildings, setSortBuildings] = useState({ field: 'name', order: 'asc' });
  const [sortFloors, setSortFloors] = useState({ field: 'buildingName', order: 'asc' });
  const [sortAPs, setSortAPs] = useState({ field: 'buildingId', order: 'asc' });
  const [sortDevices, setSortDevices] = useState({ field: 'apId', order: 'asc' });

  // Sorted views (computed each render)
  const buildingsSorted = sortWith(
    buildings,
    by(b => (sortBuildings.field === 'name' ? b.name : Number(b.id)), sortBuildings.order),
    by(b => Number(b.id), 'asc') // tiebreaker
  );

  const floorsSorted = sortWith(
    floors,
    // primary by selected
    ...(function () {
      const f = sortFloors.field;
      const ord = sortFloors.order;
      if (f === 'name') return [by(x => x.name, ord)];
      if (f === 'id') return [by(x => Number(x.id), ord)];
      if (f === 'buildingId') return [by(x => Number(x.buildingId), ord)];
      // default: buildingName (fallback to buildingId if missing)
      return [by(x => x.buildingName || '', ord), by(x => Number(x.buildingId), ord)];
    })(),
    // secondary sorts for determinism
    by(x => x.name, 'asc'),
    by(x => Number(x.id), 'asc')
  );

  const apsSorted = sortWith(
    aps,
    ...(function () {
      const f = sortAPs.field;
      const ord = sortAPs.order;
      if (f === 'name') return [by(x => x.name, ord)];
      if (f === 'id') return [by(x => Number(x.id), ord)];
      if (f === 'floorId') return [by(x => Number(x.floorId), ord)];
      if (f === 'cx') return [by(x => Number(x.cx), ord)];
      if (f === 'cy') return [by(x => Number(x.cy), ord)];
      // default buildingId
      return [by(x => Number(x.buildingId), ord)];
    })(),
    by(x => Number(x.floorId), 'asc'),
    by(x => x.name, 'asc'),
    by(x => Number(x.id), 'asc')
  );

  const devicesSorted = sortWith(
    devices,
    ...(function () {
      const f = sortDevices.field;
      const ord = sortDevices.order;
      if (f === 'id') return [by(x => Number(x.id), ord)];
      if (f === 'mac') return [by(x => x.mac, ord)];
      if (f === 'apId') return [by(x => Number(x.apId), ord)];
      if (f === 'floorId') return [by(x => Number(x.floorId), ord)];
      if (f === 'buildingId') return [by(x => Number(x.buildingId), ord)];
      return [by(x => Number(x.apId), ord)];
    })(),
    by(x => x.mac, 'asc'),
    by(x => Number(x.id), 'asc')
  );


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
        <a href="/home" className="ft-live-btn">Dashboard</a>
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
          <div className="ft-panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div className="ft-panel-title">Buildings</div>
              <div className="ft-panel-sub">Create, edit, or delete buildings</div>
            </div>
            <SortBar
              fields={[
                { value: 'name', label: 'Name' },
                { value: 'id', label: 'ID' },
              ]}
              value={sortBuildings.field}
              order={sortBuildings.order}
              onField={v => setSortBuildings(s => ({ ...s, field: v }))}
              onOrder={v => setSortBuildings(s => ({ ...s, order: v }))}
            />

          </div>
          <div>
          </div>
          {/* Create */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="auth-input" placeholder="Building name" value={bName} onChange={e => setBName(e.target.value)} />
            <button className="auth-submit-btn" disabled={busy || !bName} onClick={() => onCreateBuilding(bName)}>Add</button>
          </div>

          {/* List + edit */}
          {buildingsSorted.map(b => {
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
          <div className="ft-panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div className="ft-panel-title">Floors</div>
              <div className="ft-panel-sub">Create, edit, or delete floors</div>
            </div>
            <SortBar
              fields={[
                { value: 'buildingName', label: 'Building name' },
                { value: 'buildingId', label: 'Building ID' },
                { value: 'name', label: 'Floor name' },
                { value: 'id', label: 'Floor ID' },
              ]}
              value={sortFloors.field}
              order={sortFloors.order}
              onField={v => setSortFloors(s => ({ ...s, field: v }))}
              onOrder={v => setSortFloors(s => ({ ...s, order: v }))}
            />

          </div>

          {/* Create */}
          <div className="ft-row gap" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', marginBottom: 12 }}>
            <input className="auth-input" placeholder="Floor name" value={fName} onChange={e => setFName(e.target.value)} />
            <select className="auth-input" value={fBuildingId} onChange={e => setFBuildingId(e.target.value)}>
              <option value="">Select building</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input className="auth-input" placeholder="SVG map (Raw SVG text)" value={fSvg} onChange={e => setFSvg(e.target.value)} />
            <FilePicker
              disabled={busy}
              label="Upload SVG"
              onPick={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setBusy(true);
                  const text = (await readFileAsText(file)).trim();
                  if (!/^<\s*svg[\s>]/i.test(text)) throw new Error('Selected file is not an SVG');
                  setFSvg(text);
                  // Show filename badge
                  setEditFloor(prev => ({ ...prev, __createFile__: { name: file.name } }));
                } catch (err) {
                  setError(err.message);
                } finally {
                  setBusy(false);
                }
              }}
            />
            <button className="auth-submit-btn" disabled={busy || !fName || !fSvg || !fBuildingId} onClick={() => onCreateFloor(fName, fSvg, fBuildingId)}>Add</button>
          </div>

          {editFloor.__createFile__?.name && (
            <div className="ft-badge">Loaded: {editFloor.__createFile__.name}</div>
          )}


          {/* List + edit */}
          {floorsSorted.map(f => {
            const editing = editFloor[f.id] || null;

            const startEdit = async () => {
              try {
                setBusy(true);
                // Load full svgMap from detail endpoint
                const detail = await fetchFloorDetail(f.id);
                // detail.svgMap might be URL or raw SVG text; we display the raw text or URL string
                setEditFloor(prev => ({
                  ...prev,
                  [f.id]: { name: f.name, svgMap: detail?.svgMap ?? '' }
                }));
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            };

            return (
              <div key={f.id} className="ft-stat-card" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {editing ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, width: '100%' }}>
                    {/* Name edit */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                      <input
                        className="auth-input"
                        value={editing.name ?? f.name}
                        onChange={e => setEditFloor(prev => ({ ...prev, [f.id]: { ...editing, name: e.target.value } }))}
                        placeholder="Floor name"
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="auth-submit-btn" disabled={busy} onClick={() => saveFloor(f.id)}>Save</button>
                        <button className="auth-submit-btn" disabled={busy} onClick={() => setEditFloor(prev => { const p = { ...prev }; delete p[f.id]; return p; })}>Cancel</button>
                      </div>
                    </div>

                    {/* SVG edit */}
                    <div>
                      <div className="ft-legend-sub" style={{ marginBottom: 6 }}>SVG map (Raw SVG)</div>
                      <textarea
                        className="auth-input"
                        style={{
                          minHeight: 180,
                          resize: 'vertical',
                          background: '#0A1620',
                          border: '1px solid #223042',
                          borderRadius: 10,
                          color: '#E6EDF3',
                          padding: 12
                        }}
                        value={editing.svgMap ?? ''}
                        onChange={e => setEditFloor(prev => ({ ...prev, [f.id]: { ...editing, svgMap: e.target.value } }))}
                        placeholder="<svg ...>...</svg> or https://example.com/map.svg"
                      />
                      <input
                        type="file"
                        accept=".svg,image/svg+xml"
                        className="auth-input"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setBusy(true);
                            const text = (await readFileAsText(file)).trim();

                            if (!/^<\s*svg[\s>]/i.test(text)) {
                              throw new Error('Selected file is not an SVG');
                            }

                            setEditFloor(prev => ({
                              ...prev,
                              [f.id]: { ...editing, svgMap: text }
                            }));
                          } catch (err) {
                            setError(err.message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div style={{ fontWeight: 700 }}>{f.name} — {f.buildingName || `B#${f.buildingId}`} (#{f.id})</div>
                      <div className="ft-legend-sub" style={{ marginTop: 6 }}>
                        SVG: { /* show a compact hint of svgMap availability; fetch on edit for full content */}
                        <span style={{ opacity: 0.8 }}>Click Edit to view and modify the SVG map</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="auth-submit-btn" disabled={busy} onClick={startEdit}>Edit</button>
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
          <div className="ft-panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div className="ft-panel-title">Access Points</div>
              <div className="ft-panel-sub">Create, edit, or delete APs</div>
            </div>
            <SortBar
              fields={[
                { value: 'buildingId', label: 'Building ID' },
                { value: 'floorId', label: 'Floor ID' },
                { value: 'name', label: 'AP name' },
                { value: 'id', label: 'AP ID' },
                { value: 'cx', label: 'cx' },
                { value: 'cy', label: 'cy' },
              ]}
              value={sortAPs.field}
              order={sortAPs.order}
              onField={v => setSortAPs(s => ({ ...s, field: v }))}
              onOrder={v => setSortAPs(s => ({ ...s, order: v }))}
            />

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
          {apsSorted.map(a => {
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
          <div className="ft-panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div className="ft-panel-title">Devices</div>
              <div className="ft-panel-sub">Attach devices (clients) to APs</div>
            </div>
            <SortBar
              fields={[
                { value: 'apId', label: 'AP ID' },
                { value: 'floorId', label: 'Floor ID' },
                // { value: 'buildingId', label: 'Building ID' }, // enable once API includes buildingId
                { value: 'mac', label: 'MAC' },
                { value: 'id', label: 'Device ID' },
              ]}
              value={sortDevices.field}
              order={sortDevices.order}
              onField={v => setSortDevices(s => ({ ...s, field: v }))}
              onOrder={v => setSortDevices(s => ({ ...s, order: v }))}
            />

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
          {devicesSorted.map(d => {
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
