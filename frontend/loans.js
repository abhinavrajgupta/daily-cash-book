// Loan Management JavaScript
const API_BASE = 'http://localhost:5000/api';

// Global state
let loansGiven = [];
let loansToPay = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadLoansGiven();
    loadLoansToPay();
    setupFormHandlers();
});

// ============================================
// TAB SWITCHING
// ============================================
function switchTab(tab) {
    // Remove active from all tabs
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active to selected tab
    if (tab === 'given') {
        document.getElementById('tab-given').classList.add('active');
        document.querySelectorAll('.tab-button')[0].classList.add('active');
    } else {
        document.getElementById('tab-topay').classList.add('active');
        document.querySelectorAll('.tab-button')[1].classList.add('active');
    }
}

// ============================================
// LOANS GIVEN FUNCTIONS
// ============================================
async function loadLoansGiven() {
    try {
        const response = await fetch(`${API_BASE}/loans-given`);
        loansGiven = await response.json();
        renderLoansGivenTable();
    } catch (error) {
        console.error('Error loading loans given:', error);
        alert('Failed to load loans given');
    }
}

function renderLoansGivenTable() {
    const tbody = document.getElementById('loansGivenBody');
    tbody.innerHTML = '';
    
    loansGiven.forEach(loan => {
        const row = document.createElement('tr');
        row.className = `status-${loan.status}`;
        row.innerHTML = `
            <td>${loan.borrower_name}</td>
            <td>₹${loan.amount.toLocaleString('en-IN')}</td>
            <td>${formatDate(loan.due_date)}</td>
            <td>${formatDate(loan.reminder_date)}</td>
            <td><span class="badge">${loan.status}</span></td>
            <td>₹${loan.total_paid.toLocaleString('en-IN')}</td>
            <td>₹${loan.remaining.toLocaleString('en-IN')}</td>
            <td>
                <button class="btn btn-warning" onclick="showRecordPaymentModal(${loan.id})">💰 Record Payment</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function addLoanGiven(formData) {
    try {
        const response = await fetch(`${API_BASE}/loans-given`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            await loadLoansGiven();
            closeModal('addLoanGivenModal');
            document.getElementById('loanGivenForm').reset();
            alert('Loan added successfully!');
        } else {
            alert('Failed to add loan');
        }
    } catch (error) {
        console.error('Error adding loan:', error);
        alert('Error adding loan');
    }
}

async function recordPayment(loanId, paymentData) {
    try {
        const response = await fetch(`${API_BASE}/loans-given/${loanId}/payments`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(paymentData)
        });
        
        if (response.ok) {
            await loadLoansGiven();
            closeModal('recordPaymentModal');
            document.getElementById('paymentForm').reset();
            alert('Payment recorded successfully!');
        } else {
            alert('Failed to record payment');
        }
    } catch (error) {
        console.error('Error recording payment:', error);
        alert('Error recording payment');
    }
}

// ============================================
// LOANS TO PAY FUNCTIONS
// ============================================
async function loadLoansToPay() {
    try {
        const response = await fetch(`${API_BASE}/loans-to-pay`);
        loansToPay = await response.json();
        renderLoansToPayTable();
    } catch (error) {
        console.error('Error loading loans to pay:', error);
        alert('Failed to load loans to pay');
    }
}

function renderLoansToPayTable() {
    const tbody = document.getElementById('loansToPayBody');
    tbody.innerHTML = '';
    
    loansToPay.forEach(loan => {
        const row = document.createElement('tr');
        const statusClass = loan.status === 'paid_off' ? 'status-fully_paid' : 'status-pending';
        row.className = statusClass;
        row.innerHTML = `
            <td>${loan.lender_name}</td>
            <td>₹${loan.original_principal.toLocaleString('en-IN')}</td>
            <td>₹${loan.current_principal.toLocaleString('en-IN')}</td>
            <td>${loan.interest_rate}%</td>
            <td>${loan.due_date ? formatDate(loan.due_date) : 'N/A'}</td>
            <td><span class="badge">${loan.status}</span></td>
            <td>
                ${loan.status === 'active' ? 
                    `<button class="btn btn-warning" onclick="showRecordPaymentToPayModal(${loan.id})">💳 Make Payment</button>` :
                    `<span>Paid Off ✓</span>`
                }
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function addLoanToPay(formData) {
    try {
        const response = await fetch(`${API_BASE}/loans-to-pay`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            await loadLoansToPay();
            closeModal('addLoanToPayModal');
            document.getElementById('loanToPayForm').reset();
            alert('Loan added successfully!');
        } else {
            alert('Failed to add loan');
        }
    } catch (error) {
        console.error('Error adding loan:', error);
        alert('Error adding loan');
    }
}

async function recordPaymentToPay(loanId, paymentData) {
    try {
        const response = await fetch(`${API_BASE}/loans-to-pay/${loanId}/payments`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(paymentData)
        });
        
        if (response.ok) {
            await loadLoansToPay();
            closeModal('recordPaymentToPayModal');
            document.getElementById('paymentToPayForm').reset();
            alert('Payment recorded successfully!');
        } else {
            const error = await response.json();
            alert(`Failed: ${error.error}`);
        }
    } catch (error) {
        console.error('Error recording payment:', error);
        alert('Error recording payment');
    }
}

// ============================================
// EXCEL EXPORT FUNCTIONS
// ============================================
function exportLoansGivenToExcel() {
    // Prepare data for export
    const exportData = loansGiven.map(loan => ({
        'Borrower Name': loan.borrower_name,
        'Amount (₹)': loan.amount,
        'Due Date': formatDate(loan.due_date),
        'Reminder Date': formatDate(loan.reminder_date),
        'Status': loan.status,
        'Total Paid (₹)': loan.total_paid,
        'Remaining (₹)': loan.remaining,
        'Notes': loan.notes || ''
    }));
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Loans Given');
    
    // Generate filename with current date
    const filename = `loans_given_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
}

function exportLoansToPayToExcel() {
    // Prepare data for export
    const exportData = loansToPay.map(loan => ({
        'Lender Name': loan.lender_name,
        'Original Principal (₹)': loan.original_principal,
        'Current Principal (₹)': loan.current_principal,
        'Interest Rate (%)': loan.interest_rate,
        'Due Date': loan.due_date ? formatDate(loan.due_date) : 'N/A',
        'Status': loan.status,
        'Notes': loan.notes || ''
    }));
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Loans To Pay');
    
    // Generate filename with current date
    const filename = `loans_to_pay_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
}

// ============================================
// MODAL FUNCTIONS
// ============================================
function showAddLoanGivenModal() {
    document.getElementById('addLoanGivenModal').style.display = 'block';
}

function showAddLoanToPayModal() {
    document.getElementById('addLoanToPayModal').style.display = 'block';
}

function showRecordPaymentModal(loanId) {
    document.getElementById('paymentLoanId').value = loanId;
    document.getElementById('recordPaymentModal').style.display = 'block';
}

function showRecordPaymentToPayModal(loanId) {
    document.getElementById('paymentToPayLoanId').value = loanId;
    document.getElementById('recordPaymentToPayModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// ============================================
// FORM HANDLERS
// ============================================
function setupFormHandlers() {
    // Loan Given Form
    document.getElementById('loanGivenForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = {
            borrower_name: document.getElementById('borrowerName').value,
            amount: parseFloat(document.getElementById('amount').value),
            due_date: document.getElementById('dueDate').value,
            status: document.getElementById('status').value,
            notes: document.getElementById('notes').value
        };
        addLoanGiven(formData);
    });
    
    // Loan To Pay Form
    document.getElementById('loanToPayForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = {
            lender_name: document.getElementById('lenderName').value,
            original_principal: parseFloat(document.getElementById('originalPrincipal').value),
            interest_rate: parseFloat(document.getElementById('interestRate').value),
            due_date: document.getElementById('dueDatePay').value,
            notes: document.getElementById('notesPay').value
        };
        addLoanToPay(formData);
    });
    
    // Payment Form (for loans given)
    document.getElementById('paymentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const loanId = parseInt(document.getElementById('paymentLoanId').value);
        const paymentMonth = document.getElementById('paymentMonth').value + '-01';
        const paymentData = {
            payment_month: paymentMonth,
            amount_paid: parseFloat(document.getElementById('amountPaid').value),
            payment_date: document.getElementById('paymentDate').value
        };
        recordPayment(loanId, paymentData);
    });
    
    // Payment To Pay Form
    document.getElementById('paymentToPayForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const loanId = parseInt(document.getElementById('paymentToPayLoanId').value);
        const paymentData = {
            principal_paid: parseFloat(document.getElementById('principalPaid').value),
            payment_date: document.getElementById('paymentDatePay').value,
            notes: document.getElementById('paymentNotes').value
        };
        recordPaymentToPay(loanId, paymentData);
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
