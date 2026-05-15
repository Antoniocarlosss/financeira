const STORAGE_KEY = "minha-vida-financeira-v1";

function makeId() {
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

const seedData = {
  users: [{ username: "admin", password: "admin123", role: "admin" }],
  people: [
    { id: makeId(), name: "Admin", salary: 0, role: "adulto" },
    { id: makeId(), name: "Filha", salary: 0, role: "filha" },
  ],
  expenses: [],
  installments: [],
  savings: { casal: 0, filha: 0 },
  reports: [],
};

let state = loadState();
let selectedMonth = monthKey(new Date());

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const monthName = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" });

const $ = (selector) => document.querySelector(selector);

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return cloneData(seedData);
  try {
    const data = JSON.parse(raw);
    return {
      ...cloneData(seedData),
      ...data,
      savings: { ...seedData.savings, ...(data.savings || {}) },
    };
  } catch {
    return cloneData(seedData);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dateFromMonth(key) {
  return new Date(`${key}-01T12:00:00`);
}

function addMonths(key, amount) {
  const d = dateFromMonth(key);
  d.setMonth(d.getMonth() + amount);
  return monthKey(d);
}

function formatMonth(key) {
  return monthName.format(dateFromMonth(key));
}

function normalizeCurrency(value) {
  return Number(value || 0);
}

function getPerson(id) {
  return state.people.find((person) => person.id === id);
}

function expenseOccursInMonth(expense, month) {
  if (expense.recurring) return month >= monthKey(expense.date);
  return monthKey(expense.date) === month;
}

function installmentMonths(installment) {
  return Array.from({ length: installment.total }, (_, index) => addMonths(installment.startMonth, index));
}

function installmentOccursInMonth(installment, month) {
  return installmentMonths(installment).includes(month);
}

function getMonthExpenses(month) {
  const direct = state.expenses.filter((expense) => expenseOccursInMonth(expense, month));
  const installments = state.installments
    .filter((installment) => installmentOccursInMonth(installment, month))
    .map((installment) => ({
      id: `${installment.id}-${month}`,
      description: `${installment.description} (${installmentMonths(installment).indexOf(month) + 1}/${installment.total})`,
      amount: installment.amount,
      date: `${month}-05`,
      personId: installment.personId,
      accountType: installment.accountType,
      category: "Parcelada",
      recurring: false,
      installmentId: installment.id,
    }));

  return [...direct, ...installments].sort((a, b) => a.date.localeCompare(b.date));
}

function total(items) {
  return items.reduce((sum, item) => sum + normalizeCurrency(item.amount), 0);
}

function setView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
  document.querySelectorAll(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.view === viewId));
  $(`#${viewId}`).classList.add("active-view");
  $("#viewTitle").textContent = document.querySelector(`[data-view="${viewId}"]`).textContent;
  render();
}

function showLogin() {
  $("#loginScreen").hidden = false;
  $("#loginScreen").style.display = "grid";
  $("#appScreen").hidden = true;
  $("#appScreen").style.display = "none";
}

function showApp() {
  $("#loginScreen").hidden = true;
  $("#loginScreen").style.display = "none";
  $("#appScreen").hidden = false;
  $("#appScreen").style.display = "grid";
}

function renderPeopleOptions() {
  const options = state.people.map((person) => `<option value="${person.id}">${person.name}</option>`).join("");
  $("#expensePerson").innerHTML = options;
  $("#installmentPerson").innerHTML = options;
}

function renderDashboard() {
  const monthExpenses = getMonthExpenses(selectedMonth);
  const nextExpenses = getMonthExpenses(addMonths(selectedMonth, 1));
  $("#monthSpent").textContent = money.format(total(monthExpenses));
  $("#nextMonthNeeded").textContent = money.format(total(nextExpenses));
  $("#coupleSavings").textContent = money.format(state.savings.casal);
  $("#childSavings").textContent = money.format(state.savings.filha);

  const personCards = state.people.map((person) => {
    const personExpenses = monthExpenses.filter((expense) => expense.personId === person.id);
    const individual = total(personExpenses.filter((expense) => expense.accountType === "individual"));
    const couple = total(personExpenses.filter((expense) => expense.accountType === "casal"));
    const balance = normalizeCurrency(person.salary) - individual;
    return `
      <article class="item">
        <div class="item-head">
          <span class="item-title">${person.name}</span>
          <span class="item-value">${money.format(individual + couple)}</span>
        </div>
        <span class="item-meta">Ordenado: ${money.format(person.salary)} • Individual: ${money.format(individual)} • Casal: ${money.format(couple)}</span>
        <span class="item-meta">Sobra individual estimada: ${money.format(balance)}</span>
      </article>`;
  }).join("");
  $("#personSummary").innerHTML = personCards || empty("Cadastre pessoas para ver o resumo.");

  const upcoming = getMonthExpenses(addMonths(selectedMonth, 1)).slice(0, 8).map((expense) => `
    <article class="item">
      <div class="item-head">
        <span class="item-title">${expense.description}</span>
        <span class="item-value">${money.format(expense.amount)}</span>
      </div>
      <span class="item-meta">${getPerson(expense.personId)?.name || "Sem pessoa"} • ${expense.accountType === "casal" ? "Conta do casal" : "Individual"}</span>
    </article>`).join("");
  $("#upcomingBills").innerHTML = upcoming || empty("Nenhuma conta prevista para o próximo mês.");
}

function renderExpenses() {
  const rows = getMonthExpenses(selectedMonth).map((expense) => {
    const isInstallment = Boolean(expense.installmentId);
    return `
      <article class="item">
        <div class="item-head">
          <span class="item-title">${expense.description}</span>
          <span class="item-value">${money.format(expense.amount)}</span>
        </div>
        <span class="item-meta">${new Date(`${expense.date}T12:00:00`).toLocaleDateString("pt-PT")} • ${getPerson(expense.personId)?.name || "Sem pessoa"} • ${expense.accountType === "casal" ? "Conta do casal" : "Individual"} • ${expense.category}</span>
        ${isInstallment ? "<span class=\"item-meta\">Gerada automaticamente por parcelamento.</span>" : `<div class="item-actions"><button class="danger" type="button" data-delete-expense="${expense.id}">Excluir</button></div>`}
      </article>`;
  }).join("");

  $("#expensesList").innerHTML = rows || empty("Nenhum gasto lançado neste mês.");
}

function renderInstallments() {
  const rows = state.installments.map((installment) => {
    const months = installmentMonths(installment);
    const currentIndex = months.findIndex((month) => month >= selectedMonth);
    const paidCount = months.filter((month) => month < selectedMonth).length;
    const remaining = Math.max(installment.total - paidCount, 0);
    const lastMonth = months[months.length - 1];
    const nextMonth = months[currentIndex] || lastMonth;
    return `
      <article class="item">
        <div class="item-head">
          <span class="item-title">${installment.description}</span>
          <span class="item-value">${money.format(installment.amount)}/mês</span>
        </div>
        <span class="item-meta">${getPerson(installment.personId)?.name || "Sem pessoa"} • ${installment.accountType === "casal" ? "Conta do casal" : "Individual"}</span>
        <span class="item-meta">Faltam ${remaining} parcela(s), ${money.format(remaining * installment.amount)} e termina em ${formatMonth(lastMonth)}.</span>
        <span class="item-meta">Próxima cobrança: ${formatMonth(nextMonth)}.</span>
        <div class="item-actions"><button class="danger" type="button" data-delete-installment="${installment.id}">Excluir parcelamento</button></div>
      </article>`;
  }).join("");

  $("#installmentsList").innerHTML = rows || empty("Nenhuma conta parcelada cadastrada.");
}

function renderSavings() {
  $("#savingsBreakdown").innerHTML = `
    <article class="metric"><span>Casal</span><strong>${money.format(state.savings.casal)}</strong></article>
    <article class="metric child"><span>Filha menor</span><strong>${money.format(state.savings.filha)}</strong></article>
  `;
}

function renderPeople() {
  const rows = state.people.map((person) => `
    <article class="item">
      <div class="item-head">
        <span class="item-title">${person.name}</span>
        <span class="item-value">${money.format(person.salary)}</span>
      </div>
      <span class="item-meta">${person.role === "filha" ? "Filha menor" : "Adulto"} • Ordenado mensal</span>
      <div class="item-actions">
        <button class="ghost" type="button" data-edit-person="${person.id}">Editar ordenado</button>
        <button class="danger" type="button" data-delete-person="${person.id}">Excluir</button>
      </div>
    </article>`).join("");

  $("#peopleList").innerHTML = rows || empty("Cadastre a primeira pessoa.");
}

function renderReport() {
  const report = createReport(selectedMonth);
  $("#reportOutput").innerHTML = reportToHtml(report);
}

function createReport(month) {
  const expenses = getMonthExpenses(month);
  const coupleExpenses = expenses.filter((expense) => expense.accountType === "casal");
  const individualExpenses = expenses.filter((expense) => expense.accountType === "individual");
  const salaries = total(state.people.filter((person) => person.role !== "filha").map((person) => ({ amount: person.salary })));

  return {
    month,
    totalSpent: total(expenses),
    coupleTotal: total(coupleExpenses),
    individualTotal: total(individualExpenses),
    salaries,
    coupleSavings: state.savings.casal,
    childSavings: state.savings.filha,
    nextMonthNeeded: total(getMonthExpenses(addMonths(month, 1))),
    byPerson: state.people.map((person) => ({
      name: person.name,
      salary: person.salary,
      spent: total(expenses.filter((expense) => expense.personId === person.id)),
    })),
  };
}

function reportToHtml(report) {
  const availableAfterBills = report.salaries - report.coupleTotal;
  const people = report.byPerson.map((person) => `<li>${person.name}: ordenado ${money.format(person.salary)}, gastos ${money.format(person.spent)}</li>`).join("");
  return `
    <article class="report-card">
      <h3>${formatMonth(report.month)}</h3>
      <p>Total gasto: <strong>${money.format(report.totalSpent)}</strong></p>
      <p>Conta do casal: <strong>${money.format(report.coupleTotal)}</strong> • Contas individuais: <strong>${money.format(report.individualTotal)}</strong></p>
      <p>Ordenados dos adultos: <strong>${money.format(report.salaries)}</strong></p>
      <p>Sobra estimada depois das contas do casal: <strong>${money.format(availableAfterBills)}</strong></p>
    </article>
    <article class="report-card">
      <h3>Próximo mês</h3>
      <p>Você precisa reservar <strong>${money.format(report.nextMonthNeeded)}</strong> para pagar as contas previstas.</p>
    </article>
    <article class="report-card">
      <h3>Dinheiro guardado</h3>
      <p>Casal: <strong>${money.format(report.coupleSavings)}</strong></p>
      <p>Filha menor: <strong>${money.format(report.childSavings)}</strong> separado do dinheiro do casal.</p>
    </article>
    <article class="report-card">
      <h3>Por pessoa</h3>
      <ul>${people || "<li>Nenhuma pessoa cadastrada.</li>"}</ul>
    </article>`;
}

function empty(text) {
  return `<div class="empty">${text}</div>`;
}

function render() {
  $("#selectedMonth").value = selectedMonth;
  $("#currentMonthLabel").textContent = formatMonth(selectedMonth);
  renderPeopleOptions();
  renderDashboard();
  renderExpenses();
  renderInstallments();
  renderSavings();
  renderPeople();
  if ($("#reportsView").classList.contains("active-view")) renderReport();
}

$("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const username = $("#loginUser").value.trim();
  const password = $("#loginPass").value;
  const user = state.users.find((item) => item.username === username && item.password === password);
  if (!user) {
    $("#loginError").hidden = false;
    return;
  }
  showApp();
  render();
});

$("#logoutBtn").addEventListener("click", () => {
  showLogin();
});

document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

$("#selectedMonth").addEventListener("change", (event) => {
  selectedMonth = event.target.value || monthKey(new Date());
  render();
});

$("#prevMonth").addEventListener("click", () => {
  selectedMonth = addMonths(selectedMonth, -1);
  render();
});

$("#nextMonth").addEventListener("click", () => {
  selectedMonth = addMonths(selectedMonth, 1);
  render();
});

$("#expenseDate").valueAsDate = new Date();
$("#installmentStart").value = selectedMonth;

$("#expenseForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.expenses.push({
    id: makeId(),
    description: $("#expenseDescription").value.trim(),
    amount: normalizeCurrency($("#expenseAmount").value),
    date: $("#expenseDate").value,
    personId: $("#expensePerson").value,
    accountType: $("#expenseAccountType").value,
    category: $("#expenseCategory").value,
    recurring: $("#expenseRecurring").checked,
  });
  saveState();
  event.target.reset();
  $("#expenseDate").valueAsDate = new Date();
  render();
});

$("#installmentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.installments.push({
    id: makeId(),
    description: $("#installmentDescription").value.trim(),
    amount: normalizeCurrency($("#installmentAmount").value),
    total: Number($("#installmentTotal").value),
    startMonth: $("#installmentStart").value,
    personId: $("#installmentPerson").value,
    accountType: $("#installmentAccountType").value,
  });
  saveState();
  event.target.reset();
  $("#installmentStart").value = selectedMonth;
  render();
});

$("#savingsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.savings[$("#savingsOwner").value] = normalizeCurrency($("#savingsAmount").value);
  saveState();
  event.target.reset();
  render();
});

$("#personForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.people.push({
    id: makeId(),
    name: $("#personName").value.trim(),
    salary: normalizeCurrency($("#personSalary").value),
    role: $("#personRole").value,
  });
  saveState();
  event.target.reset();
  render();
});

$("#closeMonthBtn").addEventListener("click", () => {
  const report = createReport(selectedMonth);
  state.reports = state.reports.filter((item) => item.month !== selectedMonth);
  state.reports.push({ ...report, createdAt: new Date().toISOString() });
  saveState();
  renderReport();
});

$("#clearExpenses").addEventListener("click", () => {
  const confirmed = confirm(`Limpar os gastos lançados diretamente em ${formatMonth(selectedMonth)}? As parcelas automáticas continuam.`);
  if (!confirmed) return;
  state.expenses = state.expenses.filter((expense) => monthKey(expense.date) !== selectedMonth);
  saveState();
  render();
});

document.body.addEventListener("click", (event) => {
  const expenseId = event.target.dataset.deleteExpense;
  const installmentId = event.target.dataset.deleteInstallment;
  const personId = event.target.dataset.deletePerson;
  const editPersonId = event.target.dataset.editPerson;

  if (expenseId) {
    state.expenses = state.expenses.filter((expense) => expense.id !== expenseId);
    saveState();
    render();
  }

  if (installmentId) {
    state.installments = state.installments.filter((installment) => installment.id !== installmentId);
    saveState();
    render();
  }

  if (personId) {
    state.people = state.people.filter((person) => person.id !== personId);
    state.expenses = state.expenses.filter((expense) => expense.personId !== personId);
    state.installments = state.installments.filter((installment) => installment.personId !== personId);
    saveState();
    render();
  }

  if (editPersonId) {
    const person = getPerson(editPersonId);
    const value = prompt(`Novo ordenado para ${person.name}`, person.salary);
    if (value === null) return;
    person.salary = normalizeCurrency(value);
    saveState();
    render();
  }
});

render();
