import React, { useState, useEffect } from 'react';

const Sidebar = ({ onSearch, onRoute, start, end, setStart, setEnd, profile, setProfile }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [startQuery, setStartQuery] = useState('');
    const [endQuery, setEndQuery] = useState('');
    const [startResults, setStartResults] = useState([]);
    const [endResults, setEndResults] = useState([]);
    const [isSearchingStart, setIsSearchingStart] = useState(false);
    const [isSearchingEnd, setIsSearchingEnd] = useState(false);

    useEffect(() => {
        if (start) setStartQuery(start.name);
    }, [start]);

    useEffect(() => {
        if (end) setEndQuery(end.name);
    }, [end]);

    const handleSearch = async (query, setResults, setIsSearching) => {
        if (!query) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const results = await onSearch(query);
            setResults(results);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (startQuery && startQuery !== start?.name) {
                handleSearch(startQuery, setStartResults, setIsSearchingStart);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [startQuery, start]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (endQuery && endQuery !== end?.name) {
                handleSearch(endQuery, setEndResults, setIsSearchingEnd);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [endQuery, end]);


    const selectLocation = (loc, type) => {
        if (type === 'start') {
            setStart(loc);
            setStartQuery(loc.name);
            setStartResults([]);
        } else {
            setEnd(loc);
            setEndQuery(loc.name);
            setEndResults([]);
        }
    };

    const toggleSidebar = () => setIsOpen(!isOpen);

    if (!isOpen) {
        return (
            <div style={{
                position: 'absolute', top: '20px', left: '20px', zIndex: 2000,
                background: 'white', padding: '10px', borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)', cursor: 'pointer'
            }} onClick={toggleSidebar}>
                <span style={{ fontSize: '20px' }}>🍔 uOttaMove</span>
            </div>
        );
    }

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            width: '350px',
            maxHeight: '90vh',
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            padding: '20px',
            fontFamily: 'Inter, sans-serif',
            overflowY: 'auto'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '20px' }}>uOttaMove ♿</h2>
                <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✖</button>
            </div>

            {/* Profile Section */}
            <div>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginBottom: '5px', color: '#666' }}>ACCESSIBILITY PROFILE</label>
                <select
                    value={profile}
                    onChange={(e) => setProfile(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', background: '#f8f9fa' }}
                >
                    <option value="wheelchair">Wheelchair (Strict)</option>
                    <option value="pedestrian">Pedestrian (Standard)</option>
                </select>
            </div>

            {/* Inputs Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                {/* Start Input */}
                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginBottom: '5px', color: '#2ecc71' }}>START POINT</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            value={startQuery}
                            onChange={(e) => setStartQuery(e.target.value)}
                            onFocus={() => { if (startQuery && startResults.length === 0) handleSearch(startQuery, setStartResults, setIsSearchingStart) }}
                            placeholder="Search start location..."
                            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}
                        />
                    </div>
                    {/* Dropdown for Start */}
                    {startResults.length > 0 && (
                        <ul style={{
                            position: 'absolute', top: '100%', left: 0, right: 0,
                            background: 'white', border: '1px solid #ddd', borderRadius: '6px',
                            listStyle: 'none', padding: 0, margin: 0, zIndex: 100, maxHeight: '200px', overflowY: 'auto',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}>
                            {startResults.map((res, idx) => (
                                <li
                                    key={idx}
                                    onClick={() => selectLocation(res, 'start')}
                                    style={{ padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: '13px' }}
                                    onMouseOver={(e) => e.target.style.background = '#f8f9fa'}
                                    onMouseOut={(e) => e.target.style.background = 'white'}
                                >
                                    {res.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* End Input */}
                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginBottom: '5px', color: '#e74c3c' }}>DESTINATION</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            value={endQuery}
                            onChange={(e) => setEndQuery(e.target.value)}
                            onFocus={() => { if (endQuery && endResults.length === 0) handleSearch(endQuery, setEndResults, setIsSearchingEnd) }}
                            placeholder="Search destination..."
                            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}
                        />
                    </div>
                    {/* Dropdown for End */}
                    {endResults.length > 0 && (
                        <ul style={{
                            position: 'absolute', top: '100%', left: 0, right: 0,
                            background: 'white', border: '1px solid #ddd', borderRadius: '6px',
                            listStyle: 'none', padding: 0, margin: 0, zIndex: 100, maxHeight: '200px', overflowY: 'auto',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}>
                            {endResults.map((res, idx) => (
                                <li
                                    key={idx}
                                    onClick={() => selectLocation(res, 'end')}
                                    style={{ padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: '13px' }}
                                    onMouseOver={(e) => e.target.style.background = '#f8f9fa'}
                                    onMouseOut={(e) => e.target.style.background = 'white'}
                                >
                                    {res.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div style={{ marginTop: 'auto' }}>
                <button
                    onClick={onRoute}
                    disabled={!start || !end}
                    style={{
                        width: '100%', padding: '15px',
                        background: (!start || !end) ? '#95a5a6' : '#3498db',
                        color: 'white', border: 'none', borderRadius: '8px',
                        cursor: (!start || !end) ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold', fontSize: '16px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    {(!start || !end) ? 'Select Locations' : 'Find Accessible Route'}
                </button>
            </div>

        </div>
    );
};

export default Sidebar;
