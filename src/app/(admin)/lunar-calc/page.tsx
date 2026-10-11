'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Calculator,
  Plus,
  Trash2,
  Edit2,
  Download,
  Printer,
  Search,
  Building2,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  Info,
} from 'lucide-react';
import { formatZarCurrency } from '@/lib/utils';
import { CalcClient, CalcProduct, CalcSummary } from '@/lib/calc/service';

interface BusinessOption {
  id: string;
  name: string;
  slug: string;
  lunar_calc_enabled?: boolean;
}

export default function LunarCalcPage() {
  const [activeTab, setActiveTab] = useState<'clients' | 'products'>('clients');
  const [user, setUser] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [clients, setClients] = useState<CalcClient[]>([]);
  const [summary, setSummary] = useState<CalcSummary | null>(null);
  const [products, setProducts] = useState<CalcProduct[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<CalcClient | null>(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    notes: '',
    status: 'active' as 'active' | 'pending' | 'inactive',
  });

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CalcProduct | null>(null);
  const [productForm, setProductForm] = useState<{
    name: string;
    code: string;
    description: string;
    cost_price: string | number;
    selling_price: string | number;
    billing_cycle: 'monthly' | 'annually' | 'once_off';
  }>({
    name: '',
    code: '',
    description: '',
    cost_price: '0',
    selling_price: '',
    billing_cycle: 'monthly',
  });

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [targetClientId, setTargetClientId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    product_id: '',
    quantity: 1,
    custom_cost_price: '',
    custom_selling_price: '',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Initial auth and businesses load
  useEffect(() => {
    async function loadAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          const superAdmin = Boolean(
            data.user.isSuperAdmin || data.user.email === 'admin@lunarposgeorge.co.za'
          );
          setIsSuperAdmin(superAdmin);
          setSelectedOrgId(data.user.orgId);

          if (superAdmin) {
            // Load all businesses for super admin selector
            try {
              const bRes = await fetch('/api/super-admin/businesses');
              const bData = await bRes.json();
              if (bData.businesses) {
                setBusinesses(bData.businesses);
              }
            } catch (bErr) {
              console.warn('Failed to load businesses list for selector:', bErr);
            }
          }
        }
      } catch (err: any) {
        setError('Failed to authenticate');
      }
    }
    loadAuth();
  }, []);

  // 2. Load clients & products whenever selectedOrgId changes
  const fetchData = async () => {
    if (!selectedOrgId) return;
    setIsLoading(true);
    setError(null);
    try {
      const orgParam = isSuperAdmin ? `?org_id=${selectedOrgId}` : '';
      const [clientsRes, productsRes] = await Promise.all([
        fetch(`/api/calc/clients${orgParam}`),
        fetch(`/api/calc/products${orgParam}`),
      ]);

      if (!clientsRes.ok) {
        const cErr = await clientsRes.json();
        throw new Error(cErr.error || 'Failed to fetch clients');
      }
      if (!productsRes.ok) {
        const pErr = await productsRes.json();
        throw new Error(pErr.error || 'Failed to fetch products');
      }

      const cData = await clientsRes.json();
      const pData = await productsRes.json();

      setClients(cData.clients || []);
      setSummary(cData.summary || null);
      setProducts(pData.products || []);

      // Auto-expand all clients by default for instant visibility
      const exp: Record<string, boolean> = {};
      (cData.clients || []).forEach((c: CalcClient) => {
        exp[c.id] = true;
      });
      setExpandedClients(exp);
    } catch (err: any) {
      console.error('Error loading Lunar Calc data:', err);
      setError(err.message || 'Failed to load calculator data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOrgId) {
      fetchData();
    }
  }, [selectedOrgId]);

  // Toggle client expanded card
  const toggleClientExpand = (id: string) => {
    setExpandedClients((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.contact_person?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.items.some((i) => i.product_name.toLowerCase().includes(term))
    );
  }, [clients, searchTerm]);

  // Client CRUD Handlers
  const handleOpenClientModal = (client?: CalcClient) => {
    if (client) {
      setEditingClient(client);
      setClientForm({
        name: client.name,
        contact_person: client.contact_person || '',
        email: client.email || '',
        phone: client.phone || '',
        notes: client.notes || '',
        status: client.status,
      });
    } else {
      setEditingClient(null);
      setClientForm({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        notes: '',
        status: 'active',
      });
    }
    setIsClientModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const orgParam = isSuperAdmin ? `?org_id=${selectedOrgId}` : '';
      const url = editingClient
        ? `/api/calc/clients/${editingClient.id}${orgParam}`
        : `/api/calc/clients${orgParam}`;
      const method = editingClient ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save client');
      }

      setIsClientModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete client "${name}" and all their license allocations?`)) {
      return;
    }
    try {
      const orgParam = isSuperAdmin ? `?org_id=${selectedOrgId}` : '';
      const res = await fetch(`/api/calc/clients/${id}${orgParam}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete client');
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Product CRUD Handlers
  const handleOpenProductModal = (product?: CalcProduct) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        code: product.code || '',
        description: product.description || '',
        cost_price: product.cost_price.toString(),
        selling_price: product.selling_price.toString(),
        billing_cycle: product.billing_cycle,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        code: '',
        description: '',
        cost_price: '0',
        selling_price: '',
        billing_cycle: 'monthly',
      });
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const orgParam = isSuperAdmin ? `?org_id=${selectedOrgId}` : '';
      const url = editingProduct
        ? `/api/calc/products/${editingProduct.id}${orgParam}`
        : `/api/calc/products${orgParam}`;
      const method = editingProduct ? 'PUT' : 'POST';

      const parsedCost =
        productForm.cost_price === '' || productForm.cost_price === null
          ? 0
          : Number(productForm.cost_price);
      const parsedSelling =
        productForm.selling_price === '' || productForm.selling_price === null
          ? 0
          : Number(productForm.selling_price);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productForm,
          cost_price: isNaN(parsedCost) ? 0 : Math.max(0, parsedCost),
          selling_price: isNaN(parsedSelling) ? 0 : Math.max(0, parsedSelling),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save product');
      }

      setIsProductModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Delete product "${name}"? Existing allocations may be affected.`)) {
      return;
    }
    try {
      const orgParam = isSuperAdmin ? `?org_id=${selectedOrgId}` : '';
      const res = await fetch(`/api/calc/products/${id}${orgParam}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete product');
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // License Item Handlers
  const handleOpenAddItemModal = (clientId: string) => {
    setTargetClientId(clientId);
    const defaultProduct = products[0]?.id || '';
    setItemForm({
      product_id: defaultProduct,
      quantity: 1,
      custom_cost_price: '',
      custom_selling_price: '',
      notes: '',
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClientId) return;
    setIsSubmitting(true);
    try {
      const orgParam = isSuperAdmin ? `?org_id=${selectedOrgId}` : '';
      const payload: any = {
        product_id: itemForm.product_id,
        quantity: Number(itemForm.quantity) || 1,
        notes: itemForm.notes || null,
      };
      if (itemForm.custom_cost_price !== '') {
        payload.custom_cost_price = Number(itemForm.custom_cost_price);
      }
      if (itemForm.custom_selling_price !== '') {
        payload.custom_selling_price = Number(itemForm.custom_selling_price);
      }

      const res = await fetch(`/api/calc/clients/${targetClientId}/items${orgParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to assign product license');
      }

      setIsItemModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (clientId: string, itemId: string, prodName: string) => {
    if (!confirm(`Remove "${prodName}" from this client?`)) return;
    try {
      const orgParam = isSuperAdmin ? `?org_id=${selectedOrgId}` : '';
      const res = await fetch(
        `/api/calc/clients/${clientId}/items/${itemId}${orgParam}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to remove item');
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (clients.length === 0) {
      alert('No clients to export.');
      return;
    }

    const headers = [
      'Client Name',
      'Contact Person',
      'Email',
      'Phone',
      'Status',
      'Product Name',
      'Product SKU',
      'Billing Cycle',
      'Qty',
      'Cost Price (ZAR)',
      'Selling Price (ZAR)',
      'Total Cost (ZAR)',
      'Total Selling (ZAR)',
      'Profit "Difference for Me" (ZAR)',
      'Margin %',
    ];

    const rows: string[][] = [];

    clients.forEach((c) => {
      if (c.items.length === 0) {
        rows.push([
          `"${c.name}"`,
          `"${c.contact_person || ''}"`,
          `"${c.email || ''}"`,
          `"${c.phone || ''}"`,
          `"${c.status}"`,
          'No software allocated',
          '',
          '',
          '0',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '0.0%',
        ]);
      } else {
        c.items.forEach((item) => {
          rows.push([
            `"${c.name}"`,
            `"${c.contact_person || ''}"`,
            `"${c.email || ''}"`,
            `"${c.phone || ''}"`,
            `"${c.status}"`,
            `"${item.product_name}"`,
            `"${item.product_code || ''}"`,
            `"${item.billing_cycle}"`,
            item.quantity.toString(),
            item.cost_price.toFixed(2),
            item.selling_price.toFixed(2),
            item.total_cost.toFixed(2),
            item.total_selling.toFixed(2),
            item.total_profit.toFixed(2),
            `${item.profit_margin_pct}%`,
          ]);
        });
      }
    });

    // Add Summary Row
    rows.push([]);
    rows.push([
      '"--- GRAND TOTALS ---"',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      (summary?.totalLicenses || 0).toString(),
      '',
      '',
      (summary?.grandTotalCost || 0).toFixed(2),
      (summary?.grandTotalSelling || 0).toFixed(2),
      (summary?.grandTotalProfit || 0).toFixed(2),
      `${summary?.overallMarginPct || 0}%`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `lunar-calc-profit-summary-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print to PDF
  const handlePrint = () => {
    window.print();
  };

  // Active business name
  const currentBusinessName = useMemo(() => {
    if (businesses.length > 0) {
      const b = businesses.find((x) => x.id === selectedOrgId);
      if (b) return b.name;
    }
    return user?.orgName || 'LunarPOS George';
  }, [businesses, selectedOrgId, user]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#090d16] text-slate-100 min-h-screen">
      {/* Print Styles for clean paper / PDF rendering */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          aside,
          header,
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .printable-sheet {
            background-color: #ffffff !important;
            color: #0f172a !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .printable-sheet * {
            color: #0f172a !important;
            border-color: #cbd5e1 !important;
            box-shadow: none !important;
          }
          .printable-card {
            break-inside: avoid;
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            margin-bottom: 1rem;
          }
          .text-emerald-400,
          .text-emerald-300 {
            color: #047857 !important;
            font-weight: bold;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Navigation Header */}
      <div className="no-print">
        <AdminHeader
          title="Lunar Calc 🧮"
          subtitle="Software cost vs selling price calculator & profit aggregator for EasyAs licenses"
          actionButton={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="bg-slate-900 border-slate-700 text-slate-200 hover:text-white text-xs h-8 gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="bg-slate-900 border-slate-700 text-slate-200 hover:text-white text-xs h-8 gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Print / PDF</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Printable Official Header (Shown only when printing) */}
        <div className="print-only border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                LUNAR SIGN — SOFTWARE LICENSE PROFIT STATEMENT
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                South African ECTA 25 of 2002 Compliant Business Calculations
              </p>
              <p className="text-sm font-semibold text-slate-800 mt-1">
                Business: {currentBusinessName}
              </p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p>Generated: {new Date().toLocaleDateString('en-ZA')}</p>
              <p>Vendor: EasyAs Software Partner</p>
              <p className="font-mono text-slate-900 font-bold">
                Profit Difference: {formatZarCurrency(summary?.grandTotalProfit || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Super Admin Business Switcher Bar (Screen only) */}
        {isSuperAdmin && businesses.length > 0 && (
          <div className="no-print bg-indigo-950/40 border border-indigo-800/40 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-xs font-semibold text-indigo-200">
                Super Admin Scope:
              </span>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="bg-slate-900 border border-indigo-700/60 rounded-lg text-xs font-medium text-white px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.lunar_calc_enabled ? '★' : '(Restricted)'}
                  </option>
                ))}
              </select>
            </div>

            <Badge
              variant="outline"
              className="text-[11px] font-mono text-cyan-400 border-cyan-500/30 bg-cyan-950/30"
            >
              Exclusively Visible to Super Admin (admin@lunarposgeorge.co.za)
            </Badge>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="no-print bg-rose-950/40 border border-rose-800/60 p-4 rounded-xl text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Executive Profit Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 printable-sheet">
          {/* Card 1: The Difference for Me (PROFIT) */}
          <Card className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/30 shadow-lg relative overflow-hidden printable-card">
            <div className="absolute top-0 right-0 p-3 opacity-15">
              <TrendingUp className="w-16 h-16 text-emerald-400" />
            </div>
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Profit for Me (The Difference)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-300 font-mono tracking-tight mt-1">
                {formatZarCurrency(summary?.grandTotalProfit || 0)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-mono">
                  {summary?.overallMarginPct || 0}% Net Margin
                </Badge>
                <span className="text-[11px] text-slate-400">Total markup</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Client Selling Total (Revenue) */}
          <Card className="bg-slate-900/60 border-slate-800 printable-card">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Client Selling Total
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-white font-mono tracking-tight mt-1">
                {formatZarCurrency(summary?.grandTotalSelling || 0)}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Billed to clients across all licenses
              </p>
            </CardContent>
          </Card>

          {/* Card 3: EasyAs Software Cost Total */}
          <Card className="bg-slate-900/60 border-slate-800 printable-card">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                EasyAs Software Cost
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-slate-300 font-mono tracking-tight mt-1">
                {formatZarCurrency(summary?.grandTotalCost || 0)}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Vendor license cost payable to EasyAs
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Client Count & Licenses */}
          <Card className="bg-slate-900/60 border-slate-800 printable-card">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs uppercase tracking-wider text-indigo-400 font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                License Allocations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-white font-mono tracking-tight mt-1">
                {summary?.totalLicenses || 0} Licenses
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Spread across {summary?.totalClients || 0} active clients
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Switcher & Search Bar (Screen only) */}
        <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab('clients')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'clients'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Clients & License Calculator ({clients.length})
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'products'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              EasyAs Products Catalog ({products.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'clients' && (
              <>
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search clients or products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-xs bg-slate-900/90 border-slate-800 text-white h-9 rounded-lg"
                  />
                </div>
                <Button
                  onClick={() => handleOpenClientModal()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 px-3 gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  New Client
                </Button>
              </>
            )}

            {activeTab === 'products' && (
              <Button
                onClick={() => handleOpenProductModal()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-9 px-3 gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: CLIENTS & LICENSE ALLOCATIONS                           */}
        {/* ============================================================== */}
        {(activeTab === 'clients' || typeof window === 'undefined') && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                <span>Loading clients and calculating software profits...</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
                <Users className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-200">
                  {searchTerm ? 'No clients match search' : 'No clients created yet'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Create your first client, allocate EasyAs license quantities, and let Lunar Calc compute your exact profit markup.
                </p>
                <Button
                  onClick={() => handleOpenClientModal()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add First Client
                </Button>
              </div>
            ) : (
              filteredClients.map((client) => {
                const isExpanded = expandedClients[client.id] ?? true;
                return (
                  <Card
                    key={client.id}
                    className="bg-slate-900/70 border-slate-800/90 shadow-md overflow-hidden transition-all printable-card"
                  >
                    {/* Client Header Card */}
                    <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 bg-slate-950/40">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleClientExpand(client.id)}
                          className="no-print text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
                          title="Toggle collapse"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-700/40 flex items-center justify-center text-indigo-300 font-bold shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-sm sm:text-base tracking-tight">
                              {client.name}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase font-mono ${
                                client.status === 'active'
                                  ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30'
                                  : 'border-slate-700 text-slate-400 bg-slate-900'
                              }`}
                            >
                              {client.status}
                            </Badge>
                          </div>

                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3 mt-0.5 font-mono">
                            {client.contact_person && <span>👤 {client.contact_person}</span>}
                            {client.email && <span>✉️ {client.email}</span>}
                            {client.phone && <span>📞 {client.phone}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Client Subtotal Badges */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <div className="text-right">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                            Client Total
                          </span>
                          <span className="font-bold text-sm text-cyan-300 font-mono">
                            {formatZarCurrency(client.totals.totalSelling)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                            EasyAs Cost
                          </span>
                          <span className="font-bold text-sm text-slate-400 font-mono">
                            {formatZarCurrency(client.totals.totalCost)}
                          </span>
                        </div>

                        <div className="text-right bg-emerald-950/50 border border-emerald-500/30 px-3 py-1 rounded-xl">
                          <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">
                            Profit for Me
                          </span>
                          <span className="font-extrabold text-sm text-emerald-300 font-mono">
                            {formatZarCurrency(client.totals.totalProfit)}
                          </span>
                        </div>

                        {/* Actions (Screen only) */}
                        <div className="no-print flex items-center gap-1 border-l border-slate-800 pl-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenAddItemModal(client.id)}
                            className="text-xs h-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 px-2"
                            title="Add software license to this client"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Add License
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenClientModal(client)}
                            className="text-xs h-8 text-slate-400 hover:text-white px-2"
                            title="Edit client info"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClient(client.id, client.name)}
                            className="text-xs h-8 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2"
                            title="Delete client"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* License Line Items Table */}
                    {isExpanded && (
                      <CardContent className="p-0">
                        {client.items.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                            <Package className="w-6 h-6 text-slate-600 mx-auto" />
                            <p>No software licenses allocated to {client.name} yet.</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAddItemModal(client.id)}
                              className="text-xs h-7 text-emerald-400 border-emerald-500/30 bg-emerald-950/20"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Allocate First License
                            </Button>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-950/60 text-[10px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800/60">
                                <tr>
                                  <th className="py-2.5 px-4">Software Product</th>
                                  <th className="py-2.5 px-3">Billing Cycle</th>
                                  <th className="py-2.5 px-3 text-center">Qty (Lic)</th>
                                  <th className="py-2.5 px-3 text-right">EasyAs Cost</th>
                                  <th className="py-2.5 px-3 text-right">Client Selling</th>
                                  <th className="py-2.5 px-3 text-right">Total Cost</th>
                                  <th className="py-2.5 px-3 text-right">Total Selling</th>
                                  <th className="py-2.5 px-4 text-right text-emerald-400">
                                    Profit Difference
                                  </th>
                                  <th className="no-print py-2.5 px-3 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/40">
                                {client.items.map((item) => (
                                  <tr
                                    key={item.id}
                                    className="hover:bg-slate-800/30 transition-colors"
                                  >
                                    <td className="py-2.5 px-4 font-medium text-slate-200">
                                      <div className="flex items-center gap-2">
                                        <Package className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                        <span>{item.product_name}</span>
                                        {item.product_code && (
                                          <span className="text-[10px] font-mono text-slate-500">
                                            [{item.product_code}]
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    <td className="py-2.5 px-3 capitalize text-slate-400">
                                      {item.billing_cycle.replace('_', ' ')}
                                    </td>

                                    <td className="py-2.5 px-3 text-center font-mono font-bold text-white bg-slate-950/30">
                                      {item.quantity}
                                    </td>

                                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                                      {formatZarCurrency(item.cost_price)}
                                    </td>

                                    <td className="py-2.5 px-3 text-right font-mono text-cyan-300">
                                      {formatZarCurrency(item.selling_price)}
                                    </td>

                                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                                      {formatZarCurrency(item.total_cost)}
                                    </td>

                                    <td className="py-2.5 px-3 text-right font-mono text-white font-semibold">
                                      {formatZarCurrency(item.total_selling)}
                                    </td>

                                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-300 bg-emerald-950/10">
                                      +{formatZarCurrency(item.total_profit)}
                                      <span className="block text-[10px] text-emerald-400/80 font-normal">
                                        ({item.profit_margin_pct}%)
                                      </span>
                                    </td>

                                    <td className="no-print py-2.5 px-3 text-center">
                                      <button
                                        onClick={() =>
                                          handleDeleteItem(
                                            client.id,
                                            item.id,
                                            item.product_name
                                          )
                                        }
                                        className="text-slate-500 hover:text-rose-400 transition p-1"
                                        title="Remove license item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: EASYAS PRODUCTS CATALOG                                 */}
        {/* ============================================================== */}
        {activeTab === 'products' && (
          <Card className="bg-slate-900/70 border-slate-800 shadow-md">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-400" />
                    Software Products & Base Pricing (EasyAs)
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure vendor cost price from EasyAs and standard selling price to clients.
                  </p>
                </div>
                <Button
                  onClick={() => handleOpenProductModal()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {products.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                  <Package className="w-8 h-8 text-slate-600 mx-auto" />
                  <p>No software products defined yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/60 text-[10px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Product Name & SKU</th>
                        <th className="py-3 px-4">Billing Cycle</th>
                        <th className="py-3 px-4 text-right">EasyAs Cost (ZAR)</th>
                        <th className="py-3 px-4 text-right">Client Selling (ZAR)</th>
                        <th className="py-3 px-4 text-right text-emerald-400">
                          Unit Profit (Difference)
                        </th>
                        <th className="py-3 px-4 text-center">Markup Margin</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-100">{p.name}</div>
                            {p.code && (
                              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                                SKU: {p.code}
                              </div>
                            )}
                            {p.description && (
                              <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                {p.description}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 capitalize text-slate-300">
                            <Badge variant="outline" className="text-[10px] border-slate-700 font-mono">
                              {p.billing_cycle.replace('_', ' ')}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            {formatZarCurrency(p.cost_price)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            {formatZarCurrency(p.selling_price)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-300 bg-emerald-950/10">
                            +{formatZarCurrency(p.unit_profit)}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                              {p.profit_margin_pct}%
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenProductModal(p)}
                                className="text-xs h-7 text-slate-400 hover:text-white px-2"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                className="text-xs h-7 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: CREATE / EDIT CLIENT                                  */}
      {/* ============================================================== */}
      <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              {editingClient ? 'Edit Client Details' : 'Create New Client'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveClient} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Client / Business Name *
              </label>
              <Input
                required
                placeholder="e.g. Outeniqua Farm Bistro"
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Contact Person
              </label>
              <Input
                placeholder="e.g. Johan van der Merwe"
                value={clientForm.contact_person}
                onChange={(e) =>
                  setClientForm({ ...clientForm, contact_person: e.target.value })
                }
                className="bg-slate-950 border-slate-800 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="orders@bistro.co.za"
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Phone / Mobile
                </label>
                <Input
                  placeholder="+27 44 874 1234"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">Status</label>
              <select
                value={clientForm.status}
                onChange={(e) =>
                  setClientForm({ ...clientForm, status: e.target.value as any })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-md text-xs text-white px-3 py-2"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">Notes</label>
              <Input
                placeholder="Internal notes, branches or till locations..."
                value={clientForm.notes}
                onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs text-white"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsClientModalOpen(false)}
                className="border-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
              >
                {isSubmitting ? 'Saving...' : 'Save Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL 2: CREATE / EDIT PRODUCT                                 */}
      {/* ============================================================== */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              {editingProduct ? 'Edit Software Product' : 'Add Software Product'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Product Name *
              </label>
              <Input
                required
                placeholder="e.g. EasyAs POS Base License"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Product Code / SKU
                </label>
                <Input
                  placeholder="EA-POS-BASE"
                  value={productForm.code}
                  onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Billing Cycle
                </label>
                <select
                  value={productForm.billing_cycle}
                  onChange={(e) =>
                    setProductForm({ ...productForm, billing_cycle: e.target.value as any })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-md text-xs text-white px-3 py-2"
                >
                  <option value="monthly">Monthly</option>
                  <option value="annually">Annually</option>
                  <option value="once_off">Once-Off</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-amber-400 font-semibold block mb-1">
                  Cost Price from EasyAs (R)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={productForm.cost_price ?? ''}
                  onChange={(e) =>
                    setProductForm({ ...productForm, cost_price: e.target.value })
                  }
                  className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Enter 0 for zero-cost services, setup or internal labor.
                </span>
              </div>

              <div>
                <label className="text-xs text-cyan-400 font-semibold block mb-1">
                  Selling Price to Client (R) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="550.00"
                  value={productForm.selling_price ?? ''}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      selling_price: e.target.value,
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Live Profit Preview */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2.5 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold">Unit Profit Difference:</span>
              <span className="font-mono font-bold text-emerald-300">
                {formatZarCurrency(
                  Math.max(
                    0,
                    (Number(productForm.selling_price) || 0) -
                      (Number(productForm.cost_price) || 0)
                  )
                )}
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Description
              </label>
              <Input
                placeholder="License details, terminal requirements..."
                value={productForm.description}
                onChange={(e) =>
                  setProductForm({ ...productForm, description: e.target.value })
                }
                className="bg-slate-950 border-slate-800 text-xs text-white"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsProductModalOpen(false)}
                className="border-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
              >
                {isSubmitting ? 'Saving...' : 'Save Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL 3: ALLOCATE LICENSE (ITEM) TO CLIENT                     */}
      {/* ============================================================== */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" />
              Allocate Software License to Client
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveItem} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Select EasyAs Product *
              </label>
              <select
                required
                value={itemForm.product_id}
                onChange={(e) => setItemForm({ ...itemForm, product_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-md text-xs text-white px-3 py-2"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatZarCurrency(p.selling_price)} / unit)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                License Quantity (Qty) *
              </label>
              <Input
                type="number"
                min="1"
                required
                value={itemForm.quantity}
                onChange={(e) =>
                  setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 1 })
                }
                className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Number of till points, terminals or licenses needed by this client.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">
                  Custom Cost (Optional)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Default EasyAs cost"
                  value={itemForm.custom_cost_price}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, custom_cost_price: e.target.value })
                  }
                  className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">
                  Custom Selling (Optional)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Default selling price"
                  value={itemForm.custom_selling_price}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, custom_selling_price: e.target.value })
                  }
                  className="bg-slate-950 border-slate-800 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Item Notes
              </label>
              <Input
                placeholder="e.g. Front desk till lane 1, bar terminal..."
                value={itemForm.notes}
                onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs text-white"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsItemModalOpen(false)}
                className="border-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
              >
                {isSubmitting ? 'Allocating...' : 'Allocate Licenses'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
