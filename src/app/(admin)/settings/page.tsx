'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Palette,
  Globe,
  Mail,
  Shield,
  Upload,
  Check,
  Sparkles,
  AlertCircle,
  Building,
  Phone,
  FileText,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';

const PRESET_PALETTES = [
  { name: 'Indigo & Cyan (Default)', primary: '#4f46e5', accent: '#06b6d4' },
  { name: 'Emerald & Gold', primary: '#059669', accent: '#f59e0b' },
  { name: 'Royal Blue & Sky', primary: '#2563eb', accent: '#38bdf8' },
  { name: 'Crimson & Coral', primary: '#dc2626', accent: '#fb7185' },
  { name: 'Violet & Fuchsia', primary: '#7c3aed', accent: '#d946ef' },
  { name: 'Dark Slate & Amber', primary: '#334155', accent: '#f59e0b' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'branding' | 'details' | 'email' | 'domain' | 'security'>('branding');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Branding State
  const [orgName, setOrgName] = useState('Lunar POS George');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [accentColor, setAccentColor] = useState('#06b6d4');
  const [customDomain, setCustomDomain] = useState('');

  // Business Details State
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [companyRegNumber, setCompanyRegNumber] = useState('');

  // Email Customization State
  const [replyTo, setReplyTo] = useState('admin@lunarposgeorge.co.za');
  const [footerText, setFooterText] = useState(
    'Lunar Sign - Electronic Signatures compliant with South African ECTA 25 of 2002.'
  );

  // Security & Retention State
  const [enforce2FA, setEnforce2FA] = useState(true);
  const [retentionDays, setRetentionDays] = useState('365');
  const [purgeDraftsDays, setPurgeDraftsDays] = useState('30');

  // Load existing business settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          const s = data.settings;
          if (s) {
            if (s.name) setOrgName(s.name);
            if (s.logo_url) setLogoUrl(s.logo_url);
            if (s.primary_color) setPrimaryColor(s.primary_color);
            if (s.accent_color) setAccentColor(s.accent_color);
            if (s.custom_domain) setCustomDomain(s.custom_domain);
            if (s.phone) setPhone(s.phone);
            if (s.address) setAddress(s.address);
            if (s.vat_number) setVatNumber(s.vat_number);
            if (s.company_reg_number) setCompanyRegNumber(s.company_reg_number);
            if (s.reply_to_email) setReplyTo(s.reply_to_email);
            if (s.email_footer_text) setFooterText(s.email_footer_text);
            if (s.retention_days) setRetentionDays(String(s.retention_days));
            if (s.purge_voided_drafts_days) setPurgeDraftsDays(String(s.purge_voided_drafts_days));

            // Apply brand colors to runtime styles
            if (s.primary_color) document.documentElement.style.setProperty('--brand-primary', s.primary_color);
            if (s.accent_color) document.documentElement.style.setProperty('--brand-accent', s.accent_color);
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo image must be smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoUrl(result);
    };
    reader.readAsDataURL(file);
  };

  // Handle Save Settings
  const handleSaveSettings = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!orgName.trim() || orgName.trim().length < 2) {
      setErrorMessage('Please provide a valid unique business name.');
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName.trim(),
          logoUrl: logoUrl,
          primaryColor,
          accentColor,
          customDomain: customDomain.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          vatNumber: vatNumber.trim() || null,
          companyRegNumber: companyRegNumber.trim() || null,
          replyToEmail: replyTo.trim() || null,
          emailFooterText: footerText.trim() || null,
          retentionDays,
          purgeVoidedDraftsDays: purgeDraftsDays,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(`Branding and settings for "${orgName.trim()}" saved successfully!`);
        document.documentElement.style.setProperty('--brand-primary', primaryColor);
        document.documentElement.style.setProperty('--brand-accent', accentColor);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setErrorMessage(data.error || 'Failed to save settings');
      }
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setErrorMessage('An unexpected network error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090d16]">
      <AdminHeader
        title="Settings & Organisation Branding"
        subtitle="Manage unique business name, custom theme colors, logo, email templates, and security policies."
        actionButton={
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving || isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold shadow-lg shadow-indigo-600/25"
          >
            {isSaving ? 'Saving Changes...' : 'Save All Settings'}
          </Button>
        }
      />

      <div className="p-6 sm:p-8 space-y-6 max-w-6xl w-full mx-auto">
        {/* Success / Error Alerts */}
        {successMessage && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center justify-between shadow-lg animate-in fade-in-0">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
              ✕
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-red-950/80 border border-red-500/40 text-red-300 rounded-xl text-xs flex items-center justify-between shadow-lg animate-in fade-in-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-200">
              ✕
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Loading organisation settings...</div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="bg-slate-950 border-slate-800 flex-wrap">
              <TabsTrigger value="branding" className="flex items-center gap-2 text-xs">
                <Palette className="w-3.5 h-3.5" /> Brand Identity & Colors
              </TabsTrigger>
              <TabsTrigger value="details" className="flex items-center gap-2 text-xs">
                <Building className="w-3.5 h-3.5" /> Company Information
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2 text-xs">
                <Mail className="w-3.5 h-3.5" /> Email Notification Copy
              </TabsTrigger>
              <TabsTrigger value="domain" className="flex items-center gap-2 text-xs">
                <Globe className="w-3.5 h-3.5" /> Custom Domain
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2 text-xs">
                <Shield className="w-3.5 h-3.5" /> Security & POPIA
              </TabsTrigger>
            </TabsList>

            {/* 1. BRANDING TAB */}
            <TabsContent value="branding" className="space-y-6 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-slate-900/70 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-base text-white">Visual Theme & Identity</CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Customise your unique business name, logo, and brand colors for all envelopes and emails.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Unique Organisation Name */}
                    <div>
                      <Label className="text-slate-300 text-xs font-semibold">Unique Business / Organisation Name *</Label>
                      <Input
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. Lunar POS George"
                        className="mt-1 bg-slate-950 border-slate-700 text-xs text-white"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Must be unique. This name appears on all signing certificates, emails, and header badges.
                      </span>
                    </div>

                    {/* Brand Colors */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-300 text-xs font-semibold">Primary Brand Color</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border border-slate-700 p-1 shrink-0"
                          />
                          <Input
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="bg-slate-950 border-slate-700 text-xs font-mono text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-slate-300 text-xs font-semibold">Accent Color</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border border-slate-700 p-1 shrink-0"
                          />
                          <Input
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            className="bg-slate-950 border-slate-700 text-xs font-mono text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Curated Palette Shortcuts */}
                    <div>
                      <Label className="text-slate-400 text-[11px] mb-2 block">Quick Theme Presets:</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {PRESET_PALETTES.map((p) => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => {
                              setPrimaryColor(p.primary);
                              setAccentColor(p.accent);
                            }}
                            className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-left text-[11px] text-slate-300 flex items-center gap-2 transition-all"
                          >
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.primary }} />
                            <span className="truncate">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Logo Upload */}
                    <div>
                      <Label className="text-slate-300 text-xs font-semibold">Brand Logo (PNG, SVG, JPG)</Label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />

                      {logoUrl ? (
                        <div className="mt-2 p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 p-1 flex items-center justify-center overflow-hidden">
                              <img src={logoUrl} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-white block">Custom Logo Configured</span>
                              <span className="text-[10px] text-emerald-400">Ready to save</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-xs h-8 border-slate-700 text-slate-300"
                            >
                              Change
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setLogoUrl(null)}
                              className="text-xs h-8 text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-1 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-5 text-center bg-slate-950/60 cursor-pointer transition-colors"
                        >
                          <Upload className="w-6 h-6 text-indigo-400 mx-auto mb-1.5" />
                          <span className="text-xs text-slate-300 font-semibold block">Click to Upload Company Logo</span>
                          <span className="text-[10px] text-slate-500">Max size: 2MB • PNG, SVG, or JPEG</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Live Signer Portal Preview Panel */}
                <Card className="bg-slate-900/70 border-slate-800 flex flex-col justify-between">
                  <CardHeader>
                    <CardTitle className="text-base text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" /> Live Signer Portal Preview
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Real-time visual preview of how signers see your brand.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="rounded-2xl border border-slate-700 bg-slate-950 p-6 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2.5">
                          {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-7 h-7 object-contain rounded" />
                          ) : (
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: primaryColor }}
                            >
                              🌕
                            </div>
                          )}
                          <span className="text-xs font-bold text-white truncate max-w-[200px]">{orgName}</span>
                        </div>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                        >
                          Signer Mode
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-200">Standard Service Level Agreement</div>
                        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                          Please review and apply your electronic signature in the designated box.
                        </div>
                      </div>

                      <button
                        type="button"
                        style={{ backgroundColor: primaryColor }}
                        className="w-full py-2.5 rounded-lg text-xs font-bold text-white shadow-md transition-opacity hover:opacity-90"
                      >
                        Sign & Submit Document
                      </button>

                      <div className="text-[10px] text-slate-500 text-center pt-1 border-t border-slate-900">
                        {footerText}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 2. COMPANY INFORMATION TAB */}
            <TabsContent value="details" className="space-y-6 pt-4">
              <Card className="bg-slate-900/70 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base text-white">Business Registration & Legal Details</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Official company details printed on ECTA signature certificates and audit documents.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300 text-xs">VAT Registration Number (Optional)</Label>
                      <Input
                        value={vatNumber}
                        onChange={(e) => setVatNumber(e.target.value)}
                        placeholder="e.g. 4010203040"
                        className="mt-1 bg-slate-950 border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 text-xs">Company Registration Number (CIPC)</Label>
                      <Input
                        value={companyRegNumber}
                        onChange={(e) => setCompanyRegNumber(e.target.value)}
                        placeholder="e.g. 2024/123456/07"
                        className="mt-1 bg-slate-950 border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300 text-xs">Official Contact Phone</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +27 44 874 1234"
                        className="mt-1 bg-slate-950 border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 text-xs">Physical / Registered Business Address</Label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. 123 York Street, George, Western Cape"
                        className="mt-1 bg-slate-950 border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 3. EMAIL COPY TAB */}
            <TabsContent value="email" className="space-y-6 pt-4">
              <Card className="bg-slate-900/70 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base text-white">Email Notification Settings & Footer</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Configure the reply-to address and legal footer sent to signatories.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-300 text-xs">Reply-To Email Address</Label>
                    <Input
                      type="email"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      placeholder="e.g. support@yourcompany.co.za"
                      className="mt-1 bg-slate-950 border-slate-700 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300 text-xs">Custom Email Footer Legal Notice</Label>
                    <Textarea
                      rows={3}
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      className="mt-1 bg-slate-950 border-slate-700 text-xs text-white"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 4. CUSTOM DOMAIN TAB */}
            <TabsContent value="domain" className="space-y-6 pt-4">
              <Card className="bg-slate-900/70 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base text-white">Custom Subdomain & DNS</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Serve signing links and verification portals on your own company domain.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div>
                    <Label className="text-slate-300 text-xs">Custom Signing Domain (Optional)</Label>
                    <Input
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      placeholder="e.g. sign.yourcompany.co.za"
                      className="mt-1 bg-slate-950 border-slate-700 text-xs font-mono text-white"
                    />
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="font-bold text-slate-200">DNS Setup Guide:</div>
                    <p className="text-slate-400">
                      Create a <strong>CNAME</strong> record pointing your subdomain to your deployment host.
                    </p>
                    <div className="grid grid-cols-3 gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Type:</span> CNAME
                      </div>
                      <div>
                        <span className="text-slate-500 block">Host:</span> sign
                      </div>
                      <div>
                        <span className="text-slate-500 block">Target:</span> sign.lunaposgeorge.co.za
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 5. SECURITY & RETENTION TAB */}
            <TabsContent value="security" className="space-y-6 pt-4">
              <Card className="bg-slate-900/70 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base text-white">Security & POPIA Data Retention</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Configure document retention timeframes in compliance with South African POPIA regulations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div>
                      <div className="text-sm font-semibold text-slate-200">Enforce Mandatory Security for Admins</div>
                      <div className="text-xs text-slate-400">Cryptographic session verification on all requests</div>
                    </div>
                    <Switch checked={enforce2FA} onCheckedChange={setEnforce2FA} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <Label className="text-slate-300 text-xs">Executed Document Retention (Days)</Label>
                      <Input
                        type="number"
                        value={retentionDays}
                        onChange={(e) => setRetentionDays(e.target.value)}
                        className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">Default: 365 days (1 year)</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <Label className="text-slate-300 text-xs">Auto-Purge Expired Drafts (Days)</Label>
                      <Input
                        type="number"
                        value={purgeDraftsDays}
                        onChange={(e) => setPurgeDraftsDays(e.target.value)}
                        className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">POPIA data minimization purge</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
