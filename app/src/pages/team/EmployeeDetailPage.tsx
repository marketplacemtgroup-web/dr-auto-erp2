import { useState, useRef, useEffect } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Upload } from "lucide-react";
import { api, type EmployeeRow, type EmployeeDocumentRow } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { routes } from "../../lib/routes";
import { useApiQuery, useAuthToken } from "../../hooks/useApiQuery";
import { FormField, inputClass, selectClass } from "../../components/modules/FormDrawer";
import LoginUsernameField from "../../components/team/LoginUsernameField";
import {
  ACCESS_PROFILE_OPTIONS,
  accessProfileLabel,
  effectiveAccessProfile,
} from "./accessProfiles";

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [accessForm, setAccessForm] = useState({
    loginUsername: "",
    password: "",
    accessProfile: "",
    accessActive: true,
  });
  const [newPassword, setNewPassword] = useState("");
  const [editProfile, setEditProfile] = useState("");
  const [docType, setDocType] = useState("recibo_comissao");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error } = useApiQuery(
    ["employee", id ?? ""],
    (t) => api.employee(t, id!),
    !!id,
  );
  const { data: loginDomain } = useApiQuery(["team-login-domain"], (t) =>
    api.teamLoginEmailDomain(t),
  );

  const { data: documents = [], refetch: refetchDocuments } = useApiQuery(
    ["employee-documents", id ?? ""],
    (t) => api.employeeDocuments(t, id!),
    !!id,
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["employee", id] });
    queryClient.invalidateQueries({ queryKey: ["employees"] });
  };

  const createAccess = useMutation({
    mutationFn: () =>
      api.createEmployeeAccess(token!, id!, {
        loginUsername: accessForm.loginUsername,
        password: accessForm.password,
        accessProfile: accessForm.accessProfile,
        accessActive: accessForm.accessActive,
      }),
    onSuccess: invalidate,
  });

  const updateAccess = useMutation({
    mutationFn: (payload: { accessProfile?: string; accessActive?: boolean }) =>
      api.updateEmployeeAccess(token!, id!, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(["employee", id ?? "", token], updated);
      setEditProfile(effectiveAccessProfile(updated) ?? "");
      invalidate();
    },
  });

  const resetPassword = useMutation({
    mutationFn: () => api.resetEmployeePassword(token!, id!, newPassword),
    onSuccess: () => setNewPassword(""),
  });

  const uploadDocument = useMutation({
    mutationFn: (file: File) => api.uploadEmployeeDocument(token!, id!, file, docType),
    onSuccess: () => {
      refetchDocuments();
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const deleteDocument = useMutation({
    mutationFn: (docId: string) => api.deleteEmployeeDocument(token!, id!, docId),
    onSuccess: () => refetchDocuments(),
  });

  const currentProfile = data ? effectiveAccessProfile(data as EmployeeRow) ?? "" : "";

  useEffect(() => {
    if (data?.member) {
      setEditProfile(effectiveAccessProfile(data as EmployeeRow) ?? "");
    }
  }, [data]);

  if (isLoading) return <p className="p-6 text-sm text-[#6B7280]">Carregando...</p>;
  if (error || !data) return <p className="p-6 text-sm text-red-600">Funcionário não encontrado.</p>;

  const emp = data as EmployeeRow & {
    commissionRules?: Array<{ baseCalculation: string; percentage: number | string | null }>;
    generatedCommissions?: Array<{ description: string; commissionAmount: number | string; status: string }>;
    entries?: Array<{ description: string; amount: number | string; entryType: string; entryDate: string }>;
    actionLogs?: Array<{ description: string; createdAt: string }>;
    paymentConfig?: { paymentType: string; fixedSalary: number | string | null; pixKey: string | null };
  };

  const hasAccess = Boolean(emp.member);
  const loginActive = emp.member?.isActive && emp.member?.user?.isActive;

  return (
    <main className="px-6 pb-8">
      <Link
        to={routes.equipeFuncionarios}
        className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#111827] mb-4"
      >
        <ArrowLeft size={16} />
        Voltar
      </Link>

      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 mb-6">
        <h1 className="text-xl font-semibold text-[#111827]">{emp.name}</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          {emp.jobTitle?.name ?? "Sem cargo"} · {emp.status === "ACTIVE" ? "Ativo" : "Inativo"}
        </p>
        <div className="grid sm:grid-cols-3 gap-4 mt-4 text-sm">
          <p>CPF: {emp.cpf ?? "—"}</p>
          <p>Telefone: {emp.phone ?? "—"}</p>
          <p>E-mail: {emp.email ?? "—"}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-[#E5E7EB] p-5 lg:col-span-2">
          <h2 className="font-semibold mb-3">Acesso ao sistema</h2>

          {hasAccess ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <p>
                  <span className="text-[#6B7280]">Login:</span>{" "}
                  {emp.member!.user.email}
                </p>
                <p>
                  <span className="text-[#6B7280]">Perfil:</span>{" "}
                  {accessProfileLabel(currentProfile)}
                </p>
                <p>
                  <span className="text-[#6B7280]">Status:</span>{" "}
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      loginActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {loginActive ? "Ativo" : "Bloqueado"}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap gap-4 items-end border-t border-[#F3F4F6] pt-4">
                <FormField label="Alterar perfil">
                  <select
                    className={selectClass}
                    value={editProfile}
                    onChange={(e) => setEditProfile(e.target.value)}
                  >
                    {ACCESS_PROFILE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <button
                  type="button"
                  className="px-3 py-2 text-sm bg-[#0057D9] text-white rounded-lg disabled:opacity-50"
                  disabled={
                    updateAccess.isPending ||
                    !editProfile ||
                    editProfile === currentProfile
                  }
                  onClick={() => updateAccess.mutate({ accessProfile: editProfile })}
                >
                  Salvar perfil
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg disabled:opacity-50"
                  disabled={updateAccess.isPending}
                  onClick={() =>
                    updateAccess.mutate({ accessActive: !loginActive })
                  }
                >
                  {loginActive ? "Bloquear acesso" : "Reativar acesso"}
                </button>
              </div>
              {(updateAccess.error as Error | null) && (
                <p className="text-sm text-red-600">
                  {(updateAccess.error as Error).message}
                </p>
              )}

              <div className="flex flex-wrap gap-4 items-end border-t border-[#F3F4F6] pt-4">
                <FormField label="Nova senha (mín. 6 caracteres)">
                  <input
                    type="password"
                    className={inputClass}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </FormField>
                <button
                  type="button"
                  className="px-3 py-2 text-sm bg-[#0057D9] text-white rounded-lg disabled:opacity-50"
                  disabled={resetPassword.isPending || newPassword.length < 6}
                  onClick={() => resetPassword.mutate()}
                >
                  Redefinir senha
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-md">
              <p className="text-sm text-[#6B7280]">
                Este funcionário ainda não possui login. Informe o usuário antes do @
                {loginDomain?.loginEmailDomain ? (
                  <>
                    {" "}
                    (<strong>@{loginDomain.loginEmailDomain}</strong>)
                  </>
                ) : null}
                .
              </p>
              <LoginUsernameField
                label="Usuário de login"
                username={accessForm.loginUsername}
                domain={loginDomain?.loginEmailDomain ?? ""}
                onUsernameChange={(value) =>
                  setAccessForm((f) => ({ ...f, loginUsername: value }))
                }
                placeholder="joao.silva"
                required
              />
              <FormField label="Senha temporária">
                <input
                  type="password"
                  className={inputClass}
                  value={accessForm.password}
                  onChange={(e) =>
                    setAccessForm((f) => ({ ...f, password: e.target.value }))
                  }
                  autoComplete="new-password"
                />
              </FormField>
              <FormField label="Perfil de acesso">
                <select
                  className={selectClass}
                  value={accessForm.accessProfile}
                  onChange={(e) =>
                    setAccessForm((f) => ({ ...f, accessProfile: e.target.value }))
                  }
                >
                  <option value="">Selecione</option>
                  {ACCESS_PROFILE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <label className="flex items-center gap-2 text-sm text-[#374151]">
                <input
                  type="checkbox"
                  checked={accessForm.accessActive}
                  onChange={(e) =>
                    setAccessForm((f) => ({ ...f, accessActive: e.target.checked }))
                  }
                />
                Acesso ativo
              </label>
              <button
                type="button"
                className="px-4 py-2 text-sm bg-[#0057D9] text-white rounded-lg disabled:opacity-50"
                disabled={
                  createAccess.isPending ||
                  !accessForm.accessProfile ||
                  !accessForm.loginUsername.trim() ||
                  accessForm.password.length < 6
                }
                onClick={() => createAccess.mutate()}
              >
                Criar acesso
              </button>
              {(createAccess.error as Error | null) && (
                <p className="text-sm text-red-600">
                  {(createAccess.error as Error).message}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h2 className="font-semibold mb-3">Pagamento</h2>
          <p className="text-sm">Tipo: {emp.paymentConfig?.paymentType ?? "—"}</p>
          <p className="text-sm">Salário: {formatMoney(emp.paymentConfig?.fixedSalary ?? 0)}</p>
          <p className="text-sm">Pix: {emp.paymentConfig?.pixKey ?? "—"}</p>
        </section>

        <section className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <h2 className="font-semibold mb-3">Regras de comissão</h2>
          {(emp.commissionRules ?? []).length === 0 ? (
            <p className="text-sm text-[#6B7280]">Nenhuma regra cadastrada.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {emp.commissionRules!.map((r, i) => (
                <li key={i}>
                  {r.baseCalculation} — {r.percentage != null ? `${r.percentage}%` : "valor fixo"}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-[#E5E7EB] p-5 lg:col-span-2">
          <h2 className="font-semibold mb-3">Documentos e recibos</h2>
          <p className="text-sm text-[#6B7280] mb-4">
            Envie recibos de comissão, comprovantes e outros documentos. O colaborador visualiza no app.
          </p>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <FormField label="Tipo">
              <select
                className={selectClass}
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                <option value="recibo_comissao">Recibo de comissão</option>
                <option value="comprovante_pagamento">Comprovante de pagamento</option>
                <option value="termo">Termo / contrato</option>
                <option value="outro">Outro</option>
              </select>
            </FormField>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadDocument.mutate(file);
              }}
            />
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-[#0057D9] text-white rounded-lg disabled:opacity-50"
              disabled={uploadDocument.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
              {uploadDocument.isPending ? "Enviando..." : "Enviar arquivo"}
            </button>
            {(uploadDocument.error as Error | null) && (
              <p className="text-sm text-red-600 w-full">
                {(uploadDocument.error as Error).message}
              </p>
            )}
          </div>
          {(documents as EmployeeDocumentRow[]).length === 0 ? (
            <p className="text-sm text-[#6B7280]">Nenhum documento enviado.</p>
          ) : (
            <ul className="text-sm space-y-2">
              {(documents as EmployeeDocumentRow[]).map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 border-b border-[#F3F4F6] pb-2"
                >
                  <div>
                    <p className="font-medium text-[#111827]">{doc.fileName}</p>
                    <p className="text-[#6B7280] text-xs">
                      {doc.docType} · {new Date(doc.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    disabled={deleteDocument.isPending}
                    onClick={() => {
                      if (window.confirm("Excluir este documento?")) {
                        deleteDocument.mutate(doc.id);
                      }
                    }}
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-[#E5E7EB] p-5 lg:col-span-2">
          <h2 className="font-semibold mb-3">Comissões recentes</h2>
          <ul className="text-sm space-y-2">
            {(emp.generatedCommissions ?? []).map((c, i) => (
              <li key={i} className="flex justify-between border-b border-[#F3F4F6] pb-2">
                <span>{c.description}</span>
                <span>
                  {formatMoney(c.commissionAmount)} · {c.status}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-xl border border-[#E5E7EB] p-5 lg:col-span-2">
          <h2 className="font-semibold mb-3">Histórico</h2>
          <ul className="text-sm space-y-2 text-[#6B7280]">
            {(emp.actionLogs ?? []).map((log, i) => (
              <li key={i}>
                {new Date(log.createdAt).toLocaleString("pt-BR")} — {log.description}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
