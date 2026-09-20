'use client';

import React, { useState } from 'react';
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
  Key,
  Webhook as WebhookIcon,
  Copy,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'branding' | 'email' | 'domain' | 'security'>('branding');

  // Branding State
  const [orgName, setOrgName] = useState('Computer Home Services / LunarPOS George');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [accentColor, setAccentColor] = useState('#06b6d4');
  const [customDomain, setCustomDomain] = useState('sign.lunaposgeorge.co.za');

  // Email Customization State
  const [fromName, setFromName] = useState('Lunar Sign (LunarPOS George)');
  const [replyTo, setReplyTo] = useState('support@lunaposgeorge.co.za');
  const [footerText, setFooterText] = useState(
    'Lunar Sign - Electronic Signatures compliant with South African ECTA 25 of 2002. Powered by Computer Home Services t/a LunarPOS George.'
  );
  const [emailSubjectTemplate, setEmailSubjectTemplate] = useState('Signature Requested: {{document_title}}');

  // Security State
  const [enforce2FA, setEnforce2FA] = useState(true);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState('8');
  const [retentionDays, setRetentionDays] = useState('365');
  const [purgeDraftsDays, setPurgeDraftsDays] = useState('30');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = () => {
    // Apply runtime CSS variables
    document.documentElement.style.setProperty('--primary', primaryColor);
    document.documentElement.style.setProperty('--accent', accentColor);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090d16]">
      <AdminHeader
        title="Settings & Organisation Branding"
        subtitle="Manage white-label themes, custom domains, email templates, and security policies."
        actionButton={
          <Button
            onClick={handleSaveSettings}
            className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold shadow-lg shadow-indigo-600/25"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5" /> Saved Successfully!
              </>
            ) : (
              'Save All Settings'
            )}
          </Button>
        }
      />

      <div className="p-8 space-y-6 max-w-6xl w-full mx-auto">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="bg-slate-950 border-slate-800">
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Palette className="w-4 h-4" /> White-Label Branding
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" /> Email Templates & Copy
            </TabsTrigger>
            <TabsTrigger value="domain" className="flex items-center gap-2">
              <Globe className="w-4 h-4" /> Custom Domain
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" /> Security & Retention
            </TabsTrigger>
          </TabsList>

          {/* 1. BRANDING TAB */}
          <TabsContent value="branding" className="space-y-6 pt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900/70 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base text-white">Visual Theme & Identity</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Customise colours, organisation logos, and public appearance.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-300 text-xs">Organisation Display Name</Label>
                    <Input
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="mt-1 bg-slate-950 border-slate-700 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300 text-xs">Primary Brand Colour</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border border-slate-700 p-1"
                        />
                        <Input
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="bg-slate-950 border-slate-700 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-slate-300 text-xs">Accent Colour</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border border-slate-700 p-1"
                        />
                        <Input
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="bg-slate-950 border-slate-700 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300 text-xs">Brand Logo (SVG / PNG)</Label>
                    <div className="mt-1 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-4 text-center bg-slate-950/60 cursor-pointer">
                      <Upload className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
                      <span className="text-xs text-slate-300 block">Upload Logo</span>
                      <span className="text-[10px] text-slate-500">Displayed on emails and signing portals</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Live Preview Panel */}
              <Card className="bg-slate-900/70 border-slate-800 flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" /> Live Signer Portal Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="rounded-2xl border border-slate-700 bg-slate-950 p-6 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: primaryColor }}
                        >
                          🌕
                        </div>
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
                        Please sign in the designated field below.
                      </div>
                    </div>

                    <button
                      type="button"
                      style={{ backgroundColor: primaryColor }}
                      className="w-full py-2 rounded-lg text-xs font-bold text-white shadow"
                    >
                      Sign & Submit Document
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 2. EMAIL TEMPLATES TAB */}
          <TabsContent value="email" className="space-y-6 pt-4">
            <Card className="bg-slate-900/70 border-slate-800">
              <CardHeader>
                <CardTitle className="text-base text-white">Email Notification Templates & Merge Tags</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Available tags: <code>{'{{recipient_name}}'}</code>, <code>{'{{sender_name}}'}</code>,{' '}
                  <code>{'{{document_title}}'}</code>, <code>{'{{signing_link}}'}</code>, <code>{'{{expiry_date}}'}</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300 text-xs">Sender "From" Name</Label>
                    <Input
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      className="mt-1 bg-slate-950 border-slate-700 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Reply-To Email Address</Label>
                    <Input
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      className="mt-1 bg-slate-950 border-slate-700 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300 text-xs">Default Signature Request Subject Line</Label>
                  <Input
                    value={emailSubjectTemplate}
                    onChange={(e) => setEmailSubjectTemplate(e.target.value)}
                    className="mt-1 bg-slate-950 border-slate-700 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="text-slate-300 text-xs">Custom Email Footer & Company Registration</Label>
                  <Textarea
                    rows={3}
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    className="mt-1 bg-slate-950 border-slate-700 text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. CUSTOM DOMAIN TAB */}
          <TabsContent value="domain" className="space-y-6 pt-4">
            <Card className="bg-slate-900/70 border-slate-800">
              <CardHeader>
                <CardTitle className="text-base text-white">Custom Subdomain & SSL Setup</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Serve signing links and verification portals on your own branded domain.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div>
                  <Label className="text-slate-300 text-xs">Custom Domain</Label>
                  <Input
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="sign.yourcompany.co.za"
                    className="mt-1 bg-slate-950 border-slate-700 text-xs font-mono"
                  />
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="font-bold text-slate-200">DNS Configuration Instructions:</div>
                  <p className="text-slate-400">
                    Create the following <strong>CNAME</strong> record in your DNS provider (e.g. Afrihost, Hetzner/xneelo, Cloudflare):
                  </p>
                  <div className="grid grid-cols-3 gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Type:</span> CNAME
                    </div>
                    <div>
                      <span className="text-slate-500 block">Host:</span> sign
                    </div>
                    <div>
                      <span className="text-slate-500 block">Target / Value:</span> cname.vercel-dns.com
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <Check className="w-4 h-4" /> Automatic SSL Certificate will be provisioned on DNS resolution.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. SECURITY & RETENTION TAB */}
          <TabsContent value="security" className="space-y-6 pt-4">
            <Card className="bg-slate-900/70 border-slate-800">
              <CardHeader>
                <CardTitle className="text-base text-white">Security & POPIA Data Retention Policies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <div className="text-sm font-semibold text-slate-200">Enforce Mandatory TOTP 2FA for Admins</div>
                    <div className="text-xs text-slate-400">Requires authenticator app code on every login</div>
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
                      className="mt-1 bg-slate-900 border-slate-700 text-xs"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Default: 365 days (1 year)</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <Label className="text-slate-300 text-xs">Auto-Purge Voided / Expired Drafts (Days)</Label>
                    <Input
                      type="number"
                      value={purgeDraftsDays}
                      onChange={(e) => setPurgeDraftsDays(e.target.value)}
                      className="mt-1 bg-slate-900 border-slate-700 text-xs"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">POPIA data minimization purge</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
