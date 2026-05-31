const LOCAL_STORAGE_KEY = 'ff_tournaments';
const USERS_DB_KEY = 'crx_users';
const LOGGED_IN_USER_KEY = 'crx_logged_in_user';
const TRANSACTIONS_KEY = 'crx_transactions';
let currentJoinMatchId = null;

// --- DATA MANAGEMENT ---
function getMatches() {
  return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
}

function saveMatches(matches) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(matches));
}

function initMockData() {
  if (getMatches().length === 0) {
    saveMatches([{
      id: Date.now().toString(),
      name: "Bermuda Daily Squad",
      type: "Squad",
      version: "Mobile / PC",
      perKill: "5 Reward",
      fee: "Free",
      prize: "500 Reward",
      timing: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      map: "Bermuda",
      totalPlayers: 48,
      joinedPlayers: 0,
      players: [],
      roomId: "",
      password: ""
    }]);
  }
}

// --- WALLET LOGIC UTILS ---
function getUserBalance(email) {
  let users = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
  const user = users.find(u => u.email === email);
  return user && user.walletBalance ? Number(user.walletBalance) : 0;
}

function updateUserBalance(email, amountChange) {
  let users = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
  const userIndex = users.findIndex(u => u.email === email);
  if (userIndex > -1) {
    users[userIndex].walletBalance = (Number(users[userIndex].walletBalance) || 0) + Number(amountChange);
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    const loggedInUser = JSON.parse(localStorage.getItem(LOGGED_IN_USER_KEY));
    if (loggedInUser && loggedInUser.email === email) {
      const hBal = document.getElementById('headerWalletBalance');
      if (hBal) hBal.innerText = users[userIndex].walletBalance;
    }
  }
}

// --- USER AUTH LOGIC ---
function initApp() {
  const authScreen = document.getElementById('authScreen');
  const mainApp = document.getElementById('mainApp');
  const loggedInUser = localStorage.getItem(LOGGED_IN_USER_KEY);
  
  if (authScreen && mainApp) {
    if (loggedInUser) {
      authScreen.classList.add('hidden');
      mainApp.classList.remove('hidden');
      const hBal = document.getElementById('headerWalletBalance');
      if (hBal) {
        hBal.innerText = getUserBalance(JSON.parse(loggedInUser).email);
      }
    } else {
      authScreen.classList.remove('hidden');
      mainApp.classList.add('hidden');
    }
  } else if (document.getElementById('walletUserName')) {
    if (!loggedInUser) {
      window.location.href = 'index.html';
    } else {
      initWalletPage();
    }
  }
}

function toggleAuthMode(mode) {
  if (mode === 'signup') {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.remove('hidden');
  } else {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('signupForm').classList.add('hidden');
  }
}

function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pass = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;

  if (pass !== confirm) {
    alert("Passwords do not match!");
    return;
  }

  let users = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
  if (users.find(u => u.email === email)) {
    alert("An account with this Email/Mobile already exists!");
    return;
  }

  users.push({ name, email, pass });
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  localStorage.setItem(LOGGED_IN_USER_KEY, JSON.stringify({ name, email }));
  
  initApp();
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;

  let users = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
  const user = users.find(u => u.email === email && u.pass === pass);

  if (user) {
    localStorage.setItem(LOGGED_IN_USER_KEY, JSON.stringify({ name: user.name, email: user.email }));
    initApp();
  } else {
    alert("Invalid Email/Mobile or Password!");
  }
}

function openProfileModal() {
  const loggedInUser = JSON.parse(localStorage.getItem(LOGGED_IN_USER_KEY));
  if (!loggedInUser) return;

  let users = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
  const user = users.find(u => u.email === loggedInUser.email);

  if (user) {
    document.getElementById('profileName').value = user.name;
    document.getElementById('profileEmail').value = user.email;
    document.getElementById('profilePassword').value = '';
    document.getElementById('profileModal').style.display = 'flex';
  }
}

function closeProfileModal() {
  document.getElementById('profileModal').style.display = 'none';
}

function saveProfile() {
  const loggedInUser = JSON.parse(localStorage.getItem(LOGGED_IN_USER_KEY));
  if (!loggedInUser) return;

  const newName = document.getElementById('profileName').value.trim();
  const newEmail = document.getElementById('profileEmail').value.trim();
  const newPass = document.getElementById('profilePassword').value;

  if (!newName || !newEmail) {
    alert("Name and Email cannot be empty.");
    return;
  }

  let users = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
  const userIndex = users.findIndex(u => u.email === loggedInUser.email);

  if (userIndex === -1) return;

  if (newEmail !== loggedInUser.email && users.find(u => u.email === newEmail)) {
    alert("An account with this Email/Mobile already exists!");
    return;
  }

  users[userIndex].name = newName;
  users[userIndex].email = newEmail;
  if (newPass) users[userIndex].pass = newPass;

  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  localStorage.setItem(LOGGED_IN_USER_KEY, JSON.stringify({ name: newName, email: newEmail }));

  alert("Profile updated successfully!");
  closeProfileModal();
}

function userLogout() {
  localStorage.removeItem(LOGGED_IN_USER_KEY);
  closeProfileModal();
  initApp();
}

// --- HOME PAGE LOGIC ---
function openCategory(cat) {
  document.getElementById('homeScreen').classList.add('hidden');
  document.getElementById('matchesScreen').classList.remove('hidden');
  document.getElementById('catTitle').innerText = `${cat} Matches`;
  renderCategoryMatches(cat);
}

function showHome() {
  document.getElementById('matchesScreen').classList.add('hidden');
  document.getElementById('homeScreen').classList.remove('hidden');
}

function renderCategoryMatches(cat) {
  const container = document.getElementById('matchesGrid');
  if (!container) return;
  const matches = getMatches().filter(m => m.type === cat);
  
  if (matches.length === 0) {
    container.innerHTML = `<p style="text-align:center; color: #8a9bb8; margin-top:20px;">No upcoming matches in this category.</p>`;
    return;
  }
  container.innerHTML = matches.map(m => {
    const joinedCount = m.players && m.players.length > 0 ? m.players.length : Number(m.joinedPlayers) || 0;
    const isFull = joinedCount >= Number(m.totalPlayers);
    return `
    <div class="match-app-card">
      <div class="match-banner" style="background: url('https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=500&q=80') center/cover;">
        <div class="match-banner-overlay"></div>
        <div class="match-app-header">
          <div>
            <h3>${m.name}</h3>
            <p class="match-app-time">⏰ ${new Date(m.timing).toLocaleString()}</p>
          </div>
          <div class="wallet-box" style="background: rgba(0,0,0,0.7); border-color: var(--primary); color: #fff;">
            🎮 ${joinedCount}/${m.totalPlayers}
          </div>
        </div>
      </div>
      <div class="match-app-body">
        <div class="stats-grid">
          <div class="stat-box stat-prize"><span>Prize Pool</span><strong>${m.prize}</strong></div>
          <div class="stat-box"><span>Per Kill</span><strong>${m.perKill || '-'}</strong></div>
          <div class="stat-box"><span>Entry Fee</span><strong style="color:var(--primary);">${m.fee}</strong></div>
        </div>
        <div class="match-info-grid">
          <div>Type <strong>${m.type}</strong></div>
          <div>Version <strong>${m.version || 'Mobile'}</strong></div>
          <div>Map <strong>${m.map}</strong></div>
        </div>
        <div class="players-list-box">
          <h4>Joined Players (${joinedCount}/${m.totalPlayers})</h4>
          ${m.players && m.players.length > 0 ? 
            `<ol class="player-ol">
              ${m.players.map(p => `<li>${p}</li>`).join('')}
            </ol>` : 
            `<p class="no-players">No players joined yet.</p>`
          }
        </div>
        ${isFull ? 
          `<button class="btn-primary btn-full" onclick="alert('This match is full. You cannot join now.')">MATCH FULL</button>` : 
          `<button class="btn-primary" onclick="openJoinModal('${m.id}')">JOIN NOW</button>`
        }
        <button class="btn-secondary" onclick="openRoomDetailsModal('${m.id}')" style="margin-top: 10px;">ROOM DETAILS</button>
      </div>
    </div>
  `}).join('');
}

function openJoinModal(id) {
  const match = getMatches().find(m => m.id === id);
  if (!match) return;
  const joinedCount = match.players && match.players.length > 0 ? match.players.length : Number(match.joinedPlayers) || 0;
  if (joinedCount >= Number(match.totalPlayers)) {
    alert('This match is full. You cannot join now.');
    return;
  }
  currentJoinMatchId = id;
  document.getElementById('joinModal').style.display = 'flex';
  document.getElementById('nameInputSection').classList.remove('hidden');
  document.getElementById('roomDetailsSection').classList.add('hidden');
  document.getElementById('gameNameInput').value = '';
}

function closeModal() {
  document.getElementById('joinModal').style.display = 'none';
  currentJoinMatchId = null;
}

function openRoomDetailsModal(id) {
  const match = getMatches().find(m => m.id === id);
  if (!match) return;

  const hasRoomDetails = (match.roomId && match.roomId.trim() !== '') || (match.password && match.password.trim() !== '');

  if (hasRoomDetails) {
    document.getElementById('roomDetailsModalMatchName').innerText = match.name;
    document.getElementById('roomDetailsModalTiming').innerText = new Date(match.timing).toLocaleString();
    document.getElementById('roomDetailsModalId').innerText = match.roomId || '-';
    document.getElementById('roomDetailsModalPassword').innerText = match.password || '-';
    document.getElementById('roomDetailsModal').style.display = 'flex';
  } else {
    alert("Room details are not available yet.");
  }
}

function closeRoomDetailsModal() {
  document.getElementById('roomDetailsModal').style.display = 'none';
}

function submitGameName() {
  const name = document.getElementById('gameNameInput').value.trim();
  if (!name) {
    alert("Please enter your game name.");
    return;
  }
  
  const matches = getMatches();
  const matchIndex = matches.findIndex(m => m.id === currentJoinMatchId);
  if (matchIndex === -1) return;

  const match = matches[matchIndex];
  
  // Initialize players array if it doesn't exist
  if (!match.players) match.players = [];

  // Prevent same player from joining multiple times
  if (match.players.includes(name)) {
    alert("You already joined this match.");
    return;
  }

  // Add player & Update count
  match.players.push(name);
  match.joinedPlayers = match.players.length;
  saveMatches(matches);
  
  // Update UI Instantly behind the modal
  renderCategoryMatches(match.type);

  document.getElementById('nameInputSection').classList.add('hidden');
  document.getElementById('roomDetailsSection').classList.remove('hidden');
  
  document.getElementById('modalMatchName').innerText = match.name;
  document.getElementById('modalMatchTiming').innerText = new Date(match.timing).toLocaleString();
  
  const credsBox = document.getElementById('modalCredentials');
  if (match.roomId && match.password) {
    credsBox.innerHTML = `<p><strong>Room ID:</strong> <span>${match.roomId}</span></p><p><strong>Password:</strong> <span>${match.password}</span></p>`;
  } else {
    credsBox.innerHTML = `<p class="alert-text">Room ID and Password will be available before match time.</p>`;
  }
}

// --- ADMIN PAGE LOGIC ---
function renderAdminMatches() {
  const container = document.getElementById('adminMatchesList');
  if (!container) return;
  const matches = getMatches();
  container.innerHTML = matches.map(m => `
    <div class="admin-match-item">
      <div class="admin-match-info">
        <h4>${m.name} <span style="font-size: 0.8rem; color:#888;">(${m.type})</span></h4>
        <p>${new Date(m.timing).toLocaleString()} | Map: ${m.map} | Prize: ${m.prize}</p>
      </div>
      <div class="admin-actions">
        <button class="btn-edit" onclick="editMatch('${m.id}')">Edit</button>
        <button class="btn-delete" onclick="deleteMatch('${m.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function handleAdminSubmit(e) {
  e.preventDefault();
  const matches = getMatches();
  const editId = document.getElementById('editMatchId').value;
  
  const matchData = {
    name: document.getElementById('matchName').value,
    type: document.getElementById('matchType').value,
    version: document.getElementById('matchVersion').value,
    perKill: document.getElementById('perKill').value,
    fee: document.getElementById('entryFee').value,
    prize: document.getElementById('prizePool').value,
    timing: document.getElementById('matchTiming').value,
    map: document.getElementById('mapName').value,
    totalPlayers: document.getElementById('totalPlayers').value,
    joinedPlayers: document.getElementById('joinedPlayers').value,
    roomId: document.getElementById('roomId').value,
    password: document.getElementById('password').value,
  };

  if (editId) {
    const index = matches.findIndex(m => m.id === editId);
    if (index > -1) matches[index] = { ...matches[index], ...matchData };
    alert("Match updated successfully!");
  } else {
    matches.push({ id: Date.now().toString(), players: [], ...matchData });
    alert("New match added successfully!");
  }

  saveMatches(matches);
  cancelEdit();
  renderAdminMatches();
}

function editMatch(id) {
  const match = getMatches().find(m => m.id === id);
  if (!match) return;

  document.getElementById('formTitle').innerText = "✏️ Edit Match";
  document.getElementById('editMatchId').value = match.id;
  document.getElementById('matchName').value = match.name;
  document.getElementById('matchType').value = match.type;
  document.getElementById('matchVersion').value = match.version || '';
  document.getElementById('perKill').value = match.perKill || '';
  document.getElementById('entryFee').value = match.fee;
  document.getElementById('prizePool').value = match.prize;
  document.getElementById('matchTiming').value = match.timing;
  document.getElementById('mapName').value = match.map;
  document.getElementById('totalPlayers').value = match.totalPlayers;
  document.getElementById('joinedPlayers').value = match.joinedPlayers;
  document.getElementById('roomId').value = match.roomId;
  document.getElementById('password').value = match.password;
  
  document.getElementById('cancelEditBtn').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
  const form = document.getElementById('adminForm');
  if(!form) return;
  
  document.getElementById('formTitle').innerText = "🔧 Add New Match";
  document.getElementById('editMatchId').value = '';
  form.reset();
  document.getElementById('cancelEditBtn').classList.add('hidden');
}

function deleteMatch(id) {
  if (!confirm("Are you sure you want to delete this match?")) return;
  const matches = getMatches().filter(m => m.id !== id);
  saveMatches(matches);
  renderAdminMatches();
}

// --- ADMIN AUTH LOGIC ---
function adminLogin() {
  const user = document.getElementById('adminUser').value;
  const pass = document.getElementById('adminPass').value;
  if (user === 'HIMAYAT' && pass === 'HIMAYAT@1234') {
    sessionStorage.setItem('adminLoggedIn', 'true');
    showAdminDashboard();
  } else {
    alert('Invalid credentials!');
  }
}

function adminLogout() {
  sessionStorage.removeItem('adminLoggedIn');
  window.location.reload();
}

function showAdminDashboard() {
  document.getElementById('adminLoginSection').classList.add('hidden');
  document.getElementById('adminDashboardSection').classList.remove('hidden');
  document.getElementById('logoutBtn').classList.remove('hidden');
}

function renderAdminWithdrawRequests() {
  const container = document.getElementById('adminWithdrawRequests');
  if (!container) return;
  let txs = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
  let pendingTxs = txs.filter(t => t.status === 'Pending').sort((a,b) => new Date(a.date) - new Date(b.date));
  
  if (pendingTxs.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); font-style:italic;">No pending requests.</p>';
    return;
  }
  container.innerHTML = pendingTxs.map(t => `
    <div style="background: var(--card-bg); padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--primary); display: flex; justify-content: space-between; align-items: center;">
      <div><strong>${t.email}</strong><div style="font-size: 0.8rem; color: var(--text-muted);">₹${t.amount} | UPI: <span style="color:var(--text);">${t.upi}</span></div></div>
      <div style="display: flex; gap: 5px;">
        <button onclick="approveWithdraw('${t.id}')" style="background:#00ff9d; color:#000; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size: 0.8rem;">✓</button>
        <button onclick="rejectWithdraw('${t.id}')" style="background:#ff4444; color:#fff; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size: 0.8rem;">✗</button>
      </div>
    </div>
  `).join('');
}

function approveWithdraw(id) {
  let txs = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
  const index = txs.findIndex(t => t.id === id);
  if (index > -1) {
    txs[index].status = 'Approved';
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txs));
    renderAdminWithdrawRequests();
  }
}

function rejectWithdraw(id) {
  let txs = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
  const index = txs.findIndex(t => t.id === id);
  if (index > -1) {
    updateUserBalance(txs[index].email, txs[index].amount); // Refund
    txs[index].status = 'Rejected';
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txs));
    renderAdminWithdrawRequests();
  }
}

function adminAddMoney() {
  const email = document.getElementById('adminWalletEmail').value.trim();
  const amount = document.getElementById('adminWalletAmount').value;
  if (!email || !amount || amount <= 0) { alert('Enter valid details.'); return; }
  updateUserBalance(email, Number(amount));
  let txs = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
  txs.push({ id: Date.now().toString(), email: email, type: 'Added by Admin', amount: Number(amount), upi: '-', status: 'Approved', date: new Date().toISOString() });
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txs));
  alert('Balance added successfully!');
}

function adminDeductMoney() {
  const email = document.getElementById('adminWalletEmail').value.trim();
  const amount = document.getElementById('adminWalletAmount').value;
  if (!email || !amount || amount <= 0) { alert('Enter valid details.'); return; }
  updateUserBalance(email, -Number(amount));
  let txs = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
  txs.push({ id: Date.now().toString(), email: email, type: 'Deducted by Admin', amount: Number(amount), upi: '-', status: 'Approved', date: new Date().toISOString() });
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txs));
  alert('Balance deducted successfully!');
}

// --- INIT ---
window.onload = () => {
  initMockData();
  initApp();

  const adminDashboard = document.getElementById('adminDashboardSection');
  if (adminDashboard) {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
      showAdminDashboard();
    }
    renderAdminWithdrawRequests();
    renderAdminMatches();
    const adminForm = document.getElementById('adminForm');
    if (adminForm) adminForm.addEventListener('submit', handleAdminSubmit);
  }

  // --- BOTTOM NAVIGATION EVENT LISTENERS ---
  const walletBtn = document.getElementById('walletBtn');
  if (walletBtn) walletBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'wallet.html';
  });

  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) profileBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openProfileModal();
  });

  const playBtn = document.getElementById('playBtn');
  if (playBtn) playBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showHome();
  });

  const chatBtn = document.getElementById('chatBtn');
  if (chatBtn) chatBtn.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Chat feature is coming soon!');
  });
};