package com.example.data

import java.io.Serializable

data class User(
    val id: String,
    val funcionario_id: String,
    val nome: String,
    val cargo: String,
    val perfil: String,
    val oficina_id: String,
    val permissoes: List<String>
) : Serializable {
    companion object {
        val DEFAULT = User(
            id = "usu_101",
            funcionario_id = "func_202",
            nome = "Carlos Henrique",
            cargo = "Mecânico",
            perfil = "funcionario",
            oficina_id = "ofi_303",
            permissoes = listOf("minhas_os.ver", "minhas_comissoes.ver", "meu_ponto.bater", "minha_escala.ver")
        )
    }
}

enum class CommissionStatus {
    prevista, pendente, aprovada, paga, cancelada, estornada
}

data class Commission(
    val id: String,
    val os_numero: String,
    val descricao: String,
    val tipo: String, // "servico" | "peca" | "os" | "manual"
    val base_valor: Double,
    val regra: String,
    val valor_comissao: Double,
    val status: CommissionStatus,
    val data_geracao: String,
    val previsao_pagamento: String?,
    val data_pagamento: String?,
    val observacao: String? = null,
    val percentual: Int? = null,
    val valor_fixo: Double? = null
) : Serializable

data class EmployeeOrder(
    val id: String,
    val numero: String,
    val cliente_nome: String,
    val veiculo_modelo: String,
    val placa: String,
    val status: String, // "em_execucao", "finalizada", "aguardando_aprovacao"
    val data_abertura: String,
    val servicos_executados_por_mim: Int,
    val comissao_prevista: Double
) : Serializable

data class OrderDetails(
    val id: String,
    val numero: String,
    val status: String,
    val cliente_nome: String,
    val veiculo_modelo: String,
    val placa: String,
    val km: Int,
    val responsavel_checklist: Boolean,
    val responsavel_diagnostico: Boolean,
    val executor_servicos: Boolean,
    val servicos: List<OrderServiceItem>,
    val historico: List<OrderHistoryItem>
) : Serializable

data class OrderServiceItem(
    val id: String,
    val descricao: String,
    val valor_base: Double,
    val regra_comissao: String,
    val comissao_prevista: Double,
    val status_comissao: String
) : Serializable

data class OrderHistoryItem(
    val data_hora: String,
    val descricao: String
) : Serializable

data class TimeClockRecord(
    val id: String,
    val tipo: String, // "entrada" | "intervalo_inicio" | "intervalo_fim" | "saida"
    val hora: String,
    val status: String, // "valido" | "pendente"
    val data: String
) : Serializable

data class ScheduleItem(
    val data: String,
    val dia_semana: String,
    val inicio: String?,
    val fim: String?,
    val intervalo: String?,
    val tipo: String, // "trabalho" | "folga" | "plantao"
    val status: String
) : Serializable

data class EmployeeRequest(
    val id: String,
    val tipo: String, // "folga" | "troca_escala" | "ajuste_ponto" | "justificativa_atraso" | "justificativa_falta"
    val data_referencia: String,
    val descricao: String,
    val status: String, // "enviada" | "em_analise" | "aprovada" | "recusada" | "cancelada"
    val created_at: String
) : Serializable

data class Announcement(
    val id: String,
    val titulo: String,
    val mensagem: String,
    val data_publicacao: String,
    val lido: Boolean
) : Serializable

data class MetricGoal(
    val titulo: String,
    val atual: Int,
    val meta: Int
) : Serializable

data class PerformanceMetrics(
    val periodo: String,
    val os_finalizadas: Int,
    val servicos_executados: Int,
    val checklists_realizados: Int,
    val fotos_enviadas: Int,
    val comissao_gerada: Double,
    val tempo_medio_os: String,
    val metas: List<MetricGoal>,
    val series_semanal: List<WeeklyPerformance> = emptyList(),
) : Serializable

data class WeeklyPerformance(
    val semana: String,
    val os: Int,
    val servicos: Int,
    val comissao: Double,
) : Serializable

data class EmployeeDocument(
    val id: String,
    val nome: String,
    val tipo: String,
    val data: String,
    val tamanho: String = "—",
    val url: String? = null,
) : Serializable
