"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Parser } from "json2csv";
import {
  ArrowLeft,
  ClipboardList,
  Download,
  Globe,
  Mail,
  Phone,
  Search,
  Wallet,
} from "lucide-react";
import { useUser } from "@/lib/UserContext";
import CustomModal from "@/components/modal/CustomModal";
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

interface SubmissionAnswer {
  fieldId?: string;
  label?: string;
  value?: unknown;
}

interface FormSubmission {
  _id: string;
  name: string;
  micrositeId: string;
  jobTitle?: string;
  email?: string;
  mobileNo?: string;
  walletAddress?: string;
  website?: string;
  createdAt?: string;
  source?: string;
  formName?: string;
  answers?: SubmissionAnswer[];
}

interface FormGroup {
  formId: string;
  label: string;
  items: FormSubmission[];
}

interface SiteGroup {
  siteId: string;
  name: string;
  forms: FormGroup[];
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

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getFormId = (source?: string) =>
  source?.startsWith("form:") ? source.slice("form:".length) : "subscribe";

const formatAnswerValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatAnswerValue(item))
      .filter((part) => part !== "—");
    return parts.length > 0 ? parts.join(", ") : "—";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function FormsContent() {
  const { user, loading } = useUser();
  const [query, setQuery] = useState("");
  const [micrositeFilter, setMicrositeFilter] = useState<string>("all");
  const [formFilter, setFormFilter] = useState<string>("all");
  const [selected, setSelected] = useState<FormSubmission | null>(null);

  const micrositeNameById = useMemo(() => {
    const map = new Map<string, string>();
    (user?.microsites || []).forEach((microsite: any) => {
      const id = getRecordId(microsite?._id);
      if (id) map.set(id, microsite?.name || microsite?.ens || "SmartSite");
    });
    return map;
  }, [user?.microsites]);

  const formNameById = useMemo(() => {
    const map = new Map<string, string>();
    (user?.microsites || []).forEach((microsite: any) => {
      (microsite?.info?.widget || []).forEach((widget: any) => {
        if (widget?.widgetType !== "leadForm") return;
        const id = getRecordId(widget?._id);
        if (id) map.set(id, widget?.config?.title || "SmartSite form");
      });
    });
    return map;
  }, [user?.microsites]);

  const getFormLabel = (submission: FormSubmission) => {
    const formId = getFormId(submission.source);
    if (formId === "subscribe") return "Subscribers";
    // Widget title wins; the formName stored on the submission covers forms
    // whose widget was later renamed or deleted.
    return formNameById.get(formId) || submission.formName || "SmartSite form";
  };

  const submissions = useMemo<FormSubmission[]>(() => {
    const list = (user?.subscribers || []) as FormSubmission[];
    return [...list].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [user?.subscribers]);

  const formOptions = useMemo(() => {
    const options = new Map<string, string>();
    submissions.forEach((submission) => {
      options.set(getFormId(submission.source), getFormLabel(submission));
    });
    return Array.from(options, ([id, label]) => ({ id, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formNameById, submissions]);

  const filteredSubmissions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return submissions.filter((submission) => {
      const matchesMicrosite =
        micrositeFilter === "all" ||
        getRecordId(submission.micrositeId) === micrositeFilter;
      const matchesForm =
        formFilter === "all" || getFormId(submission.source) === formFilter;
      if (!matchesMicrosite || !matchesForm) return false;
      if (!normalizedQuery) return true;
      return [
        submission.name,
        submission.email,
        submission.mobileNo,
        submission.jobTitle,
        submission.website,
        ...(submission.answers || []).map((answer) =>
          formatAnswerValue(answer.value),
        ),
      ]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(normalizedQuery));
    });
  }, [submissions, query, micrositeFilter, formFilter]);

  // SmartSite → form → submissions. Both levels inherit the newest-first
  // order of the underlying list.
  const siteGroups = useMemo<SiteGroup[]>(() => {
    const sites = new Map<string, SiteGroup>();
    const formsBySite = new Map<string, Map<string, FormGroup>>();
    filteredSubmissions.forEach((submission) => {
      const siteId = getRecordId(submission.micrositeId) || "unknown";
      if (!sites.has(siteId)) {
        sites.set(siteId, {
          siteId,
          name: micrositeNameById.get(siteId) || "SmartSite",
          forms: [],
        });
        formsBySite.set(siteId, new Map());
      }
      const forms = formsBySite.get(siteId)!;
      const formId = getFormId(submission.source);
      if (!forms.has(formId)) {
        const group: FormGroup = {
          formId,
          label: getFormLabel(submission),
          items: [],
        };
        forms.set(formId, group);
        sites.get(siteId)!.forms.push(group);
      }
      forms.get(formId)!.items.push(submission);
    });
    return Array.from(sites.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSubmissions, micrositeNameById, formNameById]);

  const handleExportCsv = () => {
    const fields = [
      "name",
      "jobTitle",
      "email",
      "mobileNo",
      "walletAddress",
      "website",
      "form",
      "smartsite",
      "responses",
      "createdAt",
    ];
    const rows = filteredSubmissions.map((submission) => ({
      name: submission.name || "",
      jobTitle: submission.jobTitle || "",
      email: submission.email || "",
      mobileNo: submission.mobileNo || "",
      walletAddress: submission.walletAddress || "",
      website: submission.website || "",
      form: getFormLabel(submission),
      smartsite:
        micrositeNameById.get(getRecordId(submission.micrositeId)) || "",
      responses: (submission.answers || [])
        .map(
          (answer) =>
            `${answer.label || "Field"}: ${formatAnswerValue(answer.value)}`,
        )
        .join("; "),
      createdAt: submission.createdAt || "",
    }));

    const csv = new Parser({ fields }).parse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Swop-Form-Submissions.csv");
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
            <ClipboardList className="h-6 w-6" />
            <h1 className="text-2xl font-semibold text-gray-900">Forms</h1>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
              {submissions.length}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Form submissions and subscribers, organized by SmartSite and form.
            Click a row to view the full submission.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExportCsv}
          disabled={filteredSubmissions.length === 0}
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
            placeholder="Search by name, email, phone, response…"
            className="pl-9"
          />
        </div>
        {micrositeNameById.size > 1 && (
          <select
            value={micrositeFilter}
            onChange={(event) => setMicrositeFilter(event.target.value)}
            className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-gray-400"
            aria-label="Filter by SmartSite"
          >
            <option value="all">All SmartSites</option>
            {Array.from(micrositeNameById.entries()).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}
        {formOptions.length > 1 && (
          <select
            value={formFilter}
            onChange={(event) => setFormFilter(event.target.value)}
            className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-gray-400"
            aria-label="Filter by form"
          >
            <option value="all">All forms</option>
            {formOptions.map((form) => (
              <option key={form.id} value={form.id}>
                {form.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <ClipboardList className="mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-700">
            {submissions.length === 0
              ? "No form submissions yet"
              : "No matching submissions"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            {submissions.length === 0
              ? "SmartSite form responses and new subscribers will show up here."
              : "Try a different search, SmartSite, or form filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {siteGroups.map((site) => (
            <section key={site.siteId} className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  {site.name}
                </h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {site.forms.reduce((sum, form) => sum + form.items.length, 0)}
                </span>
              </div>
              {site.forms.map((form) => (
                <div
                  key={`${site.siteId}-${form.formId}`}
                  className="overflow-hidden rounded-xl border border-gray-200"
                >
                  <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                    <span className="text-sm font-medium text-gray-800">
                      {form.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {form.items.length}{" "}
                      {form.items.length === 1 ? "submission" : "submissions"}
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Website</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.items.map((submission) => (
                        <TableRow
                          key={submission._id}
                          onClick={() => setSelected(submission)}
                          className="cursor-pointer hover:bg-gray-50"
                        >
                          <TableCell>
                            <div className="font-medium text-gray-900">
                              {submission.name || "—"}
                            </div>
                            {submission.jobTitle && (
                              <div className="text-sm text-gray-500">
                                {submission.jobTitle}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div
                              className="space-y-1 text-sm"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {submission.email && (
                                <a
                                  href={`mailto:${submission.email}`}
                                  className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900"
                                >
                                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                                  {submission.email}
                                </a>
                              )}
                              {submission.mobileNo && (
                                <a
                                  href={`tel:${submission.mobileNo}`}
                                  className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900"
                                >
                                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                                  {submission.mobileNo}
                                </a>
                              )}
                              {!submission.email && !submission.mobileNo && (
                                <span className="text-gray-400">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {submission.website ? (
                              <a
                                href={
                                  submission.website.startsWith("http")
                                    ? submission.website
                                    : `https://${submission.website}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {submission.website}
                              </a>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm text-gray-500">
                            {formatDate(submission.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      <CustomModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Form submission"
        width="max-w-xl"
        ariaLabel="Form submission details"
      >
        {selected && (
          <div className="space-y-5 px-5 pb-6 pt-1">
            <div className="space-y-1">
              <p className="text-xl font-semibold text-gray-900">
                {selected.name || "—"}
              </p>
              <p className="text-sm text-gray-500">
                {getFormLabel(selected)} ·{" "}
                {micrositeNameById.get(getRecordId(selected.micrositeId)) ||
                  "SmartSite"}{" "}
                · {formatDateTime(selected.createdAt)}
              </p>
            </div>

            {(selected.answers?.length || 0) > 0 ? (
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                {selected.answers!.map((answer, index) => (
                  <div key={answer.fieldId || index} className="px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      {answer.label || "Field"}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-800">
                      {formatAnswerValue(answer.value)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                {(
                  [
                    ["Name", selected.name],
                    ["Job title", selected.jobTitle],
                    ["Email", selected.email],
                    ["Phone", selected.mobileNo],
                    ["Website", selected.website],
                    ["Wallet address", selected.walletAddress],
                  ] as const
                )
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label} className="px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        {label}
                      </p>
                      <p className="mt-0.5 break-words text-sm text-gray-800">
                        {value}
                      </p>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {selected.email && (
                <a
                  href={`mailto:${selected.email}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  Email
                </a>
              )}
              {selected.mobileNo && (
                <a
                  href={`tel:${selected.mobileNo}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  Call
                </a>
              )}
              {selected.website && (
                <a
                  href={
                    selected.website.startsWith("http")
                      ? selected.website
                      : `https://${selected.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Globe className="h-3.5 w-3.5 text-gray-400" />
                  Website
                </a>
              )}
              {selected.walletAddress && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-700">
                  <Wallet className="h-3.5 w-3.5 text-gray-400" />
                  <span className="max-w-[220px] truncate">
                    {selected.walletAddress}
                  </span>
                </span>
              )}
            </div>
          </div>
        )}
      </CustomModal>
    </div>
  );
}
