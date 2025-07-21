import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings2, 
  Link, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Check,
  X,
  Plus,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Trash2,
  Edit3,
  Calendar,
  Clock
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [integrations, setIntegrations] = useState([
    { 
      id: "facebook", 
      name: "Facebook", 
      icon: Facebook, 
      connected: true, 
      status: "Active",
      accountName: "Business Page",
      followers: "12.5K",
      lastSync: "2 hours ago",
      permissions: ["Publish posts", "Read insights", "Manage pages"],
      postingEnabled: true,
      autoPost: true,
      optimalTimes: ["9:00 AM", "1:00 PM", "7:00 PM"]
    },
    { 
      id: "instagram", 
      name: "Instagram", 
      icon: Instagram, 
      connected: true, 
      status: "Active",
      accountName: "@yourcompany",
      followers: "8.2K",
      lastSync: "1 hour ago",
      permissions: ["Publish posts", "Publish stories", "Read insights"],
      postingEnabled: true,
      autoPost: false,
      optimalTimes: ["11:00 AM", "3:00 PM", "8:00 PM"]
    },
    { 
      id: "twitter", 
      name: "Twitter", 
      icon: Twitter, 
      connected: false, 
      status: "Not Connected",
      accountName: "",
      followers: "",
      lastSync: "",
      permissions: [],
      postingEnabled: false,
      autoPost: false,
      optimalTimes: []
    },
    { 
      id: "linkedin", 
      name: "LinkedIn", 
      icon: Linkedin, 
      connected: true, 
      status: "Limited Access",
      accountName: "Company Page",
      followers: "3.1K",
      lastSync: "5 hours ago",
      permissions: ["Publish posts"],
      postingEnabled: true,
      autoPost: true,
      optimalTimes: ["8:00 AM", "12:00 PM", "5:00 PM"]
    },
    { 
      id: "youtube", 
      name: "YouTube", 
      icon: Youtube, 
      connected: false, 
      status: "Not Connected",
      accountName: "",
      followers: "",
      lastSync: "",
      permissions: [],
      postingEnabled: false,
      autoPost: false,
      optimalTimes: []
    },
    { 
      id: "tiktok", 
      name: "TikTok", 
      icon: Settings2, 
      connected: false, 
      status: "Not Connected",
      accountName: "",
      followers: "",
      lastSync: "",
      permissions: [],
      postingEnabled: false,
      autoPost: false,
      optimalTimes: []
    }
  ]);

  const connectPlatform = async (id: string) => {
    setIsConnecting(true);
    // Simulate API call
    setTimeout(() => {
      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === id 
            ? { 
                ...integration, 
                connected: true, 
                status: "Active",
                accountName: `Connected Account`,
                followers: "1.2K",
                lastSync: "Just now",
                permissions: ["Publish posts", "Read insights"]
              }
            : integration
        )
      );
      setIsConnecting(false);
      toast({
        title: "Platform Connected",
        description: `Successfully connected to ${integrations.find(i => i.id === id)?.name}`,
      });
    }, 2000);
  };

  const disconnectPlatform = (id: string) => {
    setIntegrations(prev => 
      prev.map(integration => 
        integration.id === id 
          ? { 
              ...integration, 
              connected: false, 
              status: "Not Connected",
              accountName: "",
              followers: "",
              lastSync: "",
              permissions: [],
              postingEnabled: false,
              autoPost: false
            }
          : integration
      )
    );
    toast({
      title: "Platform Disconnected",
      description: `Disconnected from ${integrations.find(i => i.id === id)?.name}`,
    });
  };

  const toggleAutoPost = (id: string) => {
    setIntegrations(prev => 
      prev.map(integration => 
        integration.id === id 
          ? { ...integration, autoPost: !integration.autoPost }
          : integration
      )
    );
  };

  const togglePosting = (id: string) => {
    setIntegrations(prev => 
      prev.map(integration => 
        integration.id === id 
          ? { ...integration, postingEnabled: !integration.postingEnabled }
          : integration
      )
    );
  };

  const refreshConnection = async (id: string) => {
    setIntegrations(prev => 
      prev.map(integration => 
        integration.id === id 
          ? { ...integration, lastSync: "Just now" }
          : integration
      )
    );
    toast({
      title: "Connection Refreshed",
      description: "Platform connection has been refreshed",
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your account, integrations, and preferences.
        </p>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Platform Integrations
                <Badge variant="outline" className="text-xs">
                  {integrations.filter(i => i.connected).length} of {integrations.length} connected
                </Badge>
              </CardTitle>
              <CardDescription>
                Connect and manage your social media platforms for content distribution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {integrations.map((integration) => {
                  const IconComponent = integration.icon;
                  return (
                    <Card key={integration.id} className="relative">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                              <IconComponent className="h-6 w-6 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{integration.name}</h3>
                                <Badge 
                                  variant={
                                    integration.status === "Active" ? "default" : 
                                    integration.status === "Limited Access" ? "secondary" : 
                                    "outline"
                                  }
                                  className="text-xs"
                                >
                                  {integration.status}
                                </Badge>
                              </div>
                              {integration.connected ? (
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-muted-foreground">
                                    {integration.accountName} • {integration.followers} followers
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Last sync: {integration.lastSync}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  Connect your {integration.name} account to start posting
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {integration.connected && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => refreshConnection(integration.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <Edit3 className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                      <DialogTitle>Manage {integration.name} Integration</DialogTitle>
                                      <DialogDescription>
                                        Configure posting settings and permissions for your {integration.name} account.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-6 py-4">
                                      <div className="space-y-4">
                                        <h4 className="text-sm font-medium">Account Details</h4>
                                        <div className="rounded-lg border p-3 space-y-2">
                                          <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">Account:</span>
                                            <span className="text-sm font-medium">{integration.accountName}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">Followers:</span>
                                            <span className="text-sm font-medium">{integration.followers}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">Last Sync:</span>
                                            <span className="text-sm font-medium">{integration.lastSync}</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-4">
                                        <h4 className="text-sm font-medium">Posting Settings</h4>
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <p className="text-sm font-medium">Enable Posting</p>
                                              <p className="text-xs text-muted-foreground">Allow content to be posted to this platform</p>
                                            </div>
                                            <Switch 
                                              checked={integration.postingEnabled}
                                              onCheckedChange={() => togglePosting(integration.id)}
                                            />
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <p className="text-sm font-medium">Auto-Post</p>
                                              <p className="text-xs text-muted-foreground">Automatically post at optimal times</p>
                                            </div>
                                            <Switch 
                                              checked={integration.autoPost}
                                              onCheckedChange={() => toggleAutoPost(integration.id)}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-4">
                                        <h4 className="text-sm font-medium">Optimal Posting Times</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                          {integration.optimalTimes.map((time, index) => (
                                            <Badge key={index} variant="secondary" className="justify-center">
                                              <Clock className="h-3 w-3 mr-1" />
                                              {time}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-4">
                                        <h4 className="text-sm font-medium">Permissions</h4>
                                        <div className="space-y-2">
                                          {integration.permissions.map((permission, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                              <Check className="h-4 w-4 text-green-500" />
                                              <span className="text-sm">{permission}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      
                                      <div className="flex gap-2 pt-4 border-t">
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => disconnectPlatform(integration.id)}
                                          className="flex-1"
                                        >
                                          <X className="h-4 w-4 mr-2" />
                                          Disconnect
                                        </Button>
                                        <Button variant="outline" size="sm" className="flex-1">
                                          <ExternalLink className="h-4 w-4 mr-2" />
                                          Manage on {integration.name}
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </>
                            )}
                            
                            {integration.connected ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => disconnectPlatform(integration.id)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Disconnect
                              </Button>
                            ) : (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => connectPlatform(integration.id)}
                                disabled={isConnecting}
                              >
                                {isConnecting ? (
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Plus className="h-4 w-4 mr-2" />
                                )}
                                Connect
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {integration.connected && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Posting:</span>
                                  <Badge variant={integration.postingEnabled ? "default" : "secondary"} className="text-xs">
                                    {integration.postingEnabled ? "Enabled" : "Disabled"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Auto-Post:</span>
                                  <Badge variant={integration.autoPost ? "default" : "secondary"} className="text-xs">
                                    {integration.autoPost ? "On" : "Off"}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span className="text-xs">{integration.optimalTimes.length} optimal times set</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Manage your account details and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="Enter first name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Enter last name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Enter email address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" placeholder="Enter company name" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about important events.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Post Scheduling Reminders</p>
                  <p className="text-sm text-muted-foreground">Get notified before posts go live</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly Analytics Reports</p>
                  <p className="text-sm text-muted-foreground">Receive performance summaries</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize the look and feel of your workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Switch to dark theme</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Compact View</p>
                  <p className="text-sm text-muted-foreground">Use smaller spacing and components</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}