import { useEffect, useState } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const BEARER_TOKEN = 'OLIVER-BOSCH-BEUGRO';
const API_BASE = 'http://127.0.0.1:8000/api';

export default function App() {
  const [timestamps, setTimestamps] = useState<number[]>([]);
  const [prices, setPrices] = useState<number[]>([]);
  const [avgPrice, setAvgPrice] = useState<number>(0);
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);

  useEffect(() => {
    fetchPrices();
    fetchSchedule();
  }, []);

  const fetchPrices = async () => {
    try {
      const res = await axios.get(`${API_BASE}/prices`, {
        headers: { Authorization: `Bearer ${BEARER_TOKEN}` }
      });
      setTimestamps(res.data.unix_seconds);
      setPrices(res.data.prices_huf);
      setAvgPrice(res.data.average_price);
    } catch (err) {
      console.error("Hiba az árak lekérésekor:", err);
    }
  };

  const fetchSchedule = async () => {
    try {
      const res = await axios.get(`${API_BASE}/schedule`, {
        headers: { Authorization: `Bearer ${BEARER_TOKEN}` }
      });
      setSelectedBlocks(res.data);
    } catch (err) {
      console.error("Hiba az idősávok lekérésekor:", err);
    }
  };

  const toggleBlock = (timeStr: string, price: number, hour: number) => {
    // 2. Feladat Szabály 1: 23:00-00:00 tiltott
    if (hour === 23) {
      alert("A 23:00 és 00:00 közötti idősáv kiválasztása szigorúan tiltott!");
      return;
    }

    // 2. Feladat Szabály 2: Átlagfeletti ár figyelmeztetés
    if (!selectedBlocks.includes(timeStr) && price > avgPrice) {
      const confirmChoice = window.confirm(
        `Figyelem! A választott idősáv ára (${price} HUF/kWh) meghaladja a mai átlagárat (${avgPrice} HUF/kWh). Biztosan hozzáadod?`
      );
      if (!confirmChoice) return;
    }

    let updated = [...selectedBlocks];
    if (updated.includes(timeStr)) {
      updated = updated.filter(b => b !== timeStr);
    } else {
      updated.push(timeStr);
    }

    setSelectedBlocks(updated);
  };

  const saveSchedule = async () => {
    try {
      await axios.post(`${API_BASE}/schedule`, { time_blocks: selectedBlocks }, {
        headers: { Authorization: `Bearer ${BEARER_TOKEN}` }
      });
      alert("Preferált idősávok sikeresen elmentve!");
    } catch (err) {
      alert("Hiba mentés közben!");
    }
  };

  // Heatmap színképzés (0 = Zöld, 120 = Piros)
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const getColor = (price: number) => {
    const ratio = (price - minPrice) / (maxPrice - minPrice || 1);
    const hue = (1 - ratio) * 120; // 120 zöld, 0 piros
    return `hsl(${hue}, 100%, 40%)`;
  };

  // 4. Feladat: Chart adatok (óránkénti 10kW fogyasztás)
  const chartLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const chartDataPoints = chartLabels.map((_, hr) => {
    const isHeating = selectedBlocks.some(b => new Date(b).getHours() === hr);
    return isHeating ? 10 : 0;
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#121212', color: '#fff', minHeight: '100vh' }}>
      <h1>Kazán Vezérlő Dashboard (Bosch Beugró 2026.09)</h1>

      {/* 1. & 2. Feladat: Heatmap */}
      <section style={{ marginBottom: '30px', background: '#1e1e1e', padding: '20px', borderRadius: '10px' }}>
        <h2>1. & 2. Feladat: Dinamikus Árak Heatmap és Idősáv Kiválasztás</h2>
        <p>Átlagár: <strong>{avgPrice} HUF/kWh</strong></p>

        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '10px' }}>
          {prices.map((price, idx) => {
            const date = new Date(timestamps[idx] * 1000);
            const timeStr = date.toISOString().slice(0, 16).replace('T', ' ');
            const hour = date.getHours();
            const isSelected = selectedBlocks.includes(timeStr);

            return (
              <div
                key={idx}
                onClick={() => toggleBlock(timeStr, price, hour)}
                style={{
                  backgroundColor: getColor(price),
                  width: '35px',
                  height: '60px',
                  borderRadius: '4px',
                  cursor: hour === 23 ? 'not-allowed' : 'pointer',
                  opacity: hour === 23 ? 0.3 : 1,
                  border: isSelected ? '3px solid white' : '1px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
                title={`${timeStr} | ${price} HUF/kWh`}
              >
                {hour}h
              </div>
            );
          })}
        </div>

        <button onClick={saveSchedule} style={{ marginTop: '15px', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}>
          Idősávok Mentése
        </button>
      </section>

      {/* 4. Feladat: Fogyasztás Diagram */}
      <section style={{ background: '#ffffff', padding: '20px', borderRadius: '10px', color: '#000' }}>
        <h2>4. Feladat: Óránkénti Fogyasztás (10 kW / üzemóra)</h2>
        <Line
          data={{
            labels: chartLabels,
            datasets: [{
              label: 'Várható fogyasztás (kW)',
              data: chartDataPoints,
              borderColor: 'rgb(255, 99, 132)',
              backgroundColor: 'rgba(255, 99, 132, 0.5)',
              stepped: true
            }]
          }}
        />
      </section>
    </div>
  );
}