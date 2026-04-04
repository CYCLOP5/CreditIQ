"use client";

import { useState, useEffect } from "react";
import { adminApi } from "@/dib/api";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, DownloadCloud, Activity, LayoutDashboard, Calendar, ArrowUpRight, ArrowDownRight, PackageOpen } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";

interface Profile {
  gstin: string;
  business_name: string;
  profile_type: string;
  state_code: string;
  business_age_months: number;
}

interface TimelinePoint {
  date: string;
  daily_volume?: number;
  daily_count?: number;
  daily_ewb_volume?: number;
  daily_ewb_count?: number;
}

interface Details {
  info: Profile;
  upi_timeline: TimelinePoint[];
  ewb_timeline: TimelinePoint[];
  recent_upi: any[];
  recent_ewb: any[];
}

export default function DataExplorerPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedGstin, setSelectedGstin] = useState<string | null>(null);
  const [details, setDetails] = useState<Details | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    adminApi.getExplorerGstins()
      .then((res) => {
        setProfiles(res);
        setFilteredProfiles(res);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (v: string) => {
    setSearch(v);
    const q = v.toLowerCase();
    setFilteredProfiles(
      profiles.filter(p => p.gstin.toLowerCase().includes(q) || p.business_name.toLowerCase().includes(q) || p.profile_type.toLowerCase().includes(q))
    );
  };

  const loadDetails = async (gstin: string) => {
    setSelectedGstin(gstin);
    setDetailsLoading(true);
    try {
      const res = await adminApi.getExplorerDetails(gstin);
      // Merge timelines roughly by date
      setDetails(res);
    } catch(e) {
      console.error(e);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getProfileColor = (type: string) => {
    if(type.includes("HEALTHY")) return "bg-emerald-500/20 text-emerald-700";
    if(type.includes("STRUGGLING")) return "bg-orange-500/20 text-orange-700";
    if(type.includes("SHELL") || type.includes("FRAUD")) return "bg-red-500/20 text-red-700";
    return "bg-slate-500/20 text-slate-700";
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
      <PageHeader 
        title="Entity Data Explorer 360" 
        description="Raw database view of all generated entities, their transaction logs, and e-way bill behavior."
      />

      {!selectedGstin ? (
        <Card className="shadow-lg border-slate-200">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-slate-400" />
                <CardTitle className="text-xl">GSTIN Directory</CardTitle>
                </div>
                <Input 
                placeholder="Search GSTIN or Name..." 
                value={search} 
                onChange={e => handleSearch(e.target.value)}
                className="max-w-sm"
                />
            </div>
            </CardHeader>
            <CardContent className="p-0">
            {loading ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                   <Activity className="h-8 w-8 mb-4 animate-spin text-indigo-500" />
                   Loading huge directory...
                </div>
            ) : (
                <div className="overflow-x-auto h-[600px] relative">
                <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                        <TableHead className="w-[180px]">GSTIN</TableHead>
                        <TableHead>Business Name</TableHead>
                        <TableHead>Persona Type</TableHead>
                        <TableHead className="text-right">Age (Mo)</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredProfiles.map(p => (
                        <TableRow key={p.gstin} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-mono font-medium text-slate-700">{p.gstin}</TableCell>
                        <TableCell>{p.business_name}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={getProfileColor(p.profile_type)}>
                              {p.profile_type}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-600">{p.business_age_months}</TableCell>
                        <TableCell className="text-right">
                            <Button size="sm" onClick={() => loadDetails(p.gstin)} className="bg-indigo-600 hover:bg-indigo-700">
                                Inspect 360
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                {filteredProfiles.length === 0 && (
                    <div className="p-8 text-center text-slate-500 font-medium">No GSTINs matched your search.</div>
                )}
                </div>
            )}
            </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
           <Button variant="outline" onClick={() => setSelectedGstin(null)} className="mb-4">
             &larr; Back to Directory
           </Button>

           {detailsLoading || !details ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white rounded-xl shadow-lg border border-slate-200">
                  <Activity className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
                  <p className="text-xl font-semibold text-slate-600">Querying petabytes of raw Parquet data...</p>
                  <p className="text-sm text-slate-400 mt-2">Just kidding, duckDB/polars makes it instant.</p>
              </div>
           ) : (
             <>
               <Card className="shadow-lg overflow-hidden border-slate-200">
                 <div className={`h-2 w-full ${details.info.profile_type.includes("FRAUD") || details.info.profile_type.includes("SHELL") ? "bg-red-500" : "bg-emerald-500"}`} />
                 <CardHeader className="bg-slate-50">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl font-bold flex items-center gap-3">
                                {details.info.business_name}
                                <Badge variant="outline" className="font-mono text-sm bg-white border-slate-300">
                                   {details.info.gstin}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="mt-2 text-base text-slate-600">
                                State: <span className="font-semibold text-slate-800">{details.info.state_code}</span> &bull; 
                                Active Age: <span className="font-semibold text-slate-800">{details.info.business_age_months} months</span>
                            </CardDescription>
                        </div>
                        <Badge className={`px-4 py-2 text-sm ${getProfileColor(details.info.profile_type)}`}>
                            {details.info.profile_type}
                        </Badge>
                    </div>
                 </CardHeader>
               </Card>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* UPI Chart */}
                 <Card className="shadow-lg border-slate-200">
                     <CardHeader>
                         <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-indigo-500"/> UPI Volume Trend (Daily INR)</CardTitle>
                     </CardHeader>
                     <CardContent className="h-[300px]">
                        {details.upi_timeline.length === 0 ? (
                           <div className="h-full flex items-center justify-center text-slate-400">No UPI Activity</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={details.upi_timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorUpi" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} minTickGap={30} stroke="#94a3b8"/>
                              <YAxis tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} width={80} tick={{fontSize: 12}} stroke="#94a3b8"/>
                              <Tooltip 
                                formatter={(val: number) => [`₹${val.toLocaleString()}`, "Volume"]}
                                labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              />
                              <Area type="monotone" dataKey="daily_volume" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorUpi)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                     </CardContent>
                 </Card>

                 {/* Eway Chart */}
                 <Card className="shadow-lg border-slate-200">
                     <CardHeader>
                         <CardTitle className="flex items-center gap-2"><PackageOpen className="h-5 w-5 text-orange-500"/> E-Way Bills Declared Value (Daily INR)</CardTitle>
                     </CardHeader>
                     <CardContent className="h-[300px]">
                        {details.ewb_timeline.length === 0 ? (
                           <div className="h-full flex items-center justify-center text-slate-400">No E-Way Bills</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={details.ewb_timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} minTickGap={30} stroke="#94a3b8"/>
                              <YAxis tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} width={80} tick={{fontSize: 12}} stroke="#94a3b8"/>
                              <Tooltip 
                                formatter={(val: number) => [`₹${val.toLocaleString()}`, "Declared Value"]}
                                labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              />
                              <Line type="step" dataKey="daily_ewb_volume" stroke="#f97316" strokeWidth={3} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                     </CardContent>
                 </Card>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                 {/* Raw UPI Feed */}
                 <Card className="shadow-lg border-slate-200 h-[450px] flex flex-col">
                     <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                         <CardTitle className="text-lg">Recent UPI Transactions</CardTitle>
                     </CardHeader>
                     <CardContent className="p-0 overflow-auto flex-1">
                        <Table>
                          <TableHeader className="bg-white sticky top-0 shadow-sm z-10">
                            <TableRow>
                              <TableHead>Time</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Counterparty</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {details.recent_upi.slice(0, 50).map((r, i) => (
                               <TableRow key={i}>
                                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">{r.timestamp.split(" ")[0]} {r.timestamp.split(" ")[1]?.substring(0,5)}</TableCell>
                                  <TableCell className="font-semibold text-slate-700">₹{r.amount.toLocaleString()}</TableCell>
                                  <TableCell>
                                    {r.direction === "INBOUND" ? 
                                       <span className="flex items-center text-emerald-600 text-xs font-semibold bg-emerald-50 px-2 py-1 rounded"><ArrowDownRight className="h-3 w-3 mr-1" /> IN</span> : 
                                       <span className="flex items-center text-rose-600 text-xs font-semibold bg-rose-50 px-2 py-1 rounded"><ArrowUpRight className="h-3 w-3 mr-1" /> OUT</span>
                                    }
                                  </TableCell>
                                  <TableCell className="text-xs font-mono text-slate-500">{r.counterparty_vpa.split("@")[0]}</TableCell>
                               </TableRow>
                            ))}
                            {details.recent_upi.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Empty Ledger</TableCell></TableRow>}
                          </TableBody>
                        </Table>
                     </CardContent>
                 </Card>

                 {/* Raw EWB Feed */}
                 <Card className="shadow-lg border-slate-200 h-[450px] flex flex-col">
                     <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                         <CardTitle className="text-lg">Recent E-Way Bills</CardTitle>
                     </CardHeader>
                     <CardContent className="p-0 overflow-auto flex-1">
                        <Table>
                          <TableHeader className="bg-white sticky top-0 shadow-sm z-10">
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Value</TableHead>
                              <TableHead>Hsn</TableHead>
                              <TableHead>Counterparty</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {details.recent_ewb.slice(0, 50).map((r, i) => (
                               <TableRow key={i}>
                                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">{r.timestamp.split(" ")[0]}</TableCell>
                                  <TableCell className="font-bold text-slate-700">₹{r.totalValue.toLocaleString()}</TableCell>
                                  <TableCell className="text-xs">
                                     <Badge variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-none">{r.mainHsnCode}</Badge>
                                  </TableCell>
                                  <TableCell className="text-xs font-mono text-slate-600 truncate max-w-[120px]" title={r.toGstin === details.info.gstin ? r.fromGstin : r.toGstin}>
                                     {r.toGstin === details.info.gstin ? 
                                       <span className="text-emerald-600 font-semibold" title={r.fromGstin}>IN from {r.fromGstin.substring(0,8)}...</span> : 
                                       <span className="text-orange-600 font-semibold" title={r.toGstin}>OUT to {r.toGstin.substring(0,8)}...</span>
                                     }
                                  </TableCell>
                               </TableRow>
                            ))}
                            {details.recent_ewb.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">No Logistics Records</TableCell></TableRow>}
                          </TableBody>
                        </Table>
                     </CardContent>
                 </Card>
               </div>
             </>
           )}
        </div>
      )}
    </div>
  );
}
