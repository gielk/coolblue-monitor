import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Trash2, Edit2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    productUrl: "",
    userEmail: user?.email || "",
    checkIntervalMinutes: "60",
  });

  const { data: products, isLoading, refetch } = trpc.products.list.useQuery();
  const addMutation = trpc.products.add.useMutation();
  const deleteMutation = trpc.products.delete.useMutation();
  const updateMutation = trpc.products.update.useMutation();

  const handleAddProduct = async () => {
    if (!formData.productUrl || !formData.userEmail) {
      toast.error("Vul alstublieft alle velden in");
      return;
    }

    try {
      await addMutation.mutateAsync({
        productUrl: formData.productUrl,
        userEmail: formData.userEmail,
        checkIntervalMinutes: parseInt(formData.checkIntervalMinutes),
      });
      toast.success("Product toegevoegd!");
      setFormData({ productUrl: "", userEmail: user?.email || "", checkIntervalMinutes: "60" });
      setIsAddOpen(false);
      refetch();
    } catch (error) {
      toast.error("Fout bij toevoegen van product");
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      await deleteMutation.mutateAsync({ productId });
      toast.success("Product verwijderd");
      refetch();
    } catch (error) {
      toast.error("Fout bij verwijderen van product");
    }
  };

  const handleToggleActive = async (productId: number, isActive: boolean) => {
    try {
      await updateMutation.mutateAsync({
        productId,
        isActive: !isActive,
      });
      toast.success(isActive ? "Product gepauzeerd" : "Product geactiveerd");
      refetch();
    } catch (error) {
      toast.error("Fout bij bijwerken van product");
    }
  };

  const formatPrice = (cents?: number) => {
    if (!cents) return "-";
    return `€${(cents / 100).toFixed(2)}`;
  };

  const formatInterval = (minutes: number) => {
    if (minutes < 60) return `${minutes} minuten`;
    if (minutes === 60) return "1 uur";
    if (minutes < 1440) return `${Math.floor(minutes / 60)} uur`;
    return `${Math.floor(minutes / 1440)} dagen`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Coolblue Tweede Kans Monitor</h1>
          <p className="text-slate-600">Volg je favoriete producten en ontvang meldingen wanneer ze in Tweede Kans beschikbaar zijn</p>
        </div>

        {/* Add Product Button */}
        <div className="mb-8">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Product toevoegen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nieuw product toevoegen</DialogTitle>
                <DialogDescription>
                  Voeg een Coolblue product link in om te monitoren op Tweede Kans beschikbaarheid
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="url">Product URL</Label>
                  <Input
                    id="url"
                    placeholder="https://www.coolblue.nl/product/..."
                    value={formData.productUrl}
                    onChange={(e) => setFormData({ ...formData, productUrl: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mailadres</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jouw@email.com"
                    value={formData.userEmail}
                    onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="interval">Controle interval</Label>
                  <Select value={formData.checkIntervalMinutes} onValueChange={(value) => setFormData({ ...formData, checkIntervalMinutes: value })}>
                    <SelectTrigger id="interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minuten</SelectItem>
                      <SelectItem value="30">30 minuten</SelectItem>
                      <SelectItem value="60">1 uur</SelectItem>
                      <SelectItem value="120">2 uur</SelectItem>
                      <SelectItem value="240">4 uur</SelectItem>
                      <SelectItem value="1440">1 dag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddProduct} className="w-full" disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Toevoegen..." : "Product toevoegen"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin">
              <RefreshCw className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{product.productName || "Onbekend product"}</CardTitle>
                      <CardDescription className="text-xs mt-1 line-clamp-1">{product.productUrl}</CardDescription>
                    </div>
                    <Badge variant={product.tweedeKansAvailable ? "default" : "secondary"}>
                      {product.tweedeKansAvailable ? "Beschikbaar" : "Niet beschikbaar"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Product Image */}
                  {product.productImage && (
                    <img src={product.productImage} alt={product.productName || "Product"} className="w-full h-40 object-cover rounded-lg" />
                  )}

                  {/* Prices */}
                  <div className="space-y-2">
                    {product.originalPrice && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Normale prijs:</span>
                        <span className="font-semibold">{formatPrice(product.originalPrice)}</span>
                      </div>
                    )}
                    {product.tweedeKansPrice && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Tweede Kans prijs:</span>
                        <span className="font-semibold text-green-600">{formatPrice(product.tweedeKansPrice)}</span>
                      </div>
                    )}
                  </div>

                  {/* Check Interval */}
                  <div className="text-sm text-slate-600">
                    Controle: {formatInterval(product.checkIntervalMinutes)}
                  </div>

                  {/* Last Checked */}
                  {product.lastCheckedAt && (
                    <div className="text-xs text-slate-500">
                      Laatst gecontroleerd: {new Date(product.lastCheckedAt).toLocaleString("nl-NL")}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(product.id, product.isActive)}
                      className="flex-1"
                    >
                      {product.isActive ? "Pauzeren" : "Activeren"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-600 text-center">
                Nog geen producten toegevoegd. Voeg je eerste product toe om te beginnen!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
