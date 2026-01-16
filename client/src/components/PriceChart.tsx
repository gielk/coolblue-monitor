import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PricePoint {
  recordedAt: Date | string;
  originalPrice?: number | null;
  tweedeKansPrice?: number | null;
  tweedeKansAvailable: boolean | null;
}

interface PriceChartProps {
  data: PricePoint[];
  productName: string;
  isLoading?: boolean;
}

export function PriceChart({ data, productName, isLoading }: PriceChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prijs Historie</CardTitle>
          <CardDescription>Laadt...</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="text-slate-500">Laadt prijs gegevens...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prijs Historie</CardTitle>
          <CardDescription>Geen prijs gegevens beschikbaar</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="text-slate-500">Nog geen prijs metingen</div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart
  const chartData = data.map((point) => ({
    time: new Date(point.recordedAt).toLocaleDateString("nl-NL", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    originalPrice: point.originalPrice ? point.originalPrice / 100 : null,
    tweedeKansPrice: point.tweedeKansPrice ? point.tweedeKansPrice / 100 : null,
    tweedeKansAvailable: point.tweedeKansAvailable,
  }));

  // Calculate min and max for better Y-axis scaling
  const allPrices = chartData
    .flatMap((d) => [d.originalPrice, d.tweedeKansPrice])
    .filter((p) => p !== null) as number[];

  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const padding = (maxPrice - minPrice) * 0.1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prijs Historie</CardTitle>
        <CardDescription>Prijs ontwikkeling van {productName}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              style={{ fontSize: "12px" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#64748b"
              style={{ fontSize: "12px" }}
              domain={[Math.max(0, minPrice - padding), maxPrice + padding]}
              label={{ value: "Prijs (€)", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              formatter={(value) => (typeof value === "number" ? `€${value.toFixed(2)}` : "N/A")}
              labelFormatter={(label) => `Datum: ${label}`}
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #475569",
                borderRadius: "6px",
                color: "#f1f5f9",
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="originalPrice"
              stroke="#0066ff"
              strokeWidth={2}
              dot={{ fill: "#0066ff", r: 4 }}
              activeDot={{ r: 6 }}
              name="Normale Prijs"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="tweedeKansPrice"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", r: 4 }}
              activeDot={{ r: 6 }}
              name="Tweede Kans Prijs"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-600 font-semibold">Laagste Prijs</div>
            <div className="text-lg font-bold text-slate-900">
              €{Math.min(...allPrices).toFixed(2)}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-600 font-semibold">Hoogste Prijs</div>
            <div className="text-lg font-bold text-slate-900">
              €{Math.max(...allPrices).toFixed(2)}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-600 font-semibold">Metingen</div>
            <div className="text-lg font-bold text-slate-900">{chartData.length}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
