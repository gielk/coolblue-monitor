import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Mail, Settings as SettingsIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Settings() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [emailMethod, setEmailMethod] = useState<"smtp" | "resend" | "sendgrid">("smtp");
  const [testEmail, setTestEmail] = useState("");

  const utils = trpc.useUtils();
  const { data: emailSettings, isLoading } = trpc.emailSettings.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const updateMutation = trpc.emailSettings.update.useMutation({
    onSuccess: () => {
      toast.success("Email instellingen opgeslagen!");
      utils.emailSettings.get.invalidate();
    },
    onError: (error) => {
      toast.error(`Fout: ${error.message}`);
    },
  });

  const testMutation = trpc.emailSettings.testEmail.useMutation({
    onSuccess: () => {
      toast.success("Test email verzonden!");
    },
    onError: (error) => {
      toast.error(`Fout: ${error.message}`);
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Niet ingelogd</CardTitle>
            <CardDescription>Je moet ingelogd zijn om instellingen te beheren</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Terug naar home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSaveSettings = (settings: any) => {
    updateMutation.mutate(settings);
  };

  const handleTestEmail = () => {
    if (!testEmail) {
      toast.error("Voer een test email adres in");
      return;
    }
    testMutation.mutate({ testEmail });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Instellingen</h1>
          </div>
          <Button onClick={() => navigate("/dashboard")} variant="outline">
            Terug naar Dashboard
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="gap-2">
                <Mail className="w-4 h-4" />
                Email Instellingen
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <AlertCircle className="w-4 h-4" />
                Notificaties
              </TabsTrigger>
            </TabsList>

            {/* Email Settings Tab */}
            <TabsContent value="email" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Email Service Configuratie</CardTitle>
                  <CardDescription>
                    Kies hoe je email notificaties wilt ontvangen
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin inline-block">
                        <AlertCircle className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Email Method Selection */}
                      <div>
                        <Label>Email Service</Label>
                        <Select value={emailMethod} onValueChange={(value: any) => setEmailMethod(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="smtp">SMTP Server</SelectItem>
                            <SelectItem value="resend">Resend API</SelectItem>
                            <SelectItem value="sendgrid">SendGrid API</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* SMTP Configuration */}
                      {emailMethod === "smtp" && (
                        <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <h3 className="font-semibold text-slate-900">SMTP Server Instellingen</h3>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="smtp-host">SMTP Host</Label>
                              <Input
                                id="smtp-host"
                                placeholder="smtp.gmail.com"
                                defaultValue={emailSettings?.smtpHost || ""}
                              />
                            </div>
                            <div>
                              <Label htmlFor="smtp-port">SMTP Port</Label>
                              <Input
                                id="smtp-port"
                                type="number"
                                placeholder="587"
                                defaultValue={emailSettings?.smtpPort || ""}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="smtp-user">SMTP Gebruiker</Label>
                              <Input
                                id="smtp-user"
                                placeholder="jouw@email.com"
                                defaultValue={emailSettings?.smtpUser || ""}
                              />
                            </div>
                            <div>
                              <Label htmlFor="smtp-password">SMTP Wachtwoord</Label>
                              <Input
                                id="smtp-password"
                                type="password"
                                placeholder="••••••••"
                                defaultValue={emailSettings?.smtpPassword || ""}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="from-email">Verzenden van Email</Label>
                              <Input
                                id="from-email"
                                type="email"
                                placeholder="noreply@coolblue-monitor.com"
                                defaultValue={emailSettings?.fromEmail || ""}
                              />
                            </div>
                            <div>
                              <Label htmlFor="from-name">Verzenden van Naam</Label>
                              <Input
                                id="from-name"
                                placeholder="Coolblue Monitor"
                                defaultValue={emailSettings?.fromName || ""}
                              />
                            </div>
                          </div>

                          <Button
                            onClick={() =>
                              handleSaveSettings({
                                smtpHost: (document.getElementById("smtp-host") as HTMLInputElement)?.value,
                                smtpPort: parseInt((document.getElementById("smtp-port") as HTMLInputElement)?.value || "587"),
                                smtpUser: (document.getElementById("smtp-user") as HTMLInputElement)?.value,
                                smtpPassword: (document.getElementById("smtp-password") as HTMLInputElement)?.value,
                                fromEmail: (document.getElementById("from-email") as HTMLInputElement)?.value,
                                fromName: (document.getElementById("from-name") as HTMLInputElement)?.value,
                                useResend: false,
                                useSendGrid: false,
                              })
                            }
                            disabled={updateMutation.isPending}
                            className="w-full"
                          >
                            {updateMutation.isPending ? "Opslaan..." : "SMTP Instellingen Opslaan"}
                          </Button>
                        </div>
                      )}

                      {/* Resend Configuration */}
                      {emailMethod === "resend" && (
                        <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <h3 className="font-semibold text-slate-900">Resend API Instellingen</h3>
                          
                          <div>
                            <Label htmlFor="resend-key">Resend API Key</Label>
                            <Input
                              id="resend-key"
                              type="password"
                              placeholder="re_••••••••••••••••••••••••"
                              defaultValue={emailSettings?.resendApiKey || ""}
                            />
                          </div>

                          <div>
                            <Label htmlFor="resend-email">Verzenden van Email</Label>
                            <Input
                              id="resend-email"
                              type="email"
                              placeholder="noreply@coolblue-monitor.com"
                              defaultValue={emailSettings?.fromEmail || ""}
                            />
                          </div>

                          <Button
                            onClick={() =>
                              handleSaveSettings({
                                resendApiKey: (document.getElementById("resend-key") as HTMLInputElement)?.value,
                                fromEmail: (document.getElementById("resend-email") as HTMLInputElement)?.value,
                                useResend: true,
                                useSendGrid: false,
                              })
                            }
                            disabled={updateMutation.isPending}
                            className="w-full"
                          >
                            {updateMutation.isPending ? "Opslaan..." : "Resend Instellingen Opslaan"}
                          </Button>
                        </div>
                      )}

                      {/* SendGrid Configuration */}
                      {emailMethod === "sendgrid" && (
                        <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <h3 className="font-semibold text-slate-900">SendGrid API Instellingen</h3>
                          
                          <div>
                            <Label htmlFor="sendgrid-key">SendGrid API Key</Label>
                            <Input
                              id="sendgrid-key"
                              type="password"
                              placeholder="SG.••••••••••••••••••••••••"
                              defaultValue={emailSettings?.sendGridApiKey || ""}
                            />
                          </div>

                          <div>
                            <Label htmlFor="sendgrid-email">Verzenden van Email</Label>
                            <Input
                              id="sendgrid-email"
                              type="email"
                              placeholder="noreply@coolblue-monitor.com"
                              defaultValue={emailSettings?.fromEmail || ""}
                            />
                          </div>

                          <Button
                            onClick={() =>
                              handleSaveSettings({
                                sendGridApiKey: (document.getElementById("sendgrid-key") as HTMLInputElement)?.value,
                                fromEmail: (document.getElementById("sendgrid-email") as HTMLInputElement)?.value,
                                useResend: false,
                                useSendGrid: true,
                              })
                            }
                            disabled={updateMutation.isPending}
                            className="w-full"
                          >
                            {updateMutation.isPending ? "Opslaan..." : "SendGrid Instellingen Opslaan"}
                          </Button>
                        </div>
                      )}

                      {/* Test Email */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="font-semibold text-blue-900 mb-4">Test Email Verzenden</h3>
                        <div className="flex gap-2">
                          <Input
                            placeholder="test@example.com"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            type="email"
                          />
                          <Button
                            onClick={handleTestEmail}
                            disabled={testMutation.isPending}
                            variant="outline"
                          >
                            {testMutation.isPending ? "Verzenden..." : "Test"}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notificatie Instellingen</CardTitle>
                  <CardDescription>
                    Beheer hoe je notificaties wilt ontvangen
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin inline-block">
                        <AlertCircle className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <h3 className="font-semibold text-slate-900">Email Notificaties</h3>
                          <p className="text-sm text-slate-600">Ontvang email wanneer Tweede Kans beschikbaar is</p>
                        </div>
                        <Switch
                          checked={emailSettings?.notificationsEnabled ?? true}
                          onCheckedChange={(checked) =>
                            handleSaveSettings({ notificationsEnabled: checked })
                          }
                        />
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg border border-green-200 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-green-900">Tip</h4>
                          <p className="text-sm text-green-800">
                            Zorg ervoor dat je email instellingen correct zijn geconfigureerd om notificaties te ontvangen.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
