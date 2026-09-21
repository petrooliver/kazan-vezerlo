import React, { useState, useEffect, useMemo } from 'react';

// Típusdefiníciók
interface EnergyPrice {
  time: string;
  price: number;
}

interface HourlyConsumption {
  hour: string;
  kw: number;
  isSelected: boolean;
  selectedBlockCount: number;
  isFixHeating: boolean;
}

export default function App() {
  // Dátum állapot
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Állapotok az energiaárakhoz
  const [energyPrices, setEnergyPrices] = useState<EnergyPrice[]>([]);
  
  // 1. KIJELÖLT IDŐSÁVOK BETÖLTÉSE LOCALSTORAGE-BÓL (alapértelmezett érték)
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>(() => {
    const savedBlocks = localStorage.getItem('kazan_selected_blocks');
    if (savedBlocks) {
      try {
        return JSON.parse(savedBlocks);
      } catch (e) {
        console.error('Hiba a helyi adatok beolvasásakor:', e);
      }
    }
    // Ha még nem volt elmentve semmi, a fix fűtési időszak az alapértelmezett
    return [
      '05:00', '05:15', '05:30', '05:45',
      '13:00', '13:15', '13:30', '13:45'
    ];
  });

  const [warningMessage, setWarningMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hoveredPoint, setHoveredPoint] = useState<HourlyConsumption | null>(null);

  // 2. SZERVERRŐL ÉS LOCALSTORAGE-BÓL VALÓ BETÖLTÉSE INDÍTÁSKOR
  useEffect(() => {
    // Energiaárak lekérése
    fetch('http://localhost:8000/api/energy-prices')
      .then((res) => res.json())
      .then((data) => {
        let pricesArray: EnergyPrice[] = [];
        if (Array.isArray(data)) pricesArray = data;
        else if (data?.data && Array.isArray(data.data)) pricesArray = data.data;

        if (pricesArray.length > 0) {
          setEnergyPrices(pricesArray.map(p => ({ ...p, price: Number(p.price) })));
        } else {
          generateFallbackPrices();
        }
      })
      .catch(() => generateFallbackPrices());

    // Mentett menetrend lekérése a backendről (ha elérhető)
    fetch('http://localhost:8000/api/schedule', {
      headers: { 'Authorization': 'Bearer OLIVER-BOSCH-BEUGRO' }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.time_blocks) && data.time_blocks.length > 0) {
          setSelectedBlocks(data.time_blocks);
          localStorage.setItem('kazan_selected_blocks', JSON.stringify(data.time_blocks));
        }
      })
      .catch(() => {
        // Ha a szerver offline, a localStorage-ban lévő mentett adatok futnak tovább
      });
  }, []);

  // 3. AMIKOR VÁLTOZNAK A KIPI PÁLT ELEMEK, AZONNAL MENTJÜK A LOCALSTORAGE-BA
  useEffect(() => {
    localStorage.setItem('kazan_selected_blocks', JSON.stringify(selectedBlocks));
  }, [selectedBlocks]);

  // Tartalék árak generálása
  const generateFallbackPrices = () => {
    const fallback: EnergyPrice[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const priceVal = Math.round(35 + Math.sin(h / 3) * 15 + (m / 15) * 2);
        fallback.push({ time: timeStr, price: priceVal });
      }
    }
    setEnergyPrices(fallback);
  };

  // Átlagár kiszámítása
  const averagePrice = useMemo(() => {
    if (!energyPrices.length) return 0;
    return energyPrices.reduce((sum, p) => sum + p.price, 0) / energyPrices.length;
  }, [energyPrices]);

  // Óránkénti fogyasztás kiszámítása KIZÁRÓLAG A KIPIPÁLT IDŐSÁVOK ALAPJÁN
  const consumptionData = useMemo<HourlyConsumption[]>(() => {
    const data: HourlyConsumption[] = [];
    let seed = selectedDate.split('-').reduce((acc, val) => acc + parseInt(val), 0);

    for (let h = 0; h < 24; h++) {
      const hourStr = `${h.toString().padStart(2, '0')}:00`;
      const isFixHeating = h === 5 || h === 13;

      const hourBlocks = [
        `${h.toString().padStart(2, '0')}:00`,
        `${h.toString().padStart(2, '0')}:15`,
        `${h.toString().padStart(2, '0')}:30`,
        `${h.toString().padStart(2, '0')}:45`,
      ];
      const selectedInHour = hourBlocks.filter(b => selectedBlocks.includes(b)).length;

      let kw = 0;
      if (selectedInHour > 0) {
        const baseKw = isFixHeating 
          ? (20 + ((seed + h * 7) % 11)) 
          : (5 + ((seed * 13 + h * 17) % 25));
        
        kw = Math.round((baseKw * selectedInHour) / 4);
      }

      data.push({
        hour: hourStr,
        kw,
        isSelected: selectedInHour > 0,
        selectedBlockCount: selectedInHour,
        isFixHeating
      });
    }
    return data;
  }, [selectedDate, selectedBlocks]);

  // Összegzett adatok
  const totalDailyConsumption = useMemo(() => {
    return consumptionData.reduce((sum, d) => sum + d.kw, 0);
  }, [consumptionData]);

  const totalEstimatedCost = useMemo(() => {
    return selectedBlocks.reduce((sum, blockTime) => {
      const priceObj = energyPrices.find(p => p.time === blockTime);
      return sum + (priceObj ? (priceObj.price * 0.25 * 10) : 0);
    }, 0);
  }, [selectedBlocks, energyPrices]);

  // Pipálás / Kijelölés kezelése
  const toggleBlock = (blockTime: string) => {
    let updated = selectedBlocks.includes(blockTime)
      ? selectedBlocks.filter((b) => b !== blockTime)
      : [...selectedBlocks, blockTime];

    setSelectedBlocks(updated);

    if (updated.length > 0 && updated.length < 2) {
      setErrorMessage('A kijelölésnek legalább 30 percesnek (2 blokk) kell lennie!');
    } else {
      setErrorMessage('');
    }

    const hasAboveAvg = updated.some((b) => {
      const item = energyPrices.find((p) => p.time === b);
      return item && item.price > averagePrice;
    });

    if (hasAboveAvg) {
      setWarningMessage('⚠️ Figyelem: A kijelölt időszakok között van átlag feletti áramárú sáv!');
    } else {
      setWarningMessage('');
    }
  };

  // Gyors kijelölések
  const selectCheapest = () => {
    const cheapest = energyPrices
      .filter(p => !(p.time >= '23:00' && p.time <= '23:45') && p.price <= averagePrice)
      .map(p => p.time);
    setSelectedBlocks(cheapest);
    setErrorMessage('');
  };

  const selectFixHeating = () => {
    const fixBlocks = [
      '05:00', '05:15', '05:30', '05:45',
      '13:00', '13:15', '13:30', '13:45'
    ];
    setSelectedBlocks(fixBlocks);
    setErrorMessage('');
  };

  const clearAll = () => {
    setSelectedBlocks([]);
    setErrorMessage('');
    setWarningMessage('');
  };

  // Mentés a szerverre és helyi tárolóba
  const handleSave = async () => {
    if (selectedBlocks.length < 2) return;

    // Helyi tárolóba azonnali mentés
    localStorage.setItem('kazan_selected_blocks', JSON.stringify(selectedBlocks));

    try {
      const res = await fetch('http://localhost:8000/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer OLIVER-BOSCH-BEUGRO'
        },
        body: JSON.stringify({ time_blocks: selectedBlocks })
      });
      if (res.ok) {
        alert('✅ Kijelölt idősávok elmentve! (Oldalfrissítés után is megmarad)');
      } else {
        alert('⚠️ A szerver hibát adott, de a böngésződben elmentettük a beállításokat!');
      }
    } catch {
      alert('⚠️ Hálózati hiba! A kijelöléseket helyileg (browser) elmentettük!');
    }
  };

  // SVG Diagram méretek
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingLeft = 45;
  const paddingBottom = 30;
  const graphWidth = svgWidth - paddingLeft - 20;
  const graphHeight = svgHeight - paddingBottom - 20;
  const maxKw = 35;

  const points = consumptionData.map((d, index) => {
    const x = paddingLeft + (index / 23) * graphWidth;
    const y = 20 + graphHeight - (d.kw / maxKw) * graphHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${20 + graphHeight} L ${points[0].x} ${20 + graphHeight} Z`;

  return (
    <div style={{ backgroundColor: '#f4f6f9', minHeight: '100vh', padding: '30px 15px', fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif", color: '#2c3e50' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Fejléc */}
        <header style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', color: '#1a252f', fontWeight: '700' }}>⚡ Okos Kazán Vezérlő & Dinamikus Diagram</h1>
            <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>A kipipált idősávok frissítés után is elmentve maradnak!</p>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '8px 16px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: '600', fontSize: '14px' }}>📅 Dátum:</span>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
            />
          </div>
        </header>

        {/* Összefoglaló Kártyák */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '25px' }}>
          <div style={cardStyle}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', letterSpacing: '0.5px' }}>KIPIPÁLT IDŐSZAKOK</span>
            <div style={{ fontSize: '26px', fontWeight: '700', color: '#2563eb', marginTop: '4px' }}>
              {selectedBlocks.length * 15} <span style={{ fontSize: '16px' }}>perc</span>
            </div>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{selectedBlocks.length} blokk kiválasztva</span>
          </div>

          <div style={cardStyle}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', letterSpacing: '0.5px' }}>KIJELÖLT FOGYASZTÁS</span>
            <div style={{ fontSize: '26px', fontWeight: '700', color: '#059669', marginTop: '4px' }}>
              {totalDailyConsumption} <span style={{ fontSize: '16px' }}>kWh</span>
            </div>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>A diagramon ábrázolva</span>
          </div>

          <div style={cardStyle}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', letterSpacing: '0.5px' }}>BECSÜLT KÖLTSÉG</span>
            <div style={{ fontSize: '26px', fontWeight: '700', color: '#d97706', marginTop: '4px' }}>
              {Math.round(totalEstimatedCost)} <span style={{ fontSize: '16px' }}>Ft</span>
            </div>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>A kipipált sávok ára alapján</span>
          </div>

          <div style={cardStyle}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', letterSpacing: '0.5px' }}>FIX FŰTÉSI IDŐSZAKOK</span>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#dc2626', marginTop: '6px' }}>
              🔥 05:00-06:00 <br/>🔥 13:00-14:00
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Kötelező hőérzeti sávok</span>
          </div>
        </div>

        {/* DIAGRAM */}
        <div style={{ ...cardStyle, marginBottom: '25px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
              📈 Kazán Fogyasztási Diagram (Kipipált időszakok: {selectedBlocks.length * 15} perc)
            </h3>
            <span style={{ fontSize: '12px', backgroundColor: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '20px', fontWeight: '600' }}>
              Mentett adatok alapján
            </span>
          </div>

          {/* SVG Diagram */}
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', minWidth: '600px' }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Rácsvonalak */}
              {[0, 10, 20, 30].map((val) => {
                const y = 20 + graphHeight - (val / maxKw) * graphHeight;
                return (
                  <g key={val}>
                    <line x1={paddingLeft} y1={y} x2={svgWidth - 20} y2={y} stroke="#e2e8f0" strokeDasharray="4" />
                    <text x={paddingLeft - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{val}kW</text>
                  </g>
                );
              })}

              <path d={areaD} fill="url(#chartGradient)" />
              <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Adatpontok */}
              {points.map((pt, idx) => (
                <g key={idx}>
                  {idx % 3 === 0 && (
                    <text x={pt.x} y={svgHeight - 8} textAnchor="middle" fontSize="11" fill="#64748b">{pt.hour}</text>
                  )}

                  {pt.isSelected && (
                    <circle cx={pt.x} cy={pt.y} r="7" fill={pt.isFixHeating ? "#ef4444" : "#3b82f6"} opacity="0.3" />
                  )}

                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={pt.isSelected ? "5" : "3"}
                    fill={!pt.isSelected ? "#cbd5e1" : pt.isFixHeating ? "#dc2626" : "#2563eb"}
                    stroke="#ffffff"
                    strokeWidth="2"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              ))}
            </svg>
          </div>

          {hoveredPoint && (
            <div style={{ marginTop: '12px', backgroundColor: '#0f172a', color: '#fff', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', display: 'inline-block' }}>
              🕒 <strong>{hoveredPoint.hour}</strong> | 
              Állapot: <strong>{hoveredPoint.isSelected ? `KIPIPÁLVA (${hoveredPoint.selectedBlockCount * 15} perc)` : 'Nincs kipipálva'}</strong> | 
              Fogyasztás: <strong>{hoveredPoint.kw} kW</strong>
            </div>
          )}
        </div>

        {/* IDŐSÁVOK KIPI PÁLÁSA */}
        <div style={{ ...cardStyle, padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>☑️ Idősávok Pipálása (Azonnali mentéssel)</h3>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={selectCheapest} style={subButtonStyle}>⚡ Legolcsóbbak</button>
              <button onClick={selectFixHeating} style={subButtonStyle}>🔥 Fix Fűtés</button>
              <button onClick={clearAll} style={{ ...subButtonStyle, backgroundColor: '#f1f5f9', color: '#64748b' }}>🗑️ Törlés</button>
            </div>
          </div>

          {errorMessage && (
            <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', fontWeight: '600', fontSize: '13px' }}>
              ❌ {errorMessage}
            </div>
          )}

          {warningMessage && (
            <div style={{ backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b', color: '#92400e', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', fontWeight: '600', fontSize: '13px' }}>
              {warningMessage}
            </div>
          )}

          {/* Blokkok rácsa */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
            gap: '8px',
            maxHeight: '340px',
            overflowY: 'auto',
            padding: '10px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            backgroundColor: '#f8fafc'
          }}>
            {energyPrices.map((item) => {
              const isForbidden = item.time >= '23:00' && item.time <= '23:45';
              const isSelected = selectedBlocks.includes(item.time);
              const isAboveAvg = item.price > averagePrice;

              return (
                <button
                  key={item.time}
                  disabled={isForbidden}
                  onClick={() => toggleBlock(item.time)}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: isForbidden
                      ? '#e2e8f0'
                      : isSelected
                      ? '#2563eb'
                      : isAboveAvg
                      ? '#fff1f2'
                      : '#ffffff',
                    color: isForbidden ? '#94a3b8' : isSelected ? '#ffffff' : '#1e293b',
                    cursor: isForbidden ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span>{isSelected ? '☑️' : '☐'}</span>
                    <span>{item.time}</span>
                  </div>
                  <div style={{ fontSize: '11px', opacity: isSelected ? 0.9 : 0.7, marginTop: '2px' }}>
                    {item.price} Ft
                  </div>
                  {isForbidden && <div style={{ fontSize: '9px', color: '#ef4444', fontWeight: 'bold' }}>Tiltott</div>}
                </button>
              );
            })}
          </div>

          {/* Mentés sáv */}
          <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>
              Kijelölve: <span style={{ color: '#2563eb' }}>{selectedBlocks.length * 15} perc</span> ({selectedBlocks.length} idősáv)
            </span>

            <button
              onClick={handleSave}
              disabled={selectedBlocks.length < 2}
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: selectedBlocks.length < 2 ? '#cbd5e1' : '#10b981',
                color: '#ffffff',
                cursor: selectedBlocks.length < 2 ? 'not-allowed' : 'pointer',
                boxShadow: selectedBlocks.length >= 2 ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none'
              }}
            >
              💾 Mentés Backendre & Helyileg
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// Egységes Kártya Stílusok
const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '16px',
  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.04)',
  border: '1px solid #e2e8f0'
};

const subButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '12px',
  fontWeight: '600',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#1e293b',
  cursor: 'pointer'
};