import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Trash2, Edit2, RefreshCw, Plus, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    productUrl: "",
    userEmail: "",
    checkIntervalMinutes: 60,
  });

  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.products.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const addMutation = trpc.products.add.useMutation({
    onSuccess: () => {
      toast.success("Product toegevoegd!");
      utils.products.list.invalidate();
      setEditFormData({ productUrl: "", userEmail: "", checkIntervalMinutes: 60 });
    },
    onError: (error) => {
      toast.error(`Fout: ${error.message}`);
    },
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Product bijgewerkt!");
      utils.products.list.invalidate();
      setEditingProduct(null);
    },
    onError: (error) => {
      toast.error(`Fout: ${error.message}`);
    },
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product verwijderd!");
      utils.products.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Fout: ${error.message}`);
    },
  });

  const refreshMutation = trpc.products.refreshStatus.useMutation({
    onSuccess: (result) => {
      toast.success(`Status bijgewerkt! Tweede Kans: ${result.data.tweedeKansAvailable ? "Beschikbaar" : "Niet beschikbaar"}`);
      utils.products.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Fout bij vernieuwen: ${error.message}`);
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Niet ingelogd</CardTitle>
            <CardDescription>Je moet ingelogd zijn om het dashboard te bekijken</CardDescription>
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

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({
      productUrl: editFormData.productUrl,
      userEmail: editFormData.userEmail,
      checkIntervalMinutes: editFormData.checkIntervalMinutes,
    });
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product.id);
    setEditFormData({
      productUrl: product.productUrl,
      userEmail: product.userEmail,
      checkIntervalMinutes: product.checkIntervalMinutes,
    });
  };

  const handleSaveEdit = () => {
    if (editingProduct) {
      updateMutation.mutate({
        productId: editingProduct,
        productUrl: editFormData.productUrl,
        userEmail: editFormData.userEmail,
        checkIntervalMinutes: editFormData.checkIntervalMinutes,
      });
    }
  };

  const getStatusBadge = (product: any) => {
    if (product.tweedeKansAvailable) {
      return <Badge className="bg-green-600 hover:bg-green-700">Beschikbaar!</Badge>;
    }
    return <Badge variant="outline">Niet beschikbaar</Badge>;
  };

  const getIntervalLabel = (minutes: number) => {
    if (minutes < 60) return `${minutes} minuten`;
    if (minutes === 60) return "1 uur";
    if (minutes === 120) return "2 uur";
    if (minutes === 1440) return "1 dag";
    return `${Math.floor(minutes / 60)} uur`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user?.name}</span>
            <Button onClick={() => navigate("/settings")} variant="outline" className="gap-2">
              ⚙️ Instellingen
            </Button>
            <Button onClick={() => navigate("/")} variant="outline">
              Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header with Add Button */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Mijn Monitored Producten</h2>
              <p className="text-slate-600 mt-1">Beheer en volg je Coolblue producten</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                  <Plus className="w-4 h-4" />
                  Product Toevoegen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nieuw Product Toevoegen</DialogTitle>
                  <DialogDescription>
                    Voeg een Coolblue product toe om te monitoren op Tweede Kans beschikbaarheid
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div>
                    <Label htmlFor="url">Product URL</Label>
                    <Input
                      id="url"
                      placeholder="https://www.coolblue.nl/product/..."
                      value={editFormData.productUrl}
                      onChange={(e) => setEditFormData({ ...editFormData, productUrl: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mailadres</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jouw@email.com"
                      value={editFormData.userEmail}
                      onChange={(e) => setEditFormData({ ...editFormData, userEmail: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="interval">Controle-interval</Label>
                    <Select
                      value={editFormData.checkIntervalMinutes.toString()}
                      onValueChange={(value) =>
                        setEditFormData({ ...editFormData, checkIntervalMinutes: parseInt(value) })
                      }
                    >
                      <SelectTrigger id="interval">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minuten</SelectItem>
                        <SelectItem value="30">30 minuten</SelectItem>
                        <SelectItem value="60">1 uur</SelectItem>
                        <SelectItem value="120">2 uur</SelectItem>
                        <SelectItem value="1440">1 dag</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={addMutation.isPending}>
                    {addMutation.isPending ? "Toevoegen..." : "Product Toevoegen"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="border-slate-200 hover:shadow-lg transition-shadow flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">{product.productName || "Product"}</CardTitle>
                        <CardDescription className="text-xs mt-1 line-clamp-1">{product.productUrl}</CardDescription>
                      </div>
                      {getStatusBadge(product)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1">
                    {/* Product Image */}
                    {product.productImage && (
                      <img
                        src={product.productImage}
                        alt={product.productName || "Product"}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    )}

                    {/* Prices */}
                    <div className="space-y-2">
                      {product.originalPrice && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Normale prijs:</span>
                          <span className="font-semibold">€{(product.originalPrice / 100).toFixed(2)}</span>
                        </div>
                      )}
                      {product.tweedeKansPrice && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Tweede Kans prijs:</span>
                          <span className="font-bold text-green-600">€{(product.tweedeKansPrice / 100).toFixed(2)}</span>
                        </div>
                      )}
                      {product.originalPrice && product.tweedeKansPrice && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Besparing:</span>
                          <span className="font-semibold text-green-600">
                            {Math.round(((product.originalPrice - product.tweedeKansPrice) / product.originalPrice) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status Info */}
                    <div className="space-y-2 border-t border-slate-200 pt-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-4 h-4" />
                        <span>Interval: {getIntervalLabel(product.checkIntervalMinutes)}</span>
                      </div>
                      {product.lastCheckedAt && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Laatst gecontroleerd: {new Date(product.lastCheckedAt).toLocaleString("nl-NL")}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-slate-200">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => refreshMutation.mutate({ productId: product.id })}
                        disabled={refreshMutation.isPending}
                      >
                        <RefreshCw className="w-4 h-4" />
                        Vernieuwen
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit2 className="w-4 h-4" />
                            Bewerk
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Product Bewerken</DialogTitle>
                            <DialogDescription>Pas de instellingen van dit product aan</DialogDescription>
                          </DialogHeader>
                          <form className="space-y-4">
                            <div>
                              <Label htmlFor="edit-url">Product URL</Label>
                              <Input
                                id="edit-url"
                                value={editFormData.productUrl}
                                onChange={(e) => setEditFormData({ ...editFormData, productUrl: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-email">E-mailadres</Label>
                              <Input
                                id="edit-email"
                                type="email"
                                value={editFormData.userEmail}
                                onChange={(e) => setEditFormData({ ...editFormData, userEmail: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-interval">Controle-interval</Label>
                              <Select
                                value={editFormData.checkIntervalMinutes.toString()}
                                onValueChange={(value) =>
                                  setEditFormData({ ...editFormData, checkIntervalMinutes: parseInt(value) })
                                }
                              >
                                <SelectTrigger id="edit-interval">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="15">15 minuten</SelectItem>
                                  <SelectItem value="30">30 minuten</SelectItem>
                                  <SelectItem value="60">1 uur</SelectItem>
                                  <SelectItem value="120">2 uur</SelectItem>
                                  <SelectItem value="1440">1 dag</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              type="button"
                              className="w-full bg-blue-600 hover:bg-blue-700"
                              onClick={handleSaveEdit}
                              disabled={updateMutation.isPending}
                            >
                              {updateMutation.isPending ? "Opslaan..." : "Wijzigingen Opslaan"}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 gap-2"
                        onClick={() => deleteMutation.mutate({ productId: product.id })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                        Verwijder
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-slate-200">
              <CardContent className="pt-12 text-center">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Geen producten gevonden</h3>
                <p className="text-slate-600 mb-6">Voeg je eerste product toe om te beginnen met monitoren</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                      <Plus className="w-4 h-4" />
                      Product Toevoegen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nieuw Product Toevoegen</DialogTitle>
                      <DialogDescription>
                        Voeg een Coolblue product toe om te monitoren op Tweede Kans beschikbaarheid
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddProduct} className="space-y-4">
                      <div>
                        <Label htmlFor="url">Product URL</Label>
                        <Input
                          id="url"
                          placeholder="https://www.coolblue.nl/product/..."
                          value={editFormData.productUrl}
                          onChange={(e) => setEditFormData({ ...editFormData, productUrl: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">E-mailadres</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="jouw@email.com"
                          value={editFormData.userEmail}
                          onChange={(e) => setEditFormData({ ...editFormData, userEmail: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="interval">Controle-interval</Label>
                        <Select
                          value={editFormData.checkIntervalMinutes.toString()}
                          onValueChange={(value) =>
                            setEditFormData({ ...editFormData, checkIntervalMinutes: parseInt(value) })
                          }
                        >
                          <SelectTrigger id="interval">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minuten</SelectItem>
                            <SelectItem value="30">30 minuten</SelectItem>
                            <SelectItem value="60">1 uur</SelectItem>
                            <SelectItem value="120">2 uur</SelectItem>
                            <SelectItem value="1440">1 dag</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={addMutation.isPending}>
                        {addMutation.isPending ? "Toevoegen..." : "Product Toevoegen"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
