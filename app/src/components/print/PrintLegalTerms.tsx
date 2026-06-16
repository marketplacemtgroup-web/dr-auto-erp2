/** Termos legais resumidos para impressao de orcamento e ordem de servico. */
export default function PrintLegalTerms() {
  return (
    <section className="print-legal-terms text-[10px] leading-[1.3] text-[#444]">
      <h3 className="text-[11px] font-bold text-[#111] mb-0.5">TERMOS DE GARANTIA</h3>
      <div className="space-y-0.5 mb-2 text-justify">
        <p>
          A garantia cobre exclusivamente os serviços, peças e produtos discriminados neste
          documento, conforme prazos do CDC e condições do fabricante.
        </p>
        <p>
          Peças ou serviços de terceiros não indicados pela oficina não possuem garantia por nossa
          parte; retrabalho ou nova análise poderá ser cobrado, inclusive em valor dobrado do serviço
          técnico padrão.
        </p>
        <p>
          Não há cobertura para mau uso, falta de manutenção, acidentes, alterações por terceiros,
          desgaste natural ou falhas não relacionadas ao serviço executado. A garantia é invalidada
          se o veículo ou componente for violado ou alterado após o serviço.
        </p>
      </div>

      <h3 className="text-[11px] font-bold text-[#111] mb-0.5">OBSERVAÇÕES</h3>
      <ol className="list-decimal list-outside pl-3.5 space-y-0.5 text-justify print:columns-2 print:gap-x-4">
        <li>
          Análise técnica pode exigir limpeza, desmontagem ou testes prévios, cobrados à parte se o
          veículo estiver em condições que dificultem a avaliação.
        </li>
        <li>
          Avarias visíveis na entrada serão registradas. Prazo estimado para diagnóstico: 1 a 7 dias
          úteis, conforme complexidade e disponibilidade de peças.
        </li>
        <li>
          Orçamento válido por 15 dias. Após esse prazo, valores podem ser atualizados.
        </li>
        <li>
          Se o orçamento não for aprovado, o cliente tem 3 dias para retirar o veículo; após esse
          prazo poderá haver cobrança de estadia ou pátio.
        </li>
        <li>
          Serviços não autorizados podem gerar cobrança de diagnóstico, análise ou tempo em bancada.
        </li>
        <li>
          A oficina não se responsabiliza por objetos pessoais deixados no veículo.
        </li>
        <li>
          Aprovação pode ser feita presencialmente, por telefone, WhatsApp ou outro meio acordado.
        </li>
        <li>
          A liberação do veículo ocorre somente após quitação total dos valores devidos.
        </li>
      </ol>
    </section>
  );
}
