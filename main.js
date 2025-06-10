document.addEventListener("DOMContentLoaded", () => {
  // Initialize UI and data on page load
  updateAuthUI();
  renderAccountList();
  renderTransactions();

  // Handle signup form submission
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("signupName").value.trim();
      const email = document.getElementById("signupEmail").value.trim();
      const password = document.getElementById("signupPassword").value;
      signUp(name, email, password);
    });
  }

  // Handle login form submission
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;
      signIn(email, password);
    });
  }

  // Restrict actions for non-logged-in users
  document.body.addEventListener("click", (e) => {
    const tag = e.target.closest("a, button");
    if (!tag) return;
    if (
      !isLoggedIn() &&
      !tag.classList.contains("no-login-required") &&
      tag.id !== "view-all-btn"
    ) {
      e.preventDefault();
      alertContainer.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
          Please log in to continue
        </div>
      `;
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        const alert = alertContainer.querySelector(".alert");
        if (alert) {
          const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
          bsAlert.close();
        }
      }, 2000);
    }
  });

  // Handle logout
  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      logout();
      updateAuthUI();
      renderAccountList();
      renderTransactions();
    });
  }

  // Handle account addition
  document.getElementById("add-acc-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const accname = document.getElementById("acc-name").value.trim();
  const acctype = document.getElementById("acc-type").value;
  const accbalance = document.getElementById("acc-balance").value;
  addAccount(accname, acctype, accbalance);
  this.reset();
  renderAccountList();
});


  // Handle transaction addition
  document.getElementById("add-txn-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) return;

  const txntype = document.getElementById("txn-type").value;
  const txnamount = parseFloat(document.getElementById("txn-amount").value);
  const txncategory = document.getElementById("txn-category").value.trim();
  const txndate = document.getElementById("txn-date").value;
  const txn = { txntype, txnamount, txncategory, txndate };

  const key = `accounts_${user.email}`;
  const accounts = JSON.parse(localStorage.getItem(key)) || [];
  const selectedIndex =
    parseInt(localStorage.getItem(`selectedAccountIndex_${user.email}`)) || 0;
  const account = accounts[selectedIndex];

  account.transactions = account.transactions || [];
  account.transactions.push(txn);

  let balance = parseFloat(account.accbalance);
  if (txntype.toLowerCase() === "expense") {
    balance -= txnamount;
  } else {
    balance += txnamount;
  }

  account.accbalance = balance.toFixed(2);
  accounts[selectedIndex] = account;
  localStorage.setItem(key, JSON.stringify(accounts));

  this.reset();

  renderAccountList();
  renderTransactions();
  updateSummary(account.transactions || []);
});
});

// Render recent transactions table
function renderTransactions() {
  const tableBody = document.getElementById("txn-table-body");
  if (!tableBody) return;

  if (!isLoggedIn()) {
    tableBody.innerHTML = `<tr><td colspan="3" class="text-center">Please log in to view transactions!</td></tr>`;
    return;
  }

  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  const key = `accounts_${user.email}`;
  const accounts = JSON.parse(localStorage.getItem(key)) || [];
  const selectedIndex =
    parseInt(localStorage.getItem(`selectedAccountIndex_${user.email}`)) || 0;
  const selectedAccount = accounts[selectedIndex];

  tableBody.innerHTML = "";

  if (
    !selectedAccount ||
    !selectedAccount.transactions ||
    selectedAccount.transactions.length === 0
  ) {
    tableBody.innerHTML = `<tr><td colspan="3" class="text-center">No transactions found</td></tr>`;
    updateSummary([]);
    return;
  }

  const recentTxns = selectedAccount.transactions.slice(-4).reverse();
  recentTxns.forEach((txn) => {
    const row = document.createElement("tr");
    const categoryCell = document.createElement("td");
    categoryCell.textContent = txn.txncategory;
    const dateCell = document.createElement("td");
    dateCell.textContent = txn.txndate;
    const amountCell = document.createElement("td");
    const amount = parseFloat(txn.txnamount);
    if (txn.txntype.toLowerCase() === "expense") {
      amountCell.innerHTML = `<span style="color: red;">-₹${amount}</span>`;
    } else {
      amountCell.innerHTML = `<span style="color: green;">₹${amount}</span>`;
    }
    row.appendChild(categoryCell);
    row.appendChild(dateCell);
    row.appendChild(amountCell);
    tableBody.appendChild(row);
  });

  updateSummary(selectedAccount.transactions);
}

// Add a new account
function addAccount(accname, acctype, accbalance) {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) return;

  const key = `accounts_${user.email}`;
  let accounts = JSON.parse(localStorage.getItem(key)) || [];

  accounts.push({ accname, acctype, accbalance, transactions: [] });
  localStorage.setItem(key, JSON.stringify(accounts));

  const newIndex = accounts.length - 1;
  localStorage.setItem(`selectedAccountIndex_${user.email}`, newIndex);

  renderAccountList();
  renderTransactions();
}

// Render account list and selection
function renderAccountList() {
  const container = document.getElementById("addList");
  if (!container) return;

  if (!isLoggedIn()) {
    container.innerHTML = "<p>Please log in to view accounts!</p>";
    const accountTypeSpan = document.getElementById("account-type");
    if (accountTypeSpan) accountTypeSpan.textContent = "";
    return;
  }

  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  const key = `accounts_${user.email}`;
  const accounts = JSON.parse(localStorage.getItem(key)) || [];

  container.innerHTML = "";

  const accountTypeSpan = document.getElementById("account-type");
  if (accountTypeSpan && accounts.length === 0) {
    container.innerHTML = "<p>No accounts found</p>";
    accountTypeSpan.textContent = "";
    const txnTable = document.getElementById("txn-table-body");
    if (txnTable)
      txnTable.innerHTML =
        "<tr><td colspan='3' class='text-center'>No transactions found</td></tr>";
    updateSummary([]);
    return;
  }

  let savedIndex =
    parseInt(localStorage.getItem(`selectedAccountIndex_${user.email}`)) || 0;
  if (savedIndex >= accounts.length) savedIndex = 0;
  localStorage.setItem(`selectedAccountIndex_${user.email}`, savedIndex);

  const selectedAccount = accounts[savedIndex];

  if (accountTypeSpan) accountTypeSpan.textContent = selectedAccount.acctype;

  const card = document.createElement("div");
  card.className = "p-3 border rounded d-flex justify-content-between align-items-center";

  const left = document.createElement("div");
  left.innerHTML = `
    <h5 id="selected-account-name"><strong>${selectedAccount.accname}</strong></h5>
    <div id="selected-account-balance" class="text-muted">Balance: ₹${selectedAccount.accbalance}</div>
  `;

  const right = document.createElement("div");
  right.className = "d-flex align-items-center gap-2";

  const select = document.createElement("select");
  select.className = "form-select";
  select.style.maxWidth = "120px";

  accounts.forEach((acc, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = acc.accname;
    if (idx === savedIndex) opt.selected = true;
    select.appendChild(opt);
  });

  const viewBtn = document.createElement("button");
  viewBtn.className = "btn btn-outline-primary";
  viewBtn.textContent = "View";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-danger";
  deleteBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i>`;

  right.appendChild(select);
  right.appendChild(viewBtn);
  right.appendChild(deleteBtn);

  viewBtn.onclick = () => {
    const newIndex = parseInt(select.value);
    localStorage.setItem(`selectedAccountIndex_${user.email}`, newIndex);
    renderAccountList();
    renderTransactions();
  };

  deleteBtn.onclick = () => {
    const deleteIndex = parseInt(select.value);
    if (confirm(`Delete account "${accounts[deleteIndex].accname}"?`)) {
      accounts.splice(deleteIndex, 1);
      localStorage.setItem(key, JSON.stringify(accounts));
      localStorage.setItem(`selectedAccountIndex_${user.email}`, "0");
      renderAccountList();
      renderTransactions();
      const updatedAccounts = JSON.parse(localStorage.getItem(key)) || [];
      const newSelectedAccount = updatedAccounts[0];
      updateSummary(newSelectedAccount ? newSelectedAccount.transactions || [] : []);
    }
  };

  card.appendChild(left);
  card.appendChild(right);
  container.appendChild(card);

  renderTransactions();
  updateSummary(selectedAccount.transactions || []);
}

// Handle user signup
function signUp(name, email, password) {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  const exists = users.some((user) => user.email === email);
  if (exists) {
    document.getElementById("signupError").textContent = "Email already registered";
    document.getElementById("signupError").classList.remove("d-none");
    return;
  }

  users.push({ name, email, password });
  localStorage.setItem("users", JSON.stringify(users));
  alertContainer.innerHTML = `
    <div class="alert alert-success alert-dismissible fade show" role="alert">
      SignUp Successful!
    </div>
  `;
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => {
    const alert = alertContainer.querySelector(".alert");
    if (alert) {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
      bsAlert.close();
    }
  }, 2000);

  localStorage.setItem("loggedInUser", JSON.stringify({ name, email, password }));
  updateAuthUI();
  renderAccountList();
  renderTransactions();

  const signUpModal = bootstrap.Modal.getInstance(
    document.getElementById("signUpModal")
  );
  if (signUpModal) signUpModal.hide();
}

// Handle user sign-in
function signIn(email, password) {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  const user = users.find(
    (user) => user.email === email && user.password === password
  );
  if (user) {
    localStorage.setItem("loggedInUser", JSON.stringify(user));
    alertContainer.innerHTML = `
      <div class="alert alert-success alert-dismissible fade show" role="alert">
        Login Successful!
      </div>
    `;
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      const alert = alertContainer.querySelector(".alert");
      if (alert) {
        const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
        bsAlert.close();
      }
    }, 2000);
    updateAuthUI();
    renderAccountList();
    renderTransactions();

    const signInModal = bootstrap.Modal.getInstance(
      document.getElementById("signInModal")
    );
    if (signInModal) signInModal.hide();
  } else {
    document.getElementById("loginError").textContent = "Invalid credentials";
    document.getElementById("loginError").classList.remove("d-none");

  }
}

// Handle user logout
function logout() {
  localStorage.removeItem("loggedInUser");
  alertContainer.innerHTML = `
    <div class="alert alert-danger alert-dismissible fade show" role="alert">
      You have been logged out.
    </div>
  `;
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => {
    const alert = alertContainer.querySelector(".alert");
    if (alert) {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
      bsAlert.close();
    }
  }, 2000);
}

// Check if user is logged in
function isLoggedIn() {
  return localStorage.getItem("loggedInUser") !== null;
}

// Update authentication UI based on login status
function updateAuthUI() {
  const loggedIn = isLoggedIn();
  const authArea = document.getElementById("auth-area");
  const logoutBtn = document.getElementById("logout");

  if (loggedIn) {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    authArea.innerHTML = `<span class="fw-bold text-danger me-2">Welcome! ${user.name}</span>`;
    if (logoutBtn) logoutBtn.style.display = "inline";
  } else {
    authArea.innerHTML = `
      <a href="#" data-bs-toggle="modal" data-bs-target="#signInModal"
          class="no-login-required auth-link fw-bold p-1 bg-danger text-white text-decoration-none me-2">SignIn</a>
      <a href="#" data-bs-toggle="modal" data-bs-target="#signUpModal"
          class="no-login-required auth-link fw-bold p-1 text-danger text-decoration-none">SignUp</a>
    `;
    if (logoutBtn) logoutBtn.style.display = "none";
  }
}

// Update account summary
function updateSummary(transactions = []) {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) return;

  const key = `accounts_${user.email}`;
  const accounts = JSON.parse(localStorage.getItem(key)) || [];
  const selectedIndex =
    parseInt(localStorage.getItem(`selectedAccountIndex_${user.email}`)) || 0;

  if (!accounts.length || selectedIndex >= accounts.length) {
    document.getElementById("totalIncome").textContent = `₹ 0.00`;
    document.getElementById("totalExpense").textContent = `₹ 0.00`;
    document.getElementById("balance").textContent = `₹ 0.00`;
    return;
  }

  let totalIncome = 0,
    totalExpense = 0;

  transactions.forEach((txn) => {
    if (txn.txntype.toLowerCase() === "income") {
      totalIncome += parseFloat(txn.txnamount);
    } else {
      totalExpense += parseFloat(txn.txnamount);
    }
  });

  const balance = totalIncome - totalExpense;

  document.getElementById("totalIncome").textContent = `₹ ${totalIncome.toFixed(
    2
  )}`;
  document.getElementById("totalExpense").textContent = `₹ ${totalExpense.toFixed(
    2
  )}`;
  document.getElementById("balance").textContent = `₹ ${balance.toFixed(2)}`;
}

// Handle view all transactions button
const viewAllBtn = document.getElementById("view-all-btn");
if (viewAllBtn) {
  viewAllBtn.addEventListener("click", (e) => {
    if (!isLoggedIn()) {
      e.preventDefault();
      alertContainer.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
          Please log in to continue
        </div>
      `;
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        const alert = alertContainer.querySelector(".alert");
        if (alert) {
          const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
          bsAlert.close();
        }
      }, 2000);
      return;
    }
    window.location.href = "transactions.html";
  });
}

const loginModal = document.getElementById('signInModal');
const signupModal = document.getElementById('signUpModal');

loginModal.addEventListener('hidden.bs.modal', () => {
    document.getElementById('loginError').classList.add('d-none');
});

signupModal.addEventListener('hidden.bs.modal', () => {
    document.getElementById('signupError').classList.add('d-none');
});
