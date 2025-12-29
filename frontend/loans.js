// Loan Management JavaScript - localStorage version

// Global state
let loansGiven = [];
let loansToPay = [];

// LocalStorage keys
const STORAGE_KEYS = {
  loansGiven: 'loansGiven',
  loansToPay: 'loansToPay'
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadLoansGiven();
  loadLoansToPay();
  setupFormHandlers();
});

// =====================================================
// TAB SWITCHING
// =====================================================
function switchTab(tab) {
  // Remove active from all tabs
  document.querySelectorAll('.loan-tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.loan-tab-content').forEach(content => content.classList.remove('active'));
  
  // Add active to selected tab
  if (tab === 'given') {
    document.getElementById('loans-given-content').classList.add('active');
    document.querySelectorAll('.loan-tab-button')[0].classList.add('active');
  } else {
    document.getElementById('loans-to-pay-content').classList.add('active');
    document.querySelectorAll('.loan-tab-button')[1].classList.add('active');
  }
}

// =====================================================
// LOANS GIVEN
// =====================================================
function loadLoansGiven() {
  const stored = localStorage.getItem(STORAGE_KEYS.loansGiven);
  loansGiven = stored ? JSON.parse(stored) : [];
  renderLoansGivenTable();
}

function saveLoansGiven() {
  localStorage.setItem(STORAGE_KEYS.loansGiven, JSON.stringify(loansGiven));
}

function renderLoansGivenTable() {
  const tbody = document.getElementById('loans-given-tbody');
  tbody.innerHTML = '';
  
  loansGiven.forEach((loan, index) => {
    const remaining = loan.amount - (loan.totalPaid || 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${loan.name}</td>
      <td>₹${loan.amount.toFixed(2)}</td>
      <td>${loan.dueDate || 'N/A'}</td>
      <td>${loan.reminder || 'None'}</td>
      <td><span class="status-${loan.status}">${loan.status}</span></td>
      <td>₹${(loan.totalPaid || 0).toFixed(2)}</td>
      <td>₹${remaining.toFixed(2)}</td>
      <td>
        <button onclick="editLoanGiven(${index})" class="btn btn-sm">Edit</button>
        <button onclick="deleteLoanGiven(${index})" class="btn btn-sm btn-danger">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function addLoanGiven() {
  const name = document.getElementById('borrowerName').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const dueDate = document.getElementById('dueDate').value;
  const status = document.getElementById('status').value;
  const notes = document.getElementById('notes').value;
  
  if (!name || !amount) {
    alert('Please fill in all required fields');
    return;
  }
  
  const loan = {
    id: Date.now(),
    name,
    amount,
    dueDate,
    status,
    notes,
    totalPaid: 0,
    createdAt: new Date().toISOString()
  };
  
  loansGiven.push(loan);
  saveLoansGiven();
  renderLoansGivenTable();
  closeModal('addLoanGivenModal');
  clearFormGiven();
}

function editLoanGiven(index) {
  const loan = loansGiven[index];
  document.getElementById('borrowerName').value = loan.name;
  document.getElementById('amount').value = loan.amount;
  document.getElementById('dueDate').value = loan.dueDate;
  document.getElementById('status').value = loan.status;
  document.getElementById('notes').value = loan.notes || '';
  
  showModal('addLoanGivenModal');
  
  // Store editing index
  document.getElementById('addLoanGivenModal').dataset.editIndex = index;
}

function deleteLoanGiven(index) {
  if (confirm('Are you sure you want to delete this loan?')) {
    loansGiven.splice(index, 1);
    saveLoansGiven();
    renderLoansGivenTable();
  }
}

function clearFormGiven() {
  document.getElementById('borrowerName').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('dueDate').value = '';
  document.getElementById('status').value = 'pending';
  document.getElementById('notes').value = '';
}

// =====================================================
// LOANS TO PAY
// =====================================================
function loadLoansToPay() {
  const stored = localStorage.getItem(STORAGE_KEYS.loansToPay);
  loansToPay = stored ? JSON.parse(stored) : [];
  renderLoansToPayTable();
}

function saveLoansToPay() {
  localStorage.setItem(STORAGE_KEYS.loansToPay, JSON.stringify(loansToPay));
}

function renderLoansToPayTable() {
  const tbody = document.getElementById('loans-to-pay-tbody');
  tbody.innerHTML = '';
  
  loansToPay.forEach((loan, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${loan.lender}</td>
      <td>₹${loan.originalPrincipal.toFixed(2)}</td>
      <td>₹${loan.currentPrincipal.toFixed(2)}</td>
      <td>${loan.interestRate}%</td>
      <td>${loan.dueDate || 'N/A'}</td>
      <td><span class="status-${loan.status}">${loan.status}</span></td>
      <td>
        <button onclick="editLoanToPay(${index})" class="btn btn-sm">Edit</button>
        <button onclick="deleteLoanToPay(${index})" class="btn btn-sm btn-danger">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function addLoanToPay() {
  const lender = document.getElementById('lenderName').value;
  const originalPrincipal = parseFloat(document.getElementById('originalPrincipal').value);
  const interestRate = parseFloat(document.getElementById('interestRate').value);
  const dueDate = document.getElementById('dueDatePay').value;
  const notes = document.getElementById('notesPay').value;
  
  if (!lender || !originalPrincipal || !interestRate) {
    alert('Please fill in all required fields');
    return;
  }
  
  const loan = {
    id: Date.now(),
    lender,
    originalPrincipal,
    currentPrincipal: originalPrincipal,
    interestRate,
    dueDate,
    notes,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  loansToPay.push(loan);
  saveLoansToPay();
  renderLoansToPayTable();
  closeModal('addLoanToPayModal');
  clearFormToPay();
}

function editLoanToPay(index) {
  const loan = loansToPay[index];
  document.getElementById('lenderName').value = loan.lender;
  document.getElementById('originalPrincipal').value = loan.originalPrincipal;
  document.getElementById('interestRate').value = loan.interestRate;
  document.getElementById('dueDatePay').value = loan.dueDate;
  document.getElementById('notesPay').value = loan.notes || '';
  
  showModal('addLoanToPayModal');
  
  // Store editing index
  document.getElementById('addLoanToPayModal').dataset.editIndex = index;
}

function deleteLoanToPay(index) {
  if (confirm('Are you sure you want to delete this loan?')) {
    loansToPay.splice(index, 1);
    saveLoansToPay();
    renderLoansToPayTable();
  }
}

function clearFormToPay() {
  document.getElementById('lenderName').value = '';
  document.getElementById('originalPrincipal').value = '';
  document.getElementById('interestRate').value = '';
  document.getElementById('dueDatePay').value = '';
  document.getElementById('notesPay').value = '';
}

// =====================================================
// MODAL HANDLING
// =====================================================
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'block';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    modal.dataset.editIndex = '';
  }
}

// =====================================================
// FORM HANDLERS
// =====================================================
function setupFormHandlers() {
  // Loans Given tab button
  const loansGivenBtn = document.querySelectorAll('.loan-tab-button')[0];
  if (loansGivenBtn) {
    loansGivenBtn.addEventListener('click', () => switchTab('given'));
  }
  
  // Loans To Pay tab button
  const loansToPayBtn = document.querySelectorAll('.loan-tab-button')[1];
  if (loansToPayBtn) {
    loansToPayBtn.addEventListener('click', () => switchTab('to-pay'));
  }
  
  // Add Loan Given button
  const btnAddLoanGiven = document.getElementById('btn-add-loan-given');
  if (btnAddLoanGiven) {
    btnAddLoanGiven.addEventListener('click', () => {
      clearFormGiven();
      showAddLoanGivenModal();
    });
  }
  
  // Add Loan To Pay button
  const btnAddLoanToPay = document.getElementById('btn-add-loan-to-pay');
  if (btnAddLoanToPay) {
    btnAddLoanToPay.addEventListener('click', () => {
      clearFormToPay();
      showAddLoanToPayModal();
    });
  }
  
  // Export buttons
  const btnExportGiven = document.getElementById('btn-export-loans-given');
  if (btnExportGiven) {
    btnExportGiven.addEventListener('click', exportLoansGivenToExcel);
  }
  
  const btnExportToPay = document.getElementById('btn-export-loans-to-pay');
  if (btnExportToPay) {
    btnExportToPay.addEventListener('click', exportLoansToPayToExcel);
  }
}

// =====================================================
// MODAL FUNCTIONS
// =====================================================
function showAddLoanGivenModal() {
  const modal = document.getElementById('addLoanGivenModal');
  if (!modal) {
    // Create modal if it doesn't exist
    createAddLoanGivenModal();
  } else {
    modal.style.display = 'block';
  }
}

function showAddLoanToPayModal() {
  const modal = document.getElementById('addLoanToPayModal');
  if (!modal) {
    // Create modal if it doesn't exist
    createAddLoanToPayModal();
  } else {
    modal.style.display = 'block';
  }
}

// Simplified modal creation - these would need to be added to loans.html
function createAddLoanGivenModal() {
  // This assumes the modal HTML already exists in loans.html
  console.log('Modal HTML should be in loans.html');
}

function createAddLoanToPayModal() {
  // This assumes the modal HTML already exists in loans.html
  console.log('Modal HTML should be in loans.html');
}

// =====================================================
// EXPORT FUNCTIONS
// =====================================================
function exportLoansGivenToExcel() {
  if (loansGiven.length === 0) {
    alert('No loans to export');
    return;
  }
  
  const csv = convertToCSV(loansGiven, ['name', 'amount', 'dueDate', 'status', 'totalPaid', 'notes']);
  downloadCSV(csv, 'loans-given.csv');
}

function exportLoansToPayToExcel() {
  if (loansToPay.length === 0) {
    alert('No loans to export');
    return;
  }
  
  const csv = convertToCSV(loansToPay, ['lender', 'originalPrincipal', 'currentPrincipal', 'interestRate', 'dueDate', 'status', 'notes']);
  downloadCSV(csv, 'loans-to-pay.csv');
}

function convertToCSV(data, headers) {
  const rows = [headers.join(',')];
  data.forEach(item => {
    const row = headers.map(header => item[header] || '').join(',');
    rows.push(row);
  });
  return rows.join('\n');
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
