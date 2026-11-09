import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  X,
  Edit3,
  Sliders,
  ShoppingBag,
  ArrowRight,
  Shield,
  UserPlus,
  UserMinus,
  Building,
  Phone,
  Mail,
  BadgePercent,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Ban
} from 'lucide-react';
import apiClient from '../../services/apiClient';

const AVAILABLE_PERMISSIONS = [
  { id: 'inventory:products', label: 'Product Search & Catalogue View', desc: 'Browse shared products and view metadata' },
  { id: 'inventory:edit_products', label: 'Add & Edit Products', desc: 'Create products, edit descriptions & images' },
  { id: 'inventory:stock_search', label: 'Stock Search & Lookup', desc: 'Search and inspect product inventory' },
  { id: 'inventory:receive', label: 'Stock Receiving (Inward)', desc: 'Process inward vendor deliveries & QC' },
  { id: 'inventory:adjust', label: 'Stock Adjustments', desc: 'Execute cycle count shelf adjustments' },
  { id: 'inventory:damaged', label: 'Damaged Goods Quarantine', desc: 'Record defective merchandise & scrap' },
  { id: 'inventory:physical_count', label: 'Physical Stock Count', desc: 'Audit physical counts vs system records' },
  { id: 'inventory:history', label: 'Stock History & Movement Ledger', desc: 'View immutable stock transaction history' },
  { id: 'inventory:reports', label: 'Inventory Reports', desc: 'View reorder alerts & movement reports' }
];

export function EmployeeManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Tab State: 'staff' | 'customers'
  const [activeTab, setActiveTab] = useState('staff');

  // Employee State with instant cache retrieval
  const [employees, setEmployees] = useState(() => {
    try {
      const cached = localStorage.getItem('unikart_cached_employees');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Customer State with instant cache retrieval
  const [customers, setCustomers] = useState(() => {
    try {
      const cached = localStorage.getItem('unikart_cached_customers');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTargetEmployee, setEditTargetEmployee] = useState(null);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    phone: '',
    designation: '',
    department: '',
    role: 'inventory_staff',
    is_active: true
  });

  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteTargetCustomer, setPromoteTargetCustomer] = useState(null);
  const [promoteFormData, setPromoteFormData] = useState({
    role: 'inventory_staff'
  });

  const [showDemoteModal, setShowDemoteModal] = useState(false);
  const [demoteTargetEmployee, setDemoteTargetEmployee] = useState(null);

  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverData, setHandoverData] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetEmployee, setResetTargetEmployee] = useState(null);
  const [tempPassword, setTempPassword] = useState('');

  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permTargetEmployee, setPermTargetEmployee] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // In-App Confirmation Modals
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: 'employee', target: null });
  const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'employee', target: null, targetStatus: 'SUSPENDED', actionDesc: 'suspend' });

  // Attractive Floating Toast / Alert Banner
  const [toastAlert, setToastAlert] = useState({ show: false, type: 'success', message: '' });

  const showToast = (message, type = 'success') => {
    setToastAlert({ show: true, type, message });
    setTimeout(() => {
      setToastAlert((prev) => ({ ...prev, show: false }));
    }, 4500);
  };

  // Add Form State
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    email: '',
    phone: '',
    designation: 'Inventory Staff',
    department: 'Inventory',
    role: 'inventory_staff',
    accountStatus: 'ACTIVE',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // 1. Fetch Employees
  const fetchEmployees = async () => {
    if (!employees || employees.length === 0) setLoadingEmployees(true);
    try {
      const res = await apiClient.get('/superadmin/hr/employees');
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        setEmployees(res.data);
        try {
          localStorage.setItem('unikart_cached_employees', JSON.stringify(res.data));
        } catch {}
      }
    } catch (err) {
      console.warn('Using existing staff list:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // 2. Fetch Customers
  const fetchCustomers = async () => {
    if (!customers || customers.length === 0) setLoadingCustomers(true);
    try {
      const res = await apiClient.get('/superadmin/hr/customers');
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        setCustomers(res.data);
        try {
          localStorage.setItem('unikart_cached_customers', JSON.stringify(res.data));
        } catch {}
      }
    } catch (err) {
      console.warn('Using existing customer list:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchCustomers();

    const sseBase = import.meta.env.VITE_API_BASE_URL || "/api/v1";
    let es;
    try {
      es = new EventSource(`${sseBase}/realtime/events`);
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.event === "user_registered" || payload.event === "employee_updated" || payload.event === "customer_updated" || payload.event === "order_placed") {
            fetchEmployees();
            fetchCustomers();
          }
        } catch (_) {}
      };
    } catch (_) {}

    return () => {
      if (es) es.close();
    };
  }, []);

  const handleOpenAddModal = () => {
    const nextId = `EMP-2026-${String(employees.length + 1).padStart(3, '0')}`;
    setFormData({
      name: '',
      employeeId: nextId,
      email: '',
      phone: '',
      designation: 'Inventory Staff',
      department: 'Inventory',
      role: 'inventory_staff',
      accountStatus: 'ACTIVE',
      username: nextId,
      password: 'Inventory@123',
      confirmPassword: 'Inventory@123'
    });
    setErrorMessage('');
    setShowAddModal(true);
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim()) {
      setErrorMessage('Employee Name is required.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Valid work email address is required.');
      return;
    }

    const normalizedEmail = formData.email.trim().toLowerCase();
    const existingStaff = employees.find(e => (e.email || '').toLowerCase() === normalizedEmail);
    if (existingStaff) {
      setErrorMessage(`A staff member with email "${normalizedEmail}" already exists (${existingStaff.full_name}).`);
      return;
    }
    const existingCust = customers.find(c => (c.email || '').toLowerCase() === normalizedEmail);
    if (existingCust) {
      setErrorMessage(`Email "${normalizedEmail}" already belongs to customer "${existingCust.full_name}". Use "Promote to Role" in the Customer Directory tab to onboard them.`);
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Initial password must be at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employee_code: formData.employeeId.trim().toUpperCase(),
        full_name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        designation: formData.designation.trim() || 'Inventory Staff',
        department: formData.department.trim() || 'Inventory',
        employment_type: 'FULL_TIME',
        employment_status: formData.accountStatus,
        roles: [formData.role],
        permitted_apps: formData.role === 'admin' ? ['inventory', 'admin'] : ['inventory'],
        temporary_password: formData.password
      };

      await apiClient.post('/superadmin/hr/employees', payload);

      setHandoverData({
        name: formData.name.trim(),
        employeeId: formData.employeeId.trim().toUpperCase(),
        username: formData.username.trim() || formData.email.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      setShowAddModal(false);
      setShowHandoverModal(true);
      fetchEmployees();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || 'Failed to create employee account. Ensure email and ID are unique.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Employee Modal
  const handleOpenEditModal = (emp) => {
    setEditTargetEmployee(emp);
    const empRoles = emp.roles || [];
    const primaryRole = empRoles.includes('admin') || empRoles.includes('owner') ? 'admin' : 'inventory_staff';
    setEditFormData({
      full_name: emp.full_name || '',
      phone: emp.phone || '',
      designation: emp.designation || (primaryRole === 'admin' ? 'Administrator' : 'Inventory Staff'),
      department: emp.department || (primaryRole === 'admin' ? 'Executive Management' : 'Inventory'),
      role: primaryRole,
      is_active: emp.is_active && emp.employment_status === 'ACTIVE'
    });
    setErrorMessage('');
    setShowEditModal(true);
  };

  const handleSaveEmployeeEdit = async (e) => {
    e.preventDefault();
    if (!editTargetEmployee) return;

    if (editFormData.role === 'customer') {
      setShowEditModal(false);
      handleOpenDemoteModal(editTargetEmployee);
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      await apiClient.patch(`/superadmin/hr/employees/${editTargetEmployee.id}/update`, {
        full_name: editFormData.full_name.trim(),
        phone: editFormData.phone.trim(),
        designation: editFormData.role === 'admin' ? 'Administrator' : 'Inventory Staff',
        department: editFormData.department.trim() || 'Inventory',
        role: editFormData.role,
        is_active: editFormData.is_active
      });

      setSuccessBanner(`Updated details for employee "${editFormData.full_name}".`);
      setTimeout(() => setSuccessBanner(''), 4000);
      setShowEditModal(false);
      fetchEmployees();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || 'Failed to update employee details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Promote Customer Modal
  const handleOpenPromoteModal = (cust) => {
    setPromoteTargetCustomer(cust);
    setPromoteFormData({
      role: 'inventory_staff'
    });
    setErrorMessage('');
    setShowPromoteModal(true);
  };

  const handlePromoteCustomer = async (e) => {
    e.preventDefault();
    if (!promoteTargetCustomer) return;

    setSubmitting(true);
    setErrorMessage('');
    const roleLabel = promoteFormData.role === 'admin' ? 'Administrator' : 'Inventory Staff';
    try {
      await apiClient.post(`/superadmin/hr/customers/${promoteTargetCustomer.id}/promote`, {
        role: promoteFormData.role,
        designation: roleLabel,
        department: promoteFormData.role === 'admin' ? 'Management' : 'Inventory'
      });

      setSuccessBanner(
        `Successfully promoted ${promoteTargetCustomer.full_name || promoteTargetCustomer.email} to ${roleLabel}! Transferred to Employee Directory.`
      );
      setTimeout(() => setSuccessBanner(''), 5000);
      setShowPromoteModal(false);

      // Refresh both directories and switch directly to staff tab to show newly transferred employee
      await fetchEmployees();
      await fetchCustomers();
      setActiveTab('staff');
    } catch (err) {
      console.error('API promotion failed:', err);
      const msg = err.response?.data?.detail || err.message || 'Promotion failed on server.';
      setErrorMessage(`Failed to promote user: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Demote / Transfer Employee to Customer Modal
  const handleOpenDemoteModal = (emp) => {
    setDemoteTargetEmployee(emp);
    setErrorMessage('');
    setShowDemoteModal(true);
  };

  const handleDemoteEmployeeToCustomer = async () => {
    if (!demoteTargetEmployee) return;

    setSubmitting(true);
    setErrorMessage('');
    try {
      await apiClient.post(`/superadmin/hr/employees/${demoteTargetEmployee.id}/demote-to-customer`);

      setSuccessBanner(
        `Successfully transferred ${demoteTargetEmployee.full_name} to Customer! Record moved to Customer Directory.`
      );
      setTimeout(() => setSuccessBanner(''), 5000);
      setShowDemoteModal(false);

      await fetchEmployees();
      await fetchCustomers();
      setActiveTab('customers');
    } catch (err) {
      console.error('API demote call failed:', err);
      const msg = err.response?.data?.detail || err.message || 'Demotion failed on server.';
      setErrorMessage(`Failed to demote employee: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Open In-App Confirmation for Suspend / Ban
  const handleOpenStatusModal = (target, type = 'employee') => {
    const isCurrentlyActive = Boolean(target.is_active && (target.employment_status ? target.employment_status === 'ACTIVE' : true));
    const targetStatus = isCurrentlyActive ? 'SUSPENDED' : 'ACTIVE';
    const actionDesc = isCurrentlyActive ? 'suspend' : 'reactivate';

    setStatusModal({
      isOpen: true,
      type,
      target,
      targetStatus,
      actionDesc
    });
  };

  // Commit Status Change (Staff or Customer)
  const handleConfirmStatus = async () => {
    if (!statusModal.target) return;
    setSubmitting(true);
    const target = statusModal.target;
    const isAct = statusModal.targetStatus === 'ACTIVE';

    try {
      if (statusModal.type === 'employee') {
        await apiClient.patch(`/superadmin/hr/employees/${target.id}/status`, {
          employment_status: statusModal.targetStatus,
          is_active: isAct,
          reason: `Account ${statusModal.actionDesc} by Administrator.`
        });
        showToast(`Staff account for "${target.full_name}" is now ${statusModal.targetStatus.toLowerCase()}.`);
        fetchEmployees();
      } else {
        const targetId = target.id || target.user_id;
        await apiClient.patch(`/superadmin/hr/customers/${targetId}/status`, {
          is_active: isAct,
          reason: `Customer account ${statusModal.actionDesc} by Administrator.`
        });
        showToast(`Customer "${target.full_name}" has been ${statusModal.actionDesc}d.`);
        fetchCustomers();
      }
      setStatusModal({ isOpen: false, type: 'employee', target: null, targetStatus: 'SUSPENDED', actionDesc: '' });
    } catch (err) {
      showToast(err.response?.data?.detail || err.message || 'Failed to update account status.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Commit Permanent Deletion (Staff or Customer)
  const handleConfirmDelete = async () => {
    if (!deleteModal.target) return;
    setSubmitting(true);
    const target = deleteModal.target;

    try {
      if (deleteModal.type === 'employee') {
        const res = await apiClient.delete(`/superadmin/hr/employees/${target.id}`);
        showToast(res.data?.message || `Personnel record for "${target.full_name}" permanently deleted.`);
        setEmployees((prev) => prev.filter((e) => e.id !== target.id));
        fetchEmployees();
      } else {
        const targetId = target.id || target.user_id;
        const res = await apiClient.delete(`/superadmin/hr/customers/${targetId}`);
        showToast(res.data?.message || `Customer "${target.full_name}" permanently deleted.`);
        setCustomers((prev) => prev.filter((c) => (c.id || c.user_id) !== targetId));
        fetchCustomers();
      }
      setDeleteModal({ isOpen: false, type: 'employee', target: null });
    } catch (err) {
      showToast(err.response?.data?.detail || err.message || 'Failed to delete record.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Reset Password
  const handleOpenReset = (emp) => {
    setResetTargetEmployee(emp);
    const generated = `Unikart@${Math.floor(100 + Math.random() * 900)}`;
    setTempPassword(generated);
    setShowResetModal(true);
  };

  const handleCommitReset = async () => {
    if (!tempPassword || tempPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }
    try {
      await apiClient.post(`/superadmin/hr/employees/${resetTargetEmployee.id}/reset-password`, {
        new_password: tempPassword
      });

      setHandoverData({
        name: resetTargetEmployee.full_name,
        employeeId: resetTargetEmployee.employee_code,
        username: resetTargetEmployee.email,
        email: resetTargetEmployee.email,
        password: tempPassword,
        isReset: true
      });

      setShowResetModal(false);
      setShowHandoverModal(true);
      showToast(`Temporary credentials generated for ${resetTargetEmployee.full_name}.`);
      fetchEmployees();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to reset employee password.', 'error');
    }
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (employeeSearch.trim()) {
        const q = employeeSearch.toLowerCase().trim();
        const matchesName = (emp.full_name || '').toLowerCase().includes(q);
        const matchesCode = (emp.employee_code || '').toLowerCase().includes(q);
        const matchesEmail = (emp.email || '').toLowerCase().includes(q);
        const matchesDept = (emp.department || '').toLowerCase().includes(q);
        const matchesDesig = (emp.designation || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesEmail && !matchesDept && !matchesDesig) return false;
      }
      if (roleFilter !== 'ALL') {
        const roles = emp.roles || [];
        if (!roles.includes(roleFilter.toLowerCase())) return false;
      }
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ACTIVE' && (!emp.is_active || emp.employment_status !== 'ACTIVE')) return false;
        if (statusFilter === 'SUSPENDED' && (emp.is_active && emp.employment_status === 'ACTIVE')) return false;
      }
      return true;
    });
  }, [employees, employeeSearch, roleFilter, statusFilter]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      if (!customerSearch.trim()) return true;
      const q = customerSearch.toLowerCase().trim();
      const matchesName = (cust.full_name || '').toLowerCase().includes(q);
      const matchesEmail = (cust.email || '').toLowerCase().includes(q);
      const matchesPhone = (cust.phone || '').toLowerCase().includes(q);
      return matchesName || matchesEmail || matchesPhone;
    });
  }, [customers, customerSearch]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950 text-[#E8173D] dark:text-red-400">
              Admin Governance Suite
            </span>
            <span className="text-xs font-mono text-slate-400">
              {employees.length} Staff &bull; {customers.length} Customers
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Employee &amp; Customer Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage staff credentials, customer directory, and role promotions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchEmployees();
              fetchCustomers();
            }}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-colors cursor-pointer"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loadingEmployees || loadingCustomers ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E8173D] hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Staff</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <span>{successBanner}</span>
          <button onClick={() => setSuccessBanner('')} className="text-xs hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'staff'
              ? 'border-[#E8173D] text-[#E8173D]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Directory ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'customers'
              ? 'border-[#E8173D] text-[#E8173D]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Customer Directory ({customers.length})</span>
        </button>
      </div>

      {/* TAB 1: STAFF DIRECTORY */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          {/* Search and Filters Bar */}
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search staff by Name, ID, Email, Role..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="INVENTORY_STAFF">Inventory Staff</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          {/* Employee Table */}
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-3.5">Employee ID</th>
                    <th className="px-4 py-3.5">Personnel</th>
                    <th className="px-4 py-3.5">Contact Details</th>
                    <th className="px-4 py-3.5 text-center">Role</th>
                    <th className="px-4 py-3.5 text-center">Account Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingEmployees ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-slate-400">
                        Loading employee personnel...
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-slate-400">
                        No employees found matching the current search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isAdmin = (emp.roles || []).includes('admin') || (emp.roles || []).includes('owner');
                      const isActive = emp.is_active && emp.employment_status === 'ACTIVE';

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-5 py-3.5 font-mono font-bold text-red-600 dark:text-red-400">
                            {emp.employee_code}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900 dark:text-white">{emp.full_name}</div>
                            <div className="text-[10px] text-slate-400">{isAdmin ? 'Administrator' : 'Inventory Staff'}</div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-medium text-slate-800 dark:text-slate-200">{emp.email}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {emp.email === 'admin@unikart.in' || !emp.phone ? '—' : emp.phone}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                isAdmin
                                  ? 'bg-red-100 dark:bg-red-950 text-[#E8173D] dark:text-red-400 border border-red-300'
                                  : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300'
                              }`}
                            >
                              {isAdmin ? 'Admin' : 'Inventory Staff'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                              }`}
                            >
                              {isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                              <span>{isActive ? 'Active' : 'Suspended'}</span>
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Employee Button */}
                              <button
                                onClick={() => handleOpenEditModal(emp)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Edit Employee Details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Reset Password Button */}
                              <button
                                onClick={() => handleOpenReset(emp)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Reset Temporary Password"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>

                              {/* Transfer Employee to Customer */}
                              {emp.email !== 'admin@unikart.in' && emp.email !== 'owner@unikart.in' && (
                                <button
                                  onClick={() => handleOpenDemoteModal(emp)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Transfer Employee to Customer"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Suspend / Reactivate */}
                              {!isAdmin && (
                                <button
                                  onClick={() => handleOpenStatusModal(emp, 'employee')}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    isActive
                                      ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800'
                                      : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800'
                                  }`}
                                  title={isActive ? 'Suspend Staff Account' : 'Reactivate Staff Account'}
                                >
                                  {isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>
                              )}

                              {/* Delete Employee */}
                              {!isAdmin && emp.email !== 'admin@unikart.in' && emp.email !== 'owner@unikart.in' && (
                                <button
                                  onClick={() => setDeleteModal({ isOpen: true, type: 'employee', target: emp })}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Permanently Delete Personnel"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOMER DIRECTORY */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Customer Search Bar */}
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers by Name, Email, or Phone..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
              />
            </div>
            <div className="text-xs text-slate-400">
              Showing {filteredCustomers.length} registered customers
            </div>
          </div>

          {/* Customer Table */}
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-3.5">Customer Code</th>
                    <th className="px-4 py-3.5">Customer Details</th>
                    <th className="px-4 py-3.5">Contact Phone</th>
                    <th className="px-4 py-3.5 text-center">Orders Placed</th>
                    <th className="px-4 py-3.5 text-center">Total Spend</th>
                    <th className="px-4 py-3.5 text-center">Account Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingCustomers ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-slate-400">
                        Loading customer registry...
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-slate-400">
                        No customers found matching the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-600 dark:text-slate-300">
                          {cust.customer_code || `CUST-${String(cust.id).padStart(3, '0')}`}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">{cust.full_name}</div>
                          <div className="text-[10px] text-slate-400">{cust.email}</div>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300">
                          {cust.phone || '—'}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {cust.orders_count || 0} Orders
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center font-bold text-slate-900 dark:text-white">
                          ₹{Number(cust.total_spent || 0).toLocaleString()}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              cust.is_active !== false
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                            }`}
                          >
                            {cust.is_active !== false ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                            <span>{cust.is_active !== false ? 'Active' : 'Suspended'}</span>
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Promote Customer to Staff */}
                            <button
                              onClick={() => handleOpenPromoteModal(cust)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-sky-500/10 hover:bg-sky-500 text-sky-600 hover:text-white border border-sky-500/30 transition-all cursor-pointer shadow-xs"
                              title="Promote Customer to Staff role"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Promote</span>
                            </button>

                            {/* Suspend / Reactivate Customer */}
                            <button
                              onClick={() => handleOpenStatusModal(cust, 'customer')}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                cust.is_active !== false
                                  ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800'
                              }`}
                              title={cust.is_active !== false ? 'Suspend / Ban Customer' : 'Reactivate Customer'}
                            >
                              {cust.is_active !== false ? <Ban className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete Customer */}
                            <button
                              onClick={() => setDeleteModal({ isOpen: true, type: 'customer', target: cust })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Permanently Delete Customer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT EMPLOYEE DETAILS                                  */}
      {/* ------------------------------------------------------------- */}
      {showEditModal && editTargetEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#E8173D]">
                  Edit Personnel Record
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {editTargetEmployee.employee_code} &bull; {editTargetEmployee.full_name}
                </h2>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveEmployeeEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                  >
                    <option value="inventory_staff">Inventory Staff</option>
                    <option value="admin">Administrator</option>
                    <option value="customer">Transfer to Customer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Account Status
                  </label>
                  <select
                    value={editFormData.is_active ? 'ACTIVE' : 'SUSPENDED'}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.value === 'ACTIVE' })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#E8173D] hover:bg-red-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Saving Changes...' : 'Save Employee Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PROMOTE CUSTOMER TO ROLE                               */}
      {/* ------------------------------------------------------------- */}
      {showPromoteModal && promoteTargetCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Role Promotion &amp; Transfer
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Promote Customer to Staff
                </h2>
              </div>
              <button
                onClick={() => setShowPromoteModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs space-y-1">
              <div className="font-bold text-sky-900 dark:text-sky-200">
                Customer: {promoteTargetCustomer.full_name} ({promoteTargetCustomer.email})
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                When promoted, this user will receive internal employee credentials and will immediately appear in the <strong>Employee Directory</strong>.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handlePromoteCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Promote to Role *
                </label>
                <select
                  value={promoteFormData.role}
                  onChange={(e) => setPromoteFormData({ role: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                >
                  <option value="inventory_staff">Inventory Staff</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPromoteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#E8173D] hover:bg-red-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Promoting...' : 'Confirm Promotion & Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: TRANSFER EMPLOYEE TO CUSTOMER                         */}
      {/* ------------------------------------------------------------- */}
      {showDemoteModal && demoteTargetEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Role Transfer &amp; Demotion
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Transfer Employee to Customer
                </h2>
              </div>
              <button
                onClick={() => setShowDemoteModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs space-y-1">
              <div className="font-bold text-purple-900 dark:text-purple-200">
                Employee: {demoteTargetEmployee.full_name} ({demoteTargetEmployee.email})
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                When transferred, this employee will lose staff system privileges and be moved directly to the <strong>Customer Directory</strong> as an active customer.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <div className="pt-3 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDemoteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDemoteEmployeeToCustomer}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Transferring...' : 'Confirm Transfer to Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD INVENTORY STAFF ACCOUNT                           */}
      {/* ------------------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#E8173D]">
                  Direct Staff Provisioning
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Add New Staff Member
                </h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Suresh Kumar"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Employee ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. suresh@unikart.in"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                    />
                  </div>

                  

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                    >
                      <option value="inventory_staff">Inventory Staff</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Initial Temporary Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-3 pr-9 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm Initial Password *
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8173D]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#E8173D] hover:bg-red-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Creating Account...' : 'Create Account & Generate Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ONE-TIME CREDENTIAL HANDOVER SCREEN                   */}
      {/* ------------------------------------------------------------- */}
      {showHandoverModal && handoverData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <Key className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {handoverData.isReset ? 'Password Reset Handover' : 'Staff Credential Handover'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Privately give these credentials to <strong>{handoverData.name}</strong>.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Employee ID</span>
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{handoverData.employeeId}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(handoverData.employeeId, 'id')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'id' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  <span>{copiedField === 'id' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Work Email</span>
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{handoverData.email}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(handoverData.email, 'email')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  <span>{copiedField === 'email' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Temporary Password</span>
                  <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400">{handoverData.password}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(handoverData.password, 'pass')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'pass' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  <span>{copiedField === 'pass' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setShowHandoverModal(false);
                  setHandoverData(null);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#E8173D] hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Done (Credentials Secured)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PASSWORD RESET MODAL                                   */}
      {/* ------------------------------------------------------------- */}
      {showResetModal && resetTargetEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Reset Temporary Password
              </h2>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Generating new password for <strong>{resetTargetEmployee.full_name}</strong> ({resetTargetEmployee.email}).
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Generated Temporary Password
              </label>
              <input
                type="text"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitReset}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E8173D] text-white hover:bg-red-700 cursor-pointer"
              >
                Commit &amp; Show Handover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PERMANENT DELETE CONFIRMATION                          */}
      {/* ------------------------------------------------------------- */}
      {deleteModal.isOpen && deleteModal.target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Permanently Delete {deleteModal.type === 'employee' ? 'Staff Member' : 'Customer'}?
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete <strong>{deleteModal.target.full_name}</strong> ({deleteModal.target.email})?
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300">
              <div className="font-bold flex items-center gap-1.5 mb-0.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Irreversible Database Action</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                This will permanently purge this account and all associated internal records from UNIKART PostgreSQL databases.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, type: 'employee', target: null })}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Deleting from DB...' : 'Confirm Permanent Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SUSPEND / BAN / REACTIVATE CONFIRMATION               */}
      {/* ------------------------------------------------------------- */}
      {statusModal.isOpen && statusModal.target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              statusModal.targetStatus === 'ACTIVE'
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-900'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 border border-amber-200 dark:border-amber-900'
            }`}>
              {statusModal.targetStatus === 'ACTIVE' ? <UserCheck className="w-6 h-6" /> : <Ban className="w-6 h-6" />}
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900 dark:text-white capitalize">
                {statusModal.actionDesc} {statusModal.type === 'employee' ? 'Staff Account' : 'Customer Account'}?
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Target: <strong>{statusModal.target.full_name}</strong> ({statusModal.target.email})
              </p>
            </div>

            <div className={`p-3.5 rounded-2xl text-xs ${
              statusModal.targetStatus === 'ACTIVE'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
            }`}>
              <p className="text-[11px] leading-relaxed">
                {statusModal.targetStatus === 'ACTIVE'
                  ? 'Reactivating will immediately allow this user to sign in and access authorized UNIKART workspaces.'
                  : 'Suspending will instantly block login access and terminate any active sessions across UNIKART.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStatusModal({ isOpen: false, type: 'employee', target: null, targetStatus: 'SUSPENDED', actionDesc: '' })}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatus}
                disabled={submitting}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer disabled:opacity-60 ${
                  statusModal.targetStatus === 'ACTIVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {submitting ? 'Updating...' : `Confirm ${statusModal.actionDesc}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating In-App Toast Notification */}
      {toastAlert.show && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border animate-fadeIn ${
          toastAlert.type === 'error'
            ? 'bg-rose-900 text-white border-rose-700'
            : 'bg-slate-900 text-white border-slate-700'
        }`}>
          {toastAlert.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastAlert.message}</span>
          <button
            onClick={() => setToastAlert((prev) => ({ ...prev, show: false }))}
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default EmployeeManagementPage;
