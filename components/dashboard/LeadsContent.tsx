"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Parser } from "json2csv";
import { ArrowLeft, Download, Mail, Phone, Search, Users } from "lucide-react";
import { useUser } from "@/lib/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Lead {
  _id: string;
  name: string;
  micrositeId: string;
  jobTitle?: string;
  email?: string;
  mobileNo?: string;
  walletAddress?: string;
  website?: string;
  createdAt?: string;
}

const getRecordId = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as { _id?: unknown; toString?: () => string };
    if (record._id) return getRecordId(record._id);
    if (typeof record.toString === "function") return record.toString();
  }
  return String(value);
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function LeadsContent() {
  const { user, loading } = useUser();
  const [query, setQuery] = useState("");
  const [micrositeFilter, setMicrositeFilter] = useState<string>("all");

  const micrositeNameById = useMemo(() => {
    const map = new Map<string, string>();
    (user?.microsites || []).forEach((microsite: any) => {
      const id = getRecordId(microsite?._id);
      if (id) map.set(id, microsite?.name || microsite?.ens || "SmartSite");
    });
    return map;
  }, [user?.microsites]);

  const leads = useMemo<Lead[]>(() => {
    const list = (user?.subscribers || []) as Lead[];
    return [...list].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [user?.subscribers]);

  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesMicrosite =
        micrositeFilter === "all" ||
        getRecordId(lead.micrositeId) === micrositeFilter;
      if (!matchesMicrosite) return false;
      if (!normalizedQuery) return true;
      return [lead.name, lead.email, lead.mobileNo, lead.jobTitle, lead.website]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(normalizedQuery));
    });
  }, [leads, query, micrositeFilter]);

  const handleExportCsv = () => {
    const fields = [
      "name",
      "jobTitle",
      "email",
      "mobileNo",
      "walletAddress",
      "website",
      "smartsite",
      "createdAt",
    ];
    const rows = filteredLeads.map((lead) => ({
      name: lead.name || "",
      jobTitle: lead.jobTitle || "",
      email: lead.email || "",
      mobileNo: lead.mobileNo || "",
      walletAddress: lead.walletAddress || "",
      website: lead.website || "",
      smartsite: micrositeNameById.get(getRecordId(lead.micrositeId)) || "",
      createdAt: lead.createdAt || "",
    }));

    const csv = new Parser({ fields }).parse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Swop-Leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading && !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
              {leads.length}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            People who subscribed through the form on your SmartSites.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExportCsv}
          disabled={filteredLeads.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, phone…"
            className="pl-9"
          />
        </div>
        {micrositeNameById.size > 1 && (
          <select
            value={micrositeFilter}
            onChange={(event) => setMicrositeFilter(event.target.value)}
            className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-gray-400"
          >
            <option value="all">All SmartSites</option>
            {Array.from(micrositeNameById.entries()).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

      {filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-700">
            {leads.length === 0 ? "No leads yet" : "No matching leads"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            {leads.length === 0
              ? "When someone fills out the subscribe form on your SmartSite, they'll show up here."
              : "Try a different search or SmartSite filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>SmartSite</TableHead>
                <TableHead>Website</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead._id}>
                  <TableCell>
                    <div className="font-medium text-gray-900">
                      {lead.name || "—"}
                    </div>
                    {lead.jobTitle && (
                      <div className="text-sm text-gray-500">
                        {lead.jobTitle}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}`}
                          className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900"
                        >
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          {lead.email}
                        </a>
                      )}
                      {lead.mobileNo && (
                        <a
                          href={`tel:${lead.mobileNo}`}
                          className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900"
                        >
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          {lead.mobileNo}
                        </a>
                      )}
                      {!lead.email && !lead.mobileNo && (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {micrositeNameById.get(getRecordId(lead.micrositeId)) || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {lead.website ? (
                      <a
                        href={
                          lead.website.startsWith("http")
                            ? lead.website
                            : `https://${lead.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {lead.website}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-500">
                    {formatDate(lead.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
