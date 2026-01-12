import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Zap, Clock, CheckCircle2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin">
          <Zap className="w-8 h-8 text-blue-600" />
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900">Coolblue Monitor</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">{user.name}</span>
              <Button onClick={() => navigate("/dashboard")} className="bg-blue-600 hover:bg-blue-700">
                Dashboard
              </Button>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Welkom terug!</h2>
            <p className="text-xl text-slate-600 mb-8">
              Je bent ingelogd. Ga naar je dashboard om je monitored producten te beheren.
            </p>
            <Button size="lg" onClick={() => navigate("/dashboard")} className="bg-blue-600 hover:bg-blue-700">
              Naar Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Coolblue Tweede Kans Monitor</h1>
          </div>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <a href={getLoginUrl()}>Inloggen</a>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-5xl font-bold text-slate-900 mb-6">
            Nooit meer een Tweede Kans deal missen
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            Monitor je favoriete Coolblue producten en ontvang instant meldingen wanneer ze beschikbaar zijn in Tweede Kans. 
            Bespaar tot 30% op topproducten.
          </p>
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
            <a href={getLoginUrl()}>Gratis starten</a>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-slate-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <Bell className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle>Instant Meldingen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Ontvang e-mailmeldingen zodra je product in Tweede Kans beschikbaar is
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <Clock className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle>Flexibele Intervallen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Kies je eigen controle-interval: 15 minuten tot 1 dag
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CheckCircle2 className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle>Gedetailleerde Info</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Zie originele prijs, Tweede Kans prijs en directe link naar product
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <Zap className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle>Eenvoudig Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Beheer al je monitored producten op één plek
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-slate-900 text-center mb-12">Hoe het werkt</h3>
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-600 text-white font-bold">
                1
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-900">Voeg een product toe</h4>
              <p className="text-slate-600">
                Plak de Coolblue product link in en voer je e-mailadres in
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-600 text-white font-bold">
                2
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-900">Kies je controle-interval</h4>
              <p className="text-slate-600">
                Selecteer hoe vaak we het product moeten controleren (15 min tot 1 dag)
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-600 text-white font-bold">
                3
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-900">Ontvang meldingen</h4>
              <p className="text-slate-600">
                Zodra het product in Tweede Kans beschikbaar is, ontvang je een e-mail met alle details
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-600 text-white font-bold">
                4
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-900">Bespaar tot 30%</h4>
              <p className="text-slate-600">
                Klik op de link in de e-mail en koop je product met korting
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-center text-white">
          <h3 className="text-3xl font-bold mb-4">Klaar om te beginnen?</h3>
          <p className="text-lg mb-8 opacity-90">
            Meld je aan en begin met het monitoren van je favoriete producten
          </p>
          <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-slate-100">
            <a href={getLoginUrl()}>Gratis Account Aanmaken</a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 backdrop-blur-sm py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-slate-600">
          <p>© 2026 Coolblue Tweede Kans Monitor. Alle rechten voorbehouden.</p>
        </div>
      </footer>
    </div>
  );
}
