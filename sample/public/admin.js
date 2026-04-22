const socket = io();

// State
let parkingLots = {};
let chartInstance = null;

const kpiOccupancy = document.getElementById('kpi-occupancy');
const kpiFull = document.getElementById('kpi-full');
const tbody = document.querySelector('#status-table tbody');

async function init() {
  const res = await fetch('/api/parking_lots');
  const data = await res.json();

  data.forEach(lot => {
    parkingLots[lot.id] = lot;
  });

  updateDashboard();
  initChart();
}

function updateDashboard() {
  let totalSpotsAll = 0;
  let availableSpotsAll = 0;
  let fullCount = 0;

  tbody.innerHTML = '';

  Object.values(parkingLots).forEach(lot => {
    totalSpotsAll += lot.total_spots;
    availableSpotsAll += lot.available_spots;

    if (lot.is_full || lot.available_spots === 0) fullCount++;

    const occupancyRate = ((lot.total_spots - lot.available_spots) / lot.total_spots * 100).toFixed(1);
    const statusClass = lot.available_spots === 0 ? 'full' : 'free';
    const statusText = lot.available_spots === 0 ? '満車' : '稼働中';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${lot.id}</td>
      <td><strong>${lot.name}</strong></td>
      <td>${lot.available_spots} / ${lot.total_spots}</td>
      <td>${occupancyRate}%</td>
      <td><span class="badge ${statusClass}">${statusText}</span></td>
    `;
    tbody.appendChild(tr);
  });

  const overallOccupancy = totalSpotsAll > 0
    ? ((totalSpotsAll - availableSpotsAll) / totalSpotsAll * 100).toFixed(1)
    : 0;

  kpiOccupancy.textContent = `${overallOccupancy}%`;
  kpiFull.textContent = `${fullCount} 箇所`;
}

function initChart() {
  const ctx = document.getElementById('occupancyChart').getContext('2d');

  const labels = [];
  const data = [];

  Object.values(parkingLots).forEach(lot => {
    labels.push(lot.name);
    data.push(((lot.total_spots - lot.available_spots) / lot.total_spots * 100).toFixed(1));
  });

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '稼働率 (%)',
        data: data,
        backgroundColor: '#4F46E5',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, max: 100 }
      }
    }
  });
}

function updateChart() {
  if (!chartInstance) return;

  const data = [];
  Object.values(parkingLots).forEach(lot => {
    data.push(((lot.total_spots - lot.available_spots) / lot.total_spots * 100).toFixed(1));
  });

  chartInstance.data.datasets[0].data = data;
  chartInstance.update();
}

// WebSocket Listeners
socket.on('parking_update', (data) => {
  if (parkingLots[data.id]) {
    parkingLots[data.id].available_spots = data.available_spots;
    parkingLots[data.id].is_full = data.is_full;

    updateDashboard();
    updateChart();
  }
});

init();
