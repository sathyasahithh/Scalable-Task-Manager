// State Management
const state = {
    token: localStorage.getItem('token') || '',
    user: null, // { id, email, full_name, role }
    tasks: [],
    users: [],
    currentFilter: 'all', // all, pending, in_progress, completed
    adminScopeAllUsers: false
};

// API Base Path
const API_BASE = '/api/v1';

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const userHeaderMenu = document.getElementById('user-header-menu');
const headerUserName = document.getElementById('header-user-name');
const headerUserRole = document.getElementById('header-user-role');
const userAvatar = document.getElementById('user-avatar');
const logoutBtn = document.getElementById('logout-btn');

// Auth DOM
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authErrorAlert = document.getElementById('auth-error-alert');
const authErrorMessage = document.getElementById('auth-error-message');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');

// Dashboard DOM
const statTotal = document.getElementById('stat-total');
const statProgress = document.getElementById('stat-progress');
const statCompleted = document.getElementById('stat-completed');
const roleStatLabel = document.getElementById('role-stat-label');
const roleStatValue = document.getElementById('role-stat-value');
const roleStatIcon = document.getElementById('role-stat-icon');
const statsPanelRole = document.getElementById('stats-panel-role');

const adminControlsSection = document.getElementById('admin-controls-section');
const adminUserListTbody = document.getElementById('admin-user-list-tbody');
const adminTaskScopeToggle = document.getElementById('admin-task-scope-toggle');

const tasksGrid = document.getElementById('tasks-grid');
const tasksEmptyState = document.getElementById('tasks-empty-state');
const refreshTasksBtn = document.getElementById('refresh-tasks-btn');
const openCreateModalBtn = document.getElementById('open-create-modal-btn');

// Modal DOM
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const modalTitle = document.getElementById('modal-title');
const taskModalId = document.getElementById('task-modal-id');
const taskModalTitle = document.getElementById('task-modal-title');
const taskModalDesc = document.getElementById('task-modal-desc');
const taskModalStatus = document.getElementById('task-modal-status');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const modalErrorAlert = document.getElementById('modal-error-alert');
const modalErrorMessage = document.getElementById('modal-error-message');
const toastContainer = document.getElementById('toast-container');

// App Initialization
async function init() {
    setupEventListeners();
    
    if (state.token) {
        const validated = await validateTokenAndLoadProfile();
        if (validated) {
            showDashboardView();
        } else {
            clearAuth();
            showAuthView();
        }
    } else {
        showAuthView();
    }
}

// Event Listeners Configuration
function setupEventListeners() {
    // Auth tab toggles
    tabLogin.addEventListener('click', () => toggleAuthTabs('login'));
    tabRegister.addEventListener('click', () => toggleAuthTabs('register'));

    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    taskForm.addEventListener('submit', handleTaskSave);

    // Logout
    logoutBtn.addEventListener('click', () => {
        clearAuth();
        showToast('Signed out successfully.', 'info');
        showAuthView();
    });

    // Task actions & modals
    openCreateModalBtn.addEventListener('click', () => openTaskModal());
    closeModalBtn.addEventListener('click', closeTaskModal);
    cancelModalBtn.addEventListener('click', closeTaskModal);
    refreshTasksBtn.addEventListener('click', loadDashboardData);

    // Admin toggles
    adminTaskScopeToggle.addEventListener('change', (e) => {
        state.adminScopeAllUsers = e.target.checked;
        loadDashboardData();
    });

    // Filter Buttons
    document.querySelectorAll('[data-filter]').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.currentFilter = e.target.getAttribute('data-filter');
            renderTasks();
        });
    });
}

// Views management
function showAuthView() {
    dashboardSection.classList.add('hidden');
    userHeaderMenu.classList.add('hidden');
    
    authSection.classList.remove('hidden');
    authSection.classList.add('scale-100', 'opacity-100');
}

function showDashboardView() {
    authSection.classList.add('hidden');
    
    // Set Header
    headerUserName.textContent = state.user.full_name || state.user.email;
    headerUserRole.textContent = state.user.role === 'admin' ? 'Administrator' : 'Standard User';
    userAvatar.textContent = (state.user.full_name || state.user.email).charAt(0).toUpperCase();
    
    // Set Role Stat Card Panel
    if (state.user.role === 'admin') {
        roleStatLabel.textContent = 'Roster Count';
        roleStatValue.textContent = 'Admin Mode';
        roleStatIcon.className = 'w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-accentPink text-xl';
        statsPanelRole.className = 'glass-card p-6 rounded-2xl border border-glassborder flex items-center space-x-4 relative overflow-hidden bg-gradient-to-tr from-pink-500/5 to-transparent';
        
        adminControlsSection.classList.remove('hidden');
    } else {
        roleStatLabel.textContent = 'Role Tier';
        roleStatValue.textContent = 'Standard';
        roleStatIcon.className = 'w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-accentBlue text-xl';
        statsPanelRole.className = 'glass-card p-6 rounded-2xl border border-glassborder flex items-center space-x-4 relative overflow-hidden';
        
        adminControlsSection.classList.add('hidden');
    }
    
    userHeaderMenu.classList.remove('hidden');
    dashboardSection.classList.remove('hidden');
    setTimeout(() => {
        dashboardSection.classList.remove('opacity-0', 'translate-y-4');
        dashboardSection.classList.add('opacity-100', 'translate-y-0');
    }, 50);

    loadDashboardData();
}

// Toggle Auth Tabs (Login / Register)
function toggleAuthTabs(tab) {
    authErrorAlert.classList.add('hidden');
    if (tab === 'login') {
        tabLogin.className = 'flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-slate-800 shadow-sm transition-all duration-300';
        tabRegister.className = 'flex-1 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition-all duration-300';
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        authTitle.textContent = "Welcome Back";
        authSubtitle.textContent = "Sign in to manage and orchestrate your tasks.";
    } else {
        tabRegister.className = 'flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-slate-800 shadow-sm transition-all duration-300';
        tabLogin.className = 'flex-1 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition-all duration-300';
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        authTitle.textContent = "Create Account";
        authSubtitle.textContent = "Register a profile to get started.";
    }
}

// Clear Auth Storage
function clearAuth() {
    state.token = '';
    state.user = null;
    localStorage.removeItem('token');
}

// Fetch headers helper
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
    };
}

// Format API Error Message
function formatErrorMessage(data) {
    if (data && data.message) {
        if (data.errors && Array.isArray(data.errors)) {
            // custom error details from request validation handler
            return `${data.message}: ${data.errors.map(e => `[${e.field}] ${e.message}`).join(', ')}`;
        }
        return data.message;
    }
    if (data && data.detail) {
        if (typeof data.detail === 'string') return data.detail;
        if (Array.isArray(data.detail)) return data.detail.map(e => e.msg).join(', ');
    }
    return 'An unexpected communication error occurred.';
}

// API: Verify existing token & fetch user profile
async function validateTokenAndLoadProfile() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            state.user = await response.json();
            return true;
        }
    } catch (err) {
        console.error("Token verification failed", err);
    }
    return false;
}

// Form Submissions Actions
async function handleLogin(e) {
    e.preventDefault();
    authErrorAlert.classList.add('hidden');
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            state.token = data.access_token;
            localStorage.setItem('token', data.access_token);
            
            // Re-fetch profile just to be certain
            const loaded = await validateTokenAndLoadProfile();
            if (loaded) {
                showToast(`Welcome back, ${state.user.full_name || state.user.email}!`, 'success');
                showDashboardView();
                loginForm.reset();
            } else {
                throw new Error("Could not fetch user profile details");
            }
        } else {
            authErrorMessage.textContent = formatErrorMessage(data);
            authErrorAlert.classList.remove('hidden');
        }
    } catch (err) {
        authErrorMessage.textContent = "Server offline or network error. Please verify the backend status.";
        authErrorAlert.classList.remove('hidden');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    authErrorAlert.classList.add('hidden');
    
    const full_name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const role = document.getElementById('register-role').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name, role })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Account registered successfully! You can now log in.', 'success');
            registerForm.reset();
            toggleAuthTabs('login');
        } else {
            authErrorMessage.textContent = formatErrorMessage(data);
            authErrorAlert.classList.remove('hidden');
        }
    } catch (err) {
        authErrorMessage.textContent = "Server offline or connection error.";
        authErrorAlert.classList.remove('hidden');
    }
}

// Load dynamic data (Tasks, System statistics, and Admin lists)
async function loadDashboardData() {
    if (!state.token) return;
    
    await Promise.all([
        fetchTasks(),
        fetchStats(),
        fetchAdminUserRoster()
    ]);
}

// API: Fetch user/global tasks
async function fetchTasks() {
    let url = `${API_BASE}/tasks/`;
    if (state.user.role === 'admin') {
        url += `?all_users=${state.adminScopeAllUsers}`;
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            state.tasks = await response.json();
            renderTasks();
        } else if (response.status === 401) {
            logoutBtn.click();
        }
    } catch (err) {
        showToast("Error loading tasks roster.", "error");
    }
}

// API: Fetch statistics
async function fetchStats() {
    let url = `${API_BASE}/tasks/`; // default metrics counts
    // Admin uses stats endpoint
    if (state.user.role === 'admin') {
        url = `${API_BASE}/admin/stats`;
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            if (state.user.role === 'admin') {
                statTotal.textContent = data.total_tasks;
                statProgress.textContent = data.tasks_by_status.in_progress;
                statCompleted.textContent = data.tasks_by_status.completed;
                roleStatValue.textContent = `${data.total_users} Users`;
            } else {
                // Manually calculate counts for users
                const total = data.length;
                const inProgress = data.filter(t => t.status === 'in_progress').length;
                const completed = data.filter(t => t.status === 'completed').length;
                
                statTotal.textContent = total;
                statProgress.textContent = inProgress;
                statCompleted.textContent = completed;
            }
        }
    } catch (err) {
        console.error("Error loading metrics stats", err);
    }
}

// API: Fetch users roster (Admin only)
async function fetchAdminUserRoster() {
    if (state.user.role !== 'admin') return;

    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            state.users = await response.json();
            renderAdminUserRoster();
        }
    } catch (err) {
        console.error("Error loading user roster", err);
    }
}

// DOM Renderers
function renderTasks() {
    tasksGrid.innerHTML = '';
    
    // Filter tasks
    const filteredTasks = state.tasks.filter(task => {
        if (state.currentFilter === 'all') return true;
        return task.status === state.currentFilter;
    });

    if (filteredTasks.length === 0) {
        tasksEmptyState.classList.remove('hidden');
        tasksGrid.classList.add('hidden');
        return;
    }

    tasksEmptyState.classList.add('hidden');
    tasksGrid.classList.remove('hidden');

    filteredTasks.forEach(task => {
        const card = document.createElement('div');
        
        // Define dynamic border theme by status
        let glowClass = 'border-slate-800';
        let statusBadge = '';
        if (task.status === 'pending') {
            glowClass = 'border-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.02)]';
            statusBadge = '<span class="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Pending</span>';
        } else if (task.status === 'in_progress') {
            glowClass = 'border-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.02)]';
            statusBadge = '<span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">In Progress</span>';
        } else if (task.status === 'completed') {
            glowClass = 'border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.02)]';
            statusBadge = '<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Completed</span>';
        }

        // Show ownership badge for admin
        let ownerLabel = '';
        if (state.user.role === 'admin' && state.adminScopeAllUsers) {
            const owner = state.users.find(u => u.id === task.owner_id);
            const email = owner ? owner.email : `UID: ${task.owner_id}`;
            ownerLabel = `<div class="text-[10px] text-slate-500 mt-2 font-medium flex items-center space-x-1">
                <i class="fa-regular fa-user"></i>
                <span class="truncate">Owner: ${email}</span>
            </div>`;
        }

        card.className = `glass-card rounded-2xl border p-5 flex flex-col justify-between task-card-anim relative overflow-hidden ${glowClass}`;
        card.innerHTML = `
            <div>
                <div class="flex items-start justify-between space-x-3 mb-2">
                    <h4 class="font-bold text-white text-base leading-tight truncate" title="${task.title}">${task.title}</h4>
                    ${statusBadge}
                </div>
                <p class="text-xs text-slate-400 leading-relaxed min-h-[40px] line-clamp-3 mb-3">${task.description || 'No description provided.'}</p>
            </div>
            <div>
                <div class="border-t border-glassborder/50 pt-3 flex items-center justify-between">
                    <!-- Quick status selector -->
                    <select class="quick-status-select bg-slate-900/60 border border-glassborder rounded-lg text-[10px] px-1.5 py-1 text-slate-300 font-semibold focus:outline-none focus:border-accentPurple">
                        <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>

                    <!-- CRUD actions -->
                    <div class="flex items-center space-x-1">
                        <button class="edit-task-btn p-1.5 hover:bg-purple-500/10 text-slate-400 hover:text-accentPurple rounded-lg transition-all" title="Edit Task">
                            <i class="fa-solid fa-pencil text-xs"></i>
                        </button>
                        <button class="delete-task-btn p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-all" title="Delete Task">
                            <i class="fa-regular fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </div>
                ${ownerLabel}
            </div>
        `;

        // Event hooks
        card.querySelector('.quick-status-select').addEventListener('change', (e) => handleQuickStatusChange(task.id, e.target.value));
        card.querySelector('.edit-task-btn').addEventListener('click', () => openTaskModal(task));
        card.querySelector('.delete-task-btn').addEventListener('click', () => handleTaskDelete(task.id));

        tasksGrid.appendChild(card);
    });
}

function renderAdminUserRoster() {
    adminUserListTbody.innerHTML = '';
    
    state.users.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-900/30 transition-colors duration-150';

        const isSelf = user.id === state.user.id;
        const currentRoleBadge = user.role === 'admin' 
            ? '<span class="bg-pink-500/10 text-accentPink px-2 py-0.5 rounded font-bold border border-pink-500/15">ADMIN</span>'
            : '<span class="bg-blue-500/10 text-accentBlue px-2 py-0.5 rounded font-bold border border-blue-500/15">USER</span>';

        const actionButton = isSelf
            ? `<span class="text-[10px] text-slate-600 italic">Self (Locked)</span>`
            : `<button class="toggle-role-btn px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-glassborder hover:border-accentPink transition-all font-semibold" data-user-id="${user.id}" data-current-role="${user.role}">
                <i class="fa-solid fa-arrows-up-down mr-1"></i> Toggle Roster
               </button>`;

        tr.innerHTML = `
            <td class="p-3 font-mono text-slate-400">${user.id}</td>
            <td class="p-3 font-semibold text-slate-200">${user.full_name || 'Anonymous'}</td>
            <td class="p-3 text-slate-300">${user.email}</td>
            <td class="p-3">${currentRoleBadge}</td>
            <td class="p-3 text-center">${actionButton}</td>
        `;

        const btn = tr.querySelector('.toggle-role-btn');
        if (btn) {
            btn.addEventListener('click', () => handleUserRoleToggle(user.id, user.role));
        }

        adminUserListTbody.appendChild(tr);
    });
}

// Modal handling
function openTaskModal(task = null) {
    modalErrorAlert.classList.add('hidden');
    taskForm.reset();
    
    if (task) {
        modalTitle.textContent = "Edit Task";
        taskModalId.value = task.id;
        taskModalTitle.value = task.title;
        taskModalDesc.value = task.description || '';
        taskModalStatus.value = task.status;
    } else {
        modalTitle.textContent = "Create New Task";
        taskModalId.value = '';
        taskModalStatus.value = 'pending';
    }
    
    taskModal.classList.remove('hidden');
}

function closeTaskModal() {
    taskModal.classList.add('hidden');
}

// API: Create or update task
async function handleTaskSave(e) {
    e.preventDefault();
    modalErrorAlert.classList.add('hidden');

    const id = taskModalId.value;
    const title = taskModalTitle.value;
    const description = taskModalDesc.value;
    const status = taskModalStatus.value;

    const payload = { title, description, status };
    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `${API_BASE}/tasks/${id}` : `${API_BASE}/tasks/`;

    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            showToast(id ? 'Task updated successfully' : 'Task created successfully', 'success');
            closeTaskModal();
            loadDashboardData();
        } else {
            modalErrorMessage.textContent = formatErrorMessage(data);
            modalErrorAlert.classList.remove('hidden');
        }
    } catch (err) {
        modalErrorMessage.textContent = "Error communicating with server.";
        modalErrorAlert.classList.remove('hidden');
    }
}

// API: Quick status selection edit
async function handleQuickStatusChange(taskId, statusVal) {
    try {
        const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: statusVal })
        });
        
        if (response.ok) {
            showToast('Status updated successfully.', 'success');
            loadDashboardData();
        } else {
            const data = await response.json();
            showToast(formatErrorMessage(data), 'error');
        }
    } catch (err) {
        showToast('Error connection to server.', 'error');
    }
}

// API: Delete task
async function handleTaskDelete(taskId) {
    if (!confirm('Are you sure you want to permanently delete this task?')) return;

    try {
        const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showToast('Task removed from system.', 'success');
            loadDashboardData();
        } else {
            const data = await response.json();
            showToast(formatErrorMessage(data), 'error');
        }
    } catch (err) {
        showToast('Error connecting to server.', 'error');
    }
}

// API: User Role Privilege Toggle (Admin only)
async function handleUserRoleToggle(userId, currentRole) {
    const targetRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Confirm changes: Toggle this user's privileges to ${targetRole.toUpperCase()}?`)) return;

    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}/role?role=${targetRole}`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showToast('User role updated successfully.', 'success');
            loadDashboardData();
        } else {
            const data = await response.json();
            showToast(formatErrorMessage(data), 'error');
        }
    } catch (err) {
        showToast('Error toggling permissions roster.', 'error');
    }
}

// Helper: Toast alerts drawer
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    
    let iconClass = 'fa-regular fa-circle-check text-emerald-400';
    let borderTheme = 'border-emerald-500/20 bg-slate-950/90 text-slate-200';
    
    if (type === 'error') {
        iconClass = 'fa-solid fa-triangle-exclamation text-red-400';
        borderTheme = 'border-red-500/20 bg-slate-950/90 text-slate-200';
    } else if (type === 'info') {
        iconClass = 'fa-solid fa-circle-info text-blue-400';
        borderTheme = 'border-blue-500/20 bg-slate-950/90 text-slate-200';
    }

    toast.className = `glass-card border px-4 py-3.5 rounded-2xl flex items-center space-x-3 pointer-events-auto min-w-[280px] shadow-xl toast-in ${borderTheme}`;
    toast.innerHTML = `
        <div class="text-lg flex items-center justify-center">
            <i class="${iconClass}"></i>
        </div>
        <div class="text-xs font-semibold flex-grow">${message}</div>
    `;

    toastContainer.appendChild(toast);

    // Fade out and self-destruct after 3.2 seconds
    setTimeout(() => {
        toast.classList.remove('toast-in');
        toast.classList.add('toast-out');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3200);
}

// Boot Application
init();
