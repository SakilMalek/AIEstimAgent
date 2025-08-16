import { useState } from "react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Eye, 
  Database, 
  Zap,
  Shield,
  Palette,
  Save
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    // Profile Settings
    fullName: "John Constructor",
    email: "john@construction.com",
    company: "ABC Construction LLC",
    phone: "+1 (555) 123-4567",
    
    // Notification Settings
    emailNotifications: true,
    pushNotifications: true,
    takeoffCompleted: true,
    projectUpdates: true,
    
    // Display Settings
    theme: "light",
    language: "en",
    currency: "USD",
    units: "imperial", // imperial or metric
    
    // AI Settings
    autoProcessDrawings: true,
    confidenceThreshold: 0.85,
    aiSuggestions: true,
    
    // Security Settings
    twoFactorAuth: false,
    sessionTimeout: 30, // minutes
  });

  const handleSave = () => {
    // In a real app, this would save to the backend
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const handleReset = () => {
    // Reset to defaults
    setSettings({
      fullName: "John Constructor",
      email: "john@construction.com", 
      company: "ABC Construction LLC",
      phone: "+1 (555) 123-4567",
      emailNotifications: true,
      pushNotifications: true,
      takeoffCompleted: true,
      projectUpdates: true,
      theme: "light",
      language: "en",
      currency: "USD",
      units: "imperial",
      autoProcessDrawings: true,
      confidenceThreshold: 0.85,
      aiSuggestions: true,
      twoFactorAuth: false,
      sessionTimeout: 30,
    });
    
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to defaults.",
    });
  };

  return (
    <Layout>
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <SettingsIcon className="w-6 h-6" />
              Settings
            </h1>
            <p className="text-slate-600 mt-1">Manage your account preferences and application settings</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <Button onClick={handleSave} className="bg-blueprint-600 hover:bg-blueprint-700">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
          
          {/* Catalog Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Product Catalog
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Manage your product SKUs, trade classes, and pricing information.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="font-medium text-slate-900">Trade Classes</p>
                  <p className="text-slate-500">8 classes configured</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="font-medium text-slate-900">Product SKUs</p>
                  <p className="text-slate-500">156+ items available</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg">
                <strong>Note:</strong> Catalog management is now integrated into individual projects. 
                Access pricing and SKU management through the "Pricing" and "SKUs" tabs in any project detail page.
              </div>
            </CardContent>
          </Card>
          
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={settings.fullName}
                  onChange={(e) => setSettings({...settings, fullName: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({...settings, email: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={settings.company}
                  onChange={(e) => setSettings({...settings, company: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={settings.phone}
                  onChange={(e) => setSettings({...settings, phone: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings({...settings, emailNotifications: checked})}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Browser push notifications</p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => setSettings({...settings, pushNotifications: checked})}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Takeoff Completed</Label>
                  <p className="text-sm text-muted-foreground">When AI processing finishes</p>
                </div>
                <Switch
                  checked={settings.takeoffCompleted}
                  onCheckedChange={(checked) => setSettings({...settings, takeoffCompleted: checked})}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Project Updates</Label>
                  <p className="text-sm text-muted-foreground">Changes to your projects</p>
                </div>
                <Switch
                  checked={settings.projectUpdates}
                  onCheckedChange={(checked) => setSettings({...settings, projectUpdates: checked})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Display & Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Theme</Label>
                <Select value={settings.theme} onValueChange={(value) => setSettings({...settings, theme: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Language</Label>
                <Select value={settings.language} onValueChange={(value) => setSettings({...settings, language: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={settings.currency} onValueChange={(value) => setSettings({...settings, currency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="CAD">CAD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Units</Label>
                <Select value={settings.units} onValueChange={(value) => setSettings({...settings, units: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imperial">Imperial (ft, in)</SelectItem>
                    <SelectItem value="metric">Metric (m, cm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* AI & Processing Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                AI & Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Process Drawings</Label>
                  <p className="text-sm text-muted-foreground">Automatically start AI processing on upload</p>
                </div>
                <Switch
                  checked={settings.autoProcessDrawings}
                  onCheckedChange={(checked) => setSettings({...settings, autoProcessDrawings: checked})}
                />
              </div>
              <Separator />
              <div>
                <Label>AI Confidence Threshold</Label>
                <p className="text-sm text-muted-foreground mb-2">Minimum confidence for AI detections (0.1 - 1.0)</p>
                <Input
                  type="number"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={settings.confidenceThreshold}
                  onChange={(e) => setSettings({...settings, confidenceThreshold: parseFloat(e.target.value)})}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>AI Suggestions</Label>
                  <p className="text-sm text-muted-foreground">Show AI-powered cost optimization tips</p>
                </div>
                <Switch
                  checked={settings.aiSuggestions}
                  onCheckedChange={(checked) => setSettings({...settings, aiSuggestions: checked})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                  </div>
                  <Switch
                    checked={settings.twoFactorAuth}
                    onCheckedChange={(checked) => setSettings({...settings, twoFactorAuth: checked})}
                  />
                </div>
                <div>
                  <Label>Session Timeout (minutes)</Label>
                  <p className="text-sm text-muted-foreground mb-2">Auto-logout after inactivity</p>
                  <Select 
                    value={settings.sessionTimeout.toString()} 
                    onValueChange={(value) => setSettings({...settings, sessionTimeout: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="0">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </Layout>
  );
}