const STORAGE_KEY = "minha-vida-financeira-v2";
const OLD_STORAGE_KEY = "minha-vida-financeira-v1";

function makeId() {
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

const adminId = makeId();
const childId = makeId();

const seedData = {
  users: [{ id: makeId(), username: "admin", password: "admin123", role: "admin" }],
  people: [
    { id: adminId, name: "Admin", birthday: "", role: "adulto", salaries: {} },
    { id: childId, name: "Filha", birthday: "", role: "filha", salaries: {} },
  ],
  expenses: [],
  installments: [],
  savings: { casal: 0, filha: 0 },
  cars: [],
  mileage: [],
  debts: [],
  reports: [],
};

let state = loadState();
let selectedMonth = monthKey(new Date());
let currentUserId = state.users[0]?.id || "";

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const monthName = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" });

const $ = (selector) => document.querySelector(selector);

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(OLD_STORAGE_KEY);
  if (!raw) return cloneData(seedData);

  try {
    const data = JSON.parse(raw);
    const merged = {
      ...cloneData(seedData),
      ...data,
      savings: { ...seedData.savings, ...(data.savings || {}) },
      users: data.users?.length ? data.users : cloneData(seedData.users),
      people: data.people?.length ? data.people : cloneData(seedData.people),
      cars: data.cars || [],
      mileage: data.mileage || [],
      debts: data.debts || [],
      reports: data.reports || [],
    };

    merged.users = merged.users.map((user) => ({ id: user.id || makeId(), role: "admin", ...user }));
    merged.people = merged.people.map((person) => ({
      id: person.id || makeId(),
      name: person.name || "Pessoa",
      birthday: person.birthday || "",
      role: person.role || "adulto",
      salaries: person.salaries || (person.salary ? { [monthKey(new Date())]: Number(person.salary) } : {}),
    }));
    return merged;
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

function getCar(id) {
  return state.cars.find((car) => car.id === id);
}

function salaryForPerson(person, month) {
  return normalizeCurrency(person.salaries?.[month]);
}

function monthIncome(month) {
  return total(state.people.filter((person) => person.role !== "filha").map((person) => ({ amount: salaryForPerson(person, month) })));
}

function yearFromMonth(month) {
  return month.slice(0, 4);
}

function expenseOccursInMonth(expense, month) {
  if (expense.recurring) return month >= monthKey(expense.date);
  return monthKey(expense.date) === month;
}

function installmentMonths(installment) {
  return Array.from({ length: installment.total }, (_, index) => addMonths(installment.startMonth, index));
}

function monthsBetweenInclusive(startMonth, endMonth) {
  const start = dateFromMonth(startMonth);
  const end = dateFromMonth(endMonth);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
}

function installmentOccursInMonth(installment, month) {
  return installmentMonths(installment).includes(month);
}

function debtExpensesForMonth(month) {
  return state.debts
    .filter((debt) => debt.toMonth === month)
    .map((debt) => ({
      id: `debt-${debt.id}`,
      description: `Dívida vinda de ${formatMonth(debt.fromMonth)}`,
      amount: debt.amount,
      date: `${month}-01`,
      personId: debt.personId || state.people.find((person) => person.role !== "filha")?.id || state.people[0]?.id,
      accountType: "casal",
      category: "Dívida",
      recurring: false,
      debtId: debt.id,
    }));
}

function getMonthExpenses(month, options = {}) {
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
  const debts = options.withoutDebts ? [] : debtExpensesForMonth(month);

  return [...debts, ...direct, ...installments].sort((a, b) => a.date.localeCompare(b.date));
}

function total(items) {
  return items.reduce((sum, item) => sum + normalizeCurrency(item.amount), 0);
}

function fuelExpensesForYear(year) {
  return state.expenses.filter((expense) => monthKey(expense.date).startsWith(year) && expense.category === "Combustível");
}

function kmForMonth(month) {
  return state.mileage.filter((item) => item.month === month).reduce((sum, item) => sum + Number(item.km || 0), 0);
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
  $("#salaryPerson").innerHTML = options;
}

function renderCarOptions() {
  const carOptions = state.cars.map((car) => `<option value="${car.id}">${car.name}</option>`).join("");
  $("#expenseCar").innerHTML = `<option value="">Nenhum</option>${carOptions}`;
  $("#mileageCar").innerHTML = carOptions;
}

function renderDashboard() {
  const monthExpenses = getMonthExpenses(selectedMonth);
  const nextExpenses = getMonthExpenses(addMonths(selectedMonth, 1));
  const income = monthIncome(selectedMonth);
  const debt = total(debtExpensesForMonth(selectedMonth));
  const year = yearFromMonth(selectedMonth);

  $("#monthSpent").textContent = money.format(total(monthExpenses));
  $("#monthIncome").textContent = money.format(income);
  $("#monthDebt").textContent = money.format(debt);
  $("#nextMonthNeeded").textContent = money.format(total(nextExpenses));
  $("#coupleSavings").textContent = money.format(state.savings.casal);
  $("#childSavings").textContent = money.format(state.savings.filha);
  $("#yearFuel").textContent = money.format(total(fuelExpensesForYear(year)));
  $("#monthKm").textContent = `${kmForMonth(selectedMonth).toLocaleString("pt-PT")} km`;

  const personCards = state.people.map((person) => {
    const personExpenses = monthExpenses.filter((expense) => expense.personId === person.id);
    const individual = total(personExpenses.filter((expense) => expense.accountType === "individual"));
    const couple = total(personExpenses.filter((expense) => expense.accountType === "casal"));
    const salary = salaryForPerson(person, selectedMonth);
    const balance = salary - individual;
    return `
      <article class="item">
        <div class="item-head">
          <span class="item-title">${person.name}</span>
          <span class="item-value">${money.format(individual + couple)}</span>
        </div>
        <span class="item-meta">Ordenado recebido: ${money.format(salary)} • Individual: ${money.format(individual)} • Casal: ${money.format(couple)}</span>
        <span class="item-meta">Sobra individual estimada: ${money.format(balance)}</span>
      </article>`;
  }).join("");
  $("#personSummary").innerHTML = personCards || empty("Cadastre pessoas para ver o resumo.");

  const upcoming = nextExpenses.slice(0, 8).map((expense) => `
    <article class="item">
      <div class="item-head">
        <span class="item-title">${expense.description}</span>
        <span class="item-value">${money.format(expense.amount)}</span>
      </div>
      <span class="item-meta">${getPerson(expense.personId)?.name || "Sem pessoa"} • ${expense.accountType === "casal" ? "Conta do casal" : "Individual"} • ${expense.category}</span>
    </article>`).join("");
  $("#upcomingBills").innerHTML = upcoming || empty("Nenhuma conta prevista para o próximo mês.");
}

function renderExpenses() {
  const rows = getMonthExpenses(selectedMonth).map((expense) => {
    const isAutomatic = Boolean(expense.installmentId || expense.debtId);
    const car = expense.carId ? ` • ${getCar(expense.carId)?.name || "Carro"}` : "";
    return `
      <article class="item">
        <div class="item-head">
          <span class="item-title">${expense.description}</span>
          <span class="item-value">${money.format(expense.amount)}</span>
        </div>
        <span class="item-meta">${new Date(`${expense.date}T12:00:00`).toLocaleDateString("pt-PT")} • ${getPerson(expense.personId)?.name || "Sem pessoa"} • ${expense.accountType === "casal" ? "Conta do casal" : "Individual"} • ${expense.category}${car}</span>
        ${isAutomatic ? "<span class=\"item-meta\">Gerada automaticamente.</span>" : `<div class="item-actions"><button class="danger" type="button" data-delete-expense="${expense.id}">Excluir</button></div>`}
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
    const remainingTime = remaining > 0 ? `${remaining} mês(es)` : "finalizado";
    const remainingAmount = remaining * installment.amount;
    return `
      <article class="item">
        <div class="item-head">
          <span class="item-title">${installment.description}</span>
          <span class="item-value">${money.format(installment.amount)}/mês</span>
        </div>
        <span class="item-meta">${getPerson(installment.personId)?.name || "Sem pessoa"} • ${installment.accountType === "casal" ? "Conta do casal" : "Individual"}</span>
        <span class="item-meta">Vai de ${formatMonth(installment.startMonth)} até ${formatMonth(lastMonth)} • ${installment.total} parcela(s).</span>
        <span class="item-meta">Falta ${remainingTime} para acabar e ${money.format(remainingAmount)} para quitar.</span>
        <span class="item-meta">Próxima cobrança: ${formatMonth(nextMonth)}.</span>
        <div class="item-actions"><button class="danger" type="button" data-delete-installment="${installment.id}">Excluir parcelamento</button></div>
      </article>`;
  }).join("");

  $("#installmentsList").innerHTML = rows || empty("Nenhuma conta parcelada cadastrada.");
}

function renderCars() {
  const rows = state.cars.map((car) => {
    const monthMileage = state.mileage.find((item) => item.carId === car.id && item.month === selectedMonth);
    const yearFuel = total(fuelExpensesForYear(yearFromMonth(selectedMonth)).filter((expense) => expense.carId === car.id));
    return `
      <article class="item">
        <div class="item-head">
          <span class="item-title">${car.name}</span>
          <span class="item-value">${Number(monthMileage?.km || 0).toLocaleString("pt-PT")} km</span>
        </div>
        <span class="item-meta">${car.plate || "Sem matrícula"} • Combustível no ano: ${money.format(yearFuel)}</span>
        <div class="item-actions"><button class="danger" type="button" data-delete-car="${car.id}">Excluir carro</button></div>
      </article>`;
  }).join("");

  $("#carsList").innerHTML = rows || empty("Cadastre um carro para lançar km e ligar gastos de combustível.");
}

function renderSavings() {
  $("#savingsBreakdown").innerHTML = `
    <article class="metric"><span>Casal</span><strong>${money.format(state.savings.casal)}</strong></article>
    <article class="metric child"><span>Filha menor</span><strong>${money.format(state.savings.filha)}</strong></article>
  `;
}

function renderPeople() {
  const rows = state.people.map((person) => {
    const salary = salaryForPerson(person, selectedMonth);
    const birthday = person.birthday ? new Date(`${person.birthday}T12:00:00`).toLocaleDateString("pt-PT") : "Sem aniversário";
    return `
      <article class="item">
        <div class="item-head">
          <span class="item-title">${person.name}</span>
          <span class="item-value">${money.format(salary)}</span>
        </div>
        <span class="item-meta">${person.role === "filha" ? "Filha menor" : "Adulto"} • ${birthday} • Ordenado em ${formatMonth(selectedMonth)}</span>
        <div class="item-actions">
          <button class="ghost" type="button" data-edit-person="${person.id}">Editar pessoa</button>
          <button class="danger" type="button" data-delete-person="${person.id}">Excluir</button>
        </div>
      </article>`;
  }).join("");

  $("#peopleList").innerHTML = rows || empty("Cadastre a primeira pessoa.");
}

function renderAccess() {
  const user = state.users.find((item) => item.id === currentUserId) || state.users[0];
  $("#accessUsername").value = user?.username || "";
  $("#accessPassword").value = user?.password || "";
  $("#loginHint").innerHTML = `Acesso inicial: <strong>${state.users[0]?.username || "admin"}</strong> / <strong>${state.users[0]?.password || "admin123"}</strong>`;
  $("#usersList").innerHTML = state.users.map((item) => `
    <article class="item">
      <div class="item-head">
        <span class="item-title">${item.username}</span>
        <span class="item-value">${item.role}</span>
      </div>
      <div class="item-actions"><button class="danger" type="button" data-delete-user="${item.id}">Excluir acesso</button></div>
    </article>`).join("");
}

function createReport(month) {
  const expenses = getMonthExpenses(month);
  const expensesWithoutDebts = getMonthExpenses(month, { withoutDebts: true });
  const coupleExpenses = expenses.filter((expense) => expense.accountType === "casal");
  const individualExpenses = expenses.filter((expense) => expense.accountType === "individual");
  const salaries = monthIncome(month);
  const balance = salaries - total(expenses);
  const year = yearFromMonth(month);

  return {
    month,
    totalSpent: total(expenses),
    coupleTotal: total(coupleExpenses),
    individualTotal: total(individualExpenses),
    salaries,
    balance,
    debtIncoming: total(debtExpensesForMonth(month)),
    coupleSavings: state.savings.casal,
    childSavings: state.savings.filha,
    nextMonthNeeded: total(getMonthExpenses(addMonths(month, 1))),
    fuelYearTotal: total(fuelExpensesForYear(year)),
    fuelMonthTotal: total(expensesWithoutDebts.filter((expense) => expense.category === "Combustível")),
    monthKm: kmForMonth(month),
    byPerson: state.people.map((person) => ({
      name: person.name,
      salary: salaryForPerson(person, month),
      spent: total(expenses.filter((expense) => expense.personId === person.id)),
    })),
  };
}

function reportToHtml(report) {
  const people = report.byPerson.map((person) => `<li>${person.name}: ordenado ${money.format(person.salary)}, gastos ${money.format(person.spent)}</li>`).join("");
  const debtText = report.balance < 0
    ? `Ficou negativo em <strong>${money.format(Math.abs(report.balance))}</strong>. Ao fechar, esse valor entra como dívida no próximo mês.`
    : `Sobrou <strong>${money.format(report.balance)}</strong> neste fechamento.`;

  return `
    <article class="report-card">
      <h3>${formatMonth(report.month)}</h3>
      <p>Total gasto: <strong>${money.format(report.totalSpent)}</strong></p>
      <p>Ordenados recebidos: <strong>${money.format(report.salaries)}</strong></p>
      <p>Dívida trazida: <strong>${money.format(report.debtIncoming)}</strong></p>
      <p>${debtText}</p>
    </article>
    <article class="report-card">
      <h3>Contas</h3>
      <p>Conta do casal: <strong>${money.format(report.coupleTotal)}</strong> • Contas individuais: <strong>${money.format(report.individualTotal)}</strong></p>
      <p>Para o próximo mês, você precisa reservar <strong>${money.format(report.nextMonthNeeded)}</strong>.</p>
    </article>
    <article class="report-card">
      <h3>Carro e combustível</h3>
      <p>Combustível neste mês: <strong>${money.format(report.fuelMonthTotal)}</strong></p>
      <p>Combustível no ano: <strong>${money.format(report.fuelYearTotal)}</strong></p>
      <p>Km feitos neste mês: <strong>${report.monthKm.toLocaleString("pt-PT")} km</strong></p>
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

function renderReport() {
  $("#reportOutput").innerHTML = reportToHtml(createReport(selectedMonth));
}

function empty(text) {
  return `<div class="empty">${text}</div>`;
}

function render() {
  $("#selectedMonth").value = selectedMonth;
  $("#salaryMonth").value = selectedMonth;
  $("#mileageMonth").value = selectedMonth;
  $("#currentMonthLabel").textContent = formatMonth(selectedMonth);
  renderPeopleOptions();
  renderCarOptions();
  renderDashboard();
  renderExpenses();
  renderInstallments();
  renderCars();
  renderSavings();
  renderPeople();
  renderAccess();
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
  currentUserId = user.id;
  $("#loginError").hidden = true;
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
    carId: $("#expenseCar").value,
    recurring: $("#expenseRecurring").checked,
  });
  saveState();
  event.target.reset();
  $("#expenseDate").valueAsDate = new Date();
  render();
});

$("#installmentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const startMonth = $("#installmentStart").value;
  const endDate = $("#installmentEnd").value;
  const endMonth = endDate ? monthKey(endDate) : "";
  const typedTotal = Number($("#installmentTotal").value || 0);
  const calculatedTotal = endMonth ? monthsBetweenInclusive(startMonth, endMonth) : typedTotal;

  if (!calculatedTotal || calculatedTotal < 1) {
    alert("Informe o total de parcelas ou um último mês igual ou posterior ao primeiro mês.");
    return;
  }

  state.installments.push({
    id: makeId(),
    description: $("#installmentDescription").value.trim(),
    amount: normalizeCurrency($("#installmentAmount").value),
    total: calculatedTotal,
    startMonth,
    personId: $("#installmentPerson").value,
    accountType: $("#installmentAccountType").value,
  });
  saveState();
  event.target.reset();
  $("#installmentStart").value = selectedMonth;
  render();
});

$("#carForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.cars.push({
    id: makeId(),
    name: $("#carName").value.trim(),
    plate: $("#carPlate").value.trim(),
  });
  saveState();
  event.target.reset();
  render();
});

$("#mileageForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const carId = $("#mileageCar").value;
  const month = $("#mileageMonth").value;
  const existing = state.mileage.find((item) => item.carId === carId && item.month === month);
  if (existing) {
    existing.km = Number($("#mileageKm").value);
  } else {
    state.mileage.push({ id: makeId(), carId, month, km: Number($("#mileageKm").value) });
  }
  saveState();
  event.target.reset();
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
    birthday: $("#personBirthday").value,
    role: $("#personRole").value,
    salaries: {},
  });
  saveState();
  event.target.reset();
  render();
});

$("#salaryForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const person = getPerson($("#salaryPerson").value);
  person.salaries = person.salaries || {};
  person.salaries[$("#salaryMonth").value] = normalizeCurrency($("#salaryAmount").value);
  saveState();
  event.target.reset();
  render();
});

$("#accessForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const user = state.users.find((item) => item.id === currentUserId) || state.users[0];
  user.username = $("#accessUsername").value.trim();
  user.password = $("#accessPassword").value;
  saveState();
  $("#loginUser").value = user.username;
  $("#loginPass").value = user.password;
  render();
});

$("#newUserForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.users.push({
    id: makeId(),
    username: $("#newUsername").value.trim(),
    password: $("#newPassword").value,
    role: "admin",
  });
  saveState();
  event.target.reset();
  render();
});

$("#closeMonthBtn").addEventListener("click", () => {
  const report = createReport(selectedMonth);
  const nextMonth = addMonths(selectedMonth, 1);
  state.reports = state.reports.filter((item) => item.month !== selectedMonth);
  state.reports.push({ ...report, createdAt: new Date().toISOString() });

  state.debts = state.debts.filter((debt) => debt.fromMonth !== selectedMonth);
  if (report.balance < 0) {
    state.debts.push({
      id: makeId(),
      fromMonth: selectedMonth,
      toMonth: nextMonth,
      amount: Math.abs(report.balance),
      personId: state.people.find((person) => person.role !== "filha")?.id || state.people[0]?.id,
    });
  }

  saveState();
  renderReport();
  render();
});

$("#clearExpenses").addEventListener("click", () => {
  const confirmed = confirm(`Limpar os gastos lançados diretamente em ${formatMonth(selectedMonth)}? As parcelas e dívidas automáticas continuam.`);
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
  const carId = event.target.dataset.deleteCar;
  const userId = event.target.dataset.deleteUser;

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
    const name = prompt("Nome", person.name);
    if (name === null) return;
    const birthday = prompt("Data de aniversário no formato AAAA-MM-DD", person.birthday || "");
    if (birthday === null) return;
    person.name = name.trim() || person.name;
    person.birthday = birthday.trim();
    saveState();
    render();
  }

  if (carId) {
    state.cars = state.cars.filter((car) => car.id !== carId);
    state.mileage = state.mileage.filter((item) => item.carId !== carId);
    state.expenses = state.expenses.map((expense) => expense.carId === carId ? { ...expense, carId: "" } : expense);
    saveState();
    render();
  }

  if (userId) {
    if (state.users.length <= 1) {
      alert("Precisa ficar pelo menos um acesso cadastrado.");
      return;
    }
    state.users = state.users.filter((user) => user.id !== userId);
    currentUserId = state.users[0].id;
    saveState();
    render();
  }
});

saveState();
render();
