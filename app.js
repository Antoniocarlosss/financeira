const STORAGE_KEY = "minha-vida-financeira-v2";
const OLD_STORAGE_KEY = "minha-vida-financeira-v1";

function makeId() {
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

const adminId = makeId();
const partnerId = makeId();
const childId = makeId();

const seedData = {
  users: [{ id: makeId(), username: "admin", password: "admin123", role: "admin" }],
  people: [
    { id: adminId, name: "Antonio Carlos", birthday: "", role: "adulto", salaries: {} },
    { id: partnerId, name: "Juliana", birthday: "", role: "adulto", salaries: {} },
    { id: childId, name: "Melissa", birthday: "", role: "filha", salaries: {} },
  ],
  plannedBills: [],
  expenses: [],
  installments: [],
  savings: { casal: 0, filha: 0 },
  bankBalances: { antonio: 0, juliana: 0, melissa: 0, casal: 0 },
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
      bankBalances: {
        ...seedData.bankBalances,
        casal: data.bankBalances?.casal ?? data.savings?.casal ?? 0,
        melissa: data.bankBalances?.melissa ?? data.savings?.filha ?? 0,
        ...(data.bankBalances || {}),
      },
      users: data.users?.length ? data.users : cloneData(seedData.users),
      people: data.people?.length ? data.people : cloneData(seedData.people),
      plannedBills: data.plannedBills || [],
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
    merged.plannedBills = merged.plannedBills.map((bill) => ({
      dueDay: 10,
      payments: {},
      ...bill,
    }));
    merged.installments = (merged.installments || []).map((installment) => ({
      payments: {},
      adjustments: {},
      ...installment,
    }));
    ensurePersonalPeople(merged);
    return merged;
  } catch {
    return cloneData(seedData);
  }
}

function ensurePersonalPeople(data) {
  const adminPerson = data.people.find((person) => person.name.toLowerCase() === "admin");
  if (adminPerson) adminPerson.name = "Antonio Carlos";

  const hasAntonio = data.people.some((person) => person.name.toLowerCase() === "antonio carlos");
  if (!hasAntonio) {
    data.people.unshift({ id: makeId(), name: "Antonio Carlos", birthday: "", role: "adulto", salaries: {} });
  }

  const hasJuliana = data.people.some((person) => person.name.toLowerCase() === "juliana");
  if (!hasJuliana) {
    data.people.push({ id: makeId(), name: "Juliana", birthday: "", role: "adulto", salaries: {} });
  }

  const childPerson = data.people.find((person) => person.role === "filha");
  if (childPerson && childPerson.name.toLowerCase() === "filha") childPerson.name = "Melissa";

  const hasChild = data.people.some((person) => person.role === "filha");
  if (!hasChild) {
    data.people.push({ id: makeId(), name: "Melissa", birthday: "", role: "filha", salaries: {} });
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

function installmentChargeDate(installment, month) {
  const day = installment.startDate ? new Date(`${installment.startDate}T12:00:00`).getDate() : 5;
  const lastDay = new Date(dateFromMonth(addMonths(month, 1)) - 1).getDate();
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function defaultPaidUntil() {
  const current = dateFromMonth(selectedMonth);
  current.setDate(0);
  return current.toISOString().slice(0, 10);
}

function installmentPaidCount(installment) {
  const months = installmentMonths(installment);
  return months.filter((month) => installmentIsPaid(installment, month)).length;
}

function installmentIsPaid(installment, month) {
  if (installment.payments && Object.prototype.hasOwnProperty.call(installment.payments, month)) {
    return Boolean(installment.payments[month]);
  }
  if (installment.paidUntil) {
    return installmentChargeDate(installment, month) <= installment.paidUntil;
  }
  return month < selectedMonth;
}

function setInstallmentPayment(installment, month, paid) {
  installment.payments = installment.payments || {};
  installment.payments[month] = paid;
}

function installmentAdjustment(installment, month) {
  return normalizeCurrency(installment.adjustments?.[month]?.amount);
}

function installmentTotalForMonth(installment, month) {
  return normalizeCurrency(installment.amount) + installmentAdjustment(installment, month);
}

function setInstallmentAdjustment(installment, month, amount, note = "") {
  installment.adjustments = installment.adjustments || {};
  if (!amount && !note.trim()) {
    delete installment.adjustments[month];
    return;
  }
  installment.adjustments[month] = { amount: normalizeCurrency(amount), note: note.trim() };
}

function installmentPaymentRows(installment) {
  return installmentMonths(installment).map((month, index) => {
    const date = installmentChargeDate(installment, month);
    const paid = installmentIsPaid(installment, month);
    const adjustment = installmentAdjustment(installment, month);
    return { number: index + 1, month, date, paid, adjustment, amount: installmentTotalForMonth(installment, month) };
  });
}

function monthsBetweenInclusive(startMonth, endMonth) {
  const start = dateFromMonth(startMonth);
  const end = dateFromMonth(endMonth);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
}

function installmentOccursInMonth(installment, month) {
  return installmentMonths(installment).includes(month);
}

function installmentExpenseForMonth(installment, month) {
  const months = installmentMonths(installment);
  const index = months.indexOf(month);
  if (index === -1) return null;
  return {
    id: `${installment.id}-${month}`,
    description: `${installment.description} (${index + 1}/${installment.total})`,
    amount: installmentTotalForMonth(installment, month),
    baseAmount: installment.amount,
    adjustment: installmentAdjustment(installment, month),
    date: installmentChargeDate(installment, month),
    personId: installment.personId,
    accountType: installment.accountType,
    category: "Parcelada",
    recurring: false,
    installmentId: installment.id,
    installmentMonth: month,
    installmentPaid: installmentIsPaid(installment, month),
  };
}

function installmentExpensesForMonth(month, options = {}) {
  return state.installments
    .filter((installment) => installmentOccursInMonth(installment, month))
    .map((installment) => installmentExpenseForMonth(installment, month))
    .filter((expense) => expense && (options.includeUnpaid || expense.installmentPaid));
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
  const installments = installmentExpensesForMonth(month, { includeUnpaid: options.includeUnpaidInstallments });
  const debts = options.withoutDebts ? [] : debtExpensesForMonth(month);

  return [...debts, ...direct, ...installments].sort((a, b) => a.date.localeCompare(b.date));
}

function getPlannedBillsForMonth(month) {
  return state.plannedBills.filter((bill) => month >= bill.startMonth);
}

function plannedBillDueDate(bill, month) {
  const dueDay = Number(bill.dueDay || 10);
  const lastDay = new Date(dateFromMonth(addMonths(month, 1)) - 1).getDate();
  return `${month}-${String(Math.min(dueDay, lastDay)).padStart(2, "0")}`;
}

function plannedPaymentForMonth(bill, month) {
  return bill.payments?.[month] || null;
}

function plannedStatus(bill, month) {
  const payment = plannedPaymentForMonth(bill, month);
  const dueDate = plannedBillDueDate(bill, month);
  const today = new Date().toISOString().slice(0, 10);
  if (payment?.paidDate) {
    return payment.paidDate > dueDate ? "Pago atrasado" : "Pago";
  }
  if (today > dueDate) return "Em atraso";
  return "Próximo a vencer";
}

function upcomingPlannedBills(month) {
  return getPlannedBillsForMonth(month)
    .filter((bill) => !plannedPaymentForMonth(bill, month)?.paidDate)
    .sort((a, b) => plannedBillDueDate(a, month).localeCompare(plannedBillDueDate(b, month)));
}

function total(items) {
  return items.reduce((sum, item) => sum + normalizeCurrency(item.amount), 0);
}

function familyBankBalance() {
  return Object.values(state.bankBalances || {}).reduce((sum, value) => sum + normalizeCurrency(value), 0);
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
  $("#plannedPerson").innerHTML = options;
}

function renderCarOptions() {
  const carOptions = state.cars.map((car) => `<option value="${car.id}">${car.name}</option>`).join("");
  $("#expenseCar").innerHTML = `<option value="">Nenhum</option>${carOptions}`;
  $("#mileageCar").innerHTML = carOptions;
}

function renderDashboard() {
  const monthExpenses = getMonthExpenses(selectedMonth);
  const nextMonth = addMonths(selectedMonth, 1);
  const nextExpenses = getMonthExpenses(nextMonth, { includeUnpaidInstallments: true });
  const nextPlanned = getPlannedBillsForMonth(nextMonth);
  const monthPlannedDue = upcomingPlannedBills(selectedMonth).slice(0, 5);
  const income = monthIncome(selectedMonth);
  const debt = total(debtExpensesForMonth(selectedMonth));
  const year = yearFromMonth(selectedMonth);

  $("#monthSpent").textContent = money.format(total(monthExpenses));
  $("#monthIncome").textContent = money.format(income);
  $("#monthDebt").textContent = money.format(debt);
  $("#nextMonthNeeded").textContent = money.format(total(nextExpenses) + total(nextPlanned));
  $("#coupleSavings").textContent = money.format(state.savings.casal);
  $("#childSavings").textContent = money.format(state.savings.filha);
  $("#coupleBankBalance").textContent = money.format(state.bankBalances.casal);
  $("#familyBankBalance").textContent = money.format(familyBankBalance());
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
  const plannedDueNow = monthPlannedDue.map((bill) => `
    <article class="item">
      <div class="item-head">
        <span class="item-title">${bill.description}</span>
        <span class="item-value">${money.format(bill.amount)}</span>
      </div>
      <span class="item-meta">${plannedStatus(bill, selectedMonth)} • vence em ${new Date(`${plannedBillDueDate(bill, selectedMonth)}T12:00:00`).toLocaleDateString("pt-PT")} • ${bill.category}</span>
    </article>`).join("");
  const plannedUpcoming = nextPlanned.slice(0, 8).map((bill) => `
    <article class="item">
      <div class="item-head">
        <span class="item-title">${bill.description}</span>
        <span class="item-value">${money.format(bill.amount)}</span>
      </div>
      <span class="item-meta">Previsto próximo mês • vence em ${new Date(`${plannedBillDueDate(bill, nextMonth)}T12:00:00`).toLocaleDateString("pt-PT")} • ${bill.category}</span>
    </article>`).join("");
  $("#upcomingBills").innerHTML = plannedDueNow + upcoming + plannedUpcoming || empty("Nenhuma conta prevista para o próximo mês.");
}

function renderPlannedBills() {
  const rows = getPlannedBillsForMonth(selectedMonth).map((bill) => {
    const payment = plannedPaymentForMonth(bill, selectedMonth);
    const dueDate = plannedBillDueDate(bill, selectedMonth);
    const status = plannedStatus(bill, selectedMonth);
    const paid = Boolean(payment?.paidDate);
    const statusClass = paid ? "paid" : (status === "Em atraso" ? "late" : "open");
    const realAmount = payment?.amount ?? bill.amount;
    const paidDate = payment?.paidDate || new Date().toISOString().slice(0, 10);
    return `
      <article class="item payment-card ${paid ? "paid-payment" : ""}">
        <div class="item-head">
          <div>
            <span class="item-title">${bill.description}</span>
            <span class="item-meta">${new Date(`${dueDate}T12:00:00`).toLocaleDateString("pt-PT")} - ${getPerson(bill.personId)?.name || "Sem pessoa"} - ${bill.accountType === "casal" ? "Conta do casal" : "Individual"} - ${bill.category}</span>
          </div>
          <div class="value-stack">
            <span class="item-value">${money.format(realAmount)}</span>
            <strong class="status-pill ${statusClass}">${status}</strong>
          </div>
        </div>
        <span class="item-meta">Previsto desde ${formatMonth(bill.startMonth)}. Ajuste o valor real antes de marcar pago.</span>
        <div class="inline-form pay-form">
          <label>Valor real deste mes<input type="number" min="0" step="0.01" value="${realAmount}" data-real-planned-amount="${bill.id}" /></label>
          <label>Data que pagou<input type="date" value="${paidDate}" data-real-planned-date="${bill.id}" /></label>
          <button class="primary" type="button" data-pay-planned="${bill.id}">${paid ? "Atualizar pago" : "Marcar pago"}</button>
        </div>
        <div class="item-actions"><button class="danger" type="button" data-delete-planned="${bill.id}">Excluir previsao</button></div>
      </article>`;
  }).join("");

  $("#plannedBillsList").innerHTML = rows || empty("Nenhuma conta prevista cadastrada.");
}

function renderExpenses() {
  const paidExpenseRows = getMonthExpenses(selectedMonth).map((expense) => {
    const isAutomatic = Boolean(expense.installmentId || expense.debtId);
    const car = expense.carId ? ` - ${getCar(expense.carId)?.name || "Carro"}` : "";
    const adjustmentText = expense.installmentId && expense.adjustment ? `<span class="item-meta">Inclui juros/mudanca: ${money.format(expense.adjustment)}</span>` : "";
    const installmentActions = expense.installmentId ? `
          <button class="ghost" type="button" data-set-installment-payment="${expense.installmentId}" data-payment-month="${selectedMonth}" data-payment-status="false">Marcar em falta</button>` : "";
    return `
      <article class="item payment-card">
        <div class="item-head">
          <div>
            <span class="item-title">${expense.description}</span>
            <span class="item-meta">${new Date(`${expense.date}T12:00:00`).toLocaleDateString("pt-PT")} - ${getPerson(expense.personId)?.name || "Sem pessoa"} - ${expense.accountType === "casal" ? "Conta do casal" : "Individual"} - ${expense.category}${car}</span>
          </div>
          <div class="value-stack">
            <span class="item-value">${money.format(expense.amount)}</span>
            ${isAutomatic ? `<strong class="status-pill paid">Pago</strong>` : ""}
          </div>
        </div>
        ${adjustmentText}
        ${isAutomatic ? `<span class="item-meta">Gerada automaticamente.</span><div class="item-actions">${installmentActions}</div>` : `<div class="item-actions"><button class="danger" type="button" data-delete-expense="${expense.id}">Excluir</button></div>`}
      </article>`;
  }).join("");
  const unpaidInstallmentRows = installmentExpensesForMonth(selectedMonth, { includeUnpaid: true })
    .filter((expense) => !expense.installmentPaid)
    .map((expense) => `
      <article class="item payment-card unpaid-installment">
        <div class="item-head">
          <div>
            <span class="item-title">${expense.description}</span>
            <span class="item-meta">${new Date(`${expense.date}T12:00:00`).toLocaleDateString("pt-PT")} - ${getPerson(expense.personId)?.name || "Sem pessoa"} - ${expense.accountType === "casal" ? "Conta do casal" : "Individual"} - ${expense.category}</span>
          </div>
          <div class="value-stack">
            <span class="item-value">${money.format(expense.amount)}</span>
            <strong class="status-pill open">Em falta</strong>
          </div>
        </div>
        <span class="item-meta">Parcela do mes ainda nao paga. Se atrasou ou teve juros, salve a mudanca antes de marcar paga.</span>
        <div class="inline-form interest-form">
          <label>Juros ou mudanca<input type="number" min="0" step="0.01" value="${expense.adjustment || 0}" data-installment-adjustment="${expense.installmentId}" data-adjustment-month="${selectedMonth}" /></label>
          <button class="ghost" type="button" data-save-installment-adjustment="${expense.installmentId}" data-adjustment-month="${selectedMonth}">Salvar mudanca</button>
        </div>
        <div class="item-actions">
          <button class="primary" type="button" data-set-installment-payment="${expense.installmentId}" data-payment-month="${selectedMonth}" data-payment-status="true">Marcar paga</button>
        </div>
      </article>`).join("");
  const rows = paidExpenseRows + unpaidInstallmentRows;

  $("#expensesList").innerHTML = rows || empty("Nenhum gasto lancado neste mes.");
}

function renderInstallments() {
  const rows = state.installments.map((installment) => {
    const months = installmentMonths(installment);
    const currentIndex = months.findIndex((month) => month >= selectedMonth);
    const allPaymentRows = installmentPaymentRows(installment);
    const paidCount = installmentPaidCount(installment);
    const remaining = Math.max(installment.total - paidCount, 0);
    const lastMonth = months[months.length - 1];
    const nextMonth = months[currentIndex] || lastMonth;
    const remainingTime = remaining > 0 ? `${remaining} mes(es)` : "finalizado";
    const initialAmount = total(allPaymentRows);
    const paidAmount = total(allPaymentRows.filter((row) => row.paid));
    const remainingAmount = total(allPaymentRows.filter((row) => !row.paid));
    const paidPercent = installment.total ? Math.min(100, (paidCount / installment.total) * 100) : 0;
    const remainingPercent = Math.max(0, 100 - paidPercent);
    const paidRows = allPaymentRows.filter((row) => row.paid).map((row) => `
      <li class="paid">
        <span>${row.number}/${installment.total} - ${new Date(`${row.date}T12:00:00`).toLocaleDateString("pt-PT")}${row.adjustment ? ` - juros ${money.format(row.adjustment)}` : ""}</span>
        <strong>${money.format(row.amount)}</strong>
        <button class="ghost mini-btn" type="button" data-set-installment-payment="${installment.id}" data-payment-month="${row.month}" data-payment-status="false">Em falta</button>
      </li>`).join("");
    const openRows = allPaymentRows.filter((row) => !row.paid).map((row) => `
      <li class="open">
        <span>${row.number}/${installment.total} - ${new Date(`${row.date}T12:00:00`).toLocaleDateString("pt-PT")}</span>
        <strong>${money.format(row.amount)}</strong>
        <button class="primary mini-btn" type="button" data-set-installment-payment="${installment.id}" data-payment-month="${row.month}" data-payment-status="true">Paga</button>
      </li>`).join("");
    return `
      <details class="item installment-card">
        <summary>
          <span class="item-title">${installment.description}</span>
          <span class="item-value">${money.format(installment.amount)}/mes</span>
        </summary>
        <span class="item-meta">${getPerson(installment.personId)?.name || "Sem pessoa"} - ${installment.accountType === "casal" ? "Conta do casal" : "Individual"}</span>
        <span class="item-meta">Vai de ${new Date(`${installment.startDate || `${installment.startMonth}-01`}T12:00:00`).toLocaleDateString("pt-PT")} ate ${formatMonth(lastMonth)} - ${installment.total} parcela(s).</span>
        <span class="item-meta">Valor total com juros: ${money.format(initialAmount)} - Pago: ${money.format(paidAmount)} - Falta: ${money.format(remainingAmount)}</span>
        <div class="progress-track" aria-label="Progresso pago">
          <span style="width: ${paidPercent}%"></span>
        </div>
        <span class="item-meta">${paidPercent.toFixed(1)}% pago - ${remainingPercent.toFixed(1)}% falta - ${remainingTime} para acabar.</span>
        <div class="inline-form">
          <label>Pago ate<input type="date" data-paid-until-input="${installment.id}" value="${installment.paidUntil || defaultPaidUntil()}" /></label>
          <button class="ghost" type="button" data-save-paid-until="${installment.id}">Salvar pago ate</button>
        </div>
        <div class="payment-columns">
          <section>
            <h3>Parcelas pagas</h3>
            <ul>${paidRows || "<li class=\"open\"><span>Nenhuma parcela marcada como paga.</span><strong>0</strong></li>"}</ul>
          </section>
          <section>
            <h3>Parcelas em falta</h3>
            <ul>${openRows || "<li class=\"paid\"><span>Tudo quitado.</span><strong>Pago</strong></li>"}</ul>
          </section>
        </div>
        <span class="item-meta">Proxima cobranca: ${formatMonth(nextMonth)}.</span>
        <div class="item-actions"><button class="danger" type="button" data-delete-installment="${installment.id}">Excluir parcelamento</button></div>
      </details>`;
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
  $("#bankAntonio").value = state.bankBalances.antonio || "";
  $("#bankJuliana").value = state.bankBalances.juliana || "";
  $("#bankMelissa").value = state.bankBalances.melissa || "";
  $("#bankCasal").value = state.bankBalances.casal || "";
  $("#savingsBreakdown").innerHTML = `
    <article class="metric balance-card"><span>Antonio Carlos</span><strong>${money.format(state.bankBalances.antonio)}</strong></article>
    <article class="metric balance-card"><span>Juliana</span><strong>${money.format(state.bankBalances.juliana)}</strong></article>
    <article class="metric balance-card child"><span>Melissa</span><strong>${money.format(state.bankBalances.melissa)}</strong></article>
    <article class="metric balance-card"><span>Casal</span><strong>${money.format(state.bankBalances.casal)}</strong></article>
    <article class="metric balance-card family"><span>Familia</span><strong>${money.format(familyBankBalance())}</strong></article>
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
    nextMonthNeeded: total(getMonthExpenses(addMonths(month, 1), { includeUnpaidInstallments: true })) + total(getPlannedBillsForMonth(addMonths(month, 1))),
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
  renderPlannedBills();
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
$("#installmentStart").valueAsDate = new Date();
$("#plannedStart").value = selectedMonth;

$("#plannedBillForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.plannedBills.push({
    id: makeId(),
    description: $("#plannedDescription").value.trim(),
    amount: normalizeCurrency($("#plannedAmount").value),
    startMonth: $("#plannedStart").value,
    dueDay: Number($("#plannedDueDay").value),
    category: $("#plannedCategory").value,
    personId: $("#plannedPerson").value,
    accountType: $("#plannedAccountType").value,
    payments: {},
  });
  saveState();
  event.target.reset();
  $("#plannedStart").value = selectedMonth;
  render();
});

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
    recurring: false,
  });
  saveState();
  event.target.reset();
  $("#expenseDate").valueAsDate = new Date();
  render();
});

$("#installmentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const startDate = $("#installmentStart").value;
  const startMonth = monthKey(startDate);
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
    startDate,
    personId: $("#installmentPerson").value,
    accountType: $("#installmentAccountType").value,
    payments: {},
    adjustments: {},
  });
  saveState();
  event.target.reset();
  $("#installmentStart").valueAsDate = new Date();
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
  state.bankBalances.antonio = normalizeCurrency($("#bankAntonio").value);
  state.bankBalances.juliana = normalizeCurrency($("#bankJuliana").value);
  state.bankBalances.melissa = normalizeCurrency($("#bankMelissa").value);
  state.bankBalances.casal = normalizeCurrency($("#bankCasal").value);
  state.savings.casal = state.bankBalances.casal;
  state.savings.filha = state.bankBalances.melissa;
  saveState();
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
  const savePaidUntilId = event.target.dataset.savePaidUntil;
  const setInstallmentPaymentId = event.target.dataset.setInstallmentPayment;
  const saveInstallmentAdjustmentId = event.target.dataset.saveInstallmentAdjustment;
  const payPlannedId = event.target.dataset.payPlanned;
  const deletePlannedId = event.target.dataset.deletePlanned;

  if (expenseId) {
    state.expenses = state.expenses.filter((expense) => expense.id !== expenseId);
    saveState();
    render();
  }

  if (payPlannedId) {
    const bill = state.plannedBills.find((item) => item.id === payPlannedId);
    const amountInput = document.querySelector(`[data-real-planned-amount="${payPlannedId}"]`);
    const dateInput = document.querySelector(`[data-real-planned-date="${payPlannedId}"]`);
    if (!bill || !amountInput || !dateInput) return;
    const amount = normalizeCurrency(amountInput.value);
    const paidDate = dateInput.value || new Date().toISOString().slice(0, 10);
    bill.payments = bill.payments || {};
    bill.payments[selectedMonth] = { amount, paidDate };

    const existingExpense = state.expenses.find((expense) => expense.plannedBillId === bill.id && expense.plannedForMonth === selectedMonth);
    const expenseData = {
      id: makeId(),
      description: bill.description,
      amount,
      date: paidDate,
      personId: bill.personId,
      accountType: bill.accountType,
      category: bill.category,
      carId: "",
      recurring: false,
      plannedBillId: bill.id,
      plannedForMonth: selectedMonth,
    };
    if (existingExpense) {
      Object.assign(existingExpense, { ...expenseData, id: existingExpense.id });
    } else {
      state.expenses.push(expenseData);
    }
    saveState();
    render();
  }

  if (deletePlannedId) {
    state.plannedBills = state.plannedBills.filter((bill) => bill.id !== deletePlannedId);
    saveState();
    render();
  }

  if (installmentId) {
    state.installments = state.installments.filter((installment) => installment.id !== installmentId);
    saveState();
    render();
  }

  if (savePaidUntilId) {
    const installment = state.installments.find((item) => item.id === savePaidUntilId);
    const input = document.querySelector(`[data-paid-until-input="${savePaidUntilId}"]`);
    installment.paidUntil = input.value;
    installmentPaymentRows(installment).forEach((row) => {
      setInstallmentPayment(installment, row.month, row.date <= installment.paidUntil);
    });
    saveState();
    render();
  }

  if (setInstallmentPaymentId) {
    const installment = state.installments.find((item) => item.id === setInstallmentPaymentId);
    if (!installment) return;
    const paymentMonth = event.target.dataset.paymentMonth;
    const adjustmentInput = document.querySelector(`[data-installment-adjustment="${setInstallmentPaymentId}"][data-adjustment-month="${paymentMonth}"]`);
    if (adjustmentInput) setInstallmentAdjustment(installment, paymentMonth, adjustmentInput.value);
    setInstallmentPayment(installment, paymentMonth, event.target.dataset.paymentStatus === "true");
    saveState();
    render();
  }

  if (saveInstallmentAdjustmentId) {
    const installment = state.installments.find((item) => item.id === saveInstallmentAdjustmentId);
    const month = event.target.dataset.adjustmentMonth;
    const input = document.querySelector(`[data-installment-adjustment="${saveInstallmentAdjustmentId}"][data-adjustment-month="${month}"]`);
    if (!installment || !input) return;
    setInstallmentAdjustment(installment, month, input.value);
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
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const installBtn = document.getElementById("installBtn");

  if (installBtn) {
    installBtn.style.display = "block";

    installBtn.addEventListener("click", async () => {
      deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        console.log("App instalado");
      }

      deferredPrompt = null;
    });
  }
});
