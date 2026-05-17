<!doctype html>
<html lang="pt-PT">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Minha Vida Financeira</title>
    <link rel="manifest" href="manifest.json" />
    <link rel="icon" type="image/png" sizes="32x32" href="assets/icons/favicon-32.png" />
    <link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png" />
    <meta name="theme-color" content="#13231f" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Minha Vida" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="stylesheet" href="css/styles.css" />
  </head>
  <body>
    <main id="loginScreen" class="login-shell">
      <section class="login-panel">
        <div>
          <p class="eyebrow">Controle financeiro familiar</p>
          <h1>Minha Vida Financeira</h1>
          <p class="muted">Entre para acompanhar gastos, ordenados, carros, dívidas e o fechamento do mês.</p>
        </div>

        <form id="loginForm" class="stack">
          <label>
            Utilizador
            <input id="loginUser" autocomplete="username" value="admin" required />
          </label>
          <label>
            Senha
            <input id="loginPass" type="password" autocomplete="current-password" value="admin123" required />
          </label>
          <button type="submit" class="primary">Entrar</button>
          <p id="loginHint" class="hint">Acesso inicial: <strong>admin</strong> / <strong>admin123</strong></p>
          <p id="loginError" class="error" hidden>Utilizador ou senha inválidos.</p>
        </form>
      </section>
    </main>

    <main id="appScreen" class="app-shell" hidden style="display: none">
      <aside class="sidebar">
        <div>
          <p class="eyebrow">Minha Vida Financeira</p>
          <h2>Finanças</h2>
        </div>
        <nav aria-label="Navegação principal">
          <button class="nav-link active" data-view="dashboardView">Home</button>
          <button class="nav-link" data-view="expensesView">Gastos</button>
          <button class="nav-link" data-view="installmentsView">Parcelas</button>
          <button class="nav-link" data-view="carsView">Carros</button>
          <button class="nav-link" data-view="savingsView">Guardado</button>
          <button class="nav-link" data-view="peopleView">Pessoas</button>
          <button class="nav-link" data-view="reportsView">Relatório</button>
          <button class="nav-link" data-view="accessView">Acesso</button>
        </nav>
        <button id="logoutBtn" class="ghost">Sair</button>
      </aside>

      <section class="workspace">
        <header class="topbar">
          <div>
            <p id="currentMonthLabel" class="eyebrow"></p>
            <h1 id="viewTitle">Home</h1>
          </div>
          <div class="month-control">
            <button id="prevMonth" class="icon-btn" title="Mês anterior" type="button">‹</button>
            <input id="selectedMonth" type="month" />
            <button id="nextMonth" class="icon-btn" title="Próximo mês" type="button">›</button>
          </div>
          <button id="installAppBtn" class="install-btn" type="button">Instalar app</button>
        </header>

        <section id="dashboardView" class="view active-view">
          <div class="summary-grid">
            <article class="metric">
              <span>Gastos do mês</span>
              <strong id="monthSpent">0,00 €</strong>
            </article>
            <article class="metric">
              <span>Ordenados do mês</span>
              <strong id="monthIncome">0,00 €</strong>
            </article>
            <article class="metric danger-metric">
              <span>Dívida trazida</span>
              <strong id="monthDebt">0,00 €</strong>
            </article>
            <article class="metric">
              <span>Precisa para o próximo mês</span>
              <strong id="nextMonthNeeded">0,00 €</strong>
            </article>
            <article class="metric">
              <span>Guardado do casal</span>
              <strong id="coupleSavings">0,00 €</strong>
            </article>
            <article class="metric child">
              <span>Guardado da filha</span>
              <strong id="childSavings">0,00 €</strong>
            </article>
            <article class="metric">
              <span>Saldo do casal</span>
              <strong id="coupleBankBalance">0,00 �</strong>
            </article>
            <article class="metric family">
              <span>Saldo da familia</span>
              <strong id="familyBankBalance">0,00 �</strong>
            </article>
            <article class="metric">
              <span>Combustível no ano</span>
              <strong id="yearFuel">0,00 €</strong>
            </article>
            <article class="metric">
              <span>Km no mês</span>
              <strong id="monthKm">0 km</strong>
            </article>
          </div>

          <div class="two-column">
            <section class="panel">
              <div class="panel-title">
                <h2>Resumo por pessoa</h2>
              </div>
              <div id="personSummary" class="list"></div>
            </section>

            <section class="panel">
              <div class="panel-title">
                <h2>Próximas contas</h2>
              </div>
              <div id="upcomingBills" class="list"></div>
            </section>
          </div>
        </section>

        <section id="expensesView" class="view">
          <div class="split">
            <div class="stack">
              <form id="plannedBillForm" class="panel form-grid">
                <h2>Conta prevista do mês</h2>
                <div class="notice compact-notice">
                  <strong>Use para água, energia, internet e arrendamento.</strong>
                  <p>Coloque o valor previsto. Quando chegar a fatura, lance o valor real nos gastos.</p>
                </div>
                <label>Descrição<input id="plannedDescription" required placeholder="Ex: Água, energia, internet" /></label>
                <label>Valor previsto<input id="plannedAmount" type="number" min="0" step="0.01" required /></label>
                <label>Começa em<input id="plannedStart" type="month" required /></label>
                <label>Dia de vencimento<input id="plannedDueDay" type="number" min="1" max="31" step="1" value="10" required /></label>
                <label>Categoria<select id="plannedCategory">
                  <option>Água</option>
                  <option>Energia</option>
                  <option>Internet</option>
                  <option>Arrendamento</option>
                  <option>Casa</option>
                  <option>Outros</option>
                </select></label>
                <label>Pessoa<select id="plannedPerson" required></select></label>
                <label>Tipo de conta<select id="plannedAccountType" required>
                  <option value="casal">Conta do casal</option>
                  <option value="individual">Individual</option>
                </select></label>
                <button class="primary" type="submit">Adicionar previsão</button>
              </form>

              <form id="expenseForm" class="panel form-grid">
                <h2>Gasto real pago</h2>
                <label>Descrição<input id="expenseDescription" required placeholder="Ex: Café, combustível, água paga" /></label>
                <label>Valor real<input id="expenseAmount" type="number" min="0" step="0.01" required /></label>
                <label>Data<input id="expenseDate" type="date" required /></label>
                <label>Pessoa<select id="expensePerson" required></select></label>
                <label>Tipo de conta<select id="expenseAccountType" required>
                  <option value="individual">Individual</option>
                  <option value="casal">Conta do casal</option>
                </select></label>
                <label>Categoria<select id="expenseCategory">
                  <option>Café</option>
                  <option>Combustível</option>
                  <option>Internet</option>
                  <option>Água</option>
                  <option>Energia</option>
                  <option>Arrendamento</option>
                  <option>Casa</option>
                  <option>Mercado</option>
                  <option>Transporte</option>
                  <option>Saúde</option>
                  <option>Filha</option>
                  <option>Lazer</option>
                  <option>Outros</option>
                </select></label>
                <label>Carro, se for combustível<select id="expenseCar"></select></label>
                <button class="primary" type="submit">Adicionar gasto real</button>
              </form>
            </div>

            <div class="stack">
              <section class="panel">
                <div class="panel-title">
                  <h2>Previsto do mês</h2>
                </div>
                <div id="plannedBillsList" class="list"></div>
              </section>

              <section class="panel">
                <div class="panel-title">
                  <h2>Gastos pagos no mês</h2>
                  <button id="clearExpenses" class="danger" type="button">Limpar mês</button>
                </div>
                <div id="expensesList" class="list"></div>
              </section>
            </div>
          </div>
        </section>

        <section id="installmentsView" class="view">
          <div class="split">
            <form id="installmentForm" class="panel form-grid">
              <h2>Conta parcelada</h2>
              <label>Descrição<input id="installmentDescription" required placeholder="Ex: Geladeira, cartão, sofá" /></label>
              <label>Valor da parcela<input id="installmentAmount" type="number" min="0" step="0.01" required /></label>
              <label>Total de parcelas opcional<input id="installmentTotal" type="number" min="1" step="1" placeholder="Ex: 12" /></label>
              <label>Data da primeira parcela<input id="installmentStart" type="date" required /></label>
              <label>Data da última parcela opcional<input id="installmentEnd" type="date" /></label>
              <label>Pessoa<select id="installmentPerson" required></select></label>
              <label>Tipo de conta<select id="installmentAccountType" required>
                <option value="individual">Individual</option>
                <option value="casal">Conta do casal</option>
              </select></label>
              <button class="primary" type="submit">Criar parcelas</button>
            </form>

            <section class="panel">
              <div class="panel-title">
                <h2>Parcelamentos ativos</h2>
              </div>
              <div id="installmentsList" class="list"></div>
            </section>
          </div>
        </section>

        <section id="carsView" class="view">
          <div class="split">
            <div class="stack">
              <form id="carForm" class="panel form-grid">
                <h2>Cadastrar carro</h2>
                <label>Nome do carro<input id="carName" required placeholder="Ex: Golf, Clio, carrinha" /></label>
                <label>Matrícula ou observação<input id="carPlate" placeholder="Opcional" /></label>
                <button class="primary" type="submit">Cadastrar carro</button>
              </form>

              <form id="mileageForm" class="panel form-grid">
                <h2>Km feitos no mês</h2>
                <label>Carro<select id="mileageCar" required></select></label>
                <label>Mês<input id="mileageMonth" type="month" required /></label>
                <label>Quilómetros<input id="mileageKm" type="number" min="0" step="1" required /></label>
                <button class="primary" type="submit">Salvar km</button>
              </form>
            </div>

            <section class="panel">
              <div class="panel-title">
                <h2>Carros cadastrados</h2>
              </div>
              <div id="carsList" class="list"></div>
            </section>
          </div>
        </section>

        <section id="savingsView" class="view">
          <div class="split savings-layout">
            <form id="savingsForm" class="panel form-grid balance-form">
              <h2>Saldos no banco</h2>
              <label>Saldo do Antonio Carlos<input id="bankAntonio" type="number" min="0" step="0.01" /></label>
              <label>Saldo da Juliana<input id="bankJuliana" type="number" min="0" step="0.01" /></label>
              <label>Saldo da Melissa<input id="bankMelissa" type="number" min="0" step="0.01" /></label>
              <label>Saldo do casal<input id="bankCasal" type="number" min="0" step="0.01" /></label>
              <button class="primary" type="submit">Salvar saldos</button>
            </form>

            <section class="panel balance-panel">
              <div class="panel-title">
                <h2>Visao da familia</h2>
              </div>
              <div class="notice compact-notice">
                <strong>O saldo da familia soma Antonio, Juliana, Melissa e casal.</strong>
                <p>Use estes valores para ver rapidamente o dinheiro no banco, sem misturar com despesas do mes.</p>
              </div>
              <div id="savingsBreakdown" class="summary-grid compact balance-grid"></div>
            </section>
          </div>
        </section>
        <section id="peopleView" class="view">
          <div class="split">
            <div class="stack">
              <form id="personForm" class="panel form-grid">
                <h2>Cadastrar pessoa</h2>
                <label>Nome<input id="personName" required placeholder="Ex: Julia" /></label>
                <label>Data de aniversário<input id="personBirthday" type="date" /></label>
                <label>Perfil<select id="personRole">
                  <option value="adulto">Adulto</option>
                  <option value="filha">Filha menor</option>
                </select></label>
                <button class="primary" type="submit">Cadastrar</button>
              </form>

              <form id="salaryForm" class="panel form-grid">
                <h2>Ordenado recebido no mês</h2>
                <label>Pessoa<select id="salaryPerson" required></select></label>
                <label>Mês<input id="salaryMonth" type="month" required /></label>
                <label>Valor recebido<input id="salaryAmount" type="number" min="0" step="0.01" required /></label>
                <button class="primary" type="submit">Salvar ordenado</button>
              </form>
            </div>

            <section class="panel">
              <div class="panel-title">
                <h2>Pessoas cadastradas</h2>
              </div>
              <div id="peopleList" class="list"></div>
            </section>
          </div>
        </section>

        <section id="reportsView" class="view">
          <section class="panel report-panel">
            <div class="panel-title">
              <h2>Fechamento do mês</h2>
              <button id="closeMonthBtn" class="primary" type="button">Fechar mês</button>
            </div>
            <div id="reportOutput" class="report-output"></div>
          </section>
        </section>

        <section id="accessView" class="view">
          <div class="split">
            <form id="accessForm" class="panel form-grid">
              <h2>Editar meu login</h2>
              <label>Novo utilizador<input id="accessUsername" required /></label>
              <label>Nova senha<input id="accessPassword" type="password" required /></label>
              <button class="primary" type="submit">Salvar login</button>
            </form>

            <form id="newUserForm" class="panel form-grid">
              <h2>Criar outro acesso</h2>
              <label>Utilizador<input id="newUsername" required /></label>
              <label>Senha<input id="newPassword" type="password" required /></label>
              <button class="primary" type="submit">Criar acesso</button>
              <div id="usersList" class="list"></div>
            </form>
          </div>
        </section>
      </section>
    </main>

    <script src="js/app.js"></script>
    <script src="js/pwa.js"></script>
  </body>
</html>
