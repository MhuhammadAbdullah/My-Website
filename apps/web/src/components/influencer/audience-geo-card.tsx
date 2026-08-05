"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, cn } from "@agency/ui";

// Country and city are the same underlying "audience location" data, just at
// a different `level` — one card with a Country/City filter reads better and
// takes less space than two separate cards showing the same chart shape.
export function AudienceGeoCard({
  countries,
  cities,
  color,
}: {
  countries: { name: string; value: number }[];
  cities: { name: string; value: number }[];
  color: string;
}) {
  const [view, setView] = React.useState<"COUNTRY" | "CITY">(countries.length > 0 ? "COUNTRY" : "CITY");
  const data = view === "COUNTRY" ? countries : cities;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
        <CardTitle className="text-h5">Audience by geolocation</CardTitle>
        <div className="flex gap-0.5 rounded-full border border-neutral-200 p-0.5">
          <button
            type="button"
            onClick={() => setView("COUNTRY")}
            disabled={countries.length === 0}
            className={cn(
              "rounded-full px-2.5 py-1 text-label font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              view === "COUNTRY" ? "bg-heading text-background" : "text-neutral-500 hover:bg-neutral-100",
            )}
          >
            Country
          </button>
          <button
            type="button"
            onClick={() => setView("CITY")}
            disabled={cities.length === 0}
            className={cn(
              "rounded-full px-2.5 py-1 text-label font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              view === "CITY" ? "bg-heading text-background" : "text-neutral-500 hover:bg-neutral-100",
            )}
          >
            City
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {data.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-body-sm text-neutral-400">No data yet.</div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={90} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
