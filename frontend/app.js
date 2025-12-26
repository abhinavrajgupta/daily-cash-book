// ===== CONFIG: categories =====

const CATEGORY_CONFIG = {
  income: [
    "Shop sales",
    "Other income",
    "Loan repayment received",
    "Bank deposit (money in)"
  ],
  expense: [
    "Shop expenses",
    "House (Mom)",
    "Home (Aunty)",
    "Anjali",
    "Hrishant",
    "Abhinav",
    "Sani",
    "Store expenses",
    "Bank withdrawal (money out)",
    "Interest paid",
    "Loan paid",
    "Other expense"
  ]
};

// ===== STORAGE LAYER (localStorage for now) =====

const STORAGE_KEY = "daily_cash_book_entries_v1";

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load entries", e);
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ===== STATE =====

let entries = loadEntries();
let currentEditingId = null;

// ===== UTILITIES =====

function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(amount) {
  const value = Number(amount || 0);
  return "₹" + value.toFixed(2);
}

// ===== INITIALIZATION =====

document.addEventListener("DOMContentLoaded", () => {
  initDates();
  initTabs();
  initModal();
  renderToday();
  initSummary();
});

function initDates() {
  const today = todayISO();
  const todayInput = document.getElementById("today-date");
  const entryDateInput = document.getElementById("entry-date");
  const summaryFrom = document.getElementById("summary-from");
  const summaryTo = document.getElementById("summary-to");

  if (todayInput) todayInput.value = today;
  if (entryDateInput) entryDateInput.value = today;
  if (summaryFrom) summaryFrom.value = today;
  if (summaryTo) summaryTo.value = today;

  todayInput.addEventListener("change", renderToday);
}

// ===== TABS =====

function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const tabName = btn.dataset.tab;
      document.querySelectorAll(".tab").forEach((section) => {
        section.classList.toggle("active", section.id === `tab-${tabName}`);
      });

      if (tabName === "today") {
        renderToday();
      }
    });
  });
}

// ===== MODAL BEHAVIOR =====

function initModal() {
  const btnAddIncome = document.getElementById("btn-add-income");
  const btnAddExpense = document.getElementById("btn-add-expense");
  const btnCancel = document.getElementById("btn-cancel");
  const btnSave = document.getElementById("btn-save-entry");
  const btnDelete = document.getElementById("btn-delete-entry");
  const backdrop = document.getElementById("entry-modal-backdrop");

  const typeIncomeBtn = document.getElementById("type-income");
  const typeExpenseBtn = document.getElementById("type-expense");

  btnAddIncome.addEventListener("click", () => openEntryModal("income"));
  btnAddExpense.addEventListener("click", () => openEntryModal("expense"));

  btnCancel.addEventListener("click", () => closeEntryModal());
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeEntryModal();
  });

  btnSave.addEventListener("click", onSaveEntry);
  btnDelete.addEventListener("click", onDeleteEntry);

  typeIncomeBtn.addEventListener("click", () => setEntryType("income"));
  typeExpenseBtn.addEventListener("click", () => setEntryType("expense"));

  renderCategoryButtons("income");
}

function openEntryModal(type = "income", entry = null) {
  currentEditingId = entry ? entry.id : null;

  const backdrop = document.getElementById("entry-modal-backdrop");
  const modalTitle = document.getElementById("modal-title");
  const entryDate = document.getElementById("entry-date");
  const entryAmount = document.getElementById("entry-amount");
  const entryNote = document.getElementById("entry-note");
  const formError = document.getElementById("form-error");
  const todayInput = document.getElementById("today-date");
  const btnDelete = document.getElementById("btn-delete-entry");

  formError.textContent = "";
  btnDelete.classList.toggle("hidden", !entry);

  if (entry) {
    modalTitle.textContent = "Edit Entry";
    setEntryType(entry.type);
    entryDate.value = entry.date;
    entryAmount.value = entry.amount;
    entryNote.value = entry.note || "";
    setSelectedCategory(entry.type, entry.category);
  } else {
    modalTitle.textContent = "Add Entry";
    setEntryType(type);
    entryDate.value = todayInput.value || todayISO();
    entryAmount.value = "";
    entryNote.value = "";
    setSelectedCategory(type, null);
  }

  backdrop.classList.remove("hidden");
}

function closeEntryModal() {
  const backdrop = document.getElementById("entry-modal-backdrop");
  backdrop.classList.add("hidden");
  currentEditingId = null;
}

function setEntryType(type) {
  const typeIncomeBtn = document.getElementById("type-income");
  const typeExpenseBtn = document.getElementById("type-expense");
  const hiddenType = document.getElementById("entry-type-hidden");

  if (!hiddenType) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.id = "entry-type-hidden";
    document.getElementById("entry-form").appendChild(input);
  }

  document.getElementById("entry-type-hidden").value = type;

  typeIncomeBtn.classList.toggle("active", type === "income");
  typeExpenseBtn.classList.toggle("active", type === "expense");

  renderCategoryButtons(type);
}

function renderCategoryButtons(type) {
  const container = document.getElementById("category-buttons");
  container.innerHTML = "";

  const categories = CATEGORY_CONFIG[type] || [];
  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = cat;
    btn.className = "category-button";
    btn.dataset.category = cat;
    btn.addEventListener("click", () => {
      setSelectedCategory(type, cat);
    });
    container.appendChild(btn);
  });
}

function setSelectedCategory(type, category) {
  renderCategoryButtons(type);

  const container = document.getElementById("category-buttons");
  const hiddenCategory = document.getElementById("entry-category");
  hiddenCategory.value = category || "";

  Array.from(container.children).forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.dataset.category === category && category !== null
    );
  });
}

// ===== SAVE / DELETE ENTRY =====

function onSaveEntry() {
  const formError = document.getElementById("form-error");
  formError.textContent = "";

  const type = document.getElementById("entry-type-hidden").value;
  const date = document.getElementById("entry-date").value;
  const category = document.getElementById("entry-category").value;
  const amountStr = document.getElementById("entry-amount").value.trim();
  const note = document.getElementById("entry-note").value.trim();

  const amount = Number(amountStr);

  if (!type || !date || !category || !amountStr) {
    formError.textContent = "Please fill all required fields.";
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    formError.textContent = "Amount must be a positive number.";
    return;
  }

  if (currentEditingId) {
    entries = entries.map((e) =>
      e.id === currentEditingId
        ? { ...e, type, date, category, amount, note }
        : e
    );
  } else {
    const id = Date.now().toString();
    entries.push({
      id,
      type,
      date,
      category,
      amount,
      note,
      createdAt: new Date().toISOString()
    });
  }

  saveEntries(entries);
  closeEntryModal();
  renderToday();
  renderSummary();
}

function onDeleteEntry() {
  if (!currentEditingId) return;
  if (!confirm("Delete this entry?")) return;

  entries = entries.filter((e) => e.id !== currentEditingId);
  saveEntries(entries);
  closeEntryModal();
  renderToday();
  renderSummary();
}

// ===== TODAY VIEW RENDERING =====

function renderToday() {
  const listEl = document.getElementById("entries-list");
  const todayInput = document.getElementById("today-date");
  const totalIncomeEl = document.getElementById("total-income");
  const totalExpensesEl = document.getElementById("total-expenses");
  const totalNetEl = document.getElementById("total-net");

  const selectedDate = todayInput.value || todayISO();

  const todaysEntries = entries.filter((e) => e.date === selectedDate);
  listEl.innerHTML = "";

  let incomeTotal = 0;
  let expenseTotal = 0;

  todaysEntries
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((entry) => {
      if (entry.type === "income") incomeTotal += Number(entry.amount);
      if (entry.type === "expense") expenseTotal += Number(entry.amount);

      const li = document.createElement("li");
      li.className = "entry-item";

      const main = document.createElement("div");
      main.className = "entry-main";
      const catSpan = document.createElement("span");
      catSpan.className = "entry-category";
      catSpan.textContent = entry.category;
      main.appendChild(catSpan);

      if (entry.note) {
        const noteSpan = document.createElement("span");
        noteSpan.className = "entry-note";
        noteSpan.textContent = entry.note;
        main.appendChild(noteSpan);
      }

      const meta = document.createElement("div");
      meta.className = "entry-meta";

      const amountSpan = document.createElement("span");
      amountSpan.className = `entry-amount ${entry.type}`;
      amountSpan.textContent =
        (entry.type === "income" ? "+" : "-") + formatCurrency(entry.amount);

      const actions = document.createElement("div");
      actions.className = "entry-actions";
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => openEntryModal(entry.type, entry));

      actions.appendChild(editBtn);
      meta.appendChild(amountSpan);
      meta.appendChild(actions);

      li.appendChild(main);
      li.appendChild(meta);
      listEl.appendChild(li);
    });

  const net = incomeTotal - expenseTotal;
  totalIncomeEl.textContent = formatCurrency(incomeTotal);
  totalExpensesEl.textContent = formatCurrency(expenseTotal);
  totalNetEl.textContent = formatCurrency(net);
}

// ===== SUMMARY VIEW =====

function initSummary() {
  const btnApply = document.getElementById("btn-summary-apply");
  btnApply.addEventListener("click", renderSummary);
  renderSummary();
}

function renderSummary() {
  const summaryIncomeEl = document.getElementById("summary-income");
  const summaryExpensesEl = document.getElementById("summary-expenses");
  const summaryNetEl = document.getElementById("summary-net");
  const listEl = document.getElementById("summary-category-list");

  const from = document.getElementById("summary-from").value || "0000-01-01";
  const to = document.getElementById("summary-to").value || "9999-12-31";

  const filtered = entries.filter(
    (e) => e.date >= from && e.date <= to
  );

  let incomeTotal = 0;
  let expenseTotal = 0;

  const categoryTotals = {};

  filtered.forEach((e) => {
    if (!categoryTotals[e.category]) {
      categoryTotals[e.category] = { income: 0, expense: 0 };
    }
    if (e.type === "income") {
      categoryTotals[e.category].income += Number(e.amount);
      incomeTotal += Number(e.amount);
    } else {
      categoryTotals[e.category].expense += Number(e.amount);
      expenseTotal += Number(e.amount);
    }
  });

  const net = incomeTotal - expenseTotal;
  summaryIncomeEl.textContent = formatCurrency(incomeTotal);
  summaryExpensesEl.textContent = formatCurrency(expenseTotal);
  summaryNetEl.textContent = formatCurrency(net);

  listEl.innerHTML = "";

  Object.entries(categoryTotals)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([category, totals]) => {
      const li = document.createElement("li");
      li.className = "entry-item";

      const main = document.createElement("div");
      main.className = "entry-main";

      const catSpan = document.createElement("span");
      catSpan.className = "entry-category";
      catSpan.textContent = category;

      const noteSpan = document.createElement("span");
      noteSpan.className = "entry-note";
      noteSpan.textContent =
        "Income: " +
        formatCurrency(totals.income) +
        "   •   Expense: " +
        formatCurrency(totals.expense);

      main.appendChild(catSpan);
      main.appendChild(noteSpan);

      const meta = document.createElement("div");
      meta.className = "entry-meta";

      const netAmount = totals.income - totals.expense;
      const amountSpan = document.createElement("span");
      amountSpan.className = "entry-amount";
      amountSpan.textContent = formatCurrency(netAmount);

      meta.appendChild(amountSpan);

      li.appendChild(main);
      li.appendChild(meta);
      listEl.appendChild(li);
    });
}
